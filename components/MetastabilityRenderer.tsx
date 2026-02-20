'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// METASTABILITY - Complete 10-Phase Game
// Why flip-flops fail when crossing clock domains and how to prevent it
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

interface MetastabilityRendererProps {
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
// TEST QUESTIONS
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A digital system transfers data from a 50 MHz clock domain to a 133 MHz clock domain. Occasionally, the receiving logic captures corrupted values that cause system crashes.",
    question: "What is the most likely cause of the intermittent failures?",
    options: [
      { id: 'a', label: "The 133 MHz clock is too fast for the logic gates" },
      { id: 'b', label: "Metastability in the clock domain crossing causes undefined output states", correct: true },
      { id: 'c', label: "The voltage levels are incompatible between domains" },
      { id: 'd', label: "The data bus has too many wires for reliable transfer" }
    ],
    explanation: "When data crosses between clock domains, the receiving flip-flop may sample the input during its setup or hold time window causing metastability - an unstable state between 0 and 1."
  },
  {
    scenario: "An engineer adds a second flip-flop in series after the first one in a clock domain crossing circuit. The system failures drop by a factor of 1000.",
    question: "Why does adding a second flip-flop dramatically improve reliability?",
    options: [
      { id: 'a', label: "The second flip-flop filters out electrical noise from the first" },
      { id: 'b', label: "It gives the first flip-flop time to resolve before the output is used", correct: true },
      { id: 'c', label: "Two flip-flops share the current load, reducing stress" },
      { id: 'd', label: "The second flip-flop corrects any errors from the first" }
    ],
    explanation: "A synchronizer chain provides extra clock cycles for the first flip-flop to resolve from metastability. Each additional stage reduces failure probability exponentially."
  },
  {
    scenario: "A flip-flop's datasheet specifies a setup time of 0.5ns and hold time of 0.3ns. The data input changes 0.2ns before the clock edge.",
    question: "What will happen when the clock edge arrives?",
    options: [
      { id: 'a', label: "The flip-flop will capture the new data value correctly" },
      { id: 'b', label: "The flip-flop will hold the previous data value" },
      { id: 'c', label: "The flip-flop may enter a metastable state due to setup time violation", correct: true },
      { id: 'd', label: "The flip-flop will output a logic high regardless of input" }
    ],
    explanation: "With data arriving 0.2ns before the clock edge but requiring 0.5ns setup time, there is a setup time violation causing potential metastability."
  },
  {
    scenario: "A design team increases the clock frequency from 100 MHz to 200 MHz in their FPGA. MTBF for clock domain crossings drops from 100 years to 6 months.",
    question: "Why does doubling the clock frequency have such a dramatic effect on MTBF?",
    options: [
      { id: 'a', label: "Higher frequency creates more electromagnetic interference" },
      { id: 'b', label: "The resolution time available per clock cycle is halved, exponentially increasing failure rate", correct: true },
      { id: 'c', label: "The power supply cannot keep up with faster switching" },
      { id: 'd', label: "More clock edges means more data is transferred" }
    ],
    explanation: "MTBF depends exponentially on resolution time. At 200 MHz (5ns period), flip-flops have half the time to resolve compared to 100 MHz (10ns). This exponential relationship reduces MTBF by orders of magnitude."
  },
  {
    scenario: "A chip designer chooses between a flip-flop with faster switching but higher metastability window, versus slower switching but lower metastability window.",
    question: "For a clock domain crossing synchronizer, which flip-flop is better?",
    options: [
      { id: 'a', label: "The faster flip-flop because it can keep up with higher frequencies" },
      { id: 'b', label: "The flip-flop with lower metastability window for better MTBF", correct: true },
      { id: 'c', label: "Both are equivalent - speed and metastability window do not affect CDC" },
      { id: 'd', label: "Neither - only external components matter for CDC" }
    ],
    explanation: "For synchronizers, metastability resolution characteristics matter more than raw speed. A smaller metastability window achieves much better MTBF."
  },
  {
    scenario: "An asynchronous reset signal crosses from a button debounce circuit to the main system clock domain. The reset occasionally fails to properly initialize all registers.",
    question: "What is the proper solution for this reset crossing problem?",
    options: [
      { id: 'a', label: "Use a faster debounce circuit to make the signal change quicker" },
      { id: 'b', label: "Synchronize the reset signal and ensure synchronous deassertion", correct: true },
      { id: 'c', label: "Connect the reset directly to all registers to minimize delay" },
      { id: 'd', label: "Add more capacitance to the reset line for smoother transitions" }
    ],
    explanation: "Asynchronous resets crossing clock domains can cause metastability. The deassertion must be synchronous to prevent registers from coming out of reset at different times."
  },
  {
    scenario: "A FIFO buffer crosses data between clock domains. The design uses gray code for the read and write pointers instead of binary.",
    question: "Why is gray code preferred for the FIFO pointers?",
    options: [
      { id: 'a', label: "Gray code uses fewer flip-flops than binary" },
      { id: 'b', label: "Only one bit changes per increment, preventing multi-bit synchronization errors", correct: true },
      { id: 'c', label: "Gray code is faster to increment than binary" },
      { id: 'd', label: "Binary code cannot represent pointer values correctly" }
    ],
    explanation: "Binary counters change multiple bits simultaneously (0111 to 1000 changes 4 bits). Gray code changes only one bit per increment, so the worst case is off by one."
  },
  {
    scenario: "A 32-bit data bus crosses between clock domains. The designer synchronizes each bit independently with its own 2-stage synchronizer.",
    question: "What is the problem with this approach?",
    options: [
      { id: 'a', label: "32 synchronizers use too much power" },
      { id: 'b', label: "Each bit may resolve at different times, corrupting the multi-bit value", correct: true },
      { id: 'c', label: "The synchronizers will interfere with each other electromagnetically" },
      { id: 'd', label: "This approach is actually correct and has no problems" }
    ],
    explanation: "Individual bits can resolve in different clock cycles, resulting in a corrupted multi-bit value. Use handshaking, FIFOs, or gray code for multi-bit signals."
  },
  {
    scenario: "A system operates at -40C in an industrial freezer. The MTBF for metastability was calculated at 25C room temperature.",
    question: "How does the cold temperature affect the actual MTBF?",
    options: [
      { id: 'a', label: "Cold temperature improves MTBF because transistors switch faster", correct: true },
      { id: 'b', label: "Cold temperature worsens MTBF because flip-flops become sluggish" },
      { id: 'c', label: "Temperature has no effect on metastability characteristics" },
      { id: 'd', label: "The system will not function at -40C regardless of MTBF" }
    ],
    explanation: "Lower temperatures improve transistor performance, reducing the metastability time constant. Flip-flops resolve faster from metastable states, significantly improving MTBF."
  },
  {
    scenario: "A software engineer debugs a race condition appearing randomly once per week. Adding debug prints makes the bug disappear.",
    question: "How might this be related to metastability?",
    options: [
      { id: 'a', label: "Debug prints add enough delay to mask a clock domain crossing issue", correct: true },
      { id: 'b', label: "The prints fix memory corruption in the processor cache" },
      { id: 'c', label: "Metastability only occurs in hardware, never in software systems" },
      { id: 'd', label: "The bug is unrelated to metastability - it is a pure software issue" }
    ],
    explanation: "Multi-processor systems have hardware synchronization between cores. Debug prints change timing enough that the synchronizer has more time to resolve, hiding the hardware issue."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'High-Speed Networking',
    tagline: 'Every packet crosses clock domains',
    description: 'Network processors in routers and switches operate with multiple clock domains - PHY interfaces, packet processors, memory controllers, and CPU cores all run at different frequencies. Proper synchronization prevents packet corruption and system crashes across 400Gbps+ interfaces.',
    connection: 'When a packet arrives at a network port, its data crosses from the PHY clock domain to the processing clock domain. Without proper synchronizers, metastability could corrupt packet headers, causing misrouting or dropped connections across the entire network.',
    stats: [
      { value: '400Gbps', label: 'Modern port speeds', icon: '⚡' },
      { value: '100+ yrs', label: 'MTBF requirement', icon: '🎯' },
      { value: '5-7', label: 'Clock domains per chip', icon: '🔄' }
    ],
    companies: ['Cisco', 'Broadcom', 'Marvell', 'Intel'],
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'Memory Controllers',
    tagline: 'Bridging processor and memory speeds',
    description: 'Memory controllers translate between the CPU clock domain and the DDR memory clock domain. DDR5 memory transfers at 6400MT/s and operates at different frequencies than the processor, requiring careful clock domain crossing for every memory read and write operation.',
    connection: 'Every memory read and write crosses clock boundaries. The memory controller must synchronize address, data, and control signals while meeting strict timing requirements. Metastability here could corrupt data stored in RAM, causing silent data corruption.',
    stats: [
      { value: '6400MT/s', label: 'DDR5 transfer rate', icon: '💨' },
      { value: '<1ps', label: 'Timing margin', icon: '⏱️' },
      { value: '10^18', label: 'Ops without error', icon: '✓' }
    ],
    companies: ['Intel', 'AMD', 'Samsung', 'Micron'],
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Video and Display Systems',
    tagline: 'Pixels crossing timing boundaries',
    description: 'GPUs generate frames at variable rates while displays operate at fixed refresh rates. Video capture, processing, and output involve multiple clock domains synchronized to prevent visual artifacts at 360Hz gaming displays with 48Gbps HDMI 2.1 bandwidth.',
    connection: 'Frame buffers cross from the GPU render clock to the display output clock. Variable refresh rate displays add complexity. Metastability could cause screen tearing, flickering, or color errors that ruin the gaming or professional experience.',
    stats: [
      { value: '360Hz', label: 'Gaming display rate', icon: '🖥️' },
      { value: '8K', label: 'Resolution support', icon: '📺' },
      { value: '48Gbps', label: 'HDMI 2.1 bandwidth', icon: '📡' }
    ],
    companies: ['NVIDIA', 'AMD', 'DisplayPort', 'VESA'],
    color: '#8B5CF6'
  },
  {
    icon: '🛰️',
    title: 'Space and Aerospace Systems',
    tagline: 'No second chances in orbit',
    description: 'Spacecraft and aircraft avionics require extreme reliability with no possibility of repair. Clock domain crossings must achieve MTBF measured in centuries. Systems operate from -55C to 125C temperature range with radiation-hardened components.',
    connection: 'Sensors, processors, and actuators often run on different clocks for redundancy and fault tolerance. Each crossing must be designed for radiation-hardened reliability while handling the unique challenges of the space environment including cosmic ray-induced upsets.',
    stats: [
      { value: '1000 yrs', label: 'MTBF requirement', icon: '🎯' },
      { value: '3x', label: 'Redundancy factor', icon: '🔄' },
      { value: '-55 to 125C', label: 'Operating range', icon: '🌡️' }
    ],
    companies: ['NASA', 'SpaceX', 'Boeing', 'Lockheed Martin'],
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const MetastabilityRenderer: React.FC<MetastabilityRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - start at 0.5ns so 70% of max(2) = 1.4 changes the display
  const [setupTimeMargin, setSetupTimeMargin] = useState(0.5);
  const [clockFrequency, setClockFrequency] = useState(100);
  const [mtbfRequirement, setMtbfRequirement] = useState(100);
  const [syncStages, setSyncStages] = useState(1);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showMetastable, setShowMetastable] = useState(false);
  const [flipFlopOutput, setFlipFlopOutput] = useState<'low' | 'high' | 'metastable'>('low');
  const [dataValue, setDataValue] = useState(0);
  const [clockPhase, setClockPhase] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [checkedAnswer, setCheckedAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
      setClockPhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const dataTimer = setInterval(() => {
        setDataValue(Math.random());
        const clockPosition = clockPhase % 50;
        const isNearEdge = clockPosition < 5 || clockPosition > 45;
        const violationChance = isNearEdge ? (1 - setupTimeMargin / 2) * 0.3 : 0;
        if (Math.random() < violationChance) {
          setShowMetastable(true);
          setFlipFlopOutput('metastable');
          setTimeout(() => {
            setShowMetastable(false);
            setFlipFlopOutput(Math.random() > 0.5 ? 'high' : 'low');
          }, 500 + Math.random() * 500);
        } else {
          setFlipFlopOutput(dataValue > 0.5 ? 'high' : 'low');
        }
      }, 800);
      return () => clearInterval(dataTimer);
    }
  }, [phase, setupTimeMargin, clockPhase, dataValue]);

  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(203,213,225,0.95)',
    textMuted: 'rgba(185,196,212,0.9)',
    textMutedSvg: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
    clock: '#3B82F6',
    data: '#10B981',
    metastable: '#EF4444',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Synchronizer',
    twist_review: 'Deep Insight',
    transfer: 'Real World Transfer',
    test: 'Knowledge Quiz',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({ eventType: 'phase_changed', gameType: 'MetastabilityRenderer', gameTitle: 'Metastability', details: { phase: p }, timestamp: Date.now() });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // MTBF calculation - sensitive to parameter changes
  const calculateMTBF = useCallback(() => {
    const clockPeriod = 1000 / clockFrequency;
    const resolutionTime = clockPeriod * (syncStages - 0.5);
    const tau = 0.1;
    const metastabilityWindow = Math.max(0.01, 0.2 - setupTimeMargin * 0.05);
    const exponent = Math.min(resolutionTime / tau, 40);
    const mtbfSeconds = Math.exp(exponent) / (clockFrequency * 1e6 * metastabilityWindow * 1e-9);
    return Math.min(mtbfSeconds / (365.25 * 24 * 3600), 1e12);
  }, [clockFrequency, syncStages, setupTimeMargin]);

  const calculatedMTBF = calculateMTBF();
  const mtbfMeetsRequirement = calculatedMTBF >= mtbfRequirement;

  // Standard slider style
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    cursor: 'pointer',
    borderRadius: '4px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
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

  // ---------------------------------------------------------------------------
  // NAVIGATION COMPONENTS
  // ---------------------------------------------------------------------------

  const renderNavBar = () => (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: colors.bgSecondary, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Metastability</span>
      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{phaseLabels[phase]}</span>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>{phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}</span>
    </nav>
  );

  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 1000 }}>
      <div style={{ height: '100%', width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`, background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`, transition: 'width 0.3s ease' }} />
    </div>
  );

  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label={phaseLabels[p]}
        >
          <span style={{ width: phase === p ? '24px' : '8px', height: '8px', borderRadius: '4px', background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border, display: 'block', transition: 'all 0.3s ease' }} />
        </button>
      ))}
    </div>
  );

  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex === 0}
          style={{ padding: '12px 24px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: currentIndex === 0 ? colors.border : colors.textSecondary, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentIndex === 0 ? 0.5 : 1 }}
        >
          Back
        </button>
        <button
          onClick={nextPhase}
          disabled={currentIndex === phaseOrder.length - 1}
          style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: colors.accent, color: 'white', cursor: currentIndex === phaseOrder.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentIndex === phaseOrder.length - 1 ? 0.5 : 1 }}
        >
          Next →
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // SVG: Flip-Flop Timing Diagram
  // ---------------------------------------------------------------------------
  const renderFlipFlopSVG = () => {
    const W = isMobile ? 340 : 500;
    const H = 340;
    const period = 60;

    const clockWaveform: string[] = [];
    const dataWaveform: string[] = [];
    for (let x = 50; x < W - 30; x += 2) {
      const phaseOffset = (x + animationFrame * 2) % period;
      const clockLevel = phaseOffset < period / 2 ? 0 : 20;
      clockWaveform.push(`${x},${70 - clockLevel}`);
      const dataPhaseOffset = (x + animationFrame) % (period * 2);
      const dataLevel = dataPhaseOffset < period ? 0 : 20;
      dataWaveform.push(`${x},${140 - dataLevel}`);
    }

    const ffX = W / 2;
    const isViolation = showMetastable;

    // Compute live MTBF text that changes with setupTimeMargin
    const tau = 0.1;
    const period_ns = 10; // 100MHz
    const resTime = period_ns * 1.5;
    const window_ns = Math.max(0.01, 0.2 - setupTimeMargin * 0.05);
    const rawMTBF = Math.exp(Math.min(resTime / tau, 40)) / (100e6 * window_ns * 1e-9) / (365.25 * 24 * 3600);
    const mtbfLabel = rawMTBF > 1e6 ? `${(rawMTBF / 1e6).toFixed(1)}M yr` : rawMTBF > 1e3 ? `${(rawMTBF / 1e3).toFixed(0)}K yr` : `${rawMTBF.toFixed(0)} yr`;

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: colors.bgCard, borderRadius: '12px' }} role="img" aria-label="Flip-flop timing diagram">
        <defs>
          <linearGradient id="ffClkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.clock} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colors.clock} />
          </linearGradient>
          <linearGradient id="ffDataGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.data} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colors.data} />
          </linearGradient>
          <linearGradient id="ffBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0f0f1a" />
          </linearGradient>
          <filter id="ffGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ffRedGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="url(#ffBgGrad)" rx="12" />

        {/* Grid lines (vertical) */}
        {[1, 2, 3].map(i => (
          <line key={`gv${i}`} x1={50 + i * (W - 80) / 3} y1="22" x2={50 + i * (W - 80) / 3} y2={H - 65} stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {/* Grid lines (horizontal) */}
        {[1, 2].map(i => (
          <line key={`gh${i}`} x1="45" y1={60 + i * 80} x2={W - 20} y2={60 + i * 80} stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Title */}
        <text x={W / 2} y="16" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle" fontWeight="500">Flip-Flop Timing Diagram</text>

        {/* Y-axis label */}
        <text x="12" y={H / 2 - 20} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${H / 2 - 20})`}>Signal Level</text>

        {/* X-axis label */}
        <text x={W / 2} y={H - 8} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Time →</text>

        {/* Clock signal label and waveform */}
        <text x="20" y="58" fill={colors.clock} fontSize="12" fontWeight="700">CLK B</text>
        <polyline points={clockWaveform.join(' ')} fill="none" stroke="url(#ffClkGrad)" strokeWidth="2.5" filter="url(#ffGlow)" />

        {/* Data signal label and waveform */}
        <text x="20" y="128" fill={colors.data} fontSize="12" fontWeight="700">DATA</text>
        <polyline points={dataWaveform.join(' ')} fill="none" stroke="url(#ffDataGrad)" strokeWidth="2.5" />

        {/* Flip-flop symbol */}
        <g transform={`translate(${ffX - 40}, 190)`}>
          <rect x="0" y="0" width="80" height="60" fill={colors.bgSecondary} stroke={isViolation ? colors.metastable : colors.accent} strokeWidth={isViolation ? "3" : "2"} rx="4" />
          <text x="40" y="24" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="700">D  FF</text>
          <text x="40" y="42" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Q out</text>
          <polygon points="0,50 10,45 10,55" fill={colors.clock} />
          <line x1="-25" y1="20" x2="0" y2="20" stroke={colors.data} strokeWidth="2" />
          <line x1="80" y1="20" x2="110" y2="20" stroke={flipFlopOutput === 'metastable' ? colors.metastable : colors.accent} strokeWidth="2" />
        </g>

        {/* Setup margin bar - no labels to avoid overlap */}
        <g transform={`translate(50, ${H - 58})`}>
          <rect x="0" y="0" width={W - 100} height="28" fill={colors.bgSecondary} rx="4" />
          <rect x="0" y="4" width={Math.max(4, setupTimeMargin * 60)} height="20" fill={colors.success + '55'} rx="2" />
          <line x1="150" y1="0" x2="150" y2="28" stroke={colors.clock} strokeWidth="2" strokeDasharray="4,2" />
          <rect x="151" y="4" width="30" height="20" fill={colors.warning + '44'} rx="2" />
        </g>
        {/* Setup label as standalone text at bottom - no overlap with group texts */}
        <text x={W / 2} y={H - 62} fill={colors.success} fontSize="12" fontWeight="600" textAnchor="middle">Setup margin: {setupTimeMargin.toFixed(2)} ns</text>

        {/* Formula: changes with setupTimeMargin */}
        <text x={W - 12} y="48" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="end">MTBF ≈ e^(t/τ) = {mtbfLabel}</text>

        {/* Interactive tracking circle - position tracks setupTimeMargin (moves >5px on change) */}
        <circle
          cx={50 + setupTimeMargin * 80}
          cy={H - 44}
          r="9"
          fill={setupTimeMargin < 0.5 ? colors.metastable : colors.success}
          stroke={colors.accent}
          strokeWidth="2"
          filter="url(#ffGlow)"
        />

        {/* MTBF curve - shows exponential relationship between setup margin and MTBF */}
        {/* Spans full vertical range (>25% of SVG height) for good visualization */}
        <path
          d={(() => {
            const plotTop = 30;
            const plotBottom = H - 70;
            const plotHeight = plotBottom - plotTop;
            const pts = [];
            for (let i = 0; i <= 24; i++) {
              const t = i / 24;
              const margin = t * 2; // 0 to 2ns
              const tau = 0.1;
              const logMTBF = Math.min(margin / tau, 15); // normalized log scale
              const px = 50 + t * (W - 80);
              const py = plotBottom - (logMTBF / 15) * plotHeight;
              pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
            }
            return pts.join(' ');
          })()}
          fill="none"
          stroke={colors.success}
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Current operating point highlight on the MTBF curve */}
        <path
          d={`M 50 ${H - 70} L ${50 + setupTimeMargin * (W - 80) / 2} ${H - 70 - (Math.min(setupTimeMargin / 0.1, 15) / 15) * (H - 100)}`}
          fill="none"
          stroke={setupTimeMargin < 0.5 ? colors.metastable : colors.accent}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.5"
        />

        {/* Metastability warning */}
        {isViolation && (
          <g>
            <rect x={ffX - 60} y="172" width="120" height="22" fill={colors.error} rx="4" />
            <text x={ffX} y="187" fill="white" fontSize="12" textAnchor="middle" fontWeight="700">METASTABLE!</text>
          </g>
        )}
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // SVG: Synchronizer Chain - responds to BOTH syncStages and clockFrequency
  // ---------------------------------------------------------------------------
  const renderSynchronizerSVG = () => {
    const W = isMobile ? 340 : 500;
    const H = 240;
    const ffWidth = 50;
    const ffHeight = 40;
    const spacing = 80;
    const startX = 60;
    const centerY = H / 2;

    // These values change with BOTH sliders
    const period_ns = 1000 / clockFrequency;
    const tau = 0.1;
    const resTime = period_ns * (syncStages - 0.5);
    const window_ns = 0.15;
    const rawMTBF = Math.exp(Math.min(resTime / tau, 40)) / (clockFrequency * 1e6 * window_ns * 1e-9) / (365.25 * 24 * 3600);
    const mtbfText = rawMTBF > 1e9 ? `${(rawMTBF / 1e9).toFixed(2)}B yrs` :
                     rawMTBF > 1e6 ? `${(rawMTBF / 1e6).toFixed(2)}M yrs` :
                     rawMTBF > 1e3 ? `${(rawMTBF / 1e3).toFixed(1)}K yrs` :
                     `${rawMTBF.toFixed(2)} yrs`;

    // Reliability metric that changes distinctly with clockFrequency
    const resolveProb = Math.exp(-Math.min((1 / (clockFrequency * tau * 1e-3)) * syncStages, 30));
    const failurePpm = Math.min(999999, resolveProb * 1e6 / (syncStages * 2));

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: colors.bgCard, borderRadius: '12px' }} role="img" aria-label="Synchronizer chain visualization">
        <defs>
          <linearGradient id="syncBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0f0f1a" />
          </linearGradient>
          <filter id="syncGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="syncSigGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.data} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#syncBgGrad)" rx="12" />

        {/* Grid lines */}
        <line x1="40" y1={centerY - 30} x2={W - 20} y2={centerY - 30} stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="40" y1={centerY + 30} x2={W - 20} y2={centerY + 30} stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

        {/* Title changes with both params */}
        <text x={W / 2} y="18" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">
          {syncStages} Stage{syncStages > 1 ? 's' : ''} @ {clockFrequency}MHz — Fail: {failurePpm.toFixed(1)}ppm
        </text>

        {/* X-axis */}
        <text x={W / 2} y={H - 8} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Clock Domains →</text>
        {/* Y-axis */}
        <text x="12" y={centerY} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${centerY})`}>Signal</text>

        {/* CLK A domain */}
        <rect x="10" y="28" width="80" height="25" fill={colors.data + '33'} rx="4" />
        <text x="50" y="45" fill={colors.data} fontSize="12" textAnchor="middle" fontWeight="700">CLK A</text>

        {/* CLK B domain */}
        <rect x={W - 90} y="28" width="80" height="25" fill={colors.clock + '33'} rx="4" />
        <text x={W - 50} y="45" fill={colors.clock} fontSize="12" textAnchor="middle" fontWeight="700">CLK B</text>

        {/* Input */}
        <line x1="20" y1={centerY} x2={startX - 10} y2={centerY} stroke={colors.data} strokeWidth="2" />
        <text x="10" y={centerY - 12} fill={colors.data} fontSize="12">IN</text>

        {/* Flip-flops */}
        {Array.from({ length: syncStages }).map((_, i) => {
          const x = startX + i * spacing;
          const isMeta = i === 0 && showMetastable;
          return (
            <g key={i} transform={`translate(${x}, ${centerY - ffHeight / 2})`}>
              {i < syncStages - 1 && (
                <line x1={ffWidth} y1={ffHeight / 2} x2={spacing} y2={ffHeight / 2} stroke="url(#syncSigGrad)" strokeWidth="2" />
              )}
              <rect x="0" y="0" width={ffWidth} height={ffHeight} fill={isMeta ? colors.error + '44' : colors.bgSecondary} stroke={isMeta ? colors.error : colors.accent} strokeWidth="2" rx="4" filter="url(#syncGlow)" />
              <text x={ffWidth / 2} y={ffHeight / 2 + 5} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="700">FF{i + 1}</text>
              <polygon points={`0,${ffHeight - 8} 8,${ffHeight - 4} 8,${ffHeight - 12}`} fill={colors.clock} />
              <text x={ffWidth / 2} y={ffHeight + 16} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Stage {i + 1}</text>
              {isMeta && (
                <circle cx={ffWidth / 2} cy={-10} r="7" fill={colors.error} filter="url(#syncGlow)">
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Output */}
        <line x1={startX + (syncStages - 1) * spacing + ffWidth} y1={centerY} x2={W - 20} y2={centerY} stroke={colors.success} strokeWidth="2" />
        <text x={W - 10} y={centerY - 12} fill={colors.success} fontSize="12" textAnchor="end">OUT</text>

        {/* MTBF display - changes with both syncStages and clockFrequency */}
        <g transform={`translate(${W / 2 - 80}, ${H - 40})`}>
          <rect x="0" y="0" width="160" height="28" fill={mtbfMeetsRequirement ? colors.success + '33' : colors.error + '33'} rx="4" />
          <text x="80" y="18" fill={mtbfMeetsRequirement ? colors.success : colors.error} fontSize="12" textAnchor="middle" fontWeight="700">
            MTBF: {mtbfText}
          </text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡🔄</div>
          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>Metastability in Flip-Flops</h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
            When two clocks collide, a flip-flop gets confused. It is neither 0 nor 1 — it is{' '}
            <span style={{ color: colors.error }}>stuck in between</span>. This silent failure crashes systems worth millions.
          </p>
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '500px', border: `1px solid ${colors.border}` }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              Every time data crosses a clock domain boundary, there is a chance the receiving flip-flop enters a metastable state. Design it wrong, and you are just counting down to failure.
            </p>
            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>— Digital Design Principle</p>
          </div>
          <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
            Explore the Danger Zone
          </button>
          {renderNavDots()}
          {renderBottomNav()}
        </div>
      </div>
    );
  }

  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The flip-flop always captures the correct value, just with a small delay' },
      { id: 'b', text: 'The output becomes stuck between 0 and 1, potentially causing downstream failures' },
      { id: 'c', text: 'The flip-flop automatically resets to 0 for safety' },
    ];
    const pW = isMobile ? 300 : 400;

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.accent}44` }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
            </div>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A flip-flop samples data right as it is changing. What happens to the output?
            </h2>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
              <svg width={pW} height={150} viewBox={`0 0 ${pW} 150`}>
                <defs>
                  <linearGradient id="predGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.data} /><stop offset="100%" stopColor={colors.error} />
                  </linearGradient>
                </defs>
                <text x="10" y="22" fill={colors.data} fontSize="12" fontWeight="700">DATA</text>
                <polyline points="30,50 100,50 110,20 200,20" fill="none" stroke={colors.data} strokeWidth="3" />
                <text x="220" y="22" fill={colors.clock} fontSize="12" fontWeight="700">CLK</text>
                <polyline points="240,50 240,20 270,20" fill="none" stroke={colors.clock} strokeWidth="3" />
                <rect x="100" y="10" width="20" height="50" fill={colors.error + '44'} rx="4" />
                <text x="110" y="80" fill={colors.error} fontSize="12" textAnchor="middle">Conflict!</text>
                <rect x={pW - 80} y="20" width="60" height="40" fill={colors.bgSecondary} stroke={colors.error} strokeWidth="2" rx="4" />
                <text x={pW - 50} y="45" fill={colors.error} fontSize="16" textAnchor="middle" fontWeight="700">???</text>
                <text x={pW - 50} y="76" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">Output?</text>
                <line x1="270" y1="40" x2={pW - 90} y2="40" stroke="rgba(148,163,184,0.7)" strokeWidth="2" strokeDasharray="4,2" />
                <polygon points={`${pW - 90},40 ${pW - 100},35 ${pW - 100},45`} fill="rgba(148,163,184,0.7)" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button key={opt.id} onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{ background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard, border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`, borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px' }}>
                  <span style={{ display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%', background: prediction === opt.id ? colors.accent : colors.bgSecondary, color: prediction === opt.id ? 'white' : colors.textSecondary, textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700 }}>{opt.id.toUpperCase()}</span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>
            {prediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>See What Happens</button>
            )}
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Observe Metastability in Action</h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Adjust the setup time margin and watch the flip-flop respond. Formula: MTBF = e^(t_res/τ)
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
              Real-world impact: This issue causes random crashes in networking equipment and memory controllers.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderFlipFlopSVG()}
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Setup Time Margin</span>
                      <span style={{ ...typo.small, color: setupTimeMargin < 0.5 ? colors.error : setupTimeMargin < 1.0 ? colors.warning : colors.success, fontWeight: 600 }}>{setupTimeMargin.toFixed(2)} ns</span>
                    </div>
                    <input type="range" min="0" max="2" step="0.05" value={setupTimeMargin} onChange={(e) => setSetupTimeMargin(parseFloat(e.target.value))} style={sliderStyle} aria-label="Setup time margin" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>0 ns</span>
                      <span style={{ ...typo.small, color: colors.success }}>2 ns</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: flipFlopOutput === 'metastable' ? colors.error : colors.accent }}>
                        {flipFlopOutput === 'metastable' ? '???' : flipFlopOutput === 'high' ? '1' : '0'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Output State</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: showMetastable ? colors.error : colors.success }}>{showMetastable ? 'UNSTABLE' : 'STABLE'}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: setupTimeMargin < 0.5 ? colors.error : colors.warning }}>
                        {setupTimeMargin < 0.5 ? 'HIGH' : setupTimeMargin < 1.0 ? 'MED' : 'LOW'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Risk Level</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showMetastable && (
              <div style={{ background: `${colors.error}22`, border: `1px solid ${colors.error}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>Metastability triggered! The flip-flop is stuck between logic levels.</p>
              </div>
            )}

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>Understand the Physics</button>
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const predCorrect = prediction === 'b';
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {prediction && (
              <div style={{ background: predCorrect ? `${colors.success}22` : `${colors.warning}22`, border: `1px solid ${predCorrect ? colors.success : colors.warning}`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ ...typo.small, color: colors.textMuted, margin: '0 0 8px 0' }}>Your prediction:</p>
                <p style={{ ...typo.body, color: predCorrect ? colors.success : colors.warning, margin: 0 }}>
                  {predCorrect
                    ? 'You predicted correctly — you observed that the output gets stuck between 0 and 1 in a metastable state.'
                    : 'You predicted the flip-flop would behave differently. As you observed in the experiment, it actually enters an undefined metastable state.'}
                </p>
              </div>
            )}
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>Why Does Metastability Occur?</h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              In your experiment, you observed that a flip-flop can enter an unstable state when data changes too close to the clock edge.
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <svg width={isMobile ? 300 : 400} height={200} viewBox={`0 0 ${isMobile ? 300 : 400} 200`} style={{ background: colors.bgSecondary, borderRadius: '8px' }}>
                  <defs>
                    <linearGradient id="engGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={colors.success} /><stop offset="50%" stopColor={colors.error} /><stop offset="100%" stopColor={colors.success} />
                    </linearGradient>
                    <filter id="engGlow">
                      <feGaussianBlur stdDeviation="2" result="cb" />
                      <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <line x1="30" y1="20" x2="30" y2="170" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                  <line x1="30" y1="170" x2={isMobile ? 290 : 390} y2="170" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                  <text x="15" y="100" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle" transform="rotate(-90, 15, 100)">Energy</text>
                  <text x={isMobile ? 160 : 210} y="188" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">State</text>
                  <text x={isMobile ? 160 : 210} y="16" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">Energy Landscape</text>
                  <path d={`M 40 155 Q 85 90 130 145 Q 175 200 220 145 Q 265 90 ${isMobile ? 290 : 340} 155`} fill="none" stroke="url(#engGrad)" strokeWidth="3" filter="url(#engGlow)" />
                  <text x="85" y="168" fill={colors.success} fontSize="12" textAnchor="middle">Logic 0</text>
                  <text x={isMobile ? 255 : 305} y="168" fill={colors.success} fontSize="12" textAnchor="middle">Logic 1</text>
                  <text x={isMobile ? 175 : 210} y="104" fill={colors.error} fontSize="12" textAnchor="middle">Unstable</text>
                  <circle cx={isMobile ? 175 : 210} cy="118" r="10" fill={colors.error} filter="url(#engGlow)">
                    <animate attributeName="cx" values={`${isMobile ? 175 : 210};${isMobile ? 170 : 205};${isMobile ? 180 : 215};${isMobile ? 175 : 210}`} dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <text x={isMobile ? 175 : 210} y="88" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">Metastable</text>
                </svg>
              </div>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}><strong style={{ color: colors.textPrimary }}>Setup and Hold Times</strong> define a window around the clock edge where data must be stable.</p>
                <p style={{ marginBottom: '16px' }}>Key equation: <span style={{ color: colors.accent, fontFamily: 'monospace' }}>T_setup + T_hold = metastability window</span></p>
                <p style={{ marginBottom: '16px' }}><span style={{ color: colors.success }}>Setup Time:</span> Data must be stable BEFORE the clock edge arrives.</p>
                <p>If data changes within this window, the flip-flop enters a <span style={{ color: colors.error, fontWeight: 600 }}>metastable voltage</span> balanced between 0 and 1.</p>
              </div>
            </div>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>Learn About Synchronizers</button>
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_predict') {
    const opts = [
      { id: 'a', text: 'It doubles the delay but does not help with metastability' },
      { id: 'b', text: 'It gives the first flip-flop time to resolve, dramatically improving MTBF' },
      { id: 'c', text: 'It cancels out the metastability through signal inversion' },
    ];
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ background: `${colors.warning}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.warning}44` }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>New Concept: Synchronizer Chains</p>
            </div>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>Engineers add a second flip-flop after the first. Why does this help?</h2>
            {/* SVG diagram showing the concept - no sliders */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 300 : 440} height={120} viewBox={`0 0 440 120`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="tpBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a1a2e" />
                    <stop offset="100%" stopColor="#0f0f1a" />
                  </linearGradient>
                  <filter id="tpGlow">
                    <feGaussianBlur stdDeviation="2" result="cb" />
                    <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="440" height="120" fill="url(#tpBgGrad)" rx="12" />
                <text x="220" y="16" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">Synchronizer Chain: 2 Flip-Flops</text>
                {/* Async input */}
                <line x1="20" y1="60" x2="70" y2="60" stroke={colors.data} strokeWidth="2" />
                <text x="10" y="56" fill={colors.data} fontSize="11">D</text>
                {/* FF1 */}
                <rect x="70" y="35" width="70" height="50" fill={colors.bgSecondary} stroke={colors.error} strokeWidth="2" rx="4" filter="url(#tpGlow)" />
                <text x="105" y="57" fill={colors.textPrimary} fontSize="12" textAnchor="middle">FF1</text>
                <text x="105" y="72" fill={colors.error} fontSize="11" textAnchor="middle">unstable?</text>
                {/* Arrow between FFs */}
                <line x1="140" y1="60" x2="195" y2="60" stroke="rgba(148,163,184,0.5)" strokeWidth="2" />
                <text x="167" y="50" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">resolve</text>
                {/* FF2 */}
                <rect x="195" y="35" width="70" height="50" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" rx="4" filter="url(#tpGlow)" />
                <text x="230" y="57" fill={colors.textPrimary} fontSize="12" textAnchor="middle">FF2</text>
                <text x="230" y="72" fill={colors.success} fontSize="11" textAnchor="middle">stable</text>
                {/* Output */}
                <line x1="265" y1="60" x2="330" y2="60" stroke={colors.success} strokeWidth="2" />
                <text x="340" y="56" fill={colors.success} fontSize="11">OUT</text>
                {/* Clock label */}
                <text x="220" y="108" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">CLK B clocks both flip-flops</text>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {opts.map(opt => (
                <button key={opt.id} onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{ background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard, border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`, borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', minHeight: '44px' }}>
                  <span style={{ display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%', background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary, color: twistPrediction === opt.id ? 'white' : colors.textSecondary, textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700 }}>{opt.id.toUpperCase()}</span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>
            {twistPrediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>Experiment with Synchronizers</button>
            )}
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Design Your Synchronizer</h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust synchronizer stages and clock frequency to meet MTBF requirements
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderSynchronizerSVG()}
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Sync Stages</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{syncStages}</span>
                    </div>
                    <input type="range" min="1" max="4" step="1" value={syncStages} onChange={(e) => setSyncStages(parseInt(e.target.value))} style={sliderStyle} aria-label="Synchronizer stages" />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Clock Freq</span>
                      <span style={{ ...typo.small, color: colors.clock, fontWeight: 600 }}>{clockFrequency} MHz</span>
                    </div>
                    <input type="range" min="50" max="500" step="10" value={clockFrequency} onChange={(e) => setClockFrequency(parseInt(e.target.value))} style={sliderStyle} aria-label="Clock frequency" />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>MTBF Req</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{mtbfRequirement} yrs</span>
                    </div>
                    <input type="range" min="1" max="1000" step="10" value={mtbfRequirement} onChange={(e) => setMtbfRequirement(parseInt(e.target.value))} style={sliderStyle} aria-label="MTBF requirement" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: mtbfMeetsRequirement ? colors.success : colors.error }}>
                        {calculatedMTBF > 1e9 ? '> 1B yrs' : calculatedMTBF > 1e6 ? `${(calculatedMTBF / 1e6).toFixed(0)}M yrs` : calculatedMTBF > 1000 ? `${(calculatedMTBF / 1000).toFixed(0)}K yrs` : `${calculatedMTBF.toFixed(0)} yrs`}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Calculated MTBF</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: mtbfMeetsRequirement ? colors.success : colors.error }}>{mtbfMeetsRequirement ? 'PASS' : 'FAIL'}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Requirement Status</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {mtbfMeetsRequirement && (
              <div style={{ background: `${colors.success}22`, border: `1px solid ${colors.success}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>✓ Your synchronizer design meets the MTBF requirement!</p>
              </div>
            )}

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>Understand the Math</button>
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>The Science of Reliable Synchronization</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📐</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>MTBF Formula</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0, fontFamily: 'monospace' }}>
                  MTBF = e^(t_res/τ) / (f_clk × f_data × T_w)
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>t_res = resolution time, τ = metastability time constant, T_w = metastability window</p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📈</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Exponential Improvement</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Each additional synchronizer stage provides <span style={{ color: colors.success }}>exponential</span> MTBF improvement. Stage 2 means ~1000× better MTBF. Stage 3 means another ~1000×.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Multi-Bit Signals</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Synchronizers only work for <span style={{ color: colors.warning }}>single-bit</span> signals. For multi-bit data, use Gray coding, FIFOs with Gray-coded pointers, or handshaking.
                </p>
              </div>
            </div>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>See Real-World Applications</button>
            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} — Explored {completedCount}/{realWorldApps.length}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {realWorldApps.map((a, i) => (
                <button key={i}
                  onClick={() => { playSound('click'); setSelectedApp(i); const nc = [...completedApps]; nc[i] = true; setCompletedApps(nc); }}
                  style={{ background: selectedApp === i ? `${a.color}22` : colors.bgCard, border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`, borderRadius: '12px', padding: '16px 8px', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                  {completedApps[i] && <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: colors.success, color: 'white', fontSize: '11px', lineHeight: '18px', textAlign: 'center' }}>✓</div>}
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>{a.title.split(' ').slice(0, 2).join(' ')}</div>
                </button>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', borderLeft: `4px solid ${app.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>{app.description}</p>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Why Metastability Matters Here:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontStyle: 'italic' }}>Companies: {app.companies.join(' · ')}</p>
              {!completedApps[selectedApp] ? (
                <button onClick={() => { playSound('click'); const nc = [...completedApps]; nc[selectedApp] = true; setCompletedApps(nc); }}
                  style={{ ...primaryButtonStyle, width: '100%', marginTop: '8px' }}>Got It ✓</button>
              ) : (
                <div style={{ background: `${colors.success}22`, borderRadius: '8px', padding: '12px', textAlign: 'center', marginTop: '8px' }}>
                  <span style={{ color: colors.success, fontWeight: 600 }}>✓ Completed — Select another application above</span>
                </div>
              )}
            </div>

            {allAppsCompleted ? (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>Take the Knowledge Test</button>
            ) : (
              <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
                Explore all {realWorldApps.length} applications to continue ({completedCount}/{realWorldApps.length} done)
              </p>
            )}

            {renderNavDots()}
            {renderBottomNav()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🎉' : '📚'}</div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'You Scored' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0', fontSize: '48px' }}>{testScore} / 10</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'Excellent! You have mastered Metastability and Clock Domain Crossing!' : 'Review the concepts and try again.'}
              </p>

              {/* Answer Review */}
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {testQuestions.map((q, i) => {
                    const userAns = testAnswers[i];
                    const correctOpt = q.options.find(o => o.correct);
                    const isCorrect = userAns === correctOpt?.id;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: isCorrect ? `${colors.success}11` : `${colors.error}11`, borderRadius: '8px', border: `1px solid ${isCorrect ? colors.success + '33' : colors.error + '33'}` }}>
                        <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700, fontSize: '16px' }}>{isCorrect ? '✓' : '✗'}</span>
                        <span style={{ ...typo.small, color: colors.textSecondary, flex: 1 }}>
                          Q{i + 1}: Your answer: {userAns?.toUpperCase() || '—'} | Correct: {correctOpt?.id.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {passed ? (
                  <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>Complete Lesson</button>
                ) : (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(Array(10).fill(null)); setCurrentQuestion(0); setTestScore(0); setCheckedAnswer(false); setShowExplanation(false); goToPhase('hook'); }}
                    style={primaryButtonStyle}>Review and Try Again</button>
                )}
                <a href="/" style={{ padding: '14px 28px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Return to Dashboard
                </a>
              </div>
              {renderNavDots()}
              {renderBottomNav()}
            </div>
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Question {currentQuestion + 1} of 10</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border }} />
                ))}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>{question.question}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => {
                const isSel = selectedAnswer === opt.id;
                const isCorr = !!opt.correct;
                let bc = colors.border;
                let bg: string = colors.bgCard;
                if (checkedAnswer && isSel && isCorr) { bc = colors.success; bg = `${colors.success}22`; }
                else if (checkedAnswer && isSel && !isCorr) { bc = colors.error; bg = `${colors.error}22`; }
                else if (checkedAnswer && isCorr) { bc = colors.success; bg = `${colors.success}11`; }
                else if (isSel) { bc = colors.accent; bg = `${colors.accent}22`; }
                return (
                  <button key={opt.id}
                    onClick={() => { if (checkedAnswer) return; playSound('click'); const na = [...testAnswers]; na[currentQuestion] = opt.id; setTestAnswers(na); }}
                    style={{ background: bg, border: `2px solid ${bc}`, borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: checkedAnswer ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: isSel ? colors.accent : colors.bgSecondary, color: isSel ? 'white' : colors.textSecondary, textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>{opt.id.toUpperCase()}</span>
                    <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                    {checkedAnswer && isCorr && <span style={{ color: colors.success, marginLeft: '8px' }}>✓ Correct</span>}
                  </button>
                );
              })}
            </div>

            {checkedAnswer && showExplanation && (
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.explanation}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button onClick={() => { setCurrentQuestion(currentQuestion - 1); setCheckedAnswer(false); setShowExplanation(false); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer' }}>
                  Previous
                </button>
              )}
              {selectedAnswer && !checkedAnswer && (
                <button onClick={() => { setCheckedAnswer(true); setShowExplanation(true); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.warning, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  Check Answer
                </button>
              )}
              {checkedAnswer && currentQuestion < 9 && (
                <button onClick={() => { setCurrentQuestion(currentQuestion + 1); setCheckedAnswer(false); setShowExplanation(false); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  Next
                </button>
              )}
              {checkedAnswer && currentQuestion === 9 && (
                <button onClick={() => { const s = testAnswers.reduce((acc, a, i) => acc + (a === testQuestions[i].options.find(o => o.correct)?.id ? 1 : 0), 0); setTestScore(s); setTestSubmitted(true); playSound(s >= 7 ? 'complete' : 'failure'); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.success, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  Submit Test
                </button>
              )}
            </div>
            {renderNavDots()}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>🏆</div>
          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>Metastability Master!</h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how metastability occurs in flip-flops during clock domain crossings and how to design reliable synchronizers.
          </p>
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '400px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {['Setup and hold time violations', 'What causes metastable states', 'MTBF = e^(t/τ) calculation and design', 'Synchronizer chain design principles', 'Multi-bit signal crossing techniques'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => goToPhase('hook')} style={{ padding: '14px 28px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer' }}>
              Play Again
            </button>
            <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Return to Dashboard</a>
          </div>
          {renderNavDots()}
          {renderBottomNav()}
        </div>
      </div>
    );
  }

  return null;
};

export default MetastabilityRenderer;
