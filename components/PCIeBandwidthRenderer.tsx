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
    const width = 400;
    const height = 300;
    const dataFlowOffset = animationFrame % 50;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#1e293b', borderRadius: '12px' }}
      >
        {/* CPU */}
        <rect x={30} y={120} width={70} height={60} rx={8} fill={colors.cpu} />
        <text x={65} y={155} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">CPU</text>

        {/* PCIe Bus */}
        <rect x={100} y={140} width={100} height={20} fill={colors.pcie} opacity={0.3} />
        <text x={150} y={130} textAnchor="middle" fill={colors.textMuted} fontSize={10}>{pcieGen}</text>
        <text x={150} y={175} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>{pcieBandwidth.toFixed(1)} GB/s</text>

        {/* Data flow animation on PCIe */}
        {[0, 20, 40].map((offset, i) => (
          <rect
            key={i}
            x={100 + ((dataFlowOffset + offset) % 100)}
            y={145}
            width={15}
            height={10}
            rx={2}
            fill={colors.pcie}
            opacity={0.8}
          />
        ))}

        {/* GPUs */}
        {Array.from({ length: Math.min(numGPUs, 4) }).map((_, i) => {
          const gpuX = 220;
          const gpuY = 40 + i * 65;
          return (
            <g key={i}>
              <rect x={gpuX} y={gpuY} width={80} height={50} rx={6} fill={colors.gpu} />
              <text x={gpuX + 40} y={gpuY + 30} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">GPU {i + 1}</text>

              {/* PCIe connection line */}
              <line x1={200} y1={150} x2={gpuX} y2={gpuY + 25} stroke={colors.pcie} strokeWidth={2} strokeDasharray="4,2" />
            </g>
          );
        })}

        {/* NVLink connections between GPUs */}
        {useNVLink && numGPUs > 1 && (
          <g>
            {Array.from({ length: Math.min(numGPUs - 1, 3) }).map((_, i) => (
              <line
                key={i}
                x1={300}
                y1={65 + i * 65}
                x2={300}
                y2={105 + i * 65}
                stroke={colors.nvlink}
                strokeWidth={4}
              />
            ))}
            <text x={320} y={140} fill={colors.nvlink} fontSize={9} fontWeight="bold">NVLink</text>
            <text x={320} y={155} fill={colors.nvlink} fontSize={8}>{nvlinkBandwidth} GB/s</text>
          </g>
        )}

        {/* Bandwidth meter */}
        <rect x={30} y={220} width={150} height={12} rx={3} fill="rgba(255,255,255,0.1)" />
        <rect
          x={30}
          y={220}
          width={150 * Math.min(effectiveBandwidth / 1000, 1)}
          height={12}
          rx={3}
          fill={useNVLink ? colors.nvlink : colors.pcie}
        />
        <text x={30} y={250} fill={colors.textSecondary} fontSize={10}>
          Effective: {effectiveBandwidth.toFixed(0)} GB/s
        </text>

        {/* Scaling efficiency meter */}
        <rect x={220} y={220} width={150} height={12} rx={3} fill="rgba(255,255,255,0.1)" />
        <rect
          x={220}
          y={220}
          width={150 * scalingEfficiency}
          height={12}
          rx={3}
          fill={scalingEfficiency > 0.8 ? colors.success : scalingEfficiency > 0.5 ? colors.warning : colors.error}
        />
        <text x={220} y={250} fill={colors.textSecondary} fontSize={10}>
          Efficiency: {(scalingEfficiency * 100).toFixed(0)}%
        </text>

        {/* Stats */}
        <text x={30} y={280} fill={colors.textMuted} fontSize={10}>
          Speedup: {effectiveSpeedup.toFixed(2)}x with {numGPUs} GPUs
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
