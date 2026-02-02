'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// JAR LID EXPANSION RENDERER - GAME 136 (Thermal Expansion for Jars)
// Physics: Delta L = alpha * L0 * Delta T - Differential expansion between metal and glass
// Hook: "Why does heating the lid help open a jar?"
// Complete 10-Phase Learning Structure
// =============================================================================

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

interface JarLidExpansionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility for feedback
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'pop' | 'heat') => {
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
      complete: { freq: 900, duration: 0.4, type: 'sine' },
      pop: { freq: 400, duration: 0.15, type: 'sine' },
      heat: { freq: 200, duration: 0.2, type: 'sawtooth' }
    };
    const sound = sounds[type] || sounds.click;
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "You're trying to open a tight jar lid. Your grandmother suggests running hot water over just the metal lid, not the glass jar.",
    question: "Why would heating only the lid help open it?",
    options: [
      { id: 'a', label: "Hot water lubricates the threads" },
      { id: 'b', label: "Metal expands more than glass, loosening the seal", correct: true },
      { id: 'c', label: "Heat weakens the metal" },
      { id: 'd', label: "Steam pressure pushes the lid off" }
    ],
    explanation: "Metal (alpha ~ 17x10^-6/C for steel) expands about twice as much as glass (alpha ~ 8.5x10^-6/C). Heating the lid makes it expand faster than the glass rim, breaking the seal. This is differential thermal expansion in action!"
  },
  {
    scenario: "A bridge engineer notices expansion joints every 50 meters along a 500-meter steel bridge. Temperature varies from -20C to +40C annually.",
    question: "How much does each 50m section expand between temperature extremes?",
    options: [
      { id: 'a', label: "About 3.6 cm", correct: true },
      { id: 'b', label: "About 3.6 mm" },
      { id: 'c', label: "About 36 cm" },
      { id: 'd', label: "About 0.36 mm" }
    ],
    explanation: "Using Delta L = alpha * L0 * Delta T with alpha_steel = 12x10^-6/C, L0 = 50m = 50,000mm, Delta T = 60C: Delta L = 12x10^-6 x 50,000 x 60 = 36 mm = 3.6 cm. Without expansion joints, this force would crack concrete and buckle steel!"
  },
  {
    scenario: "On a hot summer day, overhead power lines appear to sag more than usual between poles.",
    question: "What causes this increased sagging?",
    options: [
      { id: 'a', label: "The poles are leaning more in heat" },
      { id: 'b', label: "Aluminum wires expand and lengthen in heat", correct: true },
      { id: 'c', label: "The wind is pushing the lines down" },
      { id: 'd', label: "Electricity makes the lines heavier" }
    ],
    explanation: "Aluminum (alpha ~ 23x10^-6/C) has high thermal expansion. A 100m span can lengthen by 10+ cm on a hot day! Power line engineers account for this 'sag' to ensure minimum clearance even in extreme temperatures."
  },
  {
    scenario: "Railroad tracks are installed with small gaps between sections. On an extremely hot day, you notice the gaps are nearly closed.",
    question: "What could happen if gaps were eliminated completely?",
    options: [
      { id: 'a', label: "Trains would run smoother" },
      { id: 'b', label: "Tracks could buckle and cause derailments", correct: true },
      { id: 'c', label: "The metal would cool faster" },
      { id: 'd', label: "Nothing - steel is strong enough" }
    ],
    explanation: "When expansion is constrained, enormous thermal stress builds up: sigma = E*alpha*Delta T. For steel with E = 200 GPa, alpha = 12x10^-6/C, and Delta T = 40C, stress reaches ~96 MPa! This can exceed buckling strength, causing dangerous 'sun kinks' that derail trains."
  },
  {
    scenario: "A bimetallic strip made of brass (alpha = 19x10^-6/C) bonded to steel (alpha = 12x10^-6/C) is heated uniformly.",
    question: "Which way does the strip bend?",
    options: [
      { id: 'a', label: "Toward the brass side (brass on inside of curve)" },
      { id: 'b', label: "Toward the steel side (steel on inside of curve)", correct: true },
      { id: 'c', label: "It stays straight" },
      { id: 'd', label: "It twists into a spiral" }
    ],
    explanation: "Brass expands more than steel when heated. Since they're bonded together, the brass side becomes longer, forcing the strip to curve with brass on the outside (longer path) and steel on the inside. This is how mechanical thermostats work!"
  },
  {
    scenario: "An engineer selects Invar (alpha ~ 1.2x10^-6/C) for precision measuring instruments instead of regular steel (alpha ~ 12x10^-6/C).",
    question: "Why is low thermal expansion critical for measurement tools?",
    options: [
      { id: 'a', label: "Invar is more magnetic" },
      { id: 'b', label: "Small temperature changes won't change the tool's dimensions", correct: true },
      { id: 'c', label: "Invar is cheaper to manufacture" },
      { id: 'd', label: "Invar is harder than steel" }
    ],
    explanation: "A 1-meter steel ruler would change by 12 micrometers per degree C, but an Invar ruler changes only 1.2 micrometers! For precision measurements to micrometers, this 10x difference is critical. Invar's special nickel-iron alloy has magnetic properties that counteract thermal expansion."
  },
  {
    scenario: "Pyrex glass (alpha ~ 3.3x10^-6/C) is used for laboratory glassware instead of regular glass (alpha ~ 9x10^-6/C).",
    question: "Why is low thermal expansion important for lab equipment?",
    options: [
      { id: 'a', label: "It makes the glass clearer" },
      { id: 'b', label: "It resists cracking from thermal shock when heated unevenly", correct: true },
      { id: 'c', label: "It's lighter weight" },
      { id: 'd', label: "It's cheaper to produce" }
    ],
    explanation: "When glass is heated unevenly (like pouring hot liquid into a cold beaker), the hot part expands while the cold part doesn't. This creates stress that can crack regular glass. Pyrex's lower alpha means less stress difference, making it thermal shock resistant."
  },
  {
    scenario: "Concrete and reinforcing steel rebar both have alpha ~ 12x10^-6/C, almost identical thermal expansion coefficients.",
    question: "Why is this match important for reinforced concrete structures?",
    options: [
      { id: 'a', label: "It makes the concrete stronger" },
      { id: 'b', label: "It prevents internal cracking from differential expansion", correct: true },
      { id: 'c', label: "It reduces the amount of steel needed" },
      { id: 'd', label: "It's just a coincidence with no importance" }
    ],
    explanation: "If concrete and steel had different alpha values, temperature changes would cause them to expand differently, creating shear stress at the interface. This would crack the concrete and weaken the bond. The natural match of expansion coefficients allows reinforced concrete to work as a single material!"
  },
  {
    scenario: "A machinist needs to fit a steel bushing (alpha = 12x10^-6/C) tightly into an aluminum housing (alpha = 23x10^-6/C).",
    question: "What's the best approach for a shrink-fit assembly?",
    options: [
      { id: 'a', label: "Heat the bushing and cool the housing" },
      { id: 'b', label: "Heat the housing to expand it, insert bushing, let cool", correct: true },
      { id: 'c', label: "Force the bushing in with a press" },
      { id: 'd', label: "Cool both parts equally" }
    ],
    explanation: "Heating the aluminum housing (higher alpha) makes it expand more than the steel bushing would. Insert the bushing while the housing is expanded, then let it cool. The housing shrinks around the bushing, creating a tight interference fit without damaging either part."
  },
  {
    scenario: "In winter, the Eiffel Tower (iron, alpha ~ 12x10^-6/C, 300m tall) is measurably shorter than in summer. Temperature varies by 35C seasonally.",
    question: "How much does the tower's height change between seasons?",
    options: [
      { id: 'a', label: "About 1.3 cm" },
      { id: 'b', label: "About 12.6 cm (roughly 5 inches)", correct: true },
      { id: 'c', label: "About 1.26 m" },
      { id: 'd', label: "Less than 1 mm" }
    ],
    explanation: "Using Delta L = alpha * L0 * Delta T: Delta L = 12x10^-6 x 300,000mm x 35C = 126 mm = 12.6 cm. The Eiffel Tower literally grows and shrinks by about 5 inches (12-15 cm) depending on temperature! All large structures must account for this."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// =============================================================================
const realWorldApps = [
  {
    icon: '🌉',
    title: 'Bridge Expansion Joints',
    short: 'Bridges',
    tagline: 'Engineering flexibility into rigidity',
    description: 'Long bridges incorporate expansion joints every 50-100 meters to accommodate thermal expansion. Without these gaps, temperature changes would create enormous stresses that could crack concrete and buckle steel. The Golden Gate Bridge expands up to 1.5 meters on hot days.',
    connection: 'Just as heating a jar lid causes it to expand more than the glass, bridge components expand at different rates. Expansion joints allow steel and concrete to grow and shrink independently without building up destructive thermal stress.',
    howItWorks: 'Expansion joints use interlocking finger plates or elastomeric bearings that allow horizontal movement while supporting vertical loads. Engineers calculate required gap width using Delta L = alpha * L0 * Delta T, considering local temperature extremes.',
    stats: [
      { value: '3.6cm', label: 'Per 50m span', icon: '📏' },
      { value: '60C', label: 'Temp range', icon: '🌡️' },
      { value: '50+ yrs', label: 'Design life', icon: '⏱️' }
    ],
    examples: ['Golden Gate Bridge', 'Interstate highways', 'Railway bridges', 'Pipeline loops'],
    companies: ['Watson Bowman', 'Mageba', 'DS Brown', 'Trelleborg'],
    futureImpact: 'Smart expansion joints with embedded sensors will monitor movement and stress in real-time, providing early warning of structural issues and enabling predictive maintenance.',
    color: '#EF4444'
  },
  {
    icon: '🔩',
    title: 'Shrink-Fit Assembly',
    short: 'Manufacturing',
    tagline: 'Thermal expansion as a precision tool',
    description: 'Industrial machinery uses thermal expansion to create incredibly tight mechanical connections. By heating an outer ring and cooling an inner shaft, components can be assembled with interference fits that would be impossible at room temperature.',
    connection: 'This is the jar lid principle in reverse - controlled thermal expansion creates the gap needed for assembly. When temperatures equalize, the differential contraction creates a joint stronger than threading or welding.',
    howItWorks: 'The outer component is heated until it expands enough to slip over the inner piece (typically 150-300C). As it cools and contracts, it grips the inner component with enormous pressure. The interference fit can transmit huge torques without keys or splines.',
    stats: [
      { value: '100MPa', label: 'Joint pressure', icon: '💪' },
      { value: '0.1mm', label: 'Interference', icon: '🔬' },
      { value: '10x', label: 'Torque capacity', icon: '⚡' }
    ],
    examples: ['Railway wheels', 'Bearing installation', 'Gear shaft assembly', 'Turbine blades'],
    companies: ['SKF', 'Timken', 'Siemens', 'GE Aerospace'],
    futureImpact: 'Precision induction heating systems will enable automated shrink-fit assembly in robotic manufacturing, with temperature control accurate to 1C for consistent joint quality.',
    color: '#3B82F6'
  },
  {
    icon: '🌡️',
    title: 'Bimetallic Thermostats',
    short: 'Thermostats',
    tagline: 'Two metals, one solution',
    description: 'Bimetallic strips use differential thermal expansion to create mechanical thermostats. By bonding two metals with different expansion coefficients, temperature changes cause bending that can open or close electrical contacts.',
    connection: 'The jar lid opens because metal expands more than glass. Bimetallic strips exploit this same principle - brass expands more than steel, so a bonded strip curves toward the slower-expanding metal when heated.',
    howItWorks: 'Two metals (typically brass and steel or invar) are bonded face-to-face. Different expansion rates cause the strip to curve when temperature changes. This mechanical motion actuates switches in thermostats, circuit breakers, and fire alarms.',
    stats: [
      { value: '+/-0.5C', label: 'Accuracy', icon: '🎯' },
      { value: '1M+', label: 'Cycle life', icon: '🔄' },
      { value: '$0.50', label: 'Unit cost', icon: '💵' }
    ],
    examples: ['Home thermostats', 'Oven controls', 'Circuit breakers', 'Fire sprinklers'],
    companies: ['Honeywell', 'Emerson', 'Sensata', 'Texas Instruments'],
    futureImpact: 'While electronic sensors dominate new designs, bimetallic devices remain crucial for safety applications where simplicity and reliability matter more than precision.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Power Line Engineering',
    short: 'Power Lines',
    tagline: 'Calculating clearance for safety',
    description: 'Overhead power lines expand significantly on hot days, causing them to sag closer to the ground. Engineers must calculate maximum sag under worst-case conditions to ensure safe clearance from trees, buildings, and the ground.',
    connection: 'Like the expanding jar lid, aluminum power lines grow in length with temperature. A 100-meter span can extend by 10+ centimeters on a hot day, dramatically increasing sag between towers.',
    howItWorks: 'Utilities use conductor temperature monitoring systems to calculate real-time sag. High-temperature low-sag (HTLS) conductors use composite cores that expand less than aluminum. Dynamic line rating systems adjust power limits based on actual conditions.',
    stats: [
      { value: '23x10^-6', label: 'Alpha aluminum', icon: '📈' },
      { value: '10m', label: 'Typical sag', icon: '📉' },
      { value: '$45B', label: 'Grid investment', icon: '💰' }
    ],
    examples: ['HV transmission', 'Distribution networks', 'Railway electrification', 'Submarine cables'],
    companies: ['General Cable', 'Southwire', 'Prysmian', 'Nexans'],
    futureImpact: 'Carbon fiber composite conductors will virtually eliminate thermal sag, allowing existing corridors to carry more power and reducing wildfire risk from sagging lines.',
    color: '#F59E0B'
  }
];

// Material properties for simulation
interface Material {
  name: string;
  alpha: number; // Coefficient of thermal expansion (10^-6 /C)
  color: string;
  description: string;
}

const materials: Material[] = [
  { name: 'Steel Lid', alpha: 12, color: '#6b7280', description: 'Common jar lid material' },
  { name: 'Aluminum Lid', alpha: 23, color: '#94a3b8', description: 'Lighter, expands more' },
  { name: 'Brass Lid', alpha: 19, color: '#fbbf24', description: 'Traditional material' },
  { name: 'Glass Jar', alpha: 8.5, color: '#06b6d4', description: 'Lower expansion than metals' }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const JarLidExpansionRenderer: React.FC<JarLidExpansionRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Simulation state
  const [temperature, setTemperature] = useState(20);
  const [selectedLidMaterial, setSelectedLidMaterial] = useState(0);
  const [showChillFirst, setShowChillFirst] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref to prevent double clicks
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate expansion
  const baseTemp = showChillFirst ? 0 : 20;
  const lidDiameter = 70; // mm
  const glassDiameter = 70; // mm

  const calculateExpansion = (alpha: number, diameter: number, deltaT: number) => {
    return (alpha * 1e-6) * diameter * deltaT;
  };

  const lidExpansion = calculateExpansion(materials[selectedLidMaterial].alpha, lidDiameter, temperature - baseTemp);
  const glassExpansion = calculateExpansion(materials[3].alpha, glassDiameter, temperature - baseTemp);
  const gapChange = lidExpansion - glassExpansion;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Thermal Shock',
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
        gameType: 'jar-lid-expansion',
        gameTitle: 'Jar Lid Expansion',
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
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

  // Jar visualization SVG
  const renderJarVisualization = () => {
    const lidMaterial = materials[selectedLidMaterial];
    const expansionScale = 100;
    const visualLidExpansion = gapChange * expansionScale;
    const tempNormalized = Math.min(1, Math.max(0, (temperature - baseTemp) / 80));

    return (
      <svg viewBox="0 0 300 280" style={{ width: '100%', maxWidth: '300px' }}>
        <defs>
          <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="lidMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lidMaterial.color} />
            <stop offset="100%" stopColor={lidMaterial.color} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="heatGlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={tempNormalized * 0.5} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="300" height="280" fill="#1e293b" rx="12" />

        {temperature > 30 && (
          <rect x="80" y="160" width="140" height="100" fill="url(#heatGlow)" rx="4" />
        )}

        <path
          d="M90 80 L90 230 Q90 250 110 250 L190 250 Q210 250 210 230 L210 80"
          fill="url(#jarGlass)"
          stroke="#67e8f9"
          strokeWidth="3"
        />

        <rect x="95" y="120" width="110" height="125" fill="#f59e0b" opacity="0.6" rx="2" />
        <rect x="95" y="110" width="110" height="25" fill="#fbbf24" opacity="0.4" rx="2" />

        <rect
          x={85 + glassExpansion * expansionScale / 2}
          y="65"
          width={130 - glassExpansion * expansionScale}
          height="18"
          fill="#67e8f9"
          stroke="#22d3ee"
          strokeWidth="2"
          rx="2"
        />

        <rect
          x={80 - visualLidExpansion / 2}
          y="42"
          width={140 + visualLidExpansion}
          height="28"
          fill="url(#lidMetal)"
          stroke={temperature > 60 ? '#fbbf24' : '#475569'}
          strokeWidth={temperature > 60 ? 3 : 2}
          rx="3"
        />

        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <line
            key={i}
            x1={95 + i * 15 - visualLidExpansion / 2}
            y1="47"
            x2={95 + i * 15 - visualLidExpansion / 2}
            y2="65"
            stroke={lidMaterial.color}
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {temperature > 30 && (
          <>
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M${100 + i * 40},35 Q${105 + i * 40},15 ${100 + i * 40},-5`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                opacity={0.3 + tempNormalized * 0.5}
              >
                <animate
                  attributeName="d"
                  values={`M${100 + i * 40},35 Q${105 + i * 40},15 ${100 + i * 40},-5;M${100 + i * 40},35 Q${95 + i * 40},10 ${100 + i * 40},-10;M${100 + i * 40},35 Q${105 + i * 40},15 ${100 + i * 40},-5`}
                  dur={`${1.5 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </>
        )}

        <rect x="10" y="10" width="80" height="35" fill="rgba(0,0,0,0.5)" rx="6" />
        <text x="50" y="27" textAnchor="middle" fill={temperature > 60 ? '#ef4444' : temperature < 10 ? '#3b82f6' : '#22d3ee'} fontSize="14" fontWeight="bold">
          {temperature}C
        </text>
        <text x="50" y="40" textAnchor="middle" fill="#64748b" fontSize="9">Temperature</text>

        <rect x="210" y="10" width="80" height="35" fill="rgba(0,0,0,0.5)" rx="6" />
        <text x="250" y="25" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
          {gapChange > 0 ? '+' : ''}{(gapChange * 1000).toFixed(1)} um
        </text>
        <text x="250" y="40" textAnchor="middle" fill="#64748b" fontSize="9">Gap Change</text>

        <text x="150" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {lidMaterial.name} on Glass Jar
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
          🫙
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Stuck Jar Lid Mystery
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why does running <span style={{ color: colors.warning }}>hot water</span> over a jar lid help it <span style={{ color: colors.success }}>pop open</span>? The answer reveals a fundamental property of materials that engineers use every day."
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
            "Every material changes size when heated or cooled. Understanding these differences is key to opening stubborn jars - and designing bridges, power lines, and precision instruments."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Thermal Engineering Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Secret
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Hot water lubricates the threads' },
      { id: 'b', text: 'Metal expands more than glass, creating a gap', correct: true },
      { id: 'c', text: 'Heat softens the vacuum seal' },
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
            A jar lid is stuck tight. You run hot water over just the metal lid (not the glass). Why does this help open it?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🫙 + 🔥 = ❓</div>
            <p style={{ ...typo.small, color: colors.textMuted }}>Hot water on metal lid</p>
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
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Jar Simulator
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
            Differential Expansion Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch how the metal lid expands more than the glass jar when heated
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderJarVisualization()}
            </div>

            {/* Temperature slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                <span style={{ ...typo.small, color: temperature > 60 ? colors.error : colors.accent, fontWeight: 600 }}>{temperature}C</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseInt(e.target.value));
                  if (parseInt(e.target.value) > 60) playSound('heat');
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Room (20C)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Hot water (100C)</span>
              </div>
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Lid Material:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {materials.slice(0, 3).map((mat, i) => (
                  <button
                    key={i}
                    onClick={() => { playSound('click'); setSelectedLidMaterial(i); }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedLidMaterial === i ? mat.color : colors.border}`,
                      background: selectedLidMaterial === i ? `${mat.color}22` : colors.bgSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: mat.color, margin: '0 auto 4px' }} />
                    <div style={{ ...typo.small, color: colors.textPrimary }}>{mat.name.split(' ')[0]}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted }}>alpha={mat.alpha}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats display */}
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
                <div style={{ ...typo.h3, color: colors.accent }}>{(lidExpansion * 1000).toFixed(1)} um</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Lid Expansion</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: '#67e8f9' }}>{(glassExpansion * 1000).toFixed(1)} um</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Glass Expansion</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: gapChange > 0 ? colors.success : colors.error }}>
                  {gapChange > 0 ? '+' : ''}{(gapChange * 1000).toFixed(1)} um
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Gap Change</div>
              </div>
            </div>
          </div>

          {temperature > 50 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                The lid expanded {(gapChange * 1000).toFixed(1)} micrometers more than the glass - that's the gap that breaks the seal!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
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
            The Physics of Differential Expansion
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Delta L = alpha x L0 x Delta T</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Every material has a <span style={{ color: colors.accent }}>thermal expansion coefficient (alpha)</span> that determines how much it grows when heated.
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Steel: alpha = 12 x 10^-6 per C</li>
                <li style={{ marginBottom: '8px' }}>Aluminum: alpha = 23 x 10^-6 per C</li>
                <li>Glass: alpha = 8.5 x 10^-6 per C (lower!)</li>
              </ul>
            </div>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Key Insight: The Metal Always Wins
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Metals expand 1.5-3x more than glass for the same temperature change. When you heat the lid, it grows faster than the glass rim, creating a gap that breaks the vacuum seal. This same principle is used in shrink-fit assembly, bridge design, and precision instruments!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Pro Tips for Opening Jars
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Heat only the lid, not the jar (maximize differential)</li>
              <li style={{ marginBottom: '8px' }}>Use hot tap water - you don't need boiling</li>
              <li>Aluminum lids expand even more than steel!</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover a Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Cold makes the lid sticky, then hot releases it' },
      { id: 'b', text: 'Bigger total temperature change = bigger expansion difference', correct: true },
      { id: 'c', text: 'The ice water loosens the vacuum seal already' },
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
              New Variable: The Thermal Shock Technique
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Some people chill the jar in ice water BEFORE running hot water on the lid. Why would this work better?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '48px' }}>❄️</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Ice bath</p>
                <p style={{ ...typo.small, color: '#3b82f6' }}>0C</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>then</div>
              <div>
                <div style={{ fontSize: '48px' }}>🔥</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Hot water</p>
                <p style={{ ...typo.small, color: colors.error }}>80C</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>=</div>
              <div>
                <div style={{ fontSize: '48px' }}>❓</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Delta T</p>
                <p style={{ ...typo.small, color: colors.success }}>80C!</p>
              </div>
            </div>
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See the Effect
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const directDeltaT = 60; // 20C to 80C
    const chillDeltaT = 80; // 0C to 80C
    const directGap = (materials[selectedLidMaterial].alpha - 8.5) * 1e-6 * 70 * directDeltaT * 1000;
    const chillGap = (materials[selectedLidMaterial].alpha - 8.5) * 1e-6 * 70 * chillDeltaT * 1000;
    const improvement = ((chillGap - directGap) / directGap * 100).toFixed(0);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Thermal Shock Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare direct heating vs. chill-then-heat technique
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Method toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => { playSound('click'); setShowChillFirst(false); setTemperature(20); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${!showChillFirst ? colors.warning : colors.border}`,
                  background: !showChillFirst ? `${colors.warning}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
                <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Direct Heat</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>20C to 80C</div>
                <div style={{ ...typo.small, color: colors.warning, marginTop: '4px' }}>Delta T = 60C</div>
              </button>
              <button
                onClick={() => { playSound('click'); setShowChillFirst(true); setTemperature(0); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${showChillFirst ? '#3b82f6' : colors.border}`,
                  background: showChillFirst ? 'rgba(59, 130, 246, 0.2)' : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>❄️🔥</div>
                <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Chill + Heat</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>0C to 80C</div>
                <div style={{ ...typo.small, color: '#3b82f6', marginTop: '4px' }}>Delta T = 80C</div>
              </button>
            </div>

            {/* Jar visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderJarVisualization()}
            </div>

            {/* Temperature slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                <span style={{ ...typo.small, color: temperature > 50 ? colors.error : temperature < 10 ? '#3b82f6' : colors.accent, fontWeight: 600 }}>{temperature}C</span>
              </div>
              <input
                type="range"
                min={showChillFirst ? 0 : 20}
                max="100"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Comparison stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `2px solid ${!showChillFirst ? colors.warning : colors.border}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Direct Heat (Delta T=60C)</div>
                <div style={{ ...typo.h2, color: colors.warning }}>+{directGap.toFixed(1)} um</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `2px solid ${showChillFirst ? '#3b82f6' : colors.border}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Chill+Heat (Delta T=80C)</div>
                <div style={{ ...typo.h2, color: '#3b82f6' }}>+{chillGap.toFixed(1)} um</div>
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
              {improvement}% more gap expansion with the chill-then-heat technique!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
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
            Maximizing Differential Expansion
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Delta</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Temperature Change is Key</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Since expansion is proportional to Delta T, chilling first (0C) then heating to 80C gives 33% more temperature change than room temp (20C) to 80C. More Delta T = more differential expansion = easier opening!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Warning</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Thermal Shock Caution</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Don't pour boiling water on cold glass - it can crack! The trick works because you're heating only the metal lid. Glass with low thermal expansion tolerates gradual warming, but rapid temperature changes create stress that can fracture it.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Formula</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Engineering Applications</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This same principle is used everywhere: bridge expansion joints accommodate seasonal temperature swings, shrink-fit assembly uses thermal expansion for permanent joints, and precision instruments use low-expansion materials to maintain accuracy.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
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
                Connection to Jar Lid Physics:
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

          {allAppsCompleted ? (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          ) : (
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
              Explore all 4 applications to continue ({completedApps.filter(c => c).length}/4 completed)
            </p>
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
                ? 'You understand thermal expansion and its applications!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
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
                style={primaryButtonStyle}
              >
                Review and Try Again
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
          🫙
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Thermal Expansion Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how differential thermal expansion opens stubborn jars - and shapes engineering across industries.
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
              'Delta L = alpha x L0 x Delta T',
              'Metals expand more than glass',
              'Maximizing Delta T maximizes effect',
              'Thermal shock technique works better',
              'Same physics in bridges, power lines, and more',
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

export default JarLidExpansionRenderer;
