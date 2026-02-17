'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 184: SRAM CELL STABILITY
// ============================================================================
// Physics: 6T SRAM uses cross-coupled inverters for bistable storage
// Read disturb: accessing the cell can flip its state
// Write margin: cell must be weak enough to overwrite
// SNM (Static Noise Margin) quantifies stability
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface SRAMCellRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '💾',
    title: 'CPU Cache Memory',
    short: 'Ultra-fast memory for processor performance',
    tagline: 'Nanoseconds matter here',
    description: 'Modern CPUs use multiple levels of SRAM cache (L1, L2, L3) to bridge the speed gap between fast processors and slow main memory. Cache hit rates determine real-world performance more than clock speed.',
    connection: 'SRAM cell stability directly affects cache reliability. The static noise margin determines whether a cell holds its data while being read or when supply voltage droops during power-saving modes.',
    howItWorks: 'L1 cache uses the fastest, largest 6T SRAM cells optimized for speed. L2/L3 use denser cells with smaller transistors. Read disturb protection prevents data corruption during the millions of accesses per second.',
    stats: [
      { value: '<1ns', label: 'L1 cache access', icon: '⚡' },
      { value: '512KB', label: 'Typical L2 cache', icon: '💾' },
      { value: '50%', label: 'Die area for cache', icon: '📊' }
    ],
    examples: ['Intel Core processors', 'AMD Ryzen chips', 'Apple M-series', 'Server Xeons'],
    companies: ['Intel', 'AMD', 'Apple', 'ARM'],
    futureImpact: 'New SRAM architectures with improved stability will enable lower voltage operation, reducing power consumption in mobile and data center processors.',
    color: '#3b82f6'
  },
  {
    icon: '📱',
    title: 'Mobile Device Memory',
    short: 'Low-power memory for phones and tablets',
    tagline: 'Every milliwatt counts',
    description: 'Smartphones rely on SRAM for graphics buffers, neural network accelerators, and system caches. Low-power SRAM variants operate at reduced voltages to extend battery life while maintaining stability.',
    connection: 'Operating SRAM at lower voltages reduces power quadratically but shrinks stability margins. Cell design must balance power savings against read disturb and retention failures.',
    howItWorks: 'Mobile SRAM uses techniques like read-assist and write-assist circuits to maintain margins at low voltage. Power gating turns off unused cache blocks. Temperature variation in phones tests stability limits.',
    stats: [
      { value: '0.5V', label: 'Low-power operation', icon: '🔋' },
      { value: '100x', label: 'Lower leakage than DRAM', icon: '💡' },
      { value: '8MB+', label: 'Mobile GPU cache', icon: '📱' }
    ],
    examples: ['iPhone processors', 'Qualcomm Snapdragon', 'Samsung Exynos', 'MediaTek Dimensity'],
    companies: ['Apple', 'Qualcomm', 'Samsung', 'TSMC'],
    futureImpact: 'Advanced finFET and gate-all-around transistors will enable even lower voltage SRAM operation, potentially doubling mobile processor efficiency.',
    color: '#22c55e'
  },
  {
    icon: '🎮',
    title: 'GPU Shared Memory',
    short: 'High-bandwidth memory for parallel computing',
    tagline: 'Feeding the parallel beast',
    description: 'GPUs contain megabytes of on-chip SRAM shared between thousands of processing cores. This memory enables high-bandwidth data sharing critical for graphics rendering and AI inference.',
    connection: 'GPU SRAM must support simultaneous access from many cores. Multi-port cell designs trade density for bandwidth, and read disturb becomes more challenging with higher access rates.',
    howItWorks: 'Modern GPUs use register files and shared memory built from SRAM. Banks allow parallel access. Error correction (ECC) detects and corrects soft errors in server GPUs.',
    stats: [
      { value: '20TB/s', label: 'Aggregate bandwidth', icon: '🚀' },
      { value: '128KB', label: 'Per SM shared memory', icon: '🔢' },
      { value: '144MB', label: 'H100 L2 cache', icon: '💾' }
    ],
    examples: ['NVIDIA RTX graphics', 'AMD RDNA gaming', 'AI training clusters', 'Scientific computing'],
    companies: ['NVIDIA', 'AMD', 'Intel Arc', 'Google TPU'],
    futureImpact: 'Chiplet-based GPUs will integrate more SRAM closer to compute units, with novel 3D stacking enabling unprecedented on-chip memory capacity.',
    color: '#8b5cf6'
  },
  {
    icon: '🌐',
    title: 'Network Router Buffers',
    short: 'Packet storage for internet traffic',
    tagline: 'Keeping the internet flowing',
    description: 'Network routers and switches use large SRAM arrays to buffer packets while making forwarding decisions. The stability and speed of this memory directly affects internet latency and throughput.',
    connection: 'Router SRAM experiences continuous read-write cycles at wire speed. Cell stability must be maintained while operating at maximum frequency with minimal latency for line-rate packet processing.',
    howItWorks: 'Packet buffers use wide SRAM arrays to match port speeds. Content-addressable memory (CAM) built from SRAM enables fast routing table lookups. Quality of service requires reliable priority queue management.',
    stats: [
      { value: '400Gb/s', label: 'Per port speed', icon: '🌐' },
      { value: '256MB', label: 'Typical buffer size', icon: '📦' },
      { value: '10ns', label: 'Lookup latency', icon: '⏱️' }
    ],
    examples: ['Data center switches', 'Internet backbone routers', '5G base stations', 'Enterprise networking'],
    companies: ['Cisco', 'Juniper', 'Arista', 'Broadcom'],
    futureImpact: 'Terabit-speed networking will require even faster, denser SRAM for buffering as the internet scales to support AR/VR, autonomous vehicles, and IoT.',
    color: '#f59e0b'
  }
];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  high: '#22c55e',
  low: '#3b82f6',
  transistor: '#8b5cf6',
  wordline: '#f97316',
  bitline: '#06b6d4',
  border: '#334155',
};

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Disturb',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const SRAMCellRenderer: React.FC<SRAMCellRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
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
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  // SRAM cell state
  const [storedBit, setStoredBit] = useState(1); // 0 or 1
  const [wordLineActive, setWordLineActive] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [writeValue, setWriteValue] = useState(0);

  // Simulation parameters
  const [cellRatio, setCellRatio] = useState(1.5); // Pull-down to access transistor ratio
  const [supplyVoltage, setSupplyVoltage] = useState(1.0);
  const [processVariation, setProcessVariation] = useState(0); // % variation
  const [temperature, setTemperature] = useState(25);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Stability event tracking
  const [readDisturbOccurred, setReadDisturbOccurred] = useState(false);
  const [writeFailureOccurred, setWriteFailureOccurred] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations
  const calculateStability = useCallback(() => {
    // Static Noise Margin depends on cell ratio, voltage, and variations
    // Higher cell ratio = better read stability but worse write margin
    const baseSnm = 0.3 * supplyVoltage * Math.sqrt(cellRatio);

    // Process variation degrades SNM
    const variationFactor = 1 - (processVariation / 100) * 0.5;

    // Temperature effect (higher temp = lower SNM)
    const tempFactor = 1 - (temperature - 25) / 200;

    const snm = baseSnm * variationFactor * tempFactor;

    // Read margin (ability to read without disturbing)
    const readMargin = snm * 1.2;

    // Write margin (ability to overwrite the cell)
    // Higher cell ratio makes writing harder
    const writeMargin = (supplyVoltage * 0.4) / Math.sqrt(cellRatio) * variationFactor;

    // Failure probabilities (simplified model)
    const readDisturbProb = Math.max(0, (0.3 - snm) / 0.3) * 100;
    const writeFailureProb = Math.max(0, (0.2 - writeMargin) / 0.2) * 100;

    // Overall stability score
    const stabilityScore = Math.min(snm, writeMargin) * 100;

    return {
      snm,
      readMargin,
      writeMargin,
      readDisturbProb,
      writeFailureProb,
      stabilityScore,
      isStable: snm > 0.1 && writeMargin > 0.1,
      readStable: readDisturbProb < 10,
      writeCapable: writeFailureProb < 10,
    };
  }, [cellRatio, supplyVoltage, processVariation, temperature]);

  // Perform read operation
  const performRead = useCallback(() => {
    const stability = calculateStability();

    // Synchronous visual feedback
    setWordLineActive(true);
    setIsReading(true);

    // Simulate read disturb probability
    const random = Math.random() * 100;
    const willDisturb = random < stability.readDisturbProb;

    if (willDisturb) {
      setTimeout(() => {
        setStoredBit(prev => 1 - prev); // Flip bit!
        setReadDisturbOccurred(true);
      }, 500);
    }

    setTimeout(() => {
      setWordLineActive(false);
      setIsReading(false);
    }, 1000);
  }, [calculateStability]);

  // Perform write operation
  const performWrite = useCallback((value: number) => {
    const stability = calculateStability();
    setWordLineActive(true);
    setIsWriting(true);
    setWriteValue(value);

    // Simulate write failure probability
    const random = Math.random() * 100;
    if (random < stability.writeFailureProb) {
      setWriteFailureOccurred(true);
      // Write fails - bit doesn't change
    } else {
      setTimeout(() => {
        setStoredBit(value);
      }, 500);
    }

    setTimeout(() => {
      setWordLineActive(false);
      setIsWriting(false);
    }, 1000);
  }, [calculateStability]);

  const predictions = [
    { id: 'simple', label: 'It is just a simple latch - turn on power and it remembers' },
    { id: 'bistable', label: 'Two cross-coupled inverters create a bistable circuit that locks into 0 or 1' },
    { id: 'capacitor', label: 'A tiny capacitor stores the charge representing the bit' },
    { id: 'magnetic', label: 'Magnetic domains in the transistors store the information' },
  ];

  const twistPredictions = [
    { id: 'always_stable', label: 'SRAM cells are always stable once written' },
    { id: 'read_disturb', label: 'Reading the cell can accidentally flip its stored value' },
    { id: 'write_easy', label: 'Writing is always easy because the cell is designed to be overwritten' },
    { id: 'size_irrelevant', label: 'Cell size does not affect stability' },
  ];

  const transferApplications = [
    {
      title: 'CPU Cache Memory',
      description: 'L1/L2/L3 caches use SRAM for fast access with <1ns latency. Stability directly impacts reliability - modern CPUs dedicate 50% of die area to cache!',
      question: 'Why do CPU caches use SRAM instead of DRAM?',
      answer: 'SRAM is much faster (no refresh needed, direct access) and can be placed close to the CPU core. The tradeoff is 6 transistors per bit vs 1 transistor + capacitor for DRAM, making SRAM ~6x larger and more expensive per bit.',
    },
    {
      title: 'Register Files',
      description: 'CPU registers are the fastest memory, holding data being actively computed. They are accessed billions of times per second (>3GHz) using high-performance SRAM with 6T cells.',
      question: 'Why are register files even more critical for stability than caches?',
      answer: 'Registers are accessed every clock cycle (billions of times per second). Even a tiny failure probability compounds into significant risk. Register SRAM uses larger transistors and higher cell ratios for maximum stability.',
    },
    {
      title: 'Embedded SRAM in SoCs',
      description: 'Modern chips embed megabytes of SRAM for buffers, FIFOs, and scratchpads. Each must be reliable across all operating conditions.',
      question: 'How do designers handle SRAM stability across voltage/temperature variations?',
      answer: 'Designs include margin for worst-case corners (low voltage, high temperature, process variation). Some chips use adaptive body biasing to tune transistor characteristics, and redundant bit cells allow error correction.',
    },
    {
      title: 'Low-Power IoT Devices',
      description: 'Battery-powered devices need to retain SRAM contents during sleep at 0.5V to save power. At such low voltage, noise margins shrink by 60% requiring careful cell design.',
      question: 'Why is ultra-low voltage SRAM operation challenging?',
      answer: 'SNM decreases with voltage - at 0.5V, the noise margin may be only 50-100mV. Process variations that were tolerable at 1V become critical at low voltage. Special 8T or 10T cells with separate read/write paths improve low-voltage stability.',
    },
  ];

  const testQuestions = [
    {
      question: 'How many transistors are in a standard SRAM cell?',
      options: [
        { text: '1 transistor (1T)', correct: false },
        { text: '4 transistors (4T)', correct: false },
        { text: '6 transistors (6T)', correct: true },
        { text: '8 transistors (8T)', correct: false },
      ],
    },
    {
      question: 'What creates the bistable storage in an SRAM cell?',
      options: [
        { text: 'A charged capacitor', correct: false },
        { text: 'Two cross-coupled inverters', correct: true },
        { text: 'Magnetic polarization', correct: false },
        { text: 'Floating gate charge', correct: false },
      ],
    },
    {
      question: 'What is "read disturb" in SRAM?',
      options: [
        { text: 'Noise from adjacent cells during read', correct: false },
        { text: 'The read operation accidentally flipping the stored bit', correct: true },
        { text: 'Slow read access time', correct: false },
        { text: 'Power consumption during read', correct: false },
      ],
    },
    {
      question: 'What is Static Noise Margin (SNM)?',
      options: [
        { text: 'The maximum frequency of operation', correct: false },
        { text: 'The minimum voltage difference the cell can distinguish', correct: false },
        { text: 'A measure of how much noise the cell can tolerate without flipping', correct: true },
        { text: 'The power consumed during standby', correct: false },
      ],
    },
    {
      question: 'How does the cell ratio affect SRAM stability?',
      options: [
        { text: 'Higher ratio improves read stability but worsens write margin', correct: true },
        { text: 'Higher ratio improves both read and write', correct: false },
        { text: 'Cell ratio has no effect on stability', correct: false },
        { text: 'Lower ratio always improves stability', correct: false },
      ],
    },
    {
      question: 'Why does lowering supply voltage hurt SRAM stability?',
      options: [
        { text: 'It slows down the transistors', correct: false },
        { text: 'It reduces the noise margin between high and low states', correct: true },
        { text: 'It increases leakage current', correct: false },
        { text: 'It has no effect on stability', correct: false },
      ],
    },
    {
      question: 'What is the purpose of access transistors in a 6T SRAM cell?',
      options: [
        { text: 'To provide power to the cell', correct: false },
        { text: 'To connect the cell to bit lines when word line is active', correct: true },
        { text: 'To store the data bit', correct: false },
        { text: 'To amplify the signal', correct: false },
      ],
    },
    {
      question: 'How does process variation affect SRAM yield?',
      options: [
        { text: 'It has no effect on modern processes', correct: false },
        { text: 'Random transistor mismatches can make some cells unstable', correct: true },
        { text: 'It only affects read speed, not stability', correct: false },
        { text: 'Larger cells are more affected by variation', correct: false },
      ],
    },
    {
      question: 'Why do some designs use 8T SRAM cells instead of 6T?',
      options: [
        { text: 'To store more bits', correct: false },
        { text: 'To separate read and write paths for better stability', correct: true },
        { text: 'To reduce power consumption', correct: false },
        { text: 'To decrease cell size', correct: false },
      ],
    },
    {
      question: 'What happens during a write operation in a 6T SRAM cell?',
      options: [
        { text: 'The capacitor is charged or discharged', correct: false },
        { text: 'The access transistors connect bit lines which overpower the inverters', correct: true },
        { text: 'Current flows through the word line', correct: false },
        { text: 'The cell is first erased then written', correct: false },
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
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 400;
    const output = calculateStability();

    // Node voltages based on stored bit
    const qVoltage = storedBit === 1 ? supplyVoltage : 0;
    const qBarVoltage = storedBit === 1 ? 0 : supplyVoltage;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Title label outside SVG */}
        <div style={{
          fontSize: typo.heading,
          fontWeight: 700,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: '4px'
        }}>
          6T SRAM Cell - Stored: <span style={{ color: storedBit === 1 ? colors.high : colors.low }}>{storedBit}</span>
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium PMOS transistor gradient - blue-purple tones */}
            <linearGradient id="sramPmosGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="75%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* Premium NMOS transistor gradient - purple-indigo tones */}
            <linearGradient id="sramNmosGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="25%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="75%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>

            {/* Access transistor gradient - when inactive */}
            <linearGradient id="sramAccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="30%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            {/* Access transistor gradient - when active (orange) */}
            <linearGradient id="sramAccessActiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* VDD power rail gradient - green */}
            <linearGradient id="sramVddGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="75%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>

            {/* GND rail gradient - blue */}
            <linearGradient id="sramGndGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Word line gradient - when inactive */}
            <linearGradient id="sramWordlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Word line gradient - when active */}
            <linearGradient id="sramWordlineActiveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* Bit line gradient - cyan */}
            <linearGradient id="sramBitlineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Q node HIGH gradient - green glow */}
            <radialGradient id="sramNodeHighGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="30%" stopColor="#4ade80" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>

            {/* Q node LOW gradient - blue glow */}
            <radialGradient id="sramNodeLowGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>

            {/* Cross-coupling wire gradient - amber */}
            <linearGradient id="sramCrossCouple" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Metrics panel background gradient */}
            <linearGradient id="sramMetricsBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
            </linearGradient>

            {/* Status indicator backgrounds */}
            <linearGradient id="sramReadingBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="sramWritingBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="sramDisturbBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
            </linearGradient>

            {/* Transistor glow filter */}
            <filter id="sramTransistorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Node glow filter - stronger */}
            <filter id="sramNodeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Word line active glow */}
            <filter id="sramWordlineGlow" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bit line highlight glow */}
            <filter id="sramBitlineGlow" x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Status text glow */}
            <filter id="sramStatusGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Data storage pulse animation */}
            <radialGradient id="sramStoragePulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6">
                <animate attributeName="stopOpacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0">
                <animate attributeName="stopOpacity" values="0;0.3;0" dur="2s" repeatCount="indefinite" />
              </stop>
            </radialGradient>
          </defs>

          {/* Background grid pattern */}
          <pattern id="sramGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#sramGrid)" />

          {/* VDD rail with gradient */}
          <line x1={80} y1={50} x2={320} y2={50} stroke="url(#sramVddGradient)" strokeWidth={4} strokeLinecap="round" />

          {/* Left inverter (P1, N1) */}
          <g transform="translate(100, 70)">
            {/* PMOS P1 with gradient and glow */}
            <rect x={0} y={0} width={30} height={25} fill="url(#sramPmosGradient)" rx={4} filter="url(#sramTransistorGlow)" />
            <rect x={2} y={2} width={26} height={4} fill="rgba(255,255,255,0.2)" rx={2} />

            {/* NMOS N1 with gradient and glow */}
            <rect x={0} y={60} width={30} height={25} fill="url(#sramNmosGradient)" rx={4} filter="url(#sramTransistorGlow)" />
            <rect x={2} y={62} width={26} height={4} fill="rgba(255,255,255,0.15)" rx={2} />

            {/* Connections with metallic look */}
            <line x1={15} y1={25} x2={15} y2={60} stroke="#94a3b8" strokeWidth={3} />
            <line x1={15} y1={25} x2={15} y2={60} stroke="#cbd5e1" strokeWidth={1} />

            {/* Q node with glow */}
            <circle cx={15} cy={42} r={10} fill={qVoltage > 0.5 ? 'url(#sramNodeHighGradient)' : 'url(#sramNodeLowGradient)'} />
            {/* Storage pulse animation around active node */}
            {storedBit === 1 && (
              <circle cx={15} cy={42} r={14} fill="url(#sramStoragePulse)" />
            )}
          </g>

          {/* Right inverter (P2, N2) */}
          <g transform="translate(270, 70)">
            {/* PMOS P2 with gradient and glow */}
            <rect x={0} y={0} width={30} height={25} fill="url(#sramPmosGradient)" rx={4} filter="url(#sramTransistorGlow)" />
            <rect x={2} y={2} width={26} height={4} fill="rgba(255,255,255,0.2)" rx={2} />

            {/* NMOS N2 with gradient and glow */}
            <rect x={0} y={60} width={30} height={25} fill="url(#sramNmosGradient)" rx={4} filter="url(#sramTransistorGlow)" />
            <rect x={2} y={62} width={26} height={4} fill="rgba(255,255,255,0.15)" rx={2} />

            {/* Connections with metallic look */}
            <line x1={15} y1={25} x2={15} y2={60} stroke="#94a3b8" strokeWidth={3} />
            <line x1={15} y1={25} x2={15} y2={60} stroke="#cbd5e1" strokeWidth={1} />

            {/* Q-bar node with glow */}
            <circle cx={15} cy={42} r={10} fill={qBarVoltage > 0.5 ? 'url(#sramNodeHighGradient)' : 'url(#sramNodeLowGradient)'} />
            {/* Storage pulse animation around active node */}
            {storedBit === 0 && (
              <circle cx={15} cy={42} r={14} fill="url(#sramStoragePulse)" />
            )}
          </g>

          {/* Cross-coupling connections with gradient */}
          <polyline
            points="145,112 180,112 180,90 235,90"
            stroke="url(#sramCrossCouple)"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray={wordLineActive ? "none" : "6,3"}
            opacity={wordLineActive ? 1 : 0.7}
          />
          <polyline
            points="255,112 220,112 220,90 165,90"
            stroke="url(#sramCrossCouple)"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray={wordLineActive ? "none" : "6,3"}
            opacity={wordLineActive ? 1 : 0.7}
          />

          {/* Access transistors */}
          <g transform="translate(60, 140)">
            {/* Left access transistor with dynamic gradient */}
            <rect
              x={0} y={0} width={25} height={20}
              fill={wordLineActive ? 'url(#sramAccessActiveGradient)' : 'url(#sramAccessGradient)'}
              rx={3}
              filter={wordLineActive ? 'url(#sramTransistorGlow)' : 'none'}
            />
            <rect x={2} y={2} width={21} height={3} fill="rgba(255,255,255,0.2)" rx={1} />
          </g>

          <g transform="translate(315, 140)">
            {/* Right access transistor with dynamic gradient */}
            <rect
              x={0} y={0} width={25} height={20}
              fill={wordLineActive ? 'url(#sramAccessActiveGradient)' : 'url(#sramAccessGradient)'}
              rx={3}
              filter={wordLineActive ? 'url(#sramTransistorGlow)' : 'none'}
            />
            <rect x={2} y={2} width={21} height={3} fill="rgba(255,255,255,0.2)" rx={1} />
          </g>

          {/* Word line with gradient and conditional glow */}
          <line
            x1={30} y1={150} x2={370} y2={150}
            stroke={wordLineActive ? 'url(#sramWordlineActiveGradient)' : 'url(#sramWordlineGradient)'}
            strokeWidth={wordLineActive ? 4 : 2}
            strokeLinecap="round"
            filter={wordLineActive ? 'url(#sramWordlineGlow)' : 'none'}
          />

          {/* Bit lines with gradient and glow during operations */}
          <line
            x1={72} y1={165} x2={72} y2={220}
            stroke="url(#sramBitlineGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            filter={(isReading || isWriting) ? 'url(#sramBitlineGlow)' : 'none'}
          />
          <line
            x1={327} y1={165} x2={327} y2={220}
            stroke="url(#sramBitlineGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            filter={(isReading || isWriting) ? 'url(#sramBitlineGlow)' : 'none'}
          />

          {/* GND rail with gradient */}
          <line x1={80} y1={175} x2={320} y2={175} stroke="url(#sramGndGradient)" strokeWidth={4} strokeLinecap="round" />

          {/* Read/Write operation indicators */}
          {isReading && (
            <g>
              <rect x={140} y={195} width={120} height={30} fill="url(#sramReadingBg)" rx={6} />
              <rect x={140} y={195} width={120} height={30} fill="none" stroke="#06b6d4" strokeWidth={1} rx={6} strokeOpacity={0.5} />
              {/* Animated data flow indicators */}
              <circle cx={72} cy={190} r={4} fill="#22d3ee" filter="url(#sramNodeGlow)">
                <animate attributeName="cy" values="190;200;190" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={327} cy={190} r={4} fill="#22d3ee" filter="url(#sramNodeGlow)">
                <animate attributeName="cy" values="190;200;190" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {isWriting && (
            <g>
              <rect x={130} y={195} width={140} height={30} fill="url(#sramWritingBg)" rx={6} />
              <rect x={130} y={195} width={140} height={30} fill="none" stroke="#f97316" strokeWidth={1} rx={6} strokeOpacity={0.5} />
              {/* Animated write pulses on bit lines */}
              <circle cx={72} cy={200} r={5} fill="#fb923c" filter="url(#sramNodeGlow)">
                <animate attributeName="cy" values="200;175;200" dur="0.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={327} cy={200} r={5} fill="#fb923c" filter="url(#sramNodeGlow)">
                <animate attributeName="cy" values="200;175;200" dur="0.4s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {readDisturbOccurred && !isReading && (
            <g>
              <rect x={115} y={195} width={170} height={30} fill="url(#sramDisturbBg)" rx={6} />
              <rect x={115} y={195} width={170} height={30} fill="none" stroke="#ef4444" strokeWidth={1.5} rx={6}>
                <animate attributeName="strokeOpacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
              </rect>
            </g>
          )}

          {/* Metrics panel with gradient background */}
          <rect x={15} y={235} width={370} height={140} fill="url(#sramMetricsBg)" rx={10} stroke="#334155" strokeWidth={1} />

          {/* Grid lines for reference */}
          <line x1={80} y1={260} x2={370} y2={260} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />
          <line x1={80} y1={285} x2={370} y2={285} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />
          <line x1={80} y1={310} x2={370} y2={310} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />
          <line x1={80} y1={335} x2={370} y2={335} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />
          <line x1={80} y1={360} x2={370} y2={360} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />

          {/* Y-axis */}
          <line x1={80} y1={245} x2={80} y2={365} stroke={colors.textMuted} strokeWidth={1.5} />
          <text x={5} y={395} fill={colors.textMuted} fontSize="11" fontWeight="bold">Voltage (V)</text>

          {/* Y-axis tick labels */}
          <text x={72} y={248} fill={colors.textSecondary} fontSize="11" textAnchor="end">1.0</text>
          <text x={72} y={288} fill={colors.textSecondary} fontSize="11" textAnchor="end">0.75</text>
          <text x={72} y={313} fill={colors.textSecondary} fontSize="11" textAnchor="end">0.5</text>
          <text x={72} y={338} fill={colors.textSecondary} fontSize="11" textAnchor="end">0.25</text>
          <text x={72} y={363} fill={colors.textSecondary} fontSize="11" textAnchor="end">0.0</text>

          {/* X-axis */}
          <line x1={80} y1={360} x2={370} y2={360} stroke={colors.textMuted} strokeWidth={1.5} />
          <text x={225} y={392} fill={colors.textMuted} fontSize="11" fontWeight="bold" textAnchor="middle">Cell State</text>

          {/* X-axis tick marks and labels */}
          <line x1={130} y1={360} x2={130} y2={365} stroke={colors.textMuted} strokeWidth={1} />
          <text x={130} y={378} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Q</text>
          <line x1={225} y1={360} x2={225} y2={365} stroke={colors.textMuted} strokeWidth={1} />
          <text x={225} y={378} fill={colors.textSecondary} fontSize="11" textAnchor="middle">SNM</text>
          <line x1={320} y1={360} x2={320} y2={365} stroke={colors.textMuted} strokeWidth={1} />
          <text x={320} y={378} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Q-bar</text>

          {/* Dynamic voltage visualization curve - SNM butterfly diagram showing stability margin */}
          <path
            d={`M 90 248
                L 110 248
                L 130 248
                L 155 ${248 + Math.min(output.snm * 160, 108)}
                L 175 ${248 + Math.min(output.snm * 190, 108)}
                L 200 ${248 + Math.min(output.snm * 200, 108)}
                L 225 ${248 + Math.min((1 - output.snm * 0.5) * 130, 110)}
                L 250 ${248 + Math.min(output.snm * 200, 108)}
                L 275 ${248 + Math.min(output.snm * 190, 108)}
                L 300 ${248 + Math.min(output.snm * 160, 108)}
                L 335 248
                L 360 248`}
            fill="none"
            stroke={output.isStable ? colors.high : colors.error}
            strokeWidth="3"
            opacity={0.8}
          />

          {/* Reference baseline at nominal voltage */}
          <line x1={90} y1={260} x2={360} y2={260} stroke={colors.success} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.4} />
          <circle cx={90} cy={260} r={3} fill={colors.success} opacity={0.6} />

          {/* Interactive point showing current stability - moves with sliders */}
          <circle
            cx={225}
            cy={360 - output.snm * 200}
            r={6}
            fill={colors.accent}
            filter="url(#sramNodeGlow)"
          />
          <circle
            cx={225}
            cy={360 - output.snm * 200}
            r={10}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
            opacity={0.5}
          >
            <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Additional dynamic indicators based on cell ratio */}
          <rect
            x={100}
            y={360 - cellRatio * 40}
            width={50}
            height={cellRatio * 40}
            fill={colors.transistor}
            opacity={0.3}
            rx={4}
          />
          <text x={125} y={320} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="bold">
            beta={cellRatio.toFixed(1)}
          </text>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          width: '100%',
          maxWidth: '500px',
          marginTop: '-130px',
          padding: '12px 20px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Left column - margins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: typo.small, color: colors.textSecondary }}>
              SNM: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{(output.snm * 1000).toFixed(0)} mV</span>
            </div>
            <div style={{ fontSize: typo.small, color: colors.textSecondary }}>
              Read Margin: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{(output.readMargin * 1000).toFixed(0)} mV</span>
            </div>
            <div style={{ fontSize: typo.small, color: colors.textSecondary }}>
              Write Margin: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{(output.writeMargin * 1000).toFixed(0)} mV</span>
            </div>
          </div>

          {/* Center column - cell info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textSecondary }}>
              Cell Ratio: <span style={{ color: colors.accent, fontWeight: 600 }}>{cellRatio.toFixed(1)}</span>
            </div>
            <div style={{ fontSize: typo.small, color: colors.high }}>
              VDD: {supplyVoltage.toFixed(2)}V
            </div>
            <div style={{
              fontSize: typo.small,
              color: output.isStable ? colors.success : colors.error,
              fontWeight: 700
            }}>
              {output.isStable ? 'STABLE' : 'UNSTABLE'}
            </div>
          </div>

          {/* Right column - risks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ fontSize: typo.small, color: output.readStable ? colors.success : colors.error }}>
              Read Risk: {output.readDisturbProb.toFixed(1)}%
            </div>
            <div style={{ fontSize: typo.small, color: output.writeCapable ? colors.success : colors.error }}>
              Write Risk: {output.writeFailureProb.toFixed(1)}%
            </div>
            <div style={{ fontSize: typo.small, color: colors.textMuted }}>
              Q={qVoltage.toFixed(1)}V | Q̄={qBarVoltage.toFixed(1)}V
            </div>
          </div>
        </div>

        {/* Status messages outside SVG */}
        {isReading && (
          <div style={{
            fontSize: typo.body,
            color: colors.bitline,
            fontWeight: 700,
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            READING...
          </div>
        )}

        {isWriting && (
          <div style={{
            fontSize: typo.body,
            color: colors.wordline,
            fontWeight: 700,
            padding: '8px 16px',
            background: 'rgba(249, 115, 22, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(249, 115, 22, 0.3)'
          }}>
            WRITING {writeValue}...
          </div>
        )}

        {readDisturbOccurred && !isReading && (
          <div style={{
            fontSize: typo.body,
            color: colors.error,
            fontWeight: 700,
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            animation: 'pulse 1s ease-in-out infinite'
          }}>
            READ DISTURB OCCURRED!
          </div>
        )}

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setReadDisturbOccurred(false); performRead(); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.bitline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Read
            </button>
            <button
              onClick={() => { setWriteFailureOccurred(false); performWrite(0); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.wordline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Write 0
            </button>
            <button
              onClick={() => { setWriteFailureOccurred(false); performWrite(1); }}
              disabled={isReading || isWriting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isReading || isWriting ? colors.textMuted : colors.wordline,
                color: 'white',
                fontWeight: 'bold',
                cursor: isReading || isWriting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Write 1
            </button>
            <button
              onClick={() => { setStoredBit(1); setReadDisturbOccurred(false); setWriteFailureOccurred(false); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    const output = calculateStability();

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Cell Ratio (beta): {cellRatio.toFixed(1)}
          </label>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={cellRatio}
            onChange={(e) => setCellRatio(parseFloat(e.target.value))}
            style={{ width: '100%', touchAction: 'pan-y', accentColor: colors.accent }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
            <span>1.0 (weak read)</span>
            <span>2.0 (balanced)</span>
            <span>3.0 (strong read)</span>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Supply Voltage: {supplyVoltage.toFixed(2)}V
          </label>
          <input
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={supplyVoltage}
            onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
            style={{ width: '100%', touchAction: 'pan-y', accentColor: colors.accent }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Process Variation: {processVariation}%
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={processVariation}
            onChange={(e) => setProcessVariation(parseInt(e.target.value))}
            style={{ width: '100%', touchAction: 'pan-y', accentColor: colors.accent }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Temperature: {temperature}C
          </label>
          <input
            type="range"
            min="-40"
            max="125"
            step="5"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', touchAction: 'pan-y', accentColor: colors.accent }}
          />
        </div>

        <div style={{
          background: output.isStable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${output.isStable ? colors.success : colors.error}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            {output.isStable ? 'Cell is Stable' : 'Warning: Stability Issues!'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Higher cell ratio helps read stability but hurts write margin. Find the balance!
          </div>
        </div>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'opacity 0.2s ease, background-color 0.2s ease'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              SRAM Cell Stability
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How does a 6-transistor SRAM cell remember a bit?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Every bit of cache in your CPU is stored in a tiny SRAM cell with just 6 transistors.
                These cells must reliably hold data through billions of read and write cycles.
                But the physics of making them smaller creates surprising challenges!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try reading and writing to the cell. Watch the Q and Q-bar nodes change!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Predicting →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A 6T SRAM cell uses 6 transistors to store a single bit.
                How does such a small circuit remember whether it is storing a 0 or 1?
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Your Prediction:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore SRAM Cell Operation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Read and write to the cell, adjust parameters
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontStyle: 'italic', marginTop: '8px' }}>
              This is why chip engineers design SRAM so carefully: every parameter affects how reliably the cell works in real-world products like CPU caches and mobile devices.
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Read the cell multiple times - watch for read disturb</li>
              <li>Lower voltage and increase variation - see stability degrade</li>
              <li>Adjust cell ratio - balance read vs write stability</li>
              <li>Try writing at low voltage - observe write failures</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'bistable';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct! Your prediction was right!' : 'Good try! Let\'s review your prediction.'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Your prediction vs. what you observed: The 6T SRAM cell uses two cross-coupled inverters
              to create a bistable circuit. Once set, it naturally locks into one of two stable states (0 or 1).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>How 6T SRAM Works</h3>

            {/* Simple diagram showing cross-coupled inverters */}
            <svg width="100%" height="120" viewBox="0 0 300 120" style={{ marginBottom: '16px' }}>
              <rect width="300" height="120" fill="#1e293b" rx="8" />
              <text x="150" y="20" fill={colors.accent} fontSize="12" textAnchor="middle" fontWeight="bold">Cross-Coupled Bistable Storage</text>

              {/* Left inverter */}
              <circle cx="80" cy="60" r="20" fill="none" stroke={colors.high} strokeWidth="2" />
              <text x="80" y="65" fill={colors.high} fontSize="12" textAnchor="middle" fontWeight="bold">INV1</text>

              {/* Right inverter */}
              <circle cx="220" cy="60" r="20" fill="none" stroke={colors.low} strokeWidth="2" />
              <text x="220" y="65" fill={colors.low} fontSize="12" textAnchor="middle" fontWeight="bold">INV2</text>

              {/* Cross-coupling arrows */}
              <path d="M 100 55 Q 150 40, 200 55" fill="none" stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 200 65 Q 150 80, 100 65" fill="none" stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)" />

              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill={colors.accent} />
                </marker>
              </defs>

              {/* Labels */}
              <text x="150" y="35" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Feedback Loop</text>
              <text x="150" y="95" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Creates Bistable States</text>
            </svg>

            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cross-Coupled Inverters:</strong> Each inverter
                output connects to the other inverter input. If one outputs HIGH, it forces the other LOW,
                which reinforces the first to stay HIGH. This creates two stable states.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Access Transistors:</strong> Two additional
                transistors (A1, A2) act as switches connecting the cell to bit lines only when the
                word line is activated.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Read Operation:</strong> Word line activates,
                the stored values drive the bit lines, and sense amplifiers detect which bit line is higher.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Write Operation:</strong> Word line activates,
                and strong drivers on the bit lines force the cell nodes to the desired state,
                overpowering the inverters.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: Stability Challenges</h2>
            <p style={{ color: colors.textSecondary }}>
              What can go wrong with tiny SRAM cells?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              As SRAM cells shrink, they become more susceptible to noise and variations.
              What unexpected problem can occur during normal operation?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is a major stability concern for small SRAM cells?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const output = calculateStability();

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Inducing Read Disturb</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Lower voltage and increase variation to see instability
            </p>
            <p style={{ color: colors.accent, fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}>
              Read Disturb Risk: {output.readDisturbProb.toFixed(1)}% | SNM: {(output.snm * 1000).toFixed(0)}mV
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Read Disturb Explained:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              During read, the bit lines connect to the cell nodes through access transistors.
              If the cell is weak (low voltage, high variation), the bit line charge sharing
              can disturb the stored value enough to flip it! This is called read disturb.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'read_disturb';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'Surprising Result!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Read disturb is a real phenomenon! Simply reading an SRAM cell can flip its value
              if the cell is not designed with enough stability margin.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Design Dilemma</h3>

            {/* SNM vs Voltage diagram */}
            <svg width="100%" height="140" viewBox="0 0 300 140" style={{ marginBottom: '16px' }}>
              <rect width="300" height="140" fill="#1e293b" rx="8" />
              <text x="150" y="20" fill={colors.warning} fontSize="12" textAnchor="middle" fontWeight="bold">Stability Decreases with Lower Voltage</text>

              {/* Axes */}
              <line x1="40" y1="110" x2="260" y2="110" stroke={colors.textMuted} strokeWidth="1" />
              <line x1="40" y1="110" x2="40" y2="40" stroke={colors.textMuted} strokeWidth="1" />

              {/* Curve showing SNM degradation */}
              <path d="M 50 50 Q 100 55, 150 75 Q 200 95, 250 105" fill="none" stroke={colors.error} strokeWidth="2.5" />

              {/* Reference baseline */}
              <line x1="40" y1="50" x2="260" y2="50" stroke={colors.success} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <circle cx="50" cy="50" r="4" fill={colors.success} />

              {/* Interactive point */}
              <circle cx={150 + supplyVoltage * 50} cy={75 - supplyVoltage * 20} r="5" fill={colors.accent} filter="url(#sramNodeGlow)" />

              {/* Labels */}
              <text x="150" y="130" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Supply Voltage →</text>
              <text x="25" y="75" fill={colors.textSecondary} fontSize="10" transform="rotate(-90 25 75)">SNM →</text>

              {/* Grid lines */}
              <line x1="40" y1="65" x2="260" y2="65" stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
              <line x1="40" y1="80" x2="260" y2="80" stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
              <line x1="40" y1="95" x2="260" y2="95" stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
            </svg>

            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Read vs Write Conflict:</strong> To prevent
                read disturb, you want strong pull-down transistors (high cell ratio). But this makes
                writing harder because the bit lines must overpower the cell.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Static Noise Margin:</strong> SNM measures
                how much noise the cell can tolerate. Lower voltage and more process variation both
                reduce SNM, making cells more vulnerable.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Solutions:</strong> Use 8T cells with
                separate read ports, add error correction (ECC), or use larger transistors at the cost
                of density. Advanced nodes use all of these techniques.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)`, color: '#0f172a', cursor: 'pointer', fontSize: '13px', fontWeight: 700, WebkitTapHighlightColor: 'transparent', transition: 'opacity 0.2s ease' }}
                >
                  Got It →
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
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
                {testScore >= 7 ? 'You understand SRAM cell stability!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 700 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
              Test your understanding of SRAM cell stability, read disturb, static noise margin, and the design tradeoffs between read and write operations. You have explored how the 6-transistor SRAM cell uses cross-coupled inverters to store bits, how the cell ratio determines stability margins, and how supply voltage and process variation affect reliability. Answer all 10 questions to see your final score.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered SRAM cell stability!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>6T SRAM cell structure with cross-coupled inverters</li>
              <li>Read disturb and Static Noise Margin (SNM)</li>
              <li>Cell ratio and the read/write stability tradeoff</li>
              <li>Impact of voltage and process variation</li>
              <li>8T cells and other stability solutions</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Industry Challenges:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              At advanced nodes (5nm and below), process variation is so severe that many cells
              would fail without assist circuits, ECC, and redundancy. SRAM bit cell area is often
              the limiting factor for cache density. Understanding these physics is essential for
              chip architects balancing performance, power, and reliability!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(true, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default SRAMCellRenderer;
