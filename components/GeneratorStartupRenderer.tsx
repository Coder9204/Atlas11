'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Generator Startup - Complete 10-Phase Game
// Why diesel generators take 10+ seconds to provide backup power
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

interface GeneratorStartupRendererProps {
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
    scenario: "A data center experiences a utility power failure. The UPS system immediately begins supporting critical loads while the emergency notification system triggers the backup diesel generator to start.",
    question: "Why does a diesel generator require 10+ seconds before it can accept the full facility load?",
    options: [
      { id: 'a', label: "The diesel fuel needs time to heat up and become combustible" },
      { id: 'b', label: "Heavy rotating components (flywheel, rotor) must accelerate to 1800 RPM for 60Hz output", correct: true },
      { id: 'c', label: "Safety regulations mandate a minimum waiting period before load transfer" },
      { id: 'd', label: "The generator windings need time to reach operating temperature" }
    ],
    explanation: "Rotational inertia is the primary factor. The massive flywheel and generator rotor (often weighing several tons) must spin up to exactly 1800 RPM for a 4-pole generator to produce 60Hz AC power. This acceleration takes time regardless of how powerful the starter motor is."
  },
  {
    scenario: "A power plant operator is preparing to connect a newly started generator to the main electrical bus that already has other generators running. The synchronization panel shows the incoming generator at 59.8Hz while the bus is at 60.0Hz.",
    question: "Why must the generator be exactly synchronized before closing the main breaker?",
    options: [
      { id: 'a', label: "Unsynchronized connection would cause the generator to immediately shut down safely" },
      { id: 'b', label: "Mismatched frequency, phase, or voltage creates a short circuit condition with extreme currents and mechanical stress", correct: true },
      { id: 'c', label: "The lights would flicker briefly but no damage would occur" },
      { id: 'd', label: "Synchronization is only required for generators above 1 MW capacity" }
    ],
    explanation: "Connecting an out-of-sync generator creates a near-instantaneous attempt to force alignment. This can generate currents many times the rated value, causing severe mechanical stress on the generator shaft, coupling, and connected equipment. The forces involved can physically damage or destroy the generator."
  },
  {
    scenario: "During a routine transfer test, the facility engineer notices that when the generator accepts a 500kW server load, the frequency display briefly shows 58.5Hz before returning to 60Hz within 3 seconds.",
    question: "What phenomenon causes this temporary frequency drop?",
    options: [
      { id: 'a', label: "The fuel injectors are clogged and need maintenance" },
      { id: 'b', label: "Sudden load acts as a brake on the rotating mass; governor must increase fuel to compensate", correct: true },
      { id: 'c', label: "Voltage drop causes the frequency reading to be inaccurate" },
      { id: 'd', label: "This indicates a failing excitation system" }
    ],
    explanation: "This is 'frequency droop' - a fundamental generator behavior. When load is suddenly applied, it extracts energy from the rotating mass, slowing it down. The governor senses this speed drop and increases fuel flow to add more torque. Until the governor fully compensates, frequency remains depressed."
  },
  {
    scenario: "A hospital's critical care unit relies on backup power. The generator specification sheet states: 'Maximum step load acceptance: 65% of rated capacity.' The facilities team is planning load sequencing during transfer.",
    question: "Why do generator specifications limit step load acceptance?",
    options: [
      { id: 'a', label: "To reduce fuel consumption during startup" },
      { id: 'b', label: "To prevent excessive frequency droop that could damage sensitive medical equipment", correct: true },
      { id: 'c', label: "Generator manufacturers want to sell larger units" },
      { id: 'd', label: "This is an outdated specification from mechanical governor era" }
    ],
    explanation: "Instantaneously applying large loads causes severe frequency droop. If frequency drops below ~57Hz, sensitive equipment may disconnect for self-protection. In hospitals, this could mean life support systems temporarily losing power. Stepped load application (25-50% increments with time between steps) keeps frequency within acceptable bounds."
  },
  {
    scenario: "An offshore oil platform operates as an isolated microgrid with four 3MW diesel generators. During a drilling operation, a large motor starts and the platform engineer observes all four generators briefly slow down together before recovering.",
    question: "What mechanism allows multiple generators to share load changes proportionally?",
    options: [
      { id: 'a', label: "Digital communication links coordinate the generators in real-time" },
      { id: 'b', label: "Droop control: each governor reduces speed setpoint as load increases, naturally balancing load sharing", correct: true },
      { id: 'c', label: "A master generator dictates speed and others follow" },
      { id: 'd', label: "Load sharing only works with identical generators from the same manufacturer" }
    ],
    explanation: "Droop control is elegant physics. Each governor is programmed to allow ~4-5% frequency reduction at full load. When one generator takes more load, it slows slightly. This lower frequency causes it to generate less (and others to generate more), naturally redistributing load. No communication required!"
  },
  {
    scenario: "After a complete regional blackout, grid operators must restart the power system from zero. They begin with specially designated 'black start' power plants that can start without any external power.",
    question: "What makes a generator 'black start capable' and why is this critical?",
    options: [
      { id: 'a', label: "Black start generators use a different type of fuel that burns without preheating" },
      { id: 'b', label: "They have on-site batteries or small auxiliary engines to crank the main generator without grid power", correct: true },
      { id: 'c', label: "Black start capability means they can start in complete darkness" },
      { id: 'd', label: "All modern generators are inherently black start capable" }
    ],
    explanation: "Black start is critical infrastructure. Most power plants need grid power for pumps, controls, and cranking motors. Black start units have large battery banks, compressed air starting systems, or small diesel auxiliary generators that can start the main unit cold. Only about 10-15% of plants have this capability."
  },
  {
    scenario: "A data center technician notices that the generator's excitation system has failed during a maintenance test. The diesel engine runs perfectly at 1800 RPM, but the generator output voltage is zero.",
    question: "Why is the excitation system essential for generator operation?",
    options: [
      { id: 'a', label: "Excitation preheats the generator windings to reduce resistance" },
      { id: 'b', label: "It creates the magnetic field in the rotor required for electromagnetic induction to generate voltage", correct: true },
      { id: 'c', label: "Excitation systems control the fuel injection timing" },
      { id: 'd', label: "The excitation system synchronizes the generator to the grid" }
    ],
    explanation: "Generators work via electromagnetic induction - a spinning magnetic field induces voltage in stationary windings. The excitation system supplies DC current to the rotor, creating that essential magnetic field. No excitation = no magnetic field = no induced voltage, regardless of how fast the rotor spins."
  },
  {
    scenario: "A facility with a 2000kW generator experiences frequent 'nuisance trips' where the generator's protective relay shuts it down during load transfers. The relay log shows 'overcurrent' conditions lasting 100-200 milliseconds.",
    question: "What likely causes these brief but large overcurrent events?",
    options: [
      { id: 'a', label: "The generator is undersized for the facility load" },
      { id: 'b', label: "Inrush current from transformers and motors during startup draws 5-10x rated current briefly", correct: true },
      { id: 'c', label: "Ground faults in the electrical system" },
      { id: 'd', label: "The protective relay is misconfigured and too sensitive" }
    ],
    explanation: "Inrush current is an unavoidable electrical phenomenon. Transformers need to establish their magnetic fields (magnetizing inrush), and motors starting from standstill draw locked-rotor current (5-10x normal). These transients are brief but extreme. Generator protection must be set to ride through these events."
  },
  {
    scenario: "A power systems engineer is calculating generator sizing. The nameplate shows 2500kVA at 0.8 power factor. The connected load requires 1800kW real power and 1200kVAR reactive power.",
    question: "Why must generators be sized for kVA (apparent power) rather than just kW (real power)?",
    options: [
      { id: 'a', label: "kVA is always larger than kW so it provides a safety margin" },
      { id: 'b', label: "Generator heating depends on total current (from both real and reactive power), limited by kVA rating", correct: true },
      { id: 'c', label: "Reactive power is stored in the generator and must be accounted for" },
      { id: 'd', label: "This is only important for generators connected to the utility grid" }
    ],
    explanation: "Generator heating (I^2*R losses) depends on current, not power factor. A load drawing 1000A at 0.8 power factor heats the windings the same as 1000A at 1.0 power factor. Since reactive current still creates heat but does no useful work, generators must be rated for total kVA to prevent overheating."
  },
  {
    scenario: "A 4-pole synchronous generator is connected to a diesel engine. The generator nameplate specifies 60Hz output. During commissioning, the electrician verifies the output frequency.",
    question: "What RPM must the diesel engine maintain to produce exactly 60Hz?",
    options: [
      { id: 'a', label: "3600 RPM" },
      { id: 'b', label: "1800 RPM", correct: true },
      { id: 'c', label: "1200 RPM" },
      { id: 'd', label: "Any RPM works; the generator electronics convert to 60Hz" }
    ],
    explanation: "The formula is: Frequency = (Poles x RPM) / 120. For a 4-pole generator producing 60Hz: 60 = (4 x RPM) / 120, so RPM = 1800. This is why most industrial diesel generators in North America operate at exactly 1800 RPM - it's dictated by physics, not choice."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏥',
    title: 'Hospital Emergency Power',
    short: 'Life-critical systems demand instant power transfer',
    tagline: 'When seconds determine survival',
    description: 'Hospitals maintain diesel generators that must start, synchronize, and accept load within 10 seconds of a power failure. ICU ventilators, surgical equipment, and life support systems cannot tolerate extended outages.',
    connection: 'The startup sequence you explored - engine acceleration, voltage stabilization, and load acceptance - is life-critical in hospitals where power transfer must be seamless.',
    howItWorks: 'Hospital generators use stored compressed air or battery starters for fast cranking. Automatic transfer switches detect outages within milliseconds. Generators must synchronize within 10 seconds and accept stepped loads to avoid frequency droop.',
    stats: [
      { value: '10 sec', label: 'Maximum transfer time', icon: '⏱️' },
      { value: '96 hrs', label: 'Fuel reserve required', icon: '⛽' },
      { value: '$500K+', label: 'Typical generator cost', icon: '💰' }
    ],
    examples: ['ICU backup power', 'Operating room systems', 'Pharmacy refrigeration', 'Medical imaging equipment'],
    companies: ['Caterpillar', 'Cummins', 'Kohler', 'Generac'],
    futureImpact: 'Battery-generator hybrids provide instant power while generators start, eliminating even sub-second transfer gaps.',
    color: '#EF4444'
  },
  {
    icon: '💾',
    title: 'Data Center Reliability',
    short: 'Ensuring 99.999% uptime for the cloud',
    tagline: 'Five nines depends on perfect startup',
    description: 'Data centers promise 99.999% uptime (5.26 minutes downtime/year). Multiple generator systems, UPS batteries, and sophisticated load management ensure continuous power.',
    connection: 'The load acceptance and frequency stability you studied are precisely engineered in data centers to prevent server crashes during power transitions.',
    howItWorks: 'UPS batteries provide instant bridge power. Generators start and synchronize within 10-15 seconds. Sophisticated controls manage load acceptance in steps to prevent frequency droop. Multiple generators operate in parallel for redundancy.',
    stats: [
      { value: '99.999%', label: 'Target uptime (Tier IV)', icon: '📊' },
      { value: '2N+1', label: 'Generator redundancy', icon: '🔌' },
      { value: '$10M/hr', label: 'Major outage cost', icon: '💰' }
    ],
    examples: ['Amazon AWS facilities', 'Google data centers', 'Microsoft Azure', 'Facebook infrastructure'],
    companies: ['Equinix', 'Digital Realty', 'CyrusOne', 'QTS'],
    futureImpact: 'AI-predictive maintenance anticipates generator issues before failure, achieving true continuous availability.',
    color: '#3B82F6'
  },
  {
    icon: '⛽',
    title: 'Oil & Gas Operations',
    short: 'Powering remote drilling and processing',
    tagline: 'Isolated operations demand self-reliance',
    description: 'Offshore platforms and remote drilling sites operate as isolated microgrids with no utility connection. Multiple generators must coordinate startup, load sharing, and synchronization autonomously.',
    connection: 'The frequency droop and governor response you explored are essential for load sharing when multiple generators operate in parallel without grid support.',
    howItWorks: 'Droop control allows multiple generators to share load proportionally. Each governor reduces frequency slightly as load increases, naturally balancing load between units. Fast ramp rates handle sudden pump and compressor startups.',
    stats: [
      { value: '100+ MW', label: 'Large platform demand', icon: '⚡' },
      { value: '6-8', label: 'Generators per platform', icon: '🔧' },
      { value: '$1M/day', label: 'Platform operating cost', icon: '💰' }
    ],
    examples: ['Offshore drilling rigs', 'FPSO vessels', 'Remote pipeline stations', 'Arctic exploration camps'],
    companies: ['Schlumberger', 'Halliburton', 'Baker Hughes', 'Wartsila'],
    futureImpact: 'Hybrid systems combining generators with battery storage and wind reduce fuel consumption and emissions at remote sites.',
    color: '#F59E0B'
  },
  {
    icon: '⚡',
    title: 'Grid Black Start Recovery',
    short: 'Restarting civilization after total blackout',
    tagline: 'The ultimate startup challenge',
    description: 'After a total grid blackout, power plants cannot restart without external power. Black start generators - specially designed for self-starting - provide the initial power to restart the grid.',
    connection: 'Black start extends everything you learned to extreme scale: massive generators must start from zero, synchronize, and gradually energize transmission lines and other power plants.',
    howItWorks: 'Black start units use battery banks or small diesel sets to crank. They energize local equipment, then transmission lines. Other plants are restarted in sequence until the grid is restored.',
    stats: [
      { value: '24-48 hrs', label: 'Full grid restoration', icon: '⏰' },
      { value: '$1B+', label: 'Major blackout cost', icon: '💰' },
      { value: '50 MW', label: 'Typical black start unit', icon: '⚡' }
    ],
    examples: ['2003 Northeast blackout', 'Texas 2021 grid failure', 'Italy 2003 outage', 'India 2012 collapse'],
    companies: ['ERCOT', 'PJM Interconnection', 'National Grid', 'EDF'],
    futureImpact: 'Grid-forming inverters on solar and battery systems enable renewable-first black start, reducing reliance on fossil fuel generators.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const GeneratorStartupRenderer: React.FC<GeneratorStartupRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Play phase
  const [generatorState, setGeneratorState] = useState<'stopped' | 'cranking' | 'warmup' | 'sync' | 'online'>('stopped');
  const [rpm, setRpm] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [startupTime, setStartupTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Twist phase - Load dynamics
  const [loadPercentage, setLoadPercentage] = useState(50);
  const [isLoadApplied, setIsLoadApplied] = useState(false);
  const [frequencyDroop, setFrequencyDroop] = useState(60);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const isNavigating = useRef(false);
  const startupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Startup simulation
  useEffect(() => {
    if (isRunning && generatorState !== 'online') {
      startupIntervalRef.current = setInterval(() => {
        setStartupTime(prev => {
          const newTime = prev + 0.1;

          if (newTime < 2) {
            setGeneratorState('cranking');
            setRpm(Math.min(300, newTime * 150));
            setFrequency(0);
          } else if (newTime < 5) {
            setGeneratorState('warmup');
            setRpm(Math.min(1500, 300 + (newTime - 2) * 400));
            setFrequency(Math.max(0, (newTime - 3) * 30));
          } else if (newTime < 10) {
            setGeneratorState('sync');
            setRpm(Math.min(1800, 1500 + (newTime - 5) * 60));
            setFrequency(Math.min(60, 45 + (newTime - 5) * 3));
          } else {
            setGeneratorState('online');
            setRpm(1800);
            setFrequency(60);
            playSound('success');
            if (startupIntervalRef.current) {
              clearInterval(startupIntervalRef.current);
            }
          }

          return newTime;
        });
      }, 100);
    }

    return () => {
      if (startupIntervalRef.current) {
        clearInterval(startupIntervalRef.current);
      }
    };
  }, [isRunning, generatorState]);

  // Frequency droop calculation
  useEffect(() => {
    if (isLoadApplied) {
      const droopAmount = (loadPercentage / 100) * 5;
      const newFreq = 60 - droopAmount + Math.random() * 0.3;
      setFrequencyDroop(Math.max(55, newFreq));
    } else {
      setFrequencyDroop(60);
    }
  }, [loadPercentage, isLoadApplied]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange for generator/power theme
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for accessibility
    textMuted: '#cbd5e1', // High contrast for accessibility
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
    twist_play: 'Load Dynamics',
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
        gameType: 'generator-startup',
        gameTitle: 'Generator Startup',
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

  // Generator Visualization SVG
  const GeneratorVisualization = ({ showControls = true }: { showControls?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const rotationSpeed = showControls ? rpm / 30 : 0;
    const engineRunning = showControls ? rpm > 100 : false;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="engineBlock" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="generatorHousing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <radialGradient id="flywheelGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>
          <radialGradient id="combustionGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={colors.bgSecondary} rx="12" />

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Diesel Generator Startup Sequence
        </text>

        {/* Engine Block */}
        <rect x={isMobile ? 30 : 50} y={isMobile ? 70 : 80} width={isMobile ? 90 : 120} height={isMobile ? 90 : 110} fill="url(#engineBlock)" rx="8" stroke="#64748b" strokeWidth="2" />

        {/* Engine cylinders with combustion */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={(isMobile ? 40 : 60) + i * (isMobile ? 25 : 35)} y={isMobile ? 85 : 95} width={isMobile ? 18 : 25} height={isMobile ? 35 : 45} fill="#1f2937" rx="3" stroke="#374151" strokeWidth="1" />
            {engineRunning && (
              <ellipse
                cx={(isMobile ? 49 : 72) + i * (isMobile ? 25 : 35)}
                cy={(isMobile ? 95 : 105) + Math.sin((animationFrame + i * 40) * rotationSpeed * 0.1) * 8}
                rx="8"
                ry={6 + Math.sin((animationFrame + i * 40) * 0.15) * 2}
                fill="url(#combustionGlow)"
                filter="url(#glowFilter)"
                opacity={0.6 + Math.sin((animationFrame + i * 40) * 0.15) * 0.3}
              />
            )}
          </g>
        ))}

        {/* Flywheel */}
        <g transform={`translate(${isMobile ? 155 : 210}, ${isMobile ? 115 : 135}) rotate(${animationFrame * rotationSpeed * 0.5})`}>
          <circle cx="0" cy="0" r={isMobile ? 30 : 40} fill="url(#flywheelGrad)" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="0" cy="0" r={isMobile ? 22 : 30} fill="#374151" stroke="#475569" strokeWidth="1" />
          <circle cx="0" cy="0" r="8" fill="#64748b" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <line
              key={i}
              x1="10"
              y1="0"
              x2={isMobile ? 20 : 28}
              y2="0"
              stroke="#64748b"
              strokeWidth="3"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>

        {/* Coupling */}
        <rect x={isMobile ? 180 : 245} y={isMobile ? 108 : 125} width={isMobile ? 20 : 30} height="16" fill="#6b7280" rx="3" />

        {/* Generator Housing */}
        <rect x={isMobile ? 200 : 275} y={isMobile ? 75 : 85} width={isMobile ? 85 : 110} height={isMobile ? 80 : 100} fill="url(#generatorHousing)" rx="8" stroke="#93c5fd" strokeWidth="2" />

        {/* Generator rotor */}
        <g transform={`translate(${isMobile ? 243 : 330}, ${isMobile ? 115 : 135}) rotate(${animationFrame * rotationSpeed * 0.5})`}>
          <circle cx="0" cy="0" r={isMobile ? 28 : 38} fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
          <circle cx="0" cy="0" r={isMobile ? 22 : 30} fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <rect
              key={i}
              x="-4"
              y={isMobile ? "-20" : "-26"}
              width="8"
              height={isMobile ? "12" : "16"}
              fill="#f59e0b"
              rx="2"
              transform={`rotate(${angle})`}
              filter={rpm > 1500 ? "url(#glowFilter)" : undefined}
            />
          ))}
          <circle cx="0" cy="0" r="8" fill="#475569" />
        </g>

        {/* Power output indicator */}
        {frequency > 50 && (
          <g>
            <line x1={isMobile ? 285 : 385} y1={isMobile ? 100 : 110} x2={isMobile ? 310 : 420} y2={isMobile ? 100 : 110} stroke="#22c55e" strokeWidth="4" filter="url(#glowFilter)" />
            <line x1={isMobile ? 285 : 385} y1={isMobile ? 130 : 160} x2={isMobile ? 310 : 420} y2={isMobile ? 130 : 160} stroke="#22c55e" strokeWidth="4" filter="url(#glowFilter)" />
            <circle cx={isMobile ? 310 : 420} cy={isMobile ? 115 : 135} r="8" fill="#22c55e" filter="url(#glowFilter)">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Status Panel */}
        <rect x="15" y={height - 75} width={width - 30} height="60" fill={colors.bgCard} rx="8" stroke={colors.border} strokeWidth="1" />

        {/* Status values */}
        <g transform={`translate(0, ${height - 55})`}>
          {[
            { label: 'STATE', value: generatorState.toUpperCase(), color: generatorState === 'online' ? colors.success : generatorState === 'stopped' ? colors.error : colors.warning },
            { label: 'RPM', value: rpm.toFixed(0), color: colors.textPrimary },
            { label: 'FREQ', value: `${frequency.toFixed(1)} Hz`, color: frequency >= 59 ? colors.success : colors.warning },
            { label: 'TIME', value: `${startupTime.toFixed(1)}s`, color: colors.textPrimary },
          ].map((item, i) => (
            <g key={i} transform={`translate(${30 + i * (isMobile ? 75 : 110)}, 0)`}>
              <text y="12" fill={colors.textMuted} fontSize="10" fontWeight="500">{item.label}</text>
              <text y="32" fill={item.color} fontSize={isMobile ? "14" : "16"} fontWeight="700">{item.value}</text>
            </g>
          ))}
        </g>
      </svg>
    );
  };

  // Frequency Droop Visualization
  const FrequencyDroopVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 260;
    const droopPercent = ((60 - frequencyDroop) / 60) * 100;
    const governorResponse = isLoadApplied ? Math.min(100, loadPercentage * 1.2) : 0;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="freqGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.success} />
          </linearGradient>
          <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        <rect width={width} height={height} fill={colors.bgSecondary} rx="12" />

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Frequency Droop Under Load
        </text>

        {/* Frequency meter */}
        <rect x="30" y="45" width={isMobile ? 140 : 180} height="120" fill={colors.bgCard} rx="8" stroke={colors.border} strokeWidth="1" />

        {/* Frequency scale */}
        {[60, 59, 58, 57, 56, 55].map((freq, i) => (
          <g key={freq}>
            <line
              x1="40"
              y1={55 + i * 18}
              x2={isMobile ? 160 : 200}
              y2={55 + i * 18}
              stroke={freq >= 58 ? colors.success : freq >= 57 ? colors.warning : colors.error}
              strokeWidth="1"
              strokeDasharray={freq === 60 ? "0" : "3,3"}
              opacity={0.5}
            />
            <text x="35" y={59 + i * 18} textAnchor="end" fill={colors.textMuted} fontSize="10">{freq}</text>
          </g>
        ))}

        {/* Current frequency line */}
        <line
          x1="40"
          y1={55 + (60 - frequencyDroop) * 18}
          x2={isMobile ? 160 : 200}
          y2={55 + (60 - frequencyDroop) * 18}
          stroke={frequencyDroop < 57 ? colors.error : frequencyDroop < 59 ? colors.warning : colors.success}
          strokeWidth="4"
          filter="url(#glowFilter)"
        />

        {/* Digital display */}
        <rect x={isMobile ? 185 : 230} y="45" width={isMobile ? 125 : 150} height="70" fill={colors.bgCard} rx="8" stroke={colors.border} strokeWidth="1" />
        <text x={isMobile ? 247 : 305} y="75" textAnchor="middle" fill={frequencyDroop < 57 ? colors.error : frequencyDroop < 59 ? colors.warning : colors.success} fontSize="28" fontWeight="700">
          {frequencyDroop.toFixed(1)}
        </text>
        <text x={isMobile ? 247 : 305} y="100" textAnchor="middle" fill={colors.textMuted} fontSize="12">Hz</text>

        {/* Governor response meter */}
        <rect x={isMobile ? 185 : 230} y="125" width={isMobile ? 125 : 150} height="40" fill={colors.bgCard} rx="8" stroke={colors.border} strokeWidth="1" />
        <text x={isMobile ? 247 : 305} y="140" textAnchor="middle" fill={colors.textMuted} fontSize="10">GOVERNOR RESPONSE</text>
        <rect x={isMobile ? 195 : 240} y="148" width={isMobile ? 105 : 130} height="10" fill={colors.bgSecondary} rx="4" />
        <rect x={isMobile ? 195 : 240} y="148" width={(isMobile ? 105 : 130) * governorResponse / 100} height="10" fill="#06b6d4" rx="4" />

        {/* Load bar */}
        <rect x="30" y={height - 50} width={width - 60} height="35" fill={colors.bgCard} rx="8" stroke={colors.border} strokeWidth="1" />
        <text x="45" y={height - 28} fill={colors.textMuted} fontSize="11">LOAD: {loadPercentage}%</text>
        <rect x={(isMobile ? 140 : 180)} y={height - 42} width={(isMobile ? 160 : 240)} height="18" fill={colors.bgSecondary} rx="6" />
        <rect x={(isMobile ? 140 : 180)} y={height - 42} width={(isMobile ? 160 : 240) * loadPercentage / 100} height="18" fill="url(#loadGrad)" rx="6" />

        {/* Status */}
        <text x={width/2} y={height - 8} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          {isLoadApplied ? (droopPercent > 3 ? 'Warning: Excessive droop!' : 'Governor compensating...') : 'Apply load to see frequency droop'}
        </text>
      </svg>
    );
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
    background: `linear-gradient(135deg, ${colors.accent}, #EA580C)`,
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

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚙️</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Generator Startup</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]}
      </div>
    </nav>
  );

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
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚙️🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Diesel Generator Startup
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "When the grid fails, why does the backup generator take <span style={{ color: colors.accent }}>10+ seconds</span> to kick in? The answer involves tons of spinning metal and precise synchronization."
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
            "A data center's diesel generator must spin a multi-ton flywheel to exactly 1800 RPM, stabilize voltage, and synchronize frequency - all before accepting critical server loads."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Data Center Infrastructure 101
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Next
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The diesel fuel needs time to ignite and burn efficiently' },
      { id: 'b', text: 'Heavy rotating parts (flywheel, rotor) must accelerate to full speed', correct: true },
      { id: 'c', text: 'Safety interlocks require a mandatory delay before operation' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0', overflowY: 'auto' }}>
          {/* Progress indicator */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            color: colors.textSecondary,
            ...typo.small,
          }}>
            Step 1 of 3: Make your prediction
          </div>

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

          {/* Static visualization for predict phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <GeneratorVisualization showControls={false} />
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A data center loses utility power. The diesel generator needs to take over. Why can't it provide power instantly?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>Grid</div>
                <p style={{ ...typo.small, color: colors.error }}>FAILED</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: colors.accent + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '36px' }}>⚙️</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Generator</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>???</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>10+ seconds</p>
              </div>
            </div>
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
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Next
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Generator Startup Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '20px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Generator Startup Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Watch the startup sequence and observe why it takes 10+ seconds
          </p>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-World Application:</strong> Data centers and hospitals use diesel generators exactly like this. Every second of startup delay requires UPS battery backup to bridge critical loads.
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.bgCard}`,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch the RPM increase and frequency stabilize. Notice how the generator must reach 1800 RPM for 60Hz output.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <GeneratorVisualization />
            </div>

            {/* Startup sequence description */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '24px',
            }}>
              {[
                { state: 'cranking', label: 'Cranking', time: '0-2s', desc: 'Starter motor spins engine' },
                { state: 'warmup', label: 'Warmup', time: '2-5s', desc: 'Engine fires, RPM builds' },
                { state: 'sync', label: 'Sync', time: '5-10s', desc: 'Stabilize at 1800 RPM' },
                { state: 'online', label: 'Online', time: '10s+', desc: 'Ready for load!' },
              ].map((item) => (
                <div
                  key={item.state}
                  style={{
                    background: generatorState === item.state ? `${colors.accent}22` : colors.bgSecondary,
                    border: `2px solid ${generatorState === item.state ? colors.accent : 'transparent'}`,
                    borderRadius: '8px',
                    padding: '12px 8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ ...typo.small, color: generatorState === item.state ? colors.accent : colors.textMuted, fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>
                    {item.time}
                  </div>
                </div>
              ))}
            </div>

            {/* RPM Slider Control */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Target RPM</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{rpm.toFixed(0)} RPM</span>
              </div>
              <input
                type="range"
                min="0"
                max="1800"
                value={rpm}
                onChange={(e) => {
                  const newRpm = parseInt(e.target.value);
                  setRpm(newRpm);
                  setFrequency((4 * newRpm) / 120);
                  if (newRpm >= 1750) {
                    setGeneratorState('online');
                  } else if (newRpm >= 1500) {
                    setGeneratorState('sync');
                  } else if (newRpm >= 300) {
                    setGeneratorState('warmup');
                  } else if (newRpm > 0) {
                    setGeneratorState('cranking');
                  } else {
                    setGeneratorState('stopped');
                  }
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                aria-label="RPM slider"
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {generatorState === 'stopped' ? (
                <button
                  onClick={() => {
                    setIsRunning(true);
                    setStartupTime(0);
                    setRpm(0);
                    setFrequency(0);
                    playSound('click');
                  }}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.success,
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                  }}
                >
                  Start Generator
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setGeneratorState('stopped');
                    setStartupTime(0);
                    setRpm(0);
                    setFrequency(0);
                    if (startupIntervalRef.current) {
                      clearInterval(startupIntervalRef.current);
                    }
                  }}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Insight box */}
          {generatorState === 'online' && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                The generator is now at 60Hz and ready for load. Total startup: ~10 seconds!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            disabled={generatorState !== 'online'}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: generatorState === 'online' ? 1 : 0.5,
              cursor: generatorState === 'online' ? 'pointer' : 'not-allowed',
              minHeight: '44px',
            }}
          >
            Next
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionOptions: Record<string, string> = {
      'a': 'The diesel fuel needs time to ignite and burn efficiently',
      'b': 'Heavy rotating parts (flywheel, rotor) must accelerate to full speed',
      'c': 'Safety interlocks require a mandatory delay before operation',
    };
    const userPredictionText = prediction ? predictionOptions[prediction] : null;
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Generator Startup
          </h2>

          {/* Reference user's prediction */}
          {userPredictionText && (
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: wasCorrect ? colors.success : colors.warning, margin: 0, fontWeight: 600 }}>
                {wasCorrect ? 'Your prediction was correct!' : 'Let\'s examine your prediction:'}
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: '8px 0 0 0' }}>
                You predicted: "{userPredictionText}"
              </p>
              {!wasCorrect && (
                <p style={{ ...typo.small, color: colors.textMuted, margin: '8px 0 0 0' }}>
                  The correct answer is that heavy rotating parts must accelerate to full speed. Let's explore why.
                </p>
              )}
            </div>
          )}

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ ...typo.small, color: colors.textMuted }}>Frequency Formula</p>
              <p style={{ ...typo.h2, color: colors.accent }}>f = (P x N) / 120</p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                f = frequency (Hz), P = poles, N = RPM
              </p>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                4-pole generator at 1800 RPM = <span style={{ color: colors.success }}>60 Hz</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { icon: '⚙️', title: 'Rotational Inertia', desc: 'The flywheel and rotor (often 2+ tons) resist acceleration. This stores kinetic energy for load stability but means slow startup.' },
              { icon: '🔄', title: 'Synchronization', desc: 'Before connecting, generator must match grid frequency (60Hz), voltage, and phase angle. Mismatched connection causes severe damage.' },
              { icon: '📊', title: 'Governor Control', desc: 'The governor adjusts fuel flow to maintain constant speed. When load changes, it compensates within seconds.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{item.title}</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
          >
            Next
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Frequency stays at 60Hz - generators are designed for this' },
      { id: 'b', text: 'Frequency drops briefly then recovers (frequency droop)', correct: true },
      { id: 'c', text: 'Frequency increases from the sudden energy demand' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0', overflowY: 'auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Load Dynamics
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            The generator is running at perfect 60Hz. The UPS suddenly transfers 500kW of server load. What happens to frequency?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Generator running at 60Hz, 0% load...
            </p>
            <p style={{ ...typo.h3, color: colors.warning, marginTop: '12px' }}>
              SUDDENLY: +500kW load applied!
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
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See What Happens
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Frequency Droop Simulator
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '20px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Frequency Droop Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Apply load and watch frequency droop in action
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <FrequencyDroopVisualization />
            </div>

            {/* Load slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Load Percentage</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{loadPercentage}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={loadPercentage}
                onChange={(e) => setLoadPercentage(parseInt(e.target.value))}
                disabled={!isLoadApplied}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: isLoadApplied ? 'pointer' : 'not-allowed',
                  opacity: isLoadApplied ? 1 : 0.5,
                }}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {!isLoadApplied ? (
                <button
                  onClick={() => {
                    setIsLoadApplied(true);
                    playSound('click');
                  }}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.error,
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                  }}
                >
                  Apply Load
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsLoadApplied(false);
                    setLoadPercentage(50);
                  }}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.success,
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                  }}
                >
                  Release Load
                </button>
              )}
            </div>
          </div>

          {/* Warning */}
          {isLoadApplied && frequencyDroop < 58 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Warning: Frequency below 58Hz! Sensitive equipment may disconnect for protection.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            disabled={!isLoadApplied}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              minHeight: '44px',
              opacity: isLoadApplied ? 1 : 0.5,
              cursor: isLoadApplied ? 'pointer' : 'not-allowed',
            }}
          >
            Understand Load Management
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
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Managing Generator Dynamics
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { icon: '📶', title: 'Stepped Loading', desc: 'Apply load in 25-50% increments with 5-10 second delays between steps. This gives the governor time to compensate and prevents excessive droop.' },
              { icon: '🔄', title: 'Flywheel Energy Storage', desc: 'The rotating mass stores kinetic energy that buffers sudden load changes. Larger flywheels provide more stability but longer startup times.' },
              { icon: '⚡', title: 'Electronic Governors', desc: 'Modern electronic governors respond within milliseconds, far faster than mechanical governors. They precisely control fuel injection for better frequency regulation.' },
              { icon: '🔌', title: 'Parallel Operation', desc: 'Multiple generators can share load using droop control. Each unit slightly reduces frequency as load increases, naturally balancing the load distribution.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{item.title}</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: The UPS Bridge
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Data centers use UPS batteries to bridge the 10-15 second generator startup time. This is why UPS systems are sized for minutes of runtime - they must handle the critical startup window plus margin for any startup failures.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '20px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
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
                Connection to Generator Startup:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
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

            {/* Got It button for within-phase navigation */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.bgSecondary : colors.accent,
                color: completedApps[selectedApp] ? colors.textSecondary : 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '16px',
                minHeight: '44px',
              }}
            >
              {completedApps[selectedApp] ? 'Reviewed' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
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
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center', overflowY: 'auto' }}>
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
                ? 'You understand generator startup and load dynamics!'
                : 'Review the concepts and try again.'}
            </p>

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
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0', overflowY: 'auto' }}>
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
                  minHeight: '44px',
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
                  flex: 1,
                  padding: '14px',
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
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
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
          Generator Dynamics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why backup generators need time to start and how load dynamics affect power quality.
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
              'Rotational inertia causes 10+ second startup time',
              'Frequency = (Poles x RPM) / 120',
              'Synchronization prevents catastrophic connection',
              'Frequency droop occurs during sudden load pickup',
              'Governors compensate by adjusting fuel flow',
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
              minHeight: '44px',
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

export default GeneratorStartupRenderer;
