'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Galvanic Corrosion - Complete 10-Phase Game
// Electrochemical corrosion between dissimilar metals in an electrolyte
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

interface GalvanicCorrosionRendererProps {
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
    scenario: "A steel bolt is used to join two aluminum sheets on a boat hull exposed to seawater.",
    question: "Which metal will corrode preferentially in this galvanic couple?",
    options: [
      { id: 'a', label: "Steel - it's more noble than aluminum" },
      { id: 'b', label: "Aluminum - it's more anodic (active) than steel", correct: true },
      { id: 'c', label: "Both metals corrode equally" },
      { id: 'd', label: "Neither - seawater prevents corrosion" }
    ],
    explanation: "Aluminum is more anodic (active) than steel in the galvanic series. When coupled in seawater, aluminum acts as the anode and corrodes to protect the steel cathode."
  },
  {
    scenario: "A copper pipe is directly connected to a steel pipe in a home plumbing system.",
    question: "What is the driving force behind galvanic corrosion?",
    options: [
      { id: 'a', label: "Temperature difference between the metals" },
      { id: 'b', label: "Electrochemical potential difference between dissimilar metals", correct: true },
      { id: 'c', label: "Water pressure in the pipes" },
      { id: 'd', label: "Gravitational forces on the metals" }
    ],
    explanation: "Galvanic corrosion is driven by the electrochemical potential difference between two dissimilar metals. This voltage difference causes electrons to flow from the anode to the cathode."
  },
  {
    scenario: "An engineer wants to protect a steel structure from galvanic corrosion in a marine environment.",
    question: "What is cathodic protection using sacrificial anodes?",
    options: [
      { id: 'a', label: "Coating the steel with paint to isolate it" },
      { id: 'b', label: "Attaching a more active metal (like zinc) that corrodes instead of the steel", correct: true },
      { id: 'c', label: "Using plastic insulators between all metal connections" },
      { id: 'd', label: "Keeping the structure completely dry" }
    ],
    explanation: "Sacrificial anodes are made of more active metals (zinc, magnesium, aluminum alloys) that corrode preferentially, protecting the more noble steel structure which becomes the cathode."
  },
  {
    scenario: "A stainless steel screw is used to fasten a zinc bracket to a painted steel panel.",
    question: "What three elements are required for galvanic corrosion to occur?",
    options: [
      { id: 'a', label: "Two dissimilar metals, electrical contact, and an electrolyte", correct: true },
      { id: 'b', label: "Two metals, heat source, and oxygen" },
      { id: 'c', label: "One metal, acid, and sunlight" },
      { id: 'd', label: "Two metals, high pressure, and vacuum" }
    ],
    explanation: "Galvanic corrosion requires: (1) two metals with different electrochemical potentials, (2) electrical contact between them, and (3) an electrolyte (conductive solution) to complete the circuit."
  },
  {
    scenario: "In a galvanic cell formed by iron and copper in saltwater, electrons flow through the metallic connection.",
    question: "In which direction do electrons flow in a galvanic couple?",
    options: [
      { id: 'a', label: "From cathode (more noble) to anode (more active)" },
      { id: 'b', label: "From anode (more active) to cathode (more noble)", correct: true },
      { id: 'c', label: "In both directions equally" },
      { id: 'd', label: "Only through the electrolyte, not the metals" }
    ],
    explanation: "Electrons flow from the anode (more active metal) to the cathode (more noble metal) through the metallic pathway. The anode loses electrons (oxidizes) and corrodes."
  },
  {
    scenario: "A marine engineer is selecting materials to minimize galvanic corrosion on a ship hull.",
    question: "What effect does the anode-to-cathode area ratio have on corrosion rate?",
    options: [
      { id: 'a', label: "Area ratio has no effect on corrosion rate" },
      { id: 'b', label: "Large cathode + small anode causes rapid anode corrosion", correct: true },
      { id: 'c', label: "Large anode + small cathode causes rapid anode corrosion" },
      { id: 'd', label: "Equal areas always produce the fastest corrosion" }
    ],
    explanation: "A large cathode area relative to a small anode area accelerates corrosion because the cathodic reaction is spread over a large area while the anodic reaction is concentrated, intensifying local attack."
  },
  {
    scenario: "An aircraft maintenance technician notices corrosion around aluminum rivets on a steel panel.",
    question: "Why is aluminum often preferred for aircraft skins despite being anodic?",
    options: [
      { id: 'a', label: "Aluminum is cheaper than other metals" },
      { id: 'b', label: "Aluminum forms a protective oxide layer and is lightweight", correct: true },
      { id: 'c', label: "Aluminum is stronger than steel" },
      { id: 'd', label: "Aluminum is actually more noble than most aircraft metals" }
    ],
    explanation: "Aluminum forms a tenacious aluminum oxide (Al2O3) passive layer that protects against further corrosion. Combined with its excellent strength-to-weight ratio, this makes it ideal for aerospace applications."
  },
  {
    scenario: "A pipeline engineer is designing corrosion protection for an underground steel gas pipeline.",
    question: "How does impressed current cathodic protection (ICCP) differ from sacrificial anodes?",
    options: [
      { id: 'a', label: "ICCP uses special coatings while sacrificial anodes don't" },
      { id: 'b', label: "ICCP uses an external power source to drive protective current", correct: true },
      { id: 'c', label: "ICCP requires no external power while sacrificial anodes do" },
      { id: 'd', label: "They work exactly the same way" }
    ],
    explanation: "ICCP uses an external DC power source to force current onto the structure, making it the cathode. This allows protection over larger areas and longer distances than passive sacrificial anodes."
  },
  {
    scenario: "Seawater is a common electrolyte that promotes galvanic corrosion.",
    question: "Why does seawater accelerate galvanic corrosion compared to pure water?",
    options: [
      { id: 'a', label: "Dissolved salts increase ionic conductivity of the electrolyte", correct: true },
      { id: 'b', label: "Seawater is colder than pure water" },
      { id: 'c', label: "Ocean pressure compresses the metals together" },
      { id: 'd', label: "Marine organisms directly attack the metals" }
    ],
    explanation: "Seawater contains dissolved salts (mainly NaCl) that dramatically increase its ionic conductivity, allowing ions to flow more easily and accelerating the electrochemical corrosion reactions."
  },
  {
    scenario: "A car manufacturer is designing a vehicle with mixed aluminum and steel body panels.",
    question: "What is the most effective method to prevent galvanic corrosion between dissimilar metals?",
    options: [
      { id: 'a', label: "Electrically isolate the metals using non-conductive barriers", correct: true },
      { id: 'b', label: "Weld the metals together for better contact" },
      { id: 'c', label: "Keep the joint constantly wet" },
      { id: 'd', label: "Apply heat to equalize the metal potentials" }
    ],
    explanation: "Breaking the electrical path between dissimilar metals prevents electron flow and stops galvanic corrosion. This is achieved using insulating washers, coatings, sealants, or non-conductive gaskets."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🚢',
    title: 'Marine Engineering',
    short: 'Ships & Offshore',
    tagline: 'Protecting vessels from the corrosive sea',
    description: 'Ships are floating galvanic cells, with hulls, propellers, and fittings made from different metals all immersed in highly conductive seawater. Marine engineers must carefully manage galvanic couples to prevent catastrophic hull failures.',
    connection: 'Just like our demonstration shows electron flow between dissimilar metals, ship hulls experience the same electrochemical attack. Steel hulls connected to bronze propellers create massive galvanic cells where the more active metal corrodes rapidly without protection.',
    howItWorks: 'Marine engineers attach zinc or aluminum sacrificial anodes to steel hulls. These anodes are more electrochemically active than the hull steel, so they corrode preferentially, sacrificing themselves to protect the ship. The anodes must be replaced periodically as they are consumed.',
    stats: [
      { value: '$80B', label: 'Annual corrosion cost', icon: '💰' },
      { value: '15-25 yrs', label: 'Ship hull design life', icon: '🚢' },
      { value: '1-2 yrs', label: 'Anode replacement', icon: '🔄' }
    ],
    examples: ['Zinc anodes welded to steel ship hulls', 'Bronze propellers isolated from steel shafts', 'ICCP systems on aircraft carriers', 'Aluminum anode bars in ballast tanks'],
    companies: ['Cathelco', 'Jotun Marine Coatings', 'DNV Maritime', 'CORROSION Service'],
    futureImpact: 'Smart anode systems with embedded sensors will monitor real-time corrosion rates and remaining anode life, automatically adjusting ICCP current.',
    color: '#0ea5e9'
  },
  {
    icon: '🚗',
    title: 'Automotive Design',
    short: 'Mixed Metals',
    tagline: 'Lightweight vehicles without the rust',
    description: 'Modern vehicles combine aluminum, magnesium, carbon fiber, and high-strength steel to reduce weight and improve fuel efficiency. Each material junction is a potential galvanic corrosion site that must be engineered for the 10+ year vehicle lifespan.',
    connection: 'Our galvanic corrosion demonstration shows exactly what happens at every aluminum-to-steel joint in a car body. Road salt spray acts as the electrolyte, turning joints into active galvanic cells.',
    howItWorks: 'Automotive engineers use multiple strategies: structural adhesives create insulating barriers, zinc-rich primers provide sacrificial protection, and e-coat applies uniform corrosion-resistant coatings. Self-piercing rivets with polymer coatings join aluminum to steel without creating bare metal contact.',
    stats: [
      { value: '40%', label: 'Weight reduction', icon: '⚖️' },
      { value: '12+ yrs', label: 'Corrosion warranty', icon: '📜' },
      { value: '$6B+', label: 'Prevention spend', icon: '💵' }
    ],
    examples: ['Ford F-150 aluminum body on steel frame', 'Tesla Model S multi-material design', 'BMW i3 carbon fiber chassis', 'Audi Space Frame joints'],
    companies: ['Henkel Adhesives', 'PPG Automotive', 'Novelis Aluminum', 'BASF Coatings'],
    futureImpact: 'Self-healing coatings will automatically repair scratches before galvanic corrosion initiates. Graphene-based barriers will enable even more aggressive lightweighting.',
    color: '#f59e0b'
  },
  {
    icon: '🛢️',
    title: 'Pipeline Protection',
    short: 'Oil and Gas',
    tagline: 'Safeguarding critical infrastructure underground',
    description: 'Millions of miles of steel pipelines transport oil, gas, and water underground, constantly threatened by soil corrosion. Cathodic protection systems form an invisible shield, using electrochemistry to keep pipelines intact for decades.',
    connection: 'Our demonstration shows how connecting a more active metal protects a less active one. Pipeline cathodic protection scales this principle to continental distances.',
    howItWorks: 'For short pipelines, magnesium or zinc sacrificial anode beds are buried near the pipe. For long-distance lines, impressed current cathodic protection (ICCP) uses transformer-rectifiers to force current onto the pipe through deep groundbeds.',
    stats: [
      { value: '2.6M mi', label: 'US pipeline network', icon: '📏' },
      { value: '99.999%', label: 'Required reliability', icon: '✅' },
      { value: '-850 mV', label: 'Protection potential', icon: '⚡' }
    ],
    examples: ['Trans-Alaska Pipeline ICCP system', 'Natural gas distribution networks', 'Offshore platform protection', 'Water transmission mains'],
    companies: ['MATCOR Inc.', 'Corrpro Companies', 'Aegion Corporation', 'Cathodic Technology'],
    futureImpact: 'Remote monitoring with IoT sensors will provide real-time corrosion data across entire pipeline networks. AI systems will predict corrosion hotspots.',
    color: '#22c55e'
  },
  {
    icon: '✈️',
    title: 'Aircraft Manufacturing',
    short: 'Aerospace',
    tagline: 'When corrosion prevention is life-critical',
    description: 'Aircraft structures combine aluminum alloys, titanium, carbon fiber composites, and steel fasteners in environments ranging from tropical humidity to sub-zero altitudes. A single corroded joint can ground an aircraft.',
    connection: 'Our galvanic corrosion experiment demonstrates the exact failure mechanism that aerospace engineers fight constantly. When aluminum skin contacts steel fasteners in condensation, galvanic corrosion begins immediately.',
    howItWorks: 'Aerospace engineers use a multi-barrier approach: anodizing creates an aluminum oxide layer, chromate conversion coatings provide backup, and sealants exclude moisture. Titanium fasteners are used near carbon fiber because titanium is more compatible.',
    stats: [
      { value: '$2.2B', label: 'Annual maintenance', icon: '🔧' },
      { value: '30+ yrs', label: 'Aircraft service life', icon: '✈️' },
      { value: '5000+', label: 'Fasteners per wing', icon: '🔩' }
    ],
    examples: ['Boeing 787 titanium fasteners with CFRP', 'Airbus A380 cadmium-plated fasteners', 'F-35 multi-material airframe', 'Helicopter rotor hub protection'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'PPG Aerospace'],
    futureImpact: 'Embedded corrosion sensors will continuously monitor joints in real-time during flight. Self-repairing nano-capsule coatings will release inhibitors when damage occurs.',
    color: '#8b5cf6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GalvanicCorrosionRenderer: React.FC<GalvanicCorrosionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [anodeMetal, setAnodeMetal] = useState<'zinc' | 'aluminum' | 'magnesium'>('zinc');
  const [cathodeMetal, setCathodeMetal] = useState<'copper' | 'steel' | 'gold'>('copper');
  const [electrolyteStrength, setElectrolyteStrength] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [corrosionLevel, setCorrosionLevel] = useState(0);
  const [electronFlow, setElectronFlow] = useState(0);
  const animationRef = useRef<number>();

  // Twist phase state
  const [areaRatio, setAreaRatio] = useState(50); // Anode:Cathode ratio
  const [hasCoating, setHasCoating] = useState(false);

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

  // Metal potentials for corrosion calculation
  const metalPotentials: Record<string, number> = {
    magnesium: -2.37,
    zinc: -0.76,
    aluminum: -0.66,
    iron: -0.44,
    steel: -0.20,
    copper: 0.34,
    gold: 1.50
  };

  // Calculate corrosion rate
  const getCorrosionRate = useCallback(() => {
    if (!isRunning) return 0;
    const anodePotential = metalPotentials[anodeMetal];
    const cathodePotential = metalPotentials[cathodeMetal];
    const voltageDiff = cathodePotential - anodePotential;
    const areaFactor = phase === 'twist_play' ? (100 - areaRatio) / 50 : 1;
    const coatingFactor = phase === 'twist_play' && hasCoating ? 0.2 : 1;
    return voltageDiff * (electrolyteStrength / 100) * areaFactor * coatingFactor * 0.5;
  }, [isRunning, anodeMetal, cathodeMetal, electrolyteStrength, areaRatio, hasCoating, phase]);

  // Animation loop
  useEffect(() => {
    const rate = getCorrosionRate();
    if (rate > 0) {
      const animate = () => {
        setCorrosionLevel(prev => Math.min(prev + rate * 0.1, 100));
        setElectronFlow(prev => (prev + rate * 5) % 100);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getCorrosionRate]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#ef4444', // Rust red for corrosion theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    secondary: '#3b82f6', // Blue for cathode
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    anode: '#ef4444',
    cathode: '#3b82f6',
    electrolyte: '#22d3ee',
    electrons: '#fbbf24',
    ions: '#a855f7',
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
    twist_play: 'Area Ratio',
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
        gameType: 'galvanic-corrosion',
        gameTitle: 'Galvanic Corrosion',
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
  }, [phase, goToPhase, phaseOrder]);

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
    background: `linear-gradient(135deg, ${colors.accent}, #dc2626)`,
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

  // Galvanic Cell Visualization
  const GalvanicVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const anodeX = width * 0.25;
    const cathodeX = width * 0.75;
    const electrodeY = height * 0.55;
    const electrodeHeight = height * 0.35;
    const anodeWidth = phase === 'twist_play' ? width * 0.08 * (areaRatio / 50) : width * 0.1;
    const cathodeWidth = phase === 'twist_play' ? width * 0.08 * ((100 - areaRatio) / 50) : width * 0.1;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: width, background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="electrolyteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.electrolyte} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.electrolyte} stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Electrolyte container */}
        <rect
          x={width * 0.1}
          y={height * 0.35}
          width={width * 0.8}
          height={height * 0.5}
          fill="url(#electrolyteGrad)"
          stroke={colors.electrolyte}
          strokeWidth="2"
          rx="8"
        />
        <text x={width / 2} y={height * 0.9} textAnchor="middle" fill={colors.electrolyte} fontSize="12">
          Electrolyte ({electrolyteStrength}% salt)
        </text>

        {/* Anode (corroding metal) */}
        <rect
          x={anodeX - anodeWidth / 2}
          y={electrodeY - electrodeHeight / 2 + (corrosionLevel / 200) * electrodeHeight}
          width={anodeWidth}
          height={electrodeHeight * (1 - corrosionLevel / 100)}
          fill={colors.anode}
          stroke={colors.error}
          strokeWidth="2"
          rx="4"
          filter={isRunning ? "url(#glow)" : ""}
        />
        {/* Corrosion debris */}
        {isRunning && corrosionLevel > 10 && (
          <>
            <circle cx={anodeX + 15} cy={electrodeY + 20} r="3" fill={colors.anode} opacity="0.6" />
            <circle cx={anodeX - 12} cy={electrodeY + 35} r="2" fill={colors.anode} opacity="0.5" />
            <circle cx={anodeX + 8} cy={electrodeY + 45} r="2.5" fill={colors.anode} opacity="0.4" />
          </>
        )}
        <text x={anodeX} y={height * 0.18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Anode
        </text>
        <text x={anodeX} y={height * 0.24} textAnchor="middle" fill={colors.anode} fontSize="11">
          {anodeMetal.toUpperCase()}
        </text>
        <text x={anodeX} y={height * 0.29} textAnchor="middle" fill={colors.textMuted} fontSize="10">
          (Corroding)
        </text>

        {/* Cathode (protected metal) */}
        <rect
          x={cathodeX - cathodeWidth / 2}
          y={electrodeY - electrodeHeight / 2}
          width={cathodeWidth}
          height={electrodeHeight}
          fill={colors.cathode}
          stroke={colors.secondary}
          strokeWidth="2"
          rx="4"
        />
        <text x={cathodeX} y={height * 0.18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Cathode
        </text>
        <text x={cathodeX} y={height * 0.24} textAnchor="middle" fill={colors.cathode} fontSize="11">
          {cathodeMetal.toUpperCase()}
        </text>
        <text x={cathodeX} y={height * 0.29} textAnchor="middle" fill={colors.textMuted} fontSize="10">
          (Protected)
        </text>

        {/* Wire connection */}
        <path
          d={`M ${anodeX} ${height * 0.32} L ${anodeX} ${height * 0.12} L ${cathodeX} ${height * 0.12} L ${cathodeX} ${height * 0.32}`}
          fill="none"
          stroke={colors.electrons}
          strokeWidth="3"
        />

        {/* Electron flow animation */}
        {isRunning && (
          <>
            <circle cx={anodeX + (cathodeX - anodeX) * (electronFlow / 100)} cy={height * 0.12} r="5" fill={colors.electrons} filter="url(#glow)" />
            <circle cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 33) % 100 / 100)} cy={height * 0.12} r="5" fill={colors.electrons} filter="url(#glow)" />
            <circle cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 66) % 100 / 100)} cy={height * 0.12} r="5" fill={colors.electrons} filter="url(#glow)" />
          </>
        )}

        {/* Ion flow in electrolyte */}
        {isRunning && (
          <>
            <circle cx={cathodeX - (cathodeX - anodeX) * (electronFlow / 100)} cy={electrodeY} r="4" fill={colors.ions} opacity="0.8" />
            <circle cx={cathodeX - (cathodeX - anodeX) * ((electronFlow + 50) % 100 / 100)} cy={electrodeY + 20} r="4" fill={colors.ions} opacity="0.6" />
          </>
        )}

        {/* Labels */}
        <text x={width / 2} y={height * 0.08} textAnchor="middle" fill={colors.electrons} fontSize="11">
          e- flow →
        </text>

        {/* Voltage display */}
        <rect x={width / 2 - 55} y={height * 0.38} width="110" height="36" rx="6" fill={colors.bgSecondary} stroke={colors.border} />
        <text x={width / 2} y={height * 0.44} textAnchor="middle" fill={colors.warning} fontSize="16" fontWeight="bold">
          {(getCorrosionRate() * 2).toFixed(2)} V
        </text>
        <text x={width / 2} y={height * 0.49} textAnchor="middle" fill={colors.textMuted} fontSize="9">
          Cell Voltage
        </text>

        {/* Corrosion meter */}
        <rect x={width - 40} y={height * 0.35} width="20" height={height * 0.5} rx="4" fill={colors.bgSecondary} stroke={colors.border} />
        <rect
          x={width - 38}
          y={height * 0.35 + height * 0.5 * (1 - corrosionLevel / 100)}
          width="16"
          height={height * 0.5 * (corrosionLevel / 100)}
          rx="3"
          fill={corrosionLevel > 70 ? colors.error : corrosionLevel > 40 ? colors.warning : colors.success}
        />
        <text x={width - 30} y={height * 0.92} textAnchor="middle" fill={colors.textMuted} fontSize="8">
          {corrosionLevel.toFixed(0)}%
        </text>
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
          The Hidden Battery in Your Car
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          What if every bolt, screw, and weld in your car was secretly generating electricity?
          When different metals touch in the presence of moisture, they form tiny batteries
          that slowly <span style={{ color: colors.accent }}>destroy themselves</span>.
          This is galvanic corrosion - the same process that sank ships and costs the world trillions each year.
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
            "Galvanic corrosion occurs when two dissimilar metals are electrically connected in an electrolyte. The more active metal becomes the anode and corrodes, while the noble metal is protected as the cathode."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Corrosion Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Galvanic Corrosion →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Both metals will corrode at the same rate' },
      { id: 'b', text: 'The steel nail will corrode much faster than normal', correct: true },
      { id: 'c', text: 'The copper penny will corrode faster than normal' },
      { id: 'd', text: 'Neither will corrode - saltwater prevents rust' },
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
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A steel nail and a copper penny are placed in a glass of saltwater, touching each other. What happens over the next few days?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🔩</div>
                <p style={{ ...typo.small, color: colors.accent }}>Steel Nail</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.electrolyte }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🪙</div>
                <p style={{ ...typo.small, color: colors.cathode }}>Copper Penny</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.electrolyte }}>in</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🧂💧</div>
                <p style={{ ...typo.small, color: colors.electrolyte }}>Saltwater</p>
              </div>
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

  // PLAY PHASE - Interactive Galvanic Cell Simulator
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
            Galvanic Corrosion Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Create a galvanic cell and observe how different metals corrode at different rates
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <GalvanicVisualization />
            </div>

            {/* Anode selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Anode Metal (Active)</span>
                <span style={{ ...typo.small, color: colors.anode, fontWeight: 600 }}>{anodeMetal}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['magnesium', 'zinc', 'aluminum'] as const).map(metal => (
                  <button
                    key={metal}
                    onClick={() => { setAnodeMetal(metal); setCorrosionLevel(0); }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: `2px solid ${anodeMetal === metal ? colors.anode : colors.border}`,
                      background: anodeMetal === metal ? `${colors.anode}22` : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {metal.charAt(0).toUpperCase() + metal.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cathode selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Cathode Metal (Noble)</span>
                <span style={{ ...typo.small, color: colors.cathode, fontWeight: 600 }}>{cathodeMetal}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['copper', 'steel', 'gold'] as const).map(metal => (
                  <button
                    key={metal}
                    onClick={() => { setCathodeMetal(metal); setCorrosionLevel(0); }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: `2px solid ${cathodeMetal === metal ? colors.cathode : colors.border}`,
                      background: cathodeMetal === metal ? `${colors.cathode}22` : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {metal.charAt(0).toUpperCase() + metal.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Electrolyte slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Electrolyte Strength</span>
                <span style={{ ...typo.small, color: colors.electrolyte, fontWeight: 600 }}>{electrolyteStrength}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={electrolyteStrength}
                onChange={(e) => setElectrolyteStrength(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Pure Water</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Seawater</span>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setIsRunning(!isRunning); playSound('click'); }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isRunning ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isRunning ? 'Stop Reaction' : 'Start Reaction'}
              </button>
              <button
                onClick={() => { setCorrosionLevel(0); setIsRunning(false); }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Discovery prompt */}
          {corrosionLevel > 50 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how the {anodeMetal} anode is dissolving while the {cathodeMetal} cathode stays protected!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Science →
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
            The Galvanic Series
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>What You Observed:</strong> When two dissimilar metals are connected in an electrolyte, the more <span style={{ color: colors.anode }}>active</span> metal loses electrons and corrodes, while the more <span style={{ color: colors.cathode }}>noble</span> metal is protected.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Why It Happens:</strong> Each metal has a characteristic <span style={{ color: colors.warning }}>electrochemical potential</span>. The voltage difference between two metals drives electron flow from anode to cathode.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Galvanic Series:</strong> Metals ranked from most active (anodic) to most noble (cathodic):
              </p>
            </div>

            {/* Galvanic series visualization */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              margin: '16px 0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.anode, fontWeight: 600 }}>ACTIVE (Anodic)</span>
                <span style={{ ...typo.small, color: colors.cathode, fontWeight: 600 }}>NOBLE (Cathodic)</span>
              </div>
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '12px 0',
              }}>
                {['Mg', 'Zn', 'Al', 'Fe', 'Ni', 'Sn', 'Pb', 'Cu', 'Ag', 'Au'].map((metal, i) => (
                  <div
                    key={metal}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: `linear-gradient(135deg, ${colors.anode}, ${colors.cathode})`,
                      backgroundPosition: `${i * 11}% 0`,
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  >
                    {metal}
                  </div>
                ))}
              </div>
              <div style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
                Greater separation = Higher voltage = Faster corrosion
              </div>
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
              Three Requirements for Galvanic Corrosion
            </h3>
            <ol style={{ ...typo.body, color: colors.textSecondary, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Two dissimilar metals</strong> with different electrochemical potentials</li>
              <li style={{ marginBottom: '8px' }}><strong>Electrical contact</strong> between the metals (direct or through a conductor)</li>
              <li><strong>An electrolyte</strong> (conductive solution) to complete the ionic circuit</li>
            </ol>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Area Ratio Effects →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Large anode + small cathode: fastest corrosion' },
      { id: 'b', text: 'Small anode + large cathode: fastest corrosion', correct: true },
      { id: 'c', text: 'Equal areas: fastest corrosion' },
      { id: 'd', text: 'Area ratio does not affect corrosion rate' },
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
              New Variable: Area Ratio
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A small steel rivet holds a large copper sheet. Compare this to a large steel plate with a small copper fastener. Which arrangement causes faster steel corrosion?
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
              Test Area Ratio Effects →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Area Ratio & Coating Effects
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how electrode area ratio and protective coatings affect corrosion rate
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <GalvanicVisualization />
            </div>

            {/* Area ratio slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Anode:Cathode Area Ratio</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{areaRatio}:{100 - areaRatio}</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={areaRatio}
                onChange={(e) => { setAreaRatio(parseInt(e.target.value)); setCorrosionLevel(0); }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.anode }}>Small Anode</span>
                <span style={{ ...typo.small, color: colors.cathode }}>Large Cathode</span>
              </div>
            </div>

            {/* Coating toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>No Coating</span>
              <button
                onClick={() => { setHasCoating(!hasCoating); setCorrosionLevel(0); }}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: hasCoating ? colors.success : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: hasCoating ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: hasCoating ? colors.success : colors.textSecondary, fontWeight: hasCoating ? 600 : 400 }}>
                Insulating Coating
              </span>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setIsRunning(!isRunning); playSound('click'); }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isRunning ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isRunning ? 'Stop' : 'Start'} Reaction
              </button>
              <button
                onClick={() => { setCorrosionLevel(0); setIsRunning(false); }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Insight prompts */}
          {areaRatio < 30 && !hasCoating && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                DANGER! Small anode + large cathode = concentrated corrosion attack!
              </p>
            </div>
          )}

          {hasCoating && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Insulating coatings block the ionic pathway, dramatically reducing corrosion!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Protection Strategies →
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
            Corrosion Protection Strategies
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Sacrificial Anodes</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Attach a more active metal (Zn, Mg, Al) that corrodes instead of the protected structure. The sacrificial anode becomes the anode, making your valuable structure the protected cathode.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Impressed Current (ICCP)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Use an external DC power source to force protective current onto the structure, making it the cathode. ICCP systems protect longer distances and larger structures than sacrificial anodes.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔌</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electrical Isolation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Break the electrical path using insulating washers, gaskets, coatings, or sealants. No electrical contact = no galvanic corrosion.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Area Ratio Rule</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Never use a small anode with a large cathode!</strong> The corrosion current concentrates on the small anode, causing rapid local attack. Always design with a large anode area relative to the cathode.
              </p>
            </div>
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
                  {a.short}
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
                Connection to Galvanic Corrosion:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                How Protection Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                {app.futureImpact}
              </p>
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
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand galvanic corrosion and protection strategies!'
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
          {/* Progress */}
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

          {/* Navigation */}
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
          Galvanic Corrosion Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the electrochemistry behind one of the most important engineering challenges in materials science.
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
              'Galvanic series and electrochemical potentials',
              'Three requirements for galvanic corrosion',
              'Electron and ion flow in galvanic cells',
              'Area ratio effects on corrosion rate',
              'Sacrificial anode protection',
              'Impressed current cathodic protection',
              'Electrical isolation strategies',
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

export default GalvanicCorrosionRenderer;
