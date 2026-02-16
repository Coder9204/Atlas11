'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// RC Delay - Complete 10-Phase Game
// Why wires are the real bottleneck in chip design
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

interface RCDelayRendererProps {
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
    scenario: "A chip designer notices that a critical signal takes 2ns to travel from one logic block to another across a 5mm wire. The same logic operation in the gate itself only takes 0.1ns.",
    question: "What does this reveal about modern chip design?",
    options: [
      { id: 'a', label: "The logic gates are poorly designed and need optimization" },
      { id: 'b', label: "Interconnect delay dominates gate delay in modern chips", correct: true },
      { id: 'c', label: "The wire needs to be made thicker to increase speed" },
      { id: 'd', label: "This is expected because signals travel at light speed" }
    ],
    explanation: "In modern chips below 65nm, interconnect (wire) delay typically dominates gate delay. The RC time constant of wires increases as they get thinner, while transistors get faster - creating the 'interconnect bottleneck' that drives much of modern chip architecture."
  },
  {
    scenario: "An engineer is designing a clock distribution network and must send a clock signal across the entire chip. Using a single long wire, the signal arrives too slowly and is badly distorted.",
    question: "What is the most effective solution to this problem?",
    options: [
      { id: 'a', label: "Use wider wires to reduce resistance" },
      { id: 'b', label: "Insert repeater buffers along the wire to restore signal edges", correct: true },
      { id: 'c', label: "Increase the clock driver strength at the source" },
      { id: 'd', label: "Use lower supply voltage to reduce power" }
    ],
    explanation: "Repeaters (buffer stages) break a long RC line into shorter segments. Since delay scales quadratically with wire length (t = RC ~ L^2), breaking one long wire into N shorter segments reduces total delay significantly. This is why clock trees use many buffer stages."
  },
  {
    scenario: "As technology nodes shrink from 45nm to 7nm, engineers observe that while transistors become faster and use less power, the wires in the chip become increasingly problematic.",
    question: "Why do wires become more problematic at smaller nodes?",
    options: [
      { id: 'a', label: "Smaller wires have higher resistance (R increases as cross-section decreases)", correct: true },
      { id: 'b', label: "Smaller wires carry less current due to quantum effects" },
      { id: 'c', label: "The dielectric constant of insulators increases at small scales" },
      { id: 'd', label: "Signal speed increases beyond what circuits can handle" }
    ],
    explanation: "Wire resistance R = rho*L/A increases as cross-sectional area A decreases. At advanced nodes, copper wires also suffer from electron scattering at grain boundaries and surfaces, further increasing resistivity. This is why interconnect has become the dominant factor in chip performance."
  },
  {
    scenario: "A memory controller sends address signals to DRAM chips on a PCB. The traces are 10cm long with total capacitance of 20pF and source resistance of 50 ohms.",
    question: "What is the approximate 10-90% rise time of these signals?",
    options: [
      { id: 'a', label: "About 50 picoseconds" },
      { id: 'b', label: "About 2.2 nanoseconds", correct: true },
      { id: 'c', label: "About 1 microsecond" },
      { id: 'd', label: "Rise time is independent of RC" }
    ],
    explanation: "The 10-90% rise time is approximately 2.2*RC = 2.2 * 50 ohms * 20pF = 2.2 * 1ns = 2.2ns. This RC time constant is fundamental to understanding signal integrity in high-speed digital systems."
  },
  {
    scenario: "Two parallel metal traces run side by side for 2mm in a chip. One trace switches from 0 to 1V, and the engineer notices a voltage spike on the quiet neighboring trace.",
    question: "What phenomenon is causing this voltage spike?",
    options: [
      { id: 'a', label: "Resistive voltage drop in the power supply" },
      { id: 'b', label: "Crosstalk due to coupling capacitance between adjacent wires", correct: true },
      { id: 'c', label: "Electromagnetic interference from external sources" },
      { id: 'd', label: "Thermal noise in the wire resistance" }
    ],
    explanation: "Coupling capacitance between adjacent wires causes crosstalk. When one wire transitions, it capacitively couples charge onto neighbors, creating noise. This coupling capacitance is part of the total wire capacitance that determines RC delay."
  },
  {
    scenario: "A chip architect is choosing between aluminum and copper for the metal interconnect layers. Copper has about 40% lower resistivity than aluminum.",
    question: "Beyond lower resistance, why else did the industry switch to copper?",
    options: [
      { id: 'a', label: "Copper is cheaper and more abundant than aluminum" },
      { id: 'b', label: "Lower resistance allows faster signals and lower power dissipation in wires", correct: true },
      { id: 'c', label: "Copper has better optical properties for lithography" },
      { id: 'd', label: "Aluminum is banned due to environmental regulations" }
    ],
    explanation: "The switch to copper reduced RC delay by ~40%, directly improving chip performance. Lower resistance also means less I^2*R power dissipation in interconnects. The transition required new 'damascene' manufacturing processes since copper cannot be easily etched like aluminum."
  },
  {
    scenario: "An FPGA designer routes a signal through a path with 100 ohms total resistance and 5pF total capacitance. The signal must have a rise time under 500ps to meet timing requirements.",
    question: "Will this signal path meet the timing requirement?",
    options: [
      { id: 'a', label: "Yes, because RC = 500ps matches the requirement exactly" },
      { id: 'b', label: "No, because the 10-90% rise time will be 2.2*RC = 1.1ns", correct: true },
      { id: 'c', label: "Yes, because signals always propagate at light speed" },
      { id: 'd', label: "Cannot be determined without knowing the wire length" }
    ],
    explanation: "The 10-90% rise time is 2.2*RC = 2.2 * 100 ohms * 5pF = 1.1ns, which exceeds the 500ps requirement. The factor of 2.2 comes from the exponential charging of an RC circuit reaching 10% and 90% of final value."
  },
  {
    scenario: "In a 3nm chip, engineers use low-k dielectric materials between metal layers instead of traditional silicon dioxide. The dielectric constant is reduced from 4.0 to 2.5.",
    question: "How does this low-k dielectric improve chip performance?",
    options: [
      { id: 'a', label: "It increases the strength of the signal voltage" },
      { id: 'b', label: "It reduces wire capacitance, lowering RC delay", correct: true },
      { id: 'c', label: "It makes the wires more resistant to electromigration" },
      { id: 'd', label: "It improves heat dissipation from the wires" }
    ],
    explanation: "Capacitance is proportional to the dielectric constant (C = epsilon*A/d). Reducing k from 4.0 to 2.5 cuts capacitance by 37.5%, directly reducing RC delay. This is why low-k dielectrics are critical at advanced nodes."
  },
  {
    scenario: "A GPU designer is placing repeater buffers along a 4mm global signal wire. They must decide how many repeaters to use for optimal delay.",
    question: "What happens if too few repeaters are used on a long wire?",
    options: [
      { id: 'a', label: "Signal delay decreases but power increases" },
      { id: 'b', label: "Signal delay increases quadratically with unbuffered wire length", correct: true },
      { id: 'c', label: "The signal amplitude becomes too large" },
      { id: 'd', label: "Clock skew is eliminated" }
    ],
    explanation: "For an unbuffered RC line, delay scales as L^2 because both R and C increase linearly with length. With optimal repeater insertion, delay scales linearly with L instead. The optimal number of repeaters balances wire delay against buffer delay."
  },
  {
    scenario: "A system-on-chip has a bus that must connect IP blocks in different corners of the die. The physical design team proposes using Network-on-Chip (NoC) instead of traditional long buses.",
    question: "Why might NoC be better than long bus wires for modern SoCs?",
    options: [
      { id: 'a', label: "NoC eliminates all wire capacitance" },
      { id: 'b', label: "NoC uses shorter pipelined links, avoiding long RC delays", correct: true },
      { id: 'c', label: "NoC wires have zero resistance" },
      { id: 'd', label: "NoC automatically increases clock frequency" }
    ],
    explanation: "Network-on-Chip architectures use short, pipelined links between routers instead of long buses. Each link has manageable RC delay, and data is forwarded hop-by-hop. This avoids the quadratic delay scaling of long wires and provides better bandwidth through parallelism."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Advanced Process Nodes',
    short: 'Why 3nm chips care more about wires than transistors',
    tagline: 'The interconnect bottleneck defines modern chip design',
    description: 'At advanced nodes like 3nm and below, transistors are incredibly fast but wires are relatively slow. RC delay in interconnects often determines maximum clock frequency more than gate delay does.',
    connection: 'The RC time constant you explored shows why wire delay matters. As feature sizes shrink, wire resistance increases faster than capacitance decreases, making interconnect the dominant delay factor.',
    howItWorks: 'Foundries use multiple metal layers with different wire widths - thin local wires for short connections, thick global wires for long distances. Low-k dielectrics reduce capacitance while copper and now cobalt/ruthenium reduce resistance.',
    stats: [
      { value: '15+ layers', label: 'Metal layers', icon: '📚' },
      { value: '70%', label: 'Delay from wires', icon: '⚡' },
      { value: '$30B', label: 'Fab cost', icon: '💰' }
    ],
    examples: ['Apple M3 (3nm)', 'AMD Zen 5 (4nm)', 'NVIDIA Blackwell (4nm)', 'Qualcomm Snapdragon (4nm)'],
    companies: ['TSMC', 'Samsung', 'Intel', 'GlobalFoundries'],
    futureImpact: 'New materials like carbon nanotubes and graphene promise lower resistance interconnects, while 3D stacking reduces wire lengths by going vertical.',
    color: '#8B5CF6'
  },
  {
    icon: '🕐',
    title: 'Clock Distribution Networks',
    short: 'Getting the clock to billions of transistors simultaneously',
    tagline: 'Repeater trees fight RC delay across the chip',
    description: 'Clock signals must reach every flip-flop in a chip within tight timing margins. Without repeater buffers, RC delay would cause unacceptable clock skew between near and far destinations.',
    connection: 'Clock trees are the ultimate application of repeater insertion to combat RC delay. Each buffer restores signal edges that RC filtering would otherwise round off.',
    howItWorks: 'H-trees or mesh networks distribute clocks with balanced path lengths. Hundreds of buffer stages amplify and re-time the clock. Modern designs use clock mesh for better skew control at the cost of higher power.',
    stats: [
      { value: '<10ps', label: 'Skew target', icon: '⏱️' },
      { value: '30%', label: 'Power for clock', icon: '🔋' },
      { value: '1000s', label: 'Clock buffers', icon: '🔁' }
    ],
    examples: ['Intel Core clock mesh', 'ARM Cortex clock trees', 'AMD Zen clock distribution', 'Apple Silicon clock network'],
    companies: ['Cadence', 'Synopsys', 'Mentor Graphics', 'Ansys'],
    futureImpact: 'Asynchronous design and clock gating reduce clock power, while machine learning optimizes buffer placement for minimum skew.',
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'Memory Interface Design',
    short: 'How DDR5 runs at 6400 MT/s despite long PCB traces',
    tagline: 'Controlled impedance fights RC distortion',
    description: 'Memory signals travel centimeters on PCBs, facing significant RC delay and distortion. Signal integrity techniques like impedance matching and equalization compensate for wire effects.',
    connection: 'The rise time degradation from RC delay directly causes intersymbol interference at high data rates. Understanding RC timing is essential for memory interface design.',
    howItWorks: 'DDR interfaces use controlled impedance traces (typically 40-60 ohms), on-die termination to reduce reflections, and decision feedback equalization to correct for RC-induced distortion.',
    stats: [
      { value: '6400 MT/s', label: 'DDR5 speed', icon: '🚀' },
      { value: '40 ohm', label: 'Typical Z0', icon: '⚡' },
      { value: '10cm', label: 'Trace length', icon: '📏' }
    ],
    examples: ['DDR5 server memory', 'GDDR6X graphics', 'HBM3 stacked memory', 'LPDDR5X mobile'],
    companies: ['Samsung', 'SK Hynix', 'Micron', 'Rambus'],
    futureImpact: 'Compute Express Link (CXL) and UCIe chiplet interfaces push signaling rates even higher, requiring advanced equalization to combat RC effects.',
    color: '#10B981'
  },
  {
    icon: '📡',
    title: 'High-Speed SerDes',
    short: 'Achieving 100+ Gbps over lossy channels',
    tagline: 'Fighting RC loss with analog magic',
    description: 'SerDes (serializer/deserializer) circuits send data at 100+ Gbps through cables and backplanes with severe RC loss. Complex analog circuits equalize the channel to recover clean data.',
    connection: 'RC low-pass filtering is the fundamental challenge in SerDes design. The RC time constant of the channel determines how much ISI (intersymbol interference) the equalizer must correct.',
    howItWorks: 'Transmit FFE (feed-forward equalization) pre-emphasizes high frequencies. CTLE (continuous-time linear equalizer) boosts frequencies attenuated by RC filtering. DFE (decision feedback equalizer) cancels postcursor ISI.',
    stats: [
      { value: '224 Gbps', label: 'Latest SerDes', icon: '⚡' },
      { value: '30+ dB', label: 'Channel loss', icon: '📉' },
      { value: '<1e-15', label: 'BER target', icon: '🎯' }
    ],
    examples: ['PCIe Gen6', '800G Ethernet', 'USB4', 'Thunderbolt 5'],
    companies: ['Marvell', 'Broadcom', 'Credo', 'Alphawave'],
    futureImpact: 'Co-packaged optics will eventually replace electrical links for the longest reaches, but SerDes innovation continues pushing electrical signaling capabilities.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const RCDelayRenderer: React.FC<RCDelayRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [resistance, setResistance] = useState(100); // ohms
  const [capacitance, setCapacitance] = useState(10); // pF
  const [simulationTime, setSimulationTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [wireLength, setWireLength] = useState(1); // mm (for scaling R and C)

  // Twist phase - repeater scenario
  const [numRepeaters, setNumRepeaters] = useState(0);
  const [chipSize, setChipSize] = useState(10); // mm

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

  // Simulation animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimulationTime(t => {
          if (t >= 10) {
            setIsSimulating(false);
            return 10;
          }
          return t + 0.1;
        });
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Calculate RC time constant
  const tau = resistance * capacitance * 1e-12 * 1e9; // in nanoseconds (R in ohms, C in pF -> tau in ns)
  const riseTime = 2.2 * tau; // 10-90% rise time

  // Voltage at time t for step response: V(t) = V_final * (1 - e^(-t/tau))
  const getVoltage = (t: number) => {
    const scaledT = t * tau / 2; // Scale simulation time to match tau
    return 1 - Math.exp(-scaledT / tau);
  };

  // Calculate delay with repeaters (for twist phase)
  const calculateRepeaterDelay = () => {
    const segmentLength = chipSize / (numRepeaters + 1);
    const r_per_mm = 10; // ohms per mm
    const c_per_mm = 0.5; // pF per mm

    if (numRepeaters === 0) {
      // Unbuffered: delay ~ (R*L) * (C*L) = R*C*L^2
      const totalR = r_per_mm * chipSize;
      const totalC = c_per_mm * chipSize;
      return 0.69 * totalR * totalC * 1e-3; // in ns
    } else {
      // With repeaters: delay ~ N * (R*L/N) * (C*L/N) + N * buffer_delay
      const segmentR = r_per_mm * segmentLength;
      const segmentC = c_per_mm * segmentLength;
      const wireDelay = (numRepeaters + 1) * 0.69 * segmentR * segmentC * 1e-3;
      const bufferDelay = numRepeaters * 0.05; // 50ps per buffer
      return wireDelay + bufferDelay;
    }
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber/Orange for electronics
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    wire: '#F59E0B',
    signal: '#3B82F6',
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
    twist_play: 'Repeaters',
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
        gameType: 'rc-delay',
        gameTitle: 'RC Delay',
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

  // RC Circuit Visualization SVG Component
  const RCCircuitVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;
    const voltage = getVoltage(simulationTime);

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.wire} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.wire} stopOpacity="0.4" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          RC Circuit Step Response
        </text>

        {/* Circuit diagram area */}
        <g transform="translate(20, 45)">
          {/* Voltage source */}
          <rect x="10" y="30" width="30" height="50" fill={colors.bgSecondary} stroke={colors.signal} strokeWidth="2" rx="4" />
          <text x="25" y="50" textAnchor="middle" fill={colors.signal} fontSize="10">Vin</text>
          <text x="25" y="70" textAnchor="middle" fill={colors.signal} fontSize="12" fontWeight="600">1V</text>

          {/* Wire from source */}
          <line x1="40" y1="40" x2="70" y2="40" stroke={colors.wire} strokeWidth="3" />

          {/* Resistor */}
          <rect x="70" y="30" width="60" height="20" fill="none" stroke={colors.accent} strokeWidth="2" />
          <text x="100" y="25" textAnchor="middle" fill={colors.accent} fontSize="10">R = {resistance} ohm</text>

          {/* Wire to capacitor */}
          <line x1="130" y1="40" x2="160" y2="40" stroke={colors.wire} strokeWidth="3" />

          {/* Capacitor */}
          <line x1="160" y1="25" x2="160" y2="55" stroke={colors.accent} strokeWidth="3" />
          <line x1="170" y1="25" x2="170" y2="55" stroke={colors.accent} strokeWidth="3" />
          <text x="165" y="70" textAnchor="middle" fill={colors.accent} fontSize="10">C = {capacitance} pF</text>

          {/* Output voltage indicator */}
          <rect x="185" y="30" width="40" height="25" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" rx="4" />
          <text x="205" y="38" textAnchor="middle" fill={colors.textMuted} fontSize="8">Vout</text>
          <text x="205" y="50" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">
            {(voltage * 1).toFixed(2)}V
          </text>

          {/* Ground connections */}
          <line x1="25" y1="80" x2="25" y2="100" stroke={colors.textMuted} strokeWidth="2" />
          <line x1="165" y1="55" x2="165" y2="100" stroke={colors.textMuted} strokeWidth="2" />
          <line x1="15" y1="100" x2="175" y2="100" stroke={colors.textMuted} strokeWidth="2" />

          {/* Ground symbol */}
          <line x1="85" y1="100" x2="105" y2="100" stroke={colors.textMuted} strokeWidth="3" />
          <line x1="89" y1="105" x2="101" y2="105" stroke={colors.textMuted} strokeWidth="2" />
          <line x1="92" y1="110" x2="98" y2="110" stroke={colors.textMuted} strokeWidth="1" />
        </g>

        {/* Time constant display */}
        <g transform={`translate(${width - 120}, 60)`}>
          <rect x="0" y="0" width="100" height="65" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
          <text x="50" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">Time Constant</text>
          <text x="50" y="38" textAnchor="middle" fill={colors.accent} fontSize="18" fontWeight="700">
            {tau.toFixed(2)} ns
          </text>
          <text x="50" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="9">
            Rise: {riseTime.toFixed(2)} ns
          </text>
        </g>

        {/* Waveform plot area */}
        <g transform={`translate(40, ${height - 130})`}>
          {/* Grid */}
          <rect x="0" y="0" width={width - 80} height="100" fill={colors.bgSecondary} rx="4" />

          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((y, i) => (
            <g key={`h-${i}`}>
              <line x1="0" y1={y} x2={width - 80} y2={y} stroke={colors.border} strokeWidth="1" strokeDasharray="2,2" />
              <text x="-5" y={100 - y + 4} textAnchor="end" fill={colors.textMuted} fontSize="8">
                {(i * 0.25).toFixed(2)}
              </text>
            </g>
          ))}

          {/* Time axis labels */}
          <text x={(width - 80) / 2} y="115" textAnchor="middle" fill={colors.textMuted} fontSize="10">Time (tau units)</text>

          {/* Input step (dashed) */}
          <path
            d={`M 0 100 L 0 0 L ${width - 80} 0`}
            fill="none"
            stroke={colors.signal}
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity="0.5"
          />
          <text x={width - 85} y="-5" textAnchor="end" fill={colors.signal} fontSize="9" opacity="0.7">Vin</text>

          {/* Output voltage curve */}
          <path
            d={(() => {
              let path = 'M 0 100';
              const xScale = (width - 80) / 10;
              for (let t = 0; t <= simulationTime; t += 0.1) {
                const v = 1 - Math.exp(-t * tau / (2 * tau)); // Scale to tau units
                const x = t * xScale;
                const y = 100 - v * 100;
                path += ` L ${x} ${y}`;
              }
              return path;
            })()}
            fill="none"
            stroke={colors.success}
            strokeWidth="3"
            filter="url(#glowFilter)"
          />
          <text x={width - 85} y="85" textAnchor="end" fill={colors.success} fontSize="9">Vout</text>

          {/* Current position marker */}
          {simulationTime > 0 && (
            <circle
              cx={simulationTime * (width - 80) / 10}
              cy={100 - getVoltage(simulationTime) * 100}
              r="5"
              fill={colors.success}
              stroke="white"
              strokeWidth="2"
            />
          )}

          {/* Tau markers */}
          {[1, 2, 3].map(n => (
            <g key={`tau-${n}`}>
              <line
                x1={n * 2 * (width - 80) / 10}
                y1="0"
                x2={n * 2 * (width - 80) / 10}
                y2="100"
                stroke={colors.accent}
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.5"
              />
              <text
                x={n * 2 * (width - 80) / 10}
                y="112"
                textAnchor="middle"
                fill={colors.accent}
                fontSize="8"
              >
                {n}tau
              </text>
            </g>
          ))}
        </g>
      </svg>
    );
  };

  // Repeater Visualization for twist phase
  const RepeaterVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;
    const delay = calculateRepeaterDelay();

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Wire with {numRepeaters} Repeater{numRepeaters !== 1 ? 's' : ''}
        </text>

        {/* Wire segments and repeaters */}
        <g transform="translate(30, 50)">
          {/* Source */}
          <rect x="0" y="30" width="25" height="30" fill={colors.signal} rx="4" />
          <text x="12" y="50" textAnchor="middle" fill="white" fontSize="10">Src</text>

          {/* Wire and repeaters */}
          {Array.from({ length: numRepeaters + 1 }).map((_, i) => {
            const segmentWidth = (width - 110) / (numRepeaters + 1);
            const startX = 25 + i * segmentWidth;

            return (
              <g key={`seg-${i}`}>
                {/* Wire segment */}
                <line
                  x1={startX}
                  y1="45"
                  x2={startX + segmentWidth - (i < numRepeaters ? 20 : 0)}
                  y2="45"
                  stroke={colors.wire}
                  strokeWidth="4"
                />

                {/* Repeater buffer (if not last segment) */}
                {i < numRepeaters && (
                  <g>
                    <polygon
                      points={`${startX + segmentWidth - 20},35 ${startX + segmentWidth},45 ${startX + segmentWidth - 20},55`}
                      fill={colors.accent}
                      stroke={colors.accent}
                      strokeWidth="2"
                    />
                    <text
                      x={startX + segmentWidth - 10}
                      y="70"
                      textAnchor="middle"
                      fill={colors.textMuted}
                      fontSize="8"
                    >
                      Buf
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Destination */}
          <rect x={width - 85} y="30" width="25" height="30" fill={colors.success} rx="4" />
          <text x={width - 72} y="50" textAnchor="middle" fill="white" fontSize="10">Dst</text>
        </g>

        {/* Delay display */}
        <g transform={`translate(${width/2 - 80}, 120)`}>
          <rect x="0" y="0" width="160" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <text x="80" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">Total Delay</text>
          <text x="80" y="40" textAnchor="middle" fill={colors.accent} fontSize="20" fontWeight="700">
            {delay.toFixed(2)} ns
          </text>
        </g>

        {/* Formula */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="10">
          {numRepeaters === 0
            ? `Delay ~ RC*L^2 (quadratic scaling)`
            : `Delay ~ N*(RC*L/N)^2 + N*t_buf (reduced quadratic)`
          }
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

  // Bottom navigation bar with Back/Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
      }}>
        {canGoBack ? (
          <button
            onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        ) : <div />}
        {canGoNext && (
          <button
            onClick={() => nextPhase()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: colors.accent,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Next →
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
          ⚡🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          RC Delay
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Are chips limited by <span style={{ color: colors.accent }}>transistor speed</span> or <span style={{ color: colors.signal }}>wire speed</span>? The answer might surprise you - in modern chips, the wires are often the bottleneck."
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
            "Every wire in a chip acts like an RC circuit. As chips shrink, wires get thinner and more resistive. The signal has to charge the wire's capacitance through its resistance - and that takes time."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Interconnect Design Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore RC Delay
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The signal arrives faster - less wire means less delay' },
      { id: 'b', text: 'The signal takes longer to reach full voltage - RC time constant increases', correct: true },
      { id: 'c', text: 'No change - signals travel at the speed of light regardless of wire properties' },
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
            If you double the resistance OR capacitance of a wire, what happens to the signal transition time?
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
                <div style={{ fontSize: '48px' }}>Step</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Input Signal</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: colors.accent + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.accent }}>R + C</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Wire RC</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>???</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Output Signal</p>
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive RC Circuit Simulator
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
            RC Circuit Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust R and C to see how they affect signal rise time.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <RCCircuitVisualization />
            </div>

            {/* Resistance slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Resistance (R)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{resistance} ohm</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={resistance}
                onChange={(e) => setResistance(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((resistance - 10) / 490) * 100}%, ${colors.border} ${((resistance - 10) / 490) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Capacitance slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Capacitance (C)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{capacitance} pF</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={capacitance}
                onChange={(e) => setCapacitance(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((capacitance - 1) / 49) * 100}%, ${colors.border} ${((capacitance - 1) / 49) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setSimulationTime(0);
                  setIsSimulating(true);
                  playSound('click');
                }}
                disabled={isSimulating}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.border : colors.signal,
                  color: 'white',
                  fontWeight: 600,
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                }}
              >
                {isSimulating ? 'Simulating...' : 'Apply Step Input'}
              </button>
              <button
                onClick={() => {
                  setSimulationTime(0);
                  setIsSimulating(false);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            {/* Stats display */}
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
                <div style={{ ...typo.h3, color: colors.accent }}>{tau.toFixed(2)} ns</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Time Constant (tau)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{riseTime.toFixed(2)} ns</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>10-90% Rise Time</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.signal }}>{(getVoltage(simulationTime) * 100).toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current Output</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {riseTime > 5 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how large RC creates slow transitions! This limits how fast signals can switch.
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
            The Physics of RC Delay
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>tau = R * C (Time Constant)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The time constant tau determines how fast a signal can transition. After <span style={{ color: colors.accent }}>1 tau</span>, voltage reaches 63% of final value. After <span style={{ color: colors.accent }}>3 tau</span>, it reaches 95%.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>10-90% Rise Time = 2.2 * tau</strong>
              </p>
              <p>
                This is the practical measure of signal transition speed. For a wire with R=100ohm and C=10pF, rise time is <span style={{ color: colors.success }}>2.2ns</span>.
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
              Key Insight: Wire Delay Scales with Length Squared
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Both R and C increase linearly with wire length L:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>R = rho * L / A (resistance increases with length)</li>
              <li>C = epsilon * L * W / d (capacitance increases with length)</li>
              <li><strong>Delay ~ R*C ~ L^2</strong> (quadratic scaling!)</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
              The Modern Interconnect Problem
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              As chips shrink, transistors get faster but wires get slower! Thinner wires = higher R. At advanced nodes (7nm, 5nm, 3nm), interconnect delay often exceeds gate delay, making wires the true performance bottleneck.
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
      { id: 'a', text: 'Delay increases - more buffers add more delay' },
      { id: 'b', text: 'Delay decreases - breaking up the wire reduces quadratic scaling', correct: true },
      { id: 'c', text: 'No change - total RC stays the same regardless of segmentation' },
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
              🔄 New Variable: Repeater Buffers
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Engineers insert "repeaters" (buffer stages) along long wires. What happens to total delay?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Instead of one 10mm wire, use 4 repeaters to create 5 segments of 2mm each:
            </p>
            <div style={{ marginTop: '16px', fontSize: '14px', color: colors.accent, fontFamily: 'monospace' }}>
              [Src]---R---C---[Buf]---R---C---[Buf]---R---C---[Buf]---R---C---[Buf]---R---C---[Dst]
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
              style={primaryButtonStyle}
            >
              See Repeater Effect
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
            Repeater Optimization
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Find the optimal number of repeaters to minimize delay
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <RepeaterVisualization />
            </div>

            {/* Chip size slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Wire Length (Chip Size)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{chipSize} mm</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                value={chipSize}
                onChange={(e) => setChipSize(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Number of repeaters slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Number of Repeaters</span>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{numRepeaters}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={numRepeaters}
                onChange={(e) => setNumRepeaters(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>No repeaters</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>10 repeaters</span>
              </div>
            </div>

            {/* Comparison stats */}
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
                <div style={{ ...typo.h3, color: colors.error }}>
                  {(0.69 * 10 * chipSize * 0.5 * chipSize * 1e-3).toFixed(2)} ns
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Unbuffered Delay</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>
                  {calculateRepeaterDelay().toFixed(2)} ns
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>With Repeaters</div>
              </div>
            </div>
          </div>

          {numRepeaters > 0 && calculateRepeaterDelay() < (0.69 * 10 * chipSize * 0.5 * chipSize * 1e-3) && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Repeaters reduced delay by {(((0.69 * 10 * chipSize * 0.5 * chipSize * 1e-3) - calculateRepeaterDelay()) / (0.69 * 10 * chipSize * 0.5 * chipSize * 1e-3) * 100).toFixed(0)}%!
              </p>
            </div>
          )}

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
            Defeating the Wire Bottleneck
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Buf</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Repeater Insertion</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Breaking a wire into N segments changes delay from <span style={{ color: colors.error }}>~L^2</span> to <span style={{ color: colors.success }}>~L</span>. The optimal number of repeaters balances wire delay against buffer delay. Modern chips use thousands of buffers on long signal paths.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Cu</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Low-Resistance Metals</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Copper replaced aluminum (40% lower resistivity). At sub-10nm nodes, cobalt and ruthenium are being explored because copper's resistivity increases as wires thin due to grain boundary scattering.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>k</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Low-k Dielectrics</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Reducing the dielectric constant from ~4 (SiO2) to ~2.5 (porous materials) cuts capacitance by 37%. Air gaps between wires (k=1) offer even lower capacitance but add manufacturing complexity.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>3D</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>3D Integration</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Stacking chips vertically dramatically reduces wire lengths. HBM memory stacks achieve huge bandwidth by going vertical instead of running long traces on a PCB. This is the future of escaping the wire bottleneck.
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
                How RC Delay Connects:
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
                ? 'You understand RC delay and interconnect design!'
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
          RC Delay Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the fundamental interconnect bottleneck that shapes modern chip design.
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
              'RC time constant determines signal transition speed',
              'Wire delay scales quadratically with length',
              'Repeater buffers linearize delay scaling',
              'Low-k dielectrics reduce capacitance',
              '3D integration shortens wire lengths',
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

export default RCDelayRenderer;
