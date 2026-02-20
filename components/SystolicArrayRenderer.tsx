'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Systolic Arrays - Complete 10-Phase Game
// How AI accelerators like TPUs perform massively parallel matrix multiplication
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

interface SystolicArrayRendererProps {
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
    scenario: "A machine learning engineer is training a large language model. The training involves billions of matrix multiplications per second. Traditional CPUs can only process one operation at a time per core.",
    question: "Why do systolic arrays dramatically accelerate this workload?",
    options: [
      { id: 'a', label: "They use faster memory chips that store more data" },
      { id: 'b', label: "They process many multiply-accumulate operations simultaneously in a regular grid pattern", correct: true },
      { id: 'c', label: "They compress the neural network to require fewer calculations" },
      { id: 'd', label: "They skip unnecessary matrix elements to save time" }
    ],
    explanation: "Systolic arrays contain hundreds or thousands of processing elements (PEs) arranged in a grid. Each PE performs multiply-accumulate operations simultaneously, enabling massive parallelism. Data flows through the array like a heartbeat (systole), maximizing throughput for matrix operations."
  },
  {
    scenario: "Google's TPU v4 contains systolic arrays where data flows in two directions: matrix A elements flow right, matrix B elements flow down. Each cell multiplies and accumulates values.",
    question: "What is the key advantage of this bidirectional data flow pattern?",
    options: [
      { id: 'a', label: "It allows the chip to cool more efficiently" },
      { id: 'b', label: "Each data element is reused multiple times, reducing memory bandwidth requirements", correct: true },
      { id: 'c', label: "It prevents electrical interference between adjacent cells" },
      { id: 'd', label: "It enables the array to perform division operations" }
    ],
    explanation: "In a systolic array, each input element is read once from memory but used by multiple PEs as it flows through the grid. For an NxN array computing C=A*B, each element of A and B is reused N times, reducing memory bandwidth by a factor of N compared to naive implementations."
  },
  {
    scenario: "An AI chip designer is comparing a 256x256 systolic array versus 65,536 independent multipliers. Both have the same number of multiply units.",
    question: "Why might the systolic array architecture be preferred?",
    options: [
      { id: 'a', label: "Systolic arrays can perform floating-point math while independent multipliers cannot" },
      { id: 'b', label: "The regular structure of systolic arrays simplifies control logic and enables efficient data reuse", correct: true },
      { id: 'c', label: "Independent multipliers would require quantum effects to synchronize" },
      { id: 'd', label: "Systolic arrays use less silicon area per multiplier" }
    ],
    explanation: "Systolic arrays have simple, regular control flow - each PE does the same thing at each clock cycle. Data movement is predictable and local (only between neighbors). This regularity reduces control overhead and wiring complexity while maximizing data reuse, unlike random access patterns."
  },
  {
    scenario: "During matrix multiplication in a systolic array, the result C[i,j] is computed by accumulating products over multiple clock cycles. The partial sum stays in one PE while input data flows through.",
    question: "What does 'systolic' refer to in systolic arrays?",
    options: [
      { id: 'a', label: "The array systematically checks for errors in calculations" },
      { id: 'b', label: "Data pulses through the array rhythmically like blood through a heart", correct: true },
      { id: 'c', label: "The system automatically scales to different problem sizes" },
      { id: 'd', label: "Processing elements are arranged in a circular pattern" }
    ],
    explanation: "The term 'systolic' comes from the heart's systole (contraction phase). Just as the heart rhythmically pumps blood, systolic arrays pump data through processing elements in regular, synchronized waves. This creates a predictable, efficient flow that maximizes hardware utilization."
  },
  {
    scenario: "A neural network layer performs Y = W * X + b, where W is a 1024x1024 weight matrix, X is 1024 inputs, and b is a bias vector. A TPU's 128x128 systolic array processes this operation.",
    question: "How does the TPU handle matrices larger than its systolic array?",
    options: [
      { id: 'a', label: "It downsamples the matrices to fit the array size" },
      { id: 'b', label: "It tiles the computation, processing 128x128 blocks sequentially and combining results", correct: true },
      { id: 'c', label: "It uses compression to reduce the effective matrix size" },
      { id: 'd', label: "Larger matrices cannot be processed and cause errors" }
    ],
    explanation: "Systolic arrays handle large matrices through tiling - breaking them into blocks that fit the array size. The 1024x1024 matrix is divided into 8x8 = 64 tiles of 128x128. The array processes each tile, accumulating partial results. This is analogous to doing long multiplication digit by digit."
  },
  {
    scenario: "An ML researcher notices that their model runs 10x faster on TPU for matrix multiplication but shows no improvement for element-wise operations like ReLU activation.",
    question: "Why don't systolic arrays accelerate element-wise operations?",
    options: [
      { id: 'a', label: "Element-wise operations require double-precision which systolic arrays don't support" },
      { id: 'b', label: "Systolic arrays are optimized for multiply-accumulate patterns, not independent parallel operations", correct: true },
      { id: 'c', label: "ReLU activation uses too much memory bandwidth" },
      { id: 'd', label: "The TPU driver software doesn't support activation functions" }
    ],
    explanation: "Systolic arrays excel at operations with data reuse patterns, like matrix multiplication. Element-wise operations (applying the same function to each element independently) don't benefit from the systolic data flow - there's no reuse advantage. GPUs with their simpler SIMD model often handle these better."
  },
  {
    scenario: "A TPU pod contains thousands of chips, each with multiple systolic arrays. Training a large language model requires synchronizing weight updates across all arrays.",
    question: "What challenge does this distributed training introduce for systolic arrays?",
    options: [
      { id: 'a', label: "Individual arrays might compute different results for the same input" },
      { id: 'b', label: "Communication overhead between chips can bottleneck the highly parallel computation", correct: true },
      { id: 'c', label: "Systolic arrays cannot share partial results with other chips" },
      { id: 'd', label: "Each chip's systolic array must be exactly the same size" }
    ],
    explanation: "Systolic arrays can compute extremely fast, but distributed training requires synchronizing gradients across chips. The interconnect bandwidth and latency become bottlenecks - arrays might finish computing before data arrives from other chips. Efficient all-reduce algorithms and high-bandwidth interconnects are essential."
  },
  {
    scenario: "Intel's AMX (Advanced Matrix Extensions) adds systolic array-like capabilities to x86 CPUs. Each core has small tile registers that can perform matrix operations.",
    question: "How does adding systolic capabilities to CPUs differ from dedicated TPU hardware?",
    options: [
      { id: 'a', label: "CPU systolic units are fundamentally incompatible with GPU architectures" },
      { id: 'b', label: "CPU tiles are smaller but more flexible, allowing mixed workloads on the same processor", correct: true },
      { id: 'c', label: "CPU systolic arrays only work with integer data types" },
      { id: 'd', label: "There is no meaningful difference in capability" }
    ],
    explanation: "CPU systolic units like AMX are smaller (8x8 or 16x16) but integrate with general-purpose cores. This enables efficient inference on the same chip running application code, without data transfer to a separate accelerator. TPUs have much larger arrays (128x128+) optimized purely for throughput."
  },
  {
    scenario: "A deep learning framework compiles a transformer model to TPU. The compiler must map attention computations (Q*K^T and attention*V) onto systolic arrays.",
    question: "What software optimization is crucial for systolic array efficiency?",
    options: [
      { id: 'a', label: "Using smaller batch sizes to fit in the array" },
      { id: 'b', label: "Rearranging computation order and data layout to maximize array utilization and minimize memory stalls", correct: true },
      { id: 'c', label: "Converting all operations to use only addition" },
      { id: 'd', label: "Running the model at lower numerical precision to speed up computation" }
    ],
    explanation: "Compilers like XLA optimize tensor operations for systolic arrays by fusing operations, choosing optimal tile sizes, scheduling data movement to hide latency, and transposing matrices for efficient access patterns. Poor mapping can leave PEs idle, wasting the array's potential."
  },
  {
    scenario: "A startup is designing an AI accelerator and must choose between a larger systolic array (512x512) with lower clock speed or a smaller array (128x128) at higher clock speed, with equal total compute capacity.",
    question: "What tradeoff favors the larger, slower systolic array?",
    options: [
      { id: 'a', label: "Larger arrays generate less heat per operation" },
      { id: 'b', label: "Larger arrays have better data reuse, reducing memory bandwidth requirements", correct: true },
      { id: 'c', label: "Larger arrays can process more data types simultaneously" },
      { id: 'd', label: "Larger arrays have simpler control logic" }
    ],
    explanation: "A 512x512 array reuses each input element 512 times versus 128 times for the smaller array. This 4x improvement in data reuse means 4x lower memory bandwidth requirements. Since memory bandwidth is often the bottleneck, larger arrays can achieve higher effective throughput despite slower clock speeds."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Large Language Models',
    short: 'Powering ChatGPT-scale AI',
    tagline: 'Trillions of matrix operations per response',
    description: 'Large language models like GPT-4 and Gemini contain hundreds of billions of parameters organized as weight matrices. Each token generation requires multiplying inputs through dozens of transformer layers, each with attention and feed-forward matrix operations.',
    connection: 'Every attention head computes Q*K^T (query-key similarity) and attention*V (value aggregation) - both massive matrix multiplications. Systolic arrays in TPUs process these operations with extreme efficiency, enabling models with trillions of parameters.',
    howItWorks: 'During inference, the systolic array streams token embeddings through weight matrices. The regular data flow perfectly matches the repetitive structure of transformer layers, allowing continuous pipeline execution without stalls.',
    stats: [
      { value: '175B+', label: 'Parameters in GPT-3', icon: '🧮' },
      { value: '100x', label: 'Faster than CPU', icon: '⚡' },
      { value: '10ms', label: 'Latency per token', icon: '⏱️' }
    ],
    examples: ['ChatGPT inference', 'Gemini training', 'Claude processing', 'Stable Diffusion'],
    companies: ['Google', 'OpenAI', 'Anthropic', 'Meta'],
    futureImpact: 'Systolic arrays will scale to support 10-trillion parameter models, enabling AI systems with unprecedented reasoning capabilities.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Autonomous Vehicles',
    short: 'Real-time perception and planning',
    tagline: 'Processing camera feeds at highway speeds',
    description: 'Self-driving cars run multiple neural networks simultaneously: object detection, lane finding, depth estimation, and path planning. Each frame from 8+ cameras must be processed in under 100ms for safe operation at highway speeds.',
    connection: 'Convolutional neural networks for image processing are fundamentally matrix operations - each conv layer is a structured matrix multiplication. Systolic arrays in automotive chips process all camera feeds in parallel with deterministic timing.',
    howItWorks: 'Edge TPUs and custom automotive chips contain systolic arrays optimized for CNNs. The arrays process convolution as matrix multiplication (im2col transformation), enabling real-time inference on multiple high-resolution video streams.',
    stats: [
      { value: '8+', label: 'Camera feeds', icon: '📷' },
      { value: '30fps', label: 'Processing rate', icon: '🎬' },
      { value: '100ms', label: 'Max latency', icon: '⏱️' }
    ],
    examples: ['Tesla FSD computer', 'Waymo TPUs', 'Mobileye EyeQ', 'NVIDIA Drive'],
    companies: ['Tesla', 'Waymo', 'Cruise', 'Mobileye'],
    futureImpact: 'Automotive systolic arrays will enable Level 5 autonomy by processing sensor fusion and complex planning in milliseconds.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Scientific Computing',
    short: 'Accelerating research discoveries',
    tagline: 'From protein folding to climate modeling',
    description: 'Scientific simulations often reduce to massive linear algebra operations. Protein structure prediction, molecular dynamics, weather forecasting, and quantum chemistry all require solving huge matrix equations.',
    connection: 'AlphaFold uses systolic arrays to compute attention over amino acid sequences and predict 3D protein structures. The matrix operations in attention mechanisms map perfectly to the systolic data flow pattern.',
    howItWorks: 'TPU pods provide petaflops of matrix multiplication performance for scientific workloads. Researchers express computations as tensor operations, and the compiler maps them to systolic arrays automatically.',
    stats: [
      { value: '200M', label: 'Proteins predicted', icon: '🧬' },
      { value: '1000x', label: 'Faster than CPU', icon: '🚀' },
      { value: '4.2PF', label: 'TPU v4 pod peak', icon: '💪' }
    ],
    examples: ['AlphaFold protein prediction', 'Climate modeling', 'Drug discovery', 'Genomics'],
    companies: ['DeepMind', 'D.E. Shaw', 'NOAA', 'Recursion'],
    futureImpact: 'Systolic arrays will accelerate scientific breakthroughs, from designing new materials to modeling entire ecosystems.',
    color: '#3B82F6'
  },
  {
    icon: '☁️',
    title: 'Cloud AI Services',
    short: 'Inference at hyperscale',
    tagline: 'Billions of AI requests per day',
    description: 'Cloud providers serve billions of AI inference requests daily - image classification, speech recognition, recommendation systems, and search ranking. Each request must complete in milliseconds at minimal cost.',
    connection: 'Systolic arrays enable cost-effective AI inference by maximizing throughput per watt. The predictable data flow allows precise resource allocation, serving more requests per chip than GPUs for many workloads.',
    howItWorks: 'Custom inference chips like Google TPU and AWS Inferentia use systolic arrays optimized for low-latency serving. Batch requests are processed together to maximize array utilization while meeting latency SLOs.',
    stats: [
      { value: '1M+', label: 'Queries per second', icon: '📊' },
      { value: '5ms', label: 'P99 latency', icon: '⚡' },
      { value: '10x', label: 'Better perf/watt', icon: '🔋' }
    ],
    examples: ['Google Search ranking', 'YouTube recommendations', 'Gmail Smart Compose', 'Photos search'],
    companies: ['Google Cloud', 'AWS', 'Microsoft Azure', 'Alibaba Cloud'],
    futureImpact: 'Specialized systolic inference chips will make AI ubiquitous in every cloud application, from email to enterprise software.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SystolicArrayRenderer: React.FC<SystolicArrayRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [cycle, setCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [arraySize, setArraySize] = useState(4); // 4x4 grid
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [highlightCell, setHighlightCell] = useState<{row: number, col: number} | null>(null);

  // Matrices for visualization (4x4)
  const matrixA = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16]
  ];

  const matrixB = [
    [1, 5, 9, 13],
    [2, 6, 10, 14],
    [3, 7, 11, 15],
    [4, 8, 12, 16]
  ];

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

  // Animation loop for systolic simulation
  useEffect(() => {
    if (isPlaying && (phase === 'play' || phase === 'twist_play')) {
      const maxCycles = arraySize * 3 - 2; // Total cycles for complete computation
      const interval = setInterval(() => {
        setCycle(c => {
          if (c >= maxCycles) {
            setIsPlaying(false);
            return maxCycles;
          }
          return c + 1;
        });
      }, 1000 / playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, playbackSpeed, arraySize, phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for tech/computing theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#C8CDD8',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    dataA: '#F472B6', // Pink for matrix A data
    dataB: '#60A5FA', // Blue for matrix B data
    result: '#34D399', // Green for result
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
    twist_play: 'Twist Play',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate PE state at a given cycle
  const getPEState = useCallback((row: number, col: number, currentCycle: number) => {
    // Data arrives at PE[row][col] after (row + col) cycles
    const arrivalCycle = row + col;

    if (currentCycle < arrivalCycle) {
      return { active: false, aVal: null, bVal: null, accumulator: 0, computing: false };
    }

    // Calculate which iteration of data is being processed
    const iterationsCompleted = Math.min(currentCycle - arrivalCycle, arraySize);
    const currentIteration = currentCycle - arrivalCycle;

    // Get current A and B values flowing through
    const aIdx = currentIteration < arraySize ? currentIteration : null;
    const bIdx = currentIteration < arraySize ? currentIteration : null;

    const aVal = aIdx !== null && aIdx < arraySize ? matrixA[row][aIdx] : null;
    const bVal = bIdx !== null && bIdx < arraySize ? matrixB[bIdx][col] : null;

    // Calculate accumulated value
    let accumulator = 0;
    for (let k = 0; k < iterationsCompleted; k++) {
      accumulator += matrixA[row][k] * matrixB[k][col];
    }

    const computing = aVal !== null && bVal !== null && currentIteration < arraySize;

    return { active: true, aVal, bVal, accumulator, computing };
  }, [arraySize]);

  // Calculate expected result for C[row][col]
  const getExpectedResult = (row: number, col: number) => {
    let result = 0;
    for (let k = 0; k < arraySize; k++) {
      result += matrixA[row][k] * matrixB[k][col];
    }
    return result;
  };

  // Systolic Array Visualization Component
  const SystolicArrayVisualization = ({ interactive = false, showAccumulators = true }) => {
    const cellSize = isMobile ? 50 : 65;
    const gap = isMobile ? 6 : 8;
    const padding = isMobile ? 35 : 48;
    const rawWidth = arraySize * (cellSize + gap) + padding * 2 + 80;
    const rawHeight = arraySize * (cellSize + gap) + padding * 2 + 80;
    const width = Math.min(rawWidth, 560);
    const height = Math.min(rawHeight, 480);

    // Array size indicator position: maps arraySize 2..4 to x range
    const sizeIndicatorX = padding + 40 + ((arraySize - 2) / 2) * (arraySize * (cellSize + gap));
    const sizeIndicatorY = height - 20;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
          {arraySize}x{arraySize} Systolic Array - Cycle {cycle}
        </text>

        {/* Array size indicator - moves with slider */}
        <circle
          cx={sizeIndicatorX}
          cy={sizeIndicatorY}
          r="8"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#glow)"
          opacity="0.9"
        />

        {/* Y-axis label */}
        <text
          x={padding - 50}
          y={(height / 2)}
          fill={colors.textSecondary}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          transform={`rotate(-90, ${padding - 50}, ${height / 2})`}
        >
          Row Position (Y-axis)
        </text>

        {/* X-axis label */}
        <text
          x={(padding + 40 + (arraySize * (cellSize + gap)) / 2)}
          y={height - 30}
          fill={colors.textSecondary}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          Column Position (X-axis)
        </text>

        {/* Grid lines - vertical */}
        {Array.from({ length: arraySize + 1 }).map((_, i) => {
          const x = padding + 40 + i * (cellSize + gap) - gap / 2;
          const y1 = padding + 50 - gap / 2;
          const y2 = padding + 50 + arraySize * (cellSize + gap) - gap / 2;
          return (
            <line
              key={`grid-v-${i}`}
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke={`${colors.border}44`}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Grid lines - horizontal */}
        {Array.from({ length: arraySize + 1 }).map((_, i) => {
          const y = padding + 50 + i * (cellSize + gap) - gap / 2;
          const x1 = padding + 40 - gap / 2;
          const x2 = padding + 40 + arraySize * (cellSize + gap) - gap / 2;
          return (
            <line
              key={`grid-h-${i}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={`${colors.border}44`}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Matrix A labels (left side, flowing right) */}
        <text x={padding - 25} y={padding + 30} fill={colors.dataA} fontSize="12" fontWeight="600" textAnchor="end">
          Matrix A
        </text>
        {Array.from({ length: arraySize }).map((_, row) => {
          const y = padding + 40 + row * (cellSize + gap) + cellSize / 2;
          const dataIdx = cycle - row;
          const showData = dataIdx >= 0 && dataIdx < arraySize;
          return (
            <g key={`a-label-${row}`}>
              {showData && showDataFlow && (
                <g>
                  <rect
                    x={padding - 35}
                    y={y - 12}
                    width={28}
                    height={24}
                    rx={4}
                    fill={colors.dataA}
                    opacity={0.9}
                  />
                  <text x={padding - 21} y={y + 5} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
                    {matrixA[row][dataIdx]}
                  </text>
                  {/* Arrow */}
                  <path d={`M${padding - 5} ${y} l-8 -5 v10 z`} fill={colors.dataA} opacity={0.7} />
                  {/* Highlight glow for current value */}
                  <circle
                    cx={padding - 21}
                    cy={y}
                    r={16}
                    fill="none"
                    stroke={colors.dataA}
                    strokeWidth="2"
                    opacity="0.5"
                    filter="url(#glow)"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Matrix B labels (top side, flowing down) */}
        <text x={padding + 40 + (arraySize * (cellSize + gap)) / 2} y={padding + 15} fill={colors.dataB} fontSize="12" fontWeight="600" textAnchor="middle">
          Matrix B
        </text>
        {Array.from({ length: arraySize }).map((_, col) => {
          const x = padding + 40 + col * (cellSize + gap) + cellSize / 2;
          const dataIdx = cycle - col;
          const showData = dataIdx >= 0 && dataIdx < arraySize;
          return (
            <g key={`b-label-${col}`}>
              {showData && showDataFlow && (
                <g>
                  <rect
                    x={x - 14}
                    y={padding + 20}
                    width={28}
                    height={24}
                    rx={4}
                    fill={colors.dataB}
                    opacity={0.9}
                  />
                  <text x={x} y={padding + 37} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
                    {matrixB[dataIdx][col]}
                  </text>
                  {/* Arrow */}
                  <path d={`M${x} ${padding + 46} l-5 -8 h10 z`} fill={colors.dataB} opacity={0.7} />
                  {/* Highlight glow for current value */}
                  <circle
                    cx={x}
                    cy={padding + 32}
                    r={16}
                    fill="none"
                    stroke={colors.dataB}
                    strokeWidth="2"
                    opacity="0.5"
                    filter="url(#glow)"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Processing Elements Grid */}
        {Array.from({ length: arraySize }).map((_, row) =>
          Array.from({ length: arraySize }).map((_, col) => {
            const x = padding + 40 + col * (cellSize + gap);
            const y = padding + 50 + row * (cellSize + gap);
            const state = getPEState(row, col, cycle);
            const isHighlighted = highlightCell?.row === row && highlightCell?.col === col;
            const expected = getExpectedResult(row, col);
            const isComplete = state.accumulator === expected && cycle >= arraySize + row + col - 1;

            return (
              <g
                key={`pe-${row}-${col}`}
                onClick={() => interactive && setHighlightCell({ row, col })}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                {/* PE cell background */}
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={8}
                  fill={isComplete ? `${colors.success}22` : state.computing ? `${colors.accent}22` : colors.bgSecondary}
                  stroke={isHighlighted ? colors.accent : isComplete ? colors.success : state.active ? colors.border : `${colors.border}66`}
                  strokeWidth={isHighlighted ? 3 : 2}
                />

                {/* Computing indicator */}
                {state.computing && (
                  <circle
                    cx={x + cellSize - 10}
                    cy={y + 10}
                    r={4}
                    fill={colors.accent}
                    style={{ animation: 'pulse 0.5s infinite' }}
                  />
                )}

                {/* Accumulator value */}
                {showAccumulators && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 5}
                    fill={isComplete ? colors.success : state.active ? colors.textPrimary : colors.textMuted}
                    fontSize={isMobile ? '14' : '18'}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {state.accumulator}
                  </text>
                )}

                {/* Current operation (small text) */}
                {state.computing && state.aVal !== null && state.bVal !== null && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize - 8}
                    fill={colors.textSecondary}
                    fontSize="11"
                    textAnchor="middle"
                  >
                    +{state.aVal}*{state.bVal}
                  </text>
                )}

                {/* Cell index */}
                <text
                  x={x + 8}
                  y={y + 14}
                  fill={colors.textMuted}
                  fontSize="11"
                >
                  [{row},{col}]
                </text>
              </g>
            );
          })
        )}

        {/* Legend */}
        <g transform={`translate(${width - 100}, ${height - 60})`}>
          <rect x="0" y="0" width="12" height="12" rx="2" fill={`${colors.accent}22`} stroke={colors.accent} />
          <text x="18" y="10" fill={colors.textSecondary} fontSize="11">Computing</text>
          <rect x="0" y="18" width="12" height="12" rx="2" fill={`${colors.success}22`} stroke={colors.success} />
          <text x="18" y="28" fill={colors.textSecondary} fontSize="11">Complete</text>
        </g>

        {/* Filter definitions for glow effect and gradients */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
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
      alignItems: 'center',
      gap: '8px',
      padding: '4px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '32px' : '12px',
            minHeight: '44px',
            height: '44px',
            borderRadius: '22px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            position: 'absolute',
            width: phase === p ? '32px' : '12px',
            height: '8px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            pointerEvents: 'none',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom navigation bar with Back, dots, and Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isTestPhase = phase === 'test';
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgPrimary,
        borderTop: `1px solid ${colors.border}`,
        padding: '8px 16px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '64px',
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirst}
          aria-label="Back"
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: isFirst ? 'transparent' : colors.bgSecondary,
            color: isFirst ? colors.textMuted : colors.textSecondary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            minHeight: '44px',
            opacity: isFirst ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        {renderNavDots()}

        <button
          onClick={nextPhase}
          disabled={isTestPhase}
          aria-label="Next"
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: isTestPhase ? colors.border : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
            color: isTestPhase ? colors.textMuted : 'white',
            cursor: isTestPhase ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            minHeight: '44px',
            opacity: isTestPhase ? 0.4 : 1,
          }}
        >
          Next →
        </button>
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
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🧮💓
          </div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
            Welcome to Systolic Arrays
          </h1>

          <p className="text-muted" style={{
            ...typo.small,
            color: colors.textMuted,
            maxWidth: '500px',
            marginBottom: '16px',
          }}>
            Discover how AI accelerators work — explore the heartbeat that powers modern TPUs.
          </p>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            How does a TPU perform trillions of calculations per second? The secret is a <span style={{ color: colors.accent }}>heartbeat</span> that pumps data through a grid of processors.
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
              "Systolic arrays are the beating heart of modern AI accelerators—regular, rhythmic, and remarkably efficient at matrix multiplication."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Computer Architecture Principle
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Begin Exploration →
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Each processor fetches its own data independently from memory, maximizing parallelism' },
      { id: 'b', text: 'Data flows through neighboring processors in waves, so each value is reused multiple times' },
      { id: 'c', text: 'A central controller distributes all data simultaneously to every processor' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '16px',
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
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              To multiply two 4x4 matrices, we need 64 multiply-add operations. How does a systolic array organize data movement?
            </h2>

            {/* Static preview SVG */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <svg width="300" height="300" viewBox="0 0 300 300" style={{ background: colors.bgCard }}>
                <text x="150" y="25" fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
                  4×4 Systolic Array Preview
                </text>

                {/* Static 4x4 grid */}
                {Array.from({ length: 4 }).map((_, row) =>
                  Array.from({ length: 4 }).map((_, col) => {
                    const x = 40 + col * 55;
                    const y = 60 + row * 55;
                    return (
                      <g key={`cell-${row}-${col}`}>
                        <rect
                          x={x}
                          y={y}
                          width={45}
                          height={45}
                          rx={6}
                          fill={colors.bgSecondary}
                          stroke={colors.border}
                          strokeWidth="2"
                        />
                        <text
                          x={x + 22.5}
                          y={y + 28}
                          fill={colors.textMuted}
                          fontSize="11"
                          textAnchor="middle"
                        >
                          [{row},{col}]
                        </text>
                      </g>
                    );
                  })
                )}

                {/* Y-axis label */}
                <text x="12" y="160" fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle" transform="rotate(-90, 12, 160)">
                  Y-axis
                </text>

                {/* X-axis label */}
                <text x="150" y="290" fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">
                  X-axis
                </text>

                {/* Arrows showing data flow concept */}
                <text x="10" y="140" fill={colors.dataA} fontSize="11" fontWeight="600">→</text>
                <text x="150" y="45" fill={colors.dataB} fontSize="11" fontWeight="600">↓</text>
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
                Next: Explore Interactive Simulation
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Systolic Array
  if (phase === 'play') {
    const maxCycles = arraySize * 3 - 2;
    const activePEs = Array.from({ length: arraySize }).flatMap((_, row) =>
      Array.from({ length: arraySize }).map((_, col) => {
        const state = getPEState(row, col, cycle);
        return { row, col, state, active: state.active };
      })
    ).filter(pe => pe.active);
    const totalComputing = activePEs.filter(pe => pe.state.computing).length;
    const totalComplete = activePEs.filter(pe => {
      const expected = getExpectedResult(pe.row, pe.col);
      return pe.state.accumulator === expected && cycle >= arraySize + pe.row + pe.col - 1;
    }).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Watch Data Flow Through the Array
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Matrix A flows right, Matrix B flows down. Each cell multiplies and accumulates.
            </p>

            {/* Formula display */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0, fontWeight: 600 }}>
                C[i,j] = Σ(A[i,k] × B[k,j]) for k=0 to {arraySize - 1}
              </p>
            </div>

            {/* Real-time stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{cycle}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current Cycle</div>
              </div>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{totalComputing}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Computing Now</div>
              </div>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{totalComplete}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Completed</div>
              </div>
            </div>

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
                  display: 'flex',
                  justifyContent: 'center',
                  overflowX: 'auto',
                }}>
                  <SystolicArrayVisualization interactive={true} showAccumulators={true} />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

          {/* Playback controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setCycle(0)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.bgSecondary,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              onClick={() => setCycle(c => Math.max(0, c - 1))}
              disabled={cycle === 0}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.bgSecondary,
                color: cycle === 0 ? colors.textMuted : colors.textSecondary,
                cursor: cycle === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Step Back
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.warning : colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setCycle(c => Math.min(maxCycles, c + 1))}
              disabled={cycle >= maxCycles}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.bgSecondary,
                color: cycle >= maxCycles ? colors.textMuted : colors.textSecondary,
                cursor: cycle >= maxCycles ? 'not-allowed' : 'pointer',
              }}
            >
              Step Forward
            </button>
          </div>

          {/* Speed control */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Speed:</span>
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${playbackSpeed === speed ? colors.accent : colors.border}`,
                  background: playbackSpeed === speed ? `${colors.accent}22` : 'transparent',
                  color: playbackSpeed === speed ? colors.accent : colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Data flow toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Show Data Flow</span>
            <button
              onClick={() => setShowDataFlow(!showDataFlow)}
              style={{
                width: '50px',
                height: '26px',
                borderRadius: '13px',
                border: 'none',
                background: showDataFlow ? colors.accent : colors.border,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.3s',
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: showDataFlow ? '27px' : '3px',
                transition: 'left 0.3s',
              }} />
            </button>
          </div>
              </div>
            </div>

          {/* Completion message */}
          {cycle >= maxCycles && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Matrix multiplication complete! All {arraySize * arraySize} result values have been computed.
              </p>
            </div>
          )}

          {/* Array size slider for physics control */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>
              Array Size Control
            </h3>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
              When array size increases, it causes more parallel operations, which matters for AI chip performance.
            </p>
            <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Array Size: <span style={{ color: colors.accent, fontWeight: 600 }}>{arraySize}×{arraySize}</span>
            </label>
            <input
              type="range"
              min={2}
              max={4}
              step={1}
              value={arraySize}
              onChange={e => { setArraySize(Number(e.target.value)); setCycle(0); setIsPlaying(false); }}
              style={{ width: '100%', accentColor: colors.accent, touchAction: 'none' }}
              aria-label={`Array Size: ${arraySize}`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>2×2</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>4×4</span>
            </div>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
              💡 Why this matters: Systolic arrays are the backbone of modern AI hardware. When parallel cycles increase, it causes dramatic throughput improvements — this is important for every AI model you use today, from Google Search to ChatGPT. Understanding real-world systolic data flow is essential for designing efficient AI accelerators.
            </p>
          </div>

          {/* Comparison: Before vs After */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Before vs After
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Initial State (Cycle 0)</div>
                <div style={{ ...typo.h3, color: colors.textSecondary }}>All zeros</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>No computation</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Final State (Cycle {maxCycles})</div>
                <div style={{ ...typo.h3, color: colors.success }}>{arraySize * arraySize} results</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{arraySize * arraySize * arraySize} operations</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Pattern →
          </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why "Systolic" Like a Heartbeat?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>C[i,j] = Sum(A[i,k] * B[k,j]) for all k</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                In a systolic array, each processing element (PE) computes one output element by:
              </p>
              <ol style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <span style={{ color: colors.dataA }}>Matrix A values</span> flow horizontally (left to right)
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <span style={{ color: colors.dataB }}>Matrix B values</span> flow vertically (top to bottom)
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Each PE <span style={{ color: colors.accent }}>multiplies</span> incoming values and <span style={{ color: colors.success }}>accumulates</span> the result
                </li>
              </ol>
              <p>
                The data pulses through like blood through a heart—<span style={{ color: colors.accent, fontWeight: 600 }}>systole</span> means contraction, and the array contracts and expands with each cycle.
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
              Key Insight: Data Reuse
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Each element from Matrix A passes through N cells horizontally. Each element from Matrix B passes through N cells vertically. This means <strong>each value is reused N times</strong>, dramatically reducing memory bandwidth compared to fetching each operand separately!
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
              As you observed and predicted earlier, data flows through the array rhythmically. Your prediction is confirmed: each value is reused N times, reducing memory bandwidth dramatically.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', marginBottom: '24px' }}
          >
            Explore Scaling Effects →
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Memory bandwidth requirements double as array size doubles' },
      { id: 'b', text: 'Each data element is reused more times, reducing bandwidth per operation' },
      { id: 'c', text: 'Larger arrays require proportionally more control logic complexity' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Array Size
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            If we scale from a 4x4 array to a 128x128 array (like in a real TPU), what happens to efficiency?
          </h2>

          {/* Static scaling diagram - no sliders */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <svg width="320" height="160" viewBox="0 0 320 160" style={{ background: colors.bgCard, borderRadius: '8px' }}>
              <text x="160" y="18" fill={colors.textPrimary} fontSize="12" fontWeight="600" textAnchor="middle">Array Scaling: Data Reuse vs Size</text>
              {/* Y-axis */}
              <line x1="40" y1="25" x2="40" y2="135" stroke={colors.border} strokeWidth="1.5" />
              {/* X-axis */}
              <line x1="40" y1="135" x2="300" y2="135" stroke={colors.border} strokeWidth="1.5" />
              {/* Y-axis label */}
              <text x="12" y="85" fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform="rotate(-90,12,85)">Data Reuse</text>
              {/* X-axis label */}
              <text x="170" y="152" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Array Size (N)</text>
              {/* Data points: 2x2→2, 4x4→4, 8x8→8, 16x16→16 */}
              {[{x:60,y:119,label:'2×2'},{x:120,y:99,label:'4×4'},{x:200,y:63,label:'8×8'},{x:280,y:35,label:'16×16'}].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill={colors.accent} />
                  <text x={pt.x} y={pt.y - 8} fill={colors.accent} fontSize="11" textAnchor="middle">{pt.label}</text>
                </g>
              ))}
              {/* Line connecting points */}
              <polyline points="60,119 120,99 200,63 280,35" fill="none" stroke={colors.accent} strokeWidth="2" strokeDasharray="4,2" />
              {/* Axis ticks */}
              <text x="36" y="122" fill={colors.textMuted} fontSize="11" textAnchor="end">2</text>
              <text x="36" y="102" fill={colors.textMuted} fontSize="11" textAnchor="end">4</text>
              <text x="36" y="67" fill={colors.textMuted} fontSize="11" textAnchor="end">8</text>
              <text x="36" y="39" fill={colors.textMuted} fontSize="11" textAnchor="end">16</text>
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
              onClick={() => { playSound('success'); setCycle(0); nextPhase(); }}
              style={{ ...primaryButtonStyle, marginBottom: '24px' }}
            >
              Compare Array Sizes →
            </button>
          )}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate efficiency metrics for different array sizes
    const arraySizes = [2, 4, 8, 16];
    const metrics = arraySizes.map(size => ({
      size,
      totalOps: size * size * size, // For NxN * NxN matrix
      dataReuse: size, // Each element reused N times
      memReads: 2 * size * size, // Read each matrix once
      opsPerRead: (size * size * size) / (2 * size * size), // = N/2
    }));

    const currentMetric = metrics.find(m => m.size === arraySize);
    const activePEs = Array.from({ length: arraySize }).flatMap((_, row) =>
      Array.from({ length: arraySize }).map((_, col) => {
        const state = getPEState(row, col, cycle);
        return { row, col, state, active: state.active };
      })
    ).filter(pe => pe.active);
    const totalComputing = activePEs.filter(pe => pe.state.computing).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Scaling Systolic Arrays
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              See how efficiency improves with larger arrays
            </p>

            {/* Formula display */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0, fontWeight: 600 }}>
                Efficiency = (N³ operations) / (2N² memory reads) = N/2
              </p>
            </div>

            {/* Current array real-time stats */}
            {currentMetric && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{currentMetric.totalOps}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Ops</div>
                </div>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{totalComputing}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Computing Now</div>
                </div>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{currentMetric.dataReuse}x</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Data Reuse</div>
                </div>
              </div>
            )}

          {/* Array size selector */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {[2, 4].map(size => (
              <button
                key={size}
                onClick={() => { setArraySize(size); setCycle(0); setIsPlaying(false); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${arraySize === size ? colors.accent : colors.border}`,
                  background: arraySize === size ? `${colors.accent}22` : 'transparent',
                  color: arraySize === size ? colors.accent : colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {size}x{size} Array
              </button>
            ))}
          </div>

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
              {/* Visualization for selected size */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto',
              }}>
                <SystolicArrayVisualization interactive={false} showAccumulators={true} />
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

          {/* Simple playback */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => setCycle(0)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.bgSecondary,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.warning : colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Cycle: {cycle}
            </span>
          </div>
            </div>
          </div>

          {/* Efficiency comparison table */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Efficiency by Array Size
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Size</div>
              <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Total Ops</div>
              <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Data Reuse</div>
              <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Mem Reads</div>
              <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Ops/Read</div>
              {metrics.map(m => (
                <React.Fragment key={m.size}>
                  <div style={{ ...typo.small, color: arraySize === m.size ? colors.accent : colors.textPrimary, fontWeight: arraySize === m.size ? 700 : 400 }}>
                    {m.size}x{m.size}
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{m.totalOps}</div>
                  <div style={{ ...typo.small, color: colors.success }}>{m.dataReuse}x</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{m.memReads}</div>
                  <div style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{m.opsPerRead.toFixed(1)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Comparison: Small vs Large Arrays */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Comparison: Small vs Large
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>2×2 Array</div>
                <div style={{ ...typo.h3, color: colors.textSecondary }}>2x reuse</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>1.0 ops/read</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>4×4 Array</div>
                <div style={{ ...typo.h3, color: colors.accent }}>4x reuse</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>2.0 ops/read</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>128×128 TPU</div>
                <div style={{ ...typo.h3, color: colors.success }}>128x reuse</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>64.0 ops/read</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); setArraySize(4); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Tradeoffs
          </button>
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Bigger Arrays Win
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Data Reuse Scales Linearly</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In an NxN array, each input element is reused <span style={{ color: colors.accent }}>N times</span>. A 128x128 array reuses data 128 times vs. 4 times for a 4x4 array—<span style={{ color: colors.success, fontWeight: 600 }}>32x better data reuse!</span>
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💾</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Memory Bandwidth Bottleneck</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Memory is slow compared to compute. Larger arrays need <span style={{ color: colors.warning }}>fewer memory accesses per operation</span>, keeping the processing elements fed with data and maximizing utilization.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧩</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Tiling for Large Matrices</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Real matrices are larger than the array. The solution: <strong>tiling</strong>—breaking matrices into blocks that fit the array, processing tiles sequentially, and accumulating partial results. Software handles the orchestration.
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
              TPU Architecture Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Google's TPU v4 uses a 128x128 systolic array with bfloat16 numbers. That's 16,384 multiply-accumulate units running in lockstep, achieving over 100 TFLOPS per chip!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', marginBottom: '24px' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Systolic Array"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length}
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
                  How Systolic Arrays Power This:
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

            {/* Got It / Next App button */}
            {!allAppsCompleted && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  // Auto-advance to next incomplete app
                  const nextIdx = realWorldApps.findIndex((_, i) => i > selectedApp && !newCompleted[i]);
                  if (nextIdx !== -1) setSelectedApp(nextIdx);
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${colors.accent})`,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                {completedApps[selectedApp]
                  ? (selectedApp < realWorldApps.length - 1 ? 'Next App →' : 'Complete ✓')
                  : 'Got It →'}
              </button>
            )}

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px' }}
              >
                Take the Knowledge Test →
              </button>
            )}
          </div>
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

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
                ? 'You\'ve mastered Systolic Arrays!'
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
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
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
          Systolic Array Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how systolic arrays power AI accelerators and why they're essential for modern machine learning.
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
              'How data flows through processing elements',
              'Why systolic means "heartbeat" rhythm',
              'Data reuse and memory bandwidth efficiency',
              'How larger arrays improve performance',
              'Real-world TPU and AI applications',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default SystolicArrayRenderer;
