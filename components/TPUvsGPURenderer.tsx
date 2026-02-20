import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TPUvsGPURendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Mixed',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const realWorldApps = [
  {
    icon: '🔍',
    title: 'Google Search & AI',
    short: 'TPUs powering billions of searches daily',
    tagline: 'Custom silicon for web-scale AI',
    description: 'Google designed TPUs specifically for their massive AI workloads. TPUs power Search ranking, YouTube recommendations, Gmail spam filtering, and Google Assistant - processing queries in milliseconds.',
    connection: 'TPUs systolic arrays excel at the matrix multiplications in transformer models. Purpose-built silicon achieves 10x better efficiency than GPUs for inference.',
    howItWorks: 'TPU pods connect thousands of chips for training giant models. For inference, individual TPUs handle specific model types. bfloat16 precision balances accuracy with throughput.',
    stats: [
      { value: '275T', label: 'TPU v4 FLOPS', icon: '⚡' },
      { value: '10x', label: 'Efficiency vs GPU', icon: '📈' },
      { value: '1M+', label: 'Queries/sec capacity', icon: '🔍' }
    ],
    examples: ['Google Search', 'YouTube recommendations', 'Google Translate', 'AlphaFold'],
    companies: ['Google', 'DeepMind', 'Anthropic (Google Cloud)', 'Research labs'],
    futureImpact: 'TPU v5 and beyond will enable real-time AI video generation and multimodal understanding.',
    color: '#3B82F6'
  },
  {
    icon: '🎮',
    title: 'NVIDIA Gaming & AI Dual-Use',
    short: 'From gaming graphics to AI dominance',
    tagline: 'The accidental AI revolution',
    description: 'NVIDIA GPUs designed for gaming accidentally became perfect for AI. Their massively parallel architecture handles both ray tracing and neural network training with equal efficiency.',
    connection: 'GPUs evolved for graphics have thousands of cores doing parallel math - exactly what neural networks need. CUDA made them programmable for any parallel workload.',
    howItWorks: 'Tensor cores accelerate matrix ops alongside graphics cores. Memory bandwidth feeds data to thousands of parallel processors. CUDA software enables AI workloads.',
    stats: [
      { value: '16K+', label: 'CUDA cores (H100)', icon: '🔢' },
      { value: '80GB', label: 'HBM3 memory', icon: '💾' },
      { value: '$3T', label: 'NVIDIA market cap', icon: '💰' }
    ],
    examples: ['ChatGPT training', 'Stable Diffusion', 'Gaming', 'Scientific computing'],
    companies: ['NVIDIA', 'OpenAI', 'Meta AI', 'Every AI startup'],
    futureImpact: 'Grace Hopper superchips will unify CPU and GPU for next-generation AI systems.',
    color: '#76B900'
  },
  {
    icon: '🧠',
    title: 'Large Language Model Training',
    short: 'Choosing hardware for trillion-parameter models',
    tagline: 'Where hardware choices cost millions',
    description: 'Training GPT-4 class models requires thousands of GPUs or TPUs running for months. Hardware selection dramatically affects training cost, time, and model capability.',
    connection: 'Matrix multiplications in transformer attention scale quadratically with context length. Hardware must efficiently handle both compute and memory bandwidth.',
    howItWorks: 'Distributed training splits models across thousands of chips. TPUs excel at inference efficiency; GPUs offer more flexibility. Memory capacity limits model size per chip.',
    stats: [
      { value: '$100M+', label: 'GPT-4 training cost', icon: '💰' },
      { value: '25,000', label: 'GPUs for training', icon: '🖥️' },
      { value: '1.8T', label: 'GPT-4 parameters', icon: '🔢' }
    ],
    examples: ['GPT-4', 'Claude', 'Gemini', 'Llama'],
    companies: ['OpenAI', 'Anthropic', 'Google', 'Meta'],
    futureImpact: 'Specialized AI training chips will reduce costs 100x, democratizing frontier AI development.',
    color: '#8B5CF6'
  },
  {
    icon: '⚡',
    title: 'Edge AI Inference',
    short: 'Running AI where data lives',
    tagline: 'No cloud needed',
    description: 'Phones, cars, and IoT devices increasingly run AI locally. Specialized neural processing units (NPUs) bring TPU-like efficiency to edge devices, enabling private, low-latency inference.',
    connection: 'Edge NPUs use similar systolic array concepts as TPUs but at lower power. INT8 quantization maintains accuracy while dramatically reducing compute and memory needs.',
    howItWorks: 'Dedicated neural cores run optimized models while main CPU handles other tasks. Weight compression and quantization fit models in limited memory. Inference happens in milliseconds.',
    stats: [
      { value: '15', label: 'TOPS in iPhone NPU', icon: '📱' },
      { value: '5ms', label: 'On-device inference', icon: '⏱️' },
      { value: '<1W', label: 'Edge NPU power', icon: '🔋' }
    ],
    examples: ['iPhone Neural Engine', 'Google Tensor', 'Tesla FSD chip', 'Qualcomm Hexagon'],
    companies: ['Apple', 'Google', 'Qualcomm', 'Tesla'],
    futureImpact: 'Ubiquitous edge AI will enable always-on intelligent assistants that never send data to the cloud.',
    color: '#10B981'
  }
];

const TPUvsGPURenderer: React.FC<TPUvsGPURendererProps> = ({
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

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Simulation state
  const [batchSize, setBatchSize] = useState(32);
  const [modelSize, setModelSize] = useState(50); // percentage of max
  const [operationType, setOperationType] = useState<'matmul' | 'conv' | 'attention'>('matmul');
  const [showSystolicFlow, setShowSystolicFlow] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<Set<number>>(new Set());
  const [activeTransferApp, setActiveTransferApp] = useState(0);

  // Internal navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 50) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 100);
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

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        backgroundColor: colors.bgDark,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }} role="navigation" aria-label="Phase navigation">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                type="button"
                tabIndex={0}
                onClick={() => i <= currentIdx && goToPhase(p)}
                onKeyDown={(e) => e.key === 'Enter' && i <= currentIdx && goToPhase(p)}
                aria-label={phaseLabels[p]}
                aria-current={i === currentIdx ? 'step' : undefined}
                data-navigation-dot="true"
                style={{
                  height: '12px',
                  width: '12px',
                  borderRadius: '50%',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  padding: 0,
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
          disabled={!canBack}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #1d4ed8 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canProceed ? colors.textPrimary : colors.textSecondary,
            border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.4,
            boxShadow: canProceed ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Wrapper function for phase content
  const wrapPhaseContent = (content: React.ReactNode, bottomBarContent?: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary, color: colors.textPrimary, overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, flexShrink: 0 }}>{renderProgressBar()}</div>
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: '60px', paddingBottom: bottomBarContent ? '100px' : '24px' }}>
        {content}
      </div>
      {bottomBarContent && <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, flexShrink: 0 }}>{bottomBarContent}</div>}
    </div>
  );

  // Animation for systolic array
  useEffect(() => {
    if (!showSystolicFlow) return;
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 8);
    }, 300);
    return () => clearInterval(interval);
  }, [showSystolicFlow]);

  // Calculate performance metrics
  const calculatePerformance = useCallback(() => {
    // TPU excels at large batch matrix operations
    const tpuMatmulEfficiency = Math.min(0.95, 0.4 + (batchSize / 64) * 0.55);
    const gpuMatmulEfficiency = Math.min(0.85, 0.6 + (batchSize / 128) * 0.25);

    // GPU better at irregular operations
    const tpuFlexibility = 0.5;
    const gpuFlexibility = 0.9;

    // Power efficiency (TPU better for sustained workloads)
    const tpuPowerEfficiency = 0.85;
    const gpuPowerEfficiency = 0.65;

    // Operation-specific adjustments
    let tpuBonus = 1.0;
    let gpuBonus = 1.0;

    if (operationType === 'matmul') {
      tpuBonus = 1.3; // TPU systolic array excels
    } else if (operationType === 'conv') {
      tpuBonus = 1.2;
      gpuBonus = 1.1;
    } else if (operationType === 'attention') {
      tpuBonus = 1.15;
      gpuBonus = 1.05;
    }

    const tpuThroughput = tpuMatmulEfficiency * tpuBonus * (modelSize / 50) * 100;
    const gpuThroughput = gpuMatmulEfficiency * gpuBonus * (modelSize / 50) * 85;

    return {
      tpuThroughput: Math.min(150, tpuThroughput),
      gpuThroughput: Math.min(120, gpuThroughput),
      tpuEfficiency: tpuMatmulEfficiency * 100,
      gpuEfficiency: gpuMatmulEfficiency * 100,
      tpuPower: tpuPowerEfficiency * 100,
      gpuPower: gpuPowerEfficiency * 100,
    };
  }, [batchSize, modelSize, operationType]);

  const predictions = [
    { id: 'speed', label: 'GPUs are faster at everything - that\'s why gamers use them' },
    { id: 'matrix', label: 'TPUs are optimized for matrix operations with specialized hardware' },
    { id: 'same', label: 'They perform identically - it\'s just marketing' },
    { id: 'memory', label: 'The only difference is memory capacity' },
  ];

  const twistPredictions = [
    { id: 'always_tpu', label: 'Always use TPU - it\'s purpose-built for AI' },
    { id: 'depends', label: 'It depends on the workload - different architectures suit different tasks' },
    { id: 'always_gpu', label: 'Always use GPU - it\'s more flexible' },
    { id: 'cost', label: 'Just use whatever is cheaper' },
  ];

  const transferApplications = [
    {
      title: 'Large Language Model Training',
      description: 'Training models like GPT requires massive matrix multiplications across billions of parameters.',
      question: 'Why do companies like Google prefer TPUs for training large language models?',
      answer: 'TPUs systolic arrays can perform matrix multiplications extremely efficiently at scale. The regular, predictable nature of transformer attention operations maps perfectly to TPU architecture, achieving higher throughput per watt.',
    },
    {
      title: 'Real-time Gaming AI',
      description: 'Game AI needs to respond instantly to player actions with varied computational patterns.',
      question: 'Why do game engines typically use GPUs rather than TPUs for AI?',
      answer: 'Gaming AI requires flexibility - pathfinding, physics, rendering, and AI decisions all have different computational patterns. GPUs CUDA cores can handle this variety, while TPUs are optimized for batch matrix operations.',
    },
    {
      title: 'Autonomous Vehicle Perception',
      description: 'Self-driving cars process camera, lidar, and radar data in real-time.',
      question: 'What architecture considerations matter for autonomous vehicle AI chips?',
      answer: 'Low latency is critical - specialized chips like Tesla FSD use a hybrid approach with matrix engines for neural networks plus flexible cores for decision logic. Power efficiency matters since vehicles have limited power budgets.',
    },
    {
      title: 'Cloud AI Inference',
      description: 'Cloud providers serve millions of AI inference requests per second.',
      question: 'How do cloud providers choose between TPU and GPU for inference?',
      answer: 'Batch size matters hugely. High-traffic services can batch requests to fill TPU systolic arrays efficiently. Low-latency single requests often use GPUs. Cost per inference varies based on utilization.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the key architectural difference between TPUs and GPUs?',
      options: [
        { text: 'TPUs have more memory', correct: false },
        { text: 'TPUs use systolic arrays optimized for matrix operations', correct: true },
        { text: 'GPUs are newer technology', correct: false },
        { text: 'TPUs can only do inference, not training', correct: false },
      ],
    },
    {
      question: 'A systolic array processes data by:',
      options: [
        { text: 'Randomly accessing memory locations', correct: false },
        { text: 'Flowing data through a grid of processing elements in a rhythmic pattern', correct: true },
        { text: 'Using a single powerful processor', correct: false },
        { text: 'Compressing data before processing', correct: false },
      ],
    },
    {
      question: 'Why does batch size significantly affect TPU performance?',
      options: [
        { text: 'Larger batches use more memory', correct: false },
        { text: 'Larger batches better utilize the systolic array parallelism', correct: true },
        { text: 'TPUs can only process one batch at a time', correct: false },
        { text: 'Batch size affects cooling requirements', correct: false },
      ],
    },
    {
      question: 'CUDA cores in GPUs are designed for:',
      options: [
        { text: 'Only graphics rendering', correct: false },
        { text: 'Flexible parallel computation across many independent threads', correct: true },
        { text: 'Sequential processing of large matrices', correct: false },
        { text: 'Network communication only', correct: false },
      ],
    },
    {
      question: 'For training a large transformer model, TPUs excel because:',
      options: [
        { text: 'Transformers use attention which involves massive matrix multiplications', correct: true },
        { text: 'TPUs have better graphics capabilities', correct: false },
        { text: 'Transformers require random memory access patterns', correct: false },
        { text: 'TPUs are always cheaper', correct: false },
      ],
    },
    {
      question: 'What workload would likely perform WORSE on a TPU compared to GPU?',
      options: [
        { text: 'Matrix multiplication', correct: false },
        { text: 'Large batch inference', correct: false },
        { text: 'Irregular branching algorithms with varied data access', correct: true },
        { text: 'Convolution operations', correct: false },
      ],
    },
    {
      question: 'The term "systolic" in systolic array refers to:',
      options: [
        { text: 'The chip manufacturing process', correct: false },
        { text: 'The rhythmic, pulsing flow of data like a heartbeat', correct: true },
        { text: 'The cooling system design', correct: false },
        { text: 'The power consumption pattern', correct: false },
      ],
    },
    {
      question: 'TPU power efficiency advantage comes from:',
      options: [
        { text: 'Using less silicon', correct: false },
        { text: 'Specialized circuits that avoid general-purpose overhead', correct: true },
        { text: 'Running at lower clock speeds', correct: false },
        { text: 'Having fewer processing units', correct: false },
      ],
    },
    {
      question: 'When would you choose GPU over TPU for AI inference?',
      options: [
        { text: 'When processing large batches of similar requests', correct: false },
        { text: 'When low latency for single requests matters more than throughput', correct: true },
        { text: 'When doing only matrix multiplication', correct: false },
        { text: 'When power consumption is not a concern', correct: false },
      ],
    },
    {
      question: 'Google developed TPUs primarily because:',
      options: [
        { text: 'GPUs were too expensive', correct: false },
        { text: 'Existing hardware was inefficient for their specific AI workloads', correct: true },
        { text: 'They wanted to compete with NVIDIA in gaming', correct: false },
        { text: 'TPUs are easier to manufacture', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    // Only allow selection if not already confirmed
    if (!confirmedAnswers.has(questionIndex)) {
      setPendingAnswer(optionIndex);
    }
  };

  const confirmAnswer = () => {
    if (pendingAnswer !== null && !confirmedAnswers.has(currentTestQuestion)) {
      const newAnswers = [...testAnswers];
      newAnswers[currentTestQuestion] = pendingAnswer;
      setTestAnswers(newAnswers);
      setConfirmedAnswers(new Set([...confirmedAnswers, currentTestQuestion]));
      setPendingAnswer(null);
    }
  };

  const goToNextQuestion = () => {
    if (currentTestQuestion < 9) {
      setCurrentTestQuestion(currentTestQuestion + 1);
      setPendingAnswer(null);
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const perf = calculatePerformance();

    return (
      <svg width="100%" height="400" viewBox="0 0 500 400" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="tpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <filter id="glowTPU" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0,0 0,6 9,3" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Background */}
        <rect width="500" height="400" fill="#0f172a" rx="12" />

        {/* Grid lines for performance chart area */}
        <line x1="50" y1="250" x2="480" y2="250" stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
        <line x1="50" y1="290" x2="480" y2="290" stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
        <line x1="50" y1="330" x2="480" y2="330" stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
        <line x1="50" y1="370" x2="480" y2="370" stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
        {/* Vertical tick marks */}
        <line x1="150" y1="245" x2="150" y2="375" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="250" y1="245" x2="250" y2="375" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="350" y1="245" x2="350" y2="375" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Axis labels */}
        <text x="265" y="392" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">Compute Intensity / Batch Size</text>
        <text x="18" y="310" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90, 18, 310)" fontWeight="400">Power / Throughput (TFLOPS)</text>

        {/* TPU Section */}
        <g>
          <text x="125" y="28" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">TPU (Systolic Array)</text>
          {[0, 1, 2, 3].map(row =>
            [0, 1, 2, 3].map(col => {
              const isActive = showSystolicFlow && ((row + col) % 4 === animationStep % 4);
              return (
                <rect
                  key={`cell-${row}-${col}`}
                  x={50 + col * 35}
                  y={50 + row * 35}
                  width="30"
                  height="30"
                  fill={isActive ? '#60a5fa' : '#1e40af'}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  rx="4"
                  filter={isActive ? 'url(#glowTPU)' : undefined}
                />
              );
            })
          )}
          {showSystolicFlow && (
            <>
              <line x1="40" y1="65" x2="40" y2="175" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.7" />
              <line x1="65" y1="40" x2="185" y2="40" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.7" />
              <text x="25" y="120" fill="#94a3b8" fontSize="11" textAnchor="end">Input A</text>
              <text x="120" y="35" fill="#94a3b8" fontSize="11" textAnchor="middle">Input B</text>
            </>
          )}
        </g>

        {/* GPU Section */}
        <g>
          <text x="375" y="28" fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="middle">GPU (CUDA Cores)</text>
          {[0, 1, 2, 3, 4, 5].map(row =>
            [0, 1, 2, 3, 4, 5].map(col => {
              const isActive = (row + col) % 3 !== 0;
              return (
                <circle
                  key={`core-${row}-${col}`}
                  cx={300 + col * 25 + 10}
                  cy={50 + row * 25 + 10}
                  r="8"
                  fill={isActive ? '#4ade80' : '#166534'}
                  opacity={isActive ? 1 : 0.5}
                />
              );
            })
          )}
        </g>

        {/* Performance Comparison Bars */}
        <g>
        <text x="50" y="258" fill="#f8fafc" fontSize="12" fontWeight="bold">Throughput (TFLOPS)</text>

        {/* TPU Bar */}
        <rect x="50" y="265" width={perf.tpuThroughput * 2.5} height="22" fill="url(#tpuGrad)" rx="4" />
        <text x={55 + perf.tpuThroughput * 2.5} y="280" fill="#3b82f6" fontSize="11" fontWeight="600">{perf.tpuThroughput.toFixed(1)}</text>

        {/* GPU Bar */}
        <rect x="50" y="295" width={perf.gpuThroughput * 2.5} height="22" fill="url(#gpuGrad)" rx="4" />
        <text x={55 + perf.gpuThroughput * 2.5} y="310" fill="#22c55e" fontSize="11" fontWeight="600">{perf.gpuThroughput.toFixed(1)}</text>

        {/* Efficiency line */}
        <text x="50" y="340" fill="#f8fafc" fontSize="12" fontWeight="bold">Efficiency</text>
        <text x="50" y="358" fill="#3b82f6" fontSize="11">TPU: {perf.tpuEfficiency.toFixed(0)}%</text>
        <text x="170" y="358" fill="#22c55e" fontSize="11">GPU: {perf.gpuEfficiency.toFixed(0)}%</text>

        {/* Performance response curve (TPU throughput vs batch) */}
        <path d="M50 370 L80 365 L120 355 L160 338 L200 315 L240 290 L280 265 L320 250 L360 245 L400 242 L440 240 L480 238"
          fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="2" strokeDasharray="6,4" />

        {/* Legend */}
        <text x="310" y="340" fill="#94a3b8" fontSize="11">Batch: {batchSize}</text>
        <text x="310" y="358" fill="#94a3b8" fontSize="11">Model: {modelSize}%</text>
        <text x="420" y="340" fill="#94a3b8" fontSize="11">Op: {operationType}</text>
        </g>

        {/* Formula */}
        <rect x="140" y="205" width="220" height="28" rx="6" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
        <text x="250" y="224" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="600">Throughput = Efficiency × Batch × Ops/sec</text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="batch">Batch Size:</span> {batchSize} (affects TPU parallelism)
        </label>
        <input
          type="range"
          min="1"
          max="128"
          step="1"
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value))}
          onInput={(e) => setBatchSize(parseInt((e.target as HTMLInputElement).value))}
          style={{ width: '100%', height: '20px', accentColor: colors.accent, touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, cursor: 'pointer', background: `linear-gradient(to right, ${colors.accent} ${(batchSize / 128) * 100}%, ${colors.bgCard} ${(batchSize / 128) * 100}%)`, borderRadius: '4px' }}
          aria-label="Batch Size affects TPU parallelism"
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="model">Model Size:</span> {modelSize}% (compute intensity)
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          onInput={(e) => setModelSize(parseInt((e.target as HTMLInputElement).value))}
          style={{ width: '100%', height: '20px', accentColor: colors.warning, touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, cursor: 'pointer', background: `linear-gradient(to right, ${colors.warning} ${modelSize}%, ${colors.bgCard} ${modelSize}%)`, borderRadius: '4px' }}
          aria-label="Model Size compute intensity"
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="operation">Operation Type:</span>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['matmul', 'conv', 'attention'] as const).map(op => (
            <button
              key={op}
              onClick={() => setOperationType(op)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: operationType === op ? '2px solid #3b82f6' : '1px solid #475569',
                background: operationType === op ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {op === 'matmul' ? 'Matrix Mult' : op === 'conv' ? 'Convolution' : 'Attention'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowSystolicFlow(!showSystolicFlow)}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: showSystolicFlow ? '#ef4444' : '#3b82f6',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          minHeight: '44px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showSystolicFlow ? 'Stop Animation' : 'Show Systolic Flow'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Hardware Architecture</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TPU vs GPU Architecture
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginTop: '8px', fontWeight: 400 }}>
              Why did Google build their own AI chips instead of using GPUs?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              When Google needed to run AI at massive scale, they found that general-purpose GPUs weren't efficient enough.
              So they designed a completely new type of chip: the Tensor Processing Unit (TPU).
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              But what makes TPUs different? And when should you use each?
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Next \u2192')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Step 1 of 2: Observe the diagram, then make your prediction
          </p>

          {/* Static SVG for prediction phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: colors.textSecondary }}>
              Google's TPU and NVIDIA's GPU both process AI workloads. What's the fundamental difference?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? '2px solid #3b82f6' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(true, prediction ? 'Test My Prediction' : 'Continue \u2192')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Compare TPU and GPU Performance</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Adjust parameters to see how each architecture performs
          </p>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: '#3b82f6' }}>What to Watch:</strong> Observe how batch size affects TPU performance. Try adjusting the sliders to see when TPU outperforms GPU and vice versa.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          {/* Why this matters */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #22c55e' }}>
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: '#22c55e' }}>Why This Matters:</strong> This is why hardware architecture is important in the real world — choosing the right chip for AI workloads can reduce costs by 10× and enable applications that would otherwise be impractical. Every major technology company makes these decisions daily.
            </p>
          </div>

          {/* Key terms */}
          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Terms &amp; Observations</h3>
            <div style={{ color: colors.textSecondary, lineHeight: 1.8, marginBottom: '12px' }}>
              <p><strong style={{ color: colors.textPrimary }}>Throughput</strong> is defined as the number of operations completed per second, measured in TFLOPS (trillion floating-point operations per second).</p>
              <p><strong style={{ color: colors.textPrimary }}>Systolic Array</strong> is a grid of processing elements where data flows rhythmically — the formula is: Output = Σ(A[i] × B[i]) computed in parallel across the array.</p>
              <p><strong style={{ color: colors.textPrimary }}>CUDA Cores</strong> refers to the thousands of independent processors in a GPU that can each execute different code threads simultaneously.</p>
            </div>
            <ul style={{ color: colors.textMuted, lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>TPU throughput increases dramatically with batch size</li>
              <li>GPU maintains more consistent performance across batch sizes</li>
              <li>Matrix multiplication strongly favors TPU's systolic array</li>
              <li>Watch the data flow in the systolic array animation</li>
            </ul>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Concepts')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'matrix';

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Correct! Your prediction was right!' : 'Not quite what you predicted!'}
            </h3>
            <p>As you observed in the experiment, TPUs use systolic arrays - specialized hardware designed specifically for matrix operations that are common in neural networks. The result confirms that architecture choice fundamentally shapes performance.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>The Systolic Array</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>What it is:</strong> A grid of processing elements where data flows rhythmically (like a heartbeat - hence "systolic") through the array.
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Why it's efficient:</strong> Data is reused as it flows through. Each element performs a multiply-accumulate, passing results to neighbors. This minimizes memory access - the biggest energy cost in computing.
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>The tradeoff:</strong> Works beautifully for regular matrix operations but struggles with irregular data access patterns.
            </p>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>GPU CUDA Cores</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>What they are:</strong> Thousands of small, flexible processors that can each run independent code threads.
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Why they're flexible:</strong> Each core can do different operations, access arbitrary memory, and handle branching logic. Great for graphics and varied AI workloads.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover the Twist')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>The Twist</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Step 1 of 2: Observe the new scenario, then make your prediction
          </p>

          {/* Static SVG for twist prediction phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px', color: colors.textSecondary }}>
              Different AI workloads have very different computational patterns. A chatbot processes one request at a time with low latency needs.
              A training job processes millions of examples in batches.
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
              So which architecture should you choose?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(true, twistPrediction ? 'See the Answer' : 'Continue \u2192')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Workload Matching</h2>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: '#a855f7' }}>What to Watch:</strong> Explore how different workload characteristics affect hardware choice. Try adjusting batch size and operation type to see the tradeoffs.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>TPU Excels At:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Large batch training</li>
                <li>Matrix-heavy models</li>
                <li>Transformer attention</li>
                <li>High throughput needs</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>GPU Excels At:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Low-latency inference</li>
                <li>Varied workloads</li>
                <li>Small batch sizes</li>
                <li>Irregular algorithms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Discovery')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'depends';

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Exactly right!' : 'The key insight:'}
            </h3>
            <p>There's no universally "best" architecture. The right choice depends entirely on your specific workload characteristics!</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Decision Framework</h3>
            <div style={{ lineHeight: 1.8, color: colors.textSecondary }}>
              <p><strong style={{ color: '#3b82f6' }}>Choose TPU when:</strong></p>
              <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                <li>Training large models with big batches</li>
                <li>Workload is matrix-multiplication heavy</li>
                <li>Throughput matters more than latency</li>
                <li>Power efficiency is critical</li>
              </ul>

              <p><strong style={{ color: '#22c55e' }}>Choose GPU when:</strong></p>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Need low latency for individual requests</li>
                <li>Workload has irregular patterns</li>
                <li>Running varied AI models</li>
                <li>Need flexibility for experimentation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="T P Uvs G P U"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const currentApp = transferApplications[activeTransferApp];
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px' }}>
            Complete all {transferApplications.length} to unlock the test ({transferCompleted.size}/{transferApplications.length})
          </p>

          {/* App navigation tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {transferApplications.map((app, index) => (
              <button
                key={index}
                onClick={() => setActiveTransferApp(index)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: activeTransferApp === index ? '2px solid #3b82f6' : '1px solid #475569',
                  background: transferCompleted.has(index) ? 'rgba(34, 197, 94, 0.2)' : activeTransferApp === index ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: transferCompleted.has(index) ? '#22c55e' : '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '12px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {transferCompleted.has(index) ? '✓ ' : ''}{app.title.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>

          {/* Current application card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: transferCompleted.has(activeTransferApp) ? '2px solid #22c55e' : '1px solid #334155',
          }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{currentApp.title}</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{currentApp.description}</p>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>{currentApp.question}</p>
            </div>
            {!transferCompleted.has(activeTransferApp) ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, activeTransferApp]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: 'transparent',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
                <button
                  onClick={() => {
                    setTransferCompleted(new Set([...transferCompleted, activeTransferApp]));
                    if (activeTransferApp < transferApplications.length - 1) {
                      setActiveTransferApp(activeTransferApp + 1);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Got It - Continue
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{currentApp.answer}</p>
                <button
                  onClick={() => {
                    if (activeTransferApp < transferApplications.length - 1) {
                      setActiveTransferApp(activeTransferApp + 1);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTransferApp < transferApplications.length - 1 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#475569',
                    color: 'white',
                    cursor: activeTransferApp < transferApplications.length - 1 ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {activeTransferApp < transferApplications.length - 1 ? 'Got It - Next Application' : 'All Applications Completed'}
                </button>
              </div>
            )}
          </div>

          {/* Real-world applications detail (always visible for comprehensive content) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${app.color}` }}>
                <h4 style={{ color: app.color, marginBottom: '6px', fontWeight: 700 }}>{app.icon} {app.title}</h4>
                <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>{app.description}</p>
                <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>{app.connection}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {app.stats.map((s, si) => (
                    <span key={si} style={{ color: app.color, fontSize: '12px', fontWeight: 600 }}>{s.icon} {s.value} {s.label}</span>
                  ))}
                </div>
                <p style={{ color: colors.textMuted, fontSize: '12px' }}>Companies: {app.companies.join(', ')}</p>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '16px' }}>
            {transferApplications.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: transferCompleted.has(index) ? '#22c55e' : index === activeTransferApp ? '#3b82f6' : '#475569',
                }}
              />
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(allCompleted, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: '24px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
              <p style={{ color: colors.textSecondary }}>
                {testScore >= 8 ? 'You\'ve mastered AI hardware architecture!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {/* Answer review section */}
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {testQuestions.map((q, i) => {
                  const isCorrect = testAnswers[i] !== null && q.options[testAnswers[i]!].correct;
                  return (
                    <div
                      key={i}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isCorrect ? '#22c55e' : '#ef4444',
                        fontWeight: 'bold',
                        fontSize: '14px',
                      }}
                    >
                      {isCorrect ? '\u2713' : '\u2717'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        renderBottomBar(true, testScore >= 8 ? 'Claim Mastery' : 'Try Again', () => {
          if (testScore >= 8) {
            goNext();
          } else {
            setTestSubmitted(false);
            setTestAnswers(new Array(10).fill(null));
            setCurrentTestQuestion(0);
            setPendingAnswer(null);
            setConfirmedAnswers(new Set());
          }
        })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const currentAnswer = testAnswers[currentTestQuestion];
    const isConfirmed = confirmedAnswers.has(currentTestQuestion);
    const displayAnswer = isConfirmed ? currentAnswer : pendingAnswer;
    const allAnswered = testAnswers.every(a => a !== null);

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of 10</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => { setCurrentTestQuestion(i); setPendingAnswer(null); }}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '8px' }}>
              Scenario: You are an AI infrastructure engineer at a major technology company evaluating hardware options for deploying machine learning workloads at scale. Consider the tradeoffs between specialized and general-purpose architectures.
            </p>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = displayAnswer === i;
              const showResult = isConfirmed && currentAnswer === i;

              return (
                <button
                  key={i}
                  onClick={() => handleTestAnswer(currentTestQuestion, i)}
                  disabled={isConfirmed}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #475569',
                    background: showResult
                      ? (opt.correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                      : isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                    opacity: isConfirmed && !isSelected ? 0.6 : 1,
                  }}
                >
                  {opt.text}
                  {showResult && (opt.correct ? ' \u2713' : ' \u2717')}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              onClick={() => { setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1)); setPendingAnswer(null); }}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>

            {!isConfirmed && pendingAnswer !== null ? (
              <button
                onClick={confirmAnswer}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Confirm Answer
              </button>
            ) : currentTestQuestion < 9 ? (
              <button
                onClick={goToNextQuestion}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  minHeight: '44px',
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
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? '#22c55e' : '#475569',
                  color: 'white',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                  minHeight: '44px',
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
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>AI Hardware Architecture Master!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '32px' }}>
            You understand the fundamental differences between TPU and GPU architectures
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px', color: colors.textSecondary }}>
              <li>Systolic arrays and rhythmic data flow</li>
              <li>CUDA cores and parallel flexibility</li>
              <li>Batch size impact on efficiency</li>
              <li>Workload-architecture matching</li>
              <li>Power efficiency tradeoffs</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>The Core Insight</h4>
            <p style={{ color: colors.textSecondary }}>
              Specialized hardware can dramatically outperform general-purpose processors for specific tasks,
              but flexibility has value too. The best choice depends on your workload characteristics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TPUvsGPURenderer;
