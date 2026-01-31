'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PCIeBandwidthRendererProps {
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
  twist_play: 'Overhead Lab',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pcie: '#3b82f6',
  nvlink: '#22c55e',
  gpu: '#8b5cf6',
  cpu: '#f97316',
};

// PCIe Generation specs (GB/s per lane)
const PCIE_SPECS = {
  'PCIe 3.0': { perLane: 0.985, maxLanes: 16, color: '#3b82f6' },
  'PCIe 4.0': { perLane: 1.969, maxLanes: 16, color: '#8b5cf6' },
  'PCIe 5.0': { perLane: 3.938, maxLanes: 16, color: '#06b6d4' },
  'NVLink 3': { perLane: 25, maxLanes: 12, color: '#22c55e' },
  'NVLink 4': { perLane: 50, maxLanes: 18, color: '#10b981' },
};

const TEST_QUESTIONS = [
  // Q1: PCIe Generations and Speeds (Easy) - Correct: B
  {
    scenario: "Your company is building a new AI training server. The motherboard supports PCIe 4.0 and PCIe 5.0 slots. You need to understand the bandwidth differences.",
    question: "How does PCIe 5.0 bandwidth compare to PCIe 4.0 for the same lane configuration (e.g., x16)?",
    options: [
      { id: 'same', label: "They have the same bandwidth - only latency improves" },
      { id: 'double', label: "PCIe 5.0 provides approximately double the bandwidth per lane", correct: true },
      { id: 'quadruple', label: "PCIe 5.0 provides four times the bandwidth" },
      { id: 'slight', label: "PCIe 5.0 is only about 20% faster" },
    ],
    explanation: "Each PCIe generation roughly doubles the per-lane bandwidth. PCIe 4.0 provides ~2 GB/s per lane, while PCIe 5.0 provides ~4 GB/s per lane. This means a PCIe 5.0 x16 slot offers ~64 GB/s compared to ~32 GB/s for PCIe 4.0 x16."
  },
  // Q2: Lane Configurations (Easy) - Correct: C
  {
    scenario: "You're installing an NVIDIA RTX 4090 GPU which requires a PCIe x16 slot. Your motherboard has both x16 and x8 slots available.",
    question: "What does 'x16' mean in PCIe x16, and what happens if you install a x16 card in a x8 slot?",
    options: [
      { id: 'speed', label: "x16 means 16 GB/s speed; x8 slot won't work at all" },
      { id: 'version', label: "x16 is the PCIe version; the card will run at x8 version" },
      { id: 'lanes', label: "x16 means 16 parallel data lanes; the card will work but at half bandwidth", correct: true },
      { id: 'power', label: "x16 refers to power delivery; the card will run but may throttle" },
    ],
    explanation: "The 'x' number indicates parallel data lanes. A PCIe x16 card uses 16 lanes simultaneously, like a 16-lane highway. Installing in an x8 slot works (PCIe is backward compatible) but halves your bandwidth since you're only using 8 lanes."
  },
  // Q3: Encoding Overhead - 128b/130b (Medium) - Correct: A
  {
    scenario: "A colleague claims PCIe 4.0 x16 should provide exactly 32 GB/s, but benchmarks show only ~31.5 GB/s usable bandwidth.",
    question: "What causes this ~1.5% reduction from the theoretical maximum bandwidth?",
    options: [
      { id: 'encoding', label: "128b/130b encoding adds 2 overhead bits per 128 data bits for error detection", correct: true },
      { id: 'cable', label: "Cable resistance reduces signal strength by about 1.5%" },
      { id: 'driver', label: "GPU drivers reserve 1.5% for system overhead" },
      { id: 'cooling', label: "Thermal throttling reduces bandwidth in typical conditions" },
    ],
    explanation: "PCIe 4.0 and 5.0 use 128b/130b encoding: every 128 bits of data requires 130 bits to transmit (2 extra bits for synchronization and error detection). This gives 128/130 = 98.46% efficiency. Earlier PCIe 3.0 used 8b/10b encoding with only 80% efficiency!"
  },
  // Q4: Bandwidth Calculation (Medium) - Correct: D
  {
    scenario: "You're calculating the theoretical bandwidth for a new GPU connection. The specs show: PCIe 4.0, x16 configuration, bidirectional communication.",
    question: "What is the correct formula and approximate total bandwidth for this PCIe 4.0 x16 connection?",
    options: [
      { id: 'wrong1', label: "4.0 × 16 = 64 GB/s total" },
      { id: 'wrong2', label: "2 GB/s × 16 lanes = 32 GB/s unidirectional only" },
      { id: 'wrong3', label: "16 GT/s × 16 lanes × 8 bits = 2048 GB/s" },
      { id: 'correct', label: "~2 GB/s per lane × 16 lanes = ~32 GB/s each direction (~64 GB/s bidirectional)", correct: true },
    ],
    explanation: "PCIe 4.0 provides ~2 GB/s per lane (after encoding overhead). With 16 lanes, you get ~32 GB/s in each direction. Since PCIe is full-duplex, total bidirectional bandwidth is ~64 GB/s, though most operations are predominantly one direction."
  },
  // Q5: Duplex Communication (Medium) - Correct: B
  {
    scenario: "During deep learning training, your GPU needs to both receive training data from system memory AND send computed gradients back to the CPU for aggregation.",
    question: "How does PCIe handle simultaneous sending and receiving of data?",
    options: [
      { id: 'halfduplex', label: "PCIe is half-duplex - it switches between sending and receiving, halving effective throughput" },
      { id: 'fullduplex', label: "PCIe is full-duplex - dedicated lanes for each direction allow simultaneous bidirectional transfer", correct: true },
      { id: 'timeshare', label: "PCIe time-shares lanes at nanosecond intervals to simulate bidirectional transfer" },
      { id: 'buffer', label: "PCIe uses large buffers to queue operations; only one direction active at a time" },
    ],
    explanation: "PCIe is inherently full-duplex with separate transmit and receive pairs in each lane. This means a x16 slot has 16 lanes sending AND 16 lanes receiving simultaneously. During training, the GPU can receive the next batch while sending gradients from the current batch."
  },
  // Q6: Multi-GPU Scaling (Hard) - Correct: C
  {
    scenario: "Your AI lab has a server with 8 identical GPUs connected via PCIe. You expect 8x speedup for your training job, but benchmarks show only 5.5x actual speedup.",
    question: "What is the PRIMARY reason for this sub-linear scaling efficiency?",
    options: [
      { id: 'power', label: "Power supply limitations reduce individual GPU performance" },
      { id: 'memory', label: "Each GPU has less memory available due to system overhead" },
      { id: 'communication', label: "Gradient synchronization across GPUs creates communication overhead that grows with GPU count", correct: true },
      { id: 'pcie', label: "PCIe bandwidth is shared equally, giving each GPU only 1/8th the bandwidth" },
    ],
    explanation: "With data parallelism, GPUs must synchronize gradients after each batch (all-reduce operation). Communication time is largely independent of compute time, so adding GPUs increases sync overhead. This follows Amdahl's Law: the non-parallelizable portion (communication) limits total speedup."
  },
  // Q7: NVLink vs PCIe (Hard) - Correct: A
  {
    scenario: "NVIDIA's DGX H100 system uses NVLink 4.0 to connect 8 GPUs, achieving 900 GB/s total interconnect bandwidth. A comparable PCIe-only system uses PCIe 5.0 x16.",
    question: "Why do data centers pay premium prices for NVLink instead of using PCIe for GPU-to-GPU communication?",
    options: [
      { id: 'bandwidth', label: "NVLink provides 10-14x higher bandwidth (900 GB/s vs ~64 GB/s) enabling efficient large model training", correct: true },
      { id: 'latency', label: "NVLink has lower latency, but bandwidth is similar to PCIe 5.0" },
      { id: 'power', label: "NVLink uses significantly less power per GB transferred" },
      { id: 'cpu', label: "NVLink allows direct GPU-CPU communication, bypassing system memory" },
    ],
    explanation: "NVLink's massive bandwidth advantage (900 GB/s vs ~64 GB/s for PCIe 5.0 x16) is crucial for training large language models where GPUs must share billions of parameters. PCIe would create a severe bottleneck during gradient synchronization, making training impractically slow."
  },
  // Q8: Latency Considerations (Hard) - Correct: D
  {
    scenario: "Two systems have identical PCIe bandwidth. System A has 100ns PCIe latency, System B has 500ns. Both transfer 1GB data chunks during training.",
    question: "For large AI training workloads, which system performs better and why?",
    options: [
      { id: 'a_much', label: "System A is 5x faster because latency directly multiplies transfer time" },
      { id: 'b_better', label: "System B is better because higher latency allows more data buffering" },
      { id: 'equal', label: "They perform identically since bandwidth is the same" },
      { id: 'a_slight', label: "System A is slightly better; latency matters for small transfers but bandwidth dominates for large transfers", correct: true },
    ],
    explanation: "For large transfers, bandwidth dominates total time: 1GB at 32 GB/s = ~31ms transfer time. The 400ns latency difference is negligible (0.001%). However, latency matters for small, frequent transfers like control signals. AI training with large batches is bandwidth-bound, not latency-bound."
  },
  // Q9: Real-World Application (Expert) - Correct: B
  {
    scenario: "Apple's M3 Max chip uses unified memory architecture where CPU and GPU share 400+ GB/s memory bandwidth. Traditional discrete GPUs use PCIe at ~64 GB/s for CPU-GPU transfers.",
    question: "Why might a discrete GPU with 900 GB/s memory bandwidth still outperform Apple Silicon for large AI training, despite the PCIe bottleneck?",
    options: [
      { id: 'compute', label: "Discrete GPUs have faster clock speeds than Apple Silicon" },
      { id: 'internal', label: "Once data is on GPU, its 900 GB/s internal bandwidth is used repeatedly; PCIe is only needed for initial data loading", correct: true },
      { id: 'drivers', label: "NVIDIA CUDA drivers are more optimized than Apple Metal" },
      { id: 'cooling', label: "Better cooling allows sustained higher performance" },
    ],
    explanation: "Deep learning kernels are compute-bound, not I/O-bound for trained models. Data loaded once (via slow PCIe) is processed through many layers using fast GPU memory bandwidth. The 900 GB/s is used for weight access, activations, and gradients - all happening internally. PCIe only transfers input batches and final outputs."
  },
  // Q10: System Design (Expert) - Correct: C
  {
    scenario: "You're designing a multi-GPU training system. Budget allows either: (A) 4 GPUs with PCIe 5.0 x16 each, or (B) 8 GPUs with PCIe 4.0 x8 each. Both options have similar total cost.",
    question: "For training a 70B parameter language model using data parallelism, which configuration likely performs better?",
    options: [
      { id: 'option_a', label: "Option A: Fewer GPUs means less communication overhead" },
      { id: 'option_b', label: "Option B: More GPUs always train faster regardless of interconnect" },
      { id: 'depends', label: "Option A: Higher per-GPU bandwidth reduces gradient sync time; 8 GPUs at x8 would bottleneck severely", correct: true },
      { id: 'same', label: "Both perform similarly since total system bandwidth is comparable" },
    ],
    explanation: "Large model training is communication-intensive. Option B's 8 GPUs at PCIe 4.0 x8 (~16 GB/s each) would create severe bottlenecks during all-reduce operations. Option A's 4 GPUs at PCIe 5.0 x16 (~64 GB/s each) provides 4x per-GPU bandwidth, leading to better scaling efficiency despite fewer GPUs."
  },
];

const TRANSFER_APPS = [
  {
    title: 'Data Center GPU Clusters',
    description: 'Modern AI data centers use NVLink and NVSwitch to connect up to 8 GPUs with 900 GB/s total bandwidth, enabling training of trillion-parameter models.',
    insight: 'DGX H100: 900 GB/s NVLink',
  },
  {
    title: 'Gaming Multi-GPU (SLI/CrossFire)',
    description: 'Consumer multi-GPU gaming struggled because PCIe bandwidth created bottlenecks when sharing frame data between GPUs.',
    insight: 'Why SLI died: PCIe too slow',
  },
  {
    title: 'Distributed Training',
    description: 'When training across multiple machines, network bandwidth (InfiniBand 400 Gb/s) becomes the bottleneck, not PCIe.',
    insight: '400 Gb/s = 50 GB/s network',
  },
  {
    title: 'Apple Silicon Unified Memory',
    description: 'Apple M-series chips share memory between CPU and GPU with 400+ GB/s bandwidth, eliminating PCIe copying entirely.',
    insight: 'M3 Max: 400 GB/s unified',
  },
];

const PCIeBandwidthRenderer: React.FC<PCIeBandwidthRendererProps> = ({
  gamePhase,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Simulation state
  const [pcieGen, setPcieGen] = useState<keyof typeof PCIE_SPECS>('PCIe 4.0');
  const [numLanes, setNumLanes] = useState(16);
  const [numGPUs, setNumGPUs] = useState(2);
  const [modelSize, setModelSize] = useState(10); // GB
  const [useNVLink, setUseNVLink] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Responsive detection
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

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate bandwidth and efficiency
  const spec = PCIE_SPECS[pcieGen];
  const pcieBandwidth = spec.perLane * numLanes;
  const nvlinkBandwidth = useNVLink ? (pcieGen.includes('5') ? 900 : 600) : 0;
  const effectiveBandwidth = useNVLink ? nvlinkBandwidth : pcieBandwidth;

  // Transfer time calculation
  const transferTimePerGPU = (modelSize * 1000) / effectiveBandwidth; // ms for 1GB chunks
  const communicationOverhead = numGPUs > 1 ? (numGPUs - 1) * 0.15 : 0; // 15% overhead per additional GPU
  const scalingEfficiency = numGPUs > 1 ? 1 / (1 + communicationOverhead) : 1;
  const effectiveSpeedup = numGPUs * scalingEfficiency;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctOption = TEST_QUESTIONS[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 700;
    const height = 400;
    const dataFlowOffset = animationFrame % 60;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'transparent', borderRadius: '16px' }}
      >
        {/* Premium SVG Defs Section */}
        <defs>
          {/* Premium CPU chip gradient with metallic depth */}
          <linearGradient id="pcieCpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          {/* CPU die heat glow */}
          <radialGradient id="pcieCpuGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fdba74" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#fb923c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>

          {/* GPU chip gradient with purple depth */}
          <linearGradient id="pcieGpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="25%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="75%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>

          {/* GPU processing glow */}
          <radialGradient id="pcieGpuGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>

          {/* PCIe slot gradient - blue metallic */}
          <linearGradient id="pciePcieSlotGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="20%" stopColor="#1e40af" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* PCIe lane data flow gradient */}
          <linearGradient id="pcieLaneFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* NVLink high-speed gradient - green with energy */}
          <linearGradient id="pcieNvlinkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="25%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="75%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* NVLink data burst glow */}
          <radialGradient id="pcieNvlinkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Motherboard PCB gradient */}
          <linearGradient id="pciePcbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="30%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="70%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Data packet glow effect */}
          <radialGradient id="pcieDataPacketGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* Bandwidth meter gradient - cyan energy */}
          <linearGradient id="pcieBandwidthMeterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>

          {/* Efficiency meter gradient - success to warning */}
          <linearGradient id="pcieEfficiencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Warning efficiency gradient */}
          <linearGradient id="pcieWarningGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>

          {/* Background lab gradient */}
          <linearGradient id="pcieLabBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="30%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Premium glow filter for CPU */}
          <filter id="pcieCpuGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Premium glow filter for GPU */}
          <filter id="pcieGpuGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Data flow glow filter */}
          <filter id="pcieDataGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* NVLink intense glow filter */}
          <filter id="pcieNvlinkGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle shadow filter */}
          <filter id="pcieShadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* PCB trace pattern */}
          <pattern id="pciePcbTracePattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="#0d9488" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#0d9488" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="10" cy="10" r="1" fill="#0d9488" fillOpacity="0.4" />
          </pattern>

          {/* Lane indicator pattern */}
          <pattern id="pcieLanePattern" width="8" height="4" patternUnits="userSpaceOnUse">
            <rect width="6" height="3" rx="1" fill="#60a5fa" fillOpacity="0.6" />
          </pattern>
        </defs>

        {/* Premium dark lab background */}
        <rect width={width} height={height} fill="url(#pcieLabBgGradient)" rx="16" />

        {/* Subtle grid overlay */}
        <rect width={width} height={height} fill="url(#pciePcbTracePattern)" opacity="0.4" rx="16" />

        {/* === MOTHERBOARD BASE === */}
        <rect x="15" y="320" width={width - 30} height="70" rx="8" fill="url(#pciePcbGradient)" filter="url(#pcieShadowFilter)" />
        <rect x="15" y="320" width={width - 30} height="4" rx="2" fill="#10b981" opacity="0.3" />

        {/* PCB mounting holes */}
        {[50, 175, 350, 525, 650].map((x, i) => (
          <g key={`mount-${i}`}>
            <circle cx={x} cy="355" r="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <circle cx={x} cy="355" r="3" fill="#0f172a" />
          </g>
        ))}

        {/* === PREMIUM CPU WITH HEATSINK === */}
        <g transform="translate(40, 150)">
          {/* CPU socket base */}
          <rect x="-10" y="-10" width="110" height="100" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="2" />

          {/* CPU die with glow */}
          <rect x="0" y="0" width="90" height="80" rx="6" fill="url(#pcieCpuGradient)" filter="url(#pcieCpuGlowFilter)" />

          {/* CPU core pattern */}
          <g opacity="0.4">
            {[0, 1, 2, 3].map((row) => (
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`core-${row}-${col}`}
                  x={8 + col * 20}
                  y={8 + row * 18}
                  width="16"
                  height="14"
                  rx="2"
                  fill="#fdba74"
                  opacity={0.5 + Math.random() * 0.5}
                >
                  <animate
                    attributeName="opacity"
                    values={`${0.3 + Math.random() * 0.3};${0.6 + Math.random() * 0.4};${0.3 + Math.random() * 0.3}`}
                    dur={`${0.5 + Math.random() * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              ))
            ))}
          </g>

          {/* CPU label */}
          <text x="45" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">CPU</text>
          <text x="45" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="9">Host Processor</text>

          {/* Heat indicator glow */}
          <ellipse cx="45" cy="40" rx="35" ry="30" fill="url(#pcieCpuGlow)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* === PCIE SLOT VISUALIZATION === */}
        <g transform="translate(160, 180)">
          {/* PCIe slot housing */}
          <rect x="0" y="-5" width="120" height="50" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />

          {/* PCIe slot connector */}
          <rect x="5" y="5" width="110" height="30" rx="3" fill="url(#pciePcieSlotGradient)" />

          {/* Lane indicators based on numLanes */}
          <g>
            {Array.from({ length: numLanes }).map((_, i) => (
              <rect
                key={`lane-${i}`}
                x={8 + i * (104 / 16)}
                y="10"
                width={Math.max(2, (100 / 16) - 2)}
                height="20"
                rx="1"
                fill="#60a5fa"
                opacity={0.6 + (i % 2) * 0.2}
              >
                <animate
                  attributeName="opacity"
                  values="0.5;0.9;0.5"
                  dur={`${0.3 + (i * 0.05)}s`}
                  repeatCount="indefinite"
                />
              </rect>
            ))}
          </g>

          {/* PCIe generation label */}
          <rect x="30" y="-30" width="60" height="20" rx="4" fill="#1e293b" stroke={colors.pcie} strokeWidth="1" />
          <text x="60" y="-16" textAnchor="middle" fill={colors.pcie} fontSize="10" fontWeight="bold">{pcieGen}</text>

          {/* Bandwidth label */}
          <text x="60" y="60" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            x{numLanes} = {pcieBandwidth.toFixed(1)} GB/s
          </text>
        </g>

        {/* === DATA FLOW ANIMATION === */}
        <g>
          {/* Main PCIe data bus path */}
          <path
            d={`M 130 190 Q 180 190 280 190`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeOpacity="0.2"
            strokeLinecap="round"
          />

          {/* Animated data packets on PCIe bus */}
          {[0, 15, 30, 45].map((offset, i) => {
            const progress = ((dataFlowOffset + offset) % 60) / 60;
            const x = 130 + progress * 150;
            return (
              <g key={`packet-${i}`} filter="url(#pcieDataGlowFilter)">
                <rect
                  x={x}
                  y={185}
                  width="12"
                  height="10"
                  rx="2"
                  fill="url(#pcieLaneFlowGradient)"
                />
                <ellipse cx={x + 6} cy={190} rx="8" ry="6" fill="url(#pcieDataPacketGlow)" opacity="0.5" />
              </g>
            );
          })}
        </g>

        {/* === PREMIUM GPU CARDS === */}
        {Array.from({ length: Math.min(numGPUs, 4) }).map((_, i) => {
          const gpuX = 320;
          const gpuY = 50 + i * 80;
          const isActive = i < numGPUs;

          return (
            <g key={`gpu-${i}`} transform={`translate(${gpuX}, ${gpuY})`}>
              {/* GPU card body */}
              <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#334155" strokeWidth="1.5" filter="url(#pcieShadowFilter)" />

              {/* GPU die with gradient */}
              <rect x="10" y="8" width="60" height="44" rx="4" fill="url(#pcieGpuGradient)" filter="url(#pcieGpuGlowFilter)" />

              {/* GPU processing cores visualization */}
              <g opacity="0.5">
                {[0, 1, 2, 3].map((row) => (
                  [0, 1, 2, 3, 4].map((col) => (
                    <rect
                      key={`gpucore-${i}-${row}-${col}`}
                      x={14 + col * 11}
                      y={12 + row * 10}
                      width="8"
                      height="7"
                      rx="1"
                      fill="#c4b5fd"
                    >
                      <animate
                        attributeName="opacity"
                        values={`${0.2 + Math.random() * 0.3};${0.7 + Math.random() * 0.3};${0.2 + Math.random() * 0.3}`}
                        dur={`${0.2 + Math.random() * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </rect>
                  ))
                ))}
              </g>

              {/* VRAM modules */}
              {[0, 1, 2, 3].map((j) => (
                <rect key={`vram-${i}-${j}`} x={80 + (j % 2) * 25} y={10 + Math.floor(j / 2) * 22} width="20" height="18" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
              ))}

              {/* GPU label */}
              <text x="70" y="70" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">GPU {i + 1}</text>

              {/* PCIe connection line with animation */}
              <line
                x1="-40"
                y1="30"
                x2="0"
                y2="30"
                stroke={colors.pcie}
                strokeWidth="3"
                strokeDasharray="6,3"
                opacity="0.7"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-9" dur="0.5s" repeatCount="indefinite" />
              </line>

              {/* Processing glow */}
              <ellipse cx="40" cy="30" rx="25" ry="20" fill="url(#pcieGpuGlow)" opacity="0.4">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          );
        })}

        {/* === NVLINK CONNECTIONS === */}
        {useNVLink && numGPUs > 1 && (
          <g>
            {Array.from({ length: Math.min(numGPUs - 1, 3) }).map((_, i) => {
              const y1 = 80 + i * 80 + 30;
              const y2 = 80 + (i + 1) * 80 + 30;
              return (
                <g key={`nvlink-${i}`}>
                  {/* NVLink connection bar */}
                  <rect
                    x="475"
                    y={y1}
                    width="12"
                    height={y2 - y1}
                    rx="3"
                    fill="url(#pcieNvlinkGradient)"
                    filter="url(#pcieNvlinkGlowFilter)"
                  />

                  {/* Animated data flow on NVLink */}
                  {[0, 1, 2].map((j) => {
                    const flowY = y1 + ((dataFlowOffset * 2 + j * 20) % (y2 - y1));
                    return (
                      <ellipse
                        key={`nvflow-${i}-${j}`}
                        cx="481"
                        cy={flowY}
                        rx="4"
                        ry="3"
                        fill="url(#pcieNvlinkGlow)"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* NVLink label */}
            <g transform="translate(500, 160)">
              <rect x="-5" y="-15" width="80" height="40" rx="6" fill="#0f172a" stroke={colors.nvlink} strokeWidth="1" />
              <text x="35" y="2" textAnchor="middle" fill={colors.nvlink} fontSize="11" fontWeight="bold">NVLink</text>
              <text x="35" y="16" textAnchor="middle" fill={colors.textMuted} fontSize="9">{nvlinkBandwidth} GB/s</text>
            </g>
          </g>
        )}

        {/* === BANDWIDTH METER === */}
        <g transform="translate(40, 265)">
          <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Effective Bandwidth</text>

          {/* Meter background */}
          <rect x="0" y="8" width="200" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Meter fill with gradient */}
          <rect
            x="2"
            y="10"
            width={Math.min(196 * (effectiveBandwidth / 1000), 196)}
            height="12"
            rx="3"
            fill={useNVLink ? "url(#pcieNvlinkGradient)" : "url(#pcieBandwidthMeterGradient)"}
          >
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
          </rect>

          {/* Value label */}
          <text x="210" y="22" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
            {effectiveBandwidth.toFixed(0)} GB/s
          </text>
        </g>

        {/* === SCALING EFFICIENCY METER === */}
        <g transform="translate(320, 265)">
          <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Scaling Efficiency</text>

          {/* Meter background */}
          <rect x="0" y="8" width="200" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Meter fill with conditional gradient */}
          <rect
            x="2"
            y="10"
            width={196 * scalingEfficiency}
            height="12"
            rx="3"
            fill={scalingEfficiency > 0.8 ? "url(#pcieEfficiencyGradient)" : "url(#pcieWarningGradient)"}
          />

          {/* Value label */}
          <text x="210" y="22" fill={scalingEfficiency > 0.8 ? colors.success : colors.warning} fontSize="12" fontWeight="bold">
            {(scalingEfficiency * 100).toFixed(0)}%
          </text>
        </g>

        {/* === STATS DISPLAY === */}
        <g transform="translate(600, 320)">
          <rect x="-10" y="-10" width="95" height="70" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="38" y="8" textAnchor="middle" fill={colors.accent} fontSize="9" fontWeight="bold">PERFORMANCE</text>
          <text x="38" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            {effectiveSpeedup.toFixed(2)}x
          </text>
          <text x="38" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="8">
            Speedup
          </text>
          <text x="38" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="9">
            {numGPUs} GPU{numGPUs > 1 ? 's' : ''}
          </text>
        </g>

        {/* === LABELS === */}
        <text x="350" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
          PCIe Bandwidth Architecture
        </text>
        <text x="350" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="10">
          CPU ➔ PCIe {pcieGen} x{numLanes} ➔ GPU{numGPUs > 1 ? 's' : ''} {useNVLink ? '+ NVLink' : ''}
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Generation
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'] as const).map(gen => (
            <button
              key={gen}
              onClick={() => setPcieGen(gen)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: pcieGen === gen ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: pcieGen === gen ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {gen}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Lanes: x{numLanes}
        </label>
        <input
          type="range"
          min={1}
          max={16}
          value={numLanes}
          onChange={(e) => setNumLanes(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of GPUs: {numGPUs}
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={numGPUs}
          onChange={(e) => setNumGPUs(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.gpu }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize} GB
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setUseNVLink(!useNVLink)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: useNVLink ? colors.nvlink : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {useNVLink ? 'NVLink: ON' : 'NVLink: OFF'}
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          Direct GPU-to-GPU connection
        </span>
      </div>
    </div>
  );

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
        zIndex: 1000,
        gap: '12px'
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          PCIe Bandwidth
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
  const renderBottomBar = (canProceed: boolean, buttonText: string, action?: () => void) => {
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
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={action || goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Phase renders
  const renderHook = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            PCIe Bandwidth Limits
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            Why can't you just add more GPUs to make training faster?
          </p>
        </div>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginTop: '24px'
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
            Every GPU connects to your system through a PCIe slot - a highway with limited lanes.
            When GPUs need to share data during AI training, this highway can become a traffic jam.
          </p>
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              PCIe 4.0 x16: ~32 GB/s | GPU Memory Bandwidth: ~900 GB/s
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              That's a 28x bottleneck between the GPU and the rest of the system!
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'linear', text: '2 GPUs = 2x faster, 8 GPUs = 8x faster (linear scaling)' },
      { id: 'diminishing', text: 'Each added GPU gives less speedup than the previous' },
      { id: 'constant', text: 'More GPUs don\'t help - one GPU does all the work' },
      { id: 'negative', text: 'Too many GPUs actually slows things down' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens to training speed as you add more GPUs?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: prediction === 'diminishing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'diminishing' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'diminishing' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'diminishing' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Due to communication overhead, each additional GPU provides diminishing returns.
                The bandwidth bottleneck means GPUs spend time waiting for data instead of computing.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!prediction, 'Explore the Lab')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          PCIe Bandwidth Lab
        </h2>

        {renderVisualization()}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Observations:</h3>
          <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>Doubling PCIe lanes doubles bandwidth</li>
            <li>Each PCIe generation approximately doubles per-lane speed</li>
            <li>NVLink provides 10-30x more GPU-to-GPU bandwidth than PCIe</li>
            <li>Communication overhead grows with GPU count</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review Concepts')}
    </div>
  );

  const renderReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Understanding PCIe Bandwidth
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.pcie, marginBottom: '8px' }}>PCIe Bandwidth Formula</h3>
            <p style={{ color: colors.textPrimary, fontFamily: 'monospace', fontSize: '14px' }}>
              Total Bandwidth = Per-Lane Speed x Number of Lanes
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
              PCIe 4.0 x16 = 1.97 GB/s x 16 = 31.5 GB/s bidirectional
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Amdahl's Law</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Speedup is limited by the sequential (non-parallelizable) portion of your workload.
              With GPUs, communication is often the sequential bottleneck.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.nvlink, marginBottom: '8px' }}>Why NVLink Matters</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              NVLink provides direct GPU-to-GPU communication at 600-900 GB/s,
              bypassing the CPU and PCIe bottleneck entirely.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Communication Overhead')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'none', text: 'Communication overhead is negligible with fast interconnects' },
      { id: 'linear', text: 'Overhead grows linearly with GPU count' },
      { id: 'quadratic', text: 'Overhead can grow quadratically (all-to-all communication)' },
      { id: 'fixed', text: 'Overhead is fixed regardless of GPU count' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Communication Overhead
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            During training, GPUs must synchronize gradients. How does this scale?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: twistPrediction === 'quadratic' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'quadratic' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'quadratic' ? 'Correct!' : 'Partially right!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Naive all-reduce has O(n) communication, but with ring-reduce it's O(1) per GPU.
                However, synchronization barriers and network topology still cause overhead that limits scaling.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Communication Patterns')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Communication Overhead Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Gradient Synchronization</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
            When training with data parallelism, each GPU computes gradients on different data.
            Before updating weights, all gradients must be averaged across all GPUs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.error, fontSize: '12px', fontWeight: 'bold' }}>Naive All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Send all to one, then broadcast</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(N) data movement</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 'bold' }}>Ring All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Circular data passing</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(1) per GPU</p>
            </div>
          </div>
        </div>

        {renderControls()}
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Communication Limits Multi-GPU Scaling
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Problem</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Even with perfect algorithms, physical bandwidth limits how fast data can move.
              8 GPUs training a large model might only achieve 5-6x speedup, not 8x.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li>NVLink for high-bandwidth GPU interconnect</li>
              <li>Gradient compression to reduce data volume</li>
              <li>Overlapping computation with communication</li>
              <li>Model parallelism instead of data parallelism</li>
            </ul>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Real-World Applications')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Explore all 4 applications to continue
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {TRANSFER_APPS.map((app, i) => (
            <div
              key={i}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(i) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
              </div>
              {!transferCompleted.has(i) && (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, i]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
    </div>
  );

  const renderTest = () => {
    const totalQuestions = TEST_QUESTIONS.length;

    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `3px solid ${passed ? colors.success : colors.warning}`
              }}>
                {score === totalQuestions ? 'Trophy' : score >= 9 ? 'Star' : score >= 7 ? 'Check' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px', marginBottom: '8px' }}>
                {score}/{totalQuestions} Correct
              </h2>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {score === totalQuestions ? "Perfect! You've mastered PCIe bandwidth!" :
                 score >= 9 ? 'Excellent! You deeply understand PCIe concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - hardware concepts take time!'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(new Array(10).fill(null));
                    setCurrentTestIndex(0);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    background: colors.bgCard,
                    color: colors.textSecondary,
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => goNext()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    background: passed ? colors.success : colors.warning,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {passed ? 'Claim Mastery' : 'Review Lesson'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
                Question-by-Question Review
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {TEST_QUESTIONS.map((q, i) => {
                const correctOption = q.options.find(o => o.correct);
                const correctId = correctOption?.id;
                const userAnswer = testAnswers[i];
                const userOption = q.options.find(o => o.id === userAnswer);
                const isCorrect = userAnswer === correctId;

                return (
                  <div key={i} style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: colors.bgCard,
                    border: `2px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                  }}>
                    <div style={{
                      padding: '16px',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white'
                        }}>
                          {isCorrect ? 'Y' : 'X'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textPrimary, margin: 0 }}>
                            Question {i + 1}
                          </p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                            {q.question}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: isCorrect ? colors.success : colors.error
                        }}>
                          {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                        </p>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                          {userOption?.label || 'No answer selected'}
                        </p>
                      </div>

                      {!isCorrect && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '4px',
                            color: colors.success
                          }}>
                            Correct Answer
                          </p>
                          <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                            {correctOption?.label}
                          </p>
                        </div>
                      )}

                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)'
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: colors.accent
                        }}>
                          Why?
                        </p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '16px',
              textAlign: 'center',
              background: colors.bgCard,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '12px', color: colors.textSecondary }}>
                {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
              </p>
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(new Array(10).fill(null));
                  setCurrentTestIndex(0);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: colors.accent,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Retake Test
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.warning
            }}>
              Knowledge Test
            </p>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: colors.textPrimary }}>
              Question {currentTestIndex + 1} of {totalQuestions}
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalQuestions }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: '8px',
                    flex: 1,
                    borderRadius: '9999px',
                    background: i === currentTestIndex ? colors.warning :
                               testAnswers[i] !== null ? colors.success :
                               'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.accent
            }}>
              Scenario
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
              {currentQ.scenario}
            </p>
          </div>

          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px', color: colors.textPrimary }}>
            {currentQ.question}
          </p>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentTestIndex] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '16px',
                  textAlign: 'left',
                  background: testAnswers[currentTestIndex] === opt.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  border: `2px solid ${testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textMuted
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textSecondary,
                  margin: 0
                }}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                zIndex: 10,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setTestSubmitted(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.nvlink})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          PCIe Bandwidth Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand why "just add more GPUs" doesn't always work
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>PCIe bandwidth limits (lanes x generation)</li>
            <li>NVLink for high-speed GPU interconnect</li>
            <li>Communication overhead in multi-GPU training</li>
            <li>Diminishing returns with scaling</li>
            <li>Amdahl's Law and parallel efficiency</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "The fastest GPU is the one that doesn't wait for data."
          </p>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      {renderProgressBar()}
      {/* Main content with padding for fixed header */}
      <div style={{ paddingTop: '60px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default PCIeBandwidthRenderer;
