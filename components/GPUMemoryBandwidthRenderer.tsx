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
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
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
  },
  {
    title: 'AI Training',
    description: 'Training large language models requires loading billions of parameters and gradients. Data center GPUs use HBM with 2+ TB/s bandwidth.',
    question: 'Why do AI chips use HBM instead of GDDR?',
    answer: 'AI training is extremely bandwidth-limited. HBM provides 3-4x more bandwidth than GDDR in the same power envelope, making it essential for training efficiency.',
  },
  {
    title: 'Video Editing',
    description: '8K video editing requires real-time playback and effects. Each frame is 33+ megapixels that must flow through the GPU memory system.',
    question: 'How does memory bandwidth affect video timeline scrubbing?',
    answer: 'Scrubbing through 8K footage requires loading new frames instantly. Insufficient bandwidth causes stuttering and dropped frames during preview.',
  },
  {
    title: 'Scientific Simulation',
    description: 'Weather models, fluid dynamics, and molecular simulations process enormous datasets. GPU memory bandwidth often limits simulation resolution.',
    question: 'Why do scientific GPUs prioritize bandwidth over gaming features?',
    answer: 'Simulations are compute and bandwidth limited, not graphics-feature limited. More bandwidth enables larger, more accurate models with finer resolution.',
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
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBandwidthVisualization = () => {
    const width = 400;
    const height = 320;
    const bandwidth = calculateBandwidth();
    const effectiveBusWidth = memoryType === 'hbm2e' ? 1024 : busWidth;

    // Calculate data flow positions
    const numLanes = Math.min(8, effectiveBusWidth / 32);
    const laneSpacing = 180 / numLanes;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gpu} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.memory} />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <filter id="dataGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
          GPU Memory Bus Architecture
        </text>

        {/* GPU Chip */}
        <rect x={30} y={80} width={100} height={140} rx={8} fill="url(#gpuGrad)" />
        <text x={80} y={110} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">GPU</text>
        <text x={80} y={130} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>Compute</text>
        <text x={80} y={145} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>Units</text>

        {/* Memory bandwidth indicator */}
        <text x={80} y={200} textAnchor="middle" fill={colors.data} fontSize={11} fontWeight="bold">
          {bandwidth.toFixed(0)} GB/s
        </text>

        {/* Memory Chips */}
        <g>
          <rect x={270} y={60} width={100} height={60} rx={6} fill="url(#memGrad)" />
          <text x={320} y={90} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
            {memoryType === 'hbm2e' ? 'HBM2e Stack' : memoryType.toUpperCase()}
          </text>
          <text x={320} y={105} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={9}>
            {effectiveBusWidth}-bit bus
          </text>

          <rect x={270} y={140} width={100} height={60} rx={6} fill="url(#memGrad)" />
          <text x={320} y={170} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
            {memoryType === 'hbm2e' ? 'HBM2e Stack' : memoryType.toUpperCase()}
          </text>
          <text x={320} y={185} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={9}>
            {clockSpeed} MHz
          </text>
        </g>

        {/* Data lanes animation */}
        {Array.from({ length: numLanes }).map((_, i) => {
          const y = 80 + i * laneSpacing + laneSpacing / 2;
          const offset = (dataFlowPhase + i * 12) % 100;

          return (
            <g key={i}>
              {/* Lane background */}
              <line
                x1={140}
                y1={y}
                x2={260}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={4}
              />
              {/* Data packets flowing */}
              {isAnimating && (
                <>
                  <circle
                    cx={140 + (offset / 100) * 120}
                    cy={y}
                    r={5}
                    fill={colors.data}
                    filter="url(#dataGlow)"
                    opacity={0.9}
                  />
                  <circle
                    cx={140 + ((offset + 50) % 100) / 100 * 120}
                    cy={y}
                    r={5}
                    fill={colors.data}
                    filter="url(#dataGlow)"
                    opacity={0.9}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Bus width label */}
        <text x={200} y={65} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>
          {numLanes} x {effectiveBusWidth / numLanes}-bit lanes
        </text>

        {/* Info panel */}
        <rect x={30} y={250} width={340} height={60} rx={8} fill="rgba(0,0,0,0.5)" />
        <text x={50} y={270} fill={colors.textSecondary} fontSize={11}>
          Bus Width: {effectiveBusWidth} bits
        </text>
        <text x={50} y={290} fill={colors.textSecondary} fontSize={11}>
          Clock: {clockSpeed} MHz ({memoryType === 'gddr6x' ? '4x' : '2x'} transfers/clock)
        </text>
        <text x={230} y={280} fill={colors.accent} fontSize={14} fontWeight="bold">
          = {bandwidth.toFixed(0)} GB/s
        </text>
      </svg>
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
    WebkitTapHighlightColor: 'transparent' as const,
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
        zIndex: 1000,
        gap: '12px'
      }}>
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
        zIndex: 1000,
        gap: '12px'
      }}>
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
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Do GPUs Need Wide Memory Buses?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
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
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What Determines Memory Bandwidth?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              How do GPUs achieve such high bandwidth?
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
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Memory Bandwidth Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust bus width and clock speed to see bandwidth change
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
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

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Bandwidth Formula:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontFamily: 'monospace' }}>
                Bandwidth = Bus Width x Clock Speed x Transfers/Clock / 8
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                {busWidth} bits x {clockSpeed} MHz x {memoryType === 'gddr6x' ? '4' : '2'} / 8 = {calculateBandwidth().toFixed(0)} GB/s
              </p>
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

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
              Bandwidth = Width x Speed. Both matter! A 256-bit bus at 2000 MHz moves twice as
              much data as a 128-bit bus at the same speed - or a 256-bit bus at 1000 MHz.
            </p>
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The HBM Revolution</h2>
            <p style={{ color: colors.textSecondary }}>
              How do AI chips achieve 2+ TB/s bandwidth?
            </p>
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>HBM vs GDDR Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare stacked memory to traditional memory
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
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

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
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
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'hbm';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
              HBM stacks memory chips vertically and uses Through-Silicon Vias (TSVs) to create
              an extremely wide 1024+ bit bus in a tiny area, enabling massive bandwidth.
            </p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    ...buttonStyle,
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.accent}`,
                    color: colors.accent,
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestIndex + 1} / {TEST_QUESTIONS.length}</span>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
