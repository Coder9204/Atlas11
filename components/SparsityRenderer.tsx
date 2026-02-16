'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SPARSITY IN NEURAL NETWORKS - Complete 10-Phase Game
// How zeros enable efficient AI computation
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

interface SparsityRendererProps {
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
    scenario: "A machine learning engineer notices that after applying ReLU activation, approximately 50% of the neurons output exactly zero. The model still performs well despite half the neurons being 'inactive'.",
    question: "Why does ReLU create so many zeros, and why doesn't this hurt model performance?",
    options: [
      { id: 'a', label: "ReLU is broken and should output continuous values" },
      { id: 'b', label: "ReLU zeroes negative values, creating activation sparsity that helps the network learn selective features", correct: true },
      { id: 'c', label: "The zeros represent corrupted data that the model ignores" },
      { id: 'd', label: "Half the neurons are permanently damaged from training" }
    ],
    explanation: "ReLU (Rectified Linear Unit) outputs max(0, x), turning all negative values to zero. This creates 'activation sparsity' where neurons selectively fire only for relevant features. This sparsity actually improves learning by making representations more interpretable and reducing interference between features."
  },
  {
    scenario: "A researcher prunes 90% of the weights in a neural network, setting them to zero. Surprisingly, the model's accuracy only drops by 2%.",
    question: "What does this reveal about neural network weights?",
    options: [
      { id: 'a', label: "The network was poorly trained with too many parameters" },
      { id: 'b', label: "Most weights contribute minimally; a small subset carries most of the model's knowledge", correct: true },
      { id: 'c', label: "The accuracy metric is unreliable" },
      { id: 'd', label: "The pruned weights will grow back during inference" }
    ],
    explanation: "This demonstrates the 'Lottery Ticket Hypothesis' - neural networks are vastly over-parameterized, and a small subset of weights (the 'winning tickets') are responsible for most performance. Weight pruning exploits this by identifying and keeping only the most important connections."
  },
  {
    scenario: "An AI chip manufacturer advertises 2x speedup using 'sparse tensor cores' but only for matrices with exactly a 2:4 sparsity pattern (2 zeros per 4 consecutive elements).",
    question: "Why do hardware accelerators require such a specific sparsity pattern?",
    options: [
      { id: 'a', label: "It's an arbitrary limitation to sell more chips" },
      { id: 'b', label: "Structured patterns enable predictable memory access and parallel processing, unlike random sparsity", correct: true },
      { id: 'c', label: "The 2:4 pattern is mathematically optimal for all neural networks" },
      { id: 'd', label: "Random sparsity would require quantum computing" }
    ],
    explanation: "GPUs process data in parallel using predictable memory patterns. Random (unstructured) sparsity creates irregular memory access that negates any speedup from skipping zeros. Structured sparsity like 2:4 maintains regular patterns that hardware can exploit efficiently with specialized tensor cores."
  },
  {
    scenario: "A data scientist compares two models: one with 50% unstructured sparsity and one with 50% structured (block) sparsity. On a GPU, the structured sparse model runs 3x faster.",
    question: "Why is structured sparsity faster on GPUs despite the same percentage of zeros?",
    options: [
      { id: 'a', label: "Structured sparsity eliminates more floating point operations" },
      { id: 'b', label: "Block patterns enable coalesced memory access and better hardware utilization", correct: true },
      { id: 'c', label: "GPUs can only process structured data" },
      { id: 'd', label: "Unstructured sparsity corrupts the computation" }
    ],
    explanation: "GPU efficiency depends on coalesced memory access - fetching consecutive data in single operations. Block sparsity keeps non-zeros in contiguous regions, enabling efficient memory reads. Unstructured sparsity scatters non-zeros randomly, causing many small, inefficient memory accesses that bottleneck performance."
  },
  {
    scenario: "A team fine-tunes a large language model using magnitude pruning, removing weights closest to zero. After pruning 70%, the model produces nonsensical outputs.",
    question: "What went wrong with this pruning approach?",
    options: [
      { id: 'a', label: "70% is always too aggressive for any model" },
      { id: 'b', label: "Small magnitude weights can still be critical for specific important features; gradual pruning with retraining works better", correct: true },
      { id: 'c', label: "The model needed more training data" },
      { id: 'd', label: "Pruning should only remove positive weights" }
    ],
    explanation: "Magnitude pruning assumes small weights are unimportant, but some small weights carry critical information for rare but important features. Successful pruning typically requires iterative pruning with fine-tuning, allowing the model to adapt and redistribute important information across remaining weights."
  },
  {
    scenario: "During inference, a transformer model shows 95% sparsity in attention weights after softmax, with most attention focused on just a few tokens.",
    question: "How can this natural attention sparsity be exploited for efficiency?",
    options: [
      { id: 'a', label: "Remove the softmax function entirely" },
      { id: 'b', label: "Use sparse attention patterns that only compute the high-attention token pairs", correct: true },
      { id: 'c', label: "Increase the number of attention heads" },
      { id: 'd', label: "This sparsity cannot be exploited practically" }
    ],
    explanation: "Sparse attention mechanisms (like in Longformer, BigBird, or FlashAttention) exploit the observation that most attention weights are near-zero. By predicting or constraining which token pairs will have high attention, computation can be reduced from O(n²) to O(n) or O(n log n) for long sequences."
  },
  {
    scenario: "A mobile AI team uses knowledge distillation to transfer knowledge from a large dense model to a smaller sparse model. The sparse student outperforms a sparse model trained from scratch.",
    question: "Why does distillation help sparse models perform better?",
    options: [
      { id: 'a', label: "The large model has more parameters to copy" },
      { id: 'b', label: "The teacher's soft probability outputs provide richer training signal than hard labels alone", correct: true },
      { id: 'c', label: "Distillation automatically prunes unimportant weights" },
      { id: 'd', label: "Sparse models cannot learn from raw data" }
    ],
    explanation: "Knowledge distillation transfers 'dark knowledge' - the teacher's probability distribution over all classes reveals relationships between concepts that hard labels miss. This rich signal helps sparse networks with limited capacity learn more effectively by leveraging the teacher's understanding of the problem structure."
  },
  {
    scenario: "An engineer implements dynamic sparsity where different inputs activate different subsets of neurons. The model adapts its computation based on input complexity.",
    question: "What is the main advantage of dynamic over static sparsity?",
    options: [
      { id: 'a', label: "Dynamic sparsity uses less memory" },
      { id: 'b', label: "Complex inputs get more computation while simple inputs use fewer resources, optimizing the accuracy-efficiency trade-off", correct: true },
      { id: 'c', label: "Dynamic sparsity is easier to implement" },
      { id: 'd', label: "Static sparsity cannot run on GPUs" }
    ],
    explanation: "Dynamic sparsity (like in Mixture of Experts or early-exit networks) allocates computation proportional to input difficulty. Simple inputs (a clear cat photo) need fewer neurons than ambiguous ones (a blurry image). This adaptive computation optimizes the overall accuracy-speed trade-off across diverse inputs."
  },
  {
    scenario: "A neural network accelerator advertises support for N:M sparsity (N non-zeros per M consecutive elements). The chip achieves near-theoretical speedup only when N:M = 2:4.",
    question: "What makes 2:4 sparsity particularly hardware-friendly?",
    options: [
      { id: 'a', label: "2:4 represents exactly 50% sparsity" },
      { id: 'b', label: "2:4 patterns can be encoded with minimal overhead and processed by simple hardware decoders", correct: true },
      { id: 'c', label: "Other ratios like 1:4 or 3:8 are mathematically impossible" },
      { id: 'd', label: "Neural networks naturally produce 2:4 patterns" }
    ],
    explanation: "2:4 sparsity (50%) is optimal for hardware because: (1) it needs only 2 bits to encode which 2 of 4 positions are non-zero, (2) the regular pattern maps perfectly to SIMD instructions, and (3) 50% reduction is significant. NVIDIA's Ampere and later architectures have dedicated circuits for this exact pattern."
  },
  {
    scenario: "Researchers compare FLOPs (floating point operations) reduction vs actual wall-clock speedup for a sparse model. Despite 80% fewer FLOPs, the model only runs 1.5x faster.",
    question: "Why doesn't FLOP reduction translate directly to proportional speedup?",
    options: [
      { id: 'a', label: "The remaining 20% of FLOPs are harder to compute" },
      { id: 'b', label: "Memory bandwidth and irregular access patterns often bottleneck sparse computation more than raw FLOPs", correct: true },
      { id: 'c', label: "The FLOP counting is incorrect" },
      { id: 'd', label: "Sparse models require more energy per FLOP" }
    ],
    explanation: "Modern hardware is often memory-bound, not compute-bound. Sparse matrices require storing indices and have irregular access patterns that underutilize memory bandwidth. The overhead of managing sparsity (indexing, irregular loads) can exceed the savings from skipped computations, especially for unstructured sparsity."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📱',
    title: 'Mobile AI Deployment',
    short: 'Running AI on smartphones',
    tagline: 'Powerful models in your pocket',
    description: 'Sparse neural networks enable sophisticated AI features like real-time language translation, photo enhancement, and voice assistants to run directly on mobile devices without cloud connectivity.',
    connection: 'Mobile chips have limited memory and power budgets. Sparsity reduces model size (fewer weights to store) and computation (fewer operations), enabling complex models to fit and run efficiently on edge devices.',
    howItWorks: 'Techniques like magnitude pruning and quantization-aware training create sparse models that maintain accuracy. Hardware accelerators in modern phones (Apple Neural Engine, Qualcomm Hexagon) exploit structured sparsity for additional speedup.',
    stats: [
      { value: '10x', label: 'Model compression', icon: '📦' },
      { value: '3x', label: 'Inference speedup', icon: '⚡' },
      { value: '5x', label: 'Energy savings', icon: '🔋' }
    ],
    examples: ['Apple Core ML pruning', 'TensorFlow Lite sparse models', 'Google Pixel Neural Core', 'Qualcomm AI Engine'],
    companies: ['Apple', 'Google', 'Qualcomm', 'MediaTek'],
    futureImpact: 'On-device AI will match cloud capabilities, enabling truly private AI assistants that never send data to servers.',
    color: '#10B981'
  },
  {
    icon: '🤖',
    title: 'Large Language Model Efficiency',
    short: 'Making GPT-scale models practical',
    tagline: 'Trillion parameters, fraction of the cost',
    description: 'Sparse architectures like Mixture of Experts (MoE) enable models with trillions of parameters while only activating a small fraction for each input, dramatically reducing inference costs.',
    connection: 'LLMs face a fundamental tension: more parameters improve capability but increase cost. Sparsity breaks this trade-off by allowing huge parameter counts while keeping computation per input manageable.',
    howItWorks: 'MoE models route each input to a subset of specialized "expert" sub-networks. Only 10-20% of parameters activate per token, giving capacity benefits of the full model at a fraction of compute. GPT-4 and Mixtral use this approach.',
    stats: [
      { value: '8x', label: 'Fewer FLOPs per token', icon: '🧮' },
      { value: '1T+', label: 'Possible parameters', icon: '🔢' },
      { value: '50%', label: 'Cost reduction', icon: '💰' }
    ],
    examples: ['GPT-4 (rumored MoE)', 'Mixtral 8x7B', 'Google Switch Transformer', 'Meta NLLB'],
    companies: ['OpenAI', 'Mistral', 'Google', 'Meta'],
    futureImpact: 'Sparse architectures will enable models orders of magnitude larger than today, approaching artificial general intelligence at sustainable costs.',
    color: '#8B5CF6'
  },
  {
    icon: '🎮',
    title: 'Real-Time Graphics AI',
    short: 'AI-powered gaming at 60+ FPS',
    tagline: 'Beautiful graphics in milliseconds',
    description: 'Sparse neural networks enable real-time AI features in games and graphics applications, including DLSS upscaling, ray tracing denoising, and character animation, all within strict frame time budgets.',
    connection: 'Games require consistent 16ms (60 FPS) or 8ms (120 FPS) frame times. Sparse networks with structured patterns can run on GPU tensor cores alongside graphics workloads, meeting these strict latency requirements.',
    howItWorks: 'NVIDIA Tensor Cores support 2:4 structured sparsity, achieving 2x throughput for qualifying models. Game AI networks are specifically designed with these patterns to enable real-time inference during rendering.',
    stats: [
      { value: '2x', label: 'Tensor Core speedup', icon: '🚀' },
      { value: '<5ms', label: 'AI inference time', icon: '⏱️' },
      { value: '4K', label: 'AI upscaling', icon: '📺' }
    ],
    examples: ['NVIDIA DLSS', 'AMD FSR', 'Intel XeSS', 'Unreal MetaHuman'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'Epic Games'],
    futureImpact: 'AI will generate entire game assets and animations in real-time, enabling infinite procedural content with hand-crafted quality.',
    color: '#EF4444'
  },
  {
    icon: '🏥',
    title: 'Medical AI at the Edge',
    short: 'Diagnostic AI in clinics worldwide',
    tagline: 'Expert-level analysis anywhere',
    description: 'Sparse models enable sophisticated medical imaging analysis (X-rays, CT scans, pathology) to run on local equipment in clinics without expensive servers or reliable internet connections.',
    connection: 'Medical AI requires high accuracy and low latency for clinical utility. Sparse models maintain diagnostic accuracy while running on affordable edge devices, democratizing access to AI-assisted healthcare.',
    howItWorks: 'Medical imaging models are pruned and quantized while preserving sensitivity to critical findings. Structured sparsity enables GPU acceleration on medical workstations, providing results in seconds rather than minutes.',
    stats: [
      { value: '95%+', label: 'Diagnostic accuracy', icon: '🎯' },
      { value: '10s', label: 'Analysis time', icon: '⏱️' },
      { value: '$5K', label: 'Edge device cost', icon: '💵' }
    ],
    examples: ['Google Health AI', 'PathAI diagnostics', 'Viz.ai stroke detection', 'Arterys cardiac AI'],
    companies: ['Google Health', 'PathAI', 'Viz.ai', 'Arterys'],
    futureImpact: 'Every clinic worldwide will have access to expert-level diagnostic AI, dramatically improving healthcare outcomes in underserved regions.',
    color: '#3B82F6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SparsityRenderer: React.FC<SparsityRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [sparsityLevel, setSparsityLevel] = useState(50); // Percentage of zeros
  const [matrixSize, setMatrixSize] = useState(8); // NxN matrix size
  const [showComputation, setShowComputation] = useState(false);
  const [sparsityType, setSparsityType] = useState<'unstructured' | 'structured'>('unstructured');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [highlightedCell, setHighlightedCell] = useState<{ row: number; col: number } | null>(null);

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

  // Generate sparse matrix based on settings
  const [sparseMatrix, setSparseMatrix] = useState<number[][]>([]);

  const generateSparseMatrix = useCallback(() => {
    const matrix: number[][] = [];
    const targetZeros = Math.floor((matrixSize * matrixSize) * (sparsityLevel / 100));

    if (sparsityType === 'structured') {
      // 2:4 structured sparsity - 2 zeros per 4 consecutive elements
      for (let i = 0; i < matrixSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < matrixSize; j += 4) {
          // For each group of 4, randomly select 2 to be non-zero
          const positions = [0, 1, 2, 3];
          const nonZeroPositions = positions.sort(() => Math.random() - 0.5).slice(0, 2);
          for (let k = 0; k < 4 && j + k < matrixSize; k++) {
            if (nonZeroPositions.includes(k)) {
              row.push(parseFloat((Math.random() * 2 - 1).toFixed(2)));
            } else {
              row.push(0);
            }
          }
        }
        matrix.push(row.slice(0, matrixSize));
      }
    } else {
      // Unstructured sparsity - random zero positions
      const totalElements = matrixSize * matrixSize;
      const zeroPositions = new Set<number>();
      while (zeroPositions.size < targetZeros) {
        zeroPositions.add(Math.floor(Math.random() * totalElements));
      }

      for (let i = 0; i < matrixSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < matrixSize; j++) {
          const pos = i * matrixSize + j;
          if (zeroPositions.has(pos)) {
            row.push(0);
          } else {
            row.push(parseFloat((Math.random() * 2 - 1).toFixed(2)));
          }
        }
        matrix.push(row);
      }
    }
    return matrix;
  }, [matrixSize, sparsityLevel, sparsityType]);

  useEffect(() => {
    setSparseMatrix(generateSparseMatrix());
  }, [generateSparseMatrix]);

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
    accent: '#8B5CF6', // Purple for AI/neural networks
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Improved contrast (was #9CA3AF)
    textMuted: '#e2e8f0', // Improved contrast (was #6B7280)
    border: '#2a2a3a',
    zero: '#475569', // Gray for zeros (skipped/inactive)
    nonZero: '#8B5CF6', // Purple for active computations
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
    twist_play: 'Structured Lab',
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

  // Calculate computation savings
  const calculateSavings = useCallback(() => {
    const totalElements = matrixSize * matrixSize;
    const zeros = sparseMatrix.flat().filter(v => v === 0).length;
    const actualSparsity = (zeros / totalElements) * 100;
    const denseOps = totalElements * matrixSize; // For matrix-vector multiply
    const sparseOps = (totalElements - zeros) * matrixSize;
    const theoreticalSpeedup = denseOps / Math.max(sparseOps, 1);

    // Structured sparsity has better hardware utilization
    const effectiveSpeedup = sparsityType === 'structured'
      ? theoreticalSpeedup * 0.9 // 90% efficiency for structured
      : theoreticalSpeedup * 0.4; // 40% efficiency for unstructured due to memory overhead

    return {
      totalElements,
      zeros,
      nonZeros: totalElements - zeros,
      actualSparsity,
      denseOps,
      sparseOps,
      theoreticalSpeedup,
      effectiveSpeedup,
      memoryReduction: (1 - (totalElements - zeros) / totalElements) * 100,
    };
  }, [matrixSize, sparseMatrix, sparsityType]);

  const savings = calculateSavings();

  // Sparse Matrix Visualization Component
  const SparseMatrixVisualization = ({ interactive = false }) => {
    const cellSize = isMobile ? 28 : 36;
    const gap = 2;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const matrixDisplaySize = matrixSize * (cellSize + gap) + gap;
    const size = matrixDisplaySize + margin.left + margin.right;
    const height = matrixDisplaySize + margin.top + margin.bottom;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0, textAlign: 'center' }}>
          Sparse Matrix Visualization
        </h3>
        <div style={{ ...typo.small, color: colors.accent, textAlign: 'center', fontStyle: 'italic' }}>
          Sparsity = (zeros / total) × 100%
        </div>
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${size} ${height}`}
          style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '8px',
            maxWidth: `${size}px`,
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* SVG filter for glow effect */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="sparsity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.zero} />
              <stop offset="100%" stopColor={colors.nonZero} />
            </linearGradient>
          </defs>

          {/* Axis labels */}
          <text
            x={margin.left + matrixDisplaySize / 2}
            y={margin.top - 15}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="14px"
            fontWeight="600"
          >
            Matrix Columns (features)
          </text>
          <text
            x={margin.left - 15}
            y={margin.top + matrixDisplaySize / 2}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="14px"
            fontWeight="600"
            transform={`rotate(-90, ${margin.left - 15}, ${margin.top + matrixDisplaySize / 2})`}
          >
            Matrix Rows
          </text>

          {/* Grid lines */}
          {Array.from({ length: matrixSize + 1 }).map((_, i) => {
            const pos = margin.left + gap + i * (cellSize + gap) - gap / 2;
            const posY = margin.top + gap + i * (cellSize + gap) - gap / 2;
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={pos}
                  y1={margin.top}
                  x2={pos}
                  y2={margin.top + matrixDisplaySize}
                  stroke={colors.border}
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
                <line
                  x1={margin.left}
                  y1={posY}
                  x2={margin.left + matrixDisplaySize}
                  y2={posY}
                  stroke={colors.border}
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              </g>
            );
          })}

          {sparseMatrix.map((row, i) =>
            row.map((value, j) => {
              const isZero = value === 0;
              const isHighlighted = highlightedCell?.row === i && highlightedCell?.col === j;
              const x = margin.left + gap + j * (cellSize + gap);
              const y = margin.top + gap + i * (cellSize + gap);

              return (
                <g key={`${i}-${j}`}>
                  {interactive && !isZero && (
                    <circle
                      cx={x + cellSize / 2}
                      cy={y + cellSize / 2}
                      r={isHighlighted ? 12 : 8}
                      fill={colors.nonZero}
                      opacity={0.4}
                      filter="url(#glow)"
                      style={{
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHighlightedCell({ row: i, col: j })}
                      onMouseLeave={() => setHighlightedCell(null)}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={isZero ? colors.zero : colors.nonZero}
                    rx="4"
                    opacity={isHighlighted ? 1 : 0.8}
                    style={{
                      transition: 'all 0.2s',
                      cursor: interactive ? 'pointer' : 'default',
                      filter: isHighlighted ? 'brightness(1.3)' : 'none',
                    }}
                    onMouseEnter={() => interactive && setHighlightedCell({ row: i, col: j })}
                    onMouseLeave={() => interactive && setHighlightedCell(null)}
                  />
                  {!isZero && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize={isMobile ? '11px' : '12px'}
                      fontWeight="600"
                    >
                      {value.toFixed(1)}
                    </text>
                  )}
                  {isZero && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      fill={colors.textMuted}
                      fontSize={isMobile ? '11px' : '12px'}
                    >
                      0
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: colors.nonZero, borderRadius: '3px' }} />
            <span style={{ ...typo.small, color: colors.textSecondary }}>Non-zero: active weights ({savings.nonZeros})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: colors.zero, borderRadius: '3px' }} />
            <span style={{ ...typo.small, color: colors.textSecondary }}>Zero: skipped weights ({savings.zeros})</span>
          </div>
        </div>
      </div>
    );
  };

  // Computation savings visualization
  const ComputationVisualization = () => {
    const barWidth = isMobile ? 200 : 300;
    const barHeight = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = barWidth + margin.left + margin.right;
    const chartHeight = barHeight + margin.top + margin.bottom;

    const denseHeight = barHeight;
    const sparseHeight = (savings.sparseOps / savings.denseOps) * barHeight;

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '20px',
        marginTop: '16px',
      }}>
        <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
          Computation Savings
        </h4>

        {/* SVG Bar Chart */}
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{
            maxWidth: `${chartWidth}px`,
            margin: '0 auto',
            display: 'block',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="dense-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.error} />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <linearGradient id="sparse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.success} />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + barHeight}
            stroke={colors.border}
            strokeWidth="2"
          />

          {/* X-axis */}
          <line
            x1={margin.left}
            y1={margin.top + barHeight}
            x2={chartWidth - margin.right}
            y2={margin.top + barHeight}
            stroke={colors.border}
            strokeWidth="2"
          />

          {/* Y-axis label */}
          <text
            x={margin.left - 40}
            y={margin.top + barHeight / 2}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="12px"
            transform={`rotate(-90, ${margin.left - 40}, ${margin.top + barHeight / 2})`}
          >
            Operations
          </text>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const y = margin.top + barHeight - frac * barHeight;
            return (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={chartWidth - margin.right}
                  y2={y}
                  stroke={colors.border}
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill={colors.textSecondary}
                  fontSize="10px"
                >
                  {Math.round(frac * savings.denseOps).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Dense bar */}
          <rect
            x={margin.left + 20}
            y={margin.top}
            width={60}
            height={denseHeight}
            fill="url(#dense-gradient)"
            rx="4"
          />
          <text
            x={margin.left + 50}
            y={margin.top + barHeight + 20}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="12px"
          >
            Dense
          </text>

          {/* Sparse bar */}
          <rect
            x={margin.left + 100}
            y={margin.top + barHeight - sparseHeight}
            width={60}
            height={sparseHeight}
            fill="url(#sparse-gradient)"
            rx="4"
          />
          <text
            x={margin.left + 130}
            y={margin.top + barHeight + 20}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="12px"
          >
            Sparse
          </text>
        </svg>


        {/* Stats grid */}
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
            <div style={{ ...typo.h3, color: colors.accent }}>
              {savings.theoreticalSpeedup.toFixed(1)}x
            </div>
            <div style={{ ...typo.small, color: colors.textMuted }}>Theoretical Speedup</div>
          </div>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{
              ...typo.h3,
              color: sparsityType === 'structured' ? colors.success : colors.warning
            }}>
              {savings.effectiveSpeedup.toFixed(1)}x
            </div>
            <div style={{ ...typo.small, color: colors.textMuted }}>
              Effective ({sparsityType === 'structured' ? 'Structured' : 'Unstructured'})
            </div>
          </div>
        </div>

        {sparsityType === 'unstructured' && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: `${colors.warning}22`,
            borderRadius: '8px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              Unstructured sparsity has irregular memory access patterns, reducing actual speedup
            </p>
          </div>
        )}
      </div>
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
      background: 'rgba(30, 41, 59, 0.8)',
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
        Sparsity in Neural Networks
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]}
      </div>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: colors.bgPrimary,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </nav>
  );

  // Navigation dots
  const renderNavDots = () => {
    const phaseAriaLabels: Record<Phase, string> = {
      hook: 'explore',
      predict: 'explore',
      play: 'experiment',
      review: 'explore',
      twist_predict: 'experiment',
      twist_play: 'experiment',
      twist_review: 'explore',
      transfer: 'apply',
      test: 'quiz',
      mastery: 'transfer'
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
            style={{
              width: phase === p ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            aria-label={phaseAriaLabels[p]}
          />
        ))}
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '84px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🧠⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Power of Zero
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "What if the secret to faster AI isn't doing more computation, but doing <span style={{ color: colors.accent }}>less</span>? Discover how zeros make neural networks dramatically more efficient."
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
            "A sparse matrix with 90% zeros isn't missing data—it's efficient representation. The zeros are the optimization."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Deep Learning Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Sparsity →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'More zeros slow down computation because the computer still processes them' },
      { id: 'b', text: 'Zeros can be skipped entirely, reducing computation proportionally' },
      { id: 'c', text: 'Zeros and non-zeros take the same time to process' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A neural network weight matrix is 75% zeros. What happens to computation time?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  marginBottom: '8px',
                }}>
                  {[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1].map((v, i) => (
                    <div key={i} style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: v ? colors.accent : colors.zero,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: v ? 'white' : colors.textMuted,
                      fontSize: '10px',
                    }}>
                      {v || '0'}
                    </div>
                  ))}
                </div>
                <p style={{ ...typo.small, color: colors.textMuted }}>75% Sparse Matrix</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>×</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🔢</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Input Vector</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>=</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>❓</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Computation Time?</p>
              </div>
            </div>
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
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Sparse Matrix
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
          paddingBottom: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Explore Sparse Matrices
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust sparsity level and see how computation changes
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe how more zeros reduce the number of required computations
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SparseMatrixVisualization interactive={true} />
            </div>

            {/* Sparsity slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Sparsity Level</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{sparsityLevel}% zeros</span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={sparsityLevel}
                onChange={(e) => setSparsityLevel(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${sparsityLevel}%, ${colors.border} ${sparsityLevel}%)`,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Dense (0%)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Very Sparse (95%)</span>
              </div>
            </div>

            {/* Matrix size slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Matrix Size</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{matrixSize}x{matrixSize}</span>
              </div>
              <input
                type="range"
                min="4"
                max="12"
                step="2"
                value={matrixSize}
                onChange={(e) => setMatrixSize(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Show computation toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Hide Savings</span>
              <button
                onClick={() => setShowComputation(!showComputation)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: showComputation ? colors.success : colors.border,
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
                  left: showComputation ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: showComputation ? colors.success : colors.textSecondary, fontWeight: showComputation ? 600 : 400 }}>
                Show Savings
              </span>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{savings.actualSparsity.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Actual Sparsity</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{savings.memoryReduction.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Memory Saved</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{savings.theoreticalSpeedup.toFixed(1)}x</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Potential Speedup</div>
              </div>
            </div>

            {showComputation && <ComputationVisualization />}
          </div>

          {/* Discovery prompt */}
          {sparsityLevel >= 75 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🎯 High sparsity! Notice how potential speedup grows, but there's a catch we'll explore...
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Trade-offs →
          </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Sparsity Enables Efficiency
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Multiplying by zero always gives zero</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                If a weight is <span style={{ color: colors.accent }}>zero</span>, we don't need to:
              </p>
              <ul style={{ margin: '0 0 16px 20px', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>Load it from memory</li>
                <li style={{ marginBottom: '8px' }}>Perform the multiplication</li>
                <li style={{ marginBottom: '8px' }}>Add the result (it's always zero)</li>
              </ul>
              <p>
                A <span style={{ color: colors.success, fontWeight: 600 }}>90% sparse matrix</span> theoretically needs only 10% of the computation!
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
              💡 Two Types of Sparsity
            </h3>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Activation Sparsity:</strong> ReLU outputs zero for negative inputs. After each layer, ~50% of activations may be zero.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Weight Sparsity:</strong> Pruning sets small weights to zero permanently. Models can be 90%+ sparse with minimal accuracy loss.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              ⚠️ The Hardware Challenge
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Random zeros create <strong>irregular memory access patterns</strong>. GPUs are optimized for predictable, parallel operations. This is why the next section introduces <strong>structured sparsity</strong>.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Structured Sparsity →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Random sparsity is always better because it removes the least important weights' },
      { id: 'b', text: 'Structured sparsity (like 2:4 pattern) enables much better hardware acceleration' },
      { id: 'c', text: 'The pattern of zeros doesn\'t matter for performance' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🔧 New Concept: Structured vs Unstructured
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            NVIDIA's Tensor Cores support "2:4 sparsity" (exactly 2 zeros per 4 elements). Why this specific pattern?
          </h2>

          {/* Pattern visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>2:4 Structured Pattern</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
              {[1.2, 0, -0.5, 0, 0, 0.8, 0, -1.1, 0.3, 0, 0, 0.7, 0, -0.9, 1.5, 0].map((v, i) => (
                <div key={i} style={{
                  width: isMobile ? '20px' : '28px',
                  height: isMobile ? '20px' : '28px',
                  borderRadius: '4px',
                  background: v !== 0 ? colors.accent : colors.zero,
                  border: i % 4 === 3 ? `2px solid ${colors.border}` : 'none',
                  marginRight: i % 4 === 3 ? '8px' : 0,
                }} />
              ))}
            </div>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              Exactly 2 non-zeros in every group of 4
            </p>
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
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Difference →
            </button>
          )}
        </div>

        {renderNavDots()}
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
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
          paddingBottom: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Structured vs Unstructured Sparsity
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Compare the effective speedup between patterns
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe how structured patterns achieve better real-world speedups
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Sparsity type toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => { setSparsityType('unstructured'); setSparseMatrix(generateSparseMatrix()); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${sparsityType === 'unstructured' ? colors.warning : colors.border}`,
                  background: sparsityType === 'unstructured' ? `${colors.warning}22` : 'transparent',
                  color: sparsityType === 'unstructured' ? colors.warning : colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Unstructured (Random)
              </button>
              <button
                onClick={() => { setSparsityType('structured'); setSparsityLevel(50); setSparseMatrix(generateSparseMatrix()); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${sparsityType === 'structured' ? colors.success : colors.border}`,
                  background: sparsityType === 'structured' ? `${colors.success}22` : 'transparent',
                  color: sparsityType === 'structured' ? colors.success : colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Structured (2:4)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SparseMatrixVisualization />
            </div>

            {sparsityType === 'unstructured' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Sparsity Level</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{sparsityLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={sparsityLevel}
                  onChange={(e) => setSparsityLevel(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </div>
            )}

            {/* Comparison stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginTop: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `1px solid ${sparsityType === 'unstructured' ? colors.warning : colors.border}`,
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{savings.theoreticalSpeedup.toFixed(1)}x</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Theoretical Speedup</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `1px solid ${sparsityType === 'structured' ? colors.success : colors.border}`,
              }}>
                <div style={{
                  ...typo.h3,
                  color: sparsityType === 'structured' ? colors.success : colors.error
                }}>
                  {savings.effectiveSpeedup.toFixed(1)}x
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Actual GPU Speedup</div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: sparsityType === 'structured' ? `${colors.success}22` : `${colors.warning}22`,
              borderRadius: '8px',
              border: `1px solid ${sparsityType === 'structured' ? colors.success : colors.warning}44`,
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                {sparsityType === 'structured'
                  ? '✓ Structured 2:4 sparsity achieves ~90% of theoretical speedup on NVIDIA Tensor Cores because memory access is predictable.'
                  : '⚠️ Unstructured sparsity only achieves ~40% of theoretical speedup due to irregular memory access patterns.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why →
          </button>
          </div>
        </div>

        {renderNavDots()}
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
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Structure Matters for Hardware
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔀</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Memory Access Patterns</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                GPUs load data in large, aligned chunks. <span style={{ color: colors.error }}>Random zeros</span> force small, scattered memory reads. <span style={{ color: colors.success }}>Structured patterns</span> keep data contiguous, enabling efficient bulk transfers.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>NVIDIA 2:4 Sparsity</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Only <strong>2 bits</strong> needed to encode which 2 of 4 positions are non-zero. Hardware decoders are simple and fast. NVIDIA Ampere/Hopper GPUs have dedicated circuits achieving <span style={{ color: colors.success }}>2x throughput</span>.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Practical Trade-off</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Unstructured:</strong> Maximum flexibility, prune any weight, best accuracy retention.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                <strong>Structured:</strong> Constrained pattern, slightly lower accuracy, but massive real-world speedup.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
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
      }}>
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
          paddingBottom: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                How Sparsity Connects:
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

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
          </div>
        </div>

        {renderNavDots()}
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
          padding: '24px',
        }}>
          {renderProgressBar()}

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
                ? 'You\'ve mastered Sparsity in Neural Networks!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

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
                ← Previous
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
          Sparsity Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how sparsity enables efficient neural network computation and the trade-offs between different sparsity patterns.
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
              'Activation sparsity from ReLU',
              'Weight sparsity through pruning',
              'Structured vs unstructured sparsity',
              'Why GPUs need regular patterns (2:4)',
              'Real-world applications in AI efficiency',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default SparsityRenderer;
