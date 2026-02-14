'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Venturi Effect - Complete 10-Phase Game
// Physics: Continuity (A1v1 = A2v2) + Bernoulli (P + 1/2 pv^2 = const)
// Narrow section = higher velocity = lower pressure
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

interface VenturiEffectRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
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

// Physics constants
const AIR_DENSITY = 1.2; // kg/m^3 at sea level
const REFERENCE_PRESSURE = 100; // kPa

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A race car engineer is designing air intake ducts for the engine. They need to understand how air velocity changes as it moves through a narrower section of the duct.",
    question: "When air flows through a narrower pipe section at the same flow rate, what happens to its velocity?",
    options: [
      { id: 'a', label: "Velocity decreases proportionally to the area reduction" },
      { id: 'b', label: "Velocity increases to maintain constant flow rate", correct: true },
      { id: 'c', label: "Velocity stays the same but pressure increases" },
      { id: 'd', label: "Flow reverses direction in the narrow section" }
    ],
    explanation: "By the continuity equation A1v1 = A2v2, when area decreases, velocity must increase proportionally to maintain the same volumetric flow rate. This is mass conservation in action."
  },
  {
    scenario: "A medical device company is developing a new oxygen delivery mask that uses the Venturi principle to precisely mix oxygen with room air.",
    question: "The continuity equation A1v1 = A2v2 represents conservation of what quantity?",
    options: [
      { id: 'a', label: "Mass (volumetric flow rate for incompressible fluids)", correct: true },
      { id: 'b', label: "Energy in the fluid system" },
      { id: 'c', label: "Momentum of the flowing fluid" },
      { id: 'd', label: "Static pressure at all points" }
    ],
    explanation: "The continuity equation ensures mass conservation. For incompressible fluids, this means the volumetric flow rate (A x v) must be constant throughout the pipe system."
  },
  {
    scenario: "A plumber is installing a Venturi meter to measure water flow in a building's main pipe. The meter has wide inlet/outlet sections and a narrow throat in the middle.",
    question: "In a Venturi tube, where is the static pressure LOWEST?",
    options: [
      { id: 'a', label: "At the wide entrance section" },
      { id: 'b', label: "At the wide exit section" },
      { id: 'c', label: "At the narrow middle section (throat)", correct: true },
      { id: 'd', label: "Pressure is equal at all locations" }
    ],
    explanation: "By Bernoulli's principle (P + 1/2 pv^2 = constant), where velocity is highest (narrow throat), pressure must be lowest. The kinetic energy increase comes at the expense of pressure energy."
  },
  {
    scenario: "A child playing with a garden hose discovers that covering part of the nozzle with their thumb makes water spray much farther across the yard.",
    question: "Why does water spray farther when you partially cover a garden hose opening?",
    options: [
      { id: 'a', label: "The hose pressure increases dramatically" },
      { id: 'b', label: "Reducing the opening area increases exit velocity", correct: true },
      { id: 'c', label: "Water becomes lighter and travels farther" },
      { id: 'd', label: "Air resistance is reduced at the nozzle" }
    ],
    explanation: "By continuity (A1v1 = A2v2), reducing the exit area while maintaining the same flow rate forces the water velocity to increase proportionally. Higher velocity means the water travels farther."
  },
  {
    scenario: "A physics teacher demonstrates the Venturi effect by holding two sheets of paper parallel and blowing air between them. Students are surprised by the result.",
    question: "When you blow air between two parallel papers, they move together because...",
    options: [
      { id: 'a', label: "Moving air creates low pressure between the papers", correct: true },
      { id: 'b', label: "The air pushes the papers outward" },
      { id: 'c', label: "Static electricity attracts the papers" },
      { id: 'd', label: "Gravity pulls them toward the air stream" }
    ],
    explanation: "Fast-moving air between the papers creates low pressure (Venturi effect). The surrounding stationary air has higher pressure, which pushes the papers inward toward the low-pressure region."
  },
  {
    scenario: "A vintage car mechanic is explaining to an apprentice how older carburetors worked before fuel injection systems became standard.",
    question: "A carburetor uses the Venturi effect primarily to...",
    options: [
      { id: 'a', label: "Cool the incoming air charge" },
      { id: 'b', label: "Filter particles from the air" },
      { id: 'c', label: "Draw fuel into the air stream for mixing", correct: true },
      { id: 'd', label: "Increase air pressure before the engine" }
    ],
    explanation: "The narrow Venturi throat creates low pressure that draws fuel from the float bowl through a jet. This atomizes the fuel and mixes it with the incoming air in the correct ratio for combustion."
  },
  {
    scenario: "A chemical engineer is designing a pipe system where the diameter needs to be reduced by half at a certain point. They need to calculate the new velocity.",
    question: "If pipe cross-sectional area is halved (A2 = A1/2), the fluid velocity at the narrow section...",
    options: [
      { id: 'a', label: "Halves to maintain equilibrium" },
      { id: 'b', label: "Doubles to conserve mass flow", correct: true },
      { id: 'c', label: "Quadruples due to pressure effects" },
      { id: 'd', label: "Remains the same throughout" }
    ],
    explanation: "From A1v1 = A2v2, if A2 = A1/2, then v2 = v1(A1/A2) = v1(A1/(A1/2)) = 2v1. The velocity exactly doubles when area is halved."
  },
  {
    scenario: "A fluid dynamics student is studying why airplane wings generate lift and how it relates to fluid flow principles they learned about in pipe systems.",
    question: "The Venturi effect is a direct consequence of...",
    options: [
      { id: 'a', label: "Bernoulli's principle relating pressure and velocity", correct: true },
      { id: 'b', label: "Newton's third law of action-reaction" },
      { id: 'c', label: "Archimedes' principle of buoyancy" },
      { id: 'd', label: "Hooke's law of elasticity" }
    ],
    explanation: "The Venturi effect combines continuity (velocity increase in narrow sections) with Bernoulli's principle (higher velocity means lower pressure). Together they explain the pressure drop at constrictions."
  },
  {
    scenario: "A chemistry lab technician uses a Bunsen burner daily but never understood the physics behind why adjusting the air intake collar changes the flame characteristics.",
    question: "A Bunsen burner's air intake collar uses the Venturi effect to...",
    options: [
      { id: 'a', label: "Preheat the gas before combustion" },
      { id: 'b', label: "Cool the burner barrel" },
      { id: 'c', label: "Draw in air for premixed combustion", correct: true },
      { id: 'd', label: "Reduce gas consumption significantly" }
    ],
    explanation: "Gas flowing up the barrel creates low pressure at the air holes. This draws in room air, which premixes with the gas for more complete, hotter combustion with a blue flame instead of a yellow one."
  },
  {
    scenario: "A research lab uses water aspirators connected to faucets to create vacuum for filtration experiments, which surprises new students who expect vacuum pumps to need electricity.",
    question: "How does a water aspirator create vacuum without electricity?",
    options: [
      { id: 'a', label: "Water has special chemical properties that absorb air" },
      { id: 'b', label: "Fast water through a Venturi creates low pressure that pulls air", correct: true },
      { id: 'c', label: "The weight of falling water pulls air downward" },
      { id: 'd', label: "Evaporating water removes air from the system" }
    ],
    explanation: "Water flowing rapidly through the aspirator's narrow throat creates a region of low pressure (Venturi effect). This low pressure pulls air from the attached vessel, creating a vacuum without any moving electrical parts."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '✈️',
    title: 'Aircraft Airspeed Indicators',
    short: 'Pitot Tubes',
    tagline: 'Bernoulli in the cockpit for safe flight',
    description: 'Pitot tubes measure aircraft speed using the Venturi principle. The difference between ram air pressure and static pressure directly indicates airspeed - critical for safe flight at all altitudes.',
    connection: 'Higher velocity means lower static pressure (Bernoulli). The pitot tube compares stagnation pressure (from ram air) to static pressure to calculate airspeed using the pressure difference.',
    howItWorks: 'A forward-facing tube captures ram air (stagnation pressure). Side ports measure static pressure. The pressure difference is proportional to velocity squared, allowing precise airspeed calculation.',
    stats: [
      { value: '300 m/s', label: 'Airspeed range', icon: '✈️' },
      { value: '15 kg', label: 'Sensor weight', icon: '🎯' },
      { value: '$2 billion', label: 'Market size', icon: '📅' }
    ],
    examples: ['Commercial aircraft', 'Fighter jets', 'Drones', 'Wind tunnels'],
    companies: ['Thales', 'Collins Aerospace', 'Honeywell', 'L3Harris'],
    futureImpact: 'LIDAR and GPS-based systems may supplement pitot tubes for greater redundancy in next-generation aircraft.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Carburetor Fuel Mixing',
    short: 'Carburetors',
    tagline: 'Physics-powered fuel delivery since 1893',
    description: 'Classic carburetors use a Venturi throat to draw fuel into the airstream. As air accelerates through the narrow section, pressure drops, sucking fuel from the float bowl without any pump.',
    connection: 'The low pressure at the Venturi throat creates suction that draws fuel through calibrated jets. Air velocity automatically controls fuel flow rate for proper mixture.',
    howItWorks: 'Air enters the carburetor and accelerates through a tapered Venturi. Fuel jets open into the low-pressure zone. The fuel atomizes and mixes with air in the correct stoichiometric ratio.',
    stats: [
      { value: '50 W', label: 'Power output', icon: '⚗️' },
      { value: '200 million', label: 'Engines built', icon: '📉' },
      { value: '10 kg', label: 'Typical weight', icon: '📅' }
    ],
    examples: ['Classic cars', 'Small engines', 'Motorcycles', 'Lawnmowers'],
    companies: ['Holley', 'Weber', 'Mikuni', 'Keihin'],
    futureImpact: 'While replaced by fuel injection in cars, carburetors remain essential in small engines for simplicity and reliability.',
    color: '#EF4444'
  },
  {
    icon: '💨',
    title: 'HVAC Flow Measurement',
    short: 'Flow Meters',
    tagline: 'Balancing comfort and efficiency in buildings',
    description: 'Building ventilation systems use Venturi meters to measure airflow through ducts. Accurate measurement enables proper air distribution and energy-efficient HVAC operation.',
    connection: 'The pressure drop across a Venturi throat is proportional to flow rate squared. Calibrated meters convert differential pressure readings to CFM for precise control.',
    howItWorks: 'A constriction in the duct accelerates airflow. Pressure taps before and in the throat measure the difference. Flow computers calculate volume from differential pressure using Bernoulli.',
    stats: [
      { value: '1%', label: 'Meter accuracy', icon: '🎯' },
      { value: '500 m', label: 'Duct coverage', icon: '💨' },
      { value: '30 s', label: 'Response time', icon: '⏰' }
    ],
    examples: ['Office buildings', 'Hospitals', 'Clean rooms', 'Data centers'],
    companies: ['Johnson Controls', 'Carrier', 'Trane', 'Dwyer'],
    futureImpact: 'IoT-connected meters enable real-time optimization of building energy use and predictive maintenance.',
    color: '#10B981'
  },
  {
    icon: '🏥',
    title: 'Medical Oxygen Delivery',
    short: 'Venturi Masks',
    tagline: 'Lifesaving physics in healthcare',
    description: 'Venturi masks deliver precise oxygen concentrations to patients. The Venturi effect entrains room air in exact proportions, providing 24-60% oxygen regardless of patient breathing pattern.',
    connection: 'Oxygen flowing through a small orifice creates low pressure that draws in room air. The orifice size determines the exact oxygen concentration delivered.',
    howItWorks: 'High-pressure oxygen flows through color-coded adapters with different orifice sizes. Room air entrains through side ports. The mixture is delivered at controlled, precise concentration.',
    stats: [
      { value: '60%', label: 'O2 range', icon: '🫁' },
      { value: '2 V', label: 'Sensor voltage', icon: '🎯' },
      { value: '15 W', label: 'Power draw', icon: '💨' }
    ],
    examples: ['COPD treatment', 'Post-surgery', 'Emergency medicine', 'Respiratory therapy'],
    companies: ['Hudson RCI', 'Teleflex', 'Vyaire', 'Fisher & Paykel'],
    futureImpact: 'Smart masks with real-time SpO2 feedback will automatically adjust oxygen delivery for optimal patient care.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const VenturiEffectRenderer: React.FC<VenturiEffectRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
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

  // Simulation state - Venturi tube
  const [flowRate, setFlowRate] = useState(50); // percentage
  const [constrictionSize, setConstrictionSize] = useState(50); // percentage of original
  const [showPressure, setShowPressure] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [isFlowing, setIsFlowing] = useState(true);

  // Twist phase - Venturi meter simulation
  const [meterFlowRate, setMeterFlowRate] = useState(50);
  const [showMeterReadings, setShowMeterReadings] = useState(true);

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

  // Calculate Venturi physics
  const wideVelocity = flowRate / 100 * 5; // m/s at wide section
  const areaRatio = 100 / constrictionSize; // A1/A2
  const narrowVelocity = wideVelocity * areaRatio; // Continuity: A1v1 = A2v2
  const widePressure = REFERENCE_PRESSURE; // kPa
  // Bernoulli: P1 + 1/2 pv1^2 = P2 + 1/2 pv2^2
  const pressureDrop = 0.5 * AIR_DENSITY * (narrowVelocity * narrowVelocity - wideVelocity * wideVelocity) / 1000;
  const narrowPressure = Math.max(widePressure - pressureDrop, 10);

  // Venturi meter calculations
  const meterWideVelocity = meterFlowRate / 100 * 5;
  const meterNarrowVelocity = meterWideVelocity * 2; // Fixed 2:1 area ratio
  const meterPressureDrop = 0.5 * AIR_DENSITY * (meterNarrowVelocity * meterNarrowVelocity - meterWideVelocity * meterWideVelocity) / 1000;
  const meterNarrowPressure = Math.max(REFERENCE_PRESSURE - meterPressureDrop, 10);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#14B8A6', // Teal for fluid dynamics
    accentGlow: 'rgba(20, 184, 166, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    flow: '#22D3EE',
    pressure: '#3B82F6',
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
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Play',
    twist_review: 'Twist Review',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');

    if (onPhaseComplete) {
      const currentIndex = phaseOrder.indexOf(phase);
      const newIndex = phaseOrder.indexOf(p);
      if (newIndex > currentIndex) {
        onPhaseComplete(phase);
      }
    }

    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'venturi-effect',
        gameTitle: 'Venturi Effect',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, onGameEvent, onPhaseComplete, phaseOrder]);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Back button handler
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Fixed bottom navigation bar
  const renderBottomNav = (nextAction?: () => void, nextLabel?: string, nextDisabled?: boolean) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirstPhase = currentIndex === 0;

    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirstPhase}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirstPhase ? colors.textMuted : colors.textSecondary,
            cursor: isFirstPhase ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isFirstPhase ? 0.5 : 1,
          }}
        >
          ← Back
        </button>
        {nextAction && (
          <button
            onClick={nextAction}
            disabled={nextDisabled}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #0D9488)`,
              color: 'white',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: nextDisabled ? 0.5 : 1,
            }}
          >
            {nextLabel || 'Next →'}
          </button>
        )}
      </nav>
    );
  };

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
    background: `linear-gradient(135deg, ${colors.accent}, #0D9488)`,
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

  // Venturi Tube Visualization
  const VenturiVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a6a8c" />
            <stop offset="50%" stopColor="#3a5a7c" />
            <stop offset="100%" stopColor="#4a6a8c" />
          </linearGradient>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.flow} stopOpacity="0.6" />
            <stop offset="50%" stopColor={colors.flow} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.flow} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Venturi Tube - Continuity + Bernoulli
        </text>

        {/* Venturi tube shape */}
        <path
          d={`M20 80 L80 80 Q120 80 140 ${80 + (50 - constrictionSize) * 0.5} L${width - 140} ${80 + (50 - constrictionSize) * 0.5} Q${width - 120} 80 ${width - 80} 80 L${width - 20} 80
              L${width - 20} 160 L${width - 80} 160 Q${width - 120} 160 ${width - 140} ${160 - (50 - constrictionSize) * 0.5} L140 ${160 - (50 - constrictionSize) * 0.5} Q120 160 80 160 L20 160 Z`}
          fill="url(#tubeGrad)"
          stroke="#6a8aac"
          strokeWidth="2"
        />

        {/* Flow animation */}
        {isFlowing && (
          <g filter="url(#glow)">
            {/* Wide section left */}
            {[100, 115, 130, 145].map((y, i) => (
              <line
                key={`left-${i}`}
                x1="30"
                y1={y}
                x2="80"
                y2={y}
                stroke={colors.flow}
                strokeWidth={i === 1 || i === 2 ? 3 : 2}
                strokeDasharray="10,5"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-15" dur={`${1.2 / (flowRate / 50)}s`} repeatCount="indefinite" />
              </line>
            ))}
            {/* Narrow section */}
            {[115 + (50 - constrictionSize) * 0.3, 120, 125 - (50 - constrictionSize) * 0.3].map((y, i) => (
              <line
                key={`narrow-${i}`}
                x1="145"
                y1={y}
                x2={width - 145}
                y2={y}
                stroke="#00ffff"
                strokeWidth={i === 1 ? 4 : 2}
                strokeDasharray="6,3"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-9" dur={`${0.4 / (flowRate / 50) / areaRatio}s`} repeatCount="indefinite" />
              </line>
            ))}
            {/* Wide section right */}
            {[100, 115, 130, 145].map((y, i) => (
              <line
                key={`right-${i}`}
                x1={width - 80}
                y1={y}
                x2={width - 30}
                y2={y}
                stroke={colors.flow}
                strokeWidth={i === 1 || i === 2 ? 3 : 2}
                strokeDasharray="10,5"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-15" dur={`${1.2 / (flowRate / 50)}s`} repeatCount="indefinite" />
              </line>
            ))}
          </g>
        )}

        {/* Pressure indicators */}
        {showPressure && (
          <g>
            {/* Left pressure gauge */}
            <rect x="45" y="35" width="16" height="45" rx="3" fill="#1a2a3a" stroke={colors.pressure} strokeWidth="1" />
            <rect x="48" y={80 - widePressure * 0.35} width="10" height={widePressure * 0.35} fill="#ef4444" rx="2" />
            <text x="53" y="30" fontSize="9" fill="#f87171" textAnchor="middle" fontWeight="bold">P1</text>

            {/* Middle pressure gauge */}
            <rect x={width/2 - 8} y="25" width="16" height="50" rx="3" fill="#1a2a3a" stroke={colors.pressure} strokeWidth="1" />
            <rect x={width/2 - 5} y={75 - Math.max(narrowPressure, 10) * 0.4} width="10" height={Math.max(narrowPressure, 10) * 0.4} fill="#3b82f6" rx="2" />
            <text x={width/2} y="38" fontSize="9" fill="#60a5fa" textAnchor="middle" fontWeight="bold">P2</text>

            {/* Right pressure gauge */}
            <rect x={width - 61} y="35" width="16" height="45" rx="3" fill="#1a2a3a" stroke={colors.pressure} strokeWidth="1" />
            <rect x={width - 58} y={80 - widePressure * 0.35} width="10" height={widePressure * 0.35} fill="#ef4444" rx="2" />
            <text x={width - 53} y="30" fontSize="9" fill="#f87171" textAnchor="middle" fontWeight="bold">P3</text>
          </g>
        )}

        {/* Velocity arrows */}
        {showVelocity && (
          <g>
            <line x1="35" y1={height - 60} x2={35 + wideVelocity * 12} y2={height - 60} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
            <polygon points={`${40 + wideVelocity * 12},${height - 60} ${30 + wideVelocity * 12},${height - 68} ${30 + wideVelocity * 12},${height - 52}`} fill="#22c55e" />
            <text x="70" y={height - 40} fontSize="10" fill="#4ade80" textAnchor="middle" fontWeight="bold">v1={wideVelocity.toFixed(1)} m/s</text>

            <line x1={width/2 - 30} y1={height - 60} x2={width/2 - 30 + Math.min(narrowVelocity, 15) * 6} y2={height - 60} stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
            <polygon points={`${width/2 - 25 + Math.min(narrowVelocity, 15) * 6},${height - 60} ${width/2 - 35 + Math.min(narrowVelocity, 15) * 6},${height - 68} ${width/2 - 35 + Math.min(narrowVelocity, 15) * 6},${height - 52}`} fill="#22d3ee" />
            <text x={width/2} y={height - 40} fontSize="10" fill="#67e8f9" textAnchor="middle" fontWeight="bold">v2={narrowVelocity.toFixed(1)} m/s</text>

            <line x1={width - 100} y1={height - 60} x2={width - 100 + wideVelocity * 12} y2={height - 60} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
            <polygon points={`${width - 95 + wideVelocity * 12},${height - 60} ${width - 105 + wideVelocity * 12},${height - 68} ${width - 105 + wideVelocity * 12},${height - 52}`} fill="#22c55e" />
            <text x={width - 70} y={height - 40} fontSize="10" fill="#4ade80" textAnchor="middle" fontWeight="bold">v3={wideVelocity.toFixed(1)} m/s</text>
          </g>
        )}

        {/* Section labels */}
        <text x="50" y={height - 15} fontSize="10" fill={colors.textMuted} textAnchor="middle">Wide</text>
        <text x={width/2} y={height - 15} fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="600">Narrow</text>
        <text x={width - 50} y={height - 15} fontSize="10" fill={colors.textMuted} textAnchor="middle">Wide</text>

        {/* Continuity equation */}
        <rect x={width/2 - 55} y="165" width="110" height="18" rx="4" fill="#0a1a2a" stroke={colors.accent} strokeWidth="1" />
        <text x={width/2} y="177" fontSize="10" fill={colors.accent} textAnchor="middle" fontWeight="bold" fontFamily="monospace">A1v1 = A2v2</text>
      </svg>
    );
  };

  // Venturi Meter Visualization for twist phase
  const VenturiMeterVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 240 : 280;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="meterTubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a6a8c" />
            <stop offset="50%" stopColor="#3a5a7c" />
            <stop offset="100%" stopColor="#4a6a8c" />
          </linearGradient>
        </defs>

        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Venturi Flow Meter
        </text>

        {/* Pipe with Venturi */}
        <path
          d="M20 70 L100 70 Q140 70 160 85 L220 85 Q240 70 280 70 L360 70 L360 130 L280 130 Q240 130 220 115 L160 115 Q140 130 100 130 L20 130 Z"
          fill="url(#meterTubeGrad)"
          stroke="#6a8aac"
          strokeWidth="2"
          transform={`translate(${(width - 380) / 2}, 20)`}
        />

        {/* Flow animation */}
        {[85, 95, 105, 115].map((y, i) => (
          <line
            key={`mflow-${i}`}
            x1={(width - 380) / 2 + 30}
            y1={y}
            x2={(width - 380) / 2 + 350}
            y2={y}
            stroke={colors.flow}
            strokeWidth={i === 1 || i === 2 ? 3 : 2}
            strokeDasharray="8,4"
            strokeOpacity="0.7"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${0.8 / (meterFlowRate / 50)}s`} repeatCount="indefinite" />
          </line>
        ))}

        {/* Pressure gauges */}
        {showMeterReadings && (
          <g>
            {/* Inlet pressure */}
            <rect x={(width - 380) / 2 + 55} y="30" width="18" height="50" rx="3" fill="#1a2a3a" stroke="#ef4444" strokeWidth="1" />
            <rect x={(width - 380) / 2 + 58} y={80 - REFERENCE_PRESSURE * 0.4} width="12" height={REFERENCE_PRESSURE * 0.4} fill="#ef4444" rx="2" />
            <text x={(width - 380) / 2 + 64} y="25" fontSize="9" fill="#f87171" textAnchor="middle" fontWeight="bold">P1</text>
            <text x={(width - 380) / 2 + 64} y="155" fontSize="9" fill="#f87171" textAnchor="middle">{REFERENCE_PRESSURE.toFixed(0)} kPa</text>

            {/* Throat pressure */}
            <rect x={width/2 - 9} y="20" width="18" height="60" rx="3" fill="#1a2a3a" stroke="#3b82f6" strokeWidth="1" />
            <rect x={width/2 - 6} y={80 - Math.max(meterNarrowPressure, 10) * 0.5} width="12" height={Math.max(meterNarrowPressure, 10) * 0.5} fill="#3b82f6" rx="2" />
            <text x={width/2} y="15" fontSize="9" fill="#60a5fa" textAnchor="middle" fontWeight="bold">P2</text>
            <text x={width/2} y="155" fontSize="9" fill="#60a5fa" textAnchor="middle">{meterNarrowPressure.toFixed(0)} kPa</text>

            {/* Delta P display */}
            <rect x={width/2 - 60} y="170" width="120" height="35" rx="6" fill="#0a1a2a" stroke="#22c55e" strokeWidth="2" />
            <text x={width/2} y="185" fontSize="10" fill="#4ade80" textAnchor="middle" fontWeight="bold">
              Delta P = {(REFERENCE_PRESSURE - meterNarrowPressure).toFixed(1)} kPa
            </text>
            <text x={width/2} y="198" fontSize="9" fill="#86efac" textAnchor="middle">
              Flow = {meterFlowRate}%
            </text>
          </g>
        )}

        {/* Labels */}
        <text x={(width - 380) / 2 + 60} y={height - 25} fontSize="9" fill={colors.textMuted} textAnchor="middle">Inlet</text>
        <text x={width/2} y={height - 25} fontSize="9" fill="#22d3ee" textAnchor="middle" fontWeight="600">Throat</text>
        <text x={(width + 380) / 2 - 60} y={height - 25} fontSize="9" fill={colors.textMuted} textAnchor="middle">Outlet</text>
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
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingBottom: '100px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            💨🌊
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } } .muted-secondary { color: #94a3b8; } .muted-dim { color: #6B7280; }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            The Venturi Effect
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Why does water shoot <span style={{ color: colors.accent }}>farther</span> when you cover part of a garden hose with your thumb? The answer reveals one of the most useful principles in fluid physics."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
            boxShadow: `0 4px 24px ${colors.accentGlow}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "When fluid flows through a constriction, its velocity increases and pressure decreases. This simple principle powers everything from carburetors to medical oxygen masks."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - Bernoulli's Principle (1738)
            </p>
          </div>

          {renderNavDots()}
        </div>

        {renderBottomNav(() => { playSound('click'); nextPhase(); }, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Speed stays the same - water is incompressible' },
      { id: 'b', text: 'Speed increases - same volume must pass through smaller area', correct: true },
      { id: 'c', text: 'Speed decreases - the narrow section resists flow' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
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
              Water flows through a pipe that narrows in the middle. If the same amount of water must pass through every second, what happens to the water speed in the narrow section?
            </h2>

            {/* SVG Diagram */}
            <svg viewBox="0 0 400 180" width="400" style={{ maxWidth: '100%', marginBottom: '20px' }}>
              <defs>
                <filter id="venturiPredGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="venturiPredGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
              </defs>
              <rect width="400" height="180" fill="#0f172a" rx="12" />
              <g transform="translate(0,40)">
                {/* Tube walls */}
                <path d="M 30 20 L 140 20 L 160 40 L 240 40 L 260 20 L 370 20" stroke="#64748b" strokeWidth="2" fill="none" />
                <path d="M 30 80 L 140 80 L 160 60 L 240 60 L 260 80 L 370 80" stroke="#64748b" strokeWidth="2" fill="none" />
                {/* Flow fill */}
                <path d="M 30 20 L 140 20 L 160 40 L 240 40 L 260 20 L 370 20 L 370 80 L 260 80 L 240 60 L 160 60 L 140 80 L 30 80 Z" fill="url(#venturiPredGrad)" opacity="0.2" />
                {/* Flow arrows */}
                <g filter="url(#venturiPredGlow)">
                  <line x1="60" y1="50" x2="120" y2="50" stroke="#3b82f6" strokeWidth="3" />
                  <polygon points="120,44 132,50 120,56" fill="#3b82f6" />
                  <line x1="170" y1="50" x2="230" y2="50" stroke="#ef4444" strokeWidth="3" />
                  <polygon points="230,44 242,50 230,56" fill="#ef4444" />
                  <line x1="280" y1="50" x2="340" y2="50" stroke="#3b82f6" strokeWidth="3" />
                  <polygon points="340,44 352,50 340,56" fill="#3b82f6" />
                </g>
                <text x="85" y="15" textAnchor="middle" fill="#94a3b8" fontSize="10">Wide</text>
                <text x="200" y="35" textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="600">Narrow (?)</text>
                <text x="315" y="15" textAnchor="middle" fill="#94a3b8" fontSize="10">Wide</text>
              </g>
              <text x="200" y="165" textAnchor="middle" fill="#64748b" fontSize="10">Same water volume per second must pass through each section</text>
            </svg>

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

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Test My Prediction', !prediction)}
      </div>
    );
  }

  // PLAY PHASE - Interactive Venturi Tube Simulator
  if (phase === 'play') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Venturi Tube Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
              Watch how velocity and pressure change as fluid flows through different pipe sections.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              When you increase flow rate, velocity increases. When area decreases, pressure drops because kinetic energy goes up. This is useful in engineering applications like carburetors and flow meters.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <VenturiVisualization />
              </div>

              {/* Flow rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Flow Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={flowRate}
                  onChange={(e) => setFlowRate(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.accent} ${((flowRate - 20) / 80) * 100}%, ${colors.border} ${((flowRate - 20) / 80) * 100}%)`,
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Constriction slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Constriction (% of original area)</span>
                  <span style={{ ...typo.small, color: colors.flow, fontWeight: 600 }}>{constrictionSize}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={constrictionSize}
                  onChange={(e) => setConstrictionSize(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.flow} ${((constrictionSize - 20) / 60) * 100}%, ${colors.border} ${((constrictionSize - 20) / 60) * 100}%)`,
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Toggle controls */}
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showPressure}
                    onChange={(e) => setShowPressure(e.target.checked)}
                    style={{ accentColor: colors.accent }}
                  />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Show Pressure</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showVelocity}
                    onChange={(e) => setShowVelocity(e.target.checked)}
                    style={{ accentColor: colors.accent }}
                  />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Show Velocity</span>
                </label>
                <button
                  onClick={() => setIsFlowing(!isFlowing)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isFlowing ? colors.error : colors.success,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isFlowing ? 'Stop Flow' : 'Start Flow'}
                </button>
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
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#22c55e' }}>{wideVelocity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>v1 (m/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.flow }}>{narrowVelocity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>v2 (m/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#ef4444' }}>{widePressure.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>P1 (kPa)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.pressure }}>{narrowPressure.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>P2 (kPa)</div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {areaRatio > 2 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Notice how velocity increases {areaRatio.toFixed(1)}x while pressure drops! This is the Venturi effect.
                </p>
              </div>
            )}

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Understand the Physics')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of the Venturi Effect
            </h2>

            <div style={{
              background: `${colors.success}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.success}44`,
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                As you observed in the experiment, velocity increased when the pipe narrowed - exactly what you predicted!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Continuity Equation: A1v1 = A2v2</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Mass is conserved - if area <span style={{ color: colors.flow }}>decreases</span>, velocity must <span style={{ color: colors.accent }}>increase</span> to maintain the same flow rate. This is why water speeds up in a narrow section.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Bernoulli's Principle: P + 1/2 pv^2 = constant</strong>
                </p>
                <p>
                  Energy is conserved - if velocity <span style={{ color: colors.accent }}>increases</span>, pressure must <span style={{ color: colors.pressure }}>decrease</span>. Kinetic energy up means pressure energy down.
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
                Key Insight: The Venturi Effect
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                Combining continuity and Bernoulli:
              </p>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Narrow section = Higher velocity (continuity)</li>
                <li>Higher velocity = Lower pressure (Bernoulli)</li>
                <li><strong>Narrow section = Low pressure zone!</strong></li>
              </ul>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Why This Matters
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The low-pressure zone at a constriction can be used to draw in other fluids - this is how carburetors mix fuel, aspirators create vacuum, and spray bottles atomize liquids!
              </p>
            </div>

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Discover a New Application')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Measure the pressure difference between wide and narrow sections', correct: true },
      { id: 'b', text: 'Count how many bubbles pass through per second' },
      { id: 'c', text: 'Measure the temperature change in the fluid' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                🔄 New Challenge: The Venturi Flow Meter
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Engineers need to measure flow rate in a pipe without inserting any probes. What do you predict - how can a Venturi tube help?
            </h2>

            <svg viewBox="0 0 400 160" width="400" style={{ maxWidth: '100%', marginBottom: '20px' }}>
              <defs>
                <filter id="twistPGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="twistPGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
              </defs>
              <rect width="400" height="160" fill="#0f172a" rx="12" />
              <g transform="translate(0,30)">
                <path d="M 30 20 L 140 20 L 160 35 L 240 35 L 260 20 L 370 20" stroke="#64748b" strokeWidth="2" fill="none" />
                <path d="M 30 80 L 140 80 L 160 65 L 240 65 L 260 80 L 370 80" stroke="#64748b" strokeWidth="2" fill="none" />
                <path d="M 30 20 L 140 20 L 160 35 L 240 35 L 260 20 L 370 20 L 370 80 L 260 80 L 240 65 L 160 65 L 140 80 L 30 80 Z" fill="url(#twistPGrad)" opacity="0.15" />
                {/* Pressure gauges */}
                <g filter="url(#twistPGlow)">
                  <rect x="75" y="-5" width="30" height="25" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
                  <text x="90" y="14" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">P1</text>
                  <rect x="185" y="10" width="30" height="25" rx="4" fill="#1e293b" stroke="#ef4444" strokeWidth="1" />
                  <text x="200" y="27" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="600">P2</text>
                </g>
                <text x="200" y="95" textAnchor="middle" fill="#94a3b8" fontSize="10">Measure ΔP to find flow rate?</text>
              </g>
            </svg>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                We know that flow rate affects velocity, and velocity affects pressure...
              </p>
              <p style={{ ...typo.body, color: colors.accent, marginTop: '12px', fontWeight: 600 }}>
                Can we work backwards from pressure to find flow rate?
              </p>
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

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Try the Flow Meter', !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Venturi Flow Meter
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust the flow rate and see how pressure difference reveals flow velocity
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <VenturiMeterVisualization />
              </div>

              {/* Flow rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Actual Flow Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{meterFlowRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={meterFlowRate}
                  onChange={(e) => setMeterFlowRate(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Toggle readings */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showMeterReadings}
                    onChange={(e) => setShowMeterReadings(e.target.checked)}
                    style={{ accentColor: colors.accent }}
                  />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Show Pressure Readings</span>
                </label>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.flow }}>{meterWideVelocity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>v1 (m/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#22d3ee' }}>{meterNarrowVelocity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>v2 (m/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{(REFERENCE_PRESSURE - meterNarrowPressure).toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Delta P (kPa)</div>
                </div>
              </div>
            </div>

            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                The pressure difference increases with flow rate! We can calculate flow from Delta P.
              </p>
            </div>

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Understand the Math')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              How Venturi Meters Measure Flow
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.flow }}>1</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Measure Pressure Drop</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Pressure taps at the inlet and throat measure <span style={{ color: colors.success }}>Delta P = P1 - P2</span>. Higher flow = bigger pressure difference.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.flow }}>2</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Apply Bernoulli</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  From <span style={{ color: colors.accent }}>Delta P = 1/2 p (v2^2 - v1^2)</span>, we can calculate velocity from the pressure difference.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.flow }}>3</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Calculate Flow Rate</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  <span style={{ color: colors.success }}>Q = A x v</span> gives us volumetric flow rate. Flow is proportional to the square root of Delta P!
                </p>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                  Why Venturi Meters Are Brilliant
                </h3>
                <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                  <li>No moving parts - extremely reliable</li>
                  <li>Non-intrusive - nothing blocks the flow</li>
                  <li>Low permanent pressure loss (10-30%)</li>
                  <li>Works with liquids and gases</li>
                  <li>Accuracy of 0.5-2% is typical</li>
                </ul>
              </div>
            </div>

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    // Mark current app as viewed
    const markCurrentAppComplete = () => {
      if (!completedApps[selectedApp]) {
        const newCompleted = [...completedApps];
        newCompleted[selectedApp] = true;
        setCompletedApps(newCompleted);
      }
      // Move to next app if available
      if (selectedApp < realWorldApps.length - 1) {
        setSelectedApp(selectedApp + 1);
      }
    };

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
            </p>

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
                  How the Venturi Effect Applies:
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

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '12px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Industry Leaders:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.companies.join(', ')}
                </p>
              </div>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '12px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Future Impact:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              {/* Got It button */}
              <button
                onClick={() => { playSound('click'); markCurrentAppComplete(); }}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {selectedApp < realWorldApps.length - 1 ? 'Got It - Next App →' : 'Got It'}
              </button>
            </div>

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav(
          allAppsCompleted ? () => { playSound('success'); nextPhase(); } : undefined,
          allAppsCompleted ? 'Take the Knowledge Test' : undefined,
          !allAppsCompleted
        )}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
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
                  ? 'You understand the Venturi effect and Bernoulli\'s principle!'
                  : 'Review the concepts and try again.'}
              </p>

              {renderNavDots()}
            </div>
          </div>
          {renderBottomNav(
            passed ? () => { playSound('complete'); nextPhase(); } : () => {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestScore(0);
              goToPhase('hook');
            },
            passed ? 'Complete Lesson' : 'Review and Try Again'
          )}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
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
                  Previous
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

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingBottom: '100px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Venturi Effect Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand one of the most useful principles in fluid dynamics - used in everything from airplane instruments to medical equipment.
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
                'Continuity equation: A1v1 = A2v2 (mass conservation)',
                'Narrow section = higher velocity',
                'Bernoulli: P + 1/2 pv^2 = constant (energy conservation)',
                'Higher velocity = lower pressure',
                'Venturi effect powers carburetors, atomizers, flow meters',
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default VenturiEffectRenderer;
