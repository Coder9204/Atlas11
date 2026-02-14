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
// TEST QUESTIONS - 10 scenario-based multiple choice questions
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
    explanation: "When data crosses between clock domains, the receiving flip-flop may sample the input during its setup or hold time window. This causes metastability - the flip-flop enters an unstable state between 0 and 1, potentially resolving to an incorrect value or taking too long to resolve."
  },
  {
    scenario: "An engineer adds a second flip-flop in series after the first one in a clock domain crossing circuit. The system failures drop by a factor of 1000.",
    question: "Why does adding a second flip-flop dramatically improve reliability?",
    options: [
      { id: 'a', label: "The second flip-flop filters out electrical noise from the first" },
      { id: 'b', label: "It gives the first flip-flop more time to resolve before the output is used", correct: true },
      { id: 'c', label: "Two flip-flops share the current load, reducing stress" },
      { id: 'd', label: "The second flip-flop corrects any errors from the first" }
    ],
    explanation: "A synchronizer chain (two or more flip-flops in series) provides extra clock cycles for the first flip-flop to resolve from a metastable state. The probability of metastability propagating through each additional flip-flop decreases exponentially, greatly improving MTBF."
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
    explanation: "With data arriving 0.2ns before the clock edge but requiring 0.5ns setup time, there's a setup time violation. The flip-flop doesn't have enough time to properly latch the data, potentially entering a metastable state where the output is undefined."
  },
  {
    scenario: "A design team increases the clock frequency from 100 MHz to 200 MHz in their FPGA. They notice the MTBF for clock domain crossings drops from 100 years to 6 months.",
    question: "Why does doubling the clock frequency have such a dramatic effect on MTBF?",
    options: [
      { id: 'a', label: "Higher frequency creates more electromagnetic interference" },
      { id: 'b', label: "The resolution time available per clock cycle is halved, exponentially increasing failure rate", correct: true },
      { id: 'c', label: "The power supply cannot keep up with faster switching" },
      { id: 'd', label: "More clock edges means more data is transferred" }
    ],
    explanation: "MTBF depends exponentially on the resolution time available. At 200 MHz (5ns period), flip-flops have half the time to resolve compared to 100 MHz (10ns period). This exponential relationship means halving resolution time can reduce MTBF by orders of magnitude."
  },
  {
    scenario: "A chip designer is choosing between two flip-flop designs: one with faster switching but higher metastability window, and another with slower switching but lower metastability window.",
    question: "For a clock domain crossing synchronizer, which flip-flop is better?",
    options: [
      { id: 'a', label: "The faster flip-flop because it can keep up with higher frequencies" },
      { id: 'b', label: "The flip-flop with lower metastability window for better MTBF", correct: true },
      { id: 'c', label: "Both are equivalent - speed and metastability window don't affect CDC" },
      { id: 'd', label: "Neither - only external components matter for CDC" }
    ],
    explanation: "For synchronizers, the metastability resolution characteristics are more important than raw speed. A flip-flop with a smaller metastability window and faster resolution time constant will achieve much better MTBF, even if its nominal switching speed is slightly slower."
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
    explanation: "Asynchronous resets crossing clock domains can cause metastability just like data. The reset should be synchronized, and more importantly, its deassertion (release) must be synchronous to prevent some registers from coming out of reset one cycle before others."
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
    explanation: "With binary counters, multiple bits can change simultaneously (e.g., 0111 to 1000 changes all 4 bits). If these bits are sampled by the other clock domain at slightly different times, a completely wrong value could be captured. Gray code only changes one bit per increment, so the worst case is being off by one."
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
    explanation: "While each individual bit is properly synchronized, there's no guarantee they all resolve in the same clock cycle. Some bits might take an extra cycle to resolve, resulting in a corrupted multi-bit value. For multi-bit signals, use handshaking, FIFOs, or gray code encoding."
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
    explanation: "Lower temperatures improve transistor performance, reducing the metastability time constant (tau). This means flip-flops resolve faster from metastable states, significantly improving MTBF. Many MTBF calculations use worst-case (high temperature) conditions to be conservative."
  },
  {
    scenario: "A software engineer is debugging a race condition that appears randomly about once per week in a multi-processor system. Adding debug prints makes the bug disappear.",
    question: "How might this be related to metastability?",
    options: [
      { id: 'a', label: "Debug prints add enough delay to mask a clock domain crossing issue", correct: true },
      { id: 'b', label: "The prints fix memory corruption in the processor cache" },
      { id: 'c', label: "Metastability only occurs in hardware, never in software systems" },
      { id: 'd', label: "The bug is unrelated to metastability - it's a pure software issue" }
    ],
    explanation: "Multi-processor systems have hardware synchronization between cores. A metastability failure could cause corrupted data or control signals between processors. Adding debug prints changes timing enough that the synchronizer has more time to resolve, hiding the underlying hardware issue."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'High-Speed Networking',
    short: 'Routers and switches processing packets',
    tagline: 'Every packet crosses clock domains',
    description: 'Network processors in routers and switches operate with multiple clock domains - PHY interfaces, packet processors, memory controllers, and CPU cores all run at different frequencies. Proper synchronization prevents packet corruption and system crashes.',
    connection: 'When a packet arrives at a network port, its data crosses from the PHY clock domain to the processing clock domain. Without proper synchronizers, metastability could corrupt packet headers, causing misrouting or dropped connections.',
    howItWorks: 'High-speed network chips use carefully designed async FIFOs with gray-coded pointers for data crossing. Control signals use multi-stage synchronizers. Critical paths are analyzed for MTBF requirements, often targeting 100+ years for carrier-grade equipment.',
    stats: [
      { value: '400Gbps', label: 'Modern port speeds', icon: '⚡' },
      { value: '100+ yrs', label: 'MTBF requirement', icon: '🎯' },
      { value: '5-7', label: 'Clock domains per chip', icon: '🔄' }
    ],
    examples: ['Data center switches', 'Internet backbone routers', '5G base stations', 'Ethernet controllers'],
    companies: ['Cisco', 'Broadcom', 'Marvell', 'Intel'],
    futureImpact: 'As network speeds increase to 800Gbps and beyond, synchronizer design becomes even more critical with tighter timing margins.',
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'Memory Controllers',
    short: 'DDR interfaces between CPU and RAM',
    tagline: 'Bridging processor and memory speeds',
    description: 'Memory controllers translate between the CPU clock domain and the DDR memory clock domain. DDR5 memory operates at different frequencies than the processor, requiring careful clock domain crossing for reliable data transfer.',
    connection: 'Every memory read and write crosses clock boundaries. The memory controller must synchronize address, data, and control signals while meeting strict timing requirements. Metastability here could corrupt data stored in RAM.',
    howItWorks: 'Memory controllers use DLL/PLL-based clock alignment, specialized synchronization FIFOs, and training sequences to calibrate timing. Read data uses delay-locked loops to center the sampling point in the data eye.',
    stats: [
      { value: '6400MT/s', label: 'DDR5 transfer rate', icon: '💨' },
      { value: '<1ps', label: 'Timing margin', icon: '⏱️' },
      { value: '10^18', label: 'Ops without error', icon: '✓' }
    ],
    examples: ['CPU integrated memory controllers', 'GPU GDDR interfaces', 'Server DIMMs', 'LPDDR in phones'],
    companies: ['Intel', 'AMD', 'Samsung', 'Micron'],
    futureImpact: 'DDR6 and beyond will push timing margins even tighter, requiring advanced synchronization techniques and possibly new memory architectures.',
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Video and Display Systems',
    short: 'Graphics rendering and display output',
    tagline: 'Pixels crossing timing boundaries',
    description: 'GPUs generate frames at variable rates while displays operate at fixed refresh rates. Video capture, processing, and output involve multiple clock domains that must be synchronized to prevent visual artifacts.',
    connection: 'Frame buffers cross from the GPU render clock to the display output clock. Variable refresh rate displays add complexity as the display clock must adapt. Metastability could cause screen tearing, flickering, or color errors.',
    howItWorks: 'Display controllers use line buffers and frame buffers as synchronization boundaries. Async FIFOs smooth out timing differences. VSync signals are carefully synchronized to prevent tearing while minimizing input latency.',
    stats: [
      { value: '360Hz', label: 'Gaming display rate', icon: '🖥️' },
      { value: '8K', label: 'Resolution support', icon: '📺' },
      { value: '48Gbps', label: 'HDMI 2.1 bandwidth', icon: '📡' }
    ],
    examples: ['Gaming monitors', 'Video editing workstations', 'Streaming encoders', 'VR headsets'],
    companies: ['NVIDIA', 'AMD', 'DisplayPort', 'VESA'],
    futureImpact: 'As VR demands 120Hz+ at 4K per eye with minimal latency, synchronization between render and display becomes critical for comfortable viewing.',
    color: '#8B5CF6'
  },
  {
    icon: '🛰️',
    title: 'Space and Aerospace Systems',
    short: 'Mission-critical synchronization',
    tagline: 'No second chances in orbit',
    description: 'Spacecraft and aircraft avionics require extreme reliability with no possibility of repair. Clock domain crossings in these systems must achieve MTBF measured in centuries, as a single metastability failure could be catastrophic.',
    connection: 'Sensors, processors, and actuators often run on different clocks for redundancy and fault tolerance. Each crossing must be designed for radiation-hardened reliability while handling the unique challenges of the space environment.',
    howItWorks: 'Space-grade synchronizers use triple modular redundancy (TMR), radiation-hardened flip-flops, and conservative timing margins. Multiple independent clock sources prevent single points of failure. MTBF analysis is mandatory for certification.',
    stats: [
      { value: '1000 yrs', label: 'MTBF requirement', icon: '🎯' },
      { value: '3x', label: 'Redundancy factor', icon: '🔄' },
      { value: '-55 to 125C', label: 'Operating range', icon: '🌡️' }
    ],
    examples: ['Satellite attitude control', 'Rocket engine controllers', 'Aircraft fly-by-wire', 'Mars rovers'],
    companies: ['NASA', 'SpaceX', 'Boeing', 'Lockheed Martin'],
    futureImpact: 'Long-duration deep space missions require synchronizers that maintain reliability for decades without maintenance or updates.',
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

  // Simulation state
  const [setupTimeMargin, setSetupTimeMargin] = useState(1.0); // ns
  const [clockFrequency, setClockFrequency] = useState(100); // MHz
  const [mtbfRequirement, setMtbfRequirement] = useState(100); // years
  const [syncStages, setSyncStages] = useState(2); // number of synchronizer stages
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
      setClockPhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Simulate data transitions and metastability
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const dataTimer = setInterval(() => {
        setDataValue(Math.random());
        // Simulate metastability when data changes near clock edge
        const clockPosition = clockPhase % 50; // 0-49 within a clock cycle
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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for digital/electronics theme
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Updated for better contrast
    textMuted: '#94a3b8', // Updated for better contrast
    border: '#2a2a3a',
    clock: '#3B82F6', // Blue for clock signals
    data: '#10B981', // Green for data signals
    metastable: '#EF4444', // Red for metastable state
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
    twist_play: 'Synchronizer Lab',
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

  // Calculate MTBF based on parameters
  const calculateMTBF = useCallback(() => {
    // Simplified MTBF calculation
    // MTBF = 1 / (f_clk * f_data * T_window) * e^(T_resolution / tau)
    const clockPeriod = 1000 / clockFrequency; // ns
    const resolutionTime = clockPeriod * (syncStages - 0.5); // Available resolution time
    const tau = 0.1; // Metastability time constant (ns) - technology dependent
    const metastabilityWindow = 0.2 - (setupTimeMargin * 0.05); // ns

    // Exponential improvement with resolution time
    const exponent = resolutionTime / tau;
    const mtbfSeconds = Math.exp(Math.min(exponent, 50)) / (clockFrequency * 1e6 * metastabilityWindow * 1e-9);
    const mtbfYears = mtbfSeconds / (365.25 * 24 * 3600);

    return Math.min(mtbfYears, 1e15); // Cap at reasonable maximum
  }, [clockFrequency, syncStages, setupTimeMargin]);

  const calculatedMTBF = calculateMTBF();
  const mtbfMeetsRequirement = calculatedMTBF >= mtbfRequirement;

  // Flip-flop and Clock Domain Visualization
  const FlipFlopVisualization = ({ interactive = false }) => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 300 : 350;

    const clockY = 80;
    const dataY = 150;
    const outputY = 220;
    const ffX = width / 2;

    // Generate clock waveform points
    const clockWaveform: string[] = [];
    const dataWaveform: string[] = [];
    const period = 60;

    for (let x = 50; x < width - 30; x += 2) {
      const phaseOffset = (x + animationFrame * 2) % period;
      const clockLevel = phaseOffset < period / 2 ? 0 : 20;
      clockWaveform.push(`${x},${clockY - clockLevel}`);

      // Data changes less frequently
      const dataPhaseOffset = (x + animationFrame) % (period * 2);
      const dataLevel = dataPhaseOffset < period ? 0 : 20;
      dataWaveform.push(`${x},${dataY - dataLevel}`);
    }

    // Detect timing violation zone (near clock edge)
    const violationZoneX = 50 + ((animationFrame * 2) % period);
    const isInViolationZone = showMetastable;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Clock signal label and waveform */}
        <text x="20" y={clockY - 25} fill={colors.clock} fontSize="12" fontWeight="600">CLK B</text>
        <polyline
          points={clockWaveform.join(' ')}
          fill="none"
          stroke={colors.clock}
          strokeWidth="2"
        />

        {/* Data signal label and waveform */}
        <text x="20" y={dataY - 25} fill={colors.data} fontSize="12" fontWeight="600">DATA</text>
        <polyline
          points={dataWaveform.join(' ')}
          fill="none"
          stroke={colors.data}
          strokeWidth="2"
        />

        {/* Flip-flop symbol */}
        <g transform={`translate(${ffX - 40}, ${outputY - 30})`}>
          <rect
            x="0"
            y="0"
            width="80"
            height="60"
            fill={colors.bgSecondary}
            stroke={isInViolationZone ? colors.metastable : colors.accent}
            strokeWidth={isInViolationZone ? "3" : "2"}
            rx="4"
            style={{
              filter: isInViolationZone ? `drop-shadow(0 0 10px ${colors.metastable})` : 'none',
              animation: isInViolationZone ? 'shake 0.1s infinite' : 'none'
            }}
          />
          <text x="40" y="25" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="600">D  FF</text>
          <text x="40" y="42" fill={colors.textMuted} fontSize="10" textAnchor="middle">Q</text>

          {/* Clock input triangle */}
          <polygon points="0,50 10,45 10,55" fill={colors.clock} />

          {/* D input */}
          <line x1="-20" y1="20" x2="0" y2="20" stroke={colors.data} strokeWidth="2" />
          <text x="-25" y="24" fill={colors.data} fontSize="10" textAnchor="end">D</text>

          {/* Q output */}
          <line x1="80" y1="20" x2="100" y2="20" stroke={flipFlopOutput === 'metastable' ? colors.metastable : colors.accent} strokeWidth="2" />
          <text x="105" y="24" fill={colors.accent} fontSize="10">Q</text>
        </g>

        {/* Output state indicator */}
        <g transform={`translate(${ffX + 70}, ${outputY - 10})`}>
          <rect
            x="0"
            y="0"
            width="60"
            height="30"
            fill={flipFlopOutput === 'metastable' ? colors.metastable :
                  flipFlopOutput === 'high' ? colors.success : colors.bgSecondary}
            stroke={colors.border}
            strokeWidth="1"
            rx="4"
          />
          <text
            x="30"
            y="20"
            fill={flipFlopOutput === 'metastable' ? 'white' : colors.textPrimary}
            fontSize="12"
            textAnchor="middle"
            fontWeight="600"
          >
            {flipFlopOutput === 'metastable' ? '???' : flipFlopOutput === 'high' ? '1' : '0'}
          </text>
        </g>

        {/* Setup/Hold time visualization */}
        <g transform={`translate(50, ${height - 50})`}>
          <rect x="0" y="0" width={width - 100} height="30" fill={colors.bgSecondary} rx="4" />

          {/* Setup time region */}
          <rect x="0" y="5" width={(setupTimeMargin / 2) * 80} height="20" fill={colors.success + '44'} rx="2" />
          <text x="5" y="18" fill={colors.success} fontSize="9">Setup: {setupTimeMargin.toFixed(1)}ns</text>

          {/* Clock edge marker */}
          <line x1="120" y1="0" x2="120" y2="30" stroke={colors.clock} strokeWidth="2" strokeDasharray="4,2" />
          <text x="125" y="12" fill={colors.clock} fontSize="9">CLK Edge</text>

          {/* Hold time region */}
          <rect x="120" y="5" width="40" height="20" fill={colors.warning + '44'} rx="2" />
          <text x="125" y="18" fill={colors.warning} fontSize="9">Hold</text>

          {/* Danger zone */}
          {setupTimeMargin < 0.5 && (
            <rect x={(setupTimeMargin / 2) * 80} y="5" width={120 - (setupTimeMargin / 2) * 80} height="20" fill={colors.error + '44'} rx="2" />
          )}
        </g>

        {/* Metastability warning */}
        {isInViolationZone && (
          <g>
            <rect x={ffX - 60} y={outputY + 40} width="120" height="24" fill={colors.error} rx="4" />
            <text x={ffX} y={outputY + 56} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
              METASTABLE!
            </text>
          </g>
        )}

        {/* Animation keyframes for shake */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
          }
        `}</style>
      </svg>
    );
  };

  // Synchronizer Chain Visualization
  const SynchronizerChainVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 200 : 220;
    const ffWidth = 50;
    const ffHeight = 40;
    const spacing = 80;
    const startX = 60;
    const centerY = height / 2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Clock domain A label */}
        <rect x="10" y="20" width="80" height="25" fill={colors.data + '33'} rx="4" />
        <text x="50" y="37" fill={colors.data} fontSize="11" textAnchor="middle" fontWeight="600">CLK A</text>

        {/* Clock domain B label */}
        <rect x={width - 90} y="20" width="80" height="25" fill={colors.clock + '33'} rx="4" />
        <text x={width - 50} y="37" fill={colors.clock} fontSize="11" textAnchor="middle" fontWeight="600">CLK B</text>

        {/* Input signal */}
        <line x1="20" y1={centerY} x2={startX - 10} y2={centerY} stroke={colors.data} strokeWidth="2" />
        <text x="10" y={centerY - 10} fill={colors.data} fontSize="10">IN</text>

        {/* Synchronizer flip-flops */}
        {Array.from({ length: syncStages }).map((_, i) => {
          const x = startX + i * spacing;
          const isFirst = i === 0;
          const metastabilityLevel = isFirst && showMetastable ? 1 : 0;

          return (
            <g key={i} transform={`translate(${x}, ${centerY - ffHeight/2})`}>
              {/* Connection line to next FF or output */}
              {i < syncStages - 1 && (
                <line x1={ffWidth} y1={ffHeight/2} x2={spacing} y2={ffHeight/2} stroke={colors.accent} strokeWidth="2" />
              )}

              {/* Flip-flop */}
              <rect
                x="0"
                y="0"
                width={ffWidth}
                height={ffHeight}
                fill={metastabilityLevel > 0 ? colors.error + '44' : colors.bgSecondary}
                stroke={metastabilityLevel > 0 ? colors.error : colors.accent}
                strokeWidth="2"
                rx="4"
              />
              <text x={ffWidth/2} y={ffHeight/2 + 4} fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="600">
                FF{i + 1}
              </text>

              {/* Clock input */}
              <polygon points={`0,${ffHeight - 8} 8,${ffHeight - 4} 8,${ffHeight - 12}`} fill={colors.clock} />

              {/* Stage label */}
              <text x={ffWidth/2} y={ffHeight + 15} fill={colors.textMuted} fontSize="9" textAnchor="middle">
                Stage {i + 1}
              </text>

              {/* Metastability indicator */}
              {metastabilityLevel > 0 && (
                <circle cx={ffWidth/2} cy={-10} r="6" fill={colors.error}>
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Output signal */}
        <line
          x1={startX + (syncStages - 1) * spacing + ffWidth}
          y1={centerY}
          x2={width - 20}
          y2={centerY}
          stroke={colors.success}
          strokeWidth="2"
        />
        <text x={width - 10} y={centerY - 10} fill={colors.success} fontSize="10">OUT</text>

        {/* MTBF improvement indicator */}
        <g transform={`translate(${width/2 - 60}, ${height - 35})`}>
          <rect x="0" y="0" width="120" height="25" fill={mtbfMeetsRequirement ? colors.success + '33' : colors.error + '33'} rx="4" />
          <text x="60" y="17" fill={mtbfMeetsRequirement ? colors.success : colors.error} fontSize="11" textAnchor="middle" fontWeight="600">
            MTBF: {calculatedMTBF > 1e6 ? '> 1M yrs' : calculatedMTBF > 1000 ? `${(calculatedMTBF/1000).toFixed(0)}K yrs` : `${calculatedMTBF.toFixed(0)} yrs`}
          </text>
        </g>
      </svg>
    );
  };

  // Navigation bar component
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Metastability</span>
      <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{phaseLabels[phase]}</span>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
        {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
      </span>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
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
        paddingTop: '84px',
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
          ⚡🔄
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Metastability in Flip-Flops
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "When two clocks collide, a flip-flop gets confused. It's neither 0 nor 1—it's <span style={{ color: colors.error }}>stuck in between</span>. This silent failure crashes systems worth millions."
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
            "Every time data crosses a clock domain boundary, there's a chance the receiving flip-flop enters a metastable state. Design it wrong, and you're just counting down to failure."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Digital Design Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore the Danger Zone
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE - with SVG visualization
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The flip-flop always captures the correct value, just with a small delay' },
      { id: 'b', text: 'The output becomes stuck between 0 and 1, potentially causing downstream failures' },
      { id: 'c', text: 'The flip-flop automatically resets to 0 for safety' },
    ];

    const predictWidth = isMobile ? 340 : 400;
    const predictHeight = 150;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

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
            A flip-flop samples its data input right as the data is changing. What happens to the output?
          </h2>

          {/* SVG diagram showing timing conflict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <svg width={predictWidth} height={predictHeight} viewBox={`0 0 ${predictWidth} ${predictHeight}`}>
              {/* Data signal transitioning */}
              <text x="10" y="30" fill={colors.data} fontSize="12" fontWeight="600">DATA</text>
              <polyline
                points={`30,50 100,50 110,20 200,20`}
                fill="none"
                stroke={colors.data}
                strokeWidth="3"
              />

              {/* Clock edge */}
              <text x="220" y="30" fill={colors.clock} fontSize="12" fontWeight="600">CLK</text>
              <polyline
                points={`240,50 240,20 270,20`}
                fill="none"
                stroke={colors.clock}
                strokeWidth="3"
              />

              {/* Conflict zone */}
              <rect x="100" y="10" width="20" height="50" fill={colors.error + '44'} rx="4" />
              <text x="110" y="80" fill={colors.error} fontSize="10" textAnchor="middle">Conflict!</text>

              {/* Output with question mark */}
              <rect x={predictWidth - 80} y="20" width="60" height="40" fill={colors.bgSecondary} stroke={colors.error} strokeWidth="2" rx="4" />
              <text x={predictWidth - 50} y="45" fill={colors.error} fontSize="16" textAnchor="middle" fontWeight="700">???</text>
              <text x={predictWidth - 50} y="80" fill={colors.textMuted} fontSize="10" textAnchor="middle">Output?</text>

              {/* Arrow */}
              <line x1="270" y1="40" x2={predictWidth - 90} y2="40" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="4,2" />
              <polygon points={`${predictWidth - 90},40 ${predictWidth - 100},35 ${predictWidth - 100},45`} fill={colors.textMuted} />
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

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See What Happens
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Flip-Flop Visualization
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Observe Metastability in Action
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust the setup time margin and watch what happens when data changes near the clock edge
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Real-world impact: This exact issue causes random crashes in high-speed networking equipment, memory controllers, and multi-processor systems.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <FlipFlopVisualization interactive={true} />
            </div>

            {/* Setup time margin slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Setup Time Margin</span>
                <span style={{
                  ...typo.small,
                  color: setupTimeMargin < 0.5 ? colors.error : setupTimeMargin < 1.0 ? colors.warning : colors.success,
                  fontWeight: 600
                }}>
                  {setupTimeMargin.toFixed(1)} ns
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={setupTimeMargin}
                onChange={(e) => setSetupTimeMargin(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.error}, ${colors.warning}, ${colors.success})`,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.error }}>Violation Risk</span>
                <span style={{ ...typo.small, color: colors.success }}>Safe Margin</span>
              </div>
            </div>

            {/* Status display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: flipFlopOutput === 'metastable' ? colors.error : colors.accent
                }}>
                  {flipFlopOutput === 'metastable' ? '???' : flipFlopOutput === 'high' ? '1' : '0'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Output State</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: showMetastable ? colors.error : colors.success
                }}>
                  {showMetastable ? 'UNSTABLE' : 'STABLE'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: setupTimeMargin < 0.5 ? colors.error : colors.warning
                }}>
                  {setupTimeMargin < 0.5 ? 'HIGH' : setupTimeMargin < 1.0 ? 'MEDIUM' : 'LOW'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Risk Level</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {showMetastable && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                You triggered metastability! The flip-flop is stuck between logic levels.
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
    const predictionCorrect = prediction === 'b';
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Reference user's prediction */}
          {prediction && (
            <div style={{
              background: predictionCorrect ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${predictionCorrect ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: predictionCorrect ? colors.success : colors.warning, margin: 0 }}>
                {predictionCorrect
                  ? 'Your prediction was correct! The output does get stuck between 0 and 1.'
                  : 'Based on your prediction, let\'s see what actually happens when data changes at the clock edge.'}
              </p>
            </div>
          )}

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Does Metastability Occur?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 300 : 400} height={180} viewBox={`0 0 ${isMobile ? 300 : 400} 180`} style={{ background: colors.bgSecondary, borderRadius: '8px' }}>
                {/* Energy diagram */}
                <text x="20" y="20" fill={colors.textSecondary} fontSize="12">Energy Landscape</text>

                {/* Stable states (wells) */}
                <path
                  d="M 30 140 Q 80 80 130 140 Q 180 200 230 140 Q 280 80 330 140"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="3"
                />

                {/* Labels */}
                <text x="80" y="160" fill={colors.success} fontSize="11" textAnchor="middle">Logic 0</text>
                <text x="280" y="160" fill={colors.success} fontSize="11" textAnchor="middle">Logic 1</text>
                <text x="180" y="100" fill={colors.error} fontSize="11" textAnchor="middle">Unstable</text>

                {/* Ball representing state */}
                <circle cx="180" cy="115" r="10" fill={colors.error}>
                  <animate attributeName="cx" values="180;175;185;180" dur="0.5s" repeatCount="indefinite" />
                </circle>

                {/* Arrow showing instability */}
                <text x="180" y="85" fill={colors.textMuted} fontSize="10" textAnchor="middle">Metastable Point</text>
              </svg>
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Setup and Hold Times</strong> define a window around the clock edge where data must be stable.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.success }}>Setup Time:</span> Data must be stable BEFORE the clock edge arrives.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.warning }}>Hold Time:</span> Data must remain stable AFTER the clock edge.
              </p>
              <p>
                If data changes within this window, the flip-flop's internal feedback loop can get stuck at a <span style={{ color: colors.error, fontWeight: 600 }}>metastable voltage</span>—balanced precariously between 0 and 1.
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
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Metastability isn't about whether the data was 0 or 1—it's about the flip-flop catching the data mid-transition. The output might resolve correctly, resolve incorrectly, or take so long to resolve that downstream logic fails.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Learn About Synchronizers
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'It doubles the delay but doesn\'t help with metastability' },
      { id: 'b', text: 'It gives the first flip-flop time to resolve, dramatically improving MTBF' },
      { id: 'c', text: 'It cancels out the metastability through signal inversion' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Concept: Synchronizer Chains
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Engineers add a second flip-flop after the first one. Why does this help?
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Experiment with Synchronizers
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
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Design Your Synchronizer
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust parameters to meet the MTBF requirement
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SynchronizerChainVisualization />
            </div>

            {/* Synchronizer stages slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Synchronizer Stages</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{syncStages} stages</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={syncStages}
                onChange={(e) => setSyncStages(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>1 (Unsafe)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>4 (Very Safe)</span>
              </div>
            </div>

            {/* Clock frequency slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Clock Frequency</span>
                <span style={{ ...typo.small, color: colors.clock, fontWeight: 600 }}>{clockFrequency} MHz</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={clockFrequency}
                onChange={(e) => setClockFrequency(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>50 MHz (Slow)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>500 MHz (Fast)</span>
              </div>
            </div>

            {/* MTBF requirement slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>MTBF Requirement</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{mtbfRequirement} years</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                step="10"
                value={mtbfRequirement}
                onChange={(e) => setMtbfRequirement(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>1 year</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>1000 years</span>
              </div>
            </div>

            {/* Results */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: mtbfMeetsRequirement ? colors.success : colors.error }}>
                  {calculatedMTBF > 1e9 ? '> 1B yrs' :
                   calculatedMTBF > 1e6 ? `${(calculatedMTBF/1e6).toFixed(0)}M yrs` :
                   calculatedMTBF > 1000 ? `${(calculatedMTBF/1000).toFixed(0)}K yrs` :
                   `${calculatedMTBF.toFixed(0)} yrs`}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Calculated MTBF</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: mtbfMeetsRequirement ? colors.success : colors.error }}>
                  {mtbfMeetsRequirement ? 'PASS' : 'FAIL'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Requirement Status</div>
              </div>
            </div>
          </div>

          {mtbfMeetsRequirement && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Your synchronizer design meets the MTBF requirement!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Math
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
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Science of Reliable Synchronization
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>MTBF Formula</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                MTBF = e^(t_res/tau) / (f_clk * f_data * T_w)
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Where t_res is resolution time, tau is the metastability time constant, and T_w is the metastability window.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📈</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Exponential Improvement</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Each additional synchronizer stage provides an <span style={{ color: colors.success }}>exponential</span> improvement in MTBF. Adding a second stage might improve MTBF by 1000x. Adding a third might improve it by another 1000x.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Multi-Bit Signals</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Synchronizers only work for <span style={{ color: colors.warning }}>single-bit</span> signals. For multi-bit data, use Gray coding, FIFOs with Gray-coded pointers, or handshaking protocols.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Design Guidelines</h3>
              </div>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Use at least 2 synchronizer stages (industry standard)</li>
                <li>Use 3+ stages for high-frequency or safety-critical systems</li>
                <li>Calculate MTBF for worst-case conditions (high temp)</li>
                <li>Use specialized low-metastability flip-flops when available</li>
              </ul>
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                    Yes
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
                Why Metastability Matters Here:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
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

            {/* Got It button for within-app navigation */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '8px' }}
              >
                Got It
              </button>
            ) : (
              <div style={{
                background: `${colors.success}22`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                marginTop: '8px',
              }}>
                <span style={{ color: colors.success, fontWeight: 600 }}>Completed - Select another application above</span>
              </div>
            )}
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
          paddingTop: '84px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
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
                ? 'You\'ve mastered Metastability and Clock Domain Crossing!'
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
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
        paddingTop: '84px',
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
          Metastability Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how metastability occurs in flip-flops during clock domain crossings and how to design reliable synchronizers.
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
              'Setup and hold time violations',
              'What causes metastable states',
              'MTBF calculation and requirements',
              'Synchronizer chain design',
              'Multi-bit signal crossing techniques',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>&#10003;</span>
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

export default MetastabilityRenderer;
