'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Speed CPU Design',
    short: 'Interconnect RC delays limit how fast modern processors can operate',
    tagline: 'When wires become the bottleneck',
    description: 'In modern CPUs with billions of transistors, the wires connecting them have become the limiting factor for speed. As transistors shrink, interconnect delays dominated by RC time constants now consume 50-70% of signal propagation time. Intel, AMD, and other chip designers spend enormous effort optimizing wire routing to minimize these delays.',
    connection: 'This game teaches the fundamental RC delay physics that chip designers use every day to predict and minimize signal propagation delays.',
    howItWorks: 'Each metal wire acts as a distributed RC network. Resistance comes from thin copper traces. Capacitance forms between adjacent wires and to substrate. Signal edges slow as they charge this distributed capacitance. Repeaters (buffers) break long wires into segments to reduce delay.',
    stats: [
      { value: '50-70%', label: 'Delay from interconnects', icon: '⚡' },
      { value: '10+ km', label: 'Total wire per chip', icon: '📏' },
      { value: '13+ layers', label: 'Metal interconnect stack', icon: '🏗️' }
    ],
    examples: ['Intel Core processors', 'AMD Ryzen chips', 'Apple M-series', 'NVIDIA GPUs'],
    companies: ['Intel', 'AMD', 'TSMC', 'Samsung Foundry'],
    futureImpact: 'Advanced materials like graphene and optical interconnects may eventually overcome copper RC limitations for next-generation chips.',
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'High-Bandwidth Memory',
    short: 'Memory interfaces optimize trace geometry to minimize RC delay and signal integrity',
    tagline: 'Racing data from memory to processor',
    description: 'DDR5 memory runs at 6400+ MT/s, with signal round-trips in under 15 nanoseconds. At these speeds, the RC delay of every millimeter of trace matters. Memory designers carefully match trace lengths and impedances to ensure all data bits arrive simultaneously, preventing timing errors.',
    connection: 'The RC delay analysis in this game is exactly what memory interface engineers perform when designing traces for high-speed DRAM communication.',
    howItWorks: 'Memory traces are impedance-matched transmission lines with controlled RC characteristics. Trace width, spacing, dielectric thickness, and copper weight are all tuned to minimize delay variation between bits. On-die termination resistors absorb reflections.',
    stats: [
      { value: '6400 MT/s', label: 'DDR5 transfer rate', icon: '🚀' },
      { value: '<15ns', label: 'Memory latency target', icon: '⏱️' },
      { value: '±5ps', label: 'Bit-to-bit timing match', icon: '🎯' }
    ],
    examples: ['DDR5 server memory', 'HBM3 graphics memory', 'LPDDR5 mobile', 'GDDR6X gaming'],
    companies: ['Micron', 'Samsung', 'SK Hynix', 'Kingston'],
    futureImpact: 'Memory stacking and 3D integration will shorten interconnects, enabling memory bandwidth to continue scaling beyond planar limits.',
    color: '#10B981'
  },
  {
    icon: '📡',
    title: 'PCB Signal Integrity',
    short: 'High-frequency board design requires careful RC delay matching for reliable signals',
    tagline: 'The art of the perfect circuit board',
    description: 'Modern circuit boards running at GHz speeds must account for RC delays in every trace. Signals that look clean at low frequencies develop timing skew, reflections, and crosstalk at high speeds. Signal integrity engineers simulate and optimize trace geometry to ensure reliable operation.',
    connection: 'The RC interconnect physics in this game directly applies to PCB design, where distributed resistance and capacitance determine signal quality.',
    howItWorks: 'PCB traces are modeled as distributed RC networks or transmission lines depending on length. Controlled impedance traces (50/100 ohm) minimize reflections. Length matching ensures synchronous arrival. Via stubs and crosstalk are minimized through careful layout.',
    stats: [
      { value: '50Ω/100Ω', label: 'Standard impedances', icon: '📐' },
      { value: '25+ Gbps', label: 'PCIe 5.0 lane rate', icon: '💨' },
      { value: '$10B+', label: 'PCB market size', icon: '📈' }
    ],
    examples: ['Server motherboards', 'Network switches', '5G base stations', 'Automotive ECUs'],
    companies: ['Cadence', 'Synopsys (Sigrity)', 'Ansys', 'Keysight'],
    futureImpact: 'AI-assisted PCB design tools will automatically optimize trace routing for minimum RC delay while meeting manufacturing constraints.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Mobile SoC Design',
    short: 'Smartphone chips minimize interconnect delay to balance performance with power efficiency',
    tagline: 'Billions of transistors in your pocket',
    description: 'Mobile systems-on-chip pack CPU, GPU, NPU, and memory controllers into chips smaller than a fingernail. Every interconnect must be optimized for both delay and power consumption - charging and discharging wire capacitance wastes energy. RC delay management is crucial for all-day battery life.',
    connection: 'This game teaches that delay scales with RC product - the same principle mobile chip designers use to minimize both latency and power consumption.',
    howItWorks: 'Mobile SoCs use aggressive power gating to shut down unused blocks. Active interconnects use minimum-width traces where delay permits to reduce capacitance. Critical paths use wider traces with repeaters. Clock trees are carefully balanced for minimal skew.',
    stats: [
      { value: '<5W', label: 'Typical SoC power budget', icon: '🔋' },
      { value: '15B+', label: 'Transistors per chip', icon: '🔢' },
      { value: '3nm', label: 'Latest process node', icon: '🔬' }
    ],
    examples: ['Apple A17 Bionic', 'Qualcomm Snapdragon 8', 'Samsung Exynos', 'MediaTek Dimensity'],
    companies: ['Apple', 'Qualcomm', 'MediaTek', 'Samsung LSI'],
    futureImpact: 'Chiplet architectures and advanced packaging will change interconnect design, using shorter on-package wires with lower RC delays.',
    color: '#F59E0B'
  }
];

type RCPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface RCDelayInterconnectRendererProps {
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wire: '#f59e0b',
  signal: '#22c55e',
  delayed: '#ef4444',
  copper: '#b87333',
};

const phaseOrder: RCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<RCPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Understanding',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const RCDelayInterconnectRenderer: React.FC<RCDelayInterconnectRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): RCPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as RCPhase)) {
      return gamePhase as RCPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<RCPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external gamePhase if provided (for resume)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as RCPhase)) {
      setPhase(gamePhase as RCPhase);
    }
  }, [gamePhase]);

  // Detect mobile
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

  // Navigation functions
  const goToPhase = useCallback((newPhase: RCPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(newPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [wireLength, setWireLength] = useState(1000); // micrometers
  const [wireWidth, setWireWidth] = useState(100); // nanometers
  const [metalLayer, setMetalLayer] = useState<'aluminum' | 'copper'>('copper');
  const [technologyNode, setTechnologyNode] = useState(14); // nm
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [selectedApp, setSelectedApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculateRCDelay = useCallback(() => {
    // Resistivity (ohm-cm converted to appropriate units)
    const resistivity = metalLayer === 'copper' ? 1.7e-6 : 2.8e-6; // ohm-cm

    // Wire dimensions
    const length = wireLength * 1e-4; // convert um to cm
    const width = wireWidth * 1e-7; // convert nm to cm
    const thickness = width * 0.5; // assume aspect ratio of 2

    // Resistance: R = rho * L / (W * T)
    const resistance = resistivity * length / (width * thickness);

    // Capacitance (simplified model): C = epsilon * L * W / spacing
    // Assume dielectric constant ~3 for low-k material
    const epsilon = 3 * 8.85e-14; // F/cm
    const spacing = width; // assume spacing equals width
    const capacitance = epsilon * length * width / spacing;

    // RC delay (Elmore delay approximation)
    const rcDelay = 0.7 * resistance * capacitance; // seconds

    // Signal frequency limit
    const maxFrequency = 0.35 / rcDelay; // Hz

    // Technology scaling factor (smaller = higher R, higher C per unit)
    const scalingFactor = (14 / technologyNode);

    // Adjusted values for technology node
    const scaledDelay = rcDelay * scalingFactor * scalingFactor; // quadratic scaling
    const scaledFreq = maxFrequency / (scalingFactor * scalingFactor);

    return {
      resistance: resistance / 1000, // kohms
      capacitance: capacitance * 1e15, // fF
      rcDelay: scaledDelay * 1e12, // ps
      maxFrequency: scaledFreq / 1e9, // GHz
      riseTime: 2.2 * scaledDelay * 1e12, // ps (10-90% rise time)
    };
  }, [wireLength, wireWidth, metalLayer, technologyNode]);

  const predictions = [
    { id: 'constant', label: 'Signal speed stays constant regardless of wire dimensions' },
    { id: 'linear', label: 'Delay increases linearly with wire length' },
    { id: 'quadratic', label: 'Delay increases with length squared (L^2) - much worse!' },
    { id: 'logarithmic', label: 'Delay increases logarithmically - not much effect' },
  ];

  const twistPredictions = [
    { id: 'solved', label: 'Copper completely solved the resistance problem' },
    { id: 'partial', label: 'Copper helped but resistance is still a growing challenge at smaller nodes' },
    { id: 'worse', label: 'Copper actually made things worse' },
    { id: 'same', label: 'Copper is the same as aluminum - no real benefit' },
  ];

  const transferApplications = [
    {
      title: 'CPU Clock Distribution',
      description: 'Modern CPUs run at GHz frequencies. The clock signal must reach all parts of the chip simultaneously, but RC delay causes skew.',
      question: 'Why do CPUs use clock tree structures instead of a single wire?',
      answer: 'Long wires have quadratic RC delay. By using a tree of shorter wires with buffers (repeaters), the delay is reduced from L^2 to L. This enables synchronous operation at GHz speeds across the entire chip.',
    },
    {
      title: 'Advanced Packaging (3D ICs)',
      description: '3D stacked chips use vertical connections (TSVs) between layers. These short paths dramatically reduce interconnect delay.',
      question: 'Why does vertical stacking help with interconnect delay?',
      answer: 'TSVs are 10-100x shorter than horizontal interconnects that would span the same distance. Since delay scales with L^2, shorter paths give enormous improvements - a 10x shorter path has 100x less delay!',
    },
    {
      title: 'Network-on-Chip (NoC)',
      description: 'Modern processors use packet-based networks instead of long global wires to communicate between cores.',
      question: 'Why did chip designers switch from buses to networks-on-chip?',
      answer: 'Global wires have prohibitive RC delay at GHz frequencies. NoC breaks communication into short hops with routers. Each hop is fast; the added latency from routing is less than global wire delay.',
    },
    {
      title: 'Memory Interface Design',
      description: 'DDR5 memory runs at 4800+ MT/s. The traces connecting CPU to memory must be precisely length-matched.',
      question: 'Why must memory traces be exactly the same length?',
      answer: 'Different trace lengths cause different RC delays. If data bits arrive at different times (skew), the memory controller cannot reliably sample them. Length matching ensures all bits experience identical delay.',
    },
  ];

  const testQuestions = [
    {
      scenario: 'An Intel chip designer is routing a 1mm copper wire at 7nm. They double the wire length to 2mm to reach a distant circuit block.',
      question: 'How does RC delay scale with wire length?',
      options: [
        { text: 'Linearly (double length = double delay)', correct: false },
        { text: 'Quadratically (double length = 4x delay)', correct: true },
        { text: 'Logarithmically (double length = small increase)', correct: false },
        { text: 'Constant (length does not matter)', correct: false },
      ],
    },
    {
      question: 'Why did the semiconductor industry replace aluminum with copper for interconnects?',
      options: [
        { text: 'Copper is cheaper than aluminum', correct: false },
        { text: 'Copper has lower resistance, reducing RC delay', correct: true },
        { text: 'Copper is easier to process', correct: false },
        { text: 'Copper looks better under a microscope', correct: false },
      ],
    },
    {
      question: 'As technology nodes shrink (e.g., 14nm to 7nm), what happens to interconnect delay?',
      options: [
        { text: 'Delay decreases because wires are shorter', correct: false },
        { text: 'Delay stays the same', correct: false },
        { text: 'Delay increases because thinner wires have higher resistance', correct: true },
        { text: 'Delay becomes unpredictable', correct: false },
      ],
    },
    {
      question: 'What is a repeater (buffer) used for in long interconnects?',
      options: [
        { text: 'To boost the signal voltage', correct: false },
        { text: 'To break a long wire into shorter segments, reducing quadratic delay', correct: true },
        { text: 'To filter out noise', correct: false },
        { text: 'To reduce power consumption', correct: false },
      ],
    },
    {
      question: 'Why is the RC time constant (tau = R x C) important for chip design?',
      options: [
        { text: 'It determines the maximum clock frequency for a wire', correct: true },
        { text: 'It affects only the power consumption', correct: false },
        { text: 'It is only relevant for analog circuits', correct: false },
        { text: 'It determines the wire temperature', correct: false },
      ],
    },
    {
      question: 'What is electromigration and why is it related to interconnect resistance?',
      options: [
        { text: 'Electrons moving through thin wires can physically move metal atoms, increasing resistance over time', correct: true },
        { text: 'Electrons migrate to the surface of wires', correct: false },
        { text: 'It is a quantum effect that reduces resistance', correct: false },
        { text: 'It only occurs in aluminum, not copper', correct: false },
      ],
    },
    {
      question: 'Low-k dielectrics are used in modern chips to:',
      options: [
        { text: 'Increase wire resistance', correct: false },
        { text: 'Reduce capacitance between wires, decreasing RC delay', correct: true },
        { text: 'Improve thermal conductivity', correct: false },
        { text: 'Make wires more visible under inspection', correct: false },
      ],
    },
    {
      question: 'Why do modern chips use multiple metal layers?',
      options: [
        { text: 'To make the chip thicker and stronger', correct: false },
        { text: 'To provide more routing options and allow thicker wires for long-distance signals', correct: true },
        { text: 'To reduce manufacturing cost', correct: false },
        { text: 'For aesthetic reasons only', correct: false },
      ],
    },
    {
      question: 'Signal integrity problems in interconnects include:',
      options: [
        { text: 'Delay, crosstalk, and signal attenuation', correct: true },
        { text: 'Only power consumption issues', correct: false },
        { text: 'Only manufacturing defects', correct: false },
        { text: 'Only temperature effects', correct: false },
      ],
    },
    {
      question: 'At what point does interconnect delay become more significant than transistor delay?',
      options: [
        { text: 'At large technology nodes (> 100nm)', correct: false },
        { text: 'Starting around 130nm and getting worse at smaller nodes', correct: true },
        { text: 'Only at cryogenic temperatures', correct: false },
        { text: 'Interconnect delay is never significant', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const delay = calculateRCDelay();
    const width = 400;
    const height = 340;

    // Signal propagation animation
    const signalProgress = (animationTime / 360);
    const pulsePhase = Math.sin(animationTime * 0.05) * 0.5 + 0.5;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        {/* Title outside SVG */}
        <h3 style={{
          color: colors.textPrimary,
          fontSize: typo.heading,
          fontWeight: 700,
          margin: 0,
          textAlign: 'center',
          letterSpacing: '-0.01em',
        }}>
          RC Delay in Chip{' '}
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #b87333 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Interconnects</span>
        </h3>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="rcdiLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1a1a2e" />
              <stop offset="50%" stopColor="#0f0f1a" />
              <stop offset="75%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Premium copper wire gradient with metallic sheen */}
            <linearGradient id="rcdiCopperWire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b4513" />
              <stop offset="15%" stopColor="#b87333" />
              <stop offset="35%" stopColor="#da9f5f" />
              <stop offset="50%" stopColor="#e8c496" />
              <stop offset="65%" stopColor="#da9f5f" />
              <stop offset="85%" stopColor="#b87333" />
              <stop offset="100%" stopColor="#8b4513" />
            </linearGradient>

            {/* Premium aluminum wire gradient */}
            <linearGradient id="rcdiAluminumWire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7a7a7a" />
              <stop offset="15%" stopColor="#a8a8a8" />
              <stop offset="35%" stopColor="#c8c8c8" />
              <stop offset="50%" stopColor="#e0e0e0" />
              <stop offset="65%" stopColor="#c8c8c8" />
              <stop offset="85%" stopColor="#a8a8a8" />
              <stop offset="100%" stopColor="#7a7a7a" />
            </linearGradient>

            {/* Dielectric layer gradient */}
            <linearGradient id="rcdiDielectric" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b4f7a" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#4a5f8a" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#3b4f7a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2a3f6a" stopOpacity="0.4" />
            </linearGradient>

            {/* Signal pulse gradient */}
            <radialGradient id="rcdiSignalPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <stop offset="30%" stopColor="#4ade80" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Delayed signal gradient */}
            <linearGradient id="rcdiDelayedSignal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>

            {/* Waveform background gradient */}
            <linearGradient id="rcdiWaveformBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#0a0a0a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </linearGradient>

            {/* Capacitor plate gradient */}
            <linearGradient id="rcdiCapPlate" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Resistor gradient */}
            <linearGradient id="rcdiResistor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b87333" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b87333" />
            </linearGradient>

            {/* Stats panel gradient */}
            <linearGradient id="rcdiStatsBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
            </linearGradient>

            {/* Ground plane gradient */}
            <linearGradient id="rcdiGround" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.3" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="rcdiSignalGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rcdiWireGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rcdiAccentGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rcdiSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect x={0} y={0} width={width} height={height} fill="url(#rcdiLabBg)" rx={12} />
          {/* Border markers to ensure full width utilization */}
          <line x1={0} y1={height-2} x2={width-5} y2={height-2} stroke="rgba(245,158,11,0.05)" strokeWidth={1} />
          {/* Width anchors at extremes */}
          <circle cx={width-10} cy={height-10} r={3} fill="rgba(245,158,11,0.1)" />
          <rect x={width-8} y={height-8} width={4} height={4} fill="rgba(0,0,0,0)" />

          {/* Wire representation section */}
          <g transform="translate(50, 15)">
            {/* Dielectric layers with gradient */}
            <rect x={0} y={15} width={300} height={50} fill="url(#rcdiDielectric)" rx={6} stroke="rgba(100,100,200,0.3)" strokeWidth={1} />

            {/* The wire itself with premium gradient */}
            <rect
              x={10}
              y={30}
              width={280}
              height={Math.max(6, wireWidth / 20)}
              fill={metalLayer === 'copper' ? 'url(#rcdiCopperWire)' : 'url(#rcdiAluminumWire)'}
              rx={3}
              filter="url(#rcdiWireGlow)"
            />

            {/* Wire highlight */}
            <rect
              x={10}
              y={30}
              width={280}
              height={Math.max(2, wireWidth / 60)}
              fill="rgba(255,255,255,0.2)"
              rx={1}
            />

            {/* Ground plane with gradient */}
            <line x1={10} y1={58} x2={290} y2={58} stroke="url(#rcdiGround)" strokeWidth={2} strokeDasharray="6,3" />

            {/* Signal propagation animation with glow */}
            <ellipse
              cx={10 + signalProgress * 270}
              cy={30 + Math.max(3, wireWidth / 40)}
              rx={15}
              ry={Math.max(4, wireWidth / 30)}
              fill="url(#rcdiSignalPulse)"
              filter="url(#rcdiSignalGlow)"
              opacity={0.7 + pulsePhase * 0.3}
            >
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.3s" repeatCount="indefinite" />
            </ellipse>
          </g>

          {/* Axis labels */}
          <text x={18} y={108} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform="rotate(-90,18,130)">Voltage</text>
          <text x={200} y={215} fill={colors.textMuted} fontSize={11} textAnchor="middle">Time</text>

          {/* Waveform comparison section */}
          <g transform="translate(50, 95)">
            {/* Y-axis label */}
            <text x={-5} y={22} fill={colors.signal} fontSize={11} textAnchor="end">In</text>
            <text x={-5} y={77} fill={colors.delayed} fontSize={11} textAnchor="end">Out</text>
            {/* Input signal - ideal square wave */}
            <rect x={0} y={0} width={300} height={45} fill="url(#rcdiWaveformBg)" rx={6} stroke="rgba(34,197,94,0.3)" strokeWidth={1} />
            <polyline
              points="10,35 10,12 80,12 80,35 150,35 150,12 220,12 220,35 290,35"
              stroke={colors.signal}
              strokeWidth={2.5}
              fill="none"
              filter="url(#rcdiSoftGlow)"
            />

            {/* Output signal - RC delayed (exponential rise/fall) - expanded vertical range */}
            <rect x={0} y={55} width={300} height={90} fill="url(#rcdiWaveformBg)" rx={6} stroke="rgba(239,68,68,0.3)" strokeWidth={1} />
            <path
              d={`M 10 145
                  Q 18 145, 25 133
                  Q 33 120, 42 106
                  Q 55 88, 68 72
                  Q 78 60, 85 56
                  Q 95 53, 102 59
                  Q 115 74, 125 93
                  Q 135 113, 142 130
                  Q 148 141, 155 145
                  Q 163 145, 170 133
                  Q 178 120, 188 106
                  Q 202 88, 214 72
                  Q 226 60, 233 56
                  Q 244 53, 250 59
                  Q 263 74, 272 93
                  Q 280 112, 288 130
                  Q 292 141, 295 145`}
              stroke="url(#rcdiDelayedSignal)"
              strokeWidth={2.5}
              fill="none"
              filter="url(#rcdiSoftGlow)"
            />

            {/* Delay indicator arrow */}
            <line x1={10} y1={110} x2={45} y2={110} stroke={colors.accent} strokeWidth={3} filter="url(#rcdiAccentGlow)" />
            <polygon points="45,106 55,110 45,114" fill={colors.accent} filter="url(#rcdiAccentGlow)" />
          </g>

          {/* RC circuit model - RC ladder visualization */}
          <g transform="translate(50, 220)">
            {/* Resistor and capacitor ladder */}
            {[0, 1, 2, 3].map(i => (
              <g key={i} transform={`translate(${i * 70 + 20}, 0)`}>
                {/* Resistor symbol with gradient */}
                <polyline
                  points="0,10 5,10 8,3 14,17 20,3 26,17 32,3 38,17 41,10 50,10"
                  stroke="url(#rcdiResistor)"
                  strokeWidth={2.5}
                  fill="none"
                  filter="url(#rcdiSoftGlow)"
                />
                {/* Capacitor connection line */}
                <line x1={25} y1={22} x2={25} y2={35} stroke={colors.textMuted} strokeWidth={1.5} />
                {/* Capacitor plates with gradient */}
                <line x1={15} y1={35} x2={35} y2={35} stroke="url(#rcdiCapPlate)" strokeWidth={3} filter="url(#rcdiSoftGlow)" />
                <line x1={15} y1={42} x2={35} y2={42} stroke="url(#rcdiCapPlate)" strokeWidth={3} filter="url(#rcdiSoftGlow)" />
                {/* Ground connection */}
                <line x1={25} y1={42} x2={25} y2={55} stroke={colors.textMuted} strokeWidth={1.5} />
              </g>
            ))}

            {/* Ground line with gradient */}
            <line x1={20} y1={60} x2={300} y2={60} stroke="url(#rcdiGround)" strokeWidth={2} />
            {/* Ground symbol */}
            <g transform="translate(302, 55)">
              <line x1={0} y1={5} x2={15} y2={5} stroke={colors.textMuted} strokeWidth={2} />
              <line x1={3} y1={9} x2={12} y2={9} stroke={colors.textMuted} strokeWidth={1.5} />
              <line x1={6} y1={13} x2={9} y2={13} stroke={colors.textMuted} strokeWidth={1} />
            </g>
          </g>

          {/* Stats panel with premium styling */}
          <g transform="translate(250, 10)">
            <rect x={0} y={0} width={140} height={80} fill="url(#rcdiStatsBg)" rx={10} stroke={colors.accent} strokeWidth={1.5} filter="url(#rcdiSoftGlow)" />
            {/* Stats content */}
            <text x={10} y={20} fill={colors.textSecondary} fontSize={11} fontWeight="500">R: {delay.resistance.toFixed(2)} k\u03A9</text>
            <text x={10} y={38} fill={colors.textSecondary} fontSize={11} fontWeight="500">C: {delay.capacitance.toFixed(1)} fF</text>
            <text x={10} y={56} fill={colors.accent} fontSize={11} fontWeight="700" filter="url(#rcdiAccentGlow)">Delay: {delay.rcDelay.toFixed(1)} ps</text>
            <text x={10} y={72} fill={colors.success} fontSize={11} fontWeight="600">Max f: {delay.maxFrequency.toFixed(2)} GHz</text>
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          padding: `0 ${typo.pagePadding}`,
          gap: typo.elementGap,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}>
            <span style={{
              color: colors.textMuted,
              fontSize: typo.label,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>Dielectric</span>
            <span style={{
              color: colors.textSecondary,
              fontSize: typo.small,
            }}>Low-k Material</span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              color: colors.signal,
              fontSize: typo.small,
              fontWeight: 600,
            }}>Input Signal</span>
            <span style={{
              color: colors.delayed,
              fontSize: typo.small,
              fontWeight: 600,
            }}>Output (Delayed)</span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}>
            <span style={{
              color: colors.textMuted,
              fontSize: typo.label,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>RC Model</span>
            <span style={{
              color: colors.textSecondary,
              fontSize: typo.small,
            }}>Distributed RC</span>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Wire Length (distance): {wireLength} um — affects resistance and delay
        </label>
        <input
          type="range"
          min="100"
          max="5000"
          step="100"
          value={wireLength}
          onChange={(e) => setWireLength(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Width: {wireWidth} nm
        </label>
        <input
          type="range"
          min="20"
          max="500"
          step="10"
          value={wireWidth}
          onChange={(e) => setWireWidth(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Technology Node: {technologyNode} nm
        </label>
        <input
          type="range"
          min="3"
          max="45"
          step="1"
          value={technologyNode}
          onChange={(e) => setTechnologyNode(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Metal Layer: {metalLayer.charAt(0).toUpperCase() + metalLayer.slice(1)}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMetalLayer('copper')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: metalLayer === 'copper' ? `2px solid ${colors.copper}` : '1px solid rgba(255,255,255,0.2)',
              background: metalLayer === 'copper' ? 'rgba(184, 115, 51, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            Copper (Cu)
          </button>
          <button
            onClick={() => setMetalLayer('aluminum')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: metalLayer === 'aluminum' ? '2px solid #a8a8a8' : '1px solid rgba(255,255,255,0.2)',
              background: metalLayer === 'aluminum' ? 'rgba(168, 168, 168, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            Aluminum (Al)
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          RC Delay = 0.7 × Resistance × Capacitance (Elmore delay)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Resistance (R) ∝ L/W², Capacitance (C) ∝ L × W, so Delay ∝ L² (quadratic)
        </div>
      </div>
    </div>
  );

  const buttonStyle = {
    WebkitTapHighlightColor: 'transparent' as const,
  };

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '6px' : '8px',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexWrap: 'wrap' as const,
      zIndex: 1000,
    }}>
      {phaseOrder.map((p, index) => {
        const currentIndex = phaseOrder.indexOf(phase);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            aria-label={phaseLabels[p]}
            style={{
              ...buttonStyle,
              width: isMobile ? '28px' : '32px',
              height: isMobile ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.1)',
              color: isCompleted || isCurrent ? 'white' : colors.textMuted,
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={phase === 'hook'}
        style={{
          ...buttonStyle,
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
          fontWeight: 'bold',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          opacity: phase === 'hook' ? 0.5 : 1,
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          ...buttonStyle,
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', minHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              RC Delay in Interconnects
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do smaller chip features not always mean faster chips?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Transistors keep getting faster as they shrink. But the wires connecting them
                are getting slower! Thinner wires have higher resistance, and closer spacing
                means more capacitance.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 500 }}>
                This is why interconnect delay is now the bottleneck in modern chips.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Explore how wire dimensions and materials affect signal delay!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A signal needs to travel across a chip through a metal wire.
              The wire has both resistance (R) and capacitance (C) to ground.
              How does the delay scale as you make the wire longer?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you double the wire length, what happens to the RC delay?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore RC Delay</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The visualization shows how signal delay changes as you adjust wire parameters.
              Watch how the waveform illustrates the RC time constant. Observe what happens when
              you increase wire length or switch metal layers.
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Double the wire length - does delay double or quadruple?</li>
              <li>Compare copper vs aluminum at the same dimensions</li>
              <li>See how shrinking the technology node affects delay</li>
              <li>Find wire dimensions that allow 5 GHz operation</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'quadratic';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              RC delay scales with length SQUARED! This means both R and C increase with length,
              so delay = R x C increases as L x L = L^2. Therefore, double the length means 4x the delay!
              {prediction && prediction !== 'quadratic' && ` You predicted "${predictions.find(p => p.id === prediction)?.label}" — but the correct answer is quadratic scaling because R ∝ L and C ∝ L.`}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of RC Delay — As You Observed in the Experiment</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Resistance:</strong> R = rho x L / A.
                Longer wire = higher R because resistance is proportional to length. Thinner wire = smaller area = even higher R.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Capacitance:</strong> C proportional to L.
                Longer wire = more capacitance to ground and adjacent wires. This means C also grows with L.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Delay:</strong> <span style={{ fontWeight: 500 }}>tau = R x C = (rho x L/A) x (epsilon x L)
                = L^2. Therefore, this quadratic scaling is devastating for long wires!</span>
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>The Solution:</strong> Use repeaters to break
                long wires into shorter segments. n segments of length L/n have delay n x (L/n)^2 = L^2/n.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              In the late 1990s, the industry switched from aluminum to copper wires...
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Copper Revolution:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Copper has 40% lower resistivity than aluminum. IBM introduced copper interconnects
              in 1997, and the industry followed. But did this solve the interconnect delay problem?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Did switching to copper solve the resistance problem?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Materials & Nodes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how copper helps, but scaling still hurts
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between copper and aluminum to see the ~40% resistance improvement.
              But then shrink the technology node from 45nm to 7nm - notice how delay
              increases even with copper! The wires are getting so thin that resistance
              is increasing faster than we can compensate.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'partial';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Copper helped buy time, but resistance is still a growing problem.
              As wires shrink below ~20nm, electron scattering from surfaces and grain
              boundaries increases resistance dramatically.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Ongoing Challenge</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Size Effects:</strong> When wires are
                thinner than the electron mean free path (~40nm in copper), resistivity increases.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>New Materials:</strong> Researchers are
                exploring cobalt, ruthenium, and even carbon nanotubes for future interconnects.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Architecture Solutions:</strong> 3D stacking,
                chiplets, and optical interconnects are becoming necessary to avoid the RC wall.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const currentApp = transferApplications[selectedApp];
    const isCurrentAppCompleted = transferCompleted.has(selectedApp);
    const allAppsCompleted = transferCompleted.size >= transferApplications.length;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              RC delay affects chip design at every level — from Intel to TSMC to Apple
            </p>
            {/* Industry Context */}
            <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: `1px solid ${colors.accent}` }}>
              <p style={{ color: colors.accent, fontWeight: 700, marginBottom: '4px', fontSize: '13px' }}>Industry Impact:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                In modern CPUs (Intel, AMD, Apple M-series, TSMC-fabricated chips), interconnect RC delays now consume 50-70% of signal propagation time.
                At 3nm technology nodes, over 10km of copper wire fits on each chip across 13+ metal layers.
                Companies like Cadence, Synopsys, and Ansys build EDA tools specifically to model and minimize RC delay.
              </p>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px', fontWeight: 600 }}>
              Explore Application {selectedApp + 1} of {transferApplications.length}
            </p>
            {/* App selector tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {transferApplications.map((app, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedApp(i)}
                  style={{ ...buttonStyle, padding: '6px 12px', borderRadius: '6px', border: `1px solid ${i === selectedApp ? colors.accent : transferCompleted.has(i) ? colors.success : 'rgba(255,255,255,0.2)'}`, background: i === selectedApp ? `${colors.accent}22` : 'transparent', color: transferCompleted.has(i) ? colors.success : i === selectedApp ? colors.accent : colors.textSecondary, fontSize: '12px', cursor: 'pointer' }}
                >
                  {i + 1}. {app.title.split(' ').slice(0, 2).join(' ')} {transferCompleted.has(i) ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              border: isCurrentAppCompleted ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{currentApp.title}</h3>
              {isCurrentAppCompleted && <span style={{ color: colors.success }}>✓ Complete</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{currentApp.description}</p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', margin: 0 }}>{currentApp.question}</p>
            </div>
            {isCurrentAppCompleted ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px', margin: 0 }}>{currentApp.answer}</p>
              </div>
            ) : (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, selectedApp]))}
                style={{ ...buttonStyle, padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', marginBottom: '12px' }}
              >
                Got It - Show Answer
              </button>
            )}
            {isCurrentAppCompleted && selectedApp < transferApplications.length - 1 && (
              <button
                onClick={() => setSelectedApp(selectedApp + 1)}
                style={{ ...buttonStyle, padding: '10px 20px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Got It - Next Application →
              </button>
            )}
          </div>
        </div>
        {renderBottomBar(allAppsCompleted, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand RC delay in interconnects!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 700 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              {(currentQ as { scenario?: string; question: string }).scenario && (
                <p style={{ color: colors.textMuted, fontSize: '13px', fontStyle: 'italic', marginBottom: '8px' }}>
                  {(currentQ as { scenario?: string; question: string }).scenario}
                </p>
              )}
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>Select the best answer below. Use the physics concepts from RC delay: τ = R × C, where R ∝ L and C ∝ L.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ ...buttonStyle, padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left' as const, fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand RC delay in chip interconnects!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>RC delay scales quadratically with length (L^2)</li>
              <li>Copper replaced aluminum for lower resistance</li>
              <li>Smaller technology nodes increase relative delay</li>
              <li>Repeaters break wires to reduce quadratic scaling</li>
              <li>Low-k dielectrics reduce capacitance</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The interconnect crisis is driving revolutionary changes in chip design: 3D stacking
              puts memory on top of logic, chiplets connect multiple smaller dies, and researchers
              are exploring optical interconnects that could eliminate RC delay entirely for long-distance
              on-chip communication!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default RCDelayInterconnectRenderer;
