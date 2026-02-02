'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Water Hammer Renderer - Complete 10-Phase Game
// Why pipes bang when valves close suddenly
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

interface WaterHammerRendererProps {
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
    scenario: "You're in your house and hear a loud BANG from the pipes every time someone quickly turns off the kitchen faucet. The plumber says it's 'water hammer'.",
    question: "What is actually causing this loud banging noise?",
    options: [
      { id: 'a', label: "Air bubbles collapsing in the pipes" },
      { id: 'b', label: "The pipe expanding from heat" },
      { id: 'c', label: "Kinetic energy of flowing water converting to a pressure wave", correct: true },
      { id: 'd', label: "Water freezing and thawing rapidly" }
    ],
    explanation: "When flowing water is suddenly stopped, its kinetic energy converts to a pressure wave (the Joukowsky equation: ΔP = ρcΔv). This pressure spike travels through the pipes at the speed of sound in water (~1400 m/s), causing the banging noise."
  },
  {
    scenario: "A hydroelectric power plant needs to perform an emergency turbine shutdown. Engineers are concerned about water hammer in the 500-meter penstock (pipe) that feeds water to the turbine.",
    question: "According to the Joukowsky equation (ΔP = ρcΔv), if the water velocity is 5 m/s, what pressure rise would occur with instant valve closure?",
    options: [
      { id: 'a', label: "About 7 bar (700 kPa)" },
      { id: 'b', label: "About 70 bar (7 MPa)", correct: true },
      { id: 'c', label: "About 700 bar (70 MPa)" },
      { id: 'd', label: "About 0.7 bar (70 kPa)" }
    ],
    explanation: "Using ΔP = ρcΔv = 1000 kg/m³ × 1400 m/s × 5 m/s = 7,000,000 Pa = 70 bar. This enormous pressure spike is why hydroelectric plants use surge tanks and slow-closing valves."
  },
  {
    scenario: "A naval engineer is designing a ballast system for a large cargo ship. The system involves pumping seawater through long pipes to different tanks to maintain stability.",
    question: "At what speed does a water hammer pressure wave travel through the ship's pipes?",
    options: [
      { id: 'a', label: "At the speed of the water flow (typically 2-5 m/s)" },
      { id: 'b', label: "At the speed of sound in water (~1400 m/s)", correct: true },
      { id: 'c', label: "At the speed of light" },
      { id: 'd', label: "It doesn't travel - pressure stays at the valve" }
    ],
    explanation: "The pressure wave travels at the speed of sound in water, approximately 1400 m/s (about 5000 km/h). This is why water hammer effects are felt almost instantly throughout even long pipe systems."
  },
  {
    scenario: "An engineer is analyzing water hammer in a 200-meter pipe. They need to calculate the 'critical time' - the time it takes for a pressure wave to travel to the end of the pipe and reflect back.",
    question: "What is the critical time (Tc = 2L/c) for this 200-meter pipe?",
    options: [
      { id: 'a', label: "About 0.14 seconds (140 milliseconds)" },
      { id: 'b', label: "About 0.29 seconds (290 milliseconds)", correct: true },
      { id: 'c', label: "About 1.4 seconds" },
      { id: 'd', label: "About 2.9 seconds" }
    ],
    explanation: "Tc = 2L/c = 2 × 200m / 1400 m/s = 0.286 seconds ≈ 290 milliseconds. If the valve closes faster than this, full water hammer pressure develops. Closing slower reduces the peak pressure."
  },
  {
    scenario: "A hospital's dialysis unit experienced equipment damage due to water hammer. The facilities manager is investigating solutions to protect the sensitive medical equipment.",
    question: "Which device specifically absorbs water hammer shock by providing a compressible cushion?",
    options: [
      { id: 'a', label: "A check valve" },
      { id: 'b', label: "A pressure regulator" },
      { id: 'c', label: "A water hammer arrestor (with sealed air chamber)", correct: true },
      { id: 'd', label: "A water softener" }
    ],
    explanation: "A water hammer arrestor contains a sealed air or gas chamber that compresses when the pressure wave hits, absorbing the shock. Unlike air chambers that can become waterlogged, sealed arrestors maintain their cushioning ability indefinitely."
  },
  {
    scenario: "A process engineer notices that water hammer is more severe in one section of their plant than another, even though both have similar valve closure speeds.",
    question: "If the problematic section has pipes that are twice as long with the same flow velocity, how does this affect water hammer pressure?",
    options: [
      { id: 'a', label: "Pressure doubles because of longer pipes" },
      { id: 'b', label: "Pressure stays the same - it depends on velocity change, not length", correct: true },
      { id: 'c', label: "Pressure halves because energy is spread over more distance" },
      { id: 'd', label: "Pressure quadruples due to resonance effects" }
    ],
    explanation: "The Joukowsky equation (ΔP = ρcΔv) shows pressure rise depends only on density, sound speed, and velocity change - not pipe length. However, longer pipes have larger critical times, so slower valve closure is needed to avoid full hammer."
  },
  {
    scenario: "A fire protection engineer is designing a sprinkler system. When a sprinkler head opens, water rushes through empty (dry) pipes. When the flow suddenly starts, hammer can occur.",
    question: "What type of water hammer occurs when a dry pipe system suddenly fills with water?",
    options: [
      { id: 'a', label: "Positive hammer from valve closure" },
      { id: 'b', label: "Negative hammer from valve opening", correct: true },
      { id: 'c', label: "Thermal hammer from temperature change" },
      { id: 'd', label: "Cavitation hammer from air pockets" }
    ],
    explanation: "When valves open and flow starts suddenly, 'negative' or 'opening' water hammer can occur. As water accelerates into empty pipes and then suddenly stops when hitting closed valves or pipe ends, significant pressure spikes result."
  },
  {
    scenario: "An oil pipeline operator is planning maintenance that requires shutting down flow. The 50-kilometer pipeline normally operates at 2 m/s flow velocity.",
    question: "To minimize water hammer, how should the operator close the main valve?",
    options: [
      { id: 'a', label: "As quickly as possible to reduce the duration of transient pressure" },
      { id: 'b', label: "Slowly over a time longer than the critical time (Tc = 2L/c)", correct: true },
      { id: 'c', label: "In rapid short bursts to break up the pressure wave" },
      { id: 'd', label: "At exactly the speed of sound in the fluid" }
    ],
    explanation: "For this 50km pipe, Tc = 2 × 50,000m / 1400 m/s ≈ 71 seconds. Closing slower than 71 seconds allows reflected pressure waves to return and partially cancel incoming waves, dramatically reducing peak pressure."
  },
  {
    scenario: "A cardiologist explains to a patient that the human cardiovascular system experiences a form of water hammer with every heartbeat.",
    question: "What causes the 'dicrotic notch' in an arterial pulse waveform?",
    options: [
      { id: 'a', label: "Electrical signal reaching the ventricle" },
      { id: 'b', label: "Opening of the aortic valve" },
      { id: 'c', label: "Closure of the aortic valve creating a small pressure wave", correct: true },
      { id: 'd', label: "Blood entering the coronary arteries" }
    ],
    explanation: "The dicrotic notch is a small water hammer effect. When the aortic valve closes, the backflow of blood against the closed valve creates a brief pressure increase - essentially a mini water hammer in your cardiovascular system."
  },
  {
    scenario: "A submarine engineer is analyzing the risk of water hammer in the ballast system during emergency surfacing, when large valves must operate quickly.",
    question: "Which combination of factors would create the MOST severe water hammer?",
    options: [
      { id: 'a', label: "High flow velocity + instant valve closure + rigid pipes", correct: true },
      { id: 'b', label: "Low flow velocity + slow valve closure + flexible pipes" },
      { id: 'c', label: "High flow velocity + slow valve closure + rigid pipes" },
      { id: 'd', label: "Low flow velocity + instant valve closure + flexible pipes" }
    ],
    explanation: "Water hammer severity increases with: higher velocity (more kinetic energy), faster valve closure (less time for pressure dissipation), and rigid pipes (no flexibility to absorb shock). Flexible pipes, slow closure, and lower velocities all reduce hammer."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏠',
    title: 'Home Plumbing Systems',
    short: 'Protecting pipes from burst damage',
    tagline: 'Why pipes bang when you turn off faucets',
    description: 'Water hammer causes the loud banging sound in home plumbing when valves close quickly. The sudden pressure surge can exceed 10x normal operating pressure, damaging pipes, joints, and fixtures over time.',
    connection: 'When flowing water is suddenly stopped by closing a valve, the momentum of the water converts to a pressure wave that travels through the pipes at the speed of sound in water (~1400 m/s). This is the Joukowsky equation in action.',
    howItWorks: 'Air chambers or water hammer arrestors provide a cushion for the pressure wave. When the valve closes, the pressure wave compresses air in the chamber instead of slamming against the closed valve, gradually dissipating the energy.',
    stats: [
      { value: '500psi', label: 'Peak pressure possible', icon: '💥' },
      { value: '$3,000', label: 'Avg. pipe repair cost', icon: '💰' },
      { value: '1,400m/s', label: 'Wave speed in water', icon: '⚡' }
    ],
    examples: ['Washing machine fill valves', 'Dishwasher solenoids', 'Toilet fill valves', 'Quick-close faucets'],
    companies: ['Watts', 'Sioux Chief', 'Oatey', 'SharkBite'],
    futureImpact: 'Smart home water systems now include hammer prevention with gradual valve closure and real-time pressure monitoring.',
    color: '#0EA5E9'
  },
  {
    icon: '🏗️',
    title: 'Hydroelectric Power Plants',
    short: 'Managing turbine water flow',
    tagline: 'Harnessing water power safely',
    description: 'Hydroelectric plants must carefully control water flow to turbines. Sudden load changes or emergency shutdowns can create massive water hammer pressures in penstocks, requiring surge tanks and slow-closing valves to prevent catastrophic pipe failure.',
    connection: 'The enormous volume and velocity of water in hydroelectric penstocks means water hammer forces can be millions of pounds. The Joukowsky equation scales with velocity change and fluid density, making design critical.',
    howItWorks: 'Surge tanks act as pressure relief, allowing water to rise during pressure spikes. Wicket gates close gradually over 10-30 seconds, and bypass valves divert flow during emergencies to prevent dangerous pressure buildup.',
    stats: [
      { value: '4,200GW', label: 'Global hydro capacity', icon: '⚡' },
      { value: '60sec', label: 'Typical valve close time', icon: '⏱️' },
      { value: '$50M+', label: 'Penstock replacement', icon: '💰' }
    ],
    examples: ['Hoover Dam operations', 'Three Gorges powerhouse', 'Run-of-river plants', 'Pumped storage facilities'],
    companies: ['Voith Hydro', 'GE Renewable Energy', 'Andritz', 'Siemens Energy'],
    futureImpact: 'AI-controlled valve systems optimize closure profiles in real-time based on flow conditions, reducing stress while maintaining grid stability.',
    color: '#059669'
  },
  {
    icon: '🚢',
    title: 'Ship Ballast Systems',
    short: 'Stabilizing ocean vessels',
    tagline: 'Keeping ships balanced at sea',
    description: 'Large ships use ballast water systems to maintain stability. Rapid valve operations during ballast transfer can create water hammer that damages piping and pumps, requiring careful operational procedures and protective equipment.',
    connection: 'Ship ballast systems involve long pipe runs and large flow rates. The combination creates high potential for water hammer during valve operations, especially in emergency scenarios.',
    howItWorks: 'Marine ballast systems use slow-acting butterfly valves, anti-surge tanks, and computerized sequencing to gradually change flow rates. Pressure relief valves protect against unexpected hammer events.',
    stats: [
      { value: '90%', label: 'Of trade by sea', icon: '🌊' },
      { value: '20M', label: 'Tons ballast/day moved', icon: '📦' },
      { value: '$100K', label: 'Pump repair cost', icon: '💰' }
    ],
    examples: ['Container ship ballasting', 'Oil tanker operations', 'Cruise ship stability', 'Offshore platform supply'],
    companies: ['Alfa Laval', 'Wartsila', 'DESMI', 'Optimarin'],
    futureImpact: 'Automated ballast systems with predictive algorithms adjust for sea conditions, minimizing water hammer while optimizing vessel stability.',
    color: '#0284C7'
  },
  {
    icon: '🏥',
    title: 'Medical Fluid Systems',
    short: 'Protecting critical healthcare equipment',
    tagline: 'Precision flow for patient safety',
    description: 'Hospital water and medical gas systems require water hammer prevention to protect sensitive equipment and maintain sterile conditions. Dialysis machines, autoclaves, and surgical suites depend on stable fluid delivery.',
    connection: 'Medical facilities have complex piping with many quick-acting solenoid valves. Each valve closure creates potential water hammer that can damage equipment or cause contamination from loose particles.',
    howItWorks: 'Medical-grade hammer arrestors, pressure regulators, and electronic valve controllers ensure smooth pressure transitions. Systems use smaller pipe diameters and lower velocities to reduce hammer potential.',
    stats: [
      { value: '6,000', label: 'US hospitals', icon: '🏥' },
      { value: '99.99%', label: 'Required uptime', icon: '✓' },
      { value: '$1M+', label: 'Dialysis machine cost', icon: '💰' }
    ],
    examples: ['Dialysis water treatment', 'Autoclave steam systems', 'Surgical suite supply', 'Laboratory pure water'],
    companies: ['Mar Cor Purification', 'Watts Healthcare', 'Pentair', 'Evoqua'],
    futureImpact: 'IoT-connected medical water systems provide real-time monitoring of pressure events, enabling predictive maintenance before equipment damage occurs.',
    color: '#DC2626'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const WaterHammerRenderer: React.FC<WaterHammerRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [valveOpen, setValveOpen] = useState(true);
  const [flowVelocity, setFlowVelocity] = useState(3); // m/s
  const [pipeLength, setPipeLength] = useState(100); // meters
  const [pressureWave, setPressureWave] = useState<number[]>([]);
  const [wavePosition, setWavePosition] = useState(0);
  const [maxPressure, setMaxPressure] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [hasClosedValve, setHasClosedValve] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Twist phase - compare fast vs slow valve closure
  const [closureTime, setClosureTime] = useState(0.01); // seconds
  const [twistAnimating, setTwistAnimating] = useState(false);
  const [twistPressureHistory, setTwistPressureHistory] = useState<number[]>([]);
  const [showTwistResult, setShowTwistResult] = useState(false);

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

  // Constants for water
  const waterDensity = 1000; // kg/m³
  const soundSpeed = 1400; // m/s in water

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Joukowsky equation: ΔP = ρ × c × Δv
  const calculatePressureRise = (velocity: number) => {
    return waterDensity * soundSpeed * velocity; // Pascals
  };

  // Convert to bars (1 bar = 100,000 Pa)
  const pressureInBars = (pa: number) => pa / 100000;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#0EA5E9', // Blue for water
    accentGlow: 'rgba(14, 165, 233, 0.3)',
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
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Slow Closure',
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
        gameType: 'water-hammer',
        gameTitle: 'Water Hammer',
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

  // Simulate valve closure
  const closeValve = () => {
    if (animating) return;
    setAnimating(true);
    setValveOpen(false);
    setHasClosedValve(true);

    const peakPressure = calculatePressureRise(flowVelocity);
    setMaxPressure(peakPressure);

    // Generate pressure wave
    const steps = 60;
    const wave: number[] = [];

    // Pressure rises sharply, then oscillates and decays
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const damping = Math.exp(-t * 3);
      const oscillation = Math.cos(t * Math.PI * 6);
      wave.push(peakPressure * damping * oscillation);
    }

    setPressureWave(wave);
    playSound('click');

    // Animate wave position
    let pos = 0;
    const interval = setInterval(() => {
      pos += 2;
      setWavePosition(pos);

      if (pos >= 100) {
        clearInterval(interval);
        setAnimating(false);
      }
    }, 50);
  };

  const resetSimulation = () => {
    setValveOpen(true);
    setPressureWave([]);
    setWavePosition(0);
    setMaxPressure(0);
    setAnimating(false);
    setHasClosedValve(false);
    setShowResult(false);
  };

  // Twist simulation - slow closure
  const simulateSlowClosure = () => {
    if (twistAnimating) return;
    setTwistAnimating(true);
    setTwistPressureHistory([]);

    const steps = 100;
    const history: number[] = [];

    // Critical time = 2L/c (time for wave to travel pipe and back)
    const criticalTime = (2 * pipeLength) / soundSpeed;

    // If closure time > critical time, pressure is reduced
    const effectiveVelocityChange = closureTime < criticalTime
      ? flowVelocity
      : flowVelocity * (criticalTime / closureTime);

    const peakPressure = calculatePressureRise(effectiveVelocityChange);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const riseTime = Math.min(closureTime / criticalTime, 1);

      if (t < riseTime) {
        history.push(peakPressure * (t / riseTime));
      } else {
        const decay = Math.exp(-(t - riseTime) * 5);
        const oscillation = Math.cos((t - riseTime) * Math.PI * 8) * 0.3 + 0.7;
        history.push(peakPressure * decay * oscillation);
      }
    }

    let i = 0;
    const interval = setInterval(() => {
      setTwistPressureHistory(history.slice(0, i));
      i += 2;
      if (i > steps) {
        clearInterval(interval);
        setTwistAnimating(false);
      }
    }, 30);
  };

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
    background: `linear-gradient(135deg, ${colors.accent}, #0284C7)`,
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
          💧🔧
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Water Hammer
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Have you ever heard pipes <span style={{ color: colors.error }}>BANG</span> when someone quickly turns off a faucet? That's <span style={{ color: colors.accent }}>water hammer</span> - and it can generate pressures exceeding <span style={{ color: colors.warning }}>40 bar</span>!
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
            "When flowing water is suddenly stopped, all that momentum has to go somewhere. The kinetic energy transforms into a pressure wave that can burst pipes, damage equipment, and even cause catastrophic failures in industrial systems."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Fluid Dynamics Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Investigate the Pressure Wave
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Pressure drops as water slows down' },
      { id: 'b', text: 'Pressure stays the same' },
      { id: 'c', text: 'Pressure rises dramatically (water hammer)', correct: true },
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
            Water is flowing through a pipe at 3 m/s. If you INSTANTLY close a valve, what happens to the pressure at the valve?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: '400px' }}>
              {/* Pipe */}
              <rect x="40" y="40" width="260" height="40" rx="4" fill="#475569" />
              <rect x="45" y="45" width="250" height="30" fill="#3b82f6" opacity="0.6" />

              {/* Flow arrows */}
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  <path d={`M${70 + i * 60},60 L${100 + i * 60},60`} stroke="#bfdbfe" strokeWidth="2" />
                  <path d={`M${95 + i * 60},55 L${100 + i * 60},60 L${95 + i * 60},65`} fill="none" stroke="#bfdbfe" strokeWidth="2" />
                </g>
              ))}

              {/* Valve */}
              <rect x="300" y="30" width="30" height="60" rx="3" fill="#ef4444" />
              <text x="315" y="65" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">?</text>

              {/* Labels */}
              <text x="150" y="100" textAnchor="middle" fill="#94a3b8" fontSize="12">Water flowing at 3 m/s</text>
              <text x="315" y="105" textAnchor="middle" fill="#f87171" fontSize="10">Valve closes instantly!</text>
            </svg>
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Water Hammer Simulator
  if (phase === 'play') {
    const currentPressure = pressureWave.length > 0
      ? pressureWave[Math.min(Math.floor(wavePosition / 100 * pressureWave.length), pressureWave.length - 1)]
      : 0;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Water Hammer Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Close the valve to see what happens to the pressure!
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg viewBox="0 0 500 280" style={{ width: '100%', marginBottom: '20px' }}>
              {/* Background */}
              <rect width="500" height="280" fill="#0a1628" rx="8" />

              {/* Title and readings */}
              <text x="250" y="25" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="600">
                Flow velocity: {flowVelocity} m/s | Pipe length: {pipeLength}m
              </text>
              {maxPressure > 0 && (
                <text x="250" y="45" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="bold">
                  Peak pressure: {pressureInBars(maxPressure).toFixed(1)} bar!
                </text>
              )}

              {/* Pipe */}
              <rect x="30" y="80" width="350" height="60" rx="6" fill="#64748b" />
              <rect x="38" y="88" width="334" height="44" fill="#1e293b" />
              <rect x="42" y="92" width="326" height="36" fill={!valveOpen && wavePosition > 0 ? "#ef4444" : "#3b82f6"} opacity="0.7" />

              {/* Pressure wave visualization */}
              {!valveOpen && wavePosition > 0 && (
                <ellipse
                  cx={365 - wavePosition * 3}
                  cy="110"
                  rx="15"
                  ry="25"
                  fill="#fbbf24"
                  opacity={0.8 - wavePosition / 150}
                />
              )}

              {/* Water particles when valve is open */}
              {valveOpen && [0, 1, 2, 3, 4].map(i => (
                <circle key={i} cx={60 + i * 60} cy="110" r="8" fill="#60a5fa" opacity="0.8">
                  <animate attributeName="cx" values={`${60 + i * 60};${120 + i * 60}`} dur="0.5s" repeatCount="indefinite" />
                </circle>
              ))}

              {/* Valve */}
              <rect
                x="380"
                y={valveOpen ? 60 : 85}
                width="35"
                height={valveOpen ? 100 : 50}
                rx="4"
                fill={valveOpen ? "#22c55e" : "#ef4444"}
                style={{ transition: 'all 0.15s' }}
              />
              <text x="397" y="195" textAnchor="middle" fill={valveOpen ? '#4ade80' : '#f87171'} fontSize="11" fontWeight="bold">
                {valveOpen ? 'OPEN' : 'CLOSED'}
              </text>

              {/* Pressure gauge */}
              <g transform="translate(100, 210)">
                <circle cx="0" cy="0" r="45" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                {/* Gauge markings */}
                {[0, 1, 2, 3, 4].map(i => {
                  const angle = -135 + i * 67.5;
                  const rad = angle * Math.PI / 180;
                  return (
                    <g key={i}>
                      <line x1={Math.cos(rad) * 32} y1={Math.sin(rad) * 32} x2={Math.cos(rad) * 40} y2={Math.sin(rad) * 40} stroke="#f8fafc" strokeWidth="2" />
                      <text x={Math.cos(rad) * 24} y={Math.sin(rad) * 24 + 4} fill="#f8fafc" fontSize="9" textAnchor="middle">{i * 12}</text>
                    </g>
                  );
                })}
                {/* Needle */}
                {(() => {
                  const pressureBars = Math.abs(pressureInBars(currentPressure));
                  const needleAngle = -135 + Math.min(pressureBars, 48) * 5.625;
                  const needleRad = needleAngle * Math.PI / 180;
                  return (
                    <line x1={-Math.cos(needleRad) * 8} y1={-Math.sin(needleRad) * 8} x2={Math.cos(needleRad) * 30} y2={Math.sin(needleRad) * 30} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" style={{ transition: 'all 0.1s' }} />
                  );
                })()}
                <circle cx="0" cy="0" r="6" fill="#ef4444" />
                <text x="0" y="55" textAnchor="middle" fill="#94a3b8" fontSize="9">PRESSURE (bar)</text>
              </g>

              {/* Pressure bar */}
              <g transform="translate(250, 230)">
                <rect x="-100" y="0" width="200" height="16" rx="8" fill="#1e293b" stroke="#334155" />
                <rect x="-98" y="2" width={Math.min(Math.abs(pressureInBars(currentPressure)) * 4, 196)} height="12" rx="6" fill={Math.abs(pressureInBars(currentPressure)) > 30 ? "#ef4444" : Math.abs(pressureInBars(currentPressure)) > 15 ? "#f59e0b" : "#22c55e"} style={{ transition: 'all 0.1s' }} />
                <text x="0" y="32" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
                  {Math.abs(pressureInBars(currentPressure)).toFixed(1)} bar
                </text>
              </g>
            </svg>

            {/* Velocity slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Flow Velocity</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowVelocity} m/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={flowVelocity}
                onChange={(e) => {
                  setFlowVelocity(parseFloat(e.target.value));
                  if (!valveOpen) resetSimulation();
                }}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              {valveOpen ? (
                <button
                  onClick={closeValve}
                  disabled={animating}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: animating ? colors.border : `linear-gradient(135deg, ${colors.error}, #b91c1c)`,
                    color: 'white',
                    fontWeight: 700,
                    cursor: animating ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                  }}
                >
                  CLOSE VALVE INSTANTLY
                </button>
              ) : (
                <button
                  onClick={resetSimulation}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  Reset & Try Again
                </button>
              )}
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{flowVelocity} m/s</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Flow Velocity</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{pressureInBars(calculatePressureRise(flowVelocity)).toFixed(1)} bar</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Expected Peak</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>{pressureInBars(maxPressure).toFixed(1)} bar</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Measured Peak</div>
              </div>
            </div>
          </div>

          {/* Result reveal */}
          {hasClosedValve && !animating && !showResult && (
            <button
              onClick={() => setShowResult(true)}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Results
            </button>
          )}

          {showResult && (
            <div style={{
              background: prediction === 'c' ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${prediction === 'c' ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.h3, color: prediction === 'c' ? colors.success : colors.warning, marginBottom: '12px' }}>
                {prediction === 'c' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                Pressure rises <strong style={{ color: colors.error }}>dramatically</strong>! At {flowVelocity} m/s, the pressure spike is{' '}
                <strong>{pressureInBars(calculatePressureRise(flowVelocity)).toFixed(1)} bar</strong>.
                The water's momentum converts instantly to pressure!
              </p>
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Learn the Physics
              </button>
            </div>
          )}
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
            The Physics of Water Hammer
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              The Joukowsky Equation
            </h3>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: colors.textPrimary }}>
                ΔP = ρ × c × Δv
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Pressure rise = Density × Sound speed × Velocity change
              </p>
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>For water:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
                <li><span style={{ color: colors.accent }}>ρ</span> (density) = 1000 kg/m³</li>
                <li><span style={{ color: colors.accent }}>c</span> (sound speed) ≈ 1400 m/s</li>
                <li>So: ΔP = <span style={{ color: colors.warning }}>1,400,000 × Δv</span> (Pascals)</li>
              </ul>
            </div>
          </div>

          <div style={{
            background: `${colors.error}22`,
            border: `1px solid ${colors.error}44`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
              Example Calculation
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Water at <strong>3 m/s</strong> suddenly stopped:<br/>
              ΔP = 1000 × 1400 × 3 = <strong style={{ color: colors.error }}>4,200,000 Pa = 42 bar!</strong>
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              The pressure wave travels at the <strong>speed of sound in water</strong> (~1400 m/s),
              not the flow speed. This is why the pressure spike happens almost instantly throughout
              the entire pipe system!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Solution
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Same pressure regardless of closure speed' },
      { id: 'b', text: 'Slow closure causes HIGHER pressure (more time to build)' },
      { id: 'c', text: 'Slow closure REDUCES peak pressure', correct: true },
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
              New Variable: Valve Closure Speed
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if instead of closing instantly, you close the valve SLOWLY?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}>
              {/* Fast closure */}
              <g transform="translate(0, 0)">
                <rect x="20" y="25" width="150" height="35" fill="#475569" rx="3" />
                <rect x="25" y="30" width="120" height="25" fill="#3b82f6" opacity="0.5" />
                <rect x="145" y="20" width="20" height="45" fill="#ef4444" rx="2" />
                <text x="95" y="80" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Instant Close</text>
                <text x="95" y="95" textAnchor="middle" fill="#f87171" fontSize="10">t = 10 ms</text>
              </g>

              {/* Slow closure */}
              <g transform="translate(200, 0)">
                <rect x="20" y="25" width="150" height="35" fill="#475569" rx="3" />
                <rect x="25" y="30" width="120" height="25" fill="#3b82f6" opacity="0.5" />
                <rect x="145" y="30" width="20" height="25" fill="#22c55e" rx="2" />
                <text x="95" y="80" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Slow Close</text>
                <text x="95" y="95" textAnchor="middle" fill="#4ade80" fontSize="10">t = 500 ms</text>
              </g>
            </svg>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginTop: '16px' }}>
              <strong>Critical time</strong> = 2L/c (time for wave to travel pipe length and back)
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Compare Them
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const criticalTime = (2 * pipeLength) / soundSpeed;
    const effectiveVelocity = closureTime < criticalTime
      ? flowVelocity
      : flowVelocity * (criticalTime / closureTime);
    const peakPressure = pressureInBars(calculatePressureRise(effectiveVelocity));

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Closure Speed Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust closure time and see how it affects peak pressure
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Pressure graph */}
            <svg viewBox="0 0 400 180" style={{ width: '100%', marginBottom: '20px' }}>
              <rect x="50" y="20" width="330" height="130" fill="#1e293b" stroke="#334155" />

              {/* Grid lines */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={i}>
                  <line x1="50" y1={20 + i * 26} x2="380" y2={20 + i * 26} stroke="#334155" />
                  <text x="45" y={25 + i * 26} textAnchor="end" fill="#64748b" fontSize="9">{50 - i * 10}</text>
                </g>
              ))}

              {/* Critical time marker */}
              <line
                x1={50 + Math.min((criticalTime / 0.3) * 330, 330)}
                y1="20"
                x2={50 + Math.min((criticalTime / 0.3) * 330, 330)}
                y2="150"
                stroke={colors.accent}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x={50 + Math.min((criticalTime / 0.3) * 330, 330)}
                y="165"
                textAnchor="middle"
                fill={colors.accent}
                fontSize="9"
              >
                Tc = {(criticalTime * 1000).toFixed(0)}ms
              </text>

              {/* Pressure curve */}
              {twistPressureHistory.length > 0 && (
                <path
                  d={`M 50,150 ${twistPressureHistory.map((p, i) =>
                    `L ${50 + i * 3.3},${150 - (pressureInBars(Math.abs(p)) / 50) * 130}`
                  ).join(' ')}`}
                  fill="none"
                  stroke={colors.error}
                  strokeWidth="3"
                />
              )}

              <text x="215" y="175" textAnchor="middle" fill="#64748b" fontSize="10">Time</text>
            </svg>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Critical Time</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{(criticalTime * 1000).toFixed(0)} ms</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Closure Time</div>
                <div style={{ ...typo.h3, color: colors.warning }}>{(closureTime * 1000).toFixed(0)} ms</div>
              </div>
              <div style={{
                background: closureTime > criticalTime ? `${colors.success}22` : `${colors.error}22`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Peak Pressure</div>
                <div style={{ ...typo.h3, color: closureTime > criticalTime ? colors.success : colors.error }}>
                  {peakPressure.toFixed(1)} bar
                </div>
              </div>
            </div>

            {/* Closure time slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Valve Closure Time</span>
                <span style={{ ...typo.small, color: closureTime < criticalTime ? colors.error : colors.success, fontWeight: 600 }}>
                  {(closureTime * 1000).toFixed(0)} ms {closureTime < criticalTime ? '(FAST - danger!)' : '(SLOW - safe)'}
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={closureTime}
                onChange={(e) => setClosureTime(parseFloat(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={simulateSlowClosure}
                disabled={twistAnimating}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: twistAnimating ? colors.border : `linear-gradient(135deg, ${colors.warning}, #d97706)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: twistAnimating ? 'not-allowed' : 'pointer',
                }}
              >
                {twistAnimating ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {/* Result reveal */}
          {twistPressureHistory.length > 0 && !twistAnimating && !showTwistResult && (
            <button
              onClick={() => setShowTwistResult(true)}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Results
            </button>
          )}

          {showTwistResult && (
            <div style={{
              background: twistPrediction === 'c' ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${twistPrediction === 'c' ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.h3, color: twistPrediction === 'c' ? colors.success : colors.warning, marginBottom: '12px' }}>
                {twistPrediction === 'c' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                Slow closure <strong style={{ color: colors.success }}>reduces</strong> peak pressure! When closure time exceeds the
                critical time (2L/c), the reflected pressure wave has time to dissipate before
                more pressure builds up.
              </p>
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Understand Why
              </button>
            </div>
          )}
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
            Critical Time: The Key to Safety
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
              The Critical Time Formula
            </h3>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: colors.textPrimary }}>
                Tc = 2L / c
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Critical time = 2 × Pipe length / Sound speed
              </p>
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>What happens:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
                <li><span style={{ color: colors.error }}>Fast closure (t &lt; Tc):</span> Full pressure spike</li>
                <li><span style={{ color: colors.success }}>Slow closure (t &gt; Tc):</span> Reduced pressure</li>
                <li>Pressure ∝ Tc / t (when t &gt; Tc)</li>
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
              Example
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              100m pipe, c = 1400 m/s<br/>
              Tc = 2 × 100 / 1400 = <strong>143 ms</strong><br/>
              Close over 286 ms → pressure <strong style={{ color: colors.success }}>halved</strong>!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { icon: '🔧', title: 'Slow-closing valves', desc: 'Motorized, timed closure' },
              { icon: '🏗️', title: 'Surge tanks', desc: 'Air cushion absorbs shock' },
              { icon: '💨', title: 'Hammer arrestors', desc: 'Sealed air chambers' },
              { icon: '🔒', title: 'Check valves', desc: 'Prevent backflow surges' },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <span style={{ fontSize: '32px' }}>{item.icon}</span>
                <div>
                  <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                </div>
              </div>
            ))}
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
                How Water Hammer Connects:
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
              Take the Knowledge Test
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
                ? 'You understand water hammer and pressure wave physics!'
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
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Water Hammer Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why pipes bang and how engineers prevent catastrophic pressure failures in fluid systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'ΔP = ρcΔv (Joukowsky equation)',
              'Pressure wave travels at sound speed (~1400 m/s)',
              'Critical time Tc = 2L/c determines safe closure',
              'Slow valve closure reduces peak pressure',
              'Hammer arrestors absorb pressure spikes',
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
            onClick={() => {
              // Reset all state
              setPrediction(null);
              setTwistPrediction(null);
              setShowResult(false);
              setShowTwistResult(false);
              setTestAnswers(Array(10).fill(null));
              setTestSubmitted(false);
              setTestScore(0);
              setCurrentQuestion(0);
              setCompletedApps([false, false, false, false]);
              resetSimulation();
              setTwistPressureHistory([]);
              goToPhase('hook');
            }}
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

export default WaterHammerRenderer;
