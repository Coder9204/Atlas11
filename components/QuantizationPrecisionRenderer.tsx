'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface QuantizationPrecisionRendererProps {
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
  twist_play: 'Sensitivity Lab',
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
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  fp32: '#3b82f6',
  fp16: '#8b5cf6',
  int8: '#22c55e',
  int4: '#f97316',
};

// Precision specs
const PRECISION_SPECS = {
  FP32: { bits: 32, range: '1.2e-38 to 3.4e38', memoryRatio: 1, speedRatio: 1, color: colors.fp32 },
  FP16: { bits: 16, range: '6.1e-5 to 65504', memoryRatio: 0.5, speedRatio: 2, color: colors.fp16 },
  INT8: { bits: 8, range: '-128 to 127', memoryRatio: 0.25, speedRatio: 4, color: colors.int8 },
  INT4: { bits: 4, range: '-8 to 7', memoryRatio: 0.125, speedRatio: 8, color: colors.int4 },
};

const TEST_QUESTIONS = [
  // Q1: Core Concept - Quantization Basics (Easy)
  {
    scenario: "A machine learning engineer wants to deploy a 7-billion parameter model trained in FP32 to a mobile device with limited memory.",
    question: "What is the primary benefit of quantizing the model from FP32 to INT8?",
    options: [
      { id: 'speed', label: "The model will train faster on the mobile device" },
      { id: 'memory', label: "The model will use 4x less memory (from 28GB to 7GB)", correct: true },
      { id: 'accuracy', label: "The model will become more accurate" },
      { id: 'features', label: "The model will gain new capabilities" },
    ],
    explanation: "Quantization from FP32 (32 bits) to INT8 (8 bits) reduces memory by 4x. A 7B parameter model needs 28GB in FP32 but only 7GB in INT8. This is the primary reason quantization enables deployment on memory-constrained devices."
  },
  // Q2: FP32 vs FP16 vs INT8 Comparison (Medium)
  {
    scenario: "You're comparing different numerical precision formats: FP32 uses 32 bits with 1 sign, 8 exponent, and 23 mantissa bits. FP16 uses 16 bits, and INT8 uses 8 bits for integers.",
    question: "Why is FP32 typically required during model training but not inference?",
    options: [
      { id: 'hardware', label: "Training hardware only supports FP32" },
      { id: 'gradients', label: "Gradient accumulation over millions of steps needs high precision to avoid drift", correct: true },
      { id: 'speed', label: "FP32 training is faster than lower precision" },
      { id: 'memory', label: "Training requires more memory than inference" },
    ],
    explanation: "During training, gradients are accumulated over millions of steps. Small errors in low precision compound over time, causing training instability or divergence. Inference only does a single forward pass, so small quantization errors don't accumulate."
  },
  // Q3: Quantization Effects on Accuracy (Medium)
  {
    scenario: "A research team quantizes their language model from FP32 to INT8 using post-training quantization. They're worried about accuracy degradation.",
    question: "Which statement about INT8 quantization accuracy is most accurate?",
    options: [
      { id: 'always_bad', label: "INT8 always causes significant accuracy loss (>5%)" },
      { id: 'no_loss', label: "INT8 produces identical outputs to FP32" },
      { id: 'typically_small', label: "INT8 typically causes minimal accuracy loss (<1%) when properly calibrated", correct: true },
      { id: 'random', label: "Accuracy loss is random and unpredictable" },
    ],
    explanation: "With proper calibration, INT8 quantization typically maintains accuracy within 1% of the original model. Neural networks are surprisingly robust to reduced precision because the weights cluster around common values and small errors average out across millions of parameters."
  },
  // Q4: Layer Sensitivity (Medium-Hard)
  {
    scenario: "A ML engineer is implementing mixed-precision quantization, where different layers use different bit widths. They need to decide which layers to keep at higher precision.",
    question: "Which layers are typically MOST sensitive to quantization errors?",
    options: [
      { id: 'middle', label: "Middle layers, because they contain the most parameters" },
      { id: 'first_last', label: "First and last layers, because errors there directly impact input/output quality", correct: true },
      { id: 'all_same', label: "All layers are equally sensitive" },
      { id: 'random_layers', label: "Sensitivity is random and varies per model" },
    ],
    explanation: "First layers process raw input data, so quantization errors are amplified through the network. Last layers produce final outputs, so errors directly affect predictions. Middle layers have redundancy where errors can average out. This is why mixed-precision keeps first/last layers at FP16 while quantizing middle layers to INT8/INT4."
  },
  // Q5: Dynamic Range Considerations (Hard)
  {
    scenario: "INT8 can only represent values from -128 to 127, while neural network weights might range from -0.5 to +2.3. Calibration is needed to map weight distributions to the INT8 range.",
    question: "What is the purpose of calibration data in post-training quantization?",
    options: [
      { id: 'training', label: "To retrain the model with quantized weights" },
      { id: 'scale', label: "To find optimal scale factors that map weight distributions to INT8 range with minimal error", correct: true },
      { id: 'prune', label: "To identify which weights can be removed" },
      { id: 'speed', label: "To measure how fast the quantized model runs" },
    ],
    explanation: "Calibration runs representative data through the model to observe the actual range of activations. It then computes scale factors that map these ranges to INT8 (-128 to 127) with minimal clipping. Bad calibration leads to either wasted dynamic range or clipped outliers."
  },
  // Q6: Mixed Precision Training (Medium)
  {
    scenario: "NVIDIA's Tensor Cores can perform matrix operations in FP16 much faster than FP32. Many modern training pipelines use 'mixed precision training' to speed up training.",
    question: "How does mixed precision training maintain accuracy while using FP16?",
    options: [
      { id: 'only_fp16', label: "It uses FP16 everywhere and accepts small accuracy loss" },
      { id: 'master_weights', label: "It keeps FP32 master weights while computing forward/backward passes in FP16", correct: true },
      { id: 'int8', label: "It uses INT8 for most operations" },
      { id: 'no_training', label: "Mixed precision is only for inference, not training" },
    ],
    explanation: "Mixed precision training computes forward and backward passes in FP16 for speed, but maintains FP32 'master weights' that accumulate gradients. This gives the speed benefits of FP16 while preserving the precision needed for stable gradient accumulation."
  },
  // Q7: Inference Optimization (Medium)
  {
    scenario: "Tesla's Full Self-Driving computer needs to process camera feeds in real-time. Every millisecond of latency matters at highway speeds. The FSD chip is optimized for INT8 operations.",
    question: "Why do inference accelerators like Tesla's FSD chip use INT8 instead of FP32?",
    options: [
      { id: 'accuracy', label: "INT8 produces more accurate results than FP32" },
      { id: 'throughput', label: "INT8 operations are 4x smaller and faster, enabling real-time performance", correct: true },
      { id: 'training', label: "The models were originally trained in INT8" },
      { id: 'cost', label: "INT8 chips are cheaper to manufacture" },
    ],
    explanation: "INT8 operations use 4x less memory bandwidth and can be executed 2-8x faster on specialized hardware. Tesla's FSD chip achieves 144 TOPS (trillion operations per second) in INT8. This throughput is essential for processing multiple camera feeds at 36 FPS with low latency."
  },
  // Q8: Quantization-Aware Training (Hard)
  {
    scenario: "There are two main approaches to quantization: Post-Training Quantization (PTQ) applies quantization after training, while Quantization-Aware Training (QAT) simulates quantization during training.",
    question: "Why does QAT typically produce better quantized models than PTQ?",
    options: [
      { id: 'faster', label: "QAT is faster to apply than PTQ" },
      { id: 'learns', label: "QAT allows the model to learn weight values that are robust to quantization errors", correct: true },
      { id: 'no_calibration', label: "QAT doesn't require any calibration" },
      { id: 'same', label: "QAT and PTQ produce identical results" },
    ],
    explanation: "During QAT, the model experiences simulated quantization noise during training and learns to compensate. Weights naturally move toward values that quantize well, and the model becomes inherently robust to precision loss. PTQ must work with weights optimized for FP32, which may not quantize optimally."
  },
  // Q9: Dynamic vs Static Quantization (Medium)
  {
    scenario: "There are two types of quantization: Static quantization uses fixed scale factors determined during calibration, while dynamic quantization computes scale factors at runtime based on actual input values.",
    question: "When is dynamic quantization typically used instead of static quantization?",
    options: [
      { id: 'training', label: "During model training" },
      { id: 'variable', label: "When activation ranges vary significantly across different inputs", correct: true },
      { id: 'always', label: "Dynamic is always better than static" },
      { id: 'hardware', label: "When specialized quantization hardware is unavailable" },
    ],
    explanation: "Dynamic quantization calculates scale factors at runtime, adapting to each input's actual range. This is useful when activation ranges vary widely between inputs (like variable-length text). Static quantization is faster but assumes fixed ranges determined during calibration."
  },
  // Q10: Extreme Quantization (INT4/NF4) (Hard)
  {
    scenario: "Running GPT-4 would require ~1.7TB of memory in FP32. Techniques like GPTQ and QLoRA use 4-bit quantization (INT4/NF4) to fit large models on consumer GPUs.",
    question: "How do 4-bit quantization techniques like GPTQ achieve less than 1% quality loss despite extreme compression?",
    options: [
      { id: 'simple', label: "They simply round weights to the nearest 4-bit value" },
      { id: 'smart', label: "They use sophisticated algorithms to minimize reconstruction error and preserve important weights", correct: true },
      { id: 'impossible', label: "4-bit quantization always causes significant quality loss" },
      { id: 'subset', label: "They only quantize a small subset of the model" },
    ],
    explanation: "Techniques like GPTQ use second-order information (Hessian) to quantize weights in an order that minimizes cumulative error. NF4 (Normal Float 4) uses non-uniform quantization levels matched to the typical Gaussian distribution of neural network weights. These smart approaches preserve model quality despite 8x compression."
  },
];

const TRANSFER_APPS = [
  {
    title: 'Mobile AI (Smartphones)',
    description: 'Your phone runs AI models in INT8 or INT4. The A17/Snapdragon chips have dedicated hardware for low-precision math.',
    insight: 'iPhone neural engine: INT8',
  },
  {
    title: 'ChatGPT/LLM Inference',
    description: 'Running GPT-4 would need 1.7TB of memory in FP32. INT4 quantization makes it fit in 200GB across 8 GPUs.',
    insight: 'GPTQ: 4-bit with <1% quality loss',
  },
  {
    title: 'Self-Driving Cars',
    description: 'Tesla FSD runs INT8 on custom hardware. Every millisecond of latency matters at highway speeds.',
    insight: 'FSD chip: 144 TOPS @ INT8',
  },
  {
    title: 'Real-time Image Generation',
    description: 'Stable Diffusion on consumer GPUs uses FP16. INT8 versions run on phones generating images in seconds.',
    insight: 'SD on iPhone: INT8 CoreML',
  },
];

const QuantizationPrecisionRenderer: React.FC<QuantizationPrecisionRendererProps> = ({
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
  const [precision, setPrecision] = useState<keyof typeof PRECISION_SPECS>('FP32');
  const [modelSize, setModelSize] = useState(7); // billion parameters
  const [showQuantizationError, setShowQuantizationError] = useState(true);
  const [layerSensitivity, setLayerSensitivity] = useState<'input' | 'middle' | 'output'>('middle');
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

  // Example values for visualization
  const [originalValue] = useState(0.3927);
  const quantizedValues = {
    FP32: 0.3927,
    FP16: 0.3926,
    INT8: 0.39,
    INT4: 0.375,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const spec = PRECISION_SPECS[precision];
  const memoryGB = (modelSize * 4 * spec.memoryRatio).toFixed(1); // 4 bytes per FP32 param
  const quantizationError = Math.abs(originalValue - quantizedValues[precision]) / originalValue * 100;
  const throughputMultiplier = spec.speedRatio;

  // Layer sensitivity affects quality loss
  const sensitivityMultiplier = layerSensitivity === 'input' ? 3 : layerSensitivity === 'output' ? 2.5 : 1;
  const effectiveQualityLoss = Math.min(10, quantizationError * sensitivityMultiplier);

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

    // Binary representation visualization with stable pattern based on precision
    const getBinaryPattern = (precisionType: string) => {
      // Use a stable pattern based on precision type for consistency
      const patterns: Record<string, boolean[]> = {
        'FP32': [true,false,true,true,false,false,true,false,true,true,true,false,false,true,false,true,
                 false,true,true,false,true,false,false,true,true,false,true,true,false,false,true,false],
        'FP16': [true,false,true,true,false,false,true,false,true,true,true,false,false,true,false,true],
        'INT8': [true,false,true,true,false,false,true,false],
        'INT4': [true,false,true,true],
      };
      return patterns[precisionType] || [];
    };

    const bits = getBinaryPattern(precision);
    const bitWidth = Math.min(16, 500 / Math.max(bits.length, 1));
    const bitSpacing = 3;

    // Calculate bit section colors for FP32 breakdown
    const getBitColor = (index: number, totalBits: number, precType: string) => {
      if (precType === 'FP32') {
        if (index === 0) return 'url(#qprecSignBit)'; // Sign bit
        if (index < 9) return 'url(#qprecExponentBit)'; // Exponent (8 bits)
        return 'url(#qprecMantissaBit)'; // Mantissa (23 bits)
      }
      if (precType === 'FP16') {
        if (index === 0) return 'url(#qprecSignBit)';
        if (index < 6) return 'url(#qprecExponentBit)';
        return 'url(#qprecMantissaBit)';
      }
      // INT8/INT4 - all same
      return `url(#qprec${precType}Gradient)`;
    };

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ maxHeight: '100%' }}
      >
        <defs>
          {/* Premium lab background gradient */}
          <linearGradient id="qprecLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* FP32 precision gradient - deep blue */}
          <linearGradient id="qprecFP32Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* FP16 precision gradient - purple */}
          <linearGradient id="qprecFP16Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="25%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="75%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          {/* INT8 precision gradient - emerald */}
          <linearGradient id="qprecINT8Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="25%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* INT4 precision gradient - orange */}
          <linearGradient id="qprecINT4Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="25%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Sign bit gradient - red accent */}
          <linearGradient id="qprecSignBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Exponent bit gradient - amber */}
          <linearGradient id="qprecExponentBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Mantissa bit gradient - cyan */}
          <linearGradient id="qprecMantissaBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          {/* Memory bar gradient */}
          <linearGradient id="qprecMemoryBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Speed bar gradient */}
          <linearGradient id="qprecSpeedBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>

          {/* Accuracy indicator - radial glow */}
          <radialGradient id="qprecAccuracyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="40%" stopColor="#16a34a" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#15803d" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#166534" stopOpacity="0" />
          </radialGradient>

          {/* Performance indicator - radial glow */}
          <radialGradient id="qprecPerformanceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>

          {/* Panel glass effect */}
          <linearGradient id="qprecPanelGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </linearGradient>

          {/* Metal frame gradient */}
          <linearGradient id="qprecMetalFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Bit glow filter */}
          <filter id="qprecBitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Value display glow */}
          <filter id="qprecValueGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Panel shadow filter */}
          <filter id="qprecPanelShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feOffset dx="2" dy="2" result="offsetBlur" />
            <feMerge>
              <feMergeNode in="offsetBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Indicator pulse filter */}
          <filter id="qprecPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle grid pattern */}
          <pattern id="qprecGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#qprecLabBg)" />
        <rect width={width} height={height} fill="url(#qprecGrid)" />

        {/* Main Title Panel */}
        <g transform="translate(20, 15)">
          <rect x="0" y="0" width="660" height="45" rx="8" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
          <text x="330" y="28" textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="bold">
            {precision}: {spec.bits}-bit Numerical Precision
          </text>
          <rect x="10" y="38" width="640" height="2" rx="1" fill={`url(#qprec${precision}Gradient)`} opacity="0.6" />
        </g>

        {/* Bit Representation Panel */}
        <g transform="translate(20, 70)">
          <rect x="0" y="0" width="450" height="120" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" filter="url(#qprecPanelShadow)" />
          <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" textTransform="uppercase" letterSpacing="0.1em">
            Binary Representation
          </text>

          {/* Bit boxes with color coding */}
          <g transform="translate(15, 35)">
            {bits.map((bit, i) => (
              <g key={i}>
                <rect
                  x={i * (bitWidth + bitSpacing)}
                  y="0"
                  width={bitWidth}
                  height="35"
                  rx="3"
                  fill={bit ? getBitColor(i, bits.length, precision) : 'rgba(255,255,255,0.05)'}
                  stroke={bit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth="1"
                  filter={bit ? 'url(#qprecBitGlow)' : undefined}
                />
                <text
                  x={i * (bitWidth + bitSpacing) + bitWidth / 2}
                  y="23"
                  textAnchor="middle"
                  fill={bit ? '#ffffff' : '#475569'}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {bit ? '1' : '0'}
                </text>
              </g>
            ))}
          </g>

          {/* Bit section legend for floating point */}
          {(precision === 'FP32' || precision === 'FP16') && (
            <g transform="translate(15, 85)">
              <rect x="0" y="0" width="10" height="10" rx="2" fill="url(#qprecSignBit)" />
              <text x="14" y="9" fill="#94a3b8" fontSize="8">Sign</text>
              <rect x="50" y="0" width="10" height="10" rx="2" fill="url(#qprecExponentBit)" />
              <text x="64" y="9" fill="#94a3b8" fontSize="8">Exponent</text>
              <rect x="120" y="0" width="10" height="10" rx="2" fill="url(#qprecMantissaBit)" />
              <text x="134" y="9" fill="#94a3b8" fontSize="8">Mantissa</text>
            </g>
          )}

          {/* Bit count info */}
          <text x="435" y="60" textAnchor="end" fill="#64748b" fontSize="10">
            {bits.length} bits = {Math.pow(2, bits.length).toLocaleString()} values
          </text>
        </g>

        {/* Precision Stats Panel */}
        <g transform="translate(480, 70)">
          <rect x="0" y="0" width="200" height="120" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" filter="url(#qprecPanelShadow)" />
          <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="0.1em">
            PRECISION SPECS
          </text>

          <text x="15" y="48" fill="#64748b" fontSize="10">Dynamic Range:</text>
          <text x="185" y="48" textAnchor="end" fill={spec.color} fontSize="10" fontWeight="bold">{spec.range}</text>

          <text x="15" y="70" fill="#64748b" fontSize="10">Memory Ratio:</text>
          <text x="185" y="70" textAnchor="end" fill="#10b981" fontSize="12" fontWeight="bold">{(spec.memoryRatio * 100).toFixed(0)}%</text>

          <text x="15" y="92" fill="#64748b" fontSize="10">Speed Multiplier:</text>
          <text x="185" y="92" textAnchor="end" fill="#06b6d4" fontSize="12" fontWeight="bold">{spec.speedRatio}x</text>

          <rect x="10" y="102" width="180" height="8" rx="4" fill="rgba(255,255,255,0.05)" />
          <rect x="10" y="102" width={180 * spec.memoryRatio} height="8" rx="4" fill={`url(#qprec${precision}Gradient)`} />
        </g>

        {/* Value Comparison Panel */}
        <g transform="translate(20, 200)">
          <rect x="0" y="0" width="320" height="100" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" filter="url(#qprecPanelShadow)" />
          <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="0.1em">
            VALUE COMPARISON
          </text>

          <g transform="translate(15, 40)">
            <text x="0" y="0" fill="#64748b" fontSize="11">Original (FP32):</text>
            <text x="180" y="0" fill="#3b82f6" fontSize="14" fontWeight="bold" filter="url(#qprecValueGlow)">{originalValue.toFixed(6)}</text>

            <text x="0" y="28" fill="#64748b" fontSize="11">Quantized ({precision}):</text>
            <text x="180" y="28" fill={spec.color} fontSize="14" fontWeight="bold" filter="url(#qprecValueGlow)">
              {quantizedValues[precision].toFixed(precision === 'INT4' ? 3 : precision === 'INT8' ? 4 : 6)}
            </text>

            {showQuantizationError && (
              <>
                <text x="0" y="56" fill="#64748b" fontSize="11">Quantization Error:</text>
                <text
                  x="180"
                  y="56"
                  fill={quantizationError > 1 ? colors.warning : colors.success}
                  fontSize="14"
                  fontWeight="bold"
                  filter="url(#qprecValueGlow)"
                >
                  {quantizationError.toFixed(3)}%
                </text>
              </>
            )}
          </g>
        </g>

        {/* Accuracy vs Performance Tradeoff Indicators */}
        <g transform="translate(350, 200)">
          <rect x="0" y="0" width="330" height="100" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" filter="url(#qprecPanelShadow)" />
          <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="0.1em">
            ACCURACY / PERFORMANCE TRADEOFF
          </text>

          {/* Accuracy indicator */}
          <g transform="translate(30, 55)">
            <circle cx="25" cy="15" r="22" fill="url(#qprecAccuracyGlow)" filter="url(#qprecPulse)" opacity={1 - (quantizationError / 5)}>
              <animate attributeName="opacity" values={`${1 - quantizationError/5};${0.7 - quantizationError/5};${1 - quantizationError/5}`} dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="25" cy="15" r="15" fill="#15803d" stroke="#22c55e" strokeWidth="2" />
            <text x="25" y="20" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              {(100 - quantizationError).toFixed(0)}%
            </text>
            <text x="25" y="50" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold">Accuracy</text>
          </g>

          {/* Performance indicator */}
          <g transform="translate(120, 55)">
            <circle cx="25" cy="15" r="22" fill="url(#qprecPerformanceGlow)" filter="url(#qprecPulse)" opacity={spec.speedRatio / 10}>
              <animate attributeName="opacity" values={`${spec.speedRatio/10};${spec.speedRatio/12};${spec.speedRatio/10}`} dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="25" cy="15" r="15" fill="#92400e" stroke="#f59e0b" strokeWidth="2" />
            <text x="25" y="20" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              {spec.speedRatio}x
            </text>
            <text x="25" y="50" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">Speed</text>
          </g>

          {/* Tradeoff arrow indicator */}
          <g transform="translate(200, 40)">
            <line x1="0" y1="25" x2="100" y2="25" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
            <polygon points="100,25 90,20 90,30" fill="#475569" />
            <text x="50" y="15" textAnchor="middle" fill="#64748b" fontSize="8">Lower precision</text>
            <text x="50" y="55" textAnchor="middle" fill="#64748b" fontSize="8">Better performance</text>
          </g>
        </g>

        {/* Memory Footprint Visualization */}
        <g transform="translate(20, 310)">
          <rect x="0" y="0" width="660" height="80" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" filter="url(#qprecPanelShadow)" />
          <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="0.1em">
            MEMORY FOOTPRINT ({modelSize}B Parameter Model)
          </text>

          {/* Memory bars for all precisions */}
          <g transform="translate(15, 35)">
            {(['FP32', 'FP16', 'INT8', 'INT4'] as const).map((p, i) => {
              const pSpec = PRECISION_SPECS[p];
              const memGB = (modelSize * 4 * pSpec.memoryRatio).toFixed(1);
              const barWidth = 400 * pSpec.memoryRatio;
              const isActive = p === precision;
              return (
                <g key={p} transform={`translate(0, ${i * 11})`}>
                  <text x="0" y="8" fill={isActive ? pSpec.color : '#64748b'} fontSize="9" fontWeight={isActive ? 'bold' : 'normal'}>{p}</text>
                  <rect x="40" y="0" width="400" height="8" rx="2" fill="rgba(255,255,255,0.05)" />
                  <rect
                    x="40"
                    y="0"
                    width={barWidth}
                    height="8"
                    rx="2"
                    fill={`url(#qprec${p}Gradient)`}
                    opacity={isActive ? 1 : 0.5}
                    filter={isActive ? 'url(#qprecBitGlow)' : undefined}
                  />
                  <text x="450" y="8" fill={isActive ? '#f8fafc' : '#64748b'} fontSize="9" fontWeight={isActive ? 'bold' : 'normal'}>
                    {memGB} GB
                  </text>
                  {isActive && (
                    <circle cx="500" cy="4" r="4" fill={pSpec.color}>
                      <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* Savings indicator */}
          <g transform="translate(540, 35)">
            <rect x="0" y="0" width="105" height="35" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="1" />
            <text x="52" y="15" textAnchor="middle" fill="#10b981" fontSize="9">Memory Saved</text>
            <text x="52" y="30" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">
              {((1 - spec.memoryRatio) * 100).toFixed(0)}%
            </text>
          </g>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Precision Format
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(PRECISION_SPECS) as Array<keyof typeof PRECISION_SPECS>).map(p => (
            <button
              key={p}
              onClick={() => setPrecision(p)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: precision === p ? `2px solid ${PRECISION_SPECS[p].color}` : '1px solid rgba(255,255,255,0.2)',
                background: precision === p ? `${PRECISION_SPECS[p].color}22` : 'transparent',
                color: PRECISION_SPECS[p].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize}B parameters
        </label>
        <input
          type="range"
          min={1}
          max={70}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px' }}>
          <span>1B (Phi-2)</span>
          <span>7B (LLaMA)</span>
          <span>70B (LLaMA-70B)</span>
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Memory Required</div>
          <div style={{ color: spec.color, fontSize: '24px', fontWeight: 'bold' }}>{memoryGB} GB</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Speed Boost</div>
          <div style={{ color: colors.success, fontSize: '24px', fontWeight: 'bold' }}>{throughputMultiplier}x</div>
        </div>
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
          Quantization
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
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            Quantization and Precision
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            How can AI run on 8-bit numbers when training uses 32-bit?
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
            A 7-billion parameter model needs 28GB of memory in FP32. But your phone's AI chip
            only has 8GB. How does AI run everywhere from phones to watches?
          </p>
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              The secret: Quantization - trading precision for speed and memory
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              FP32 (28GB) to INT8 (7GB) to INT4 (3.5GB)
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'crash', text: 'Using fewer bits makes the AI completely wrong' },
      { id: 'identical', text: 'INT8 and FP32 produce identical outputs' },
      { id: 'tradeoff', text: 'Fewer bits = small accuracy loss, big memory/speed gains' },
      { id: 'random', text: 'Results become random noise with fewer bits' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens when you reduce numerical precision from 32 bits to 8 bits?
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
                  background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : colors.bgCard,
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
              background: prediction === 'tradeoff' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'tradeoff' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'tradeoff' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'tradeoff' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Quantization trades small accuracy losses (typically less than 1%) for 4x memory reduction
                and 2-8x speed improvements. Neural networks are surprisingly robust to reduced precision!
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
          Quantization Lab
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
            <li>FP32 to FP16: 50% memory, 2x speed, minimal quality loss</li>
            <li>FP32 to INT8: 25% memory, 4x speed, slight quality loss</li>
            <li>FP32 to INT4: 12.5% memory, 8x speed, noticeable but usable</li>
            <li>Larger models are MORE robust to quantization</li>
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
          Understanding Quantization
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp32, marginBottom: '8px' }}>FP32 (Training)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              32 bits = 1 sign + 8 exponent + 23 mantissa. Used for training because
              gradients need high precision to accumulate correctly over millions of steps.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>FP16/BF16 (Mixed Precision)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              16 bits with different exponent/mantissa trade-offs. BF16 keeps FP32's range
              but reduces precision - great for training with 2x speedup.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int8, marginBottom: '8px' }}>INT8 (Inference)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              8-bit integers need calibration to map the weight distribution.
              Achieves 4x compression with minimal accuracy loss when done right.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int4, marginBottom: '8px' }}>INT4/NF4 (Extreme)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              4-bit quantization using techniques like GPTQ or AWQ. Enables 70B models
              to run on consumer GPUs with surprisingly good quality.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Layer Sensitivity')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'all_same', text: 'All layers can be quantized equally' },
      { id: 'first_last', text: 'First and last layers need higher precision' },
      { id: 'middle', text: 'Only middle layers can be quantized' },
      { id: 'random', text: 'Sensitivity is random across layers' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Layer Sensitivity
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Some layers are more sensitive to quantization than others. Which ones?
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
              background: twistPrediction === 'first_last' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'first_last' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'first_last' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                The first layer processes raw input (small errors amplify) and the last layer
                produces final outputs (errors directly visible). Middle layers are more forgiving
                because errors can average out through many subsequent operations.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Layer Sensitivity')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Layer Sensitivity Lab
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '12px' }}>
            Select Layer Type:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['input', 'middle', 'output'] as const).map(layer => (
              <button
                key={layer}
                onClick={() => setLayerSensitivity(layer)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: layerSensitivity === layer ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: layerSensitivity === layer ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {renderVisualization()}

        <div style={{
          background: layerSensitivity === 'middle' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${layerSensitivity === 'middle' ? colors.success : colors.error}`
        }}>
          <h3 style={{ color: layerSensitivity === 'middle' ? colors.success : colors.error, marginBottom: '8px' }}>
            {layerSensitivity === 'input' && 'High Sensitivity - Keep FP16 or higher'}
            {layerSensitivity === 'middle' && 'Low Sensitivity - Safe for INT8/INT4'}
            {layerSensitivity === 'output' && 'High Sensitivity - Keep FP16 or higher'}
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {layerSensitivity === 'input' && 'Input layers process raw data. Small errors here propagate through the entire network.'}
            {layerSensitivity === 'middle' && 'Middle layers have redundancy. Errors average out across many parameters and operations.'}
            {layerSensitivity === 'output' && 'Output layers directly affect predictions. Errors here immediately impact model quality.'}
          </p>
          <p style={{ color: colors.warning, fontSize: '14px', marginTop: '8px' }}>
            Quality Impact: {effectiveQualityLoss.toFixed(1)}% (with {precision} quantization)
          </p>
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
          Mixed-Precision Strategy
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>Input/Output Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Keep at FP16 or higher. These layers are bottlenecks for quality.
              Often only 1-2% of total parameters.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Middle Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Safe for INT8 or even INT4. These contain 95%+ of parameters.
              Maximum memory savings with minimal quality impact.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Calibration is Key</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quantization needs calibration data to find the right scale factors.
              Running a few hundred samples through the model finds optimal mappings.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>QAT vs PTQ</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>Post-Training Quantization (PTQ):</strong> Fast, simple, good results.<br/>
              <strong>Quantization-Aware Training (QAT):</strong> Better quality but requires retraining.
            </p>
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
                background: 'rgba(168, 85, 247, 0.1)',
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
    const currentQ = TEST_QUESTIONS[currentTestIndex];

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
                {score === totalQuestions ? "Perfect! You've mastered quantization and precision!" :
                 score >= 9 ? 'Excellent! You deeply understand quantization concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - quantization takes time to master!'}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: colors.bgCard,
                    color: colors.textSecondary,
                    border: `1px solid rgba(255,255,255,0.2)`,
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => passed ? goNext() : goToPhase('hook')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
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

            {/* Question-by-Question Review */}
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
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>{q.question}</p>
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
                        background: 'rgba(168, 85, 247, 0.1)'
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
          </div>
        </div>
      );
    }

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
              Step 9 - Knowledge Test
            </p>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Question {currentTestIndex + 1} of {totalQuestions}
            </h2>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalQuestions }, (_, i) => {
                const answered = testAnswers[i] !== null;
                const correctOption = TEST_QUESTIONS[i].options.find(o => o.correct);
                const isCorrect = answered && testAnswers[i] === correctOption?.id;
                return (
                  <div
                    key={i}
                    style={{
                      height: '8px',
                      flex: 1,
                      borderRadius: '9999px',
                      background: i === currentTestIndex ? colors.warning :
                                  answered ? (isCorrect ? colors.success : colors.error) :
                                  'rgba(255,255,255,0.1)'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)'
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
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
              {currentQ.scenario}
            </p>
          </div>

          {/* Question */}
          <p style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: colors.textPrimary,
            lineHeight: 1.4
          }}>
            {currentQ.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = testAnswers[currentTestIndex] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    const newAnswers = [...testAnswers];
                    newAnswers[currentTestIndex] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: isSelected ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: isSelected ? 'rgba(168, 85, 247, 0.2)' : colors.bgCard,
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    background: isSelected ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: isSelected ? 'white' : colors.textSecondary
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: '14px', lineHeight: 1.5 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
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
                opacity: currentTestIndex === 0 ? 0.5 : 1,
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
                  fontWeight: 'bold',
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
                  fontWeight: 'bold',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  opacity: testAnswers.includes(null) ? 0.5 : 1,
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
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.int8})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Quantization Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand how AI models shrink without breaking
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>FP32/FP16/INT8/INT4 precision trade-offs</li>
            <li>Memory and speed benefits of quantization</li>
            <li>Layer sensitivity (first/last vs middle)</li>
            <li>Calibration and scale factors</li>
            <li>Mixed-precision strategies</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(168, 85, 247, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "Precision is expensive. Use only what you need."
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

export default QuantizationPrecisionRenderer;
