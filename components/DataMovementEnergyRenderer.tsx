'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Data Movement Energy - Complete 10-Phase Game
// Why moving data costs more energy than computing
// ─────────────────────────────────────────────────────────────────────────────

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

interface DataMovementEnergyRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A data center engineer notices that their AI training servers consume 80% of their power moving data between memory and processors, not performing actual calculations.",
    question: "Why does data movement dominate energy consumption in modern computing?",
    options: [
      { id: 'a', label: "Poor power management in modern CPUs" },
      { id: 'b', label: "Moving electrons across chip distances requires more energy than switching transistors for computation", correct: true },
      { id: 'c', label: "Memory chips are inherently inefficient" },
      { id: 'd', label: "Software is poorly optimized for energy efficiency" }
    ],
    explanation: "A 64-bit floating-point operation uses about 20 picojoules, but fetching that data from DRAM uses 1,000-10,000x more energy. The physical act of moving electrons across millimeters to centimeters dominates the energy budget, not the computation itself."
  },
  {
    scenario: "A programmer optimizes their matrix multiplication by processing data in small tiles that fit in L1 cache rather than streaming through the entire matrix repeatedly.",
    question: "Why does tiled/blocked algorithm design save energy?",
    options: [
      { id: 'a', label: "Smaller tiles use fewer CPU instructions" },
      { id: 'b', label: "Data reuse in fast, low-energy cache reduces expensive DRAM accesses", correct: true },
      { id: 'c', label: "Tiles allow parallel processing that saves power" },
      { id: 'd', label: "The CPU can turn off unused cores while processing tiles" }
    ],
    explanation: "Tiled algorithms maximize data reuse within the cache hierarchy. By processing a small tile multiple times while it's in L1/L2 cache (at ~1-10 pJ/access), we avoid repeated trips to DRAM (at ~10,000-20,000 pJ/access). The same computation uses 100-1000x less energy."
  },
  {
    scenario: "A chip designer compares two memory hierarchies: one with large L3 cache and one with direct DRAM access. The L3 version uses 5x less total energy for typical workloads.",
    question: "What principle explains the energy advantage of deeper cache hierarchies?",
    options: [
      { id: 'a', label: "L3 cache operates at lower voltage than DRAM" },
      { id: 'b', label: "Locality of reference means most accesses hit nearby, low-energy cache levels", correct: true },
      { id: 'c', label: "DRAM requires constant refresh cycles that waste power" },
      { id: 'd', label: "Cache controllers are more energy-efficient than memory controllers" }
    ],
    explanation: "Programs exhibit temporal and spatial locality - data used once is likely used again soon, and nearby data is likely accessed together. Cache hierarchies exploit this: 90%+ of accesses can hit L1/L2 cache at 1-10 pJ, avoiding the 10,000+ pJ cost of DRAM."
  },
  {
    scenario: "An AI accelerator design team considers two architectures: one with centralized memory and one with memory distributed near each processing unit. The distributed design uses 10x less energy.",
    question: "What is this distributed memory approach called, and why is it more efficient?",
    options: [
      { id: 'a', label: "Near-memory computing - shorter wire distances mean less energy per bit moved", correct: true },
      { id: 'b', label: "Parallel memory - more channels mean faster transfers" },
      { id: 'c', label: "Unified memory - shared access reduces redundant copies" },
      { id: 'd', label: "Virtual memory - OS manages placement for efficiency" }
    ],
    explanation: "Near-memory (or near-data) computing places processing elements close to memory. Energy to move data scales with distance - moving a bit 1mm costs ~100x less than moving it 1cm. By processing data where it lives, we minimize the expensive long-distance data movement."
  },
  {
    scenario: "A smartphone SoC architect discovers that video processing consumes 50mW when done on the main CPU but only 5mW when done on a dedicated video engine with local memory.",
    question: "What explains this 10x energy difference for the same computation?",
    options: [
      { id: 'a', label: "The video engine uses newer transistor technology" },
      { id: 'b', label: "CPUs waste power on branch prediction and out-of-order execution" },
      { id: 'c', label: "The dedicated engine keeps data in local SRAM, avoiding external memory traffic", correct: true },
      { id: 'd', label: "Video workloads are inherently more efficient" }
    ],
    explanation: "Dedicated accelerators win primarily by minimizing data movement. A video engine with local SRAM buffers keeps frame data on-chip, avoiding costly external DRAM accesses. The CPU must stream data through the memory hierarchy repeatedly, paying the energy cost each time."
  },
  {
    scenario: "A neural network inference runs 100x more efficiently on a TPU than a GPU, despite both having similar computational throughput in FLOPS.",
    question: "What architectural difference primarily accounts for the TPU's energy efficiency?",
    options: [
      { id: 'a', label: "TPUs use lower-precision arithmetic" },
      { id: 'b', label: "TPUs have systolic arrays that stream data through computations with minimal memory access", correct: true },
      { id: 'c', label: "TPUs run at lower clock frequencies" },
      { id: 'd', label: "TPUs have better cooling systems" }
    ],
    explanation: "TPU systolic arrays pass data directly between processing elements without returning to memory. Each weight and activation is reused across many computations as it flows through the array. This maximizes computation per memory access - the key to energy efficiency."
  },
  {
    scenario: "A supercomputer simulation shows that interconnect (data movement between nodes) consumes 40% of total power, while actual computation is only 25%.",
    question: "What is this computational scaling challenge called?",
    options: [
      { id: 'a', label: "Amdahl's Law - serial bottlenecks limit scaling" },
      { id: 'b', label: "The Memory Wall - memory bandwidth can't keep pace with compute", correct: true },
      { id: 'c', label: "Moore's Law - transistors are hitting physical limits" },
      { id: 'd', label: "Dennard Scaling - voltage reduction has stopped" }
    ],
    explanation: "The Memory Wall describes how processor speeds improved faster than memory speeds, creating a bandwidth bottleneck. Modern systems are 'data-starved' - they spend more time (and energy) waiting for and moving data than computing. This is a fundamental limit on scaling."
  },
  {
    scenario: "A database query on a 1TB dataset completes in 10ms with in-memory processing but would take 100 seconds moving data to a traditional CPU.",
    question: "What technology enables this 10,000x speedup?",
    options: [
      { id: 'a', label: "Flash storage acceleration" },
      { id: 'b', label: "In-memory computing - processing data directly in the memory array", correct: true },
      { id: 'c', label: "Massive parallelization across thousands of cores" },
      { id: 'd', label: "Query compilation to machine code" }
    ],
    explanation: "In-memory (or processing-in-memory) computing performs operations like search, filter, and aggregation directly within the memory chips. This eliminates the data movement bottleneck entirely - data doesn't travel to processors; computation comes to the data."
  },
  {
    scenario: "A machine learning engineer compares training a model with batch size 32 vs batch size 1024. The larger batch uses only 2x more energy despite 32x more samples.",
    question: "Why does larger batch processing improve energy efficiency?",
    options: [
      { id: 'a', label: "Larger batches allow more data parallelism" },
      { id: 'b', label: "Model weights are loaded once and reused across all samples in the batch", correct: true },
      { id: 'c', label: "Memory controllers optimize for sequential access" },
      { id: 'd', label: "GPUs are designed for large batch workloads" }
    ],
    explanation: "With batch size 1, model weights must be loaded from memory for each sample. With batch size 1024, the same weights are loaded once and reused 1024 times. This amortizes the expensive memory access cost across many computations - a direct application of data reuse for energy efficiency."
  },
  {
    scenario: "A chip designer proposes adding 3D-stacked HBM (High Bandwidth Memory) to their processor, quadrupling memory bandwidth while using less energy per bit than standard DRAM.",
    question: "Why does 3D stacking improve energy efficiency despite adding more transistors?",
    options: [
      { id: 'a', label: "Vertical connections are shorter than horizontal ones on a traditional chip", correct: true },
      { id: 'b', label: "HBM uses newer, more efficient memory cell designs" },
      { id: 'c', label: "3D stacking allows better heat dissipation" },
      { id: 'd', label: "Stacked chips share power delivery infrastructure" }
    ],
    explanation: "3D stacking reduces wire length dramatically. Traditional packages route signals centimeters across PCBs; HBM stacks memory directly on the processor with micron-scale vertical connections. Energy per bit drops 5-10x because electrons travel 1000x shorter distances."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🧠',
    title: 'AI Accelerators & TPUs',
    short: 'Energy-efficient neural networks',
    tagline: 'Training AI without melting the planet',
    description: 'AI accelerators like Google TPUs and custom chips achieve 10-100x better energy efficiency than GPUs by minimizing data movement. Systolic arrays, on-chip memory, and optimized dataflows keep data close to computation.',
    connection: 'Neural networks perform billions of multiply-accumulate operations per inference. By designing architectures that reuse weights and activations locally, accelerators achieve orders of magnitude better performance per watt.',
    howItWorks: 'TPUs use systolic arrays where data flows through a grid of processing elements, with each weight used across multiple computations. Large on-chip SRAM stores activations locally. This minimizes expensive DRAM access to initial weight loading only.',
    stats: [
      { value: '420 TOPS/W', label: 'TPU v4 efficiency', icon: '⚡' },
      { value: '90%', label: 'Energy in compute, not memory', icon: '📊' },
      { value: '100x', label: 'Better than CPU for AI', icon: '🚀' }
    ],
    examples: ['Google TPU', 'Apple Neural Engine', 'Tesla Dojo', 'Cerebras Wafer Scale Engine'],
    companies: ['Google', 'Apple', 'NVIDIA', 'Tesla'],
    futureImpact: 'Analog in-memory computing will enable AI inference at 1000x better efficiency by computing directly in memory arrays without digital data movement.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Mobile SoC Design',
    short: 'All-day battery from smart memory use',
    tagline: 'Watts saved, hours gained',
    description: 'Mobile chips achieve all-day battery life by aggressively minimizing data movement. Dedicated accelerators, heterogeneous cores, and smart memory hierarchies ensure data stays close to where it\'s needed.',
    connection: 'A smartphone performs constant video, image, and sensor processing. Each unnecessary memory access drains battery. Modern SoCs include dozens of specialized engines, each with local memory, to process data without touching main memory.',
    howItWorks: 'Camera ISPs buffer frames in local SRAM. Video encoders have dedicated line buffers. Neural engines keep models on-chip. Big/little CPU cores share L3 cache. Every subsystem minimizes external memory traffic.',
    stats: [
      { value: '5W', label: 'Average SoC power', icon: '🔋' },
      { value: '90%', label: 'Workloads on accelerators', icon: '⚙️' },
      { value: '20hr', label: 'Battery life enabled', icon: '📱' }
    ],
    examples: ['Apple A-series', 'Qualcomm Snapdragon', 'Samsung Exynos', 'Google Tensor'],
    companies: ['Apple', 'Qualcomm', 'Samsung', 'Google'],
    futureImpact: 'Chiplet designs will integrate specialized processing tiles with minimal-energy interconnects, enabling week-long battery life for AR glasses and wearables.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Data Center Efficiency',
    short: 'Megawatts saved through architecture',
    tagline: 'Greening the cloud through design',
    description: 'Hyperscale data centers consume 1-2% of global electricity. Optimizing data movement - from chip architecture to network topology - is the primary lever for reducing this footprint while meeting exponentially growing demand.',
    connection: 'Every search query, video stream, and AI response requires data movement across memory hierarchies and network links. Reducing energy per bit moved directly translates to reduced carbon emissions and operating costs.',
    howItWorks: 'Custom chips (Google TPUs, AWS Graviton) optimize for specific workloads. CXL memory pooling reduces redundant copies. Smart NICs offload network processing. Optical interconnects replace power-hungry electrical links.',
    stats: [
      { value: '1.1 PUE', label: 'Best-in-class efficiency', icon: '📊' },
      { value: '30%', label: 'Power to data movement', icon: '⚡' },
      { value: '$500M/yr', label: 'Energy cost at scale', icon: '💰' }
    ],
    examples: ['Google custom TPU servers', 'AWS Nitro System', 'Microsoft Azure FPGA', 'Meta MTIA'],
    companies: ['Google', 'AWS', 'Microsoft', 'Meta'],
    futureImpact: 'Photonic computing and optical interconnects will reduce data movement energy by 100x, enabling sustainable growth of AI and cloud services.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'Scientific Computing & HPC',
    short: 'Exascale efficiency breakthroughs',
    tagline: 'More science per joule',
    description: 'Exascale supercomputers must deliver 10x performance of previous generations while staying under 30MW power. This requires fundamental rethinking of data movement at every level, from chip to system.',
    connection: 'Scientific simulations (climate, physics, genomics) move petabytes of data per run. The memory wall limits how fast computations can complete. Near-memory processing and optimized data layouts are essential for exascale.',
    howItWorks: 'HBM stacks memory directly on compute dies. Network-on-chip replaces buses. 3D packaging shortens interconnects. Software optimizations like loop tiling and data layout transformations minimize memory traffic.',
    stats: [
      { value: '52 GFLOPS/W', label: 'Frontier efficiency', icon: '⚡' },
      { value: '21MW', label: 'Frontier total power', icon: '🔌' },
      { value: '10x', label: 'Improvement per decade', icon: '📈' }
    ],
    examples: ['Frontier (Oak Ridge)', 'Aurora (Argonne)', 'El Capitan (LLNL)', 'Fugaku (RIKEN)'],
    companies: ['HPE/Cray', 'Intel', 'AMD', 'NVIDIA'],
    futureImpact: 'Quantum-classical hybrid systems will offload specific computations to near-absolute-zero quantum processors, while neuromorphic systems will handle AI workloads at biological efficiency levels.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DataMovementEnergyRenderer: React.FC<DataMovementEnergyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [dataReusesFactor, setDataReuseFactor] = useState(1); // 1-100 reuses
  const [memoryLevel, setMemoryLevel] = useState(0); // 0=Register, 1=L1, 2=L2, 3=L3, 4=DRAM
  const [dataVolume, setDataVolume] = useState(1); // MB of data
  const [showOptimized, setShowOptimized] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

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
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for data/energy theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // brightness >= 180 for contrast
    textMuted: '#cbd5e1', // brightness >= 180 for contrast
    border: '#2a2a3a',
    register: '#10B981', // Green - lowest energy
    l1Cache: '#22D3EE', // Cyan
    l2Cache: '#3B82F6', // Blue
    l3Cache: '#8B5CF6', // Purple
    dram: '#F59E0B', // Orange/Yellow - highest energy
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Memory hierarchy data - energy per 64-bit access in picojoules
  const memoryHierarchy = [
    { name: 'Register', energy: 0.1, latency: 0, color: colors.register, size: '~1 KB' },
    { name: 'L1 Cache', energy: 1, latency: 1, color: colors.l1Cache, size: '32-64 KB' },
    { name: 'L2 Cache', energy: 10, latency: 10, color: colors.l2Cache, size: '256 KB-1 MB' },
    { name: 'L3 Cache', energy: 50, latency: 40, color: colors.l3Cache, size: '8-64 MB' },
    { name: 'DRAM', energy: 10000, latency: 100, color: colors.dram, size: '8-128 GB' },
  ];

  // Calculate energy costs
  const calculateEnergy = useCallback((level: number, volumeMB: number, reuses: number) => {
    const bitsPerMB = 8 * 1024 * 1024;
    const accessesPerLoad = volumeMB * bitsPerMB / 64; // 64-bit accesses
    const energyPerAccess = memoryHierarchy[level].energy;

    // Without optimization: fetch from specified level each time
    const unoptimizedEnergy = accessesPerLoad * energyPerAccess * reuses;

    // With optimization: fetch once to register, reuse from there
    const optimizedEnergy = accessesPerLoad * energyPerAccess + // Initial fetch
                           accessesPerLoad * memoryHierarchy[0].energy * (reuses - 1); // Reuses from register

    return {
      unoptimized: unoptimizedEnergy,
      optimized: optimizedEnergy,
      savings: ((unoptimizedEnergy - optimizedEnergy) / unoptimizedEnergy) * 100
    };
  }, []);

  const energyCalc = calculateEnergy(memoryLevel, dataVolume, dataReusesFactor);

  // Compute energy for a single FP64 operation (about 20 pJ)
  const computeEnergy = 20; // pJ per FP64 operation
  const computeOpsPerMB = 1024 * 1024 / 8; // FP64 operations possible with 1MB
  const totalComputeEnergy = computeOpsPerMB * dataVolume * computeEnergy;

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Twist',
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

  // Slider style - shared across all phases
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  };

  // Memory Hierarchy Visualization - render function (not component)
  const renderMemoryHierarchyVisualization = (showDataFlow = true, highlightLevel = -1) => {
    const width = 500;
    const height = 380;
    const centerX = width / 2;
    const startY = 50;
    const levelHeight = (height - 100) / 5;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.register} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.dram} stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="cpuGlow">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines for visual reference */}
        <line x1={40} y1={startY} x2={40} y2={height - 30} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" opacity="0.3" />
        <line x1={width - 40} y1={startY} x2={width - 40} y2={height - 30} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" opacity="0.3" />
        <line x1={40} y1={height / 2} x2={width - 40} y2={height / 2} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" opacity="0.3" />

        {/* CPU at top */}
        <circle cx={centerX} cy={20} r={30} fill="url(#cpuGlow)" />
        <rect
          x={centerX - 45}
          y={8}
          width={90}
          height={28}
          rx={6}
          fill={colors.accent}
          filter="url(#glow)"
        />
        <text x={centerX} y={27} fill="white" fontSize="13" fontWeight="700" textAnchor="middle">CPU Core</text>

        {/* Energy axis label */}
        <text x={15} y={height / 2} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>Energy per Access (pJ)</text>

        {/* Distance axis label */}
        <text x={centerX} y={height - 5} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">Distance from CPU</text>

        {/* Memory hierarchy layers */}
        {memoryHierarchy.map((level, i) => {
          const layerWidth = 80 + i * 50;
          const y = startY + i * levelHeight;
          const isHighlighted = highlightLevel === i || highlightLevel === -1;

          return (
            <g key={level.name} style={{ opacity: isHighlighted ? 1 : 0.3 }}>
              {/* Layer rectangle */}
              <rect
                x={centerX - layerWidth / 2}
                y={y}
                width={layerWidth}
                height={levelHeight - 12}
                rx={6}
                fill={`${level.color}22`}
                stroke={level.color}
                strokeWidth={highlightLevel === i ? 3 : 1}
                filter={highlightLevel === i ? 'url(#glow)' : undefined}
              />

              {/* Level name */}
              <text
                x={centerX}
                y={y + levelHeight / 2 - 8}
                fill={level.color}
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
              >
                {level.name}
              </text>

              {/* Energy cost */}
              <text
                x={centerX}
                y={y + levelHeight / 2 + 8}
                fill={colors.textSecondary}
                fontSize="11"
                textAnchor="middle"
              >
                {level.energy < 1 ? `${level.energy} pJ` : level.energy >= 1000 ? `${(level.energy/1000).toFixed(0)}k pJ` : `${level.energy} pJ`}/access
              </text>

              {/* Size indicator */}
              <text
                x={centerX + layerWidth / 2 + 12}
                y={y + levelHeight / 2}
                fill={colors.textMuted}
                fontSize="11"
                textAnchor="start"
              >
                {level.size}
              </text>

              {/* Interactive highlight point for current level */}
              {highlightLevel === i && (
                <circle
                  cx={centerX - layerWidth / 2 - 15}
                  cy={y + (levelHeight - 12) / 2}
                  r={8}
                  fill={level.color}
                  filter="url(#glow)"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}

              {/* Data flow animation */}
              {showDataFlow && highlightLevel >= i && (
                <circle
                  cx={centerX}
                  cy={y + (animationFrame % 30) * (levelHeight / 30)}
                  r={3}
                  fill={colors.accent}
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.8))',
                    opacity: 0.8
                  }}
                />
              )}
            </g>
          );
        })}

        {/* Energy scale legend */}
        <g transform={`translate(${width - 100}, 50)`}>
          <text x={0} y={0} fill={colors.textSecondary} fontSize="11" fontWeight="600">Energy Scale</text>
          <rect x={0} y={8} width={14} height={14} fill={colors.register} rx={3} />
          <text x={20} y={20} fill={colors.textSecondary} fontSize="11">Low</text>
          <rect x={0} y={28} width={14} height={14} fill={colors.dram} rx={3} />
          <text x={20} y={40} fill={colors.textSecondary} fontSize="11">High</text>
        </g>
      </svg>
    );
  };

  // Energy comparison bar chart - render function
  const renderEnergyComparisonChart = () => {
    const width = 400;
    const height = 200;
    const barHeight = 35;
    const maxEnergy = Math.max(energyCalc.unoptimized, totalComputeEnergy);

    const computeBarWidth = Math.max(10, (totalComputeEnergy / maxEnergy) * (width - 140));
    const moveBarWidth = Math.max(10, (energyCalc.unoptimized / maxEnergy) * (width - 140));
    const optimizedMoveWidth = Math.max(10, (energyCalc.optimized / maxEnergy) * (width - 140));

    const formatEnergy = (pj: number) => {
      if (pj >= 1e12) return `${(pj/1e12).toFixed(1)} J`;
      if (pj >= 1e9) return `${(pj/1e9).toFixed(1)} mJ`;
      if (pj >= 1e6) return `${(pj/1e6).toFixed(1)} uJ`;
      if (pj >= 1e3) return `${(pj/1e3).toFixed(1)} nJ`;
      return `${pj.toFixed(0)} pJ`;
    };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
        <defs>
          <linearGradient id="computeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="moveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.warning} />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1={10} y1={25} x2={width - 10} y2={25} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
        <line x1={10} y1={90} x2={width - 10} y2={90} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />

        {/* Compute energy bar */}
        <text x={10} y={20} fill={colors.textSecondary} fontSize="12" fontWeight="600">Compute Energy</text>
        <rect x={10} y={28} width={computeBarWidth} height={barHeight} rx={4} fill="url(#computeGrad)" />
        <text x={computeBarWidth + 16} y={50} fill={colors.success} fontSize="12" fontWeight="600">
          {formatEnergy(totalComputeEnergy)}
        </text>

        {/* Data movement energy bar */}
        <text x={10} y={85} fill={colors.textSecondary} fontSize="12" fontWeight="600">
          Data Movement {showOptimized ? '(Optimized)' : '(Naive)'}
        </text>
        <rect
          x={10}
          y={93}
          width={showOptimized ? optimizedMoveWidth : moveBarWidth}
          height={barHeight}
          rx={4}
          fill={showOptimized ? colors.accent : 'url(#moveGrad)'}
          filter="url(#barGlow)"
        />
        <text
          x={(showOptimized ? optimizedMoveWidth : moveBarWidth) + 16}
          y={115}
          fill={showOptimized ? colors.accent : colors.warning}
          fontSize="12"
          fontWeight="600"
        >
          {formatEnergy(showOptimized ? energyCalc.optimized : energyCalc.unoptimized)}
        </text>

        {/* Ratio indicator */}
        <text x={10} y={160} fill={colors.textSecondary} fontSize="12">
          E_move = {((showOptimized ? energyCalc.optimized : energyCalc.unoptimized) / totalComputeEnergy).toFixed(0)} x E_compute
        </text>
        <text x={10} y={180} fill={colors.textSecondary} fontSize="11">
          E = Capacitance x V^2 x Distance
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

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
        <span style={{ fontSize: '20px' }}>🔌💾</span>
        <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Data Movement Energy</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // Bottom navigation bar with Back and Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={prevPhase}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: isFirst ? 'rgba(148, 163, 184, 0.7)' : colors.textSecondary,
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
          disabled={isFirst}
        >
          Back
        </button>
        <button
          onClick={nextPhase}
          style={{
            background: isLast ? colors.bgCard : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
            border: 'none',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: isLast ? 'not-allowed' : 'pointer',
            opacity: isLast ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
          disabled={isLast}
        >
          Next
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 2s infinite',
            }}>
              🔌💾
            </div>
            <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              The Hidden Cost of Data Movement
            </h1>

            <p style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              marginBottom: '32px',
              margin: '0 auto 32px',
            }}>
              Discover how moving a number from memory to the CPU uses 1000x more energy than actually computing with it. Let's explore why data movement dominates energy in modern computing.
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
                "In modern computing, we don't have a compute problem -- we have a data movement problem. Every byte we move costs precious energy."
              </p>
              <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
                -- The Memory Wall Problem
              </p>
            </div>

            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Start Discovery
            </button>

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Computing uses most energy—CPUs are power-hungry processors' },
      { id: 'b', text: 'Moving data uses more energy—distance and capacitance dominate' },
      { id: 'c', text: 'They use about the same energy—both involve transistor switching' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction - Step 1 of 3
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              When a CPU multiplies two numbers, what uses more energy: the multiplication itself, or fetching those numbers from memory?
            </h2>

            {/* SVG diagram for static graphic */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 300 : 400} height={120} viewBox={`0 0 ${isMobile ? 300 : 400} 120`}>
                {/* Memory box */}
                <rect x={10} y={30} width={70} height={60} rx={6} fill={`${colors.dram}33`} stroke={colors.dram} strokeWidth={2} />
                <text x={45} y={55} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Memory</text>
                <text x={45} y={75} fill={colors.dram} fontSize="20" textAnchor="middle">💾</text>

                {/* Arrow with ? */}
                <line x1={90} y1={60} x2={140} y2={60} stroke={colors.textMuted} strokeWidth={2} markerEnd="url(#arrowhead)" />
                <text x={115} y={50} fill={colors.warning} fontSize="14" fontWeight="bold" textAnchor="middle">???</text>

                {/* CPU box */}
                <rect x={150} y={30} width={80} height={60} rx={6} fill={`${colors.accent}33`} stroke={colors.accent} strokeWidth={2} />
                <text x={190} y={55} fill={colors.textSecondary} fontSize="10" textAnchor="middle">CPU</text>
                <text x={190} y={75} fill={colors.accent} fontSize="20" textAnchor="middle">⚙️</text>

                {/* Arrow */}
                <line x1={240} y1={60} x2={280} y2={60} stroke={colors.textMuted} strokeWidth={2} />

                {/* Multiply box */}
                <rect x={290} y={30} width={70} height={60} rx={6} fill={`${colors.success}33`} stroke={colors.success} strokeWidth={2} />
                <text x={325} y={55} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Multiply</text>
                <text x={325} y={75} fill={colors.success} fontSize="20" textAnchor="middle">✖️</text>

                {/* Arrow marker definition */}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={colors.textMuted} />
                  </marker>
                </defs>
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
                See the Reality
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Memory Hierarchy
  if (phase === 'play') {
    const handleSliderChange = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(parseInt(e.target.value));
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Explore the Memory Hierarchy
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust where data comes from and see how energy cost changes. When you increase the memory level, the energy per access increases because electrons must travel farther through more capacitance.
            </p>

            {/* Observation guidance - includes cause-effect, physics terms, relevance */}
            <div style={{
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Watch how energy per access changes as you move from Register to DRAM. This is defined as the energy cost = capacitance x voltage^2 x distance. Higher memory levels cause exponentially more energy consumption because wire distance increases, which matters for real-world technology like AI accelerators and mobile SoC design.
              </p>
            </div>

            {/* Formula display */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'center',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                E = C x V^2 x d (Energy = Capacitance x Voltage^2 x Distance)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
              {/* Memory hierarchy visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                flex: 1,
              }}>
                {renderMemoryHierarchyVisualization(true, memoryLevel)}
              </div>

              {/* Controls */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                flex: 1,
              }}>
                {/* Memory level slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Memory Level</span>
                    <span style={{
                      ...typo.small,
                      color: memoryHierarchy[memoryLevel].color,
                      fontWeight: 600
                    }}>
                      {memoryHierarchy[memoryLevel].name}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={memoryLevel}
                    onChange={handleSliderChange(setMemoryLevel)}
                    onInput={handleSliderChange(setMemoryLevel)}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.register }}>Register</span>
                    <span style={{ ...typo.small, color: colors.dram }}>DRAM</span>
                  </div>
                </div>

                {/* Data volume slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Data Volume</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dataVolume} MB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={dataVolume}
                    onChange={handleSliderChange(setDataVolume)}
                    onInput={handleSliderChange(setDataVolume)}
                    style={sliderStyle}
                  />
                </div>

                {/* Energy display */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                    Energy per Access
                  </div>
                  <div style={{
                    ...typo.h2,
                    color: memoryHierarchy[memoryLevel].color,
                    marginBottom: '8px'
                  }}>
                    {memoryHierarchy[memoryLevel].energy >= 1000
                      ? `${(memoryHierarchy[memoryLevel].energy/1000).toFixed(0)}k pJ`
                      : `${memoryHierarchy[memoryLevel].energy} pJ`}
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    {memoryLevel === 0 ? 'Baseline' :
                      `${(memoryHierarchy[memoryLevel].energy / memoryHierarchy[0].energy).toFixed(0)}x more than register`}
                  </div>
                  <div style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
                    Total: {(memoryHierarchy[memoryLevel].energy * dataVolume * 8 * 1024 * 1024 / 64).toExponential(1)} pJ
                  </div>
                </div>
              </div>
            </div>

            {/* Key insight */}
            {memoryLevel >= 4 && (
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginTop: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  DRAM access uses 100,000x more energy than a register access!
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}
            >
              Understand the Physics
            </button>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionText = prediction === 'a' ? 'computing uses most energy' :
                          prediction === 'b' ? 'moving data uses more energy' :
                          prediction === 'c' ? 'they use about the same energy' : 'unknown';
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Reference user's prediction */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {prediction
                ? (wasCorrect
                  ? `You predicted correctly that ${predictionText}! As you observed in the experiment, data movement dominates energy.`
                  : `You predicted that ${predictionText}. Your prediction showed an interesting perspective. The experiment revealed that data movement actually dominates energy costs.`)
                : `As you saw in the experiment, data movement dominates energy consumption. Your observation confirmed this key principle.`}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Does Distance Cost So Much?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderMemoryHierarchyVisualization(false, -1)}
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy = Capacitance x Voltage^2 x Distance</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Moving electrons through <span style={{ color: colors.accent }}>wires</span> requires charging capacitance along the entire path. Longer wires = more capacitance = more energy.
              </p>
              <p style={{ marginBottom: '16px' }}>
                A <span style={{ color: colors.register }}>register</span> is micrometers away. <span style={{ color: colors.dram }}>DRAM</span> is centimeters away—10,000x farther!
              </p>
              <p>
                This is why the <span style={{ color: colors.warning, fontWeight: 600 }}>memory hierarchy</span> exists: keep frequently-used data close to save energy.
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
              A floating-point multiply uses ~20 picojoules. Fetching the operands from DRAM uses ~20,000 picojoules. The compute is essentially free—it's the data movement that costs!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Data Reuse
          </button>

          {renderNavDots()}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Fetch from DRAM each time—memory is designed for repeated access' },
      { id: 'b', text: 'Load once to cache/register and reuse—amortize the fetch cost' },
      { id: 'c', text: 'It doesn\'t matter—modern CPUs optimize this automatically' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Data Reuse - Step 1 of 3
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If you need to use the same data 100 times, what's the most energy-efficient approach?
            </h2>

            {/* Static SVG visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 280 : 350} height={90} viewBox={`0 0 ${isMobile ? 280 : 350} 90`}>
                {/* Data reuse scenario diagram */}
                <rect x={10} y={10} width={60} height={60} rx={6} fill={`${colors.dram}33`} stroke={colors.dram} strokeWidth={2} />
                <text x={40} y={35} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Data</text>
                <text x={40} y={55} fill={colors.dram} fontSize="16" textAnchor="middle">📦</text>

                <text x={100} y={45} fill={colors.textMuted} fontSize="12">→</text>

                <rect x={120} y={10} width={80} height={60} rx={6} fill={`${colors.accent}33`} stroke={colors.accent} strokeWidth={2} />
                <text x={160} y={35} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Use 100x</text>
                <text x={160} y={55} fill={colors.accent} fontSize="16" textAnchor="middle">🔄</text>

                <text x={220} y={45} fill={colors.textMuted} fontSize="12">→</text>

                <rect x={240} y={10} width={70} height={60} rx={6} fill={`${colors.success}33`} stroke={colors.success} strokeWidth={2} />
                <text x={275} y={35} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Result</text>
                <text x={275} y={55} fill={colors.success} fontSize="16" textAnchor="middle">✓</text>
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
                See the Impact
              </button>
            )}

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Data Reuse Optimization
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Compare naive vs. optimized data access patterns
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Toggle between naive and optimized modes to see how data reuse dramatically reduces energy consumption. Try increasing the reuse factor and memory distance.
              </p>
            </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Sliders */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Data Reuse Factor</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dataReusesFactor}x reuses</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={dataReusesFactor}
                onChange={(e) => setDataReuseFactor(parseInt(e.target.value))}
                onInput={(e) => setDataReuseFactor(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Memory Source</span>
                <span style={{ ...typo.small, color: memoryHierarchy[memoryLevel].color, fontWeight: 600 }}>
                  {memoryHierarchy[memoryLevel].name}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={memoryLevel}
                onChange={(e) => setMemoryLevel(parseInt(e.target.value))}
                onInput={(e) => setMemoryLevel(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Data Volume</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dataVolume} MB</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={dataVolume}
                onChange={(e) => setDataVolume(parseInt(e.target.value))}
                onInput={(e) => setDataVolume(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>

            {/* Optimization toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Naive Access</span>
              <button
                onClick={() => setShowOptimized(!showOptimized)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: showOptimized ? colors.success : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: showOptimized ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{
                ...typo.small,
                color: showOptimized ? colors.success : colors.textSecondary,
                fontWeight: showOptimized ? 600 : 400
              }}>
                Data Reuse Optimized
              </span>
            </div>

            {/* Energy comparison chart */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderEnergyComparisonChart()}
            </div>
          </div>

          {/* Savings display */}
          {showOptimized && energyCalc.savings > 10 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.h3, color: colors.success, margin: 0 }}>
                {energyCalc.savings.toFixed(0)}% Energy Savings!
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                By loading data once and reusing it {dataReusesFactor} times from registers
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Implications
          </button>

          {renderNavDots()}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Strategies to Beat the Memory Wall
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧱</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tiled/Blocked Algorithms</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Process data in <span style={{ color: colors.accent }}>small tiles</span> that fit in cache. Matrix multiplication can be 10x more efficient when blocked to L1 cache size.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Near-Memory Computing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Place compute <span style={{ color: colors.accent }}>next to memory</span>. HBM stacks memory on processors. PIM (Processing-in-Memory) adds logic to memory chips.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Systolic Arrays</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Data <span style={{ color: colors.accent }}>flows through</span> processing elements, being reused at each step. TPUs achieve 10-100x efficiency gains with this architecture.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧠</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>In-Memory Computing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Perform computation <span style={{ color: colors.success }}>directly in the memory array</span>. Eliminates data movement entirely for operations like search and matrix multiply.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>

          {renderNavDots()}
          </div>
        </div>
        {renderBottomNav()}
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} - Explore how data movement efficiency impacts real technology
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
                    minHeight: '44px',
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
                      +
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
                  How Data Movement Efficiency Connects:
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

            {/* Got It button - always visible for within-app navigation */}
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
                ...primaryButtonStyle,
                width: '100%',
                marginBottom: '16px',
                background: completedApps[selectedApp] ? colors.bgCard : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
                border: completedApps[selectedApp] ? `1px solid ${colors.border}` : 'none',
              }}
            >
              {completedApps[selectedApp] ? 'Got It - Reviewed' : 'Got It'}
            </button>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Test
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomNav()}
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                ? 'You\'ve mastered the energy cost of data movement!'
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
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
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
        {renderBottomNav()}
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
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              fontSize: '100px',
              marginBottom: '24px',
              animation: 'bounce 1s infinite',
            }}>
              🏆
            </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              Data Movement Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
              You now understand why data movement dominates computing energy costs and how architects design systems to minimize it.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '400px',
              margin: '0 auto 32px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                You Learned:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                {[
                  'Memory hierarchy energy costs scale with distance',
                  'Data movement uses 100-10,000x more energy than compute',
                  'Data reuse through caching saves massive energy',
                  'Tiled algorithms exploit locality for efficiency',
                  'Near-memory and in-memory computing eliminate movement',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success }}>+</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default DataMovementEnergyRenderer;
