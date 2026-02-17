'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// GPU Occupancy - Complete 10-Phase Game
// Understanding how resource allocation affects parallel computing performance
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

interface GPUOccupancyRendererProps {
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
    scenario: "A developer's CUDA kernel uses 64 registers per thread with 256 threads per block. The GPU's SM has 65,536 registers total and can run up to 2,048 threads simultaneously.",
    question: "Why might this kernel achieve only 25% occupancy?",
    options: [
      { id: 'a', label: "The GPU is overheating and throttling performance" },
      { id: 'b', label: "256 threads x 64 registers = 16,384 registers per block, limiting to 4 blocks and 1,024 threads (50% of 2,048)", correct: true },
      { id: 'c', label: "The kernel has too many conditional branches" },
      { id: 'd', label: "256 threads is below the minimum block size requirement" }
    ],
    explanation: "With 64 registers per thread and 256 threads, each block uses 16,384 registers. The SM's 65,536 registers can fit only 4 such blocks (4 x 16,384 = 65,536). That's 4 x 256 = 1,024 active threads, which is 50% of the 2,048 maximum. Register pressure directly limits occupancy."
  },
  {
    scenario: "A machine learning engineer notices their matrix multiplication kernel runs faster at 50% occupancy than a modified version at 100% occupancy.",
    question: "What could explain this counterintuitive result?",
    options: [
      { id: 'a', label: "The GPU benchmarking tool is malfunctioning" },
      { id: 'b', label: "Higher occupancy always means better performance" },
      { id: 'c', label: "The 50% occupancy version uses more registers per thread, enabling more data reuse and fewer memory accesses", correct: true },
      { id: 'd', label: "The 100% version has compiler bugs" }
    ],
    explanation: "Sometimes lower occupancy with more registers per thread allows keeping more data in fast registers instead of slow memory. This register-heavy approach can reduce memory bandwidth pressure, making the kernel faster despite fewer active warps."
  },
  {
    scenario: "A physics simulation kernel allocates 48KB of shared memory per block. The SM has 96KB of shared memory total and supports up to 32 warps.",
    question: "What is the maximum occupancy this kernel can achieve?",
    options: [
      { id: 'a', label: "100% - shared memory doesn't affect occupancy" },
      { id: 'b', label: "50% - only 2 blocks can fit due to shared memory limits", correct: true },
      { id: 'c', label: "75% - shared memory is compressed automatically" },
      { id: 'd', label: "25% - each block needs dedicated L2 cache" }
    ],
    explanation: "With 48KB per block and 96KB total, only 2 blocks can run simultaneously on the SM. If each block has, say, 512 threads (16 warps), that's 32 warps total, which could be 100%. But if blocks are smaller or other limits apply, shared memory becomes the bottleneck at 50%."
  },
  {
    scenario: "A developer profiles their CUDA kernel and sees that memory latency is causing significant stalls. The kernel currently has 25% occupancy.",
    question: "How can increasing occupancy help with memory latency?",
    options: [
      { id: 'a', label: "More warps give the scheduler threads to execute while others wait for memory", correct: true },
      { id: 'b', label: "Higher occupancy increases memory bandwidth" },
      { id: 'c', label: "More threads make memory requests faster" },
      { id: 'd', label: "Occupancy has no relationship to memory latency" }
    ],
    explanation: "When warps stall waiting for memory, the GPU scheduler switches to other ready warps. With more active warps (higher occupancy), there's a better chance of finding work to hide memory latency. This is called latency hiding through occupancy."
  },
  {
    scenario: "An image processing kernel uses 128 threads per block. The GPU requires blocks to be allocated in multiples of 32 threads (warp size).",
    question: "What would happen if someone changed the block size to 100 threads?",
    options: [
      { id: 'a', label: "The GPU would crash" },
      { id: 'b', label: "Performance would improve due to smaller blocks" },
      { id: 'c', label: "Each block would waste 28 threads (4 warps allocated, but 28 slots unused)", correct: true },
      { id: 'd', label: "The runtime would automatically round up to 128" }
    ],
    explanation: "GPUs allocate threads in warp-sized chunks (32). A block of 100 threads needs 4 warps (128 thread slots), but 28 are wasted. This reduces effective occupancy and wastes SM resources. Block sizes should be multiples of 32 for efficiency."
  },
  {
    scenario: "A real-time graphics engine runs multiple different shaders. Some achieve 90% occupancy while others only reach 30%.",
    question: "What's the most likely reason for this variation?",
    options: [
      { id: 'a', label: "Graphics drivers randomly assign resources" },
      { id: 'b', label: "Different shaders have different register and shared memory requirements", correct: true },
      { id: 'c', label: "The 30% shaders are running on damaged SM units" },
      { id: 'd', label: "Occupancy is determined by shader complexity only" }
    ],
    explanation: "Each shader compiles to different resource requirements. Complex shaders with many variables use more registers, limiting active warps. Simple shaders need fewer resources and can achieve higher occupancy. The compiler's register allocation significantly impacts achievable occupancy."
  },
  {
    scenario: "A developer uses the CUDA Occupancy Calculator and finds that reducing registers from 64 to 48 per thread would increase theoretical occupancy from 50% to 75%.",
    question: "What tradeoff should the developer consider before making this change?",
    options: [
      { id: 'a', label: "Lower registers always mean slower code due to register spilling", correct: true },
      { id: 'b', label: "There is no tradeoff; higher occupancy is always better" },
      { id: 'c', label: "The change requires rewriting the entire kernel" },
      { id: 'd', label: "Register count cannot be changed" }
    ],
    explanation: "Forcing fewer registers may cause register spilling - the compiler stores excess values in slow local memory. This adds memory accesses that can hurt performance more than the occupancy gain helps. The optimal point depends on the specific kernel's memory access patterns."
  },
  {
    scenario: "Two kernels process the same data. Kernel A has 100% occupancy with heavy memory bottlenecks. Kernel B has 50% occupancy but is compute-bound.",
    question: "Which kernel design principle does Kernel B exemplify?",
    options: [
      { id: 'a', label: "Kernel B is poorly optimized and should be fixed" },
      { id: 'b', label: "Trading occupancy for instruction-level parallelism and register utilization", correct: true },
      { id: 'c', label: "Kernel B uses half the GPU for thermal management" },
      { id: 'd', label: "50% occupancy means 50% of the code is disabled" }
    ],
    explanation: "Kernel B trades warp-level parallelism (occupancy) for better instruction-level parallelism and data locality through registers. When compute units are fully utilized (compute-bound), more occupancy wouldn't help - you need to optimize arithmetic throughput instead."
  },
  {
    scenario: "A new GPU architecture increases register file size from 64K to 256K registers per SM while keeping max threads at 2,048.",
    question: "How does this architectural change affect occupancy-limited kernels?",
    options: [
      { id: 'a', label: "No effect - register count doesn't matter" },
      { id: 'b', label: "Register-heavy kernels can now achieve higher occupancy with the same code", correct: true },
      { id: 'c', label: "All kernels automatically reach 100% occupancy" },
      { id: 'd', label: "Performance decreases due to larger register addressing" }
    ],
    explanation: "With 4x more registers per SM, kernels that were previously register-limited can now fit more blocks. A kernel using 64 registers/thread limited to 25% occupancy (1,024 threads) might now achieve 100% (2,048 threads) on the new architecture."
  },
  {
    scenario: "A deep learning framework reports that a convolution kernel achieves only 15% occupancy but still reaches 80% of theoretical compute throughput.",
    question: "What does this tell us about occupancy as a performance metric?",
    options: [
      { id: 'a', label: "The performance measurement is incorrect" },
      { id: 'b', label: "Occupancy is a poor indicator of performance when kernels are compute-bound with high ILP", correct: true },
      { id: 'c', label: "15% occupancy means 15% of GPU is being used" },
      { id: 'd', label: "Convolution kernels don't benefit from parallelism" }
    ],
    explanation: "Occupancy measures potential parallelism, not actual performance. A kernel with low occupancy but high instruction-level parallelism (ILP) and efficient register use can keep compute units busy. Performance depends on whether you're memory-bound or compute-bound, not just occupancy."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Deep Learning Training',
    short: 'Optimizing neural network training',
    tagline: 'Maximize GPU utilization for faster AI',
    description: 'Training large neural networks requires running thousands of parallel operations simultaneously across GPU cores. GPU occupancy optimization ensures that matrix multiplications, convolutions, and activation functions fully utilize available compute resources, reducing training time from weeks to days. Modern language models with billions of parameters demand efficient parallelization to achieve practical training speeds.',
    connection: 'Deep learning frameworks like PyTorch and TensorFlow carefully tune kernel launches to balance occupancy with register usage. Too many registers per thread reduces occupancy by limiting concurrent warps; too few causes register spilling to slower memory. The sweet spot varies by operation type—convolution layers behave differently than transformer attention mechanisms. Batch size and precision settings also affect optimal occupancy targets.',
    howItWorks: 'Frameworks use autotuning to find optimal block sizes and register usage for each operation type and GPU architecture. Tensor cores in modern GPUs add another dimension, as they have different occupancy characteristics than regular CUDA cores. Libraries benchmark different configurations during warmup to select the fastest kernel variant for your specific model and hardware combination.',
    stats: [
      { value: '10-50x', label: 'Speedup vs CPU', icon: '🚀' },
      { value: '70-95%', label: 'Target occupancy', icon: '📊' },
      { value: '$1M+', label: 'Training cost savings', icon: '💰' }
    ],
    examples: ['PyTorch cudnn autotuning', 'TensorFlow XLA compilation', 'NVIDIA cuDNN library', 'Custom CUDA kernels'],
    companies: ['NVIDIA', 'Google', 'Meta', 'OpenAI'],
    futureImpact: 'AI compilers will automatically generate kernels with optimal occupancy for each model architecture, eliminating manual tuning.',
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Real-Time Graphics Rendering',
    short: 'Smooth 120fps gaming and VR',
    tagline: 'Every millisecond counts for immersion',
    description: 'Modern games render millions of pixels per frame with complex lighting, shadows, and photorealistic effects that demand massive parallel processing. GPU occupancy determines how efficiently pixel and compute shaders execute, directly impacting frame rates and visual quality at high resolutions like 4K. Virtual reality applications require consistent high frame rates to prevent motion sickness, making occupancy optimization critical for comfortable experiences.',
    connection: 'Game engines optimize shader occupancy by carefully managing register pressure and shared memory usage across different shader stages. Ray tracing shaders often have lower occupancy due to divergent execution paths when rays scatter unpredictably, requiring careful balancing with traditional rasterization workloads. Post-processing effects like depth of field or motion blur can have very different resource profiles than geometry shaders.',
    howItWorks: 'Graphics APIs like DirectX 12 and Vulkan give developers fine-grained control over resource allocation and shader compilation. Shader compilers optimize for occupancy while preserving visual quality by analyzing register dependencies and memory access patterns. Async compute allows mixing high and low occupancy workloads on the same GPU, enabling effects processing to overlap with geometry rendering for better utilization.',
    stats: [
      { value: '120fps', label: '8ms per frame', icon: '🖥️' },
      { value: '4K', label: '8M pixels/frame', icon: '📺' },
      { value: '50+', label: 'Draw calls/ms', icon: '🎨' }
    ],
    examples: ['Unreal Engine 5 Nanite', 'Ray tracing denoising', 'VR reprojection', 'DLSS upscaling'],
    companies: ['NVIDIA', 'AMD', 'Epic Games', 'Unity'],
    futureImpact: 'AI-driven graphics will dynamically adjust shader complexity and occupancy based on scene content and target framerate.',
    color: '#8B5CF6'
  },
  {
    icon: '🔬',
    title: 'Scientific Simulation',
    short: 'Molecular dynamics and climate modeling',
    tagline: 'Simulating reality at atomic scale',
    description: 'Scientific simulations model complex physical phenomena using millions of interacting particles or grid cells that evolve over time. GPU occupancy optimization allows researchers to simulate larger systems or achieve finer temporal and spatial resolution within fixed computational budgets. Applications range from protein folding for drug discovery to climate modeling that predicts global weather patterns decades into the future.',
    connection: 'Particle simulations heavily use shared memory for neighbor lists and force calculations, which can limit the number of blocks per SM when each block needs substantial shared memory. Researchers carefully trade occupancy for data locality—keeping particle data in fast shared memory reduces global memory accesses that would otherwise stall computation and dominate runtime. Different force field calculations require different register counts.',
    howItWorks: 'Simulation codes use spatial domain decomposition to assign physical regions to thread blocks, ensuring threads within a block work on nearby particles. Register usage is carefully tuned for the number of interacting forces being computed—simple Lennard-Jones potentials need fewer registers than complex polarizable force fields. Occupancy calculators help find optimal thread block sizes and shared memory allocations for each GPU architecture and simulation type.',
    stats: [
      { value: '10B+', label: 'Particles simulated', icon: '⚛️' },
      { value: '1000x', label: 'Speedup vs CPU', icon: '⚡' },
      { value: 'ns', label: 'Femtosecond timesteps', icon: '⏱️' }
    ],
    examples: ['GROMACS molecular dynamics', 'LAMMPS simulations', 'Weather prediction models', 'Plasma physics codes'],
    companies: ['Oak Ridge Lab', 'CERN', 'Max Planck', 'NOAA'],
    futureImpact: 'Exascale computing will enable real-time digital twins of complex systems, from drug interactions to global weather.',
    color: '#3B82F6'
  },
  {
    icon: '💹',
    title: 'Financial Computing',
    short: 'Risk analysis and trading',
    tagline: 'Microseconds mean millions',
    description: 'Financial institutions use GPUs for Monte Carlo simulations, complex derivatives pricing, and real-time portfolio risk analysis across thousands of positions. High GPU occupancy ensures that thousands of market scenarios are evaluated simultaneously with minimal latency, enabling faster and more accurate trading decisions. Algorithmic trading systems depend on this speed advantage where microseconds can mean millions in profit or loss.',
    connection: 'Monte Carlo simulations are embarrassingly parallel—perfect for achieving high occupancy with minimal register usage per thread. But complex multi-asset derivatives pricing requires substantial registers for intermediate calculations and correlation matrices, creating occupancy tradeoffs similar to scientific computing. Value-at-Risk calculations need to balance scenario throughput against computational precision, affecting optimal kernel design.',
    howItWorks: 'Financial kernels generate pseudo-random number sequences, simulate correlated market movements using sophisticated stochastic models, and aggregate results across scenarios. Register usage is carefully minimized for random number generators to maximize concurrent threads and occupancy. Reduction operations use shared memory efficiently to sum results across warps. Batching multiple simulations improves cache utilization and maintains high occupancy even with varying computational complexity.',
    stats: [
      { value: '1M+', label: 'Scenarios/second', icon: '📈' },
      { value: '<1ms', label: 'Pricing latency', icon: '⏰' },
      { value: '$10B', label: 'Daily risk calculated', icon: '🏦' }
    ],
    examples: ['Monte Carlo VaR', 'Options Greeks calculation', 'Portfolio optimization', 'Fraud detection ML'],
    companies: ['Goldman Sachs', 'JPMorgan', 'Citadel', 'Two Sigma'],
    futureImpact: 'Quantum-GPU hybrid systems will enable real-time portfolio optimization across millions of correlated assets.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GPUOccupancyRenderer: React.FC<GPUOccupancyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [registersPerThread, setRegistersPerThread] = useState(32);
  const [sharedMemoryPerBlock, setSharedMemoryPerBlock] = useState(16); // KB
  const [threadsPerBlock, setThreadsPerBlock] = useState(256);
  const [animationFrame, setAnimationFrame] = useState(0);

  // SM Configuration (based on typical modern GPU)
  const smConfig = {
    maxRegisters: 65536,
    maxSharedMemory: 96, // KB
    maxThreadsPerSM: 2048,
    maxBlocksPerSM: 32,
    maxWarpsPerSM: 64,
    warpSize: 32
  };

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
    accent: '#06B6D4', // Cyan for GPU/tech theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for accessibility (brightness >= 180)
    textMuted: '#94a3b8', // Improved contrast
    border: '#2a2a3a',
    warpActive: '#22D3EE',
    warpInactive: '#374151',
    registerColor: '#8B5CF6',
    sharedMemColor: '#F472B6',
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
    twist_play: 'Twist Exploration',
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

  // Calculate occupancy based on resources (memoized for performance)
  const occupancyData = useMemo(() => {
    const warpsPerBlock = Math.ceil(threadsPerBlock / smConfig.warpSize);
    const registersPerBlock = registersPerThread * threadsPerBlock;
    const sharedMemPerBlockBytes = sharedMemoryPerBlock * 1024;

    // Limits based on different resources
    const blocksByRegisters = Math.floor(smConfig.maxRegisters / registersPerBlock);
    const blocksBySharedMem = Math.floor((smConfig.maxSharedMemory * 1024) / sharedMemPerBlockBytes);
    const blocksByThreads = Math.floor(smConfig.maxThreadsPerSM / threadsPerBlock);
    const blocksByBlockLimit = smConfig.maxBlocksPerSM;
    const blocksByWarps = Math.floor(smConfig.maxWarpsPerSM / warpsPerBlock);

    const maxBlocks = Math.min(
      blocksByRegisters,
      blocksBySharedMem,
      blocksByThreads,
      blocksByBlockLimit,
      blocksByWarps
    );

    const activeWarps = maxBlocks * warpsPerBlock;
    const occupancy = (activeWarps / smConfig.maxWarpsPerSM) * 100;

    // Determine limiting factor
    let limitingFactor = 'blocks';
    const minBlocks = Math.min(blocksByRegisters, blocksBySharedMem, blocksByThreads, blocksByBlockLimit, blocksByWarps);
    if (minBlocks === blocksByRegisters) limitingFactor = 'registers';
    else if (minBlocks === blocksBySharedMem) limitingFactor = 'shared_memory';
    else if (minBlocks === blocksByThreads) limitingFactor = 'threads';
    else if (minBlocks === blocksByWarps) limitingFactor = 'warps';

    return {
      occupancy: Math.min(100, Math.max(0, occupancy)),
      activeWarps: Math.min(smConfig.maxWarpsPerSM, activeWarps),
      activeBlocks: Math.min(smConfig.maxBlocksPerSM, maxBlocks),
      limitingFactor,
      blocksByRegisters,
      blocksBySharedMem,
      blocksByThreads,
      registersUsed: maxBlocks * registersPerBlock,
      sharedMemUsed: maxBlocks * sharedMemoryPerBlock,
    };
  }, [registersPerThread, sharedMemoryPerBlock, threadsPerBlock, smConfig.warpSize, smConfig.maxRegisters, smConfig.maxSharedMemory, smConfig.maxThreadsPerSM, smConfig.maxBlocksPerSM, smConfig.maxWarpsPerSM]);

  // SM Visualization Component (memoized for performance)
  const SMVisualization = useMemo(() => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 300 : 350;
    const warpsPerRow = 8;
    const warpRows = 8;
    const warpWidth = (width - 40) / warpsPerRow;
    const warpHeight = (height - 120) / warpRows;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="occActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="occBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <filter id="warpGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines for reference */}
        <line x1="20" y1="45" x2={width - 20} y2="45" stroke="#ffffff" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1={45 + warpHeight * 4} x2={width - 20} y2={45 + warpHeight * 4} stroke="#ffffff" strokeDasharray="4 4" opacity="0.3" />
        <line x1={20 + warpWidth * 4} y1="45" x2={20 + warpWidth * 4} y2={height - 70} stroke="#ffffff" strokeDasharray="4 4" opacity="0.3" />

        {/* Axis label */}
        <text x={width / 2} y={height - 55} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">Warp Density / Thread Allocation</text>

        {/* Performance response curve spanning full vertical range */}
        <path
          d={`M 25 ${height - 70} L 60 ${height - 100} L 100 ${height - 150} L 140 ${height - 200} L 180 ${height - 240} L 220 ${height - 270} L 260 ${height - 290} L 300 ${height - 270} L 340 ${height - 240} L 380 ${height - 200} L 420 ${height - 150} L ${width - 25} ${height - 100}`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.15"
          strokeDasharray="6,3"
        />
        {/* Interactive data point - moves with register/occupancy values */}
        <circle
          cx={25 + ((registersPerThread - 16) / 112) * (width - 50)}
          cy={(height - 70) - (occupancyData.occupancy / 100) * (height - 120)}
          r="8"
          fill={colors.accent}
          opacity="0.8"
          filter="url(#warpGlow)"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        {/* Reference baseline point */}
        <circle cx={width - 80} cy={height - 150} r="6" fill={colors.registerColor} opacity="0.4" filter="url(#warpGlow)" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
          Streaming Multiprocessor (SM) - Warp Allocation
        </text>

        {/* Warps Grid */}
        <g>
        {Array.from({ length: smConfig.maxWarpsPerSM }).map((_, i) => {
          const row = Math.floor(i / warpsPerRow);
          const col = i % warpsPerRow;
          const x = 20 + col * warpWidth;
          const y = 45 + row * warpHeight;
          const isActive = i < occupancyData.activeWarps;
          const pulsePhase = (animationFrame + i * 3) % 60;
          const pulseOpacity = isActive ? 0.7 + 0.3 * Math.sin(pulsePhase * 0.1) : 0.3;

          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y + 2}
                width={warpWidth - 4}
                height={warpHeight - 4}
                rx="4"
                fill={isActive ? 'url(#occActiveGrad)' : colors.warpInactive}
                opacity={pulseOpacity}
                stroke={isActive ? colors.accent : 'transparent'}
                strokeWidth="1"
                filter={isActive && i === occupancyData.activeWarps - 1 ? 'url(#warpGlow)' : undefined}
              />
              {isActive && (
                <text
                  x={x + warpWidth / 2}
                  y={y + warpHeight / 2 + 4}
                  fill={colors.bgPrimary}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  W{i}
                </text>
              )}
            </g>
          );
        })}
        </g>

        {/* Formula */}
        <g>
          <rect x={width / 2 - 110} y={height - 48} width="220" height="20" rx="4" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" />
          <text x={width / 2} y={height - 34} fill="#22D3EE" fontSize="11" fontWeight="600" textAnchor="middle">Occupancy = Active Warps / Max Warps</text>
        </g>

        {/* Occupancy Bar */}
        <g>
          <rect x="20" y={height - 25} width={width - 40} height="14" rx="7" fill={colors.border} />
          <rect
            x="20"
            y={height - 25}
            width={(width - 40) * (occupancyData.occupancy / 100)}
            height="14"
            rx="7"
            fill={occupancyData.occupancy > 75 ? colors.success : occupancyData.occupancy > 50 ? colors.warning : colors.error}
          />
          <text x={width / 2} y={height - 14} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
            {occupancyData.occupancy.toFixed(0)}% Occupancy
          </text>
        </g>
      </svg>
    );
  }, [isMobile, occupancyData.activeWarps, occupancyData.occupancy, animationFrame, colors.bgCard, colors.accent, colors.registerColor, colors.border, colors.bgPrimary, colors.success, colors.warning, colors.error, smConfig.maxWarpsPerSM]);

  // Resource Bars Component (memoized for performance)
  const ResourceBars = useMemo(() => {
    const registerUsage = (occupancyData.registersUsed / smConfig.maxRegisters) * 100;
    const sharedMemUsage = (occupancyData.sharedMemUsed / smConfig.maxSharedMemory) * 100;
    const threadUsage = (occupancyData.activeWarps * 32 / smConfig.maxThreadsPerSM) * 100;

    const bars = [
      { label: 'Registers', usage: registerUsage, color: colors.registerColor, limiting: occupancyData.limitingFactor === 'registers' },
      { label: 'Shared Mem', usage: sharedMemUsage, color: colors.sharedMemColor, limiting: occupancyData.limitingFactor === 'shared_memory' },
      { label: 'Threads', usage: threadUsage, color: colors.accent, limiting: occupancyData.limitingFactor === 'threads' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {bars.map((bar, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{
                ...typo.small,
                color: bar.limiting ? bar.color : colors.textSecondary,
                fontWeight: bar.limiting ? 600 : 400
              }}>
                {bar.label} {bar.limiting && '(Limiting)'}
              </span>
              <span style={{ ...typo.small, color: colors.textMuted }}>{bar.usage.toFixed(0)}%</span>
            </div>
            <div style={{
              height: '8px',
              background: colors.border,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, bar.usage)}%`,
                background: bar.color,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  }, [occupancyData.registersUsed, occupancyData.sharedMemUsed, occupancyData.activeWarps, occupancyData.limitingFactor, smConfig.maxRegisters, smConfig.maxSharedMemory, smConfig.maxThreadsPerSM, colors.registerColor, colors.sharedMemColor, colors.accent, colors.textSecondary, colors.textMuted, colors.border, typo.small]);

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
  const renderNavDots = () => {
    const dotLabels: Record<Phase, string> = {
      hook: 'explore',
      predict: 'experiment',
      play: 'experiment',
      review: 'experiment',
      twist_predict: 'experiment',
      twist_play: 'experiment',
      twist_review: 'experiment',
      transfer: 'transfer',
      test: 'knowledge test',
      mastery: 'mastery'
    };

    return (
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
            data-navigation-dot="true"
            style={{
              width: phase === p ? '24px' : '8px',
              minHeight: '44px',
              padding: '0',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={dotLabels[p]}
          >
            <span style={{
              display: 'block',
              width: phase === p ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
              transition: 'all 0.3s ease',
            }} />
          </button>
        ))}
      </div>
    );
  };

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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Static visualization for predict phase (no interactivity)
  const StaticSMVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 280 : 320;
    const warpsPerRow = 8;
    const warpRows = 8;
    const warpWidth = (width - 40) / warpsPerRow;
    const warpHeight = (height - 100) / warpRows;
    const staticActiveWarps = 32; // 50% occupancy for prediction

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
          GPU SM - Current Configuration
        </text>

        {/* Warps Grid */}
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / warpsPerRow);
          const col = i % warpsPerRow;
          const x = 20 + col * warpWidth;
          const y = 45 + row * warpHeight;
          const isActive = i < staticActiveWarps;

          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y + 2}
                width={warpWidth - 4}
                height={warpHeight - 4}
                rx="4"
                fill={isActive ? colors.warpActive : colors.warpInactive}
                opacity={isActive ? 0.8 : 0.3}
              />
              {isActive && (
                <text
                  x={x + warpWidth / 2}
                  y={y + warpHeight / 2 + 4}
                  fill={colors.bgPrimary}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  W{i}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(20, ${height - 50})`}>
          <rect x="0" y="0" width="16" height="16" rx="3" fill={colors.warpActive} />
          <text x="22" y="12" fill={colors.textSecondary} fontSize="11">Active Warp</text>
          <rect x="120" y="0" width="16" height="16" rx="3" fill={colors.warpInactive} opacity="0.3" />
          <text x="142" y="12" fill={colors.textSecondary} fontSize="11">Inactive</text>
        </g>

        {/* Occupancy Bar */}
        <g transform={`translate(20, ${height - 25})`}>
          <rect x="0" y="0" width={width - 40} height="12" rx="6" fill={colors.border} />
          <rect x="0" y="0" width={(width - 40) * 0.5} height="12" rx="6" fill={colors.warning} />
          <text x={(width - 40) / 2} y="10" fill={colors.textPrimary} fontSize="9" fontWeight="600" textAnchor="middle">
            50% Occupancy (32 of 64 warps)
          </text>
        </g>
      </svg>
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
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingBottom: '100px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            <span role="img" aria-label="GPU">🖥️</span><span role="img" aria-label="Lightning">⚡</span>
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            GPU Occupancy
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Let's explore why doubling threads doesn't double performance. The secret lies in <span style={{ color: colors.accent }}>occupancy</span>—the art of keeping a GPU fully busy."
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
              "A GPU with 10,000 cores running at 10% occupancy is like a highway with 100 lanes but only 10 cars—you're wasting potential."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              — GPU Optimization Principle
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Next
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'More registers per thread always means faster execution' },
      { id: 'b', text: 'There\'s a tradeoff—more registers per thread can reduce the number of active threads' },
      { id: 'c', text: 'Register count has no effect on performance' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Prediction 1 of 2 - Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A CUDA kernel uses many variables (stored in registers). What happens as you increase registers per thread?
            </h2>

            {/* Static GPU Visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                What to Watch: Observe how register allocation affects warp availability
              </p>
              <StaticSMVisualization />
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive SM Visualization
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Maximize GPU Occupancy
            </h2>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>What to Watch:</strong> Observe how changing the register count affects active warps. Try to find the balance between resource usage and occupancy.
              </p>
            </div>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> GPU occupancy is important in real-world industry applications — it determines how efficiently your AI training, graphics rendering, and scientific simulations use expensive hardware. Engineers design and optimize this daily.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Occupancy</strong> is defined as the ratio of active warps to the maximum supported warps — the formula is Occupancy = Active Warps / Max Warps.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.registerColor }}>Registers</strong> refers to fast per-thread memory. The relationship between register usage and occupancy is: more registers per thread means fewer active threads.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Warps</strong> describes how the GPU schedules 32 threads as a unit. Calculated as: Warps per Block = ceil(Threads / 32).
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {SMVisualization}
              </div>

              {/* Registers slider - controls register allocation */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Register Count per Thread (memory allocation)</span>
                  <span style={{ ...typo.small, color: colors.registerColor, fontWeight: 600 }}>{registersPerThread}</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="128"
                  step="8"
                  value={registersPerThread}
                  onChange={(e) => setRegistersPerThread(parseInt(e.target.value))}
                  onInput={(e) => setRegistersPerThread(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Register count per thread"
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.registerColor} ${((registersPerThread - 16) / 112) * 100}%, ${colors.border} ${((registersPerThread - 16) / 112) * 100}%)`,
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>16 (light)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>128 (heavy)</span>
                </div>
              </div>

              {/* Threads per block slider - controls thread density */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Thread Density per Block (parallelism)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{threadsPerBlock}</span>
                </div>
                <input
                  type="range"
                  min="32"
                  max="1024"
                  step="32"
                  value={threadsPerBlock}
                  onChange={(e) => setThreadsPerBlock(parseInt(e.target.value))}
                  onInput={(e) => setThreadsPerBlock(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Thread density per block"
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.accent} ${((threadsPerBlock - 32) / 992) * 100}%, ${colors.border} ${((threadsPerBlock - 32) / 992) * 100}%)`,
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>32</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>1024</span>
                </div>
              </div>

              {/* Resource bars */}
              {ResourceBars}

              {/* Stats display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '24px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: occupancyData.occupancy > 75 ? colors.success : occupancyData.occupancy > 50 ? colors.warning : colors.error }}>
                    {occupancyData.occupancy.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Occupancy</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{occupancyData.activeWarps}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Active Warps</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.registerColor }}>{occupancyData.activeBlocks}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Active Blocks</div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {occupancyData.occupancy >= 75 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Great occupancy! But notice how reducing registers increases active warps. There's a tradeoff here.
                </p>
              </div>
            )}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Tradeoff
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Occupancy Equation
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — as you observed in the experiment, there is indeed a tradeoff between registers and active threads.'
                : 'As you observed in the experiment, your prediction about registers revealed a key insight — there is a fundamental tradeoff between per-thread resources and occupancy.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.h3, color: colors.accent, margin: 0 }}>
                  Occupancy = Active Warps / Max Warps
                </p>
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Warps</strong> are groups of 32 threads that execute together. The SM schedules warps, not individual threads.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.registerColor }}>Registers</span>: Each thread needs registers for local variables. More registers per thread = fewer threads fit.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.sharedMemColor }}>Shared Memory</span>: Fast memory shared within a block. More per block = fewer blocks fit.
                </p>
                <p>
                  <span style={{ color: colors.accent }}>Thread Count</span>: Max 2,048 threads per SM. Block size × blocks must fit.
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
                Higher occupancy helps <strong>hide memory latency</strong>—while some warps wait for memory, others can execute. But sometimes lower occupancy with more registers is faster due to reduced memory accesses!
              </p>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Explore Shared Memory
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Shared memory has no effect on occupancy—it\'s separate from registers' },
      { id: 'b', text: 'More shared memory per block means fewer blocks can fit on the SM' },
      { id: 'c', text: 'Shared memory only affects performance, not occupancy' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <div style={{
              background: `${colors.sharedMemColor}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.sharedMemColor}44`,
            }}>
              <p style={{ ...typo.small, color: colors.sharedMemColor, margin: 0 }}>
                Prediction 2 of 2 - New Variable: Shared Memory
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A kernel uses 48KB of shared memory per block. The SM has 96KB total. What happens?
            </h2>

            {/* Static visualization showing shared memory */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                What to Watch: Consider how 48KB blocks fit into 96KB of total shared memory
              </p>
              <StaticSMVisualization />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.sharedMemColor}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.sharedMemColor : colors.border}`,
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
                    background: twistPrediction === opt.id ? colors.sharedMemColor : colors.bgSecondary,
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Shared Memory Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
      }}>
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
              Three Resource Limits
            </h2>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.sharedMemColor}11`,
              border: `1px solid ${colors.sharedMemColor}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.sharedMemColor }}>What to Watch:</strong> Adjust all three parameters and observe which resource becomes the bottleneck. Notice how different combinations affect occupancy.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {SMVisualization}
              </div>

              {/* All three sliders with physics labels */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: occupancyData.limitingFactor === 'registers' ? colors.registerColor : colors.textSecondary }}>
                    Register Count per Thread (memory allocation) {occupancyData.limitingFactor === 'registers' && '(Limiting)'}
                  </span>
                  <span style={{ ...typo.small, color: colors.registerColor, fontWeight: 600 }}>{registersPerThread}</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="128"
                  step="8"
                  value={registersPerThread}
                  onChange={(e) => setRegistersPerThread(parseInt(e.target.value))}
                  onInput={(e) => setRegistersPerThread(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Register count per thread"
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: occupancyData.limitingFactor === 'shared_memory' ? colors.sharedMemColor : colors.textSecondary }}>
                    Shared Memory Capacity per Block (KB) {occupancyData.limitingFactor === 'shared_memory' && '(Limiting)'}
                  </span>
                  <span style={{ ...typo.small, color: colors.sharedMemColor, fontWeight: 600 }}>{sharedMemoryPerBlock}KB</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="96"
                  step="4"
                  value={sharedMemoryPerBlock}
                  onChange={(e) => setSharedMemoryPerBlock(parseInt(e.target.value))}
                  onInput={(e) => setSharedMemoryPerBlock(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Shared memory capacity per block"
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: occupancyData.limitingFactor === 'threads' ? colors.accent : colors.textSecondary }}>
                    Thread Density per Block (parallelism) {occupancyData.limitingFactor === 'threads' && '(Limiting)'}
                  </span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{threadsPerBlock}</span>
                </div>
                <input
                  type="range"
                  min="32"
                  max="1024"
                  step="32"
                  value={threadsPerBlock}
                  onChange={(e) => setThreadsPerBlock(parseInt(e.target.value))}
                  onInput={(e) => setThreadsPerBlock(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Thread density per block"
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              {ResourceBars}

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginTop: '20px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: occupancyData.occupancy > 75 ? colors.success : occupancyData.occupancy > 50 ? colors.warning : colors.error }}>
                    {occupancyData.occupancy.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Occupancy</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{occupancyData.activeBlocks}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Blocks per SM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Tradeoffs
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
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
            The Occupancy Paradox
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>100%</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>High Occupancy Isn't Always Best</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                More active warps help hide memory latency. But if you're <span style={{ color: colors.accent }}>compute-bound</span> (math is the bottleneck), extra warps don't help—they just compete for the same ALUs.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <h3 style={{ ...typo.h3, color: colors.registerColor, margin: 0 }}>Register Tradeoff</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                More registers = more data in fast storage = fewer memory loads. Sometimes <span style={{ color: colors.registerColor }}>50% occupancy with heavy register use</span> beats 100% occupancy with register spilling to slow memory.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.sharedMemColor, margin: 0 }}>Shared Memory Strategy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Shared memory enables <span style={{ color: colors.sharedMemColor }}>data reuse</span> within a block. Using more shared memory reduces blocks but can dramatically cut global memory bandwidth—a worthy tradeoff for many algorithms.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>The Real Metric</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Profile, don't guess.</strong> Use NVIDIA Nsight or AMD ROCm profiler to find your actual bottleneck. Optimize for throughput, not occupancy percentage.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
          >
            See Real-World Applications
          </button>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const completedCount = completedApps.filter(c => c).length;
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
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
              App {selectedApp + 1} of {realWorldApps.length} - Explore each application to continue
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

            {/* Progress indicator */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Progress: {completedCount} of {realWorldApps.length} apps explored
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {completedApps.map((completed, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completed ? colors.success : colors.border,
                  }} />
                ))}
              </div>
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
                  How Occupancy Matters:
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

              {/* Got It button for each app */}
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
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  width: '100%',
                  minHeight: '44px',
                }}
              >
                Got It! {selectedApp < realWorldApps.length - 1 ? 'Next App' : 'Complete'}
              </button>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingBottom: '100px',
          }}>
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
                  ? 'You\'ve mastered GPU Occupancy optimization!'
                  : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
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
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
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
      }}>
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
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next →
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
                  padding: '14px 24px',
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
          {renderNavDots()}
        </NavigationBar>
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
          GPU Occupancy Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how GPU occupancy works and how to optimize parallel computing performance through resource allocation.
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
              'Occupancy = active warps / max warps',
              'Register pressure limits active threads',
              'Shared memory limits blocks per SM',
              'Higher occupancy hides memory latency',
              '100% occupancy isn\'t always optimal',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '100px' }}>
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

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderNavDots()}
          </div>
        </NavigationBar>
      </div>
    );
  }

  return null;
};

export default GPUOccupancyRenderer;
