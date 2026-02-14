'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON BLADE FACTORY - Complete 10-Phase Game
// Turbine engineering tradeoffs: bigger = more efficient but harder to build/transport/maintain
// -----------------------------------------------------------------------------

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

interface BladeFactoryRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A wind turbine designer is considering doubling the rotor diameter from 120m to 240m to capture more energy.",
    question: "According to the Betz limit, what is the maximum fraction of wind energy a turbine can extract?",
    options: [
      { id: 'a', label: "About 59.3% (16/27)", correct: true },
      { id: 'b', label: "100% - all of it" },
      { id: 'c', label: "About 25% of wind energy" },
      { id: 'd', label: "About 80% of wind energy" }
    ],
    explanation: "The Betz limit (16/27 ≈ 59.3%) is a theoretical maximum. If a turbine captured 100% of wind energy, air behind it would stop and block new air from arriving."
  },
  {
    scenario: "An engineer notices that doubling rotor diameter from 80m to 160m increases power from 2MW to 8MW, but blade mass went from 12t to 96t.",
    question: "What scaling laws explain this difference?",
    options: [
      { id: 'a', label: "Power scales with d² (swept area) but mass scales with d³ (volume)", correct: true },
      { id: 'b', label: "Both scale linearly with diameter" },
      { id: 'c', label: "Power scales with d³ and mass with d²" },
      { id: 'd', label: "They both scale with d²" }
    ],
    explanation: "Power ∝ swept area ∝ d² (4x for doubling), while mass ∝ volume ∝ d³ (8x for doubling). This square-cube law is the fundamental challenge of scaling turbines."
  },
  {
    scenario: "A blade tip on a 160m rotor spinning at 12 RPM is moving through the air at high speed.",
    question: "Approximately how fast is the blade tip moving?",
    options: [
      { id: 'a', label: "About 100 m/s (360 km/h)", correct: true },
      { id: 'b', label: "About 10 m/s (36 km/h)" },
      { id: 'c', label: "About 500 m/s (supersonic)" },
      { id: 'd', label: "About 1 m/s (walking speed)" }
    ],
    explanation: "Tip speed = π × diameter × RPM / 60 = π × 160 × 12 / 60 ≈ 100 m/s. This is about 360 km/h — faster than a Formula 1 car!"
  },
  {
    scenario: "A wind farm developer is choosing between 80m onshore turbines and 260m offshore turbines for a coastal project.",
    question: "What is the primary advantage of going offshore with larger turbines?",
    options: [
      { id: 'a', label: "No road transport width limits and stronger, steadier winds", correct: true },
      { id: 'b', label: "Lower construction costs" },
      { id: 'c', label: "Easier maintenance access" },
      { id: 'd', label: "Less environmental impact" }
    ],
    explanation: "Offshore removes the ~4.5m road width constraint for blade transport, enabling much larger rotors. Offshore winds are also 40-60% stronger and more consistent."
  },
  {
    scenario: "Modern turbine blades are made from composite materials rather than steel or aluminum.",
    question: "Why are fiberglass and carbon fiber composites preferred for turbine blades?",
    options: [
      { id: 'a', label: "High strength-to-weight ratio allows longer blades without excessive mass", correct: true },
      { id: 'b', label: "They are cheaper than steel" },
      { id: 'c', label: "They conduct electricity better" },
      { id: 'd', label: "They are easier to recycle" }
    ],
    explanation: "Composites offer 3-5x the strength-to-weight ratio of steel. Since mass scales with d³, keeping blades light is critical for larger rotors."
  },
  {
    scenario: "A 160m rotor turbine has a nameplate capacity of 8MW but only produces an average of 3.2MW over a year.",
    question: "What is the capacity factor, and why isn't it 100%?",
    options: [
      { id: 'a', label: "40% — wind doesn't blow at rated speed all the time", correct: true },
      { id: 'b', label: "40% — the turbine is broken 60% of the time" },
      { id: 'c', label: "80% — most energy is captured" },
      { id: 'd', label: "20% — turbines are very inefficient" }
    ],
    explanation: "Capacity factor = average output / nameplate capacity = 3.2/8 = 40%. Wind varies constantly; offshore farms achieve 45-55% vs 25-35% onshore."
  },
  {
    scenario: "The tip-speed ratio (TSR) is the ratio of blade tip speed to wind speed. Most modern turbines operate at TSR ≈ 7.",
    question: "What happens if the tip-speed ratio is too low or too high?",
    options: [
      { id: 'a', label: "Too low: wind passes through uncaptured. Too high: turbulence from previous blade passage.", correct: true },
      { id: 'b', label: "Nothing — TSR doesn't affect efficiency" },
      { id: 'c', label: "Too low: blades break. Too high: generator overheats" },
      { id: 'd', label: "Higher TSR is always better" }
    ],
    explanation: "At low TSR, too much wind slips between blades. At high TSR, each blade hits the turbulent wake of the preceding blade, reducing lift and efficiency."
  },
  {
    scenario: "GE's Haliade-X has 107m blades — each longer than a football field. Transporting them is a major challenge.",
    question: "How are such massive blades typically transported to offshore sites?",
    options: [
      { id: 'a', label: "By specialized vessels from coastal factories — they cannot travel by road", correct: true },
      { id: 'b', label: "By helicopter" },
      { id: 'c', label: "By standard highway trucks" },
      { id: 'd', label: "They are 3D-printed on site" }
    ],
    explanation: "107m blades are far too large for roads (max ~4.5m width, ~75m length with escorts). They must be manufactured near ports and shipped by barge or specialized vessel."
  },
  {
    scenario: "A turbine blade experiences multiple simultaneous forces during operation: aerodynamic lift, drag, gravity, and centrifugal force.",
    question: "Which force creates the most severe fatigue loading on a blade?",
    options: [
      { id: 'a', label: "Gravity — it reverses direction every half rotation, causing cyclic stress", correct: true },
      { id: 'b', label: "Centrifugal — it constantly pulls the blade outward" },
      { id: 'c', label: "Lift — it varies with wind speed" },
      { id: 'd', label: "Drag — it opposes blade motion" }
    ],
    explanation: "Gravity alternately compresses and stretches each blade every rotation. Over 20 years at 12 RPM, that's ~126 million load-reversal cycles — extreme fatigue loading."
  },
  {
    scenario: "Vestas has developed segmented blades that split into 2 pieces for road transport, then join at the installation site.",
    question: "What is the main engineering challenge of segmented blade design?",
    options: [
      { id: 'a', label: "The joint must handle enormous bending loads without adding significant weight or flex", correct: true },
      { id: 'b', label: "The segments don't fit together precisely enough" },
      { id: 'c', label: "Paint matching between segments" },
      { id: 'd', label: "Electrical connections between segments" }
    ],
    explanation: "The blade root experiences bending moments of 50+ MNm. The joint must transfer these loads with zero play while adding minimal mass and maintaining aerodynamic profile."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F30A}',
    title: 'GE Haliade-X 260m',
    short: 'The world\'s most powerful offshore wind turbine',
    tagline: 'Pushing the boundaries of offshore wind engineering',
    description: 'The GE Haliade-X features a 260m rotor diameter with 107m blades — each longer than a football field. It generates 15MW, enough to power 16,000 homes. The nacelle sits 150m above sea level, and the entire structure weighs over 2,500 tonnes. Each blade sweeps an area of 53,000 m², larger than 7 football pitches.',
    connection: 'Power ∝ d² means the 260m rotor captures (260/80)² = 10.6× more energy than an 80m turbine, but mass ∝ d³ means each blade weighs 55 tonnes.',
    howItWorks: 'Three 107m composite blades rotate at 7.8 RPM, driving a direct-drive permanent magnet generator. Blade pitch adjusts continuously to optimize power capture.',
    stats: [
      { value: '107m', label: 'Blade length', icon: '\u{1F4CF}' },
      { value: '260m', label: 'Rotor diameter', icon: '\u{2B55}' },
      { value: '15MW', label: 'Power rating', icon: '\u{26A1}' }
    ],
    examples: ['Dogger Bank Wind Farm', 'Vineyard Wind', 'Ocean Wind', 'Empire Wind'],
    companies: ['GE Renewable Energy', 'Dogger Bank', 'Equinor', 'SSE Renewables'],
    futureImpact: 'Next-generation 20MW+ turbines with 300m+ rotors are already in development, pushing blade engineering further.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F527}',
    title: 'Vestas Modular Blade',
    short: 'Segmented blade design solves the transport problem',
    tagline: 'Building bigger blades that fit on roads',
    description: 'Vestas\'s modular blade splits into 2 segments that can be transported by standard road vehicles within the ~4.5m width limit. At the installation site, the segments are joined using a patented steel-reinforced connection that handles the enormous bending loads. This allows 115m+ blades for onshore sites that would otherwise be limited to ~65m.',
    connection: 'The square-cube law means longer blades capture vastly more energy (∝ d²), so solving transport enables bigger onshore turbines without offshore costs.',
    howItWorks: 'Each segment is manufactured and cured separately, then joined with a precision-engineered steel bushing connection at the wind farm site.',
    stats: [
      { value: '2 segments', label: 'Blade sections', icon: '\u{1F9E9}' },
      { value: '115m', label: 'Total blade length', icon: '\u{1F4CF}' },
      { value: 'road legal', label: 'Transport method', icon: '\u{1F6E3}\u{FE0F}' }
    ],
    examples: ['US Great Plains wind farms', 'European onshore projects', 'Australian wind farms', 'Indian wind corridor'],
    companies: ['Vestas', 'LM Wind Power', 'TPI Composites', 'Siemens Gamesa'],
    futureImpact: 'Modular designs could enable 150m+ onshore blades, closing the gap with offshore turbine performance.',
    color: '#10B981'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX Rocket Transport Analogy',
    short: 'Oversized cargo logistics parallel wind blade challenges',
    tagline: 'When your product doesn\'t fit on a truck',
    description: 'SpaceX faces similar logistical constraints as wind blade manufacturers. The Falcon 9 first stage (3.7m diameter, 42m long) requires special permits for road transport, while Starship (9m diameter, 50m long) can only be moved by barge. This mirrors how wind turbine components have outgrown road infrastructure.',
    connection: 'Both industries face the same fundamental constraint: road infrastructure was designed for vehicles under 4.5m wide and 30m long. Anything larger needs water transport or modular design.',
    howItWorks: 'SpaceX built their Starship factory at Boca Chica specifically to have direct barge access, just as offshore blade factories locate near deep-water ports.',
    stats: [
      { value: '9m', label: 'Starship diameter', icon: '\u{1F680}' },
      { value: '50m', label: 'Stage length', icon: '\u{1F4CF}' },
      { value: 'special permits', label: 'Road transport', icon: '\u{1F6A8}' }
    ],
    examples: ['Falcon 9 road transport', 'Starship barge transport', 'Saturn V barge transport', 'SLS core stage barge'],
    companies: ['SpaceX', 'NASA', 'ULA', 'Blue Origin'],
    futureImpact: 'On-site manufacturing and 3D printing may eventually eliminate transport constraints for both rockets and blades.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F69B}',
    title: 'Tesla Semi & Heavy Lift Logistics',
    short: 'Moving 600-tonne nacelles to the top of towers',
    tagline: 'When the crane weighs more than the building',
    description: 'A 15MW offshore turbine nacelle weighs up to 600 tonnes and must be lifted 150m into the air. Standard highway weight limits are about 36 tonnes (80,000 lbs). Installation requires specialized jack-up vessels costing $200,000+ per day. Each blade lift is a precision operation in potentially rough seas with millimeter tolerances.',
    connection: 'Mass ∝ d³ means that as turbines grow, the logistics challenge grows even faster than the energy benefit. A 2× diameter increase means 8× heavier components.',
    howItWorks: 'Jack-up vessels position steel legs on the seabed, lift themselves above wave height, then use 1,500-tonne cranes to assemble the turbine.',
    stats: [
      { value: '600t', label: 'Nacelle mass', icon: '\u{2696}\u{FE0F}' },
      { value: '80,000lb', label: 'Road weight limit', icon: '\u{1F6E3}\u{FE0F}' },
      { value: 'crane required', label: 'Installation method', icon: '\u{1F3D7}\u{FE0F}' }
    ],
    examples: ['Offshore jack-up vessels', 'Heavy-lift helicopters', 'Self-erecting tower cranes', 'Modular tower sections'],
    companies: ['Tesla Energy', 'Mammoet', 'Sarens', 'Liebherr'],
    futureImpact: 'Self-climbing installation systems and telescoping towers may eliminate the need for massive external cranes.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_BladeFactoryRenderer: React.FC<BladeFactoryRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Rotor diameter in meters
  const [rotorDiameter, setRotorDiameter] = useState(160);

  // Twist phase - offshore scenario
  const [offshoreDistance, setOffshoreDistance] = useState(50);
  const [waveHeight, setWaveHeight] = useState(2);

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

  // Animation state
  const [bladeAngle, setBladeAngle] = useState(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Blade rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBladeAngle(prev => (prev + 1.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate turbine properties based on rotor diameter
  const calculatePower = (d: number) => {
    // Power ∝ d², normalized: 80m = 2MW
    const basePower = 2; // MW at 80m
    const baseDiameter = 80;
    return basePower * Math.pow(d / baseDiameter, 2);
  };

  const calculateBladeMass = (d: number) => {
    // Mass ∝ d³, normalized: 80m blade ≈ 12 tonnes
    const baseMass = 12; // tonnes at 80m
    const baseDiameter = 80;
    return baseMass * Math.pow(d / baseDiameter, 3);
  };

  const calculateSweptArea = (d: number) => {
    return Math.PI * Math.pow(d / 2, 2);
  };

  const calculateCapacityFactor = (d: number) => {
    // Larger rotors have better capacity factors due to lower specific power
    // 80m ≈ 28%, 260m ≈ 52%
    return 0.28 + (d - 80) * (0.24 / 180);
  };

  const calculateTipSpeed = (d: number, rpm: number) => {
    return Math.PI * d * rpm / 60;
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'blade-factory',
        gameTitle: 'Blade Factory',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Current turbine calculations
  const power = calculatePower(rotorDiameter);
  const bladeMass = calculateBladeMass(rotorDiameter);
  const sweptArea = calculateSweptArea(rotorDiameter);
  const capacityFactor = calculateCapacityFactor(rotorDiameter);
  const rpm = Math.max(5, 18 - (rotorDiameter - 80) * 0.06);
  const tipSpeed = calculateTipSpeed(rotorDiameter, rpm);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
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
          data-navigation-dot="true"
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // Wind Turbine SVG Visualization
  const TurbineVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 400;
    const cx = width / 2;
    const cy = 160;
    const bladeLen = 30 + (rotorDiameter - 80) * 0.4;
    const sweptR = bladeLen + 5;
    const betzFraction = 0.593;
    const powerFraction = Math.min(1, power / 20);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="towerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <linearGradient id="powerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="sweptGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="bladeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nacGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="forceGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#skyGrad)" rx="12" />

        {/* Ground */}
        <rect x="0" y={height - 50} width={width} height="50" fill="#1a3a1a" rx="0" />
        <line x1="0" y1={height - 50} x2={width} y2={height - 50} stroke="#2a5a2a" strokeWidth="2" />

        {/* Grid lines */}
        <line x1="30" y1="30" x2={width - 30} y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="100" x2={width - 30} y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={cx} y1="30" x2={cx} y2={height - 60} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Wind arrows */}
        <g opacity="0.4">
          <line x1="20" y1={cy - 40} x2="55" y2={cy - 40} stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowEnd)" />
          <line x1="15" y1={cy} x2="50" y2={cy} stroke="#3B82F6" strokeWidth="2.5" />
          <line x1="20" y1={cy + 40} x2="55" y2={cy + 40} stroke="#3B82F6" strokeWidth="2" />
          <polygon points={`55,${cy - 44} 65,${cy - 40} 55,${cy - 36}`} fill="#3B82F6" />
          <polygon points={`50,${cy - 4} 60,${cy} 50,${cy + 4}`} fill="#3B82F6" />
          <polygon points={`55,${cy + 36} 65,${cy + 40} 55,${cy + 44}`} fill="#3B82F6" />
          <text x="15" y={cy - 55} fill="#3B82F6" fontSize="11" fontWeight="600">Wind</text>
        </g>

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Wind Turbine Cross-Section — {rotorDiameter}m Rotor
        </text>

        {/* Tower */}
        <rect x={cx - 6} y={cy + 12} width="12" height={height - cy - 62} fill="url(#towerGrad)" rx="2" />

        {/* Foundation */}
        <rect x={cx - 20} y={height - 55} width="40" height="10" fill="#4b5563" rx="3" />

        {/* Swept area circle */}
        <circle cx={cx} cy={cy} r={sweptR} fill="url(#sweptGlow)" stroke={colors.accent} strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />
        <text x={cx + sweptR + 5} y={cy - 8} fill={colors.accent} fontSize="11" opacity="0.7">Swept Area</text>

        {/* Betz limit ring */}
        <circle cx={cx} cy={cy} r={sweptR * betzFraction} fill="none" stroke={colors.success} strokeWidth="1" strokeDasharray="3,5" opacity="0.3" />

        {/* Rotating blades group */}
        <g transform={`rotate(${bladeAngle}, ${cx}, ${cy})`}>
          {/* Blade 1 (0 degrees - pointing up) */}
          <polygon
            points={`${cx},${cy} ${cx - 4},${cy - bladeLen * 0.3} ${cx - 5},${cy - bladeLen * 0.6} ${cx - 3},${cy - bladeLen} ${cx},${cy - bladeLen - 2} ${cx + 2},${cy - bladeLen} ${cx + 3},${cy - bladeLen * 0.6} ${cx + 2},${cy - bladeLen * 0.3}`}
            fill="url(#bladeGrad)"
            stroke="#e2e8f0"
            strokeWidth="0.5"
            filter="url(#bladeGlow)"
          />
          {/* Blade 2 (120 degrees) */}
          <g transform={`rotate(120, ${cx}, ${cy})`}>
            <polygon
              points={`${cx},${cy} ${cx - 4},${cy - bladeLen * 0.3} ${cx - 5},${cy - bladeLen * 0.6} ${cx - 3},${cy - bladeLen} ${cx},${cy - bladeLen - 2} ${cx + 2},${cy - bladeLen} ${cx + 3},${cy - bladeLen * 0.6} ${cx + 2},${cy - bladeLen * 0.3}`}
              fill="url(#bladeGrad)"
              stroke="#e2e8f0"
              strokeWidth="0.5"
              filter="url(#bladeGlow)"
            />
          </g>
          {/* Blade 3 (240 degrees) */}
          <g transform={`rotate(240, ${cx}, ${cy})`}>
            <polygon
              points={`${cx},${cy} ${cx - 4},${cy - bladeLen * 0.3} ${cx - 5},${cy - bladeLen * 0.6} ${cx - 3},${cy - bladeLen} ${cx},${cy - bladeLen - 2} ${cx + 2},${cy - bladeLen} ${cx + 3},${cy - bladeLen * 0.6} ${cx + 2},${cy - bladeLen * 0.3}`}
              fill="url(#bladeGrad)"
              stroke="#e2e8f0"
              strokeWidth="0.5"
              filter="url(#bladeGlow)"
            />
          </g>
        </g>

        {/* Force arrows on blade tip (blade 1 direction, adjusted by angle) */}
        {(() => {
          const tipX = cx + Math.sin(bladeAngle * Math.PI / 180) * bladeLen;
          const tipY = cy - Math.cos(bladeAngle * Math.PI / 180) * bladeLen;
          return (
            <g>
              {/* Lift force - perpendicular to blade, green */}
              <line x1={tipX} y1={tipY} x2={tipX - 18} y2={tipY - 8} stroke={colors.success} strokeWidth="2" filter="url(#forceGlow)" />
              <circle cx={tipX - 18} cy={tipY - 8} r="3" fill={colors.success} />
              {/* Drag force - opposing rotation, red */}
              <line x1={tipX} y1={tipY} x2={tipX + 12} y2={tipY + 10} stroke={colors.error} strokeWidth="2" filter="url(#forceGlow)" />
              <circle cx={tipX + 12} cy={tipY + 10} r="3" fill={colors.error} />
              {/* Centrifugal - outward along blade, orange */}
              <line x1={tipX} y1={tipY} x2={tipX + Math.sin(bladeAngle * Math.PI / 180) * 15} y2={tipY - Math.cos(bladeAngle * Math.PI / 180) * 15} stroke={colors.warning} strokeWidth="2" filter="url(#forceGlow)" />
              <circle cx={tipX + Math.sin(bladeAngle * Math.PI / 180) * 15} cy={tipY - Math.cos(bladeAngle * Math.PI / 180) * 15} r="3" fill={colors.warning} />
              {/* Gravity - always down, blue */}
              <line x1={tipX} y1={tipY} x2={tipX} y2={tipY + 18} stroke="#3B82F6" strokeWidth="2" filter="url(#forceGlow)" />
              <circle cx={tipX} cy={tipY + 18} r="3" fill="#3B82F6" />
            </g>
          );
        })()}

        {/* Hub / nacelle */}
        <ellipse cx={cx} cy={cy} rx="10" ry="8" fill="#374151" stroke="#6b7280" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="4" fill={colors.accent} filter="url(#nacGlow)" />

        {/* Power output bar */}
        <g>
          <text x={width - 55} y={50} fill={colors.textMuted} fontSize="11" textAnchor="middle">Power</text>
          <rect x={width - 65} y={55} width="20" height="120" rx="4" fill={colors.border} />
          <rect
            x={width - 65}
            y={55 + 120 * (1 - powerFraction)}
            width="20"
            height={120 * powerFraction}
            rx="4"
            fill="url(#powerGrad)"
            filter="url(#bladeGlow)"
          />
          <text x={width - 55} y={185} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="700">
            {power.toFixed(1)}MW
          </text>
        </g>

        {/* Force legend */}
        <g>
          <circle cx={30} cy={height - 35} r="5" fill={colors.success} />
          <text x={40} y={height - 32} fill={colors.success} fontSize="11">Lift</text>
          <circle cx={80} cy={height - 35} r="5" fill={colors.error} />
          <text x={90} y={height - 32} fill={colors.error} fontSize="11">Drag</text>
          <circle cx={130} cy={height - 35} r="5" fill={colors.warning} />
          <text x={140} y={height - 32} fill={colors.warning} fontSize="11">Centrifugal</text>
          <circle cx={210} cy={height - 35} r="5" fill="#3B82F6" />
          <text x={220} y={height - 32} fill="#3B82F6" fontSize="11">Gravity</text>
        </g>

        {/* Power scaling curve (power vs diameter) with interactive marker */}
        {(() => {
          const curveLeft = 80;
          const curveRight = width - 80;
          const curveTop = 220;
          const curveBottom = height - 55;
          const curveW = curveRight - curveLeft;
          const curveH = curveBottom - curveTop;
          const maxPow = calculatePower(260);
          const steps = [80, 100, 120, 140, 160, 180, 200, 220, 240, 260];
          const pts = steps.map(d => {
            const xFrac = (d - 80) / (260 - 80);
            const pFrac = calculatePower(d) / maxPow;
            return { x: curveLeft + xFrac * curveW, y: curveBottom - pFrac * curveH };
          });
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
          const markerXFrac = (rotorDiameter - 80) / (260 - 80);
          const markerPFrac = power / maxPow;
          const markerX = curveLeft + markerXFrac * curveW;
          const markerY = curveBottom - markerPFrac * curveH;
          return (
            <g>
              {/* Curve axis labels */}
              <text x={curveLeft - 5} y={curveTop - 5} fill={colors.textMuted} fontSize="11" textAnchor="end">Power</text>
              <text x={curveRight + 5} y={curveBottom + 12} fill={colors.textMuted} fontSize="11" textAnchor="start">Diameter</text>
              {/* Scaling curve path */}
              <path d={pathD} stroke={colors.accent} fill="none" strokeWidth="2.5" opacity="0.9" />
              {/* Interactive marker */}
              <circle cx={markerX} cy={markerY} r="7" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#bladeGlow)" />
              <text x={markerX} y={markerY - 12} fill={colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">
                {power.toFixed(1)}MW
              </text>
            </g>
          );
        })()}

        {/* Scaling law annotation */}
        <rect x={20} y={height - 20} width={width - 40} height="16" rx="4" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" />
        <text x={width / 2} y={height - 9} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          P = 0.5 * Cp * rho * A * v^3 | A = pi*(d/2)^2 = {sweptArea.toFixed(0)} m^2
        </text>
      </svg>
    );
  };

  // Offshore Visualization for twist_play
  const OffshoreVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const distNorm = (offshoreDistance - 10) / 190;
    const waveNorm = (waveHeight - 0.5) / 5.5;
    const corrFactor = 1 + waveHeight * 0.04;
    const logisticsCost = 100 + offshoreDistance * 3 + waveHeight * 40;
    const windBonus = 1 + offshoreDistance * 0.004;
    const energyGain = windBonus * Math.pow(windBonus, 2);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f1b2d" />
          </linearGradient>
          <linearGradient id="costGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </linearGradient>
          <filter id="seaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="200" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Offshore Wind Logistics Analysis
        </text>

        {/* Sea cross-section */}
        <rect x={30} y={70} width={width - 60} height={70} rx="4" fill="url(#seaGrad)" />

        {/* Waves */}
        {(() => {
          const waveAmp = 12 + waveHeight * 16;
          const waveBase = 70 + 5;
          return (
            <path
              d={`M 30 ${waveBase} Q ${30 + (width - 60) * 0.1} ${waveBase - waveAmp} ${30 + (width - 60) * 0.2} ${waveBase} Q ${30 + (width - 60) * 0.3} ${waveBase + waveAmp} ${30 + (width - 60) * 0.4} ${waveBase} Q ${30 + (width - 60) * 0.5} ${waveBase - waveAmp} ${30 + (width - 60) * 0.6} ${waveBase} Q ${30 + (width - 60) * 0.7} ${waveBase + waveAmp} ${30 + (width - 60) * 0.8} ${waveBase} Q ${30 + (width - 60) * 0.9} ${waveBase - waveAmp} ${width - 30} ${waveBase}`}
              stroke="#60A5FA"
              fill="none"
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })()}

        {/* Onshore label */}
        <text x={40} y={60} fill="#94a3b8" fontSize="11">Shore</text>
        <rect x={32} y={90} width="8" height="50" fill="#6b7280" rx="2" />

        {/* Offshore turbine position */}
        <g>
          <rect x={30 + (width - 60) * distNorm} y={80} width="4" height="55" fill="#9ca3af" rx="1" />
          <circle cx={32 + (width - 60) * distNorm} cy={78} r="8" fill={colors.accent} filter="url(#seaGlow)" />
          <text x={32 + (width - 60) * distNorm} y={82} fill="white" fontSize="11" textAnchor="middle" fontWeight="700">T</text>
        </g>

        {/* Distance arrow */}
        <line x1={42} y1={148} x2={30 + (width - 60) * distNorm} y2={148} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,3" />
        <text x={(42 + 30 + (width - 60) * distNorm) / 2} y={145} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="600">
          {offshoreDistance}km
        </text>

        {/* Logistics cost bar */}
        <g>
          <text x={width / 2} y={178} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
            Relative Logistics Cost: {logisticsCost.toFixed(0)} units | Corrosion Factor: {corrFactor.toFixed(2)}x
          </text>
          <rect x={50} y={185} width={width - 100} height={16} rx="8" fill={colors.border} />
          <rect
            x={50}
            y={185}
            width={(width - 100) * Math.min(1, logisticsCost / 800)}
            height={16}
            rx="8"
            fill="url(#costGrad)"
            filter={logisticsCost > 500 ? 'url(#seaGlow)' : undefined}
          />
          <circle
            cx={50 + (width - 100) * Math.min(1, logisticsCost / 800)}
            cy={193}
            r="6"
            fill={logisticsCost > 500 ? colors.error : colors.warning}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#seaGlow)"
          />
        </g>

        {/* Energy gain curve */}
        <path
          d={`M 50 ${280 - 10} L 100 ${280 - 22} L 150 ${280 - 38} L 200 ${280 - 55} L 250 ${280 - 72} L 300 ${280 - 85} L 350 ${280 - 95} L 400 ${280 - 102} L ${width - 50} ${280 - 108}`}
          stroke={colors.success}
          fill="none"
          strokeWidth="2"
          opacity="0.5"
        />
        <circle
          cx={50 + distNorm * (width - 100)}
          cy={280 - 10 - distNorm * 98}
          r="6"
          fill={colors.success}
          stroke="white"
          strokeWidth="1.5"
          filter="url(#seaGlow)"
        />
        <text x={width - 60} y={195} fill={colors.success} fontSize="11" opacity="0.7">Energy +{((energyGain - 1) * 100).toFixed(0)}%</text>

        {/* Results text */}
        <text x={width / 2} y={225} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
          Wind Bonus: +{((windBonus - 1) * 100).toFixed(0)}% | Max Blade: unlimited | Cost: {logisticsCost > 500 ? 'HIGH' : logisticsCost > 300 ? 'MODERATE' : 'LOW'}
        </text>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 25} width="12" height="12" rx="2" fill="url(#costGrad)" />
          <text x={57} y={height - 15} fill="#94a3b8" fontSize="11">Cost</text>
          <circle cx={120} cy={height - 19} r="4" fill={colors.success} />
          <text x={130} y={height - 15} fill="#94a3b8" fontSize="11">Energy Gain</text>
          <circle cx={220} cy={height - 19} r="4" fill="#60A5FA" />
          <text x={230} y={height - 15} fill="#94a3b8" fontSize="11">Waves</text>
          <circle cx={300} cy={height - 19} r="4" fill={colors.accent} />
          <text x={310} y={height - 15} fill="#94a3b8" fontSize="11">Turbine</text>
        </g>

        {/* Axis label */}
        <text x={width / 2} y={height - 35} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Distance from Shore / Wave Height
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F32C}\u{FE0F}\u{2699}\u{FE0F}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Blade Factory
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;The world&apos;s largest wind turbine blades are <span style={{ color: colors.accent }}>longer than a football field</span> and sweep an area bigger than the London Eye. But making them bigger creates an impossible engineering puzzle.&quot;
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
              &quot;Wind turbine engineering is a war between the square and the cube. Power grows with area, but mass grows with volume. Every meter of extra blade length is a battle against gravity itself.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Wind Energy Engineering Handbook
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Doubles (2x) - linear scaling with diameter' },
      { id: 'b', text: 'Quadruples (4x) - power scales with swept area (d\u00B2)' },
      { id: 'c', text: 'Stays the same - diameter doesn\'t affect power' },
      { id: 'd', text: 'Increases 8x - cubic scaling with diameter' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If you double a wind turbine&apos;s rotor diameter, how does power output change?
            </h2>

            {/* Static SVG showing two turbines */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictSky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="200" fill="url(#predictSky)" rx="8" />
                <rect x="0" y="170" width="400" height="30" fill="#1a3a1a" />

                {/* Small turbine */}
                <text x="120" y="25" textAnchor="middle" fill="#60A5FA" fontSize="12" fontWeight="600">80m Rotor</text>
                <rect x="117" y="100" width="6" height="70" fill="#6b7280" rx="1" />
                <circle cx="120" cy="98" r="35" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
                <line x1="120" y1="98" x2="120" y2="63" stroke="#cbd5e1" strokeWidth="3" />
                <line x1="120" y1="98" x2="150" y2="115" stroke="#cbd5e1" strokeWidth="3" />
                <line x1="120" y1="98" x2="90" y2="115" stroke="#cbd5e1" strokeWidth="3" />
                <circle cx="120" cy="98" r="6" fill={colors.accent} filter="url(#predictGlow)" />
                <text x="120" y="185" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="700">2 MW</text>

                {/* Large turbine */}
                <text x="290" y="25" textAnchor="middle" fill="#F97316" fontSize="12" fontWeight="600">160m Rotor</text>
                <rect x="287" y="55" width="6" height="115" fill="#6b7280" rx="1" />
                <circle cx="290" cy="52" r="65" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
                <line x1="290" y1="52" x2="290" y2="-10" stroke="#cbd5e1" strokeWidth="4" />
                <line x1="290" y1="52" x2="346" y2="84" stroke="#cbd5e1" strokeWidth="4" />
                <line x1="290" y1="52" x2="234" y2="84" stroke="#cbd5e1" strokeWidth="4" />
                <circle cx="290" cy="52" r="8" fill={colors.accent} filter="url(#predictGlow)" />
                <text x="290" y="185" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="700">??? MW</text>
              </svg>
            </div>

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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Turbine Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Wind Turbine Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> The square-cube law is the central challenge of wind energy engineering. Power grows with the square of diameter (swept area), but blade mass grows with the cube (volume). This determines the economic and physical limits of turbine size.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Swept Area</strong> is the circular area traced by the rotating blades. More area means more wind energy captured.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Betz Limit (59.3%)</strong> is the theoretical maximum fraction of wind energy a turbine can extract, derived from conservation of mass and momentum.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>Capacity Factor</strong> is the ratio of actual energy produced to the theoretical maximum if the turbine ran at full power 24/7.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a wind turbine cross-section with animated blade rotation. Watch the force arrows on the blade tips: lift (green), drag (red), centrifugal (orange), and gravity (blue). Adjust the rotor diameter slider to see how power, mass, and swept area change with size.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <TurbineVisualization />
              </div>

              {/* Rotor diameter slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Rotor Diameter</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {rotorDiameter}m ({(rotorDiameter / 2).toFixed(0)}m blades)
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="260"
                  step="5"
                  value={rotorDiameter}
                  onChange={(e) => setRotorDiameter(parseInt(e.target.value))}
                  onInput={(e) => setRotorDiameter(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Rotor Diameter"
                  style={sliderStyle(colors.accent, rotorDiameter, 80, 260)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>80m (2MW)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>170m (9MW)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>260m (15MW+)</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{power.toFixed(1)} MW</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Power ({'\u221D'} d{'\u00B2'})</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.error }}>{bladeMass.toFixed(0)} t</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Blade Mass ({'\u221D'} d{'\u00B3'})</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{sweptArea.toFixed(0)} m{'\u00B2'}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Swept Area</div>
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{(capacityFactor * 100).toFixed(0)}%</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Capacity Factor</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: '#3B82F6' }}>{tipSpeed.toFixed(0)} m/s</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Tip Speed</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{rpm.toFixed(1)} RPM</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Rotation Speed</div>
                </div>
              </div>

              {/* Betz limit note */}
              <div style={{
                background: `${colors.accent}11`,
                border: `1px solid ${colors.accent}33`,
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.accent }}>Betz Limit:</strong> Max extractable power = 59.3% of wind energy through swept area.
                  At {rotorDiameter}m: theoretical max = {(power / 0.45 * 0.593).toFixed(1)} MW (current efficiency ~{(0.45 / 0.593 * 100).toFixed(0)}% of Betz)
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Wind Turbine Scaling
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was spot on — as you observed in the simulator, doubling the rotor diameter quadruples the power output because power scales with swept area (d\u00B2).'
                : 'As you observed in the simulator, doubling the rotor diameter actually quadruples the power output. This is because power is proportional to swept area, which scales with the square of the diameter.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>P = 0.5 * Cp * {'\u03C1'} * A * v{'\u00B3'}</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Wind power depends on <span style={{ color: colors.accent }}>swept area (A = {'\u03C0'}r{'\u00B2'} {'\u221D'} d{'\u00B2'})</span>, <span style={{ color: colors.success }}>air density ({'\u03C1'})</span>, <span style={{ color: '#3B82F6' }}>wind speed cubed (v{'\u00B3'})</span>, and the <span style={{ color: colors.warning }}>power coefficient (Cp {'\u2264'} 0.593)</span>. Since area scales with d{'\u00B2'}, doubling the diameter means 4x the power.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  80m {'\u2192'} 2MW | 160m {'\u2192'} 8MW | 260m {'\u2192'} <strong>~21MW theoretical</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.error}11`,
              border: `1px solid ${colors.error}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
                The Square-Cube Problem
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                While power grows as d{'\u00B2'}, blade mass grows as d{'\u00B3'}. Doubling diameter gives 4x power but 8x mass. At 260m, each blade weighs 55+ tonnes — heavier than a loaded 18-wheeler. This fundamental scaling mismatch is why building bigger turbines gets exponentially harder.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Scaling Numbers
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: '80m Rotor', power: '2 MW', mass: '12t blade' },
                  { label: '160m Rotor', power: '8 MW', mass: '96t blade' },
                  { label: '260m Rotor', power: '21 MW', mass: '412t blade' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.power}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.mass}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Wind speed limit — offshore has the same max wind as onshore' },
      { id: 'b', text: 'Road transport width limit for blades — ships can carry any size' },
      { id: 'c', text: 'Material strength — saltwater makes blades stronger' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Onshore to Offshore
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Moving from onshore to offshore removes which constraint?
            </h2>

            {/* Static SVG showing transport problem */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Road */}
                <rect x="20" y="50" width="360" height="30" fill="url(#roadGrad)" rx="4" />
                <line x1="20" y1="65" x2="380" y2="65" stroke="#F59E0B" strokeWidth="2" strokeDasharray="15,10" />
                {/* Blade on truck */}
                <rect x="30" y="35" width="320" height="10" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <rect x="40" y="55" width="40" height="20" rx="4" fill="#6b7280" />
                <circle cx="50" cy="78" r="6" fill="#374151" stroke="#6b7280" strokeWidth="1" filter="url(#twistGlow)" />
                <circle cx="70" cy="78" r="6" fill="#374151" stroke="#6b7280" strokeWidth="1" filter="url(#twistGlow)" />
                {/* Width constraint arrows */}
                <line x1="20" y1="95" x2="20" y2="110" stroke={colors.error} strokeWidth="2" />
                <line x1="380" y1="95" x2="380" y2="110" stroke={colors.error} strokeWidth="2" />
                <line x1="20" y1="103" x2="380" y2="103" stroke={colors.error} strokeWidth="1.5" strokeDasharray="4,4" />
                <text x="200" y="125" textAnchor="middle" fill={colors.error} fontSize="12" fontWeight="600">Road width limit: ~4.5m | Max blade: ~65m onshore</text>
              </svg>
            </div>

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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Offshore Tradeoffs
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Offshore Logistics Simulator
  if (phase === 'twist_play') {
    const corrFactor = 1 + waveHeight * 0.04;
    const logisticsCost = 100 + offshoreDistance * 3 + waveHeight * 40;
    const windBonus = 1 + offshoreDistance * 0.004;
    const installDays = Math.ceil(offshoreDistance * 0.1 + waveHeight * 3);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Offshore Wind Logistics Planner
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Balance the benefits of stronger offshore wind against marine logistics and corrosion challenges
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* SVG Visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <OffshoreVisualization />
              </div>

              {/* Offshore distance slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Distance from Shore</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{offshoreDistance} km</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={offshoreDistance}
                  onChange={(e) => setOffshoreDistance(parseInt(e.target.value))}
                  onInput={(e) => setOffshoreDistance(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Distance from shore"
                  style={sliderStyle(colors.accent, offshoreDistance, 10, 200)}
                />
              </div>

              {/* Wave height slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Significant Wave Height</span>
                  <span style={{ ...typo.small, color: '#3B82F6', fontWeight: 600 }}>{waveHeight.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.5"
                  value={waveHeight}
                  onChange={(e) => setWaveHeight(parseFloat(e.target.value))}
                  onInput={(e) => setWaveHeight(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="Wave height"
                  style={sliderStyle('#3B82F6', waveHeight, 0.5, 6)}
                />
              </div>

              {/* Results */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>+{((windBonus - 1) * 100).toFixed(0)}%</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Wind Speed Bonus</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.error }}>{corrFactor.toFixed(2)}x</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Corrosion Factor</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{logisticsCost.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Logistics Cost (units)</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: '#3B82F6' }}>{installDays} days</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Install Window Needed</div>
                </div>
              </div>

              {/* Trade-off summary */}
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  Offshore Trade-off Summary:
                </p>
                <p style={{ ...typo.body, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                  No blade size limit + {((windBonus - 1) * 100).toFixed(0)}% more wind, but {corrFactor.toFixed(2)}x corrosion + {logisticsCost.toFixed(0)} logistics cost
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Offshore Engineering
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Offshore Revolution
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why Offshore?</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Onshore blades are limited to ~65m (130m rotor) because they must fit on trucks navigating roads and bridges. Offshore removes this constraint entirely — blades are manufactured at coastal factories and shipped by barge. This is why all 200m+ rotors are offshore.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The New Challenges</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Offshore brings saltwater corrosion (requiring special coatings and materials), massive foundation costs (monopiles driven 30m into the seabed), weather-dependent installation windows, and $200,000+/day jack-up vessel costs. Maintenance requires boat or helicopter access.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Engineering is about tradeoffs. Offshore wind trades road transport limits for marine logistics challenges. The economics work because power {'\u221D'} d{'\u00B2'} and offshore wind is 40-60% stronger — the energy gains outweigh the extra costs for turbines above ~8MW.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand wind turbine engineering tradeoffs and the square-cube law!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review &amp; Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Blade Factory
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of wind turbine engineering to real-world scenarios. Consider the square-cube law, Betz limit, tip-speed ratio, blade materials, capacity factor, and offshore logistics as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
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

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
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
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Blade Factory Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why wind turbine engineering is a battle between the square and the cube, and why offshore wind unlocks the next generation of giant turbines.
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
                'Power scales with d\u00B2 (swept area)',
                'Mass scales with d\u00B3 (square-cube law)',
                'Betz limit caps extraction at 59.3%',
                'Offshore removes road transport limits',
                'Corrosion and logistics are offshore tradeoffs',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
                minHeight: '44px',
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_BladeFactoryRenderer;
