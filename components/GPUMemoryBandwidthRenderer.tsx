'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface GPUMemoryBandwidthRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'HBM Deep Dive',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🤖',
    title: 'AI & Large Language Models',
    short: 'Why AI training needs the fastest memory on Earth',
    tagline: 'Bandwidth is the bottleneck for AI',
    description: 'Training large language models like GPT-4 requires moving trillions of parameters through memory billions of times. Memory bandwidth, not compute power, is often the limiting factor. HBM3 at 3+ TB/s enables models that were impossible just years ago.',
    connection: 'The bandwidth formula you learned (width × speed × transfers) explains why AI uses HBM: 1024-bit buses provide 4x the bandwidth of consumer 256-bit GDDR, enabling massive parallel weight updates.',
    howItWorks: 'During training, every weight in the neural network must be read, gradients calculated, and weights updated - billions of times per batch. Each training step requires reading/writing the entire model, making bandwidth the critical path.',
    stats: [
      { value: '3.35 TB/s', label: 'H100 HBM3 bandwidth', icon: '⚡' },
      { value: '175B', label: 'GPT-3 parameters', icon: '🧠' },
      { value: '$150B', label: 'AI chip market by 2028', icon: '💰' }
    ],
    examples: ['ChatGPT training infrastructure', 'Stable Diffusion image generation', 'AlphaFold protein prediction', 'Tesla Autopilot training'],
    companies: ['NVIDIA', 'AMD', 'Google TPU', 'Cerebras'],
    futureImpact: 'HBM4 and 3D-stacked compute will merge memory and processing, potentially 10x-ing effective bandwidth for AI workloads.',
    color: '#8B5CF6'
  },
  {
    icon: '🎮',
    title: 'High-Resolution Gaming',
    short: 'Feeding pixels to 4K displays at 120+ FPS',
    tagline: 'Every frame is a bandwidth race',
    description: 'Rendering a 4K frame at 120 FPS requires moving gigabytes of texture data, geometry, and frame buffers every second. A GPU\'s memory bandwidth determines whether it can sustain smooth, high-resolution gameplay.',
    connection: 'The bandwidth calculation you explored (256-bit × clock × DDR) explains why the RTX 4090\'s 1 TB/s enables 4K gaming while lower-bandwidth cards struggle.',
    howItWorks: 'Each frame requires reading massive texture maps, computing millions of shaded pixels, and writing to multiple render targets. At 4K/120Hz, that\'s 995 million pixels per second, each requiring multiple memory accesses.',
    stats: [
      { value: '1 TB/s', label: 'RTX 4090 bandwidth', icon: '🎮' },
      { value: '8.3M pixels', label: 'Per 4K frame', icon: '📺' },
      { value: '120+ FPS', label: 'Target frame rate', icon: '⚡' }
    ],
    examples: ['Cyberpunk 2077 at 4K', 'Flight Simulator scenery', 'Unreal Engine 5 Nanite', 'VR at 90Hz per eye'],
    companies: ['NVIDIA', 'AMD', 'Sony PlayStation', 'Microsoft Xbox'],
    futureImpact: '8K gaming and true photorealistic graphics will require 2+ TB/s, driving HBM adoption in consumer GPUs.',
    color: '#22C55E'
  },
  {
    icon: '🔬',
    title: 'Scientific Supercomputing',
    short: 'Simulating climate, proteins, and nuclear reactions',
    tagline: 'Memory bandwidth enables scientific discovery',
    description: 'Supercomputers like Frontier use GPU memory bandwidth to simulate complex systems. Climate models, molecular dynamics, and physics simulations are all "memory-bound" - limited by how fast data moves, not compute speed.',
    connection: 'Scientific simulations often read neighbor data for each grid point, requiring memory accesses proportional to problem size. Your bandwidth understanding explains why HPC GPUs prioritize bandwidth over raw compute.',
    howItWorks: 'Stencil computations read surrounding data for each point. For a billion-cell weather model, that\'s billions of memory accesses per timestep. Higher bandwidth = more timesteps per second = faster science.',
    stats: [
      { value: '10+ EB/s', label: 'Frontier aggregate bandwidth', icon: '🖥️' },
      { value: '37,000', label: 'GPUs in Frontier', icon: '🔢' },
      { value: '1.2 EF', label: 'Peak performance', icon: '⚡' }
    ],
    examples: ['Climate change modeling', 'COVID protein folding', 'Nuclear fusion simulation', 'Earthquake prediction'],
    companies: ['Oak Ridge National Lab', 'Lawrence Livermore', 'CERN', 'ECMWF'],
    futureImpact: 'Exascale computing with advanced memory will enable digital twins of Earth\'s climate at 1km resolution.',
    color: '#3B82F6'
  },
  {
    icon: '🎬',
    title: 'Video Production & Rendering',
    short: 'Real-time 8K video editing and CGI rendering',
    tagline: 'Hollywood runs on memory bandwidth',
    description: 'Professional video editing and VFX rendering require moving 8K video frames through memory in real-time. GPU memory bandwidth determines whether timeline scrubbing is smooth and whether renders complete in hours or days.',
    connection: 'An 8K ProRes frame is ~80 MB. At 60 FPS playback, that\'s 4.8 GB/s just for video data - explaining why professional workstations need high-bandwidth GPUs.',
    howItWorks: 'Video editing GPUs decode compressed frames, apply color corrections and effects, composite layers, and re-encode. Each operation touches every pixel. Real-time playback requires all this in 16.7ms per frame.',
    stats: [
      { value: '48 GB', label: 'RTX 6000 Ada VRAM', icon: '💾' },
      { value: '960 GB/s', label: 'Workstation GPU bandwidth', icon: '⚡' },
      { value: '8K', label: 'Maximum resolution', icon: '📹' }
    ],
    examples: ['DaVinci Resolve color grading', 'After Effects compositing', 'Blender 3D rendering', 'Unreal Engine virtual production'],
    companies: ['NVIDIA Quadro/RTX', 'AMD Pro', 'Blackmagic', 'Adobe'],
    futureImpact: 'AI-accelerated video editing will require even more bandwidth for real-time neural enhancement and generation.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast (brightness >= 180)
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  gpu: '#8b5cf6',
  memory: '#3b82f6',
  data: '#22d3ee',
};

const TEST_QUESTIONS = [
  // Q1: Core Concept - Bandwidth Formula (Easy) - Correct: B
  {
    scenario: "A GPU has a 256-bit memory bus running at 2000 MHz effective clock speed with DDR (double data rate) technology.",
    question: "What is the memory bandwidth of this GPU?",
    options: [
      { id: 'a', label: "64 GB/s - calculated as bus width / 4" },
      { id: 'b', label: "128 GB/s - calculated as (256 bits × 2000 MHz × 2) / 8", correct: true },
      { id: 'c', label: "256 GB/s - calculated as bus width × clock speed" },
      { id: 'd', label: "512 GB/s - calculated as bus width × clock speed × 4" },
    ],
    explanation: "Bandwidth = (Bus Width × Clock Speed × Transfers per Clock) / 8. With DDR, there are 2 transfers per clock. So: (256 × 2000 × 2) / 8 = 128,000 MB/s = 128 GB/s."
  },
  // Q2: Core Concept - Bus Width Effect (Easy) - Correct: C
  {
    scenario: "Two GPUs have identical clock speeds of 2000 MHz and both use DDR technology. GPU A has a 128-bit bus, GPU B has a 256-bit bus.",
    question: "How does GPU B's memory bandwidth compare to GPU A's?",
    options: [
      { id: 'a', label: "Same bandwidth - clock speed determines performance" },
      { id: 'b', label: "50% more bandwidth - due to efficiency gains" },
      { id: 'c', label: "Exactly 2x bandwidth - bus width directly scales bandwidth", correct: true },
      { id: 'd', label: "4x bandwidth - wider buses have exponential gains" },
    ],
    explanation: "Bandwidth scales linearly with bus width. A 256-bit bus has exactly twice the data lanes as a 128-bit bus, so it can transfer exactly twice as much data per clock cycle."
  },
  // Q3: Deep Concept - Why GPUs Need Bandwidth (Medium) - Correct: D
  {
    scenario: "A CPU has 8 cores while a GPU has 10,000 shader cores. Both need to fetch data from memory to perform calculations.",
    question: "Why do GPUs require much higher memory bandwidth than CPUs?",
    options: [
      { id: 'a', label: "GPUs run at higher clock speeds than CPUs" },
      { id: 'b', label: "GPU memory is physically farther from the processor" },
      { id: 'c', label: "GPUs process larger individual data values" },
      { id: 'd', label: "Thousands of shader cores need data simultaneously for parallel processing", correct: true },
    ],
    explanation: "GPUs achieve performance through massive parallelism. With 10,000+ shader cores all needing data at once, the memory system must deliver data to all of them simultaneously, requiring enormous bandwidth."
  },
  // Q4: HBM Technology (Medium) - Correct: A
  {
    scenario: "NVIDIA's H100 data center GPU uses HBM3 memory achieving 3.35 TB/s bandwidth, while consumer RTX 4090 uses GDDR6X achieving 1 TB/s.",
    question: "How does HBM achieve 3x higher bandwidth than GDDR?",
    options: [
      { id: 'a', label: "HBM stacks memory vertically with 1024+ bit buses vs GDDR's 384-bit", correct: true },
      { id: 'b', label: "HBM runs at 3x higher clock speeds than GDDR" },
      { id: 'c', label: "HBM uses quantum tunneling for faster data transfer" },
      { id: 'd', label: "HBM compresses data to fit more through the same bus" },
    ],
    explanation: "HBM (High Bandwidth Memory) stacks 4-8 memory dies vertically using TSVs (Through-Silicon Vias), enabling a 1024-bit or wider bus in a tiny footprint. This massive bus width is the key to HBM's bandwidth advantage."
  },
  // Q5: Real World Application - Gaming (Medium) - Correct: B
  {
    scenario: "A gamer upgrades from 1080p to 4K resolution. Their GPU now needs to render 4x more pixels per frame while maintaining 60 FPS.",
    question: "Why does 4K gaming demand significantly more memory bandwidth?",
    options: [
      { id: 'a', label: "4K textures are stored in a compressed format requiring decompression" },
      { id: 'b', label: "4x more pixels means 4x more texture fetches, framebuffer writes, and shader data", correct: true },
      { id: 'c', label: "4K monitors require special memory protocols" },
      { id: 'd', label: "The GPU clock speed must increase for higher resolutions" },
    ],
    explanation: "4K (3840×2160) has exactly 4x the pixels of 1080p (1920×1080). Each pixel requires texture sampling, shader calculations, and framebuffer writes, so bandwidth requirements scale proportionally with resolution."
  },
  // Q6: Memory Bus Width Effects (Medium-Hard) - Correct: C
  {
    scenario: "A GPU manufacturer is designing a new mid-range card. They can either use a 192-bit bus at 2500 MHz or a 256-bit bus at 1875 MHz. Both use GDDR6 (DDR).",
    question: "Which configuration provides more memory bandwidth?",
    options: [
      { id: 'a', label: "192-bit at 2500 MHz - higher clock speed wins" },
      { id: 'b', label: "They are exactly equal in bandwidth" },
      { id: 'c', label: "256-bit at 1875 MHz - wider bus compensates for lower clock", correct: true },
      { id: 'd', label: "Cannot be determined without knowing the memory type" },
    ],
    explanation: "192-bit × 2500 MHz × 2 / 8 = 120 GB/s. 256-bit × 1875 MHz × 2 / 8 = 120 GB/s. Wait - they're actually equal! But in practice, the 256-bit bus is often preferred because it offers better scaling potential and can handle burst traffic better."
  },
  // Q7: GDDR vs HBM Comparison (Hard) - Correct: D
  {
    scenario: "An AI company is choosing between consumer GPUs with GDDR6X (1 TB/s, $1,500) and data center GPUs with HBM3 (3 TB/s, $30,000) for training large language models.",
    question: "Why might the HBM option be more cost-effective despite being 20x more expensive?",
    options: [
      { id: 'a', label: "HBM has lower latency which speeds up all operations" },
      { id: 'b', label: "HBM memory has higher capacity per chip" },
      { id: 'c', label: "GDDR6X requires more cooling infrastructure" },
      { id: 'd', label: "AI training is bandwidth-limited, so 3x bandwidth means up to 3x faster training", correct: true },
    ],
    explanation: "Large model training is severely bandwidth-limited - the GPU spends most time waiting for data. If HBM enables 3x faster training, a $30,000 GPU can do the work of multiple $1,500 GPUs, often making it more cost-effective for production AI workloads."
  },
  // Q8: Bandwidth Bottlenecks (Medium) - Correct: A
  {
    scenario: "A game developer notices their GPU utilization is only 60% despite the GPU not being thermally throttled. The GPU has fast compute cores but a relatively narrow 128-bit memory bus.",
    question: "What is most likely causing the low GPU utilization?",
    options: [
      { id: 'a', label: "Memory bandwidth bottleneck - cores are starved for data", correct: true },
      { id: 'b', label: "CPU bottleneck - the processor can't send commands fast enough" },
      { id: 'c', label: "Power delivery issues - insufficient watts to the GPU" },
      { id: 'd', label: "Driver overhead - software is limiting performance" },
    ],
    explanation: "When compute cores are fast but the memory bus is narrow, the GPU becomes 'bandwidth-starved' - cores sit idle waiting for data. This is a classic symptom of insufficient memory bandwidth relative to compute capability."
  },
  // Q9: Memory Clock Speed Impact (Medium) - Correct: B
  {
    scenario: "A GPU manufacturer releases a memory overclock utility. A user increases their GDDR6 effective clock from 2000 MHz to 2200 MHz (10% increase) on a 256-bit bus.",
    question: "What improvement in memory bandwidth should the user expect?",
    options: [
      { id: 'a', label: "20% increase - clock speed has a multiplied effect" },
      { id: 'b', label: "10% increase - bandwidth scales linearly with clock speed", correct: true },
      { id: 'c', label: "5% increase - diminishing returns at higher speeds" },
      { id: 'd', label: "No increase - bandwidth is limited by bus width only" },
    ],
    explanation: "Memory bandwidth scales linearly with clock speed. A 10% increase in clock speed directly translates to a 10% increase in bandwidth. The formula Bandwidth = Width × Speed × Transfers / 8 shows this linear relationship."
  },
  // Q10: DDR Technology Understanding (Easy-Medium) - Correct: C
  {
    scenario: "GDDR6 memory is advertised at '14 Gbps' data rate. The actual clock frequency of the memory chips is 1750 MHz.",
    question: "Why is there a difference between the clock speed and the advertised data rate?",
    options: [
      { id: 'a', label: "Marketing exaggeration - the real speed is 1750 MHz" },
      { id: 'b', label: "The memory runs in burst mode that temporarily reaches higher speeds" },
      { id: 'c', label: "DDR transfers data on both rising and falling clock edges, doubling effective rate", correct: true },
      { id: 'd', label: "Memory controllers interpolate data between clock cycles" },
    ],
    explanation: "DDR (Double Data Rate) transfers data twice per clock cycle - once on the rising edge and once on the falling edge. So 1750 MHz × 2 = 3500 MT/s (megatransfers). GDDR6 uses additional techniques to reach even higher rates (14 Gbps = 14000 MT/s)."
  },
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Gaming Graphics',
    description: 'Modern games load massive textures, meshes, and shader data. A 4K game might need 8+ GB of VRAM with 500+ GB/s bandwidth to maintain 60fps.',
    question: 'Why do 4K games need so much more bandwidth than 1080p?',
    answer: '4K has 4x the pixels of 1080p. Each frame requires 4x more texture fetches, framebuffer writes, and shader computations, all demanding proportionally more bandwidth.',
    stats: '4K = 8.3M pixels per frame, requiring 500+ GB/s at 120 FPS',
  },
  {
    title: 'AI Training',
    description: 'Training large language models requires loading billions of parameters and gradients. Data center GPUs use HBM with 2+ TB/s bandwidth.',
    question: 'Why do AI chips use HBM instead of GDDR?',
    answer: 'AI training is extremely bandwidth-limited. HBM provides 3-4x more bandwidth than GDDR in the same power envelope, making it essential for training efficiency.',
    stats: 'H100 delivers 3.35 TB/s via 1024-bit HBM3 bus, 3x faster than GDDR6X',
  },
  {
    title: 'Video Editing',
    description: '8K video editing requires real-time playback and effects. Each frame is 33+ megapixels that must flow through the GPU memory system.',
    question: 'How does memory bandwidth affect video timeline scrubbing?',
    answer: 'Scrubbing through 8K footage requires loading new frames instantly. Insufficient bandwidth causes stuttering and dropped frames during preview.',
    stats: '8K at 60fps = 4.8 GB/s raw throughput, requiring 960+ GB/s bandwidth',
  },
  {
    title: 'Scientific Simulation',
    description: 'Weather models, fluid dynamics, and molecular simulations process enormous datasets. GPU memory bandwidth often limits simulation resolution.',
    question: 'Why do scientific GPUs prioritize bandwidth over gaming features?',
    answer: 'Simulations are compute and bandwidth limited, not graphics-feature limited. More bandwidth enables larger, more accurate models with finer resolution.',
    stats: 'Frontier uses 37,000 GPUs with 10+ EB/s aggregate bandwidth for 1.2 exaflops',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GPUMemoryBandwidthRenderer: React.FC<GPUMemoryBandwidthRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
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

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [busWidth, setBusWidth] = useState(256); // bits
  const [clockSpeed, setClockSpeed] = useState(2000); // MHz effective
  const [memoryType, setMemoryType] = useState<'gddr6' | 'gddr6x' | 'hbm2e'>('gddr6');
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataFlowPhase, setDataFlowPhase] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate bandwidth
  const calculateBandwidth = useCallback(() => {
    // Bandwidth = Bus Width (bits) * Clock Speed (MHz) * Transfers per clock / 8 (to get bytes)
    // GDDR6 = 2 transfers per clock (DDR)
    // GDDR6X = 4 transfers per clock (PAM4)
    // HBM2e = 2 transfers per clock but much wider bus
    const transfersPerClock = memoryType === 'gddr6x' ? 4 : 2;
    const effectiveBusWidth = memoryType === 'hbm2e' ? 1024 : busWidth;
    const bandwidthGBps = (effectiveBusWidth * clockSpeed * transfersPerClock) / 8 / 1000;
    return bandwidthGBps;
  }, [busWidth, clockSpeed, memoryType]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setDataFlowPhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'clock', label: 'Only clock speed matters - faster clocks mean more bandwidth' },
    { id: 'both', label: 'Bandwidth = bus width x clock speed - both matter equally' },
    { id: 'width', label: 'Only bus width matters - wider buses always win' },
    { id: 'neither', label: 'Neither matters much - GPUs are compute limited, not memory limited' },
  ];

  const twistPredictions = [
    { id: 'gddr', label: 'GDDR is better - higher clock speeds compensate for narrower bus' },
    { id: 'hbm', label: 'HBM stacks memory vertically for much wider buses (1024+ bits)' },
    { id: 'same', label: 'HBM and GDDR have similar bandwidth, just different form factors' },
    { id: 'stack', label: 'HBM is faster because stacking reduces wire length' },
  ];

  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answerId;
    setTestAnswers(newAnswers);
  };

  const nextTestQuestion = () => {
    if (currentTestIndex < TEST_QUESTIONS.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
    }
  };

  const prevTestQuestion = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(currentTestIndex - 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testAnswers.forEach((answer, i) => {
      const correctOption = TEST_QUESTIONS[i].options.find(o => o.correct);
      if (answer === correctOption?.id) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST QUESTIONS - Scenario-based multiple choice for comprehensive assessment
  // ─────────────────────────────────────────────────────────────────────────────
  const testQuestions = [
    // Q1: Core concept - what is memory bandwidth (Easy)
    {
      scenario: "A game developer is comparing two graphics cards for their studio. Card A advertises '512 GB/s memory bandwidth' while Card B shows '16 Gbps memory speed'. The developer needs to understand what these numbers actually mean for performance.",
      question: "What does memory bandwidth measure in a GPU?",
      options: [
        { id: 'a', label: "The total amount of VRAM available for storing textures and data" },
        { id: 'b', label: "The maximum rate at which data can be read from or written to GPU memory per second", correct: true },
        { id: 'c', label: "The clock frequency at which the memory chips operate" },
        { id: 'd', label: "The number of memory channels available on the graphics card" }
      ],
      explanation: "Memory bandwidth measures the maximum data transfer rate between the GPU and its memory, expressed in GB/s (gigabytes per second). It determines how quickly the GPU can access textures, framebuffers, and other data. Higher bandwidth means more data available to shader cores each second, directly impacting performance in memory-intensive workloads."
    },
    // Q2: GDDR vs HBM comparison (Easy-Medium)
    {
      scenario: "NVIDIA sells consumer GeForce cards with GDDR6X memory achieving around 1 TB/s bandwidth, while their data center H100 GPU uses HBM3 memory achieving 3.35 TB/s. Both memory types serve different market segments with distinct requirements.",
      question: "What is the primary architectural difference that allows HBM to achieve higher bandwidth than GDDR?",
      options: [
        { id: 'a', label: "HBM uses faster clock speeds, running at 5x the frequency of GDDR chips" },
        { id: 'b', label: "HBM compresses data more efficiently, fitting more information per transfer" },
        { id: 'c', label: "HBM stacks memory dies vertically with a much wider bus (1024+ bits vs 256-384 bits)", correct: true },
        { id: 'd', label: "HBM uses quantum tunneling effects to bypass traditional electrical limitations" }
      ],
      explanation: "HBM (High Bandwidth Memory) achieves its bandwidth advantage through vertical die stacking and an extremely wide memory bus. While GDDR6X uses a 256-384 bit bus with high clock speeds, HBM stacks 4-8 memory dies connected by thousands of Through-Silicon Vias (TSVs), enabling a 1024-bit or wider bus. This massive parallelism delivers 3-4x more bandwidth despite running at lower clock speeds than GDDR."
    },
    // Q3: Why bandwidth matters for gaming (Medium)
    {
      scenario: "A gamer upgrades their monitor from 1080p to 4K resolution and notices their previously smooth 60 FPS gameplay now stutters, even though their GPU's shader cores are only at 70% utilization. The GPU temperature is normal and there's no thermal throttling occurring.",
      question: "Why does 4K gaming demand significantly more memory bandwidth than 1080p?",
      options: [
        { id: 'a', label: "4K monitors use a different display protocol that requires more memory overhead" },
        { id: 'b', label: "The GPU must decompress 4K textures in real-time, which is memory intensive" },
        { id: 'c', label: "4K has 4x more pixels, requiring 4x more texture fetches, shader data reads, and framebuffer writes per frame", correct: true },
        { id: 'd', label: "4K gaming requires loading the entire game into VRAM before each frame" }
      ],
      explanation: "4K resolution (3840x2160) contains exactly 4 times the pixels of 1080p (1920x1080). Each pixel requires texture sampling from VRAM, intermediate shader data storage, and final color writes to the framebuffer. With 4x more pixels processed per frame at the same framerate, the memory subsystem must deliver 4x more data. When bandwidth cannot keep up, shader cores idle waiting for data, causing the stuttering despite low GPU utilization."
    },
    // Q4: Memory bus width impact (Medium)
    {
      scenario: "A GPU manufacturer is designing a mid-range graphics card and must choose between two memory configurations. Option A uses a 128-bit memory bus with 20 Gbps GDDR6X chips. Option B uses a 256-bit memory bus with 14 Gbps GDDR6 chips. Both options have similar manufacturing costs.",
      question: "Which configuration provides higher memory bandwidth, and why?",
      options: [
        { id: 'a', label: "Option A (128-bit at 20 Gbps) because faster memory always outperforms wider buses" },
        { id: 'b', label: "Option B (256-bit at 14 Gbps) because it delivers 448 GB/s versus 320 GB/s from Option A", correct: true },
        { id: 'c', label: "They are equal because bus width and speed trade off exactly" },
        { id: 'd', label: "Cannot be determined without knowing the memory latency specifications" }
      ],
      explanation: "Bandwidth = (Bus Width x Data Rate) / 8. Option A: (128 bits x 20 Gbps) / 8 = 320 GB/s. Option B: (256 bits x 14 Gbps) / 8 = 448 GB/s. The wider 256-bit bus in Option B delivers 40% more bandwidth despite using slower memory chips. This demonstrates why GPU designers often prioritize bus width - doubling the bus width doubles bandwidth, while increasing memory speed faces physical and cost limitations."
    },
    // Q5: AI/ML workload requirements (Medium-Hard)
    {
      scenario: "A machine learning engineer is training a 70-billion parameter language model. Each training step requires loading model weights, computing gradients, and updating parameters. Profiling shows the GPU spends 60% of each training step waiting for memory transfers, with compute units frequently idle.",
      question: "Why are AI training workloads particularly sensitive to memory bandwidth limitations?",
      options: [
        { id: 'a', label: "AI models require error-correcting memory which reduces effective bandwidth" },
        { id: 'b', label: "Neural network calculations use floating-point math which is memory intensive" },
        { id: 'c', label: "Large models must stream billions of parameters through memory every forward and backward pass, making bandwidth the primary bottleneck", correct: true },
        { id: 'd', label: "AI frameworks are poorly optimized and waste bandwidth on unnecessary data copies" }
      ],
      explanation: "Large language models store billions of parameters in GPU memory. During each training step, the forward pass reads all parameters to compute activations, and the backward pass reads them again to compute gradients, then writes updated values. A 70B parameter model at FP16 requires reading 140GB of weights per step, plus gradients and activations. Even at 3 TB/s bandwidth, this takes significant time. The compute units can perform trillions of operations per second, but they sit idle waiting for the next batch of parameters to arrive from memory."
    },
    // Q6: Memory coalescing (Hard)
    {
      scenario: "A CUDA developer notices their kernel runs 10x slower than expected. Analysis reveals that each of 32 threads in a warp is reading a single float from non-contiguous memory addresses scattered across VRAM. The memory controller issues 32 separate memory transactions instead of one combined request.",
      question: "What memory access optimization technique would dramatically improve this kernel's performance?",
      options: [
        { id: 'a', label: "Memory prefetching to load data into cache before it's needed" },
        { id: 'b', label: "Memory coalescing, where adjacent threads access contiguous memory addresses that combine into fewer wide transactions", correct: true },
        { id: 'c', label: "Memory compression to reduce the total bytes transferred" },
        { id: 'd', label: "Memory interleaving to spread accesses across multiple banks" }
      ],
      explanation: "Memory coalescing is a critical GPU optimization where threads in a warp access contiguous memory addresses. When 32 threads each request 4-byte floats from addresses 0, 4, 8, 12... the memory controller combines these into a single 128-byte transaction using the full bus width. Scattered accesses force 32 separate transactions, each using only a fraction of the bus width, reducing effective bandwidth by 10-32x. Reorganizing data structures for coalesced access is often the single most impactful GPU optimization."
    },
    // Q7: Texture cache optimization (Hard)
    {
      scenario: "A graphics programmer is optimizing a terrain rendering shader that samples a large heightmap texture. When the camera is far from the terrain, performance is excellent. But when zoomed in close, framerates drop significantly despite the same number of pixels being rendered. Memory bandwidth utilization spikes to 95%.",
      question: "What causes this performance degradation and how do texture caches help mitigate it?",
      options: [
        { id: 'a', label: "Close-up views require higher resolution textures which are larger to transfer" },
        { id: 'b', label: "Distant views benefit from spatial locality in texture cache, while close-ups sample sparse texels that cause frequent cache misses and VRAM fetches", correct: true },
        { id: 'c', label: "The GPU disables texture compression for close-up rendering to improve quality" },
        { id: 'd', label: "Zoom level affects shader complexity, causing more memory reads per pixel" }
      ],
      explanation: "Texture caches exploit spatial locality - when sampling a texel, nearby texels are likely needed soon. From far away, each screen pixel might map to a large area of the texture, and adjacent pixels sample nearby texels, hitting the cache efficiently. When zoomed in, each screen pixel maps to a tiny texture region, and the magnified view means screen-adjacent pixels sample distant texels. This breaks cache locality, causing cache misses that require expensive VRAM fetches. Mipmapping helps by providing lower-resolution texture levels optimized for each view distance."
    },
    // Q8: VRAM vs system RAM bandwidth (Hard)
    {
      scenario: "A game developer is debugging why their procedurally generated world loads slowly. The generation algorithm runs on the GPU and produces terrain chunks in VRAM. These chunks must then be copied to system RAM for game logic processing, then back to VRAM for rendering. PCIe 4.0 x16 provides 32 GB/s bidirectional bandwidth.",
      question: "Why is GPU VRAM bandwidth so much higher than the PCIe connection to system memory?",
      options: [
        { id: 'a', label: "VRAM uses proprietary protocols while PCIe uses standardized slower protocols" },
        { id: 'b', label: "VRAM sits millimeters from the GPU die with dedicated wide buses, while PCIe travels centimeters through shared motherboard traces with fewer lanes", correct: true },
        { id: 'c', label: "VRAM bandwidth numbers are theoretical while PCIe numbers are real-world measurements" },
        { id: 'd', label: "The CPU intentionally throttles PCIe bandwidth to prioritize its own memory access" }
      ],
      explanation: "VRAM achieves 500+ GB/s because memory chips sit millimeters from the GPU die, connected by 256-384 dedicated signal traces on the graphics card PCB. This short distance allows high frequencies and wide buses. PCIe x16 uses only 16 lanes traveling 10+ centimeters through the motherboard to the CPU, shared with other system components. The physical distance introduces signal integrity challenges limiting frequency. This 15-30x bandwidth difference is why GPU algorithms minimize CPU-GPU transfers, keeping data in VRAM as much as possible."
    },
    // Q9: Infinity Cache/Smart Access Memory (Hard)
    {
      scenario: "AMD's RDNA 3 GPUs feature 96MB of Infinity Cache, a large on-die cache between the shader cores and VRAM. Benchmarks show that at 1080p resolution, the GPU achieves nearly the same performance as a competitor with 50% more raw memory bandwidth. At 4K resolution, the advantage shrinks significantly.",
      question: "Why does large on-die cache provide more benefit at lower resolutions than at higher resolutions?",
      options: [
        { id: 'a', label: "Lower resolutions use simpler shaders that benefit more from caching" },
        { id: 'b', label: "1080p textures are compressed more efficiently than 4K textures" },
        { id: 'c', label: "Lower resolutions have smaller working sets that fit in cache, while 4K requires accessing more unique data that exceeds cache capacity", correct: true },
        { id: 'd', label: "The cache controller is optimized for 1080p frame buffer sizes" }
      ],
      explanation: "At 1080p, the framebuffer is ~8MB and frequently accessed textures may total 50-80MB - fitting largely within a 96MB cache. Cache hits avoid VRAM accesses entirely, making raw VRAM bandwidth less important. At 4K, the framebuffer alone is ~32MB, and the larger screen samples more unique texture data. When the working set exceeds cache capacity, cache misses spike, forcing frequent VRAM accesses where raw bandwidth becomes the bottleneck. This is why large caches provide an 'effective bandwidth multiplier' that varies based on workload memory footprint."
    },
    // Q10: Future memory technologies (Hard)
    {
      scenario: "Memory technology roadmaps show GDDR7 targeting 36 Gbps per pin with PAM3 signaling, HBM4 planning for 6+ TB/s bandwidth per stack, and research into compute-in-memory architectures that perform calculations within memory chips. Each approach addresses different aspects of the bandwidth challenge.",
      question: "What fundamental limitation drives the continued pursuit of higher memory bandwidth and alternative architectures?",
      options: [
        { id: 'a', label: "Marketing pressure to advertise larger numbers on product specifications" },
        { id: 'b', label: "Software developers writing increasingly inefficient code that wastes bandwidth" },
        { id: 'c', label: "The growing gap between compute capability (growing ~2x per generation) and memory bandwidth improvement (~1.3x per generation), causing memory to bottleneck performance", correct: true },
        { id: 'd', label: "Power consumption requirements forcing faster transfers to reduce active time" }
      ],
      explanation: "GPU compute performance has grown roughly 2x per generation through more cores and higher frequencies, while memory bandwidth improves only ~1.3x due to physical signaling constraints. This 'memory wall' means each generation becomes more bandwidth-starved relative to compute capability. GDDR7's PAM3 signaling extracts more bits per signal, HBM4 adds more die stacks and width, and compute-in-memory eliminates data movement entirely by computing where data lives. All approaches attack the same fundamental problem: moving data costs more energy and time than computing on it."
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBandwidthVisualization = () => {
    const width = 400;
    const height = 280;
    const bandwidth = calculateBandwidth();
    const effectiveBusWidth = memoryType === 'hbm2e' ? 1024 : busWidth;

    // Calculate data flow positions
    const numLanes = Math.min(8, effectiveBusWidth / 32);
    const laneSpacing = 140 / numLanes;

    // Calculate bandwidth meter fill (normalized to 0-100%, max around 3500 GB/s for HBM3)
    const maxBandwidth = 3500;
    const bandwidthPercent = Math.min(100, (bandwidth / maxBandwidth) * 100);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="gpumbLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* GPU chip metallic gradient */}
            <linearGradient id="gpumbChipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="20%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            {/* GPU chip inner die gradient */}
            <linearGradient id="gpumbChipDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="30%" stopColor="#312e81" />
              <stop offset="60%" stopColor="#3730a3" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Memory module gradient with 3D depth */}
            <linearGradient id="gpumbMemoryMain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="15%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Memory module highlight for 3D effect */}
            <linearGradient id="gpumbMemoryHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </linearGradient>

            {/* HBM stacked memory gradient */}
            <linearGradient id="gpumbHBMStack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="25%" stopColor="#0d9488" />
              <stop offset="50%" stopColor="#0f766e" />
              <stop offset="75%" stopColor="#115e59" />
              <stop offset="100%" stopColor="#134e4a" />
            </linearGradient>

            {/* Data flow particle gradient */}
            <radialGradient id="gpumbDataParticle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Data lane gradient */}
            <linearGradient id="gpumbDataLane" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>

            {/* Bandwidth meter gradient */}
            <linearGradient id="gpumbMeterFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="85%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Meter track gradient */}
            <linearGradient id="gpumbMeterTrack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Data glow filter */}
            <filter id="gpumbDataGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow for active elements */}
            <filter id="gpumbStrongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Chip shadow filter */}
            <filter id="gpumbChipShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for chip die */}
            <filter id="gpumbInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#gpumbLabBg)" />

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`vgrid-${i}`} x1={i * 20} y1="0" x2={i * 20} y2={height} stroke="#64748b" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={`hgrid-${i}`} x1="0" y1={i * 20} x2={width} y2={i * 20} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>

          {/* GPU Chip with metallic effect and shadow */}
          <g filter="url(#gpumbChipShadow)">
            {/* Chip substrate/package */}
            <rect x={20} y={50} width={110} height={130} rx={6} fill="url(#gpumbChipMetal)" />
            {/* Inner die */}
            <rect x={30} y={60} width={90} height={110} rx={4} fill="url(#gpumbChipDie)" />
            {/* Die highlight */}
            <rect x={30} y={60} width={90} height={55} rx={4} fill="url(#gpumbMemoryHighlight)" />
            {/* Shader core grid visualization */}
            <g>
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 3 }).map((_, col) => (
                  <rect
                    key={`core-${row}-${col}`}
                    x={38 + col * 26}
                    y={68 + row * 24}
                    width={20}
                    height={18}
                    rx={2}
                    fill="#4c1d95"
                    stroke="#7c3aed"
                    strokeWidth="0.5"
                    opacity={0.8}
                  />
                ))
              )}
            </g>
            {/* Pin contacts on sides */}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`lpin-${i}`} x={15} y={60 + i * 18} width={8} height={10} rx={1} fill="#a78bfa" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`rpin-${i}`} x={127} y={60 + i * 18} width={8} height={10} rx={1} fill="#a78bfa" />
            ))}
          </g>

          {/* Memory Modules with 3D effect */}
          <g filter="url(#gpumbChipShadow)">
            {memoryType === 'hbm2e' ? (
              /* HBM stacked memory visualization */
              <>
                {/* HBM Stack 1 */}
                <g>
                  {Array.from({ length: 4 }).map((_, layer) => (
                    <g key={`hbm1-${layer}`}>
                      <rect
                        x={275 - layer * 2}
                        y={45 + layer * 8}
                        width={55}
                        height={30}
                        rx={3}
                        fill="url(#gpumbHBMStack)"
                        stroke="#2dd4bf"
                        strokeWidth="0.5"
                      />
                    </g>
                  ))}
                  {/* TSV connections visualization */}
                  <g opacity="0.6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <line
                        key={`tsv1-${i}`}
                        x1={283 + i * 10}
                        y1={50}
                        x2={277 + i * 10}
                        y2={74}
                        stroke="#5eead4"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    ))}
                  </g>
                </g>

                {/* HBM Stack 2 */}
                <g>
                  {Array.from({ length: 4 }).map((_, layer) => (
                    <g key={`hbm2-${layer}`}>
                      <rect
                        x={275 - layer * 2}
                        y={115 + layer * 8}
                        width={55}
                        height={30}
                        rx={3}
                        fill="url(#gpumbHBMStack)"
                        stroke="#2dd4bf"
                        strokeWidth="0.5"
                      />
                    </g>
                  ))}
                  <g opacity="0.6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <line
                        key={`tsv2-${i}`}
                        x1={283 + i * 10}
                        y1={120}
                        x2={277 + i * 10}
                        y2={144}
                        stroke="#5eead4"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    ))}
                  </g>
                </g>

                {/* HBM Stack 3 */}
                <g>
                  {Array.from({ length: 4 }).map((_, layer) => (
                    <g key={`hbm3-${layer}`}>
                      <rect
                        x={340 - layer * 2}
                        y={80 + layer * 8}
                        width={55}
                        height={30}
                        rx={3}
                        fill="url(#gpumbHBMStack)"
                        stroke="#2dd4bf"
                        strokeWidth="0.5"
                      />
                    </g>
                  ))}
                  <g opacity="0.6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <line
                        key={`tsv3-${i}`}
                        x1={348 + i * 10}
                        y1={85}
                        x2={342 + i * 10}
                        y2={109}
                        stroke="#5eead4"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    ))}
                  </g>
                </g>
              </>
            ) : (
              /* GDDR memory modules */
              <>
                {/* Memory Module 1 */}
                <g>
                  <rect x={275} y={45} width={55} height={50} rx={4} fill="url(#gpumbMemoryMain)" />
                  <rect x={275} y={45} width={55} height={25} rx={4} fill="url(#gpumbMemoryHighlight)" />
                  {/* Memory chip details */}
                  <rect x={280} y={52} width={45} height={12} rx={2} fill="#0f172a" opacity="0.5" />
                  <rect x={280} y={68} width={45} height={20} rx={2} fill="#1e3a5f" opacity="0.4" />
                  {/* Memory pins */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect key={`m1pin-${i}`} x={278 + i * 6} y={95} width={4} height={6} rx={1} fill="#60a5fa" />
                  ))}
                </g>

                {/* Memory Module 2 */}
                <g>
                  <rect x={275} y={115} width={55} height={50} rx={4} fill="url(#gpumbMemoryMain)" />
                  <rect x={275} y={115} width={55} height={25} rx={4} fill="url(#gpumbMemoryHighlight)" />
                  <rect x={280} y={122} width={45} height={12} rx={2} fill="#0f172a" opacity="0.5" />
                  <rect x={280} y={138} width={45} height={20} rx={2} fill="#1e3a5f" opacity="0.4" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect key={`m2pin-${i}`} x={278 + i * 6} y={165} width={4} height={6} rx={1} fill="#60a5fa" />
                  ))}
                </g>

                {/* Memory Module 3 */}
                <g>
                  <rect x={340} y={80} width={55} height={50} rx={4} fill="url(#gpumbMemoryMain)" />
                  <rect x={340} y={80} width={55} height={25} rx={4} fill="url(#gpumbMemoryHighlight)" />
                  <rect x={345} y={87} width={45} height={12} rx={2} fill="#0f172a" opacity="0.5" />
                  <rect x={345} y={103} width={45} height={20} rx={2} fill="#1e3a5f" opacity="0.4" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect key={`m3pin-${i}`} x={343 + i * 6} y={130} width={4} height={6} rx={1} fill="#60a5fa" />
                  ))}
                </g>
              </>
            )}
          </g>

          {/* Data lanes with glow effect */}
          {Array.from({ length: numLanes }).map((_, i) => {
            const y = 60 + i * laneSpacing + laneSpacing / 2;
            const offset = (dataFlowPhase + i * 12) % 100;

            return (
              <g key={i}>
                {/* Lane track with gradient */}
                <line
                  x1={140}
                  y1={y}
                  x2={265}
                  y2={y}
                  stroke="url(#gpumbDataLane)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                {/* Lane inner highlight */}
                <line
                  x1={140}
                  y1={y}
                  x2={265}
                  y2={y}
                  stroke="rgba(34, 211, 238, 0.2)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Data packets flowing with glow */}
                {isAnimating && (
                  <>
                    <circle
                      cx={140 + (offset / 100) * 125}
                      cy={y}
                      r={6}
                      fill="url(#gpumbDataParticle)"
                      filter="url(#gpumbDataGlow)"
                    />
                    <circle
                      cx={140 + ((offset + 50) % 100) / 100 * 125}
                      cy={y}
                      r={6}
                      fill="url(#gpumbDataParticle)"
                      filter="url(#gpumbDataGlow)"
                    />
                    {/* Additional particles for higher bandwidth */}
                    {bandwidth > 200 && (
                      <circle
                        cx={140 + ((offset + 25) % 100) / 100 * 125}
                        cy={y}
                        r={5}
                        fill="url(#gpumbDataParticle)"
                        filter="url(#gpumbDataGlow)"
                        opacity={0.7}
                      />
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Bandwidth Meter */}
          <g>
            {/* Meter background track */}
            <rect x={20} y={200} width={360} height={20} rx={10} fill="url(#gpumbMeterTrack)" stroke="#334155" strokeWidth="1" />
            {/* Meter fill with clipping */}
            <clipPath id="gpumbMeterClip">
              <rect x={22} y={202} width={356 * (bandwidthPercent / 100)} height={16} rx={8} />
            </clipPath>
            <rect x={22} y={202} width={356} height={16} rx={8} fill="url(#gpumbMeterFill)" clipPath="url(#gpumbMeterClip)" />
            {/* Meter glow overlay */}
            <rect
              x={22}
              y={202}
              width={356 * (bandwidthPercent / 100)}
              height={8}
              rx={4}
              fill="rgba(255,255,255,0.2)"
            />
            {/* Meter tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <line
                key={`tick-${tick}`}
                x1={22 + (356 * tick / 100)}
                y1={200}
                x2={22 + (356 * tick / 100)}
                y2={196}
                stroke="#64748b"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Info panel with premium styling */}
          <g>
            <rect x={20} y={230} width={360} height={45} rx={8} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />
            {/* Panel inner highlight */}
            <rect x={21} y={231} width={358} height={22} rx={7} fill="rgba(255,255,255,0.02)" />
          </g>

          {/* SVG Labels for GPU and Memory */}
          <text x={75} y={40} fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">GPU</text>
          <text x={75} y={195} fill="#e2e8f0" fontSize="11" textAnchor="middle">Shader Cores</text>
          <text x={310} y={40} fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">{memoryType === 'hbm2e' ? 'HBM' : 'GDDR'} Memory</text>
          <text x={200} y={190} fill="#e2e8f0" fontSize="11" textAnchor="middle">Data Bus ({effectiveBusWidth}-bit)</text>
          {/* Axis labels for bandwidth meter */}
          <text x={22} y={228} fill="#e2e8f0" fontSize="11" textAnchor="start">Data Rate / Speed (GB/s)</text>
          <text x={378} y={228} fill="#e2e8f0" fontSize="11" textAnchor="end">{bandwidth.toFixed(0)} GB/s</text>

          {/* Legend */}
          <g className="legend-panel">
            <rect x={20} y={5} width={130} height={28} rx={4} fill="rgba(30, 41, 59, 0.9)" stroke="#334155" strokeWidth="0.5" />
            <circle cx={32} cy={19} r={4} fill="#8b5cf6" />
            <text x={42} y={23} fill="#e2e8f0" fontSize="11">GPU Die</text>
            <circle cx={92} cy={19} r={4} fill="#3b82f6" />
            <text x={102} y={23} fill="#e2e8f0" fontSize="11">Memory</text>
          </g>
        </svg>

        {/* External labels using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          padding: `0 ${typo.pagePadding}`,
          marginTop: `-${typo.sectionGap}`,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.small }}>Bus Width</div>
            <div style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 600 }}>
              {effectiveBusWidth} bits ({numLanes}x {effectiveBusWidth / numLanes}-bit)
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: colors.accent, fontSize: typo.heading, fontWeight: 700 }}>
              {bandwidth.toFixed(0)} GB/s
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.small }}>Clock Speed</div>
            <div style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 600 }}>
              {clockSpeed} MHz ({memoryType === 'gddr6x' ? '4x' : '2x'})
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    minHeight: '44px',
    WebkitTapHighlightColor: 'transparent' as const,
    transition: 'all 0.2s ease',
  };

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        zIndex: 9999,
        gap: '12px'
      }} role="navigation" aria-label="Progress">
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          Memory Bandwidth
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canProceed: boolean, buttonText: string) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 9999,
        gap: '12px'
      }} role="navigation" aria-label="Phase navigation">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            ...buttonStyle,
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={!canProceed}
          style={{
            ...buttonStyle,
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #0891b2 100%)` : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          {buttonText}
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Do GPUs Need Wide Memory Buses?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              The physics of parallel data transfer
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A CPU might have a 64-bit memory bus. A high-end GPU? 384 bits or even 1024+ bits
                with HBM. Why do GPUs need memory buses 6-16x wider than CPUs?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer reveals why GPUs dominate parallel computing.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                A GPU might have 10,000+ shader cores all wanting data simultaneously!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Start Predicting')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictProgress = prediction ? 1 : 0;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What Determines Memory Bandwidth?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              How do GPUs achieve such high bandwidth?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '8px' }}>
              Progress: {predictProgress} of 1 prediction made
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What determines memory bandwidth?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Continue to Experiment')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Memory Bandwidth Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust bus width and clock speed to see bandwidth change
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
              Observe how the data flow animation changes as you adjust parameters. Try adjusting sliders to see the effect on bandwidth.
            </p>
            <p style={{ color: colors.accent, fontSize: '12px', marginTop: '8px', background: 'rgba(6, 182, 212, 0.1)', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
              Real-world relevance: This exact calculation determines whether your GPU can run 4K games at 60fps or train AI models efficiently.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderBandwidthVisualization()}
              </div>

              <div style={{
                background: colors.bgCard,
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Bandwidth Formula:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', fontFamily: 'monospace' }}>
                  Bandwidth = Bus Width x Clock Speed x Transfers/Clock / 8
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                  {busWidth} bits x {clockSpeed} MHz x {memoryType === 'gddr6x' ? '4' : '2'} / 8 = {calculateBandwidth().toFixed(0)} GB/s
                </p>
              </div>

              {/* Cause-effect explanation */}
              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  When you increase the bus width, bandwidth increases proportionally because more data lanes transfer data in parallel.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
                  When you increase the clock speed, bandwidth increases linearly because each lane transfers data faster. Doubling either parameter doubles the total bandwidth.
                </p>
              </div>

              {/* Before/After comparison */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
              }}>
                <div style={{
                  flex: 1,
                  background: colors.bgCard,
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: `1px solid ${colors.memory}`,
                }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 400, marginBottom: '4px' }}>128-bit Reference</p>
                  <p style={{ color: colors.memory, fontSize: '18px', fontWeight: 700 }}>
                    {((128 * clockSpeed * (memoryType === 'gddr6x' ? 4 : 2)) / 8 / 1000).toFixed(0)} GB/s
                  </p>
                </div>
                <div style={{
                  flex: 1,
                  background: colors.bgCard,
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: `1px solid ${colors.accent}`,
                }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 400, marginBottom: '4px' }}>Current Config</p>
                  <p style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>
                    {calculateBandwidth().toFixed(0)} GB/s
                  </p>
                  <p style={{ color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                    {(calculateBandwidth() / ((128 * clockSpeed * (memoryType === 'gddr6x' ? 4 : 2)) / 8 / 1000)).toFixed(1)}x faster
                  </p>
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Bus Width: {busWidth} bits
                </label>
                <input
                  type="range"
                  min="64"
                  max="384"
                  step="64"
                  value={busWidth}
                  onChange={(e) => setBusWidth(parseInt(e.target.value))}
                  onInput={(e) => setBusWidth(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: colors.accent,
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Effective Clock: {clockSpeed} MHz
                </label>
                <input
                  type="range"
                  min="1000"
                  max="3000"
                  step="100"
                  value={clockSpeed}
                  onChange={(e) => setClockSpeed(parseInt(e.target.value))}
                  onInput={(e) => setClockSpeed(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: colors.accent,
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Memory Type
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['gddr6', 'gddr6x', 'hbm2e'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMemoryType(type)}
                      style={{
                        ...buttonStyle,
                        flex: 1,
                        padding: '10px',
                        background: memoryType === type ? colors.accent : 'transparent',
                        border: `1px solid ${memoryType === type ? colors.accent : 'rgba(255,255,255,0.2)'}`,
                        color: colors.textPrimary,
                        fontSize: '12px',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  style={{
                    ...buttonStyle,
                    background: isAnimating ? colors.error : colors.success,
                    color: 'white',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isAnimating ? 'Stop Animation' : 'Animate Data Flow'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'both';
    const predictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
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
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
              Your prediction: "{predictionLabel}"
            </p>
            <p style={{ color: colors.textPrimary }}>
              Bandwidth = Width x Speed. Both matter! A 256-bit bus at 2000 MHz moves twice as
              much data as a 128-bit bus at the same speed - or a 256-bit bus at 1000 MHz.
            </p>
          </div>

          {/* Visual diagram SVG for review */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="100%" height="160" viewBox="0 0 400 160" style={{ maxWidth: '400px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)' }}>
              <defs>
                <linearGradient id="reviewBusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              {/* Title */}
              <text x={200} y={25} fill="#e2e8f0" fontSize="14" fontWeight="bold" textAnchor="middle">Bandwidth Formula Visualization</text>

              {/* Bus Width visual */}
              <rect x={30} y={45} width={100} height={40} rx={4} fill="#3b82f6" opacity="0.8" />
              <text x={80} y={70} fill="#e2e8f0" fontSize="11" textAnchor="middle">Bus Width</text>

              {/* Multiply sign */}
              <text x={145} y={70} fill="#f59e0b" fontSize="20" fontWeight="bold" textAnchor="middle">x</text>

              {/* Clock Speed visual */}
              <rect x={160} y={45} width={100} height={40} rx={4} fill="#8b5cf6" opacity="0.8" />
              <text x={210} y={70} fill="#e2e8f0" fontSize="11" textAnchor="middle">Clock Speed</text>

              {/* Equals sign */}
              <text x={280} y={70} fill="#f59e0b" fontSize="20" fontWeight="bold" textAnchor="middle">=</text>

              {/* Bandwidth result */}
              <rect x={300} y={45} width={80} height={40} rx={4} fill="url(#reviewBusGrad)" />
              <text x={340} y={70} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">Bandwidth</text>

              {/* Bottom explanation */}
              <text x={200} y={110} fill="#94a3b8" fontSize="10" textAnchor="middle">256 bits x 2000 MHz x 2 (DDR) / 8 = 128 GB/s</text>
              <text x={200} y={130} fill="#06b6d4" fontSize="11" textAnchor="middle">Both factors multiply together!</text>

              {/* Legend */}
              <g className="legend-panel">
                <rect x={130} y={140} width={140} height={16} rx={4} fill="rgba(30, 41, 59, 0.9)" />
                <text x={200} y={152} fill="#e2e8f0" fontSize="9" textAnchor="middle">Bandwidth = Width x Speed x DDR / 8</text>
              </g>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Parallel Access</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Parallel Lanes:</strong> A 256-bit bus
                has 256 physical wires transferring data simultaneously. More wires = more parallel data.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Clock Speed:</strong> Higher frequency
                means more transfers per second on each wire. But signal integrity limits max frequency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DDR Technology:</strong> Double Data Rate
                transfers on both rising and falling clock edges, effectively doubling bandwidth.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Why GPUs Need More:</strong> Thousands of
                shader cores working in parallel all need data simultaneously. CPUs have few cores
                that can wait; GPUs need constant data flow.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistPredictProgress = twistPrediction ? 1 : 0;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The HBM Revolution</h2>
            <p style={{ color: colors.textSecondary }}>
              How do AI chips achieve 2+ TB/s bandwidth?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '8px' }}>
              Progress: {twistPredictProgress} of 1 prediction made
            </p>
          </div>

          {/* HBM vs GDDR comparison SVG visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="100%" height="180" viewBox="0 0 400 180" style={{ maxWidth: '400px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)' }}>
              {/* GDDR side */}
              <text x={100} y={25} fill="#e2e8f0" fontSize="14" fontWeight="bold" textAnchor="middle">GDDR6</text>
              <rect x={50} y={40} width={100} height={60} rx={4} fill="#3b82f6" stroke="#60a5fa" strokeWidth="1" />
              <text x={100} y={75} fill="#e2e8f0" fontSize="10" textAnchor="middle">256-bit bus</text>
              <text x={100} y={120} fill="#e2e8f0" fontSize="11" textAnchor="middle">~1 TB/s</text>
              <text x={100} y={140} fill="#94a3b8" fontSize="9" textAnchor="middle">Side-by-side chips</text>

              {/* VS */}
              <text x={200} y={80} fill="#f59e0b" fontSize="16" fontWeight="bold" textAnchor="middle">vs</text>

              {/* HBM side - stacked visualization */}
              <text x={300} y={25} fill="#e2e8f0" fontSize="14" fontWeight="bold" textAnchor="middle">HBM3</text>
              <g>
                <rect x={260} y={70} width={80} height={15} rx={2} fill="#14b8a6" stroke="#2dd4bf" strokeWidth="0.5" />
                <rect x={260} y={55} width={80} height={15} rx={2} fill="#0d9488" stroke="#2dd4bf" strokeWidth="0.5" />
                <rect x={260} y={40} width={80} height={15} rx={2} fill="#0f766e" stroke="#2dd4bf" strokeWidth="0.5" />
                <text x={300} y={63} fill="#e2e8f0" fontSize="8" textAnchor="middle">Stacked Dies</text>
              </g>
              <text x={300} y={105} fill="#e2e8f0" fontSize="10" textAnchor="middle">1024-bit bus</text>
              <text x={300} y={120} fill="#e2e8f0" fontSize="11" textAnchor="middle">~3+ TB/s</text>
              <text x={300} y={140} fill="#94a3b8" fontSize="9" textAnchor="middle">Vertically stacked</text>

              {/* Legend */}
              <g className="legend-panel">
                <rect x={130} y={155} width={140} height={20} rx={4} fill="rgba(30, 41, 59, 0.9)" />
                <text x={200} y={169} fill="#e2e8f0" fontSize="9" textAnchor="middle">Memory Architecture Comparison</text>
              </g>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Data center GPUs like NVIDIA H100 need 2+ terabytes per second of memory bandwidth.
              That's 4x what consumer GPUs achieve with GDDR6. How is this possible?
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does HBM achieve such high bandwidth?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Continue to Explore')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>HBM vs GDDR Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare stacked memory to traditional memory
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderBandwidthVisualization()}
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.warning}`,
              }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px' }}>HBM Key Insight:</h4>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  HBM stacks 4-8 memory dies vertically with thousands of tiny connections (TSVs).
                  This enables a 1024-bit or wider bus in a tiny footprint, achieving 2-3x the
                  bandwidth of GDDR at lower power per bit transferred.
                </p>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Compare Memory Types
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['gddr6', 'gddr6x', 'hbm2e'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setMemoryType(type);
                        if (type === 'hbm2e') {
                          setClockSpeed(1600);
                        } else {
                          setClockSpeed(2000);
                        }
                      }}
                      style={{
                        ...buttonStyle,
                        flex: 1,
                        padding: '12px 8px',
                        background: memoryType === type ? colors.warning : 'transparent',
                        border: `1px solid ${memoryType === type ? colors.warning : 'rgba(255,255,255,0.2)'}`,
                        color: colors.textPrimary,
                        fontSize: '11px',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div>{type.toUpperCase()}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>
                        {type === 'gddr6' ? '256-bit' : type === 'gddr6x' ? '384-bit' : '1024-bit'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  style={{
                    ...buttonStyle,
                    background: isAnimating ? colors.error : colors.success,
                    color: 'white',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isAnimating ? 'Stop' : 'Animate'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'hbm';
    const twistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
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
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
              Your prediction: "{twistPredictionLabel}"
            </p>
            <p style={{ color: colors.textPrimary }}>
              HBM stacks memory chips vertically and uses Through-Silicon Vias (TSVs) to create
              an extremely wide 1024+ bit bus in a tiny area, enabling massive bandwidth.
            </p>
          </div>

          {/* Visual diagram SVG for twist review */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="100%" height="180" viewBox="0 0 400 180" style={{ maxWidth: '400px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)' }}>
              <defs>
                <linearGradient id="twistHbmGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              {/* Title */}
              <text x={200} y={20} fill="#e2e8f0" fontSize="13" fontWeight="bold" textAnchor="middle">HBM: Vertical Stacking = Wider Bus</text>

              {/* GDDR side - horizontal layout */}
              <text x={80} y={45} fill="#e2e8f0" fontSize="11" textAnchor="middle">GDDR (Side-by-side)</text>
              <rect x={20} y={55} width={30} height={25} rx={2} fill="#3b82f6" />
              <rect x={55} y={55} width={30} height={25} rx={2} fill="#3b82f6" />
              <rect x={90} y={55} width={30} height={25} rx={2} fill="#3b82f6" />
              <rect x={125} y={55} width={30} height={25} rx={2} fill="#3b82f6" />
              <text x={80} y={100} fill="#94a3b8" fontSize="9" textAnchor="middle">256-bit bus (limited by PCB space)</text>

              {/* Arrow */}
              <text x={200} y={75} fill="#f59e0b" fontSize="16" fontWeight="bold" textAnchor="middle">vs</text>

              {/* HBM side - stacked */}
              <text x={320} y={45} fill="#e2e8f0" fontSize="11" textAnchor="middle">HBM (Stacked)</text>
              <rect x={290} y={80} width={60} height={12} rx={2} fill="url(#twistHbmGrad)" />
              <rect x={290} y={66} width={60} height={12} rx={2} fill="url(#twistHbmGrad)" />
              <rect x={290} y={52} width={60} height={12} rx={2} fill="url(#twistHbmGrad)" />
              <text x={320} y={100} fill="#94a3b8" fontSize="9" textAnchor="middle">1024-bit bus (TSVs)</text>

              {/* Key insight */}
              <rect x={50} y={115} width={300} height={35} rx={6} fill="rgba(6, 182, 212, 0.2)" />
              <text x={200} y={133} fill="#06b6d4" fontSize="10" fontWeight="bold" textAnchor="middle">Stacking memory vertically allows 4x wider bus</text>
              <text x={200} y={146} fill="#e2e8f0" fontSize="9" textAnchor="middle">in the same footprint = 3-4x more bandwidth!</text>

              {/* Legend */}
              <g className="legend-panel">
                <rect x={140} y={158} width={120} height={16} rx={4} fill="rgba(30, 41, 59, 0.9)" />
                <text x={200} y={170} fill="#e2e8f0" fontSize="9" textAnchor="middle">HBM vs GDDR Architecture</text>
              </g>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>HBM Technology</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Vertical Stacking:</strong> 4-8 DRAM
                dies stacked on top of each other, connected by thousands of microscopic TSVs.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Wide Bus:</strong> Each HBM stack
                has a 1024-bit interface. Multiple stacks give 4096+ bits total.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Efficiency:</strong> Shorter
                signal paths mean less power per bit. HBM uses ~3.5x less power per GB/s than GDDR.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Cost Trade-off:</strong> HBM is
                expensive and complex. Consumer GPUs use GDDR; data center GPUs use HBM.
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
              Progress: {transferCompleted.size} of {TRANSFER_APPLICATIONS.length} applications completed
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {TRANSFER_APPLICATIONS.map((app, index) => (
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>{app.description}</p>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>{app.stats}</p>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    ...buttonStyle,
                    padding: '8px 16px',
                    background: `linear-gradient(135deg, ${colors.accent} 0%, #0891b2 100%)`,
                    border: 'none',
                    color: 'white',
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Got It - Discover Answer
                </button>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {/* Already completed */}}
                    style={{
                      ...buttonStyle,
                      padding: '8px 16px',
                      background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                      border: 'none',
                      color: 'white',
                      fontSize: '13px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You understand GPU memory bandwidth!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {TEST_QUESTIONS.map((q, i) => {
              const userAnswer = testAnswers[i];
              const correctOption = q.options.find(o => o.correct);
              const userOption = q.options.find(o => o.id === userAnswer);
              const isCorrect = userAnswer === correctOption?.id;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 'bold' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px' }}>{q.scenario}</p>
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px', marginBottom: '4px' }}>
                      Your answer: {userOption?.label || 'No answer'}
                    </p>
                    {!isCorrect && (
                      <p style={{ color: colors.success, fontSize: '14px' }}>
                        Correct: {correctOption?.label}
                      </p>
                    )}
                  </div>
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${colors.accent}`,
                  }}>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestIndex + 1} of {TEST_QUESTIONS.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {TEST_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestIndex(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestIndex ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Scenario</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 'bold', margin: 0 }}>
                {currentQ.question}
              </p>
            </div>

            {/* Multiple Choice Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQ.options.map((option, idx) => (
                <button
                  key={option.id}
                  onClick={() => handleTestAnswer(option.id)}
                  style={{
                    ...buttonStyle,
                    padding: '14px 16px',
                    background: testAnswers[currentTestIndex] === option.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    border: testAnswers[currentTestIndex] === option.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentTestIndex] === option.id ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: testAnswers[currentTestIndex] === option.id ? 'white' : colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: 1.4 }}>{option.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={prevTestQuestion}
                disabled={currentTestIndex === 0}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.textMuted}`,
                  color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                  cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  style={{
                    ...buttonStyle,
                    background: colors.accent,
                    color: 'white',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!allAnswered}
                  style={{
                    ...buttonStyle,
                    background: allAnswered ? colors.success : colors.textMuted,
                    color: 'white',
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 50%, ${colors.bgPrimary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand GPU memory bandwidth architecture
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Bandwidth = Bus Width x Clock Speed x Transfers per Clock</li>
              <li>GPUs need wide buses for parallel shader core data access</li>
              <li>GDDR uses fast clocks with moderate bus width (256-384 bits)</li>
              <li>HBM stacks memory vertically for extreme bus width (1024+ bits)</li>
              <li>HBM trades cost for bandwidth and power efficiency</li>
              <li>AI workloads are extremely bandwidth-hungry</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Future memory technologies like HBM3e and GDDR7 push bandwidth even higher.
              NVIDIA's H100 achieves 3.35 TB/s with HBM3. The race for AI training performance
              is fundamentally a race for memory bandwidth!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderBandwidthVisualization()}
          </div>
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default GPUMemoryBandwidthRenderer;
