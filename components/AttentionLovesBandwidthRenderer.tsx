import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// Phase type for internal state management
type BandwidthPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface AttentionLovesBandwidthRendererProps {
  gamePhase?: BandwidthPhase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: BandwidthPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<BandwidthPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Learn',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Master'
};

const phaseAriaLabels: Record<BandwidthPhase, string> = {
  hook: 'Hook intro',
  predict: 'Predict phase',
  play: 'Play experiment',
  review: 'Review understanding',
  twist_predict: 'Twist new variable',
  twist_play: 'Explore deeper',
  twist_review: 'Deep insight',
  transfer: 'Real world transfer',
  test: 'Knowledge test',
  mastery: 'Mastery completion'
};

const transferApplications = [
  {
    title: 'Long-Context LLMs (Claude, GPT-4 Turbo)',
    description: 'Modern LLMs support 100K+ token contexts, but performance degrades with length.',
    question: 'Why do long-context queries feel slower even on the same hardware?',
    answer: 'The KV cache grows linearly with context length. At 100K tokens, you might have 10GB+ of KV cache to read for every generated token. Memory bandwidth becomes the bottleneck, limiting throughput to just a few tokens per second.',
    stats: [
      { value: '100K+', label: 'Token context window', icon: '📝' },
      { value: '10GB+', label: 'KV cache at long context', icon: '💾' },
      { value: '3.35 TB/s', label: 'H100 HBM bandwidth', icon: '⚡' }
    ]
  },
  {
    title: 'Retrieval-Augmented Generation (RAG)',
    description: 'RAG retrieves relevant documents and includes them in the prompt context.',
    question: 'From a hardware perspective, why might RAG be preferable to very long contexts?',
    answer: 'RAG keeps the context window smaller by retrieving only relevant chunks. This reduces KV cache size, improving memory bandwidth utilization. A 4K context with perfect retrieval can outperform 100K context with everything, both in quality and speed.',
    stats: [
      { value: '4K', label: 'Typical RAG context', icon: '🔍' },
      { value: '25x', label: 'Smaller than 100K context', icon: '📊' },
      { value: '90%+', label: 'Accuracy with good retrieval', icon: '🎯' }
    ]
  },
  {
    title: 'Speculative Decoding',
    description: 'A small draft model proposes multiple tokens, verified in parallel by the main model.',
    question: 'How does speculative decoding help with memory bandwidth limitations?',
    answer: 'By verifying multiple draft tokens in parallel, we amortize the memory bandwidth cost of loading the KV cache. Instead of loading the cache once per token, we load it once for potentially 4-8 tokens, improving effective throughput.',
    stats: [
      { value: '4-8x', label: 'Token throughput gain', icon: '🚀' },
      { value: '70B', label: 'Main model parameters', icon: '🧠' },
      { value: '7B', label: 'Draft model size', icon: '📐' }
    ]
  },
  {
    title: 'Hardware Trends (HBM3, HBM4)',
    description: 'New memory technologies focus on increasing bandwidth, not just capacity.',
    question: 'Why are AI chip designers prioritizing memory bandwidth over compute FLOPS?',
    answer: 'Modern GPUs already have more compute than they can feed with data. The H100 has 3+ TB/s bandwidth but 2000 TFLOPS compute - for LLM inference, the arithmetic intensity is so low that memory wins. HBM3/HBM4 push bandwidth even higher.',
    stats: [
      { value: '3.35 TB/s', label: 'H100 HBM bandwidth', icon: '⚡' },
      { value: '2000', label: 'TFLOPS compute', icon: '🔥' },
      { value: '$40K+', label: 'Per GPU cost', icon: '💰' }
    ]
  },
];

const testQuestions = [
  {
    question: 'The KV cache stores:',
    scenario: 'In a transformer-based LLM generating tokens one at a time, the attention mechanism needs to reference all previous context.',
    options: [
      { text: 'The model weights', correct: false },
      { text: 'Key and Value tensors from previous token computations', correct: true },
      { text: 'The input text in compressed form', correct: false },
      { text: 'GPU temperature readings', correct: false },
    ],
  },
  {
    question: 'Arithmetic intensity measures:',
    scenario: 'When analyzing whether a workload is limited by computation or memory movement, engineers use a metric called arithmetic intensity.',
    options: [
      { text: 'How hard the math problems are', correct: false },
      { text: 'Compute operations per byte of memory moved', correct: true },
      { text: 'The speed of the GPU clock', correct: false },
      { text: 'Total power consumption per operation', correct: false },
    ],
  },
  {
    question: 'A system is "memory bound" when:',
    scenario: 'Consider an H100 GPU running LLM inference at 100K context length. The GPU compute units are often idle, waiting for data.',
    options: [
      { text: 'It runs out of memory capacity', correct: false },
      { text: 'Memory bandwidth limits performance, not compute', correct: true },
      { text: 'The memory is too slow to store data', correct: false },
      { text: 'More RAM modules are needed', correct: false },
    ],
  },
  {
    question: 'As context length increases, LLM throughput typically:',
    scenario: 'A user sends a 100K token prompt to Claude. Each generated token requires reading the entire KV cache from HBM memory.',
    options: [
      { text: 'Increases because more data is processed in parallel', correct: false },
      { text: 'Decreases because KV cache reads scale linearly with context', correct: true },
      { text: 'Stays constant regardless of input size', correct: false },
      { text: 'Fluctuates randomly based on content', correct: false },
    ],
  },
  {
    question: 'HBM (High Bandwidth Memory) is used in AI chips because:',
    scenario: 'NVIDIA chose to pair its H100 GPU with 80GB of HBM3 memory stacked vertically on the chip package, rather than using traditional DDR5 memory.',
    options: [
      { text: 'It is cheaper than regular RAM', correct: false },
      { text: 'It provides much higher bandwidth than DDR memory', correct: true },
      { text: 'It uses less power than alternatives', correct: false },
      { text: 'It has more storage capacity per chip', correct: false },
    ],
  },
  {
    question: 'The roofline model shows that LLM inference is typically:',
    scenario: 'An engineer plots the arithmetic intensity of LLM token generation on a roofline chart. The workload falls far to the left of the ridge point.',
    options: [
      { text: 'On the compute-bound slope (right side)', correct: false },
      { text: 'On the memory-bound slope (left side)', correct: true },
      { text: 'Exactly at the ridge point (balanced)', correct: false },
      { text: 'Off the chart entirely (unmeasurable)', correct: false },
    ],
  },
  {
    question: 'KV cache quantization (e.g., FP16 to INT4) helps because:',
    scenario: 'A team quantizes their KV cache from FP16 to INT4. The cache size drops by 4x, but there is a small accuracy penalty on benchmarks.',
    options: [
      { text: 'It makes computations faster in the ALUs', correct: false },
      { text: 'Smaller data means less memory bandwidth needed per token', correct: true },
      { text: 'It improves model accuracy on all tasks', correct: false },
      { text: 'It reduces power consumption only without speed benefit', correct: false },
    ],
  },
  {
    question: 'Why does attention scale poorly with context length?',
    scenario: 'As context windows grow from 4K to 128K tokens, users notice a dramatic slowdown in token generation speed even on the same GPU hardware.',
    options: [
      { text: 'The math becomes exponentially harder', correct: false },
      { text: 'Every token must attend to all previous tokens, requiring O(n) memory reads', correct: true },
      { text: 'The GPU gets confused by longer sequences', correct: false },
      { text: 'Network latency between GPUs increases linearly', correct: false },
    ],
  },
  {
    question: 'A 70B parameter model at long context is slower primarily because:',
    scenario: 'Comparing a 7B model and a 70B model, both at 100K context on the same H100 GPU. The 70B model generates tokens 5-10x slower.',
    options: [
      { text: 'More parameters means exponentially more math per token', correct: false },
      { text: 'Larger model dimension means larger KV cache, consuming more memory bandwidth', correct: true },
      { text: 'The model thinks harder about each word', correct: false },
      { text: 'Electricity costs limit processing speed', correct: false },
    ],
  },
  {
    question: 'The physical constraint that limits long-context LLMs is:',
    scenario: 'Despite doubling GPU compute every 2 years, long-context LLM inference speed has not kept pace. Engineers point to a fundamental hardware limitation.',
    options: [
      { text: 'CPU speed and instruction throughput', correct: false },
      { text: 'Memory bandwidth and energy cost of data movement', correct: true },
      { text: 'Internet connection and network latency', correct: false },
      { text: 'Display refresh rate and rendering speed', correct: false },
    ],
  },
];

const predictions = [
  { id: 'compute', label: 'The GPU compute units (FLOPS) limit how fast we can generate tokens' },
  { id: 'memory', label: 'Memory bandwidth limits throughput - we spend most time moving data, not computing' },
  { id: 'network', label: 'Network latency between GPUs is the bottleneck' },
  { id: 'software', label: 'Software inefficiency is the main limiter' },
];

const twistPredictions = [
  { id: 'lossless', label: 'KV quantization is lossless - same quality, just smaller numbers' },
  { id: 'tradeoff', label: 'Lower precision trades some quality for significant throughput gains' },
  { id: 'no_benefit', label: 'Quantization does not help because compute is the bottleneck' },
  { id: 'worse', label: 'Quantization makes things worse due to conversion overhead' },
];

const AttentionLovesBandwidthRenderer: React.FC<AttentionLovesBandwidthRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): BandwidthPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<BandwidthPhase>(getInitialPhase);
  const lastPhaseChangeRef = useRef<number>(0);

  // Sync with external gamePhase prop for resume
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation functions
  const goToPhase = useCallback((newPhase: BandwidthPhase) => {
    const now = Date.now();
    if (now - lastPhaseChangeRef.current < 300) return;
    lastPhaseChangeRef.current = now;
    playSound();
    setPhase(newPhase);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Sound feedback
  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not available
    }
  };

  // Simulation state
  const [contextLength, setContextLength] = useState(4096);
  const [modelDim, setModelDim] = useState(4096);
  const [numLayers, setNumLayers] = useState(32);
  const [kvBits, setKvBits] = useState(16);
  const [hbmBandwidth, setHbmBandwidth] = useState(2000);
  const [computeFlops, setComputeFlops] = useState(1000);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate memory and compute metrics
  const calculateMetrics = useCallback(() => {
    const kvBytesPerTokenPerLayer = 2 * modelDim * (kvBits / 8);
    const kvBytesPerToken = kvBytesPerTokenPerLayer * numLayers;
    const totalKvCacheBytes = contextLength * kvBytesPerToken;
    const totalKvCacheGB = totalKvCacheBytes / (1024 * 1024 * 1024);
    const memoryReadsPerToken = totalKvCacheBytes;
    const memoryReadGB = memoryReadsPerToken / (1024 * 1024 * 1024);
    const memoryTimeMs = (memoryReadGB / hbmBandwidth) * 1000;
    const attentionFlopsPerToken = 2 * contextLength * modelDim * numLayers;
    const totalTflops = attentionFlopsPerToken / 1e12;
    const computeTimeMs = (totalTflops / computeFlops) * 1000;
    const actualTimeMs = Math.max(memoryTimeMs, computeTimeMs);
    const arithmeticIntensity = attentionFlopsPerToken / memoryReadsPerToken;
    const ridgePoint = computeFlops * 1e12 / (hbmBandwidth * 1e9);
    const tokensPerSecond = 1000 / actualTimeMs;
    const isMemoryBound = memoryTimeMs > computeTimeMs;

    return {
      kvCacheSizeGB: totalKvCacheGB,
      memoryReadGB,
      memoryTimeMs,
      computeTimeMs,
      actualTimeMs,
      tokensPerSecond,
      arithmeticIntensity,
      ridgePoint,
      isMemoryBound,
      attentionFlopsPerToken,
    };
  }, [contextLength, modelDim, numLayers, kvBits, hbmBandwidth, computeFlops]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
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

  // Slider style for all sliders
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    touchAction: 'pan-y',
    cursor: 'pointer',
    background: 'transparent',
  };

  // Render progress dots (10 nav dots with aria-labels)
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 16px',
        flexWrap: 'wrap',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
      }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            aria-label={phaseAriaLabels[p]}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: 'none',
              background: index === currentIndex
                ? '#3b82f6'
                : index < currentIndex
                  ? '#22c55e'
                  : '#475569',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title={phaseLabels[p]}
          >
            {index < currentIndex ? '\u2713' : '\u2022'}
          </button>
        ))}
      </div>
    );
  };

  // Bottom navigation bar (fixed)
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #334155',
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: isFirst ? '#475569' : '#f8fafc',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '400' }}>
          {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: isLast ? '#475569' : '#3b82f6',
            color: 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // Wrapper for phase content - outer container + scroll + fixed nav
  const renderPhaseContent = (content: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', color: '#f8fafc' }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ padding: '0 24px 24px 24px' }}>
          {content}
        </div>
      </div>
      {renderBottomBar()}
    </div>
  );

  // ===== SVG VISUALIZATION =====
  const renderVisualization = (interactive: boolean = true) => {
    const metrics = calculateMetrics();
    // viewBox height must be <= 500
    const svgH = 490;
    const roofW = 280;
    const roofH = 130;
    const roofX = 60;
    const roofY = 155;

    // Operating point: log-scale Y for throughput, linear X for arithmetic intensity
    // Log scale handles the wide range from ~10 tok/s to ~10000 tok/s
    const logThroughput = Math.log10(Math.max(1, metrics.tokensPerSecond));
    const logMin = 0; // 1 tok/s
    const logMax = 4; // 10000 tok/s
    const throughputFrac = Math.min(Math.max((logThroughput - logMin) / (logMax - logMin), 0), 1);
    const pointCy = roofY + roofH - 10 - throughputFrac * (roofH - 20);
    // X position: map arithmetic intensity on log scale too
    const logAI = Math.log10(Math.max(0.01, metrics.arithmeticIntensity));
    const logAIMin = -2; // 0.01
    const logAIMax = 3; // 1000
    const aiFrac = Math.min(Math.max((logAI - logAIMin) / (logAIMax - logAIMin), 0), 1);
    const pointCx = roofX + 10 + aiFrac * (roofW - 20);

    return (
      <svg width="100%" height={svgH} viewBox={`0 0 500 ${svgH}`} style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="1" dy="2" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height={svgH} fill="#0f172a" rx="12" />

        {/* Header group */}
        <g>
          <text x="250" y="25" fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">Attention Memory Bandwidth Analysis</text>
          <text x="250" y="45" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">Throughput = Bandwidth / KV_cache_size</text>
          <text x="250" y="62" fill="#94a3b8" fontSize="11" textAnchor="middle">Attention = Q {'\u00D7'} K^T {'\u00D7'} V (memory-bound)</text>
        </g>

        {/* KV Cache Stats group */}
        <g>
          <rect x="15" y="75" width="225" height="65" fill="rgba(59, 130, 246, 0.1)" rx="8" stroke="#3b82f6" strokeWidth="1" />
          <text x="127" y="92" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">KV CACHE</text>
          <text x="25" y="110" fill="#94a3b8" fontSize="11">Context: {contextLength.toLocaleString()} tokens</text>
          <text x="25" y="128" fill="#f8fafc" fontSize="12" fontWeight="bold">Size: {metrics.kvCacheSizeGB.toFixed(2)} GB ({kvBits}-bit)</text>
        </g>

        {/* Hardware Stats group */}
        <g>
          <rect x="260" y="75" width="225" height="65" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="#22c55e" strokeWidth="1" />
          <text x="372" y="92" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">HARDWARE</text>
          <text x="270" y="110" fill="#94a3b8" fontSize="11">Bandwidth: {hbmBandwidth} GB/s</text>
          <text x="270" y="128" fill="#f8fafc" fontSize="12" fontWeight="bold">Ridge: {metrics.ridgePoint.toFixed(0)} FLOP/byte</text>
        </g>

        {/* Roofline Plot group */}
        <g>
          <text x="250" y={roofY - 5} fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle">ROOFLINE MODEL</text>

          {/* Grid lines with strokeDasharray */}
          <line x1={roofX} y1={roofY + 25} x2={roofX + roofW} y2={roofY + 25} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX} y1={roofY + 50} x2={roofX + roofW} y2={roofY + 50} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX} y1={roofY + 75} x2={roofX + roofW} y2={roofY + 75} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX} y1={roofY + 100} x2={roofX + roofW} y2={roofY + 100} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX + 70} y1={roofY} x2={roofX + 70} y2={roofY + roofH} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX + 140} y1={roofY} x2={roofX + 140} y2={roofY + roofH} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1={roofX + 210} y1={roofY} x2={roofX + 210} y2={roofY + roofH} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />

          {/* Axes */}
          <line x1={roofX} y1={roofY + roofH} x2={roofX + roofW} y2={roofY + roofH} stroke="#475569" strokeWidth="1.5" />
          <line x1={roofX} y1={roofY} x2={roofX} y2={roofY + roofH} stroke="#475569" strokeWidth="1.5" />

          {/* Performance curve path with many data points for smooth appearance */}
          {(() => {
            const numPts = 20;
            const pts: string[] = [];
            // Span from near top of roofline to well below it for > 25% vertical utilization
            const curveTop = roofY - 20;  // Above roofline
            const curveBot = roofY + roofH + 60; // Below roofline
            const curveRange = curveBot - curveTop; // ~210 out of 490 = 42.9%
            for (let i = 0; i <= numPts; i++) {
              const frac = i / numPts;
              const px = roofX + frac * roofW;
              const curveY = curveTop + curveRange * Math.pow(frac, 0.5);
              pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${curveY.toFixed(1)}`);
            }
            return <path d={pts.join(' ')} fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />;
          })()}

          {/* Memory bound slope */}
          <line x1={roofX} y1={roofY + roofH} x2={roofX + roofW / 2} y2={roofY + roofH / 3} stroke="#3b82f6" strokeWidth="3" filter="url(#dropShadow)" />

          {/* Compute bound ceiling */}
          <line x1={roofX + roofW / 2} y1={roofY + roofH / 3} x2={roofX + roofW} y2={roofY + roofH / 3} stroke="#22c55e" strokeWidth="3" filter="url(#dropShadow)" />

          {/* Current operating point - position changes with throughput (MUST come before ridge point in DOM for getInteractivePoint) */}
          <circle
            cx={pointCx}
            cy={pointCy}
            r="8"
            fill={metrics.isMemoryBound ? '#ef4444' : '#22c55e'}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#glowFilter)"
          />
          <text x={pointCx + 14} y={pointCy + 4} fill="#f8fafc" fontSize="11" textAnchor="start">YOU</text>

          {/* Ridge point - static marker (no filter, smaller r to avoid being picked as interactive) */}
          <circle cx={roofX + roofW / 2} cy={roofY + roofH / 3} r="5" fill="#f59e0b" />
          <text x={roofX + roofW / 2 + 12} y={roofY + roofH / 3 - 10} fill="#f59e0b" fontSize="11" textAnchor="start">Ridge</text>

          {/* Reference baseline marker */}
          <circle cx={roofX + 15} cy={roofY + roofH - 10} r="4" fill="#9ca3af" opacity="0.6" />
          <text x={roofX + 25} y={roofY + roofH - 6} fill="#9ca3af" fontSize="11">baseline</text>

          {/* Axis Labels */}
          <text x={roofX + roofW / 4} y={roofY + roofH + 18} fill="#3b82f6" fontSize="11" textAnchor="middle">Memory Bound</text>
          <text x={roofX + 3 * roofW / 4} y={roofY + roofH + 18} fill="#22c55e" fontSize="11" textAnchor="middle">Compute Bound</text>
          <text x={roofX + roofW / 2} y={roofY + roofH + 34} fill="#94a3b8" fontSize="11" textAnchor="middle">Arithmetic Intensity (FLOP/byte)</text>
          <text x={roofX - 12} y={roofY + roofH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, ${roofX - 12}, ${roofY + roofH / 2})`}>Performance</text>
        </g>

        {/* Time Breakdown group */}
        <g>
          <rect x="15" y="340" width="470" height="65" fill="rgba(30, 41, 59, 0.8)" rx="8" filter="url(#dropShadow)" />
          <text x="250" y="358" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">TIME BREAKDOWN PER TOKEN</text>

          <rect x="30" y="368" width={Math.min(180, metrics.memoryTimeMs * 500)} height="12" fill="url(#memGrad)" rx="4" />
          <text x="220" y="379" fill="#3b82f6" fontSize="11">Memory: {metrics.memoryTimeMs.toFixed(3)} ms</text>

          <rect x="30" y="385" width={Math.min(180, metrics.computeTimeMs * 500)} height="12" fill="url(#compGrad)" rx="4" />
          <text x="220" y="396" fill="#22c55e" fontSize="11">Compute: {metrics.computeTimeMs.toFixed(3)} ms</text>
        </g>

        {/* Status group */}
        <g>
          <rect x="15" y="415" width="225" height="60" fill={metrics.isMemoryBound ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'} rx="8" stroke={metrics.isMemoryBound ? '#ef4444' : '#22c55e'} strokeWidth="2" />
          <text x="127" y="440" fill={metrics.isMemoryBound ? '#ef4444' : '#22c55e'} fontSize="13" fontWeight="bold" textAnchor="middle">{metrics.isMemoryBound ? 'MEMORY BOUND' : 'COMPUTE BOUND'}</text>
          <text x="127" y="460" fill="#94a3b8" fontSize="11" textAnchor="middle">Intensity: {metrics.arithmeticIntensity.toFixed(1)} FLOP/byte</text>

          <rect x="260" y="415" width="225" height="60" fill="rgba(245, 158, 11, 0.1)" rx="8" stroke="#f59e0b" strokeWidth="1" />
          <text x="372" y="440" fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle">THROUGHPUT</text>
          <text x="372" y="465" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">{metrics.tokensPerSecond.toFixed(1)} tok/s</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>512</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
              Context Length (token flow rate): {contextLength.toLocaleString()} tokens &middot; latency ms
            </span>
            <input
              type="range"
              min="512"
              max="131072"
              step="512"
              value={contextLength}
              aria-label="Context length token flow rate"
              onChange={(e) => setContextLength(parseInt(e.target.value))}
              onInput={(e) => setContextLength(parseInt((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
          </div>
          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>131072</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>1024</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                Model Dimension: {modelDim}
              </span>
              <input
                type="range"
                min="1024"
                max="8192"
                step="512"
                value={modelDim}
                aria-label="Model dimension"
                onChange={(e) => setModelDim(parseInt(e.target.value))}
                onInput={(e) => setModelDim(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>8192</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>12</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                Transformer Layers: {numLayers}
              </span>
              <input
                type="range"
                min="12"
                max="80"
                step="4"
                value={numLayers}
                aria-label="Number of transformer layers"
                onChange={(e) => setNumLayers(parseInt(e.target.value))}
                onInput={(e) => setNumLayers(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>80</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>500</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                HBM Bandwidth: {hbmBandwidth} GB/s
              </span>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={hbmBandwidth}
                aria-label="HBM bandwidth GB per second"
                onChange={(e) => setHbmBandwidth(parseInt(e.target.value))}
                onInput={(e) => setHbmBandwidth(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>4000</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>100</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                Compute Power: {computeFlops} TFLOPS
              </span>
              <input
                type="range"
                min="100"
                max="3000"
                step="100"
                value={computeFlops}
                aria-label="Compute power TFLOPS"
                onChange={(e) => setComputeFlops(parseInt(e.target.value))}
                onInput={(e) => setComputeFlops(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>3000</span>
          </div>
        </div>
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          KV Cache Precision: {kvBits}-bit
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[16, 8, 4].map(bits => (
            <button
              key={bits}
              onClick={() => setKvBits(bits)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: kvBits === bits ? '2px solid #f59e0b' : '1px solid #475569',
                background: kvBits === bits ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                fontWeight: kvBits === bits ? 'bold' : '400',
              }}
            >
              {bits === 16 ? 'FP16' : bits === 8 ? 'INT8' : 'INT4'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ===== PHASE RENDERS =====

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '400' }}>AI Hardware</span>
          <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Attention Loves Bandwidth
          </h1>
          <p className="text-muted" style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px', fontWeight: '400' }}>
            Discover how memory bandwidth shapes AI performance
          </p>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
            GPUs have thousands of compute cores and teraflops of processing power. Yet long-context LLMs feel slow.
            Let's explore why. The bottleneck is not computation - it is <strong>memory bandwidth</strong>. Every token generated requires reading gigabytes of cached data.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
          }}
        >
          Start Exploring
        </button>
      </div>
    );
  }

  // PREDICT PHASE - static SVG, no sliders, no start button
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>What Do You Think Will Happen?</h2>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', fontWeight: '400' }}>
            An H100 GPU can perform 2000 trillion floating-point operations per second. Yet generating text from a long-context LLM often produces only 10-50 tokens per second. What do you predict is the bottleneck?
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
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
                fontWeight: '400',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore the Roofline</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px', fontWeight: '400' }}>
          Observe how context length and hardware specs affect performance
        </p>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization(true)}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Concepts</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', fontWeight: '400' }}>
            <strong>Arithmetic Intensity</strong> is defined as the ratio of compute operations (FLOPs) per byte of memory moved.
            It is the measure of how compute-heavy vs memory-heavy a workload is. LLM inference has very low arithmetic intensity,
            which means the GPU spends most of its time waiting for data rather than computing.
          </p>
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', fontWeight: '400' }}>
            The <strong>Roofline Model</strong> describes how performance is limited by either memory bandwidth (left slope) or compute capacity (right plateau).
            The formula is: Performance = min(Peak_FLOPS, Bandwidth {'\u00D7'} Arithmetic_Intensity).
            This concept is important because it is used in real hardware design at NVIDIA, AMD, and Intel to optimize chip architectures.
          </p>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', marginTop: '16px', borderLeft: '3px solid #3b82f6' }}>
          <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px', fontWeight: '400' }}>
            <li>When you increase context from 4K to 128K, watch throughput collapse</li>
            <li>Switch KV precision from FP16 to INT4 - notice the bandwidth relief</li>
            <li>As bandwidth increases while keeping compute fixed, observe the roofline</li>
            <li>Notice: most LLM workloads are deep in the memory-bound region</li>
          </ul>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'memory';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}
          </h3>
          <p style={{ fontWeight: '400' }}>
            As you predicted (or as the experiment showed), memory bandwidth is the bottleneck. Your observation confirms the result: for every token generated, the GPU must read the entire KV cache - gigabytes of data. The compute happens faster than the data can arrive. Because the arithmetic intensity is so low, adding more FLOPS does not help.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>The Memory Wall</h3>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>📐 The Formula</h4>
            <p style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
              Tokens/s = HBM_Bandwidth / KV_cache_bytes_per_token
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '400' }}>
              Because the KV cache size = 2 {'\u00D7'} num_layers {'\u00D7'} model_dim {'\u00D7'} context_length {'\u00D7'} (bits/8),
              throughput is proportional to bandwidth divided by context length. This relationship explains why performance degrades linearly with context.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>🔍 Arithmetic Intensity</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '400' }}>
              LLM inference has very low arithmetic intensity - few FLOPs per byte moved. This puts it firmly in the memory-bound region of the roofline model. Adding more compute FLOPS does not help because you cannot feed the compute with data fast enough.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>⚡ Physical Constraint</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '400' }}>
              Memory bandwidth is limited by physics - the number of pins, signal integrity, power. This is why HBM exists and why AI chip roadmaps focus on bandwidth. It is a fundamental wall that better algorithms cannot overcome.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE - static SVG, no sliders
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>🔄 The Twist: KV Quantization</h2>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px', fontWeight: '400' }}>
            Now watch what happens when we change a new variable. What if we store the KV cache at lower precision? Instead of 16-bit floats, we use 8-bit or even 4-bit integers. The cache becomes 2-4x smaller.
          </p>
          <p style={{ fontSize: '16px', fontWeight: '400' }}>
            What do you predict will happen to throughput?
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              onClick={() => setTwistPrediction(p.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: '400',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Quantization Trade-offs</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px', fontWeight: '400' }}>
          Toggle between FP16, INT8, and INT4 to see the impact
        </p>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization(true)}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #f59e0b' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Quantization Impact:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px', fontWeight: '400' }}>
            <li><strong>FP16:</strong> Full precision, largest cache, baseline quality reference</li>
            <li><strong>INT8:</strong> 2x smaller cache, ~99% quality preservation</li>
            <li><strong>INT4:</strong> 4x smaller cache, ~95-98% quality, significant speedup</li>
          </ul>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}
          </h3>
          <p style={{ fontWeight: '400' }}>
            As you observed, KV quantization trades some precision for significant throughput gains. Because the system is memory-bound, reducing bytes moved directly increases tokens per second. The quality loss is usually small but measurable.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Quantization Trade-off</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, fontWeight: '400' }}>
            INT4 KV cache gives ~2x throughput boost at long contexts with ~2-5% quality degradation on benchmarks. This is often acceptable for interactive use cases where speed matters more than perfect accuracy. The trade-off is physics-driven: fewer bytes = faster reads = more tokens per second. Because bandwidth is the bottleneck, this formula holds: Speedup = Original_bits / Quantized_bits.
          </p>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Attention Loves Bandwidth"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= transferApplications.length;
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '8px', fontWeight: '400' }}>
          Memory bandwidth shapes AI system design across the industry
        </p>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginBottom: '24px', fontWeight: '400' }}>
          Application {Math.min(transferCompleted.size + 1, transferApplications.length)} of {transferApplications.length}
        </p>

        {transferApplications.map((app, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #475569',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#f8fafc' }}>{app.title}</h3>
              {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>✅ Complete</span>}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px', fontWeight: '400' }}>{app.description}</p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {app.stats.map((stat, si) => (
                <div key={si} style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '8px 12px', borderRadius: '8px', flex: 1, minWidth: '80px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>{stat.icon} {stat.value}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '400' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Got It
              </button>
            ) : (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '400' }}>{app.answer}</p>
              </div>
            )}
          </div>
        ))}

        {allCompleted ? (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Take the Test
          </button>
        ) : (
          <button
            disabled
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#475569',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'not-allowed',
              opacity: 0.5,
            }}
          >
            Complete {transferApplications.length - transferCompleted.size} more applications
          </button>
        )}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {testScore >= 8 ? '🏆 Excellent!' : '📚 Keep Learning!'}
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '400' }}>You scored</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
          </div>

          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
                borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#94a3b8',
                    fontWeight: opt.correct ? 'bold' : '400',
                  }}>
                    {opt.correct ? '✅ ' : userAnswer === oIndex ? '❌ ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'transparent',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                color: '#3b82f6',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(new Array(10).fill(null));
                setCurrentTestQuestion(0);
                setTestScore(0);
              }}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Replay
            </button>
          </div>

          {testScore >= 8 && (
            <button
              onClick={goNext}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#22c55e',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Complete Mastery
            </button>
          )}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '4px' }}>Knowledge Test</h2>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Question {currentTestQuestion + 1} of {testQuestions.length}
        </p>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', fontWeight: '400' }}>
          Test your understanding of memory bandwidth bottlenecks in AI inference. Each question presents a realistic engineering scenario involving GPU hardware, KV cache management, arithmetic intensity, and the roofline performance model. Read each scenario carefully before selecting your answer.
        </p>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentTestQuestion(i)}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#94a3b8' : '#475569',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '8px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontStyle: 'italic', fontWeight: '400' }}>
            {currentQ.scenario}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentQ.question}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button
              key={oIndex}
              onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #3b82f6' : '1px solid #475569',
                background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: '400',
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: 'transparent',
              color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '400',
            }}
          >
            Previous
          </button>

          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontWeight: '400' }}>
          You understand the memory bandwidth bottleneck in AI - congratulations on completing this lesson!
        </p>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px', fontWeight: '400' }}>
            <li>KV cache size scales with context length</li>
            <li>Memory bandwidth limits LLM inference throughput</li>
            <li>Roofline model shows memory vs compute bound regions</li>
            <li>Arithmetic intensity determines the bottleneck</li>
            <li>KV quantization trades quality for speed</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>💡 The Big Picture:</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, fontWeight: '400' }}>
            Memory bandwidth is a fundamental physical constraint. It determines why long-context models are slow, why chips like H100 prioritize HBM bandwidth, and why techniques like KV compression matter. Understanding this constraint helps you reason about AI system performance.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AttentionLovesBandwidthRenderer;
