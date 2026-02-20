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
    textMuted: 'rgba(148,163,184,0.7)',
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
    hook: 'explore phase',
    predict: 'experiment predict',
    play: 'experiment play',
    review: 'experiment review',
    twist_predict: 'experiment quiz predict',
    twist_play: 'experiment quiz play',
    twist_review: 'experiment quiz review',
    transfer: 'apply transfer',
    test: 'transfer quiz test',
    mastery: 'transfer mastery'
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
    const height = isMobile ? 380 : 420;
    const voltage = getVoltage(simulationTime);
    // Use absolute coordinates throughout (no transform groups) so getBoundingClientRect works correctly
    // Layout zones (absolute y):
    //   Title: y=20
    //   Circuit diagram: y=35..175
    //   Time constant box: y=195..270
    //   Waveform: y=285..385
    const circuitTop = 35;
    const tauBoxTop = 195;
    const waveTop = 285;
    const waveHeight = 90;
    const waveLeft = 40;
    const waveWidth = width - 80;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="rcWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.signal} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="rcCurveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.4" />
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
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          RC Circuit Step Response
        </text>

        {/* ── Circuit diagram (absolute coords) ── */}
        {/* Voltage source box */}
        <rect x="30" y={circuitTop + 20} width="32" height="50" fill={colors.bgSecondary} stroke={colors.signal} strokeWidth="2" rx="4" />
        <text x="46" y={circuitTop + 40} textAnchor="middle" fill={colors.signal} fontSize="11">Vin</text>
        <text x="46" y={circuitTop + 58} textAnchor="middle" fill={colors.signal} fontSize="12" fontWeight="600">1V</text>

        {/* Wire from source to resistor */}
        <line x1="62" y1={circuitTop + 30} x2="90" y2={circuitTop + 30} stroke={colors.wire} strokeWidth="3" />

        {/* Resistor box */}
        <rect x="90" y={circuitTop + 20} width="60" height="20" fill="none" stroke={colors.accent} strokeWidth="2" />
        {/* Resistor label ABOVE the box */}
        <text x="120" y={circuitTop + 15} textAnchor="middle" fill={colors.accent} fontSize="11">R={resistance}Ω</text>

        {/* Wire from resistor to capacitor */}
        <line x1="150" y1={circuitTop + 30} x2="180" y2={circuitTop + 30} stroke={colors.wire} strokeWidth="3" />

        {/* Capacitor plates */}
        <line x1="180" y1={circuitTop + 15} x2="180" y2={circuitTop + 45} stroke={colors.accent} strokeWidth="3" />
        <line x1="192" y1={circuitTop + 15} x2="192" y2={circuitTop + 45} stroke={colors.accent} strokeWidth="3" />
        {/* Capacitor label BELOW the plates */}
        <text x="186" y={circuitTop + 62} textAnchor="middle" fill={colors.accent} fontSize="11">C={capacitance}pF</text>

        {/* Output voltage box */}
        <rect x="212" y={circuitTop + 16} width="46" height="38" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" rx="4" />
        <text x="235" y={circuitTop + 29} textAnchor="middle" fill={colors.textMuted} fontSize="11">Vout</text>
        <text x="235" y={circuitTop + 48} textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">
          {(voltage * 1).toFixed(2)}V
        </text>

        {/* Ground connections */}
        <line x1="46" y1={circuitTop + 70} x2="46" y2={circuitTop + 95} stroke={colors.textMuted} strokeWidth="2" />
        <line x1="186" y1={circuitTop + 45} x2="186" y2={circuitTop + 95} stroke={colors.textMuted} strokeWidth="2" />
        <line x1="30" y1={circuitTop + 95} x2="210" y2={circuitTop + 95} stroke={colors.textMuted} strokeWidth="2" />
        {/* Ground symbol */}
        <line x1="100" y1={circuitTop + 95} x2="120" y2={circuitTop + 95} stroke={colors.textMuted} strokeWidth="3" />
        <line x1="104" y1={circuitTop + 100} x2="116" y2={circuitTop + 100} stroke={colors.textMuted} strokeWidth="2" />
        <line x1="108" y1={circuitTop + 105} x2="112" y2={circuitTop + 105} stroke={colors.textMuted} strokeWidth="1" />
        <text x="110" y={circuitTop + 118} textAnchor="middle" fill={colors.textMuted} fontSize="11">GND</text>

        {/* ── Time constant display box ── */}
        <rect x={width - 130} y={tauBoxTop} width="120" height="72" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
        <text x={width - 70} y={tauBoxTop + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">τ = R × C</text>
        <text x={width - 70} y={tauBoxTop + 36} textAnchor="middle" fill={colors.accent} fontSize="18" fontWeight="700">
          {tau.toFixed(2)} ns
        </text>
        <text x={width - 70} y={tauBoxTop + 53} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Rise: {riseTime.toFixed(2)} ns
        </text>
        <text x={width - 70} y={tauBoxTop + 68} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          (2.2 × τ)
        </text>

        {/* ── Waveform plot area (absolute coords) ── */}
        <rect x={waveLeft} y={waveTop} width={waveWidth} height={waveHeight} fill={colors.bgSecondary} rx="4" />

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
          const gy = waveTop + waveHeight - frac * waveHeight;
          return (
            <g key={`h-${i}`}>
              <line x1={waveLeft} y1={gy} x2={waveLeft + waveWidth} y2={gy} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <text x={waveLeft - 5} y={gy + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">
                {frac.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Time axis label - placed below tau markers */}
        <text x={waveLeft + waveWidth / 2} y={waveTop + waveHeight + 32} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Time (tau units)
        </text>

        {/* Input step (dashed) */}
        <path
          d={`M ${waveLeft} ${waveTop + waveHeight} L ${waveLeft} ${waveTop} L ${waveLeft + waveWidth} ${waveTop}`}
          fill="none"
          stroke={colors.signal}
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <text x={waveLeft + waveWidth - 4} y={waveTop - 4} textAnchor="end" fill={colors.signal} fontSize="11" opacity="0.7">Vin</text>

        {/* Output voltage curve */}
        <path
          d={(() => {
            let path = `M ${waveLeft} ${waveTop + waveHeight}`;
            const xScale = waveWidth / 10;
            for (let t = 0; t <= simulationTime; t += 0.1) {
              const v = 1 - Math.exp(-t * tau / (2 * tau));
              const x = waveLeft + t * xScale;
              const y = waveTop + waveHeight - v * waveHeight;
              path += ` L ${x} ${y}`;
            }
            return path;
          })()}
          fill="none"
          stroke={colors.success}
          strokeWidth="3"
          filter="url(#glowFilter)"
        />
        <text x={waveLeft + waveWidth - 4} y={waveTop + waveHeight - 8} textAnchor="end" fill={colors.success} fontSize="11">Vout</text>

        {/* Current position marker */}
        {simulationTime > 0 && (
          <circle
            cx={waveLeft + simulationTime * waveWidth / 10}
            cy={waveTop + waveHeight - getVoltage(simulationTime) * waveHeight}
            r={9}
            fill={colors.success}
            stroke="white"
            strokeWidth="2"
            filter="url(#glowFilter)"
          />
        )}

        {/* Tau markers */}
        {[1, 2, 3].map(n => {
          const mx = waveLeft + n * 2 * waveWidth / 10;
          return (
            <g key={`tau-${n}`}>
              <line x1={mx} y1={waveTop} x2={mx} y2={waveTop + waveHeight} stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <text x={mx} y={waveTop + waveHeight + 18} textAnchor="middle" fill={colors.accent} fontSize="11">
                {n}τ
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Repeater Visualization for twist phase
  const RepeaterVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;
    const delay = calculateRepeaterDelay();

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="repGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.signal} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Wire with {numRepeaters} Repeater{numRepeaters !== 1 ? 's' : ''}
        </text>
        <text x={width/2} y="38" textAnchor="middle" fill={colors.accent} fontSize="11" fontStyle="italic">
          Delay = {calculateRepeaterDelay().toFixed(2)} ns  |  RC×L² scaling
        </text>

        {/* Wire segments and repeaters */}
        <g transform="translate(30, 50)">
          {/* Source */}
          <rect x="0" y="30" width="25" height="30" fill={colors.signal} rx="4" />
          <text x="12" y="50" textAnchor="middle" fill="white" fontSize="11">Src</text>

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
                      y="72"
                      textAnchor="middle"
                      fill={colors.textMuted}
                      fontSize="11"
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
          <text x={width - 72} y="50" textAnchor="middle" fill="white" fontSize="11">Dst</text>
        </g>

        {/* Delay display */}
        <g transform={`translate(${width/2 - 80}, 120)`}>
          <rect x="0" y="0" width="160" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <text x="80" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="11">Total Delay</text>
          <text x="80" y="40" textAnchor="middle" fill={colors.accent} fontSize="20" fontWeight="700">
            {delay.toFixed(2)} ns
          </text>
        </g>

        {/* Formula */}
        <text x={width/2} y={height - 10} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          {numRepeaters === 0
            ? `τ~RC·L² (quadratic scaling)`
            : `τ~N·(RC·(L/N))² + N·t_buf (linear)`
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

  // Navigation bar with dots
  const renderNavBar = () => (
    <nav aria-label="Game navigation" style={{
      position: 'fixed',
      top: '4px',
      left: 0,
      right: 0,
      padding: '10px 24px',
      background: colors.bgCard,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      zIndex: 1000,
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={phaseLabels[p]}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            background: phase === p ? colors.accent : phaseOrder.indexOf(phase) > i ? colors.success : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </nav>
  );

  // Bottom bar with Back/Next
  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '12px 24px',
      background: colors.bgCard,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={() => {
          const idx = phaseOrder.indexOf(phase);
          if (idx > 0) goToPhase(phaseOrder[idx - 1]);
        }}
        disabled={phaseOrder.indexOf(phase) === 0}
        aria-label="Back"
        style={{
          padding: '10px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textPrimary,
          fontWeight: 700,
          cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
          fontSize: '15px',
        }}
      >
        Back
      </button>
      <button
        onClick={() => {
          const idx = phaseOrder.indexOf(phase);
          if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
        }}
        disabled={disabled && !canProceed}
        aria-label="Next"
        style={{
          padding: '10px 28px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #D97706)` : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 700,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '15px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Navigation dots (legacy, kept for compatibility)
  const renderNavDots = () => null;

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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
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
              margin: '0 auto 32px',
            }}>
              Are chips limited by <span style={{ color: colors.accent }}>transistor speed</span> or <span style={{ color: colors.signal }}>wire speed</span>? In modern chips, the wires are often the bottleneck.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '500px',
              margin: '0 auto 32px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
                "Every wire in a chip acts like an RC circuit. As chips shrink, wires get thinner and more resistive. The signal has to charge the wire's capacitance through its resistance — and that takes time."
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                — Interconnect Design Principles
              </p>
            </div>

            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore RC Delay
            </button>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Learning')}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                🤔 Make Your Prediction — Think before experimenting
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If you double the resistance OR capacitance of a wire, what happens to the signal transition time?
            </h2>

            {/* SVG Graphic showing RC circuit concept */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 320 : 440} height={180} viewBox={`0 0 440 180`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="predictSigGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.signal} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={colors.accent} stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="predictGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Title */}
                <text x="220" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">RC Circuit Signal Delay</text>
                {/* Input block */}
                <rect x="20" y="60" width="70" height="60" rx="6" fill={colors.bgSecondary} stroke={colors.signal} strokeWidth="2" />
                <text x="55" y="86" textAnchor="middle" fill={colors.signal} fontSize="11" fontWeight="600">Vin</text>
                <text x="55" y="104" textAnchor="middle" fill={colors.signal} fontSize="11">Step 1V</text>
                {/* Arrow */}
                <line x1="90" y1="90" x2="120" y2="90" stroke={colors.wire} strokeWidth="3" />
                <polygon points="118,85 128,90 118,95" fill={colors.wire} />
                {/* RC block */}
                <rect x="128" y="55" width="90" height="70" rx="6" fill={`${colors.accent}22`} stroke={colors.accent} strokeWidth="2" />
                <text x="173" y="80" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">R × C</text>
                <text x="173" y="96" textAnchor="middle" fill={colors.accent} fontSize="11">τ = RC</text>
                <text x="173" y="113" textAnchor="middle" fill={colors.textMuted} fontSize="11">wire delay</text>
                {/* Arrow */}
                <line x1="218" y1="90" x2="250" y2="90" stroke={colors.wire} strokeWidth="3" />
                <polygon points="248,85 258,90 248,95" fill={colors.wire} />
                {/* Output block */}
                <rect x="258" y="60" width="70" height="60" rx="6" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" />
                <text x="293" y="86" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Vout</text>
                <text x="293" y="104" textAnchor="middle" fill={colors.success} fontSize="11">Delayed</text>
                {/* Question mark */}
                <circle cx="370" cy="90" r="28" fill={`${colors.warning}22`} stroke={colors.warning} strokeWidth="2" filter="url(#predictGlow)" />
                <text x="370" y="97" textAnchor="middle" fill={colors.warning} fontSize="22" fontWeight="700">?</text>
                {/* Formula */}
                <text x="220" y="160" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontStyle="italic">τ = R × C determines how fast signals transition</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
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
        </div>
        {renderBottomBar(!prediction, !!prediction, 'Test My Prediction')}
      </div>
    );
  }


  // PLAY PHASE - Interactive RC Circuit Simulator
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            RC Circuit Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Adjust R and C to see how they affect signal rise time. Observe how increasing R or C slows the signal.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            This matters in real chips — every wire has resistance and capacitance, creating RC delay that limits performance.
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
              {/* Main visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <RCCircuitVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
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
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
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
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
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
        </div>
        {renderBottomBar(false, true, 'Understand the Physics')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of RC Delay
            </h2>

            {/* Prediction reference - always shown */}
            <div style={{
              background: `${colors.signal}22`,
              border: `1px solid ${colors.signal}44`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
            }}>
              <p style={{ ...typo.small, color: colors.signal, margin: 0 }}>
                {prediction === 'b'
                  ? '✓ Your prediction was correct! Doubling R or C doubles the time constant, slowing the signal.'
                  : prediction
                    ? '✗ Your prediction: doubling R or C actually doubles the RC time constant and slows the signal.'
                    : 'In your experiment, you observed that increasing R or C slows signal transitions — the RC time constant determines this delay.'}
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
                  <strong style={{ color: colors.textPrimary }}>τ = R × C (Time Constant)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The time constant τ determines how fast a signal transitions. After <span style={{ color: colors.accent }}>1τ</span>, voltage reaches 63% of final value. After <span style={{ color: colors.accent }}>3τ</span>, it reaches 95%.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>10-90% Rise Time = 2.2 × τ</strong>
                </p>
                <p>
                  This is the practical signal transition speed measure. For R=100Ω and C=10pF: rise time = <span style={{ color: colors.success }}>2.2ns</span>.
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
                <li>R = ρ × L / A (resistance ∝ length)</li>
                <li>C = ε × L × W / d (capacitance ∝ length)</li>
                <li><strong>Delay ∝ R×C ∝ L²</strong> (quadratic scaling!)</li>
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
                As chips shrink, transistors get faster but wires get slower. Thinner wires = higher R. At advanced nodes (7nm, 5nm, 3nm), interconnect delay often exceeds gate delay — wires are the real bottleneck.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover the Solution
            </button>
          </div>
        </div>
        {renderBottomBar(false, true, 'Discover the Solution')}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                🔄 New Variable: Repeater Buffers — predict the effect
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Engineers insert "repeaters" (buffers) along long wires. What happens to total delay?
            </h2>

            {/* SVG graphic showing repeater concept */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 320 : 440} height={160} viewBox="0 0 440 160" style={{ background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="twistPredGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.signal} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={colors.success} stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="twistGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <text x="220" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Repeater Buffers on Long Wire</text>
                {/* Long wire without repeaters */}
                <text x="10" y="55" fill={colors.textMuted} fontSize="11">Without:</text>
                <rect x="70" y="40" width="30" height="20" rx="3" fill={colors.signal} />
                <text x="85" y="55" textAnchor="middle" fill="white" fontSize="11">Src</text>
                <line x1="100" y1="50" x2="350" y2="50" stroke={colors.wire} strokeWidth="4" />
                <text x="225" y="43" textAnchor="middle" fill={colors.textMuted} fontSize="11">Long wire — high delay</text>
                <rect x="350" y="40" width="30" height="20" rx="3" fill={colors.success} />
                <text x="365" y="55" textAnchor="middle" fill="white" fontSize="11">Dst</text>
                {/* Wire with repeaters */}
                <text x="10" y="110" fill={colors.textMuted} fontSize="11">With:</text>
                <rect x="70" y="95" width="30" height="20" rx="3" fill={colors.signal} />
                <text x="85" y="110" textAnchor="middle" fill="white" fontSize="11">Src</text>
                <line x1="100" y1="105" x2="155" y2="105" stroke={colors.wire} strokeWidth="4" />
                <polygon points="155,97 170,105 155,113" fill={colors.accent} filter="url(#twistGlow)" />
                <line x1="170" y1="105" x2="225" y2="105" stroke={colors.wire} strokeWidth="4" />
                <polygon points="225,97 240,105 225,113" fill={colors.accent} filter="url(#twistGlow)" />
                <line x1="240" y1="105" x2="295" y2="105" stroke={colors.wire} strokeWidth="4" />
                <polygon points="295,97 310,105 295,113" fill={colors.accent} filter="url(#twistGlow)" />
                <line x1="310" y1="105" x2="350" y2="105" stroke={colors.wire} strokeWidth="4" />
                <rect x="350" y="95" width="30" height="20" rx="3" fill={colors.success} />
                <text x="365" y="110" textAnchor="middle" fill="white" fontSize="11">Dst</text>
                <text x="215" y="130" textAnchor="middle" fill={colors.accent} fontSize="11">3 Repeater buffers — ?</text>
                <text x="220" y="150" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontStyle="italic">τ delay = R×C×L²  vs  shorter segments</text>
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
        </div>
        {renderBottomBar(!twistPrediction, !!twistPrediction, 'See Repeater Effect')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Repeater Optimization
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Find the optimal number of repeaters to minimize delay
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
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <RepeaterVisualization />
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
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Chip size slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Wire Length</span>
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
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              {/* Number of repeaters slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Repeaters</span>
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
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>0</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>10</span>
                </div>
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
        </div>
        {renderBottomBar(false, true, 'Understand the Solution')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
        </div>
        {renderBottomBar(false, true, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            App {selectedApp + 1} of {realWorldApps.length}
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
                How RC Delay Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 8px 0' }}>
                {app.connection}
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Examples */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ ...typo.small, color: colors.textMuted, fontWeight: 600, marginBottom: '6px' }}>Real Examples:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {app.examples.map((ex: string, i: number) => (
                  <span key={i} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${app.color}40`,
                    borderRadius: '4px',
                    padding: '3px 8px',
                    color: colors.textSecondary,
                    fontSize: '12px',
                  }}>{ex}</span>
                ))}
              </div>
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

          {/* Got It / Next App button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  setSelectedApp(selectedApp + 1);
                }}
                style={{ ...primaryButtonStyle }}
              >
                Got It — Next App
              </button>
            ) : (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        </div>
        </div>
        {renderBottomBar(false, true, allAppsCompleted ? 'Take the Test' : 'Next')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          {renderNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
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

          {/* Answer review */}
          {testQuestions.map((q, qi) => {
            const ans = testAnswers[qi];
            const correct = q.options.find(o => o.correct);
            const isCorrect = ans !== null && ans === correct?.id;
            return (
              <div key={qi} style={{
                background: colors.bgCard,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
              }}>
                <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' }}>
                  {isCorrect ? '✓' : '✗'} Q{qi + 1}: {isCorrect ? 'Correct' : `Wrong — ${correct?.label}`}
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>{q.explanation}</p>
              </div>
            );
          })}

          {passed ? (
            <button onClick={() => { playSound('complete'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
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
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}
            >
              Review and Try Again
            </button>
          )}
          </div>
          </div>
          {renderBottomBar(false, passed, passed ? 'Complete Lesson' : 'Try Again')}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
        </div>
        {renderBottomBar(false, false, 'Submit Test')}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
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

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
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
        </div>
        </div>
        {renderBottomBar(false, true, 'Return to Dashboard')}
      </div>
    );
  }

  return null;
};

export default RCDelayRenderer;
