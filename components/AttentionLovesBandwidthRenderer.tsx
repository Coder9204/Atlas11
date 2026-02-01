import React, { useState, useCallback, useEffect, useRef } from 'react';

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

const realWorldApps = [
  {
    icon: '🤖',
    title: 'Large Language Model Inference',
    short: 'LLM token generation',
    tagline: 'Memory bandwidth limits AI response speed',
    description: 'When ChatGPT or Claude generates responses, each new token requires reading the entire key-value cache from memory. This memory bandwidth bottleneck determines how fast AI can "think."',
    connection: 'The attention mechanism must read all previous context to generate each new token. With 100K+ context windows, this means moving gigabytes of data from HBM memory for every single token.',
    howItWorks: 'GPU HBM bandwidth (~3 TB/s for H100) divided by KV cache size determines max token throughput. At 100K context with 70B parameters, the KV cache alone can be 40GB+ per request.',
    stats: [
      { value: '3.35 TB/s', label: 'H100 HBM bandwidth', icon: '⚡' },
      { value: '100K+', label: 'Context window', icon: '📝' },
      { value: '10x', label: 'Memory vs compute bound', icon: '📊' }
    ],
    examples: ['ChatGPT', 'Claude', 'Gemini', 'Llama inference'],
    companies: ['OpenAI', 'Anthropic', 'Google', 'Meta'],
    futureImpact: 'Techniques like KV cache quantization, sparse attention, and speculative decoding are pushing the boundaries of what\'s possible within memory bandwidth constraints.',
    color: '#8B5CF6'
  },
  {
    icon: '🎮',
    title: 'GPU-Accelerated Gaming',
    short: 'Real-time graphics rendering',
    tagline: 'Textures and shaders compete for bandwidth',
    description: 'Modern games require moving massive textures, vertex data, and shader parameters between GPU memory and compute units. Memory bandwidth often limits frame rates more than raw compute.',
    connection: 'At 4K resolution with complex materials, the GPU needs to fetch gigabytes of texture data per second. The memory bandwidth ceiling creates the "bandwidth wall" that limits visual fidelity.',
    howItWorks: 'GPUs use wide memory buses (384-bit) and fast GDDR6X (21 Gbps) to achieve 1+ TB/s bandwidth. Texture compression, mesh shaders, and variable rate shading all help reduce bandwidth demands.',
    stats: [
      { value: '1 TB/s', label: 'RTX 4090 bandwidth', icon: '🎮' },
      { value: '24GB', label: 'VRAM capacity', icon: '💾' },
      { value: '4K@144Hz', label: 'Target performance', icon: '🖥️' }
    ],
    examples: ['Ray-traced games', 'VR rendering', 'AI upscaling', 'Streaming graphics'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'Sony'],
    futureImpact: 'Chiplet GPUs with stacked HBM memory will dramatically increase bandwidth, enabling photorealistic real-time rendering and higher resolution VR.',
    color: '#10B981'
  },
  {
    icon: '🧠',
    title: 'Neural Network Training',
    short: 'Deep learning optimization',
    tagline: 'Gradient synchronization at scale',
    description: 'Training large AI models requires constantly moving weights, activations, and gradients. Multi-GPU training adds network bandwidth constraints on top of memory bandwidth.',
    connection: 'Each training step reads all model weights from memory. For a 70B parameter model in FP16, that\'s 140GB of memory reads per forward pass - bandwidth becomes the limiting factor.',
    howItWorks: 'Distributed training uses gradient all-reduce across GPUs. Network bandwidth (InfiniBand at 400 Gb/s) and memory bandwidth both constrain training throughput. Gradient compression helps.',
    stats: [
      { value: '400 Gb/s', label: 'InfiniBand speed', icon: '🔗' },
      { value: '16K', label: 'GPUs in cluster', icon: '🖥️' },
      { value: '$100M+', label: 'Training cost', icon: '💰' }
    ],
    examples: ['GPT-4 training', 'Gemini training', 'Llama training', 'Stable Diffusion'],
    companies: ['NVIDIA', 'Google', 'Microsoft', 'Meta'],
    futureImpact: 'New interconnects like NVLink-C2C and CXL will blur the line between local and remote memory, enabling larger models with better bandwidth utilization.',
    color: '#F59E0B'
  },
  {
    icon: '📊',
    title: 'High-Frequency Trading',
    short: 'Ultra-low latency finance',
    tagline: 'Nanoseconds matter in markets',
    description: 'HFT systems process market data and execute trades in microseconds. Memory bandwidth determines how fast trading algorithms can evaluate opportunities across thousands of instruments.',
    connection: 'Each market update triggers reads of position data, risk limits, and model parameters. With millions of updates per second, memory bandwidth directly translates to trading edge.',
    howItWorks: 'FPGA and custom ASIC trading systems use wide, fast memory interfaces. Data structures are carefully aligned for cache efficiency. Every nanosecond of latency costs money.',
    stats: [
      { value: '<1μs', label: 'Trade latency', icon: '⚡' },
      { value: '10M', label: 'Messages/second', icon: '📨' },
      { value: '$6B', label: 'Annual HFT profits', icon: '💰' }
    ],
    examples: ['Stock exchanges', 'Crypto trading', 'Forex markets', 'Options market making'],
    companies: ['Citadel', 'Two Sigma', 'Jane Street', 'Virtu'],
    futureImpact: 'Quantum computing may eventually break the bandwidth barrier for portfolio optimization, while AI systems push classical computing to its limits.',
    color: '#EF4444'
  }
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
  const [isMobile, setIsMobile] = useState(false);
  const lastPhaseChangeRef = useRef<number>(0);

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

  // Sync with external gamePhase prop for resume
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation functions
  const goToPhase = useCallback((newPhase: BandwidthPhase) => {
    const now = Date.now();
    if (now - lastPhaseChangeRef.current < 300) return; // Debounce
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
  const [modelDim, setModelDim] = useState(4096); // hidden dimension
  const [numLayers, setNumLayers] = useState(32);
  const [kvBits, setKvBits] = useState(16); // KV cache precision (16 = fp16, 8 = int8, 4 = int4)
  const [hbmBandwidth, setHbmBandwidth] = useState(2000); // GB/s (H100 ~3.35 TB/s)
  const [computeFlops, setComputeFlops] = useState(1000); // TFLOPS

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
    // KV cache size per token per layer: 2 (K and V) * modelDim * kvBits/8 bytes
    const kvBytesPerTokenPerLayer = 2 * modelDim * (kvBits / 8);
    const kvBytesPerToken = kvBytesPerTokenPerLayer * numLayers;
    const totalKvCacheBytes = contextLength * kvBytesPerToken;
    const totalKvCacheGB = totalKvCacheBytes / (1024 * 1024 * 1024);

    // Memory reads per token: need to read all KV cache for attention
    const memoryReadsPerToken = totalKvCacheBytes;
    const memoryReadGB = memoryReadsPerToken / (1024 * 1024 * 1024);

    // Time to read KV cache (memory bound)
    const memoryTimeMs = (memoryReadGB / hbmBandwidth) * 1000;

    // Compute for attention: O(context * dimension) per layer
    const attentionFlopsPerToken = 2 * contextLength * modelDim * numLayers;
    const totalTflops = attentionFlopsPerToken / 1e12;

    // Time for compute (compute bound)
    const computeTimeMs = (totalTflops / computeFlops) * 1000;

    // Actual time is max of memory and compute (whichever is slower)
    const actualTimeMs = Math.max(memoryTimeMs, computeTimeMs);

    // Arithmetic intensity: FLOPS per byte moved
    const arithmeticIntensity = attentionFlopsPerToken / memoryReadsPerToken;

    // Roofline ridge point: where compute = memory bound
    const ridgePoint = computeFlops * 1e12 / (hbmBandwidth * 1e9);

    // Throughput in tokens/second
    const tokensPerSecond = 1000 / actualTimeMs;

    // Is the system memory bound or compute bound?
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

  const transferApplications = [
    {
      title: 'Long-Context LLMs (Claude, GPT-4 Turbo)',
      description: 'Modern LLMs support 100K+ token contexts, but performance degrades with length.',
      question: 'Why do long-context queries feel slower even on the same hardware?',
      answer: 'The KV cache grows linearly with context length. At 100K tokens, you might have 10GB+ of KV cache to read for every generated token. Memory bandwidth becomes the bottleneck, limiting throughput to just a few tokens per second.',
    },
    {
      title: 'Retrieval-Augmented Generation (RAG)',
      description: 'RAG retrieves relevant documents and includes them in the prompt context.',
      question: 'From a hardware perspective, why might RAG be preferable to very long contexts?',
      answer: 'RAG keeps the context window smaller by retrieving only relevant chunks. This reduces KV cache size, improving memory bandwidth utilization. A 4K context with perfect retrieval can outperform 100K context with everything, both in quality and speed.',
    },
    {
      title: 'Speculative Decoding',
      description: 'A small draft model proposes multiple tokens, verified in parallel by the main model.',
      question: 'How does speculative decoding help with memory bandwidth limitations?',
      answer: 'By verifying multiple draft tokens in parallel, we amortize the memory bandwidth cost of loading the KV cache. Instead of loading the cache once per token, we load it once for potentially 4-8 tokens, improving effective throughput.',
    },
    {
      title: 'Hardware Trends (HBM3, HBM4)',
      description: 'New memory technologies focus on increasing bandwidth, not just capacity.',
      question: 'Why are AI chip designers prioritizing memory bandwidth over compute FLOPS?',
      answer: 'Modern GPUs already have more compute than they can feed with data. The H100 has 3+ TB/s bandwidth but 2000 TFLOPS compute - for LLM inference, the arithmetic intensity is so low that memory wins. HBM3/HBM4 push bandwidth even higher.',
    },
  ];

  const testQuestions = [
    {
      question: 'The KV cache stores:',
      options: [
        { text: 'The model weights', correct: false },
        { text: 'Key and Value tensors from previous token computations', correct: true },
        { text: 'The input text in compressed form', correct: false },
        { text: 'GPU temperature readings', correct: false },
      ],
    },
    {
      question: 'Arithmetic intensity measures:',
      options: [
        { text: 'How hard the math problems are', correct: false },
        { text: 'Compute operations per byte of memory moved', correct: true },
        { text: 'The speed of the GPU', correct: false },
        { text: 'Power consumption', correct: false },
      ],
    },
    {
      question: 'A system is "memory bound" when:',
      options: [
        { text: 'It runs out of memory', correct: false },
        { text: 'Memory bandwidth limits performance, not compute', correct: true },
        { text: 'The memory is too slow to store data', correct: false },
        { text: 'More RAM is needed', correct: false },
      ],
    },
    {
      question: 'As context length increases, LLM throughput typically:',
      options: [
        { text: 'Increases because more data is processed', correct: false },
        { text: 'Decreases because KV cache reads scale with context', correct: true },
        { text: 'Stays constant', correct: false },
        { text: 'Fluctuates randomly', correct: false },
      ],
    },
    {
      question: 'HBM (High Bandwidth Memory) is used in AI chips because:',
      options: [
        { text: 'It is cheaper than regular RAM', correct: false },
        { text: 'It provides much higher bandwidth than DDR memory', correct: true },
        { text: 'It uses less power', correct: false },
        { text: 'It has more storage capacity', correct: false },
      ],
    },
    {
      question: 'The roofline model shows that LLM inference is typically:',
      options: [
        { text: 'On the compute-bound slope', correct: false },
        { text: 'On the memory-bound flat region', correct: true },
        { text: 'At the ridge point', correct: false },
        { text: 'Off the chart entirely', correct: false },
      ],
    },
    {
      question: 'KV cache quantization (e.g., FP16 to INT4) helps because:',
      options: [
        { text: 'It makes computations faster', correct: false },
        { text: 'Smaller data means less memory bandwidth needed', correct: true },
        { text: 'It improves model accuracy', correct: false },
        { text: 'It reduces power consumption only', correct: false },
      ],
    },
    {
      question: 'Why does attention scale poorly with context length?',
      options: [
        { text: 'The math becomes harder', correct: false },
        { text: 'Every token must attend to all previous tokens (O(n) memory reads)', correct: true },
        { text: 'The GPU gets confused', correct: false },
        { text: 'Network latency increases', correct: false },
      ],
    },
    {
      question: 'A 70B parameter model at long context is slower primarily because:',
      options: [
        { text: 'More parameters means more math', correct: false },
        { text: 'Larger KV cache means more memory bandwidth consumption', correct: true },
        { text: 'The model thinks harder', correct: false },
        { text: 'Electricity costs more', correct: false },
      ],
    },
    {
      question: 'The physical constraint that limits long-context LLMs is:',
      options: [
        { text: 'CPU speed', correct: false },
        { text: 'Memory bandwidth and energy cost of data movement', correct: true },
        { text: 'Internet connection', correct: false },
        { text: 'Display refresh rate', correct: false },
      ],
    },
  ];

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

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        flexWrap: 'wrap'
      }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: index === currentIndex
                ? '#3b82f6'
                : index < currentIndex
                  ? '#22c55e'
                  : '#475569',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        marginTop: '24px',
        borderTop: '1px solid #334155'
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
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
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
          {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '12px 24px',
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
      </div>
    );
  };

  // Wrapper for phase content
  const renderPhaseContent = (content: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {renderProgressBar()}
      <div style={{ padding: '0 24px 24px 24px' }}>
        {content}
      </div>
      {renderBottomBar()}
    </div>
  );

  const renderVisualization = () => {
    const metrics = calculateMetrics();

    // Roofline visualization
    const rooflineWidth = 300;
    const rooflineHeight = 150;

    return (
      <svg width="100%" height="520" viewBox="0 0 500 520" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="memoryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="computeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="520" fill="#0f172a" rx="12" />

        {/* Title */}
        <text x="250" y="30" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
          Attention Memory Bandwidth Analysis
        </text>

        {/* KV Cache Stats */}
        <g transform="translate(20, 50)">
          <rect width="220" height="90" fill="rgba(59, 130, 246, 0.1)" rx="8" stroke="#3b82f6" strokeWidth="1" />
          <text x="110" y="20" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">KV CACHE</text>
          <text x="15" y="45" fill="#94a3b8" fontSize="10">Context: {contextLength.toLocaleString()} tokens</text>
          <text x="15" y="62" fill="#94a3b8" fontSize="10">Precision: {kvBits}-bit</text>
          <text x="15" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold">Size: {metrics.kvCacheSizeGB.toFixed(2)} GB</text>
        </g>

        {/* Hardware Stats */}
        <g transform="translate(260, 50)">
          <rect width="220" height="90" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="#22c55e" strokeWidth="1" />
          <text x="110" y="20" fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="middle">HARDWARE</text>
          <text x="15" y="45" fill="#94a3b8" fontSize="10">Bandwidth: {hbmBandwidth} GB/s</text>
          <text x="15" y="62" fill="#94a3b8" fontSize="10">Compute: {computeFlops} TFLOPS</text>
          <text x="15" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold">Ridge: {metrics.ridgePoint.toFixed(0)} FLOP/byte</text>
        </g>

        {/* Roofline Plot */}
        <g transform="translate(50, 160)">
          <text x="200" y="0" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">ROOFLINE MODEL</text>

          {/* Axes */}
          <line x1="0" y1={rooflineHeight} x2={rooflineWidth} y2={rooflineHeight} stroke="#475569" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2={rooflineHeight} stroke="#475569" strokeWidth="1" />

          {/* Memory bound slope */}
          <line
            x1="0"
            y1={rooflineHeight}
            x2={rooflineWidth / 2}
            y2={rooflineHeight / 3}
            stroke="#3b82f6"
            strokeWidth="3"
          />

          {/* Compute bound ceiling */}
          <line
            x1={rooflineWidth / 2}
            y1={rooflineHeight / 3}
            x2={rooflineWidth}
            y2={rooflineHeight / 3}
            stroke="#22c55e"
            strokeWidth="3"
          />

          {/* Ridge point marker */}
          <circle cx={rooflineWidth / 2} cy={rooflineHeight / 3} r="6" fill="#f59e0b" />
          <text x={rooflineWidth / 2} y={rooflineHeight / 3 - 15} fill="#f59e0b" fontSize="9" textAnchor="middle">Ridge Point</text>

          {/* Current operating point */}
          <circle
            cx={Math.min(rooflineWidth - 20, metrics.arithmeticIntensity * 10)}
            cy={metrics.isMemoryBound ? rooflineHeight - 30 : rooflineHeight / 3}
            r="8"
            fill={metrics.isMemoryBound ? '#ef4444' : '#22c55e'}
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text
            x={Math.min(rooflineWidth - 20, metrics.arithmeticIntensity * 10)}
            y={metrics.isMemoryBound ? rooflineHeight - 45 : rooflineHeight / 3 - 20}
            fill="#f8fafc"
            fontSize="8"
            textAnchor="middle"
          >
            YOU
          </text>

          {/* Labels */}
          <text x={rooflineWidth / 4} y={rooflineHeight + 20} fill="#3b82f6" fontSize="9" textAnchor="middle">Memory Bound</text>
          <text x={3 * rooflineWidth / 4} y={rooflineHeight + 20} fill="#22c55e" fontSize="9" textAnchor="middle">Compute Bound</text>
          <text x={-10} y={rooflineHeight / 2} fill="#94a3b8" fontSize="8" textAnchor="middle" transform={`rotate(-90, -10, ${rooflineHeight / 2})`}>Perf</text>
          <text x={rooflineWidth / 2} y={rooflineHeight + 35} fill="#94a3b8" fontSize="8" textAnchor="middle">Arithmetic Intensity (FLOP/byte)</text>
        </g>

        {/* Time Breakdown */}
        <g transform="translate(20, 350)">
          <rect width="460" height="70" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="230" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">TIME BREAKDOWN PER TOKEN</text>

          {/* Memory time bar */}
          <rect x="20" y="35" width={Math.min(200, metrics.memoryTimeMs * 500)} height="15" fill="url(#memoryGrad)" rx="4" />
          <text x="230" y="47" fill="#3b82f6" fontSize="10">Memory: {metrics.memoryTimeMs.toFixed(3)} ms</text>

          {/* Compute time bar */}
          <rect x="20" y="52" width={Math.min(200, metrics.computeTimeMs * 500)} height="15" fill="url(#computeGrad)" rx="4" />
          <text x="230" y="64" fill="#22c55e" fontSize="10">Compute: {metrics.computeTimeMs.toFixed(3)} ms</text>
        </g>

        {/* Bottleneck Indicator */}
        <g transform="translate(20, 435)">
          <rect
            width="220"
            height="60"
            fill={metrics.isMemoryBound ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}
            rx="8"
            stroke={metrics.isMemoryBound ? '#ef4444' : '#22c55e'}
            strokeWidth="2"
          />
          <text x="110" y="25" fill={metrics.isMemoryBound ? '#ef4444' : '#22c55e'} fontSize="12" fontWeight="bold" textAnchor="middle">
            {metrics.isMemoryBound ? 'MEMORY BOUND' : 'COMPUTE BOUND'}
          </text>
          <text x="110" y="45" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Intensity: {metrics.arithmeticIntensity.toFixed(1)} FLOP/byte
          </text>
        </g>

        {/* Throughput */}
        <g transform="translate(260, 435)">
          <rect width="220" height="60" fill="rgba(245, 158, 11, 0.1)" rx="8" stroke="#f59e0b" strokeWidth="1" />
          <text x="110" y="25" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">THROUGHPUT</text>
          <text x="110" y="50" fill="#f8fafc" fontSize="18" fontWeight="bold" textAnchor="middle">
            {metrics.tokensPerSecond.toFixed(1)} tok/s
          </text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Context Length: {contextLength.toLocaleString()} tokens
        </label>
        <input
          type="range"
          min="512"
          max="131072"
          step="512"
          value={contextLength}
          onChange={(e) => setContextLength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Model Dimension: {modelDim}
          </label>
          <input
            type="range"
            min="1024"
            max="8192"
            step="512"
            value={modelDim}
            onChange={(e) => setModelDim(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Layers: {numLayers}
          </label>
          <input
            type="range"
            min="12"
            max="80"
            step="4"
            value={numLayers}
            onChange={(e) => setNumLayers(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            HBM Bandwidth: {hbmBandwidth} GB/s
          </label>
          <input
            type="range"
            min="500"
            max="4000"
            step="100"
            value={hbmBandwidth}
            onChange={(e) => setHbmBandwidth(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Compute: {computeFlops} TFLOPS
          </label>
          <input
            type="range"
            min="100"
            max="3000"
            step="100"
            value={computeFlops}
            onChange={(e) => setComputeFlops(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
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
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {bits === 16 ? 'FP16' : bits === 8 ? 'INT8' : 'INT4'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Hardware</span>
          <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Attention Loves Bandwidth
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
            What is the physical limiter of long-context LLMs?
          </p>
        </div>

        {renderVisualization()}

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
            GPUs have thousands of compute cores and teraflops of processing power. Yet long-context LLMs feel slow. The bottleneck is not computation - it is memory bandwidth. Every token generated requires reading gigabytes of cached data.
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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Make a Prediction
        </button>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px' }}>
            An H100 GPU can perform 2000 trillion floating-point operations per second. Yet generating text from a long-context LLM often produces only 10-50 tokens per second. What is the bottleneck?
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
                WebkitTapHighlightColor: 'transparent',
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
              WebkitTapHighlightColor: 'transparent',
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
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
          See how context length and hardware specs affect performance
        </p>

        {renderVisualization()}
        {renderControls()}

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Try These Experiments:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Increase context from 4K to 128K - watch throughput collapse</li>
            <li>Switch KV precision from FP16 to INT4 - see bandwidth relief</li>
            <li>Crank up bandwidth while keeping compute fixed - observe the roofline</li>
            <li>Notice: most LLM workloads are deep in the memory-bound region</li>
          </ul>
        </div>

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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Review the Concepts
        </button>
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
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p>
            Memory bandwidth is the bottleneck. For every token generated, the GPU must read the entire KV cache - gigabytes of data. The compute happens faster than the data can arrive.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>The Memory Wall</h3>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Why Bandwidth Matters</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Attention requires reading all previous keys and values to compute the next token. At 100K context with a 70B model, this can be 10+ GB of data per token. Even at 3+ TB/s bandwidth, that limits you to 300 tokens/second max - and that is before compute.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>Arithmetic Intensity</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              LLM inference has very low arithmetic intensity - few FLOPs per byte moved. This puts it firmly in the memory-bound region of the roofline model. Adding more compute FLOPS does not help when you cannot feed the compute with data fast enough.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>Physical Constraint</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Memory bandwidth is limited by physics - the number of pins, signal integrity, power. This is why HBM exists and why AI chip roadmaps focus on bandwidth. It is a fundamental wall that better algorithms cannot overcome.
            </p>
          </div>
        </div>

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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Next: A Twist!
        </button>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: KV Quantization</h2>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>
            What if we store the KV cache at lower precision? Instead of 16-bit floats, we use 8-bit or even 4-bit integers. The cache becomes 2-4x smaller.
          </p>
          <p style={{ fontSize: '16px' }}>
            What is the effect?
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
                border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                WebkitTapHighlightColor: 'transparent',
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
              WebkitTapHighlightColor: 'transparent',
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
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
          Toggle between FP16, INT8, and INT4 to see the impact
        </p>

        {renderVisualization()}
        {renderControls()}

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #f59e0b' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Quantization Impact:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>FP16:</strong> Full precision, largest cache, baseline quality</li>
            <li><strong>INT8:</strong> 2x smaller cache, ~99% quality preservation</li>
            <li><strong>INT4:</strong> 4x smaller cache, ~95-98% quality, significant speedup</li>
          </ul>
        </div>

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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See the Explanation
        </button>
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
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p>
            KV quantization trades some precision for significant throughput gains. Because the system is memory-bound, reducing bytes moved directly increases tokens per second. The quality loss is usually small but measurable.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Quantization Trade-off</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
            INT4 KV cache gives ~2x throughput boost at long contexts with ~2-5% quality degradation on benchmarks. This is often acceptable for interactive use cases where speed matters more than perfect accuracy. The trade-off is physics-driven: fewer bytes = faster reads = more tokens per second.
          </p>
        </div>

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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Apply This Knowledge
        </button>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
          Memory bandwidth shapes AI system design
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
              {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>Complete</span>}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: '#3b82f6', fontSize: '14px' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: 'transparent',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={goNext}
          disabled={transferCompleted.size < 4}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: transferCompleted.size >= 4 ? '#3b82f6' : '#475569',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: transferCompleted.size >= 4 ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {transferCompleted.size >= 4 ? 'Take the Test' : `Complete ${4 - transferCompleted.size} more applications`}
        </button>
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
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
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
                  }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}

          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: testScore >= 8 ? '#22c55e' : '#3b82f6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'}
          </button>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Knowledge Test</h2>
          <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
        </div>

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
              }}
            />
          ))}
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '16px' }}>{currentQ.question}</p>
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
                WebkitTapHighlightColor: 'transparent',
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
              WebkitTapHighlightColor: 'transparent',
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
                WebkitTapHighlightColor: 'transparent',
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
                WebkitTapHighlightColor: 'transparent',
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
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
        <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          You understand the memory bandwidth bottleneck in AI
        </p>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>KV cache size scales with context length</li>
            <li>Memory bandwidth limits LLM inference throughput</li>
            <li>Roofline model shows memory vs compute bound regions</li>
            <li>Arithmetic intensity determines the bottleneck</li>
            <li>KV quantization trades quality for speed</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>The Big Picture:</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
            Memory bandwidth is a fundamental physical constraint. It determines why long-context models are slow, why chips like H100 prioritize HBM bandwidth, and why techniques like KV compression matter. Understanding this constraint helps you reason about AI system performance.
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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Complete
        </button>
      </div>
    );
  }

  return null;
};

export default AttentionLovesBandwidthRenderer;
