'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TensorCoreRendererProps {
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
  twist_play: 'Precision Lab',
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
  accent: '#10b981',
  accentGlow: 'rgba(16, 185, 129, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  matrixA: '#8b5cf6',
  matrixB: '#3b82f6',
  matrixC: '#f59e0b',
  compute: '#22d3ee',
};

const TEST_QUESTIONS = [
  // Q1: Core Concept - Matrix Multiply-Accumulate (Easy)
  {
    scenario: "NVIDIA's H100 GPU contains 456 tensor cores, each capable of performing matrix multiply-accumulate operations. A single tensor core processes D = A x B + C in one clock cycle.",
    question: "What makes the fused multiply-accumulate (FMA) operation more efficient than separate multiply and add operations?",
    options: [
      { id: 'faster_clock', label: "Tensor cores run at a faster clock speed than CUDA cores" },
      { id: 'fused', label: "FMA reduces memory operations by combining two ops and avoiding intermediate storage", correct: true },
      { id: 'parallel', label: "FMA uses multiple GPU cores working together" },
      { id: 'cache', label: "FMA stores all results in a special high-speed cache" },
    ],
    explanation: "Fused multiply-accumulate combines multiplication and addition into a single operation, eliminating the need to write intermediate results to memory. This reduces memory bandwidth requirements and latency, which are often the bottlenecks in computation."
  },
  // Q2: Core Concept - SIMD Architecture (Easy)
  {
    scenario: "When running a large language model like GPT-4, the GPU executes billions of multiply-add operations. The architecture uses SIMD (Single Instruction, Multiple Data) to accelerate these computations.",
    question: "How does SIMD parallelism enable tensor cores to achieve such high throughput?",
    options: [
      { id: 'sequential', label: "SIMD processes one operation at a time but at very high speed" },
      { id: 'multiple', label: "One instruction triggers the same operation across many data elements simultaneously", correct: true },
      { id: 'prediction', label: "SIMD predicts future operations and pre-computes them" },
      { id: 'compression', label: "SIMD compresses data so more fits in memory" },
    ],
    explanation: "SIMD enables massive parallelism by applying a single instruction to multiple data elements at once. Instead of processing matrix elements one by one, tensor cores compute entire blocks simultaneously, dramatically increasing throughput."
  },
  // Q3: Core Concept - Systolic Arrays (Medium)
  {
    scenario: "Inside each tensor core, data flows through a systolic array - a grid of processing elements (PEs) where data ripples through like waves. Matrix A flows horizontally while Matrix B flows vertically.",
    question: "What is the key advantage of the systolic array architecture for matrix multiplication?",
    options: [
      { id: 'random', label: "PEs can access any matrix element randomly for flexibility" },
      { id: 'reuse', label: "Each input element is reused multiple times as it flows through the array, maximizing efficiency", correct: true },
      { id: 'storage', label: "Systolic arrays store the entire result matrix before outputting" },
      { id: 'simple', label: "Systolic arrays use simpler math operations than regular multiplication" },
    ],
    explanation: "Data reuse is the superpower of systolic arrays! As each element flows through the grid, it participates in multiple calculations. This minimizes memory accesses - the biggest energy and time cost in modern computing."
  },
  // Q4: Precision Modes - FP16/BF16 (Medium)
  {
    scenario: "Meta trained their LLaMA models using BF16 (bfloat16) precision instead of FP32. Despite using only 16 bits per number, the model achieved state-of-the-art performance.",
    question: "Why can AI training often succeed with half-precision formats like FP16 or BF16?",
    options: [
      { id: 'lossless', label: "BF16 can represent all the same numbers as FP32 with no loss" },
      { id: 'neural', label: "Neural networks are inherently noise-tolerant, so small precision loss doesn't hurt final accuracy", correct: true },
      { id: 'gradients', label: "Gradients during training are always very small numbers that fit in 16 bits" },
      { id: 'compress', label: "The training framework automatically compresses FP32 to BF16 when needed" },
    ],
    explanation: "Neural networks are remarkably robust to noise! The millions of parameters average out small numerical errors. BF16 keeps FP32's range (important for gradients) while sacrificing some precision. The result: 2x throughput with minimal accuracy impact."
  },
  // Q5: Precision Modes - INT8 Quantization (Medium-Hard)
  {
    scenario: "A startup deploys their chatbot using INT8 quantization. The model runs 4x faster than FP32, and users report the same quality responses.",
    question: "How does INT8 enable 4x throughput improvement over FP32?",
    options: [
      { id: 'bits', label: "INT8 uses 8 bits vs 32 bits, so 4x more operations fit in the same hardware", correct: true },
      { id: 'simpler', label: "Integer math requires fewer transistors than floating-point math" },
      { id: 'cache', label: "INT8 values fit entirely in the processor cache" },
      { id: 'skipping', label: "INT8 allows skipping zero-value multiplications" },
    ],
    explanation: "With INT8, you pack 4x more values into the same memory and compute units that would hold FP32 values. Tensor cores can process 4x more INT8 operations per cycle. For inference, where weights are fixed, quantization preserves accuracy while quadrupling speed."
  },
  // Q6: Tensor Core vs CUDA Core (Medium)
  {
    scenario: "A researcher compares matrix multiplication performance: CUDA cores achieve 19.5 TFLOPS on their RTX 4090, while tensor cores achieve 330 TFLOPS for the same operation.",
    question: "Why are tensor cores approximately 16x faster than CUDA cores for matrix multiplication?",
    options: [
      { id: 'clock', label: "Tensor cores run at 16x higher clock frequency" },
      { id: 'specialized', label: "Tensor cores are specialized circuits that compute entire 4x4 matrix blocks in one operation", correct: true },
      { id: 'memory', label: "Tensor cores have 16x more dedicated memory" },
      { id: 'voltage', label: "Tensor cores operate at higher voltage for more speed" },
    ],
    explanation: "CUDA cores are general-purpose: one multiply-add per clock. Tensor cores are specialized matrix engines that compute an entire 4x4 or larger matrix multiply in one cycle. This specialization trades flexibility for massive throughput on AI workloads."
  },
  // Q7: AI Training Benefits (Hard)
  {
    scenario: "Training GPT-4 reportedly required 25,000 A100 GPUs running for 90-100 days. Without tensor cores, this would have taken approximately 8-16x longer.",
    question: "Beyond raw compute speed, what other benefit do tensor cores provide for large-scale AI training?",
    options: [
      { id: 'accuracy', label: "Tensor cores produce more accurate gradients than regular compute" },
      { id: 'energy', label: "Specialized hardware is more energy-efficient, reducing power costs from $10M+ to manageable levels", correct: true },
      { id: 'memory', label: "Tensor cores expand the available GPU memory capacity" },
      { id: 'network', label: "Tensor cores accelerate network communication between GPUs" },
    ],
    explanation: "Energy efficiency is crucial at scale! Tensor cores deliver more FLOPS per watt than general-purpose cores. For a training run costing millions in compute, energy efficiency means the difference between viable and impossible projects."
  },
  // Q8: Throughput Calculations (Hard)
  {
    scenario: "An H100 tensor core can perform a 4x4 FP16 matrix multiply-accumulate in one cycle. At 1.5 GHz clock speed, you want to calculate the theoretical peak throughput.",
    question: "A 4x4 matrix multiply involves how many multiply-accumulate operations, and what's the theoretical ops/second for one tensor core?",
    options: [
      { id: 'wrong1', label: "16 ops (4x4 result elements); 24 billion ops/second" },
      { id: 'correct', label: "64 multiply-adds (4x4x4 for full matmul); 96 billion ops/second", correct: true },
      { id: 'wrong2', label: "32 ops (two 4x4 matrices); 48 billion ops/second" },
      { id: 'wrong3', label: "128 ops (multiply then add separately); 192 billion ops/second" },
    ],
    explanation: "Each element in the 4x4 result requires 4 multiply-adds (dot product of row and column). That's 4x4x4 = 64 multiply-add operations. At 1.5 GHz: 64 ops x 1.5 billion cycles = 96 billion ops/second per tensor core!"
  },
  // Q9: Mixed Precision Training (Hard)
  {
    scenario: "Modern AI frameworks use 'mixed precision' training: forward pass in FP16, loss calculation in FP32, and gradient scaling to prevent underflow.",
    question: "Why do we need FP32 for loss calculation even when using FP16 tensor cores for the forward pass?",
    options: [
      { id: 'habit', label: "It's a legacy requirement from older frameworks that hasn't been updated" },
      { id: 'accuracy', label: "FP16 can't represent the small gradient values accurately, causing training to fail", correct: true },
      { id: 'speed', label: "FP32 loss calculation is actually faster due to hardware optimization" },
      { id: 'memory', label: "Loss values need to be stored in main memory which only supports FP32" },
    ],
    explanation: "Gradients during backpropagation can be tiny (1e-8 or smaller). FP16 can only represent values down to ~6e-8 - smaller values become zero! Loss scaling multiplies loss by 1024+, keeping gradients in FP16's representable range, then divides after computation."
  },
  // Q10: Real-World Performance (Expert)
  {
    scenario: "A company benchmarks their transformer model: CPU takes 1000ms per inference, GPU with CUDA cores takes 50ms, and GPU with tensor cores takes 8ms using FP16.",
    question: "The tensor core speedup seems less than theoretical maximum. What typically limits real-world tensor core performance?",
    options: [
      { id: 'thermal', label: "Tensor cores overheat and throttle during sustained computation" },
      { id: 'memory', label: "Memory bandwidth - data can't be fed to tensor cores fast enough", correct: true },
      { id: 'driver', label: "GPU drivers add overhead that slows down tensor core operations" },
      { id: 'precision', label: "FP16 requires extra conversion steps that add latency" },
    ],
    explanation: "Memory bandwidth is the real bottleneck! Tensor cores can compute faster than data arrives from GPU memory. Optimizations like operator fusion, memory layout tuning, and batch size selection all aim to keep tensor cores fed with data to maximize utilization."
  },
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Large Language Models',
    description: 'ChatGPT and similar models have billions of parameters. Each inference involves massive matrix multiplications across transformer layers.',
    question: 'Why do LLMs benefit so much from tensor cores?',
    answer: 'LLMs are dominated by matrix multiplications in attention and feed-forward layers. Tensor cores accelerate these operations 10-20x over regular GPU cores, making real-time chat possible.',
  },
  {
    title: 'Image Generation',
    description: 'Stable Diffusion and DALL-E use diffusion models with repeated convolution and attention operations - all built on matrix math.',
    question: 'How do tensor cores speed up image generation?',
    answer: 'Each denoising step involves many matrix multiplications. Tensor cores with FP16/BF16 precision generate images in seconds instead of minutes.',
  },
  {
    title: 'Real-Time Ray Tracing',
    description: 'Modern games use AI denoising to make ray tracing practical. DLSS uses neural networks to upscale and denoise frames.',
    question: 'Why does DLSS require tensor cores?',
    answer: 'DLSS runs a neural network on every frame to upscale from lower resolution. Tensor cores provide the throughput to do this in under 2ms per frame at 60fps.',
  },
  {
    title: 'Scientific Computing',
    description: 'Weather simulation, protein folding, and physics models increasingly use neural networks accelerated by tensor cores.',
    question: 'How did tensor cores help solve protein folding?',
    answer: 'AlphaFold uses attention mechanisms similar to LLMs. Tensor cores enabled training on millions of protein structures and fast inference for predictions.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const TensorCoreRenderer: React.FC<TensorCoreRendererProps> = ({
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

  const [isMobile, setIsMobile] = useState(false);

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

  // Simulation state
  const [precision, setPrecision] = useState<'fp32' | 'fp16' | 'int8'>('fp16');
  const [matrixSize, setMatrixSize] = useState(4); // 4x4 default
  const [isComputing, setIsComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Matrix data for visualization
  const [matrixA] = useState(() => Array(16).fill(0).map(() => Math.random().toFixed(1)));
  const [matrixB] = useState(() => Array(16).fill(0).map(() => Math.random().toFixed(1)));

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate throughput based on precision
  const getThroughput = useCallback(() => {
    const baseOps = matrixSize * matrixSize * matrixSize * 2; // Basic matrix multiply ops
    const precisionMultiplier = precision === 'fp32' ? 1 : precision === 'fp16' ? 2 : 4;
    const tensorCoreBoost = 8; // Tensor cores are ~8x faster than CUDA cores
    return baseOps * precisionMultiplier * tensorCoreBoost;
  }, [precision, matrixSize]);

  // Animation loop
  useEffect(() => {
    if (!isComputing) return;
    const interval = setInterval(() => {
      setAnimationPhase(p => (p + 1) % 16);
      setComputeProgress(prev => {
        const speed = precision === 'int8' ? 4 : precision === 'fp16' ? 2 : 1;
        const newProgress = prev + speed;
        if (newProgress >= 100) {
          setIsComputing(false);
          return 100;
        }
        return newProgress;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isComputing, precision]);

  const predictions = [
    { id: 'serial', label: 'Matrix multiplication is done element by element, sequentially' },
    { id: 'parallel', label: 'Many multiply-add operations happen simultaneously in a grid' },
    { id: 'gpu', label: 'Regular GPU cores are used - tensor cores are just marketing' },
    { id: 'memory', label: 'Speed comes from faster memory, not specialized compute units' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Lower precision has no effect - all numbers are stored the same way' },
    { id: 'slower', label: 'Lower precision is slower because more rounding operations are needed' },
    { id: 'faster', label: 'Lower precision (FP16, INT8) enables 2-4x more operations per cycle' },
    { id: 'error', label: 'Lower precision causes too many errors to be useful' },
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
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const startCompute = () => {
    setComputeProgress(0);
    setIsComputing(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTensorCoreVisualization = () => {
    const width = 400;
    const height = 340;
    const cellSize = 20;
    const matrixOffset = 30;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <filter id="matrixGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="computeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.compute} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y={22} textAnchor="middle" fill={colors.textPrimary} fontSize={13} fontWeight="bold">
          Tensor Core: Matrix Multiply-Accumulate (D = A x B + C)
        </text>

        {/* Matrix A */}
        <g transform={`translate(${matrixOffset}, 45)`}>
          <text x={matrixSize * cellSize / 2} y={-5} textAnchor="middle" fill={colors.matrixA} fontSize={11} fontWeight="bold">Matrix A</text>
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const isActive = isComputing && animationPhase % 4 === row;
              return (
                <rect
                  key={`a-${row}-${col}`}
                  x={col * cellSize}
                  y={row * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={isActive ? colors.matrixA : 'rgba(139, 92, 246, 0.3)'}
                  stroke={colors.matrixA}
                  strokeWidth={isActive ? 2 : 1}
                  rx={2}
                />
              );
            })
          )}
        </g>

        {/* Multiplication symbol */}
        <text x={matrixOffset + matrixSize * cellSize + 15} y={45 + matrixSize * cellSize / 2} fill={colors.textPrimary} fontSize={20}>x</text>

        {/* Matrix B */}
        <g transform={`translate(${matrixOffset + matrixSize * cellSize + 35}, 45)`}>
          <text x={matrixSize * cellSize / 2} y={-5} textAnchor="middle" fill={colors.matrixB} fontSize={11} fontWeight="bold">Matrix B</text>
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const isActive = isComputing && animationPhase % 4 === col;
              return (
                <rect
                  key={`b-${row}-${col}`}
                  x={col * cellSize}
                  y={row * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={isActive ? colors.matrixB : 'rgba(59, 130, 246, 0.3)'}
                  stroke={colors.matrixB}
                  strokeWidth={isActive ? 2 : 1}
                  rx={2}
                />
              );
            })
          )}
        </g>

        {/* Plus symbol */}
        <text x={matrixOffset + 2 * matrixSize * cellSize + 55} y={45 + matrixSize * cellSize / 2} fill={colors.textPrimary} fontSize={20}>+</text>

        {/* Matrix C (accumulator) */}
        <g transform={`translate(${matrixOffset + 2 * matrixSize * cellSize + 75}, 45)`}>
          <text x={matrixSize * cellSize / 2} y={-5} textAnchor="middle" fill={colors.matrixC} fontSize={11} fontWeight="bold">Matrix C</text>
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => (
              <rect
                key={`c-${row}-${col}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                fill="rgba(245, 158, 11, 0.3)"
                stroke={colors.matrixC}
                strokeWidth={1}
                rx={2}
              />
            ))
          )}
        </g>

        {/* Arrow to result */}
        <path
          d={`M ${matrixOffset + 3 * matrixSize * cellSize + 85} ${45 + matrixSize * cellSize / 2}
              L ${matrixOffset + 3 * matrixSize * cellSize + 105} ${45 + matrixSize * cellSize / 2}`}
          stroke={colors.compute}
          strokeWidth={2}
          markerEnd="url(#resultArrow)"
        />

        {/* Result Matrix D */}
        <g transform={`translate(${matrixOffset + 3 * matrixSize * cellSize + 115}, 45)`}>
          <text x={20} y={-5} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">= D</text>
          {Array.from({ length: 2 }).map((_, row) =>
            Array.from({ length: 2 }).map((_, col) => {
              const cellProgress = (row * 2 + col) / 4 * 100;
              const isFilled = computeProgress >= cellProgress;
              return (
                <rect
                  key={`d-${row}-${col}`}
                  x={col * cellSize}
                  y={row * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={isFilled ? colors.accent : 'rgba(16, 185, 129, 0.2)'}
                  stroke={colors.accent}
                  strokeWidth={1}
                  rx={2}
                  filter={isFilled ? 'url(#matrixGlow)' : undefined}
                />
              );
            })
          )}
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="resultArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={colors.compute} />
          </marker>
        </defs>

        {/* Systolic array visualization */}
        <g transform={`translate(60, 160)`}>
          <text x={140} y={0} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>Systolic Array Data Flow</text>
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => {
              const isActive = isComputing && ((animationPhase + row + col) % 8 < 4);
              return (
                <g key={`pe-${row}-${col}`}>
                  <rect
                    x={col * 60 + 20}
                    y={row * 30 + 15}
                    width={40}
                    height={20}
                    fill={isActive ? 'url(#computeGrad)' : 'rgba(255,255,255,0.1)'}
                    stroke={isActive ? colors.compute : colors.textMuted}
                    strokeWidth={1}
                    rx={4}
                  />
                  <text x={col * 60 + 40} y={row * 30 + 28} textAnchor="middle" fill={colors.textPrimary} fontSize={8}>
                    PE
                  </text>
                </g>
              );
            })
          )}
          {/* Data flow arrows */}
          {isComputing && (
            <>
              <path d="M 0 45 L 20 45" stroke={colors.matrixA} strokeWidth={2} markerEnd="url(#flowArrowA)" opacity={0.7} />
              <path d="M 100 10 L 100 15" stroke={colors.matrixB} strokeWidth={2} markerEnd="url(#flowArrowB)" opacity={0.7} />
            </>
          )}
        </g>

        <defs>
          <marker id="flowArrowA" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill={colors.matrixA} />
          </marker>
          <marker id="flowArrowB" markerWidth="4" markerHeight="4" refX="2" refY="3" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill={colors.matrixB} />
          </marker>
        </defs>

        {/* Stats panel */}
        <rect x={30} y={285} width={340} height={50} rx={8} fill="rgba(0,0,0,0.5)" />
        <text x={50} y={303} fill={colors.textSecondary} fontSize={11}>
          Precision: {precision.toUpperCase()}
        </text>
        <text x={50} y={323} fill={colors.textSecondary} fontSize={11}>
          Throughput: {getThroughput().toLocaleString()} ops
        </text>
        <text x={230} y={303} fill={colors.accent} fontSize={11}>
          Progress: {computeProgress.toFixed(0)}%
        </text>
        <rect x={230} y={312} width={120} height={8} fill="rgba(255,255,255,0.1)" rx={4} />
        <rect x={230} y={312} width={computeProgress * 1.2} height={8} fill={colors.accent} rx={4} />
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
          Tensor Cores
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
              How Do AI Chips Do Matrix Math So Fast?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The physics of parallel matrix computation
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderTensorCoreVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                AI models like ChatGPT and Stable Diffusion are mostly matrix multiplication.
                A single GPT-4 query might involve trillions of multiply-add operations.
                How do AI chips perform this math so quickly?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer lies in specialized hardware called tensor cores.
              </p>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                NVIDIA H100 tensor cores can perform 2,000+ trillion operations per second!
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>How Do Tensor Cores Work?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What makes them so much faster than regular computation?
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderTensorCoreVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How do tensor cores accelerate matrix multiplication?
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
                    background: prediction === p.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Tensor Core Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch systolic arrays perform parallel matrix multiplication
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderTensorCoreVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Matrix Size: {matrixSize}x{matrixSize}
              </label>
              <input
                type="range"
                min="2"
                max="4"
                value={matrixSize}
                onChange={(e) => setMatrixSize(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Precision Mode
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['fp32', 'fp16', 'int8'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrecision(p)}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      padding: '10px',
                      background: precision === p ? colors.accent : 'transparent',
                      border: `1px solid ${precision === p ? colors.accent : 'rgba(255,255,255,0.2)'}`,
                      color: colors.textPrimary,
                      fontSize: '12px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={startCompute}
                disabled={isComputing}
                style={{
                  ...buttonStyle,
                  background: isComputing ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: isComputing ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isComputing ? 'Computing...' : 'Run Matrix Multiply'}
              </button>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Concepts:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                <li><strong>SIMD:</strong> Single Instruction, Multiple Data - one command, many calculations</li>
                <li><strong>Systolic Array:</strong> Data flows through a grid of processing elements</li>
                <li><strong>Fused Multiply-Add:</strong> D = A*B + C in one operation, not two</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'parallel';

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
              Tensor cores use systolic arrays - grids of processing elements that perform
              many multiply-add operations simultaneously. A 4x4 matrix multiply happens
              in one clock cycle instead of 64 sequential operations!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Tensor Cores</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Systolic Arrays:</strong> Data flows
                through a 2D grid of processing elements. Each PE performs one multiply-add, and
                data ripples through like waves.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>SIMD Parallelism:</strong> One instruction
                triggers computation across all elements simultaneously. No sequential bottleneck.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Fused Operations:</strong> D = A*B + C
                is computed in one step, reducing memory traffic and latency.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Data Reuse:</strong> Each input element
                is used multiple times as it flows through the array, maximizing efficiency.
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Precision Trade-off</h2>
            <p style={{ color: colors.textSecondary }}>
              How does number precision affect performance?
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              FP32 uses 32 bits per number. FP16 uses only 16 bits. INT8 uses just 8 bits.
              AI inference often uses FP16 or INT8 instead of full FP32 precision.
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does lower precision affect tensor core performance?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Precision vs Throughput</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare FP32, FP16, and INT8 performance
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderTensorCoreVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Select Precision
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['fp32', 'fp16', 'int8'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrecision(p);
                      setComputeProgress(0);
                    }}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      padding: '12px 8px',
                      background: precision === p ? colors.warning : 'transparent',
                      border: `1px solid ${precision === p ? colors.warning : 'rgba(255,255,255,0.2)'}`,
                      color: colors.textPrimary,
                      fontSize: '11px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div>{p.toUpperCase()}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      {p === 'fp32' ? '1x speed' : p === 'fp16' ? '2x speed' : '4x speed'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={startCompute}
                disabled={isComputing}
                style={{
                  ...buttonStyle,
                  background: isComputing ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: isComputing ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isComputing ? 'Computing...' : 'Run Computation'}
              </button>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Precision Comparison:</h4>
              <ul style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                <li>FP32: Full precision, 1x throughput (training accuracy)</li>
                <li>FP16: Half precision, 2x throughput (good for inference)</li>
                <li>INT8: Integer only, 4x throughput (quantized models)</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster';

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
              Lower precision enables dramatically higher throughput! FP16 doubles ops/second,
              INT8 quadruples it. For many AI tasks, the accuracy loss is negligible.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Precision Revolution</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Physical Reason:</strong> Smaller numbers
                take less silicon area. Two FP16 units fit where one FP32 unit would go.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Memory Bandwidth:</strong> FP16 uses half
                the memory bandwidth of FP32. This often matters more than compute speed!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Training vs Inference:</strong> Training
                needs higher precision for gradient stability. Inference can often use INT8.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Quantization:</strong> Converting FP32
                models to INT8 is a key optimization. Modern tools preserve accuracy while
                gaining 4x speedup.
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
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
    const totalQuestions = TEST_QUESTIONS.length;

    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
            <div style={{
              background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: passed ? colors.success : colors.error, marginBottom: '8px' }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / {totalQuestions}</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {passed ? 'You understand tensor core architecture!' : 'Review the concepts and try again.'}
              </p>
            </div>

            <div style={{ margin: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>Question-by-Question Review</p>
            </div>

            {TEST_QUESTIONS.map((q, i) => {
              const correctOption = q.options.find(o => o.correct);
              const correctId = correctOption?.id;
              const userAnswer = testAnswers[i];
              const userOption = q.options.find(o => o.id === userAnswer);
              const isCorrect = userAnswer === correctId;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>Q{i + 1}</span>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '12px', fontWeight: 600 }}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontStyle: 'italic' }}>{q.scenario}</p>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>{q.question}</p>
                  <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                    <p style={{ color: isCorrect ? colors.success : colors.error }}>
                      Your answer: {userOption?.label || 'No answer'}
                    </p>
                    {!isCorrect && (
                      <p style={{ color: colors.success, marginTop: '4px' }}>
                        Correct answer: {correctOption?.label}
                      </p>
                    )}
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                    <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {renderBottomBar(passed, passed ? 'Complete Mastery' : 'Review & Retry')}
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
              <span style={{ color: colors.textSecondary }}>{currentTestIndex + 1} / {totalQuestions}</span>
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
                    zIndex: 10,
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '12px',
              borderLeft: `3px solid ${colors.matrixA}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic' }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 500 }}>
                {currentQ.question}
              </p>
            </div>

            {/* Multiple Choice Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQ.options.map((option, optIdx) => {
                const isSelected = testAnswers[currentTestIndex] === option.id;
                const optionLetter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTestAnswer(option.id)}
                    style={{
                      ...buttonStyle,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      border: isSelected ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                      color: colors.textPrimary,
                      textAlign: 'left',
                      borderRadius: '10px',
                      WebkitTapHighlightColor: 'transparent',
                      zIndex: 10,
                    }}
                  >
                    <span style={{
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? colors.accent : 'rgba(255,255,255,0.1)',
                      color: isSelected ? 'white' : colors.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {optionLetter}
                    </span>
                    <span style={{ fontSize: '14px', lineHeight: 1.4 }}>{option.label}</span>
                  </button>
                );
              })}
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
                  WebkitTapHighlightColor: 'transparent',
                  zIndex: 10,
                }}
              >
                Previous
              </button>
              {currentTestIndex < totalQuestions - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  style={{
                    ...buttonStyle,
                    background: colors.accent,
                    color: 'white',
                    WebkitTapHighlightColor: 'transparent',
                    zIndex: 10,
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
                    WebkitTapHighlightColor: 'transparent',
                    zIndex: 10,
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
              You understand tensor cores and AI chip architecture
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
              <li>Tensor cores perform D = A*B + C matrix operations in parallel</li>
              <li>Systolic arrays flow data through grids of processing elements</li>
              <li>SIMD enables many calculations with one instruction</li>
              <li>Lower precision (FP16, INT8) enables 2-4x more throughput</li>
              <li>Fused multiply-add reduces memory operations</li>
              <li>AI workloads are dominated by matrix multiplication</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Next-generation tensor cores support even lower precision like FP8 and sparsity
              acceleration. NVIDIA's Hopper architecture achieves 1000+ TFLOPS of FP8 performance.
              The race for AI compute is driving chip architecture innovation at unprecedented rates!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderTensorCoreVisualization()}
          </div>
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TensorCoreRenderer;
