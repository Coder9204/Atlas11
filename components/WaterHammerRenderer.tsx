import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// WaterHammerRenderer – Teach pressure surge when flow suddenly stops
// ─────────────────────────────────────────────────────────────
// Physics: ΔP = ρ × c × Δv (Joukowsky equation)
// Water hammer occurs when fluid momentum is suddenly arrested
// Pressure wave travels at speed of sound in fluid (~1400 m/s for water)

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
    companies: ['Voith Hydro', 'GE Renewable Energy', 'Andritz', 'ANDRITZ'],
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

interface WaterHammerRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function WaterHammerRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: WaterHammerRendererProps) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [valveOpen, setValveOpen] = useState(true);
  const [flowVelocity, setFlowVelocity] = useState(3); // m/s
  const [pipeLength, setPipeLength] = useState(100); // meters
  const [pressureWave, setPressureWave] = useState<number[]>([]);
  const [wavePosition, setWavePosition] = useState(0);
  const [maxPressure, setMaxPressure] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [hasClosedValve, setHasClosedValve] = useState(false);

  // Twist: compare fast vs slow valve closure
  const [closureTime, setClosureTime] = useState(0.01); // seconds
  const [twistAnimating, setTwistAnimating] = useState(false);
  const [twistPressureHistory, setTwistPressureHistory] = useState<number[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    onPhaseComplete?.();
    playSound(440, 0.15, 'sine', 0.2);
  };

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  // Constants for water
  const waterDensity = 1000; // kg/m³
  const soundSpeed = 1400; // m/s in water

  // Joukowsky equation: ΔP = ρ × c × Δv
  const calculatePressureRise = (velocity: number) => {
    return waterDensity * soundSpeed * velocity; // Pascals
  };

  // Convert to bars (1 bar = 100,000 Pa)
  const pressureInBars = (pa: number) => pa / 100000;

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

    // Sound effect - loud bang!
    playSound('click');
    setTimeout(() => playSound('click'), 100);
  };

  const resetSimulation = () => {
    setValveOpen(true);
    setPressureWave([]);
    setWavePosition(0);
    setMaxPressure(0);
    setAnimating(false);
    setHasClosedValve(false);
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

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playSound(523, 0.3, 'sine', 0.3);
    } else {
      onIncorrectAnswer?.();
      playSound(330, 0.3, 'sine', 0.3);
    }
  };

  const testQuestions = [
    {
      question: "What is water hammer?",
      options: [
        { text: "A tool for plumbing", correct: false },
        { text: "A pressure surge when flow suddenly stops", correct: true },
        { text: "Water freezing in pipes", correct: false },
        { text: "A type of water pump", correct: false }
      ],
    },
    {
      question: "What causes the loud bang in pipes when you quickly close a faucet?",
      options: [
        { text: "Air bubbles collapsing", correct: false },
        { text: "Pipe expansion", correct: false },
        { text: "Kinetic energy converting to pressure energy", correct: true },
        { text: "Vibrating water molecules", correct: false }
      ],
    },
    {
      question: "According to the Joukowsky equation, what happens if you double the water velocity?",
      options: [
        { text: "Pressure rise halves", correct: false },
        { text: "Pressure rise doubles", correct: true },
        { text: "Pressure rise quadruples", correct: false },
        { text: "No change in pressure", correct: false }
      ],
    },
    {
      question: "At what speed does the pressure wave travel in water pipes?",
      options: [
        { text: "Speed of the water flow", correct: false },
        { text: "Speed of sound in water (~1400 m/s)", correct: true },
        { text: "Speed of light", correct: false },
        { text: "Much slower than water flow", correct: false }
      ],
    },
    {
      question: "What is the critical time (Tc) in water hammer analysis?",
      options: [
        { text: "Time before pipe bursts", correct: false },
        { text: "Time for wave to travel pipe length and back", correct: true },
        { text: "Time to close the valve", correct: false },
        { text: "Time for water to stop flowing", correct: false }
      ],
    },
    {
      question: "How can water hammer damage be reduced?",
      options: [
        { text: "Using smaller pipes", correct: false },
        { text: "Increasing water pressure", correct: false },
        { text: "Closing valves slowly", correct: true },
        { text: "Using hotter water", correct: false }
      ],
    },
    {
      question: "What is a water hammer arrestor?",
      options: [
        { text: "A device that stops water flow", correct: false },
        { text: "A cushioning device with air or gas", correct: true },
        { text: "A type of water filter", correct: false },
        { text: "A pipe insulation", correct: false }
      ],
    },
    {
      question: "Why is water hammer worse in long pipes?",
      options: [
        { text: "More water means more momentum", correct: true },
        { text: "Pipes are weaker when longer", correct: false },
        { text: "Sound travels slower in long pipes", correct: false },
        { text: "Long pipes have more friction", correct: false }
      ],
    },
    {
      question: "In the Joukowsky equation ΔP = ρcΔv, what does 'c' represent?",
      options: [
        { text: "Water temperature", correct: false },
        { text: "Pipe circumference", correct: false },
        { text: "Speed of sound in fluid", correct: true },
        { text: "Closure time", correct: false }
      ],
    },
    {
      question: "What pressure rise occurs when water flowing at 3 m/s suddenly stops? (ρ=1000 kg/m³, c=1400 m/s)",
      options: [
        { text: "4,200 Pa", correct: false },
        { text: "42,000 Pa", correct: false },
        { text: "420,000 Pa", correct: false },
        { text: "4,200,000 Pa", correct: true }
      ],
    }
  ];

  const applications = [
    {
      title: "Household Plumbing",
      description: "Banging pipes when faucets close quickly",
      detail: "The annoying banging in home pipes is water hammer. Hammer arrestors are installed near washing machines and dishwashers to absorb shocks.",
      icon: "🚰"
    },
    {
      title: "Hydroelectric Dams",
      description: "Emergency valve closure protection",
      detail: "Surge tanks and slow-closing valves protect turbines. The Hoover Dam uses massive surge chambers to handle 500+ m³/s flow changes.",
      icon: "🏭"
    },
    {
      title: "Heart & Blood Vessels",
      description: "Aortic valve closure creates pulse",
      detail: "The 'lub-dub' heartbeat partially comes from valve closure. The dicrotic notch in pulse waves is a mini water hammer from aortic valve closing.",
      icon: "❤️"
    },
    {
      title: "Oil & Gas Pipelines",
      description: "Pump shutdown protection",
      detail: "Thousand-kilometer pipelines need careful transient analysis. The Alaska Pipeline uses multiple surge control systems to prevent catastrophic pressure waves.",
      icon: "⛽"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK - Premium Design
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
              The Pipe Destroyer
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Have you heard pipes BANG when someone quickly shuts off a faucet?
            </p>

            {/* Premium card with graphic */}
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

              <div className="relative">
                <svg viewBox="0 0 420 220" style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'block' }}>
                  {/* Premium defs for hook visualization */}
                  <defs>
                    {/* Metallic pipe gradient */}
                    <linearGradient id="whamHookPipe" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#64748b" />
                      <stop offset="20%" stopColor="#94a3b8" />
                      <stop offset="40%" stopColor="#475569" />
                      <stop offset="60%" stopColor="#334155" />
                      <stop offset="80%" stopColor="#475569" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    {/* Pipe inner darkness */}
                    <linearGradient id="whamHookPipeInner" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="50%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    {/* Water gradient */}
                    <linearGradient id="whamHookWater" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    {/* Valve closed gradient */}
                    <linearGradient id="whamHookValve" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                    {/* Shock wave radial */}
                    <radialGradient id="whamHookShock" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
                      <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                    {/* Water particle glow */}
                    <radialGradient id="whamHookParticle" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                      <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    {/* Glow filter */}
                    <filter id="whamHookGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                      <feFlood floodColor="#ef4444" floodOpacity="0.6" result="color" />
                      <feComposite in="color" in2="blur" operator="in" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Particle glow filter */}
                    <filter id="whamHookParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                      <feFlood floodColor="#60a5fa" floodOpacity="0.5" result="color" />
                      <feComposite in="color" in2="blur" operator="in" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background */}
                  <rect width="420" height="220" fill="#0a1628" rx="8" />

                  {/* Pipe outer shell */}
                  <rect x="40" y="70" width="300" height="70" rx="6" fill="url(#whamHookPipe)" stroke="#475569" strokeWidth="2" />
                  {/* Pipe inner */}
                  <rect x="48" y="78" width="284" height="54" rx="3" fill="url(#whamHookPipeInner)" />
                  {/* Water */}
                  <rect x="52" y="82" width="276" height="46" rx="2" fill="url(#whamHookWater)" opacity="0.8" />

                  {/* Animated water particles */}
                  <g>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <circle key={i} cx={70 + i * 45} cy="105" r="9" fill="url(#whamHookParticle)" filter="url(#whamHookParticleGlow)">
                        <animate attributeName="cx" values={`${70 + i * 45};${115 + i * 45}`} dur="0.5s" repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>

                  {/* Valve body */}
                  <rect x="340" y="55" width="30" height="100" rx="4" fill="url(#whamHookValve)" stroke="#b91c1c" strokeWidth="2" />
                  {/* Valve handle */}
                  <rect x="335" y="42" width="40" height="18" rx="3" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
                  <rect x="350" y="28" width="10" height="16" rx="2" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
                  <ellipse cx="355" cy="22" rx="12" ry="5" fill="#9ca3af" />

                  {/* Shock wave effect at valve */}
                  <ellipse cx="340" cy="105" rx="15" ry="25" fill="url(#whamHookShock)" filter="url(#whamHookGlow)">
                    <animate attributeName="rx" values="10;20;10" dur="0.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.4s" repeatCount="indefinite" />
                  </ellipse>

                  {/* BANG text with glow */}
                  <text x="210" y="185" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="bold" filter="url(#whamHookGlow)">
                    BANG!
                  </text>
                  <text x="210" y="205" textAnchor="middle" fill="#94a3b8" fontSize="11">
                    Pressure wave traveling at 1400 m/s
                  </text>
                </svg>

                <div className="mt-6 space-y-4">
                  <p className="text-xl text-white/90 font-medium leading-relaxed">
                    This &quot;water hammer&quot; can generate pressures over 40 bar!
                  </p>
                  <div className="pt-2">
                    <p className="text-base text-blue-400 font-semibold">
                      Enough to burst pipes and damage equipment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium CTA button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Investigate the Pressure Wave
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Feature hints */}
            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Interactive Lab
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Real-World Examples
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Knowledge Test
              </div>
            </div>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f8fafc' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Water is flowing through a pipe at 3 m/s. If you instantly close a valve,
              what happens to the pressure at the valve?
            </p>

            <svg viewBox="0 0 420 180" style={{ width: '100%', maxWidth: 420, marginBottom: '1.5rem' }}>
              {/* Premium defs */}
              <defs>
                {/* Pipe gradient */}
                <linearGradient id="whamPredictPipe" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="20%" stopColor="#94a3b8" />
                  <stop offset="40%" stopColor="#475569" />
                  <stop offset="60%" stopColor="#334155" />
                  <stop offset="80%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id="whamPredictPipeInner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id="whamPredictWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="whamPredictValve" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <radialGradient id="whamPredictParticle" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>
                <filter id="whamPredictGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                  <feFlood floodColor="#60a5fa" floodOpacity="0.5" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="whamPredictValveGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                  <feFlood floodColor="#ef4444" floodOpacity="0.4" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect width="420" height="180" fill="#0a1628" rx="8" />

              {/* Labels */}
              <text x="210" y="25" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="600">
                Water flowing at 3 m/s
              </text>

              {/* Pipe outer shell */}
              <rect x="30" y="55" width="300" height="65" rx="6" fill="url(#whamPredictPipe)" stroke="#475569" strokeWidth="2" />
              {/* Pipe inner */}
              <rect x="38" y="63" width="284" height="49" rx="3" fill="url(#whamPredictPipeInner)" />
              {/* Water */}
              <rect x="42" y="67" width="276" height="41" rx="2" fill="url(#whamPredictWater)" opacity="0.8" />

              {/* Flow arrows with animation */}
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  <path
                    d={`M${70 + i * 60},87 L${100 + i * 60},87`}
                    fill="none"
                    stroke="#bfdbfe"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  </path>
                  <path
                    d={`M${95 + i * 60},82 L${100 + i * 60},87 L${95 + i * 60},92`}
                    fill="none"
                    stroke="#bfdbfe"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  </path>
                </g>
              ))}

              {/* Animated particles */}
              {[0, 1, 2, 3, 4].map(i => (
                <circle key={i} cx={60 + i * 50} cy="87" r="6" fill="url(#whamPredictParticle)" filter="url(#whamPredictGlow)">
                  <animate attributeName="cx" values={`${60 + i * 50};${110 + i * 50}`} dur="0.6s" repeatCount="indefinite" />
                </circle>
              ))}

              {/* Valve with glow */}
              <g filter="url(#whamPredictValveGlow)">
                <rect x="330" y="45" width="35" height="85" rx="4" fill="url(#whamPredictValve)" stroke="#b91c1c" strokeWidth="2" />
                {/* Valve handle */}
                <rect x="325" y="32" width="45" height="18" rx="3" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
                <rect x="342" y="18" width="11" height="16" rx="2" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
                <ellipse cx="347.5" cy="12" rx="12" ry="5" fill="#9ca3af" />
              </g>

              {/* Question mark */}
              <text x="347" y="95" textAnchor="middle" fill="#fef2f2" fontSize="24" fontWeight="bold">?</text>

              {/* Warning label */}
              <text x="210" y="155" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">
                Valve closes instantly!
              </text>
              <text x="210" y="172" textAnchor="middle" fill="#64748b" fontSize="10">
                What happens to the pressure?
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Pressure drops as water slows down' },
                { id: 'b', text: 'Pressure stays the same' },
                { id: 'c', text: 'Pressure rises dramatically' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onPointerDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#1e293b',
                    color: prediction === opt.id ? 'white' : '#f8fafc',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#334155'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    boxShadow: prediction === opt.id ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onPointerDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        const currentPressure = pressureWave.length > 0
          ? pressureWave[Math.min(Math.floor(wavePosition / 100 * pressureWave.length), pressureWave.length - 1)]
          : 0;

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
              Water Hammer Simulator
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center' }}>
              Close the valve to see what happens!
            </p>

            <svg viewBox="0 0 500 380" style={{ width: '100%', maxWidth: 550, marginBottom: '1rem' }}>
              {/* ========== COMPREHENSIVE DEFS SECTION ========== */}
              <defs>
                {/* Premium pipe outer gradient - metallic steel with depth */}
                <linearGradient id="whamPipeOuter" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="15%" stopColor="#94a3b8" />
                  <stop offset="35%" stopColor="#475569" />
                  <stop offset="65%" stopColor="#334155" />
                  <stop offset="85%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Pipe inner wall gradient - darker interior */}
                <linearGradient id="whamPipeInner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="20%" stopColor="#0f172a" />
                  <stop offset="50%" stopColor="#020617" />
                  <stop offset="80%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Water gradient - flowing blue with depth */}
                <linearGradient id="whamWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="25%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="75%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>

                {/* High pressure water gradient - red danger */}
                <linearGradient id="whamHighPressure" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="25%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#dc2626" />
                  <stop offset="75%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#fca5a5" />
                </linearGradient>

                {/* Pressure wave radial gradient - shock wave effect */}
                <radialGradient id="whamShockWave" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
                  <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                  <stop offset="75%" stopColor="#ef4444" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>

                {/* Pressure propagation gradient - traveling wave */}
                <radialGradient id="whamPressureRing" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                  <stop offset="40%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="60%" stopColor="#f87171" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#fca5a5" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#fef2f2" stopOpacity="0" />
                </radialGradient>

                {/* Valve gradient - open state (green) */}
                <linearGradient id="whamValveOpen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#86efac" />
                  <stop offset="25%" stopColor="#4ade80" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="75%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>

                {/* Valve gradient - closed state (red) */}
                <linearGradient id="whamValveClosed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="25%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="75%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* Valve handle metallic gradient */}
                <linearGradient id="whamValveHandle" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="30%" stopColor="#6b7280" />
                  <stop offset="70%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Gauge face gradient - dark instrument look */}
                <radialGradient id="whamGaugeFace" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="60%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>

                {/* Gauge bezel gradient - chrome ring */}
                <linearGradient id="whamGaugeBezel" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="25%" stopColor="#64748b" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="75%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>

                {/* Needle gradient */}
                <linearGradient id="whamNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef2f2" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* Lab background gradient */}
                <linearGradient id="whamLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0a1628" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Water particle radial glow */}
                <radialGradient id="whamWaterParticle" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </radialGradient>

                {/* Glow filter for pressure wave */}
                <filter id="whamPressureGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                  <feFlood floodColor="#ef4444" floodOpacity="0.8" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Glow filter for water particles */}
                <filter id="whamParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                  <feFlood floodColor="#60a5fa" floodOpacity="0.6" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Glow filter for valve */}
                <filter id="whamValveGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                  <feFlood floodColor={valveOpen ? "#22c55e" : "#ef4444"} floodOpacity="0.5" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Gauge needle glow */}
                <filter id="whamNeedleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                  <feFlood floodColor="#ef4444" floodOpacity="0.7" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Inner shadow for pipe */}
                <filter id="whamInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feOffset dx="0" dy="2" />
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Subtle grid pattern */}
                <pattern id="whamGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* ========== BACKGROUND ========== */}
              <rect width="500" height="380" fill="url(#whamLabBg)" />
              <rect width="500" height="380" fill="url(#whamGrid)" />

              {/* Title and readings */}
              <text x="250" y="28" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="600">
                Flow velocity: {flowVelocity} m/s | Pipe length: {pipeLength}m
              </text>
              {maxPressure > 0 && (
                <text x="250" y="48" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="bold" filter="url(#whamPressureGlow)">
                  Peak pressure: {pressureInBars(maxPressure).toFixed(1)} bar!
                </text>
              )}

              {/* ========== PREMIUM PIPE SYSTEM ========== */}
              {/* Pipe outer shell with metallic gradient */}
              <rect x="30" y="90" width="350" height="70" rx="6" fill="url(#whamPipeOuter)" stroke="#475569" strokeWidth="2" />

              {/* Pipe inner wall shadow */}
              <rect x="38" y="98" width="334" height="54" rx="3" fill="url(#whamPipeInner)" />

              {/* Water inside pipe */}
              <rect x="42" y="102" width="326" height="46" rx="2" fill={!valveOpen && wavePosition > 0 ? "url(#whamHighPressure)" : "url(#whamWater)"} opacity="0.85" />

              {/* Pipe flanges for realism */}
              <rect x="22" y="85" width="16" height="80" rx="2" fill="url(#whamPipeOuter)" stroke="#64748b" strokeWidth="1" />
              <rect x="372" y="85" width="16" height="80" rx="2" fill="url(#whamPipeOuter)" stroke="#64748b" strokeWidth="1" />

              {/* Pipe bolts */}
              {[92, 110, 130, 148].map(y => (
                <g key={y}>
                  <circle cx="30" cy={y} r="3" fill="#374151" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="380" cy={y} r="3" fill="#374151" stroke="#1e293b" strokeWidth="1" />
                </g>
              ))}

              {/* ========== PRESSURE WAVE VISUALIZATION ========== */}
              {!valveOpen && wavePosition > 0 && (
                <g>
                  {/* Animated shock wave rings */}
                  {[0, 1, 2].map(i => {
                    const ringX = 360 - wavePosition * 3.2 + i * 15;
                    return ringX > 40 && ringX < 370 ? (
                      <ellipse
                        key={i}
                        cx={ringX}
                        cy="125"
                        rx="8"
                        ry="20"
                        fill="url(#whamPressureRing)"
                        opacity={0.9 - wavePosition / 150 - i * 0.2}
                        filter="url(#whamPressureGlow)"
                      >
                        <animate attributeName="rx" values="6;12;6" dur="0.3s" repeatCount="indefinite" />
                      </ellipse>
                    ) : null;
                  })}

                  {/* Central shock wave */}
                  <ellipse
                    cx={365 - wavePosition * 3.2}
                    cy="125"
                    rx="12"
                    ry="22"
                    fill="url(#whamShockWave)"
                    opacity={0.95 - wavePosition / 120}
                    filter="url(#whamPressureGlow)"
                  />
                </g>
              )}

              {/* ========== ANIMATED WATER PARTICLES ========== */}
              {valveOpen && (
                <g>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <circle
                      key={i}
                      cx={60 + i * 50}
                      cy="125"
                      r="7"
                      fill="url(#whamWaterParticle)"
                      filter="url(#whamParticleGlow)"
                    >
                      <animate
                        attributeName="cx"
                        values={`${60 + i * 50};${110 + i * 50}`}
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0.6;1"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                  {/* Flow direction arrows */}
                  {[80, 180, 280].map(x => (
                    <path
                      key={x}
                      d={`M${x},125 L${x + 20},125 L${x + 15},120 M${x + 20},125 L${x + 15},130`}
                      fill="none"
                      stroke="#bfdbfe"
                      strokeWidth="2"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.3;0.8;0.3"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </path>
                  ))}
                </g>
              )}

              {/* ========== PREMIUM VALVE ========== */}
              <g transform="translate(388, 75)" filter="url(#whamValveGlow)">
                {/* Valve body */}
                <rect
                  x="0"
                  y={valveOpen ? -5 : 20}
                  width="35"
                  height={valveOpen ? 110 : 60}
                  rx="4"
                  fill={valveOpen ? "url(#whamValveOpen)" : "url(#whamValveClosed)"}
                  stroke={valveOpen ? "#16a34a" : "#b91c1c"}
                  strokeWidth="2"
                  style={{ transition: 'all 0.15s ease-out' }}
                />

                {/* Valve gate lines */}
                {valveOpen && [15, 35, 55, 75].map(y => (
                  <line key={y} x1="5" y1={y} x2="30" y2={y} stroke={valveOpen ? "#15803d" : "#991b1b"} strokeWidth="1" opacity="0.5" />
                ))}

                {/* Valve handle */}
                <rect x="-5" y="-20" width="45" height="20" rx="3" fill="url(#whamValveHandle)" stroke="#4b5563" strokeWidth="1" />
                <rect x="12" y="-35" width="11" height="18" rx="2" fill="url(#whamValveHandle)" stroke="#4b5563" strokeWidth="1" />

                {/* Handle grip */}
                <ellipse cx="17.5" cy="-42" rx="14" ry="6" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
                <ellipse cx="17.5" cy="-42" rx="10" ry="4" fill="#9ca3af" />
              </g>

              {/* Valve status label */}
              <text x="405" y="200" textAnchor="middle" fill={valveOpen ? '#4ade80' : '#f87171'} fontSize="11" fontWeight="bold">
                {valveOpen ? 'OPEN' : 'CLOSED'}
              </text>

              {/* ========== PREMIUM PRESSURE GAUGE ========== */}
              <g transform="translate(120, 285)">
                {/* Gauge outer bezel */}
                <circle cx="0" cy="0" r="60" fill="url(#whamGaugeBezel)" />
                <circle cx="0" cy="0" r="55" fill="url(#whamGaugeFace)" />

                {/* Gauge markings and numbers */}
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const angle = -135 + i * 54;
                  const rad = angle * Math.PI / 180;
                  return (
                    <g key={i}>
                      {/* Major tick marks */}
                      <line
                        x1={Math.cos(rad) * 40}
                        y1={Math.sin(rad) * 40}
                        x2={Math.cos(rad) * 48}
                        y2={Math.sin(rad) * 48}
                        stroke="#f8fafc"
                        strokeWidth="2"
                      />
                      {/* Numbers */}
                      <text
                        x={Math.cos(rad) * 30}
                        y={Math.sin(rad) * 30 + 4}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {i * 10}
                      </text>
                      {/* Minor tick marks */}
                      {i < 5 && [1, 2, 3, 4].map(j => {
                        const minorAngle = angle + j * 10.8;
                        const minorRad = minorAngle * Math.PI / 180;
                        return (
                          <line
                            key={j}
                            x1={Math.cos(minorRad) * 44}
                            y1={Math.sin(minorRad) * 44}
                            x2={Math.cos(minorRad) * 48}
                            y2={Math.sin(minorRad) * 48}
                            stroke="#94a3b8"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* Danger zone arc */}
                <path
                  d="M 28.28 28.28 A 40 40 0 0 1 40 0"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  opacity="0.5"
                />

                {/* Animated needle */}
                {(() => {
                  const pressureBars = Math.abs(pressureInBars(currentPressure));
                  const needleAngle = -135 + Math.min(pressureBars, 50) * 5.4;
                  const needleRad = needleAngle * Math.PI / 180;
                  return (
                    <g filter="url(#whamNeedleGlow)">
                      <line
                        x1={-Math.cos(needleRad) * 8}
                        y1={-Math.sin(needleRad) * 8}
                        x2={Math.cos(needleRad) * 38}
                        y2={Math.sin(needleRad) * 38}
                        stroke="url(#whamNeedle)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{ transition: 'all 0.1s ease-out' }}
                      />
                    </g>
                  );
                })()}

                {/* Center cap */}
                <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
                <circle cx="0" cy="0" r="4" fill="#fca5a5" />

                {/* Label */}
                <text x="0" y="72" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">
                  PRESSURE (bar)
                </text>
              </g>

              {/* ========== PRESSURE INDICATOR BAR ========== */}
              <g transform="translate(250, 230)">
                <text x="0" y="0" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
                  Current Pressure
                </text>
                {/* Background bar */}
                <rect x="-100" y="8" width="200" height="16" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                {/* Pressure fill */}
                <rect
                  x="-98"
                  y="10"
                  width={Math.min(Math.abs(pressureInBars(currentPressure)) * 3.9, 196)}
                  height="12"
                  rx="6"
                  fill={Math.abs(pressureInBars(currentPressure)) > 30 ? "#ef4444" : Math.abs(pressureInBars(currentPressure)) > 15 ? "#f59e0b" : "#22c55e"}
                  style={{ transition: 'all 0.1s' }}
                />
                {/* Pressure value */}
                <text x="0" y="38" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">
                  {Math.abs(pressureInBars(currentPressure)).toFixed(1)} bar
                </text>
              </g>

              {/* Warning indicators */}
              {!valveOpen && wavePosition > 0 && wavePosition < 50 && (
                <g>
                  <text x="250" y="70" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold" opacity={1 - wavePosition / 60}>
                    PRESSURE SURGE DETECTED
                  </text>
                </g>
              )}
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {valveOpen ? (
                <button
                  onPointerDown={closeValve}
                  disabled={animating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: animating ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: animating ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  ⚡ CLOSE VALVE INSTANTLY
                </button>
              ) : (
                <button
                  onPointerDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Reset & Try Again
                </button>
              )}
            </div>

            {/* Velocity slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Flow Velocity: {flowVelocity} m/s
              </label>
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
                style={{ width: '100%' }}
              />
            </div>

            {hasClosedValve && !animating && (
              <button
                onPointerDown={() => {
                  setShowResult(true);
                  if (prediction === 'c') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'c' ? '#166534' : '#92400e' }}>
                  {prediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Pressure rises <strong>dramatically</strong>! At {flowVelocity} m/s, the pressure spike is{' '}
                  <strong>{pressureInBars(calculatePressureRise(flowVelocity)).toFixed(1)} bar</strong>.
                  The water's momentum converts instantly to pressure!
                </p>
                <button
                  onPointerDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Physics of Water Hammer
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>Joukowsky Equation</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>
                  ΔP = ρ × c × Δv
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Pressure rise = Density × Sound speed × Velocity change
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>For water:</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>ρ (density) = 1000 kg/m³</li>
                  <li>c (sound speed) ≈ 1400 m/s</li>
                  <li>So: ΔP = 1,400,000 × Δv (Pa)</li>
                </ul>

                <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: 8 }}>
                  <strong>Example:</strong> Water at 3 m/s suddenly stopped:<br/>
                  ΔP = 1000 × 1400 × 3 = <strong>4,200,000 Pa = 42 bar!</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Key Insight</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                The pressure wave travels at the <strong>speed of sound in water</strong> (≈1400 m/s),
                not the flow speed. This is why the pressure spike happens almost instantly throughout
                the pipe system!
              </p>
            </div>

            <button
              onPointerDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try a Twist! 🔧
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Critical Time Challenge
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              What if instead of closing the valve instantly, you close it <strong>slowly</strong>?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Fast closure */}
              <g transform="translate(0, 0)">
                <rect x="20" y="30" width="160" height="40" fill="#475569" rx="3" />
                <rect x="25" y="35" width="130" height="30" fill="#3b82f6" opacity="0.5" />
                <rect x="155" y="25" width="20" height="50" fill="#ef4444" />
                <text x="100" y="95" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">
                  Instant Close
                </text>
                <text x="100" y="110" textAnchor="middle" fill="#dc2626" fontSize="10">
                  t = 0.01 seconds
                </text>
              </g>

              {/* Slow closure */}
              <g transform="translate(200, 0)">
                <rect x="20" y="30" width="160" height="40" fill="#475569" rx="3" />
                <rect x="25" y="35" width="130" height="30" fill="#3b82f6" opacity="0.5" />
                <rect x="155" y="35" width="20" height="30" fill="#22c55e" />
                <text x="100" y="95" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">
                  Slow Close
                </text>
                <text x="100" y="110" textAnchor="middle" fill="#22c55e" fontSize="10">
                  t = 1.0 seconds
                </text>
              </g>
            </svg>

            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center', maxWidth: 450 }}>
              <strong>Critical time</strong> = 2L/c (time for wave to travel pipe and back)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Same pressure regardless of closure speed' },
                { id: 'b', text: 'Slow closure causes HIGHER pressure' },
                { id: 'c', text: 'Slow closure REDUCES peak pressure' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onPointerDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onPointerDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Compare Them!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const criticalTime = (2 * pipeLength) / soundSpeed;
        const effectiveVelocity = closureTime < criticalTime
          ? flowVelocity
          : flowVelocity * (criticalTime / closureTime);
        const peakPressure = pressureInBars(calculatePressureRise(effectiveVelocity));

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Closure Speed Comparison
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust closure time and see how it affects peak pressure
            </p>

            {/* Pressure graph */}
            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Graph background */}
              <rect x="50" y="20" width="330" height="150" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

              {/* Grid lines */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={i}>
                  <line x1="50" y1={20 + i * 30} x2="380" y2={20 + i * 30} stroke="#e2e8f0" />
                  <text x="45" y={25 + i * 30} textAnchor="end" fill="#64748b" fontSize="9">
                    {50 - i * 10}
                  </text>
                </g>
              ))}

              {/* Pressure curve */}
              {twistPressureHistory.length > 0 && (
                <path
                  d={`M 50,170 ${twistPressureHistory.map((p, i) =>
                    `L ${50 + i * 3.3},${170 - (pressureInBars(Math.abs(p)) / 50) * 150}`
                  ).join(' ')}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                />
              )}

              {/* Critical time marker */}
              <line
                x1={50 + (criticalTime / 0.3) * 330}
                y1="20"
                x2={50 + (criticalTime / 0.3) * 330}
                y2="170"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x={50 + (criticalTime / 0.3) * 330}
                y="185"
                textAnchor="middle"
                fill="#3b82f6"
                fontSize="9"
              >
                Tc = {(criticalTime * 1000).toFixed(0)}ms
              </text>

              {/* Axes labels */}
              <text x="215" y="198" textAnchor="middle" fill="#1e293b" fontSize="10">Time</text>
              <text x="15" y="95" textAnchor="middle" fill="#1e293b" fontSize="10" transform="rotate(-90, 15, 95)">
                Pressure (bar)
              </text>
            </svg>

            {/* Info display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              width: '100%',
              maxWidth: 450,
              marginBottom: '1rem'
            }}>
              <div style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Critical Time</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                  {(criticalTime * 1000).toFixed(0)} ms
                </p>
              </div>
              <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Closure Time</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d97706' }}>
                  {(closureTime * 1000).toFixed(0)} ms
                </p>
              </div>
              <div style={{ background: closureTime > criticalTime ? '#dcfce7' : '#fee2e2', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Peak Pressure</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: closureTime > criticalTime ? '#166534' : '#dc2626' }}>
                  {peakPressure.toFixed(1)} bar
                </p>
              </div>
            </div>

            {/* Closure time slider */}
            <div style={{ width: '100%', maxWidth: 400, marginBottom: '1rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Valve Closure Time: {(closureTime * 1000).toFixed(0)} ms
                {closureTime < criticalTime ? ' (FAST - danger!)' : ' (SLOW - safe)'}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={closureTime}
                onChange={(e) => setClosureTime(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onPointerDown={simulateSlowClosure}
              disabled={twistAnimating}
              style={{
                padding: '0.75rem 2rem',
                background: twistAnimating ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: twistAnimating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                marginBottom: '1rem'
              }}
            >
              {twistAnimating ? 'Simulating...' : 'Run Simulation'}
            </button>

            {twistPressureHistory.length > 0 && !twistAnimating && (
              <button
                onPointerDown={() => {
                  setShowTwistResult(true);
                  if (twistPrediction === 'c') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'c' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Slow closure <strong>reduces</strong> peak pressure! When closure time exceeds the
                  critical time (2L/c), the reflected pressure wave has time to dissipate before
                  more pressure builds up.
                </p>
                <button
                  onPointerDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Critical Time: The Key to Safety
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Critical Time</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>
                  Tc = 2L / c
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Critical time = 2 × Pipe length / Sound speed
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>What happens:</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li><strong>Fast closure (t &lt; Tc):</strong> Full pressure spike</li>
                  <li><strong>Slow closure (t &gt; Tc):</strong> Reduced pressure</li>
                  <li>Pressure ∝ Tc / t (when t &gt; Tc)</li>
                </ul>

                <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', borderRadius: 8 }}>
                  <strong>Example:</strong> 100m pipe, c = 1400 m/s<br/>
                  Tc = 2 × 100 / 1400 = <strong>143 ms</strong><br/>
                  Close over 286 ms → pressure halved!
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Engineering Solutions</h4>
              <ul style={{ color: '#1e293b', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li><strong>Slow-closing valves</strong> - Motorized, timed closure</li>
                <li><strong>Surge tanks</strong> - Air cushion absorbs shock</li>
                <li><strong>Hammer arrestors</strong> - Sealed air chambers</li>
                <li><strong>Check valves</strong> - Prevent backflow surges</li>
              </ul>
            </div>

            <button
              onPointerDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────
      case 'transfer':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Water Hammer in the Real World
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
              Explore each application to unlock the test
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1.5rem'
            }}>
              {applications.map((app, index) => (
                <div
                  key={index}
                  onPointerDown={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playSound('click');
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && ' ✓'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#1e293b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onPointerDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TEST
      // ───────────────────────────────────────────────────
      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Water Hammer Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => (
                <div
                  key={qi}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? testAnswers[qi] === tq.correct
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#e2e8f0'
                        : '#e2e8f0'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    {qi + 1}. {tq.question}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onPointerDown={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? opt.correct
                              ? '#dcfce7'
                              : testAnswers[qi] === oi
                              ? '#fee2e2'
                              : '#f8fafc'
                            : testAnswers[qi] === oi
                            ? '#dbeafe'
                            : '#f8fafc',
                          color: '#1e293b',
                          border: `1px solid ${
                            testSubmitted
                              ? opt.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : '#e2e8f0'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : '#e2e8f0'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!testSubmitted ? (
              <button
                onPointerDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                  marginBottom: '1rem'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onPointerDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔧💧🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Water Hammer Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand why pipes bang and how engineers prevent catastrophic failures!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>4</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#64748b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>ΔP = ρcΔv (Joukowsky equation)</li>
                  <li>Pressure wave travels at sound speed</li>
                  <li>Critical time Tc = 2L/c</li>
                  <li>Slow valve closure saves pipes!</li>
                </ul>
              </div>
            </div>

            {/* Confetti animation */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'][i % 5]}
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onPointerDown={() => {
                onPhaseComplete?.();
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                resetSimulation();
                setTwistPressureHistory([]);
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Water Hammer</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onPointerDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : currentIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto">{renderPhase()}</div>
    </div>
  );
}
