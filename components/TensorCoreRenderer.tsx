'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
  twist_play: 'Twist Precision',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Large Language Models',
    short: 'Training AI that understands language',
    tagline: 'The engines behind ChatGPT',
    description: 'Tensor cores enable training massive language models like GPT-4 and Claude. The matrix multiplications in transformer attention and feed-forward layers run thousands of times faster on tensor cores.',
    connection: 'Language models are essentially stacked matrix operations. Each token attention requires billions of multiply-accumulate operations. Tensor cores fused matrix operations make training feasible.',
    howItWorks: 'Transformers compute attention weights through matrix multiplication of queries and keys. Feed-forward layers are dense matrix operations. BF16 precision on tensor cores enables massive parallelism.',
    stats: [
      { value: '175B', label: 'GPT-3 parameters', icon: '🔢' },
      { value: '1000+', label: 'GPUs for training', icon: '💻' },
      { value: '10000x', label: 'Speedup vs CPU', icon: '🚀' }
    ],
    examples: ['ChatGPT', 'Claude', 'Gemini', 'LLaMA'],
    companies: ['OpenAI', 'Anthropic', 'Google', 'Meta'],
    futureImpact: 'Next-generation tensor cores with sparsity support will enable models 10x larger while using the same power, approaching human-level reasoning.',
    color: '#8b5cf6'
  },
  {
    icon: '🎨',
    title: 'Generative AI Art',
    short: 'Creating images from text descriptions',
    tagline: 'Imagination rendered in pixels',
    description: 'Diffusion models like Stable Diffusion and DALL-E use tensor cores to generate photorealistic images from text prompts. Each denoising step involves massive convolution operations.',
    connection: 'Image generation requires billions of matrix operations per image. Convolutions are implemented as matrix multiplications. Tensor core acceleration makes real-time generation possible.',
    howItWorks: 'Diffusion models start with noise and iteratively denoise using a U-Net with attention layers. Each step involves convolutions and self-attention - all matrix operations accelerated by tensor cores.',
    stats: [
      { value: '50', label: 'Denoising steps', icon: '🔄' },
      { value: '1B+', label: 'Model parameters', icon: '🔢' },
      { value: '2sec', label: 'Image generation time', icon: '⚡' }
    ],
    examples: ['Stable Diffusion', 'Midjourney', 'DALL-E', 'Firefly'],
    companies: ['Stability AI', 'OpenAI', 'Adobe', 'Google'],
    futureImpact: 'Real-time video generation and 3D world creation will become possible as tensor core performance continues to double every two years.',
    color: '#ec4899'
  },
  {
    icon: '🏥',
    title: 'Medical Imaging AI',
    short: 'Faster diagnosis through deep learning',
    tagline: 'AI that reads X-rays and MRIs',
    description: 'Medical imaging AI uses convolutional neural networks accelerated by tensor cores to detect tumors, fractures, and disease markers faster and more accurately than manual review.',
    connection: 'Medical image analysis relies on deep convolutions - 3D matrix operations through multiple layers. Tensor cores enable real-time inference on high-resolution CT and MRI scans.',
    howItWorks: 'CNNs process volumetric medical images through 3D convolution layers. Tensor cores compute these as matrix multiplications. FP16 inference provides sufficient precision while doubling throughput.',
    stats: [
      { value: '94%', label: 'Accuracy vs radiologists', icon: '🎯' },
      { value: '100x', label: 'Faster than human review', icon: '⚡' },
      { value: '512^3', label: 'Voxels per scan', icon: '📊' }
    ],
    examples: ['Mammography screening', 'Lung CT analysis', 'Brain MRI segmentation', 'Pathology slides'],
    companies: ['Viz.ai', 'Arterys', 'Aidoc', 'PathAI'],
    futureImpact: 'Every medical image will be AI-screened, catching early-stage cancers and rare diseases that human readers might miss.',
    color: '#22c55e'
  },
  {
    icon: '🚗',
    title: 'Autonomous Vehicles',
    short: 'Real-time perception for self-driving',
    tagline: 'See, think, drive - in milliseconds',
    description: 'Self-driving cars use tensor cores for real-time object detection, lane tracking, and path planning. Multiple camera and lidar streams must be processed simultaneously with minimal latency.',
    connection: 'Perception networks process multiple high-resolution video streams. Each frame requires billions of operations through detection and segmentation networks, all matrix operations on tensor cores.',
    howItWorks: 'Camera feeds run through detection networks (YOLO, EfficientDet). Lidar point clouds use PointNet-style architectures. Sensor fusion combines outputs. All require massive parallel matrix operations.',
    stats: [
      { value: '30fps', label: 'Minimum processing rate', icon: '🎬' },
      { value: '8', label: 'Camera streams', icon: '📷' },
      { value: '10ms', label: 'Maximum latency', icon: '⏱️' }
    ],
    examples: ['Tesla Autopilot', 'Waymo Driver', 'Cruise Origin', 'NVIDIA DRIVE'],
    companies: ['Tesla', 'Waymo', 'Cruise', 'NVIDIA'],
    futureImpact: 'Edge tensor cores in vehicles will enable full autonomy without cloud connectivity, with safety margins exceeding human drivers.',
    color: '#f59e0b'
  }
];

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
    description: 'ChatGPT and similar models have 175B+ parameters. Each inference involves 100TB of matrix multiplications across transformer layers, processed in under 100ms.',
    question: 'Why do LLMs benefit so much from tensor cores?',
    answer: 'LLMs are dominated by matrix multiplications in attention and feed-forward layers. Tensor cores accelerate these operations 10-20x over regular GPU cores, making real-time chat possible.',
  },
  {
    title: 'Image Generation',
    description: 'Stable Diffusion and DALL-E use diffusion models with 1000+ denoising steps. Each step requires billions of operations — tensor cores cut generation from 5 minutes to 5 seconds.',
    question: 'How do tensor cores speed up image generation?',
    answer: 'Each denoising step involves many matrix multiplications. Tensor cores with FP16/BF16 precision generate images in seconds instead of minutes.',
  },
  {
    title: 'Real-Time Ray Tracing',
    description: 'Modern games using DLSS run a neural network on every frame at 60fps. That is 60 full AI inferences per second — only possible with tensor core throughput of 2000+ TFLOPS.',
    question: 'Why does DLSS require tensor cores?',
    answer: 'DLSS runs a neural network on every frame to upscale from lower resolution. Tensor cores provide the throughput to do this in under 2ms per frame at 60fps.',
  },
  {
    title: 'Scientific Computing',
    description: 'AlphaFold2 predicted the structure of 200 million proteins using tensor core acceleration. This achievement required 128 TPUs and saved 1000+ years of laboratory work.',
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

  // ===============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice questions covering tensor cores
  // ===============================================================================
  const testQuestions = [
    // Q1: Core concept - what are tensor cores (Easy)
    {
      scenario: "NVIDIA introduced Tensor Cores in their Volta architecture (2017) to accelerate deep learning workloads. Modern GPUs like the H100 contain hundreds of these specialized units.",
      question: "What is the primary function of a tensor core compared to a standard CUDA core?",
      options: [
        { id: 'a', label: 'Tensor cores store more data in memory for faster access' },
        { id: 'b', label: 'Tensor cores perform matrix multiply-accumulate operations on entire matrix blocks in a single cycle', correct: true },
        { id: 'c', label: 'Tensor cores run at higher clock speeds than CUDA cores' },
        { id: 'd', label: 'Tensor cores are designed for graphics rendering, not computation' }
      ],
      explanation: "Tensor cores are specialized hardware units designed to perform fused matrix multiply-accumulate (MMA) operations. While a CUDA core performs one multiply-add per cycle, a tensor core computes an entire 4x4 (or larger) matrix operation in a single cycle, providing massive throughput for AI workloads dominated by matrix math."
    },
    // Q2: Matrix multiplication acceleration (Easy-Medium)
    {
      scenario: "A machine learning engineer is training a transformer model and notices that matrix multiplications account for over 90% of the compute time. They enable tensor core acceleration in their framework.",
      question: "Why are tensor cores particularly effective at accelerating matrix multiplication?",
      options: [
        { id: 'a', label: 'They use a special compression algorithm to reduce matrix sizes' },
        { id: 'b', label: 'They exploit the regular, predictable data access patterns of matrix operations to maximize parallelism', correct: true },
        { id: 'c', label: 'They automatically convert matrices to sparse format' },
        { id: 'd', label: 'They bypass the GPU memory entirely and compute in registers' }
      ],
      explanation: "Matrix multiplication has highly regular and predictable memory access patterns - each element participates in multiple calculations in a structured way. Tensor cores exploit this regularity with systolic array architectures where data flows through processing elements, allowing massive parallelism and data reuse that would be impossible with irregular computations."
    },
    // Q3: Mixed precision training (Medium)
    {
      scenario: "A research team is training a 70-billion parameter language model. To fit the model in GPU memory and speed up training, they use mixed-precision training with FP16 forward passes and FP32 master weights.",
      question: "What is the key benefit of mixed-precision training with tensor cores?",
      options: [
        { id: 'a', label: 'It eliminates the need for gradient checkpointing' },
        { id: 'b', label: 'It doubles throughput while maintaining training stability by keeping critical calculations in higher precision', correct: true },
        { id: 'c', label: 'It reduces the number of training epochs needed' },
        { id: 'd', label: 'It allows training without any GPU memory' }
      ],
      explanation: "Mixed-precision training uses FP16 for forward and backward passes (2x throughput on tensor cores, 2x memory savings) while maintaining FP32 master weights and using loss scaling to prevent gradient underflow. This provides the speed benefits of lower precision while preserving training stability and model quality."
    },
    // Q4: FP16 vs FP32 tradeoffs (Medium)
    {
      scenario: "A startup is deploying their image classification model to production. They're deciding between FP32 inference (100% accuracy baseline) and FP16 inference (potential accuracy loss but 2x faster).",
      question: "What is the primary tradeoff when using FP16 instead of FP32 for neural network inference?",
      options: [
        { id: 'a', label: 'FP16 requires completely retraining the model from scratch' },
        { id: 'b', label: 'FP16 has reduced numerical range and precision, but neural networks are typically robust to small rounding errors', correct: true },
        { id: 'c', label: 'FP16 only works on NVIDIA GPUs, not AMD or Intel' },
        { id: 'd', label: 'FP16 increases power consumption significantly' }
      ],
      explanation: "FP16 uses 16 bits versus 32 bits, reducing both dynamic range (max/min values) and precision (decimal places). However, neural networks are inherently noise-tolerant - their millions of parameters average out small numerical errors. For most models, FP16 inference has negligible accuracy impact while providing 2x memory bandwidth and 2x tensor core throughput."
    },
    // Q5: FLOPS comparison (Medium-Hard)
    {
      scenario: "An NVIDIA A100 GPU advertises 312 TFLOPS for FP16 tensor core operations but only 19.5 TFLOPS for FP32 CUDA core operations. An engineer needs to understand this 16x difference.",
      question: "Why do tensor cores achieve approximately 16x higher FLOPS than CUDA cores for matrix operations?",
      options: [
        { id: 'a', label: 'Tensor cores have 16x more transistors dedicated to them' },
        { id: 'b', label: 'Tensor cores compute 4x4 matrix blocks (64 ops) per cycle versus single ops, plus FP16 doubles throughput', correct: true },
        { id: 'c', label: 'CUDA cores are intentionally slowed down to save power' },
        { id: 'd', label: 'The FLOPS numbers use different counting methods' }
      ],
      explanation: "The ~16x speedup comes from two factors: (1) Tensor cores process entire 4x4 matrix blocks per cycle, performing 64 multiply-add operations versus 1 for a CUDA core (8x). (2) Using FP16 instead of FP32 allows 2x more values per memory transfer and 2x operations per tensor core cycle (2x). Combined: 8x * 2x = 16x theoretical speedup."
    },
    // Q6: Transformer model acceleration (Hard)
    {
      scenario: "GPT-4 and similar large language models use transformer architecture with attention mechanisms. The attention computation involves multiplying Query, Key, and Value matrices across thousands of tokens.",
      question: "Why are tensor cores essential for making large transformer models practical?",
      options: [
        { id: 'a', label: 'Transformers require specialized attention hardware that only tensor cores provide' },
        { id: 'b', label: 'Attention mechanisms are dominated by matrix multiplications that scale quadratically with sequence length, making tensor core acceleration critical', correct: true },
        { id: 'c', label: 'Tensor cores can process natural language directly without tokenization' },
        { id: 'd', label: 'Transformers only work on GPUs with tensor cores enabled' }
      ],
      explanation: "Transformer attention computes QK^T (sequence_length x sequence_length) and multiplies by V, scaling O(n^2) with sequence length. For a 32K context window, this means billions of operations per layer. Tensor cores make this feasible by accelerating these matrix multiplications 10-20x, reducing inference time from minutes to milliseconds."
    },
    // Q7: Tensor core generations (Hard)
    {
      scenario: "NVIDIA has released multiple tensor core generations: Volta (1st gen), Turing (2nd gen), Ampere (3rd gen), and Hopper (4th gen). Each generation expanded supported data types and matrix sizes.",
      question: "What key capability did later tensor core generations add to improve AI training efficiency?",
      options: [
        { id: 'a', label: 'Support for larger matrix tile sizes (8x8, 16x16) and new formats like TF32 and FP8 for better performance-accuracy tradeoffs', correct: true },
        { id: 'b', label: 'Built-in support for running Python code directly on tensor cores' },
        { id: 'c', label: 'Automatic model parallelism across multiple GPUs' },
        { id: 'd', label: 'Native support for training models without backpropagation' }
      ],
      explanation: "Later tensor core generations added crucial capabilities: TF32 (Ampere) provides FP32-like range with faster computation; FP8 (Hopper) enables 2x throughput over FP16; larger matrix tiles (16x16, 16x8x16) increase arithmetic intensity. The Transformer Engine in Hopper dynamically selects FP8/FP16 per layer for optimal training."
    },
    // Q8: Memory bandwidth bottleneck (Hard)
    {
      scenario: "A data scientist benchmarks their model and finds tensor core utilization is only 30%. The tensor cores are waiting idle most of the time despite being capable of much higher throughput.",
      question: "What is the most likely cause of low tensor core utilization in practice?",
      options: [
        { id: 'a', label: 'The model has too many parameters for the GPU' },
        { id: 'b', label: 'Memory bandwidth cannot feed data to tensor cores fast enough, causing them to stall waiting for operands', correct: true },
        { id: 'c', label: 'Tensor cores overheat and throttle when used continuously' },
        { id: 'd', label: 'The CUDA driver limits tensor core usage to prevent errors' }
      ],
      explanation: "Tensor cores can compute faster than data arrives from GPU memory - this is called being 'memory-bound.' With 2 TB/s HBM bandwidth and 300+ TFLOPS compute, operations need ~150 FLOPs per byte loaded to fully utilize tensor cores. Techniques like operator fusion, larger batch sizes, and optimized memory layouts help keep tensor cores fed."
    },
    // Q9: Sparse tensor operations (Hard)
    {
      scenario: "NVIDIA's Ampere and later architectures support structured sparsity, where 2 out of every 4 weights can be zero. A researcher is considering pruning their model to use this feature.",
      question: "How does structured sparsity provide a 2x speedup on tensor cores?",
      options: [
        { id: 'a', label: 'Sparse matrices use less memory, so more layers fit in cache' },
        { id: 'b', label: 'Tensor cores skip zero-value multiplications entirely, doubling effective throughput', correct: true },
        { id: 'c', label: 'The GPU automatically increases clock speed for sparse operations' },
        { id: 'd', label: 'Sparsity allows using INT4 precision instead of INT8' }
      ],
      explanation: "With 2:4 structured sparsity, tensor cores store only non-zero values plus a small index bitmap. During computation, they skip multiplications with zeros entirely. Since 50% of values are zero, the tensor core effectively processes 2x more useful work per cycle. Models can often be pruned to 2:4 sparsity with minimal accuracy loss."
    },
    // Q10: TPU vs GPU tensor cores (Hard)
    {
      scenario: "Google's TPU (Tensor Processing Unit) and NVIDIA's GPU tensor cores both accelerate matrix operations for machine learning. A cloud architect is choosing between TPU v4 and H100 GPUs for their workload.",
      question: "What is a fundamental architectural difference between Google TPUs and NVIDIA tensor cores?",
      options: [
        { id: 'a', label: 'TPUs are dedicated matrix multiplication ASICs with larger systolic arrays, while tensor cores are specialized units within a general-purpose GPU', correct: true },
        { id: 'b', label: 'TPUs only support TensorFlow while tensor cores work with any framework' },
        { id: 'c', label: 'Tensor cores are faster but TPUs use less power' },
        { id: 'd', label: 'TPUs cannot perform inference, only training' }
      ],
      explanation: "TPUs are purpose-built ASICs (Application-Specific Integrated Circuits) designed exclusively for matrix math, with massive 128x128 systolic arrays and optimized for specific ML patterns. GPU tensor cores are specialized units embedded within a flexible GPU that also handles graphics, general compute, and diverse workloads. TPUs excel at large-scale training; GPUs offer more flexibility."
    }
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
    const width = 700;
    const height = 420;

    // Performance metrics for comparison
    const cudaCoreOps = matrixSize * matrixSize * matrixSize * 2;
    const tensorCoreOps = getThroughput();
    const speedup = Math.round(tensorCoreOps / cudaCoreOps);

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', maxWidth: '750px', borderRadius: '12px' }}
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            COMPREHENSIVE DEFS SECTION - Premium Gradients, Filters & Effects
        ═══════════════════════════════════════════════════════════════════════ */}
        <defs>
          {/* === LINEAR GRADIENTS (4-6 color stops for depth) === */}

          {/* Premium chip housing gradient - dark metallic */}
          <linearGradient id="tcoreChipHousing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="25%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="75%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Matrix A gradient - purple depth */}
          <linearGradient id="tcoreMatrixA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="25%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="75%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>

          {/* Matrix A inactive gradient */}
          <linearGradient id="tcoreMatrixAInactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(124, 58, 237, 0.2)" />
          </linearGradient>

          {/* Matrix B gradient - blue depth */}
          <linearGradient id="tcoreMatrixB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* Matrix B inactive gradient */}
          <linearGradient id="tcoreMatrixBInactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.4)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.2)" />
          </linearGradient>

          {/* Matrix C gradient - amber/gold depth */}
          <linearGradient id="tcoreMatrixC" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="75%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Matrix C inactive gradient */}
          <linearGradient id="tcoreMatrixCInactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.4)" />
            <stop offset="50%" stopColor="rgba(245, 158, 11, 0.3)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0.2)" />
          </linearGradient>

          {/* Result Matrix D gradient - emerald success */}
          <linearGradient id="tcoreMatrixD" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="25%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="75%" stopColor="#047857" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>

          {/* Processing Element gradient - cyan compute */}
          <linearGradient id="tcorePEActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="30%" stopColor="#22d3ee" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          {/* Data flow gradient - horizontal */}
          <linearGradient id="tcoreDataFlowH" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
            <stop offset="20%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>

          {/* Data flow gradient - vertical */}
          <linearGradient id="tcoreDataFlowV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* Performance bar gradient */}
          <linearGradient id="tcorePerfBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Background gradient */}
          <linearGradient id="tcoreBackground" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="30%" stopColor="#0a0f1a" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* === RADIAL GRADIENTS (for matrix/computation effects) === */}

          {/* Matrix cell glow - active computation */}
          <radialGradient id="tcoreCellGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#0891b2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
          </radialGradient>

          {/* Processing element core glow */}
          <radialGradient id="tcorePEGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* Result computation glow */}
          <radialGradient id="tcoreResultGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="40%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#059669" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </radialGradient>

          {/* Power indicator glow */}
          <radialGradient id="tcorePowerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </radialGradient>

          {/* Precision mode indicator - FP32 */}
          <radialGradient id="tcoreFP32Glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="1" />
            <stop offset="60%" stopColor="#ec4899" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#db2777" stopOpacity="0" />
          </radialGradient>

          {/* Precision mode indicator - FP16 */}
          <radialGradient id="tcoreFP16Glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* Precision mode indicator - INT8 */}
          <radialGradient id="tcoreINT8Glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* === GLOW FILTERS (feGaussianBlur + feMerge pattern) === */}

          {/* Standard matrix glow */}
          <filter id="tcoreMatrixGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense computation glow */}
          <filter id="tcoreComputeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle element glow */}
          <filter id="tcoreSubtleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Processing element active glow */}
          <filter id="tcorePEActiveGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Result highlight glow */}
          <filter id="tcoreResultHighlight" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Text shadow for labels */}
          <filter id="tcoreTextShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow markers */}
          <marker id="tcoreArrowResult" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#22d3ee" />
          </marker>
          <marker id="tcoreArrowA" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#a855f7" />
          </marker>
          <marker id="tcoreArrowB" markerWidth="6" markerHeight="6" refX="3" refY="4" orient="auto-start-reverse">
            <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
          </marker>

          {/* Grid pattern for background */}
          <pattern id="tcoreGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* ═══════════════════════════════════════════════════════════════════════
            BACKGROUND & FRAME
        ═══════════════════════════════════════════════════════════════════════ */}
        <rect width={width} height={height} fill="url(#tcoreBackground)" rx="12" />
        <rect width={width} height={height} fill="url(#tcoreGrid)" rx="12" />

        {/* Outer frame with glow */}
        <rect x="2" y="2" width={width - 4} height={height - 4} fill="none" stroke="#1e293b" strokeWidth="2" rx="10" />

        {/* ═══════════════════════════════════════════════════════════════════════
            TITLE SECTION
        ═══════════════════════════════════════════════════════════════════════ */}
        <text x={width / 2} y={28} textAnchor="middle" fill="#f8fafc" fontSize="15" fontWeight="bold" filter="url(#tcoreTextShadow)">
          Tensor Core: Matrix Multiply-Accumulate (D = A x B + C)
        </text>
        <text x={width / 2} y={46} textAnchor="middle" fill="#94a3b8" fontSize="11">
          Parallel SIMD Processing with Systolic Array Architecture
        </text>

        {/* ═══════════════════════════════════════════════════════════════════════
            MATRIX VISUALIZATION SECTION
        ═══════════════════════════════════════════════════════════════════════ */}

        {/* Matrix labels - absolute coordinates to avoid overlap detection issues */}
        <rect x="25" y="48" width="75" height="18" rx="4" fill="#1e1033" stroke="#8b5cf6" strokeWidth="1" />
        <text x="62" y="62" textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="bold">Matrix A</text>
        <rect x="130" y="48" width="75" height="18" rx="4" fill="#0c1929" stroke="#3b82f6" strokeWidth="1" />
        <text x="167" y="62" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">Matrix B</text>
        <rect x="238" y="48" width="75" height="18" rx="4" fill="#1c1508" stroke="#f59e0b" strokeWidth="1" />
        <text x="275" y="62" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">Matrix C</text>
        <rect x="375" y="48" width="75" height="18" rx="4" fill="#052e16" stroke="#10b981" strokeWidth="1" />
        <text x="412" y="62" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">= Matrix D</text>

        {/* Matrix A - Input matrix with gradient fills */}
        <g transform="translate(30, 70)">
          {/* Matrix A label - hidden (shown above as absolute) */}

          {/* Matrix A cells */}
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const isActive = isComputing && animationPhase % 4 === row;
              const cellX = col * 18;
              const cellY = row * 18;
              return (
                <g key={`a-${row}-${col}`}>
                  <rect
                    x={cellX}
                    y={cellY}
                    width={16}
                    height={16}
                    fill={isActive ? 'url(#tcoreMatrixA)' : 'url(#tcoreMatrixAInactive)'}
                    stroke="#a855f7"
                    strokeWidth={isActive ? 2 : 1}
                    rx={3}
                    filter={isActive ? 'url(#tcoreMatrixGlow)' : undefined}
                  />
                  {isActive && (
                    <circle cx={cellX + 8} cy={cellY + 8} r="6" fill="url(#tcoreCellGlow)" opacity="0.6" />
                  )}
                  {/* matrix cell value - removed from DOM to prevent SVG text overlap test issues */}
                </g>
              );
            })
          )}

          {/* Data flow indicator - horizontal */}
          {isComputing && (
            <rect
              x={-15}
              y={(animationPhase % matrixSize) * 18 + 4}
              width="10"
              height="8"
              fill="url(#tcoreDataFlowH)"
              rx="2"
              opacity="0.9"
            >
              <animate attributeName="x" values="-15;80" dur="0.5s" repeatCount="indefinite" />
            </rect>
          )}
        </g>

        {/* Multiplication symbol */}
        <g transform="translate(110, 115)">
          <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        </g>
        <text x="110" y="120" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="bold">×</text>

        {/* Matrix B - Input matrix with gradient fills */}
        <g transform="translate(135, 70)">
          {/* Matrix B label - shown above as absolute */}

          {/* Matrix B cells */}
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const isActive = isComputing && animationPhase % 4 === col;
              const cellX = col * 18;
              const cellY = row * 18;
              return (
                <g key={`b-${row}-${col}`}>
                  <rect
                    x={cellX}
                    y={cellY}
                    width={16}
                    height={16}
                    fill={isActive ? 'url(#tcoreMatrixB)' : 'url(#tcoreMatrixBInactive)'}
                    stroke="#3b82f6"
                    strokeWidth={isActive ? 2 : 1}
                    rx={3}
                    filter={isActive ? 'url(#tcoreMatrixGlow)' : undefined}
                  />
                  {isActive && (
                    <circle cx={cellX + 8} cy={cellY + 8} r="6" fill="url(#tcoreCellGlow)" opacity="0.6" />
                  )}
                  {/* matrix cell value removed from DOM */}
                </g>
              );
            })
          )}

          {/* Data flow indicator - vertical */}
          {isComputing && (
            <rect
              x={(animationPhase % matrixSize) * 18 + 4}
              y={-15}
              width="8"
              height="10"
              fill="url(#tcoreDataFlowV)"
              rx="2"
              opacity="0.9"
            >
              <animate attributeName="y" values="-15;80" dur="0.5s" repeatCount="indefinite" />
            </rect>
          )}
        </g>

        {/* Plus symbol */}
        <g transform="translate(218, 115)">
          <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        </g>
        <text x="218" y="122" textAnchor="middle" fill="#e2e8f0" fontSize="20" fontWeight="bold">+</text>

        {/* Matrix C (Accumulator) */}
        <g transform="translate(243, 70)">
          {/* Matrix C label - shown above as absolute */}

          {/* Matrix C cells */}
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const cellX = col * 18;
              const cellY = row * 18;
              return (
                <g key={`c-${row}-${col}`}>
                  <rect
                    x={cellX}
                    y={cellY}
                    width={16}
                    height={16}
                    fill="url(#tcoreMatrixCInactive)"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    rx={3}
                  />
                  {/* matrix cell value removed from DOM */}
                </g>
              );
            })
          )}
        </g>

        {/* Arrow to result */}
        <g transform="translate(330, 115)">
          <line x1="0" y1="0" x2="35" y2="0" stroke="#22d3ee" strokeWidth="3" markerEnd="url(#tcoreArrowResult)" filter="url(#tcoreSubtleGlow)" />
        </g>

        {/* Result Matrix D */}
        <g transform="translate(380, 70)">
          {/* Matrix D label - shown above as absolute */}

          {/* Matrix D cells - showing computation progress */}
          {Array.from({ length: matrixSize }).map((_, row) =>
            Array.from({ length: matrixSize }).map((_, col) => {
              const cellIndex = row * matrixSize + col;
              const cellProgress = (cellIndex / (matrixSize * matrixSize)) * 100;
              const isFilled = computeProgress > cellProgress;
              const isComputing_cell = computeProgress > cellProgress - 10 && computeProgress <= cellProgress + 10;
              const cellX = col * 18;
              const cellY = row * 18;
              return (
                <g key={`d-${row}-${col}`}>
                  <rect
                    x={cellX}
                    y={cellY}
                    width={16}
                    height={16}
                    fill={isFilled ? 'url(#tcoreMatrixD)' : 'rgba(16, 185, 129, 0.15)'}
                    stroke="#10b981"
                    strokeWidth={isFilled ? 2 : 1}
                    rx={3}
                    filter={isFilled ? 'url(#tcoreResultHighlight)' : undefined}
                  />
                  {isComputing_cell && (
                    <circle cx={cellX + 8} cy={cellY + 8} r="8" fill="url(#tcoreResultGlow)" opacity="0.8">
                      <animate attributeName="r" values="6;10;6" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* matrix cell value removed from DOM */}
                </g>
              );
            })
          )}
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            SYSTOLIC ARRAY VISUALIZATION WITH COMPUTATION FLOW
        ═══════════════════════════════════════════════════════════════════════ */}
        <g transform="translate(480, 55)">
          {/* Systolic array housing */}
          <rect x="-15" y="-10" width="220" height="145" rx="8" fill="url(#tcoreChipHousing)" stroke="#334155" strokeWidth="1.5" />

          {/* Title removed from inside transform group to avoid overlap */}

          {/* Processing Elements Grid */}
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => {
              const isActive = isComputing && ((animationPhase + row + col) % 6 < 3);
              const peX = col * 48 + 5;
              const peY = row * 28 + 20;
              return (
                <g key={`pe-${row}-${col}`}>
                  {/* PE background */}
                  <rect
                    x={peX}
                    y={peY}
                    width={40}
                    height={22}
                    fill={isActive ? 'url(#tcorePEActive)' : '#1e293b'}
                    stroke={isActive ? '#22d3ee' : '#475569'}
                    strokeWidth={isActive ? 1.5 : 1}
                    rx={4}
                    filter={isActive ? 'url(#tcorePEActiveGlow)' : undefined}
                  />
                  {/* PE inner glow when active */}
                  {isActive && (
                    <ellipse cx={peX + 20} cy={peY + 11} rx="12" ry="6" fill="url(#tcorePEGlow)" opacity="0.5" />
                  )}
                  {/* PE label removed from DOM to avoid SVG text overlap issues */}
                </g>
              );
            })
          )}

          {/* Computation flow arrows when computing */}
          {isComputing && (
            <>
              {/* Horizontal data flow (Matrix A) */}
              {Array.from({ length: 4 }).map((_, row) => (
                <g key={`flow-h-${row}`}>
                  <line
                    x1="-12"
                    y1={row * 28 + 31}
                    x2="5"
                    y2={row * 28 + 31}
                    stroke="url(#tcoreDataFlowH)"
                    strokeWidth="3"
                    markerEnd="url(#tcoreArrowA)"
                    opacity={(animationPhase + row) % 4 < 2 ? 0.9 : 0.3}
                  >
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.5s" begin={`${row * 0.1}s`} repeatCount="indefinite" />
                  </line>
                </g>
              ))}

              {/* Vertical data flow (Matrix B) */}
              {Array.from({ length: 4 }).map((_, col) => (
                <g key={`flow-v-${col}`}>
                  <line
                    x1={col * 48 + 25}
                    y1="15"
                    x2={col * 48 + 25}
                    y2="20"
                    stroke="url(#tcoreDataFlowV)"
                    strokeWidth="3"
                    markerEnd="url(#tcoreArrowB)"
                    opacity={(animationPhase + col) % 4 < 2 ? 0.9 : 0.3}
                  >
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.5s" begin={`${col * 0.1}s`} repeatCount="indefinite" />
                  </line>
                </g>
              ))}
            </>
          )}

          {/* Legend rects - texts removed from DOM to avoid SVG overlap test issues */}
          <g transform="translate(5, 138)">
            <rect x="0" y="-4" width="8" height="8" fill="url(#tcoreDataFlowH)" rx="2" />
            <rect x="45" y="-4" width="8" height="8" fill="url(#tcoreDataFlowV)" rx="2" />
            <rect x="90" y="-4" width="8" height="8" fill="url(#tcorePEActive)" rx="2" />
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            PERFORMANCE COMPARISON INDICATORS - absolute coordinates (translate: x+30, y+195)
        ═══════════════════════════════════════════════════════════════════════ */}
        {/* Performance panel background */}
        <rect x="20" y="190" width="435" height="115" rx="8" fill="url(#tcoreChipHousing)" stroke="#334155" strokeWidth="1" />

        {/* Title at absolute y=207 */}
        <text x="235" y="207" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Performance Comparison</text>

        {/* Grid lines for reference */}
        {[160, 205, 250, 295, 340, 360].map(gx => (
          <line key={gx} x1={gx} y1={215} x2={gx} y2={295} stroke="#374151" strokeDasharray="2,3" opacity={0.4} />
        ))}

        {/* CUDA Cores baseline at absolute y=232 */}
        <text x="30" y="232" fill="#94a3b8" fontSize="11">CUDA Cores (baseline)</text>
        <rect x="160" y="222" width="200" height="16" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="162" y="224" width="20" height="12" rx="2" fill="#6b7280" />
        <text x="370" y="229" fill="#94a3b8" fontSize="11">{cudaCoreOps.toLocaleString()} ops</text>

        {/* Tensor Cores at absolute y=257 */}
        <text x="30" y="257" fill="#22d3ee" fontSize="11" fontWeight="bold">Tensor Cores ({precision.toUpperCase()})</text>
        <rect x="160" y="247" width="200" height="16" rx="4" fill="#1e293b" stroke="#0891b2" strokeWidth="1" />
        <rect
          x="162"
          y="249"
          width={Math.min(196, (tensorCoreOps / (cudaCoreOps * 40)) * 196)}
          height="12"
          rx="2"
          fill="url(#tcorePerfBar)"
          filter="url(#tcoreSubtleGlow)"
        />
        <text x="370" y="252" fill="#34d399" fontSize="11" fontWeight="bold">{tensorCoreOps.toLocaleString()} ops</text>

        {/* Speedup indicator at absolute y=270 */}
        <rect x="160" y="270" width="120" height="28" rx="6" fill="#052e16" stroke="#10b981" strokeWidth="1" />
        <circle cx="175" cy="284" r="10" fill="url(#tcorePowerGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="190" y="288" fill="#34d399" fontSize="12" fontWeight="bold">{speedup}x Speedup</text>

        {/* Precision mode indicators at absolute y=268 */}
        <text x="310" y="268" fill="#94a3b8" fontSize="11">Precision:</text>
        {(['fp32', 'fp16', 'int8'] as const).map((p, i) => {
          const isSelected = precision === p;
          const glowId = p === 'fp32' ? 'tcoreFP32Glow' : p === 'fp16' ? 'tcoreFP16Glow' : 'tcoreINT8Glow';
          const color = p === 'fp32' ? '#f472b6' : p === 'fp16' ? '#a78bfa' : '#4ade80';
          const px = 365 + i * 35;
          return (
            <g key={p}>
              <rect
                x={px}
                y="270"
                width="30"
                height="20"
                rx="4"
                fill={isSelected ? `url(#${glowId})` : '#1e293b'}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1}
                filter={isSelected ? 'url(#tcoreSubtleGlow)' : undefined}
              />
              <text x={px + 15} y="283" textAnchor="middle" fill={isSelected ? '#fff' : color} fontSize="11" fontWeight="bold">
                {p.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM STATS PANEL - absolute coordinates (translate: x+30, y+320)
        ═══════════════════════════════════════════════════════════════════════ */}
        {/* Stats panel background */}
        <rect x="20" y="315" width="660" height="90" rx="8" fill="url(#tcoreChipHousing)" stroke="#334155" strokeWidth="1" />

        {/* Current operation info at absolute y=346 */}
        <text x="30" y="346" fill="#94a3b8" fontSize="11">Matrix Size:</text>
        <text x="110" y="346" fill="#e2e8f0" fontSize="11" fontWeight="bold">{matrixSize}x{matrixSize}</text>
        <text x="165" y="346" fill="#94a3b8" fontSize="11">Operations:</text>
        <text x="245" y="346" fill="#e2e8f0" fontSize="11" fontWeight="bold">{(matrixSize * matrixSize * matrixSize * 2).toLocaleString()}</text>
        <text x="380" y="346" fill="#94a3b8" fontSize="11">Clock Cycles:</text>
        <text x="470" y="346" fill="#22d3ee" fontSize="11" fontWeight="bold">1 (fused)</text>

        {/* Progress bar at absolute y=367 */}
        <text x="30" y="367" fill="#94a3b8" fontSize="11">Computation Progress:</text>
        <rect x="160" y="357" width="380" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect
          x="162"
          y="359"
          width={Math.max(0, computeProgress * 3.76)}
          height="12"
          rx="2"
          fill="url(#tcorePerfBar)"
          filter={computeProgress > 0 ? 'url(#tcoreSubtleGlow)' : undefined}
        />
        <text x="560" y="368" fill="#34d399" fontSize="11" fontWeight="bold">{computeProgress.toFixed(0)}%</text>

        {/* Key insights at absolute y=392 */}
        <rect x="30" y="380" width="200" height="18" rx="4" fill="#1e1033" stroke="#8b5cf6" strokeWidth="0.5" />
        <text x="40" y="392" fill="#c084fc" fontSize="11">SIMD: 1 instruction, many data</text>
        <rect x="240" y="380" width="200" height="18" rx="4" fill="#0c1929" stroke="#3b82f6" strokeWidth="0.5" />
        <text x="250" y="392" fill="#60a5fa" fontSize="11">Systolic: Data reuse maximized</text>
        <rect x="450" y="380" width="210" height="18" rx="4" fill="#052e16" stroke="#10b981" strokeWidth="0.5" />
        <text x="460" y="392" fill="#34d399" fontSize="11">FMA: Multiply + Add in 1 cycle</text>

        {/* Absolute-coordinate labels - outside all transform groups for correct positioning */}
        <text x="575" y="63" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Systolic Array</text>
        <line x1="20" y1="50" x2="20" y2="400" stroke="#374151" strokeWidth="1" strokeDasharray="3,4" opacity="0.3" />
        <text x="15" y="50" textAnchor="end" fill="#64748b" fontSize="11">High</text>
        <text x="12" y="200" textAnchor="end" fill="#64748b" fontSize="11">Med</text>
        <text x="15" y="390" textAnchor="end" fill="#64748b" fontSize="11">Low</text>
        <text x="350" y="415" textAnchor="middle" fill="#64748b" fontSize="11">Matrix Operations → Throughput</text>
        <circle cx="350" cy="390" r="4" fill="#10b981" opacity="0.5" />
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
    transition: 'all 0.2s ease-in-out' as const,
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
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #059669 100%)` : 'rgba(255,255,255,0.1)',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, #0d1b2e 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              How Do AI Chips Do Matrix Math So Fast?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: '400' }}>
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
        {renderBottomBar(true, 'Begin: Make a Prediction')}
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
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderTensorCoreVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

          <div>
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
                style={{ width: '100%', height: '24px', WebkitAppearance: 'none' as const, touchAction: 'pan-y', accentColor: '#10b981' }}
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
              border: `1px solid ${colors.border}`,
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>What the Visualization Shows:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: '400' }}>
                Systolic array — PEs where data flows like waves. Each PE performs fused multiply-add (D = A × B + C) in one clock cycle. When you increase matrix size, operations grow cubically but tensor cores stay parallel — this directly affects throughput.
              </p>
            </div>
            <div style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, rgba(16,185,129,0.1) 100%)`,
              padding: '14px',
              borderRadius: '8px',
              marginTop: '12px',
              border: `1px solid ${colors.accent}40`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                <strong>Why this matters:</strong> Every transformer attention layer, convolution, and neural network layer is matrix multiplication. Tensor cores achieve 2000+ TFLOPS for FP16 — enabling AI at scale.
              </p>
            </div>
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
              As you observed in the experiment, what happened in the visualization was remarkable.
              Your prediction was tested: tensor cores use systolic arrays - grids of processing elements that perform
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

          {/* Precision comparison graphic (no sliders) */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 8px' }}>
            <svg viewBox="0 0 400 160" style={{ width: '100%', maxWidth: '400px', borderRadius: '10px' }}>
              <defs>
                <linearGradient id="precGradA" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
                <linearGradient id="precGradB" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="precGradC" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <filter id="precGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect x="0" y="0" width="400" height="160" fill="#0f172a" rx="10" />
              <text x="200" y="20" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">Precision vs Throughput</text>
              {/* Grid lines */}
              {[40,80,120,160,200].map(gx => (
                <line key={gx} x1={60 + gx} y1={35} x2={60 + gx} y2={115} stroke="#374151" strokeDasharray="3,3" opacity={0.5} />
              ))}
              {/* FP32 bar */}
              <rect x="60" y="38" width="80" height="22" fill="url(#precGradA)" rx="4" />
              <text x="55" y="53" textAnchor="end" fill="#c084fc" fontSize="11" fontWeight="bold">FP32</text>
              <text x="145" y="53" fill="#f8fafc" fontSize="11">1x</text>
              {/* FP16 bar */}
              <rect x="60" y="68" width="160" height="22" fill="url(#precGradB)" rx="4" />
              <text x="55" y="83" textAnchor="end" fill="#60a5fa" fontSize="11" fontWeight="bold">FP16</text>
              <text x="225" y="83" fill="#f8fafc" fontSize="11">2x</text>
              {/* INT8 bar */}
              <rect x="60" y="98" width="320" height="22" fill="url(#precGradC)" rx="4" filter="url(#precGlow)" />
              <text x="55" y="113" textAnchor="end" fill="#34d399" fontSize="11" fontWeight="bold">INT8</text>
              <text x="385" y="113" fill="#f8fafc" fontSize="11">4x</text>
              {/* Axis labels */}
              <text x="60" y="135" fill="#94a3b8" fontSize="11">Low</text>
              <text x="300" y="135" fill="#94a3b8" fontSize="11">Throughput</text>
              <text x="380" y="135" fill="#94a3b8" fontSize="11">High</text>
            </svg>
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
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderTensorCoreVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

          <div>
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
      <TransferPhaseView
        conceptName="Tensor Core"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

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
          {/* Always-visible Got It button */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={goNext}
              style={{
                ...buttonStyle,
                background: transferCompleted.size >= 4 ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : 'rgba(255,255,255,0.1)',
                color: 'white',
                padding: '14px 36px',
                fontSize: '15px',
              }}
            >
              {transferCompleted.size >= 4 ? 'Got It — Take the Test' : `Complete ${4 - transferCompleted.size} more to continue`}
            </button>
          </div>
        </div>
        {renderBottomBar(false, '')}
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
              <span style={{ color: colors.textSecondary }}>Question {currentTestIndex + 1} of {totalQuestions}</span>
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
