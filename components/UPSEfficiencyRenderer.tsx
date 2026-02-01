'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UPS Efficiency & Battery Chemistry - Complete 10-Phase Game
// Why 48V and lithium: understanding I²R losses and distribution voltage
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface UPSEfficiencyRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A data center engineer is designing a new power distribution system. They can choose between 12V and 48V bus voltage for the same 10kW load.",
    question: "How much current flows through the cables at each voltage?",
    options: [
      { id: 'a', label: "12V: 833A, 48V: 208A—higher voltage means much less current", correct: true },
      { id: 'b', label: "12V: 120A, 48V: 480A—voltage and current are proportional" },
      { id: 'c', label: "Both carry the same current since power is identical" },
      { id: 'd', label: "12V: 10A, 48V: 10A—current doesn't depend on voltage" }
    ],
    explanation: "Power = Voltage × Current (P = V × I), so I = P/V. At 10kW: 12V needs 10000/12 = 833A, while 48V needs only 10000/48 = 208A. Four times the voltage means one-quarter the current for the same power delivery."
  },
  {
    scenario: "The cables connecting the UPS to the server racks have a total resistance of 0.01 ohms. The engineer compares power loss at 12V (833A) versus 48V (208A).",
    question: "How much power is wasted as heat in the cables at each voltage?",
    options: [
      { id: 'a', label: "12V loses 6,944W, 48V loses 433W—a 16× difference!", correct: true },
      { id: 'b', label: "Both lose the same power since resistance is identical" },
      { id: 'c', label: "12V loses 100W, 48V loses 400W" },
      { id: 'd', label: "12V loses 833W, 48V loses 208W" }
    ],
    explanation: "Cable loss = I²R. At 12V: 833² × 0.01 = 6,944W lost! At 48V: 208² × 0.01 = 433W. The I² relationship means doubling voltage quarters current but reduces I²R losses by 16×. This is why data centers use higher voltages."
  },
  {
    scenario: "A startup is choosing between lead-acid and lithium batteries for their UPS. Both store 100kWh, but lead-acid costs $15,000 and lithium costs $30,000.",
    question: "Why might the more expensive lithium option be more economical long-term?",
    options: [
      { id: 'a', label: "Lithium has 95% round-trip efficiency vs 80% for lead-acid, plus 3× longer life", correct: true },
      { id: 'b', label: "Lead-acid requires no maintenance while lithium needs constant monitoring" },
      { id: 'c', label: "Lithium batteries never degrade so last forever" },
      { id: 'd', label: "Lead-acid is actually more efficient but lithium is lighter" }
    ],
    explanation: "Lithium batteries offer 95%+ round-trip efficiency vs 70-85% for lead-acid, saving 10-25% of cycled energy. They also last 3,000-5,000 cycles vs 500-1,000 for lead-acid. Over 10 years, lithium's lower operating cost and longer life often justify higher upfront cost."
  },
  {
    scenario: "An EV charges at a DC fast charger rated at 350kW. The car's battery pack is 800V, while an older design was 400V.",
    question: "Why did manufacturers switch to 800V battery packs?",
    options: [
      { id: 'a', label: "Higher voltage allows thinner cables and faster charging with less heat", correct: true },
      { id: 'b', label: "800V batteries store twice as much energy as 400V" },
      { id: 'c', label: "400V is no longer available from electrical suppliers" },
      { id: 'd', label: "800V motors are exactly twice as powerful" }
    ],
    explanation: "At 350kW charging: 400V requires 875A (massive cables, huge heat), while 800V needs only 437A. The I²R losses in charging cables and connectors are 4× lower at 800V. This enables thinner, lighter cables and faster charging without overheating."
  },
  {
    scenario: "A UPS manufacturer specifies 96% efficiency at full load but only 85% efficiency at 20% load. A data center runs their UPS at 30% average load.",
    question: "Why is efficiency so much worse at low loads?",
    options: [
      { id: 'a', label: "Fixed losses (cooling fans, control circuits) dominate when output power is low", correct: true },
      { id: 'b', label: "The UPS is damaged and needs replacement" },
      { id: 'c', label: "Low loads create more heat due to higher resistance" },
      { id: 'd', label: "Efficiency specifications are only valid at full load" }
    ],
    explanation: "UPS systems have fixed overhead: cooling fans, control circuits, transformer magnetizing current. A 100kW UPS might waste 2kW constantly. At full load: 2kW/100kW = 2% overhead. At 20% load: 2kW/20kW = 10% overhead. This is why right-sizing UPS capacity matters."
  },
  {
    scenario: "A server room has a 100-foot cable run from the UPS to the rack. Using 10 AWG copper wire, the engineer calculates total cable resistance of 0.2 ohms.",
    question: "To reduce I²R losses by 75%, what should the engineer do?",
    options: [
      { id: 'a', label: "Double the voltage (halve current, quartering I²R)", correct: true },
      { id: 'b', label: "Use cables with 75% lower resistance" },
      { id: 'c', label: "Reduce the cable length by 75%" },
      { id: 'd', label: "Add 75% more batteries to the UPS" }
    ],
    explanation: "I²R loss scales with current squared. Doubling voltage halves current, reducing I² by 4× (75% reduction). Alternatively, you could use 4× the copper (parallel cables or larger gauge), but this is expensive. Voltage is the most economical solution."
  },
  {
    scenario: "Google's data centers switched from 12V to 48V server power distribution. Engineers claim this 'saves copper' and 'improves efficiency.'",
    question: "How much copper is needed at 48V compared to 12V for the same power and voltage drop?",
    options: [
      { id: 'a', label: "Only 1/16th as much copper (current squared effect)", correct: true },
      { id: 'b', label: "1/4 as much copper (linear with voltage)" },
      { id: 'c', label: "The same amount—voltage doesn't affect copper requirements" },
      { id: 'd', label: "4× more copper because higher voltage needs thicker insulation" }
    ],
    explanation: "For the same power and acceptable voltage drop, copper cross-section scales with I². At 48V vs 12V: current is 4× lower, so I² is 16× lower, meaning you need only 1/16th the copper. Google estimates 30% cost reduction from copper savings alone."
  },
  {
    scenario: "A homeowner's 5kW solar system uses a 48V battery bank. They're considering rewiring to 12V because '12V appliances are cheaper.'",
    question: "What problem would they encounter with 12V?",
    options: [
      { id: 'a', label: "Cables would need to be 16× thicker or losses become unacceptable", correct: true },
      { id: 'b', label: "12V batteries can't store solar energy" },
      { id: 'c', label: "The inverter would need to be 4× larger" },
      { id: 'd', label: "Solar panels don't work with 12V systems" }
    ],
    explanation: "At 5kW: 12V draws 417A (requiring massive, expensive cables), while 48V draws only 104A. For typical cable runs (20+ feet), 12V systems become impractical for loads over 1-2kW due to cable cost and voltage drop. This is why off-grid solar uses 24V or 48V."
  },
  {
    scenario: "A UPS battery charges at 90% efficiency and discharges at 95% efficiency. The batteries cycle once daily for grid arbitrage (charge cheap, sell expensive).",
    question: "What's the round-trip efficiency, and how much energy is lost daily from 100kWh of storage?",
    options: [
      { id: 'a', label: "85.5% round-trip, losing 14.5kWh daily (14.5%)", correct: true },
      { id: 'b', label: "185% round-trip, gaining energy" },
      { id: 'c', label: "92.5% round-trip (average of charge and discharge)" },
      { id: 'd', label: "99% round-trip, losing only 1kWh" }
    ],
    explanation: "Round-trip efficiency = charge efficiency × discharge efficiency = 0.90 × 0.95 = 0.855 (85.5%). For 100kWh storage cycling daily: 100kWh × 14.5% = 14.5kWh lost as heat. Over a year, that's 5,293kWh—a significant cost to factor into arbitrage economics."
  },
  {
    scenario: "An engineer notices that their UPS runs hot when idle but relatively cool under heavy load. This seems backwards.",
    question: "What explains this counterintuitive temperature behavior?",
    options: [
      { id: 'a', label: "Cooling fans run faster at high load; at idle, fixed losses accumulate with less airflow", correct: true },
      { id: 'b', label: "The temperature sensor is installed incorrectly" },
      { id: 'c', label: "Heavy loads generate negative heat that cools the unit" },
      { id: 'd', label: "Idle UPS units should be turned off to save energy" }
    ],
    explanation: "Modern UPS systems have variable-speed cooling that ramps up with load. At idle, fans run slowly to save energy, but fixed losses (standby circuits, transformers) still generate heat. Under load, fans run at full speed, efficiently removing more heat despite higher total losses."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏢',
    title: 'Data Center Power',
    short: '48V revolution in server rooms',
    tagline: 'Google, Facebook, and the 48V shift',
    description: 'Leading tech companies have transitioned from 12V to 48V power distribution in their data centers. This change reduces copper usage by up to 94%, improves efficiency by 2-3%, and enables higher power densities.',
    connection: 'Understanding I²R losses explains why this seemingly small voltage change has massive impact. At 48V vs 12V, current drops 4× and I²R losses drop 16×, transforming data center economics.',
    howItWorks: 'Server power supplies convert 48V DC directly to processor voltages using efficient point-of-load converters. This eliminates the intermediate 12V bus, reducing conversion stages and losses.',
    stats: [
      { value: '94%', label: 'Less copper needed', icon: '🔌' },
      { value: '3%', label: 'Efficiency gain', icon: '📈' },
      { value: '$100M', label: 'Annual savings at scale', icon: '💰' }
    ],
    examples: ['Google data centers', 'Open Compute Project', 'Facebook servers', 'Microsoft Azure'],
    companies: ['Google', 'Meta', 'Microsoft', 'Intel'],
    futureImpact: 'Higher voltages (400V DC) are being explored for even greater efficiency, though safety challenges remain.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Batteries',
    short: '400V to 800V evolution',
    tagline: 'Why Porsche and Hyundai went 800V',
    description: 'The automotive industry is transitioning from 400V to 800V battery architectures. This enables faster charging, thinner cables, and better efficiency—all driven by the I²R relationship you just learned.',
    connection: 'An 800V EV at 350kW charging draws 437A vs 875A at 400V. The 4× lower current means charging cables can be lighter, connectors run cooler, and charging losses are dramatically reduced.',
    howItWorks: '800V systems use different motor windings and power electronics optimized for higher voltage. Silicon carbide (SiC) inverters handle the increased voltage efficiently, enabling 10-80% charging in under 20 minutes.',
    stats: [
      { value: '800V', label: 'Battery voltage', icon: '⚡' },
      { value: '350kW', label: 'Charging power', icon: '🔋' },
      { value: '18min', label: '10-80% charge', icon: '⏱️' }
    ],
    examples: ['Porsche Taycan', 'Hyundai Ioniq 5/6', 'Kia EV6', 'Lucid Air'],
    companies: ['Porsche', 'Hyundai', 'Lucid', 'Rimac'],
    futureImpact: '1000V+ systems are in development for commercial vehicles, pushing the boundaries of fast charging.',
    color: '#10B981'
  },
  {
    icon: '🔋',
    title: 'Battery Chemistry',
    short: 'Why lithium dominates UPS',
    tagline: 'From lead-acid to lithium-ion',
    description: 'Modern UPS systems increasingly use lithium-ion batteries instead of traditional lead-acid. Higher efficiency, longer life, and smaller footprint make lithium economically superior despite higher upfront cost.',
    connection: 'Round-trip efficiency directly impacts operating cost. Lithium\'s 95% vs lead-acid\'s 80% efficiency means 15% less energy wasted per cycle. For data centers cycling batteries for peak shaving, this adds up quickly.',
    howItWorks: 'Lithium iron phosphate (LFP) offers the best balance of safety, longevity, and efficiency for stationary storage. Advanced battery management systems ensure safe operation and maximize lifespan.',
    stats: [
      { value: '95%', label: 'Round-trip efficiency', icon: '⚡' },
      { value: '10yrs', label: 'Typical lifespan', icon: '⏱️' },
      { value: '70%', label: 'Smaller footprint', icon: '📦' }
    ],
    examples: ['Tesla Megapack', 'Schneider Galaxy', 'Vertiv Liebert', 'Eaton 93PM'],
    companies: ['Tesla', 'Schneider Electric', 'Eaton', 'Vertiv'],
    futureImpact: 'Solid-state batteries promise even higher efficiency and safety, potentially reaching 98%+ round-trip efficiency.',
    color: '#8B5CF6'
  },
  {
    icon: '🏠',
    title: 'Home Energy Storage',
    short: 'Optimizing residential systems',
    tagline: 'Tesla Powerwall and beyond',
    description: 'Residential battery systems must balance efficiency, cost, and safety. Understanding power distribution helps homeowners make informed decisions about system voltage and battery chemistry.',
    connection: 'Home systems typically use 48V DC bus voltage—high enough to reduce I²R losses but low enough to be safely touched (under 60V DC threshold). This sweet spot optimizes efficiency without requiring industrial safety measures.',
    howItWorks: 'Solar charge controllers feed a 48V battery bank, which supplies a hybrid inverter for AC loads. DC-coupled systems achieve 97%+ efficiency from solar to battery to grid.',
    stats: [
      { value: '48V', label: 'Safe DC bus voltage', icon: '⚡' },
      { value: '97%', label: 'System efficiency', icon: '📊' },
      { value: '$10K', label: 'Typical system cost', icon: '💰' }
    ],
    examples: ['Tesla Powerwall', 'Enphase IQ Battery', 'LG RESU', 'Generac PWRcell'],
    companies: ['Tesla', 'Enphase', 'LG', 'Generac'],
    futureImpact: 'Vehicle-to-home (V2H) systems will use EV batteries for home backup, leveraging the 400-800V architecture.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const UPSEfficiencyRenderer: React.FC<UPSEfficiencyRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [voltage, setVoltage] = useState(12); // Distribution voltage
  const [power, setPower] = useState(10000); // Watts
  const [wireResistance, setWireResistance] = useState(0.01); // Ohms
  const [batteryChemistry, setBatteryChemistry] = useState<'lead' | 'lithium'>('lead');
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Energy yellow
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    voltage: '#3B82F6',
    current: '#EF4444',
    power: '#10B981',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Battery Lab',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate I²R losses
  const current = power / voltage;
  const wireLoss = current * current * wireResistance;
  const wireLossPercent = (wireLoss / power) * 100;
  const deliveredPower = power - wireLoss;

  // Battery efficiency
  const batteryEfficiency = batteryChemistry === 'lithium' ? 0.95 : 0.80;
  const roundTripLoss = (1 - batteryEfficiency) * 100;

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Wire visualization component
  const WireVisualization = () => {
    const width = isMobile ? 320 : 450;
    const height = 200;
    const wireThickness = Math.max(2, Math.min(30, current / 30));
    const heatGlow = Math.min(1, wireLossPercent / 10);

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* UPS */}
        <rect x="20" y="60" width="80" height="80" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
        <text x="60" y="95" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">UPS</text>
        <text x="60" y="115" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="700">{voltage}V</text>

        {/* Wire with current animation */}
        <g>
          {/* Wire glow (heat) */}
          <line
            x1="100"
            y1="100"
            x2={width - 100}
            y2="100"
            stroke={colors.error}
            strokeWidth={wireThickness + 10}
            opacity={heatGlow * 0.3}
            strokeLinecap="round"
          />
          {/* Wire */}
          <line
            x1="100"
            y1="100"
            x2={width - 100}
            y2="100"
            stroke={colors.current}
            strokeWidth={wireThickness}
            strokeLinecap="round"
          />
          {/* Current flow animation */}
          {[0, 1, 2, 3, 4].map(i => (
            <circle
              key={i}
              cx={100 + ((animationFrame * 3 + i * 50) % (width - 200))}
              cy="100"
              r={Math.max(3, wireThickness / 3)}
              fill={colors.accent}
              opacity={0.8}
            />
          ))}
        </g>

        {/* Load */}
        <rect x={width - 100} y="60" width="80" height="80" rx="8" fill={colors.bgSecondary} stroke={colors.power} strokeWidth="2" />
        <text x={width - 60} y="95" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">LOAD</text>
        <text x={width - 60} y="115" fill={colors.power} fontSize="14" textAnchor="middle" fontWeight="700">{(deliveredPower / 1000).toFixed(1)}kW</text>

        {/* Current label */}
        <text x={width / 2} y="80" fill={colors.current} fontSize="14" textAnchor="middle" fontWeight="600">
          {current.toFixed(0)}A
        </text>

        {/* Loss indicator */}
        <text x={width / 2} y="140" fill={wireLossPercent > 5 ? colors.error : colors.textSecondary} fontSize="12" textAnchor="middle">
          Cable Loss: {wireLoss.toFixed(0)}W ({wireLossPercent.toFixed(1)}%)
        </text>

        {wireLossPercent > 5 && (
          <text x={width / 2} y="160" fill={colors.error} fontSize="11" textAnchor="middle">
            🔥 Significant heat generation!
          </text>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔋⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          UPS Efficiency & Voltage
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why not just run everything off a huge 5V battery?" The answer reveals why <span style={{ color: colors.accent }}>data centers use 48V</span> and why electric cars are going to 800V.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Double the voltage, quarter the cable losses. It's simple physics with billion-dollar consequences."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Data Center Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover I²R →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Current stays the same—voltage determines only the "push"' },
      { id: 'b', text: 'Current doubles—more voltage means more flow' },
      { id: 'c', text: 'Current is halved—higher voltage delivers same power with less current' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A 10kW load can be powered at 12V or 24V. What happens to the current when you double the voltage?
          </h2>

          {/* Visual diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.h2, color: colors.voltage }}>12V</div>
                <div style={{ ...typo.body, color: colors.textMuted }}>Low Voltage</div>
                <div style={{ ...typo.h3, color: colors.current }}>???A</div>
              </div>
              <div style={{ fontSize: '32px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.h2, color: colors.voltage }}>24V</div>
                <div style={{ ...typo.body, color: colors.textMuted }}>Higher Voltage</div>
                <div style={{ ...typo.h3, color: colors.current }}>???A</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', ...typo.body, color: colors.power }}>
              Both delivering <strong>10,000W</strong> to the load
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive I²R Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Voltage vs Cable Losses
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust the distribution voltage and watch what happens to current and losses
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <WireVisualization />
            </div>

            {/* Voltage slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>⚡ Distribution Voltage</span>
                <span style={{ ...typo.small, color: colors.voltage, fontWeight: 600 }}>{voltage}V</span>
              </div>
              <input
                type="range"
                min="5"
                max="48"
                value={voltage}
                onChange={(e) => setVoltage(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.error }}>5V (USB)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>12V (Car)</span>
                <span style={{ ...typo.small, color: colors.success }}>48V (Data Center)</span>
              </div>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.voltage }}>{voltage}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Voltage</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.current }}>{current.toFixed(0)}A</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: wireLossPercent > 5 ? colors.error : colors.warning }}>
                  {wireLoss.toFixed(0)}W
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cable Loss</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.power }}>{(deliveredPower / 1000).toFixed(2)}kW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Delivered</div>
              </div>
            </div>
          </div>

          {/* I²R formula highlight */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ ...typo.h3, color: colors.accent, fontFamily: 'monospace', marginBottom: '8px' }}>
              Power Loss = I² × R
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              {current.toFixed(0)}² × {wireResistance} = <strong style={{ color: colors.error }}>{wireLoss.toFixed(0)}W</strong>
            </div>
            <div style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              Double the voltage → Half the current → 1/4 the losses!
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The I²R Revelation
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Power = Voltage × Current</strong> (P = V × I)
              </p>
              <p style={{ marginBottom: '16px' }}>
                For the same power delivery, <span style={{ color: colors.voltage }}>higher voltage</span> means <span style={{ color: colors.current }}>lower current</span>.
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                fontFamily: 'monospace',
              }}>
                <div style={{ color: colors.textPrimary, marginBottom: '8px' }}>10kW at different voltages:</div>
                <div style={{ color: colors.error }}>5V → 2,000A → Loss = 40,000W (!)</div>
                <div style={{ color: colors.warning }}>12V → 833A → Loss = 6,944W</div>
                <div style={{ color: colors.success }}>48V → 208A → Loss = 433W</div>
              </div>

              <p>
                The <span style={{ color: colors.error, fontWeight: 600 }}>I²</span> term is the key: double the current means <em>four times</em> the losses!
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.voltage}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.voltage, margin: 0 }}>Higher Voltage</h3>
              </div>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Lower current for same power</li>
                <li>Thinner, cheaper cables</li>
                <li>Less heat, higher efficiency</li>
              </ul>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.error}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Lower Voltage</h3>
              </div>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Higher current = more heat</li>
                <li>Thicker cables required</li>
                <li>More energy wasted</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Battery Chemistry →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Lead-acid is better—it\'s proven technology' },
      { id: 'b', text: 'Both are equally efficient—batteries are batteries' },
      { id: 'c', text: 'Lithium is significantly more efficient, saving 15%+ energy per cycle' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🔋 New Variable: Battery Chemistry
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Data centers can use lead-acid or lithium batteries for UPS backup. Which is more efficient for storing and retrieving energy?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Compare Batteries →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const leadEfficiency = 0.80;
    const lithiumEfficiency = 0.95;
    const cyclesPerYear = 365;
    const energyPerCycle = 100; // kWh
    const leadLossPerYear = energyPerCycle * (1 - leadEfficiency) * cyclesPerYear;
    const lithiumLossPerYear = energyPerCycle * (1 - lithiumEfficiency) * cyclesPerYear;
    const savingsPerYear = leadLossPerYear - lithiumLossPerYear;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Battery Efficiency Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Select a battery type and see the efficiency impact
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Battery selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => setBatteryChemistry('lead')}
                style={{
                  background: batteryChemistry === 'lead' ? `${colors.error}22` : colors.bgSecondary,
                  border: `2px solid ${batteryChemistry === 'lead' ? colors.error : colors.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔋</div>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>Lead-Acid</div>
                <div style={{ ...typo.body, color: colors.error, fontWeight: 600 }}>80% efficient</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>500-1000 cycles</div>
              </button>
              <button
                onClick={() => setBatteryChemistry('lithium')}
                style={{
                  background: batteryChemistry === 'lithium' ? `${colors.success}22` : colors.bgSecondary,
                  border: `2px solid ${batteryChemistry === 'lithium' ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚡</div>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>Lithium-Ion</div>
                <div style={{ ...typo.body, color: colors.success, fontWeight: 600 }}>95% efficient</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>3000-5000 cycles</div>
              </button>
            </div>

            {/* Efficiency visualization */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                Round-trip Efficiency (100kWh cycle)
              </div>
              <div style={{
                height: '40px',
                background: colors.bgSecondary,
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${batteryEfficiency * 100}%`,
                  background: batteryChemistry === 'lithium' ? colors.success : colors.error,
                  transition: 'all 0.3s ease',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  ...typo.h3,
                  color: 'white',
                  textShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}>
                  {(batteryEfficiency * 100).toFixed(0)}% returned
                </div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>
                  Energy in: 100kWh
                </span>
                <span style={{ ...typo.small, color: batteryChemistry === 'lithium' ? colors.success : colors.error }}>
                  Lost as heat: {((1 - batteryEfficiency) * 100).toFixed(0)}kWh
                </span>
              </div>
            </div>

            {/* Annual comparison */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Annual Energy Loss (daily cycling)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.error }}>{leadLossPerYear.toLocaleString()}kWh</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Lead-acid</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.success }}>{lithiumLossPerYear.toLocaleString()}kWh</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Lithium-ion</div>
                </div>
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: `${colors.success}22`,
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <span style={{ ...typo.body, color: colors.success, fontWeight: 600 }}>
                  Lithium saves {savingsPerYear.toLocaleString()}kWh/year ({(savingsPerYear * 0.10).toLocaleString()} at $0.10/kWh)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Trade-offs →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Complete Picture
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Voltage: I²R Losses</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Higher distribution voltage dramatically reduces cable losses. <span style={{ color: colors.success }}>Going from 12V to 48V cuts losses by 16×.</span>
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔋</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Chemistry: Round-Trip Efficiency</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Lithium-ion batteries are 15% more efficient than lead-acid. <span style={{ color: colors.success }}>For daily cycling, this saves thousands in energy costs annually.</span>
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Total Cost of Ownership</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Higher upfront cost (48V systems, lithium batteries) is often justified by <span style={{ color: colors.success }}>lower operating costs, reduced copper, and longer lifespan.</span>
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              💡 Why This Matters
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Understanding I²R losses and battery efficiency explains major industry trends: data centers moving to 48V, EVs adopting 800V, and lithium replacing lead-acid. Physics drives economics!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How I²R Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered UPS Efficiency & Voltage!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Power Distribution Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why voltage matters for efficiency and how battery chemistry affects energy storage economics.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'P = V × I: Higher voltage = lower current',
              'I²R: Cable losses scale with current squared',
              '48V vs 12V: 16× less cable loss',
              'Battery efficiency: Li-ion 95% vs lead 80%',
              'Total cost of ownership analysis',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default UPSEfficiencyRenderer;
