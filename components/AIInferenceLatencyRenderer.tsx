import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface AIInferenceLatencyRendererProps {
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
  twist_play: 'Stream vs Batch',
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
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const AIInferenceLatencyRenderer: React.FC<AIInferenceLatencyRendererProps> = ({
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
  const [sequenceLength, setSequenceLength] = useState(50);
  const [modelLayers, setModelLayers] = useState(32);
  const [kvCacheEnabled, setKvCacheEnabled] = useState(true);
  const [batchMode, setBatchMode] = useState<'stream' | 'batch'>('stream');
  const [tokensGenerated, setTokensGenerated] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Internal navigation functions
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
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
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

        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
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
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canProceed ? colors.textPrimary : colors.textMuted,
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
    <div className="absolute inset-0 flex flex-col" style={{ background: colors.bgPrimary, color: colors.textPrimary }}>
      <div style={{ flexShrink: 0 }}>{renderProgressBar()}</div>
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {content}
      </div>
      {bottomBarContent && <div style={{ flexShrink: 0 }}>{bottomBarContent}</div>}
    </div>
  );

  // Token generation animation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setTokensGenerated(prev => {
        if (prev >= 20) {
          setIsGenerating(false);
          return 0;
        }
        return prev + 1;
      });
    }, batchMode === 'stream' ? 150 : 50);
    return () => clearInterval(interval);
  }, [isGenerating, batchMode]);

  // Calculate latency metrics
  const calculateMetrics = useCallback(() => {
    // Prefill phase: process all input tokens
    const prefillCompute = sequenceLength * modelLayers * 0.5; // ms
    const prefillMemory = sequenceLength * modelLayers * 0.3; // memory bandwidth bound

    // Decode phase: generate one token at a time
    // Without KV cache: recompute all attention for every token
    // With KV cache: only compute for new token
    const decodeComputeNoCache = sequenceLength * modelLayers * 0.5;
    const decodeComputeWithCache = modelLayers * 0.8;

    // Memory bandwidth for loading model weights
    const memoryBandwidthCost = modelLayers * 2; // ms per token

    const decodeLatency = kvCacheEnabled ?
      decodeComputeWithCache + memoryBandwidthCost :
      decodeComputeNoCache + memoryBandwidthCost;

    // Batch mode amortizes memory bandwidth
    const effectiveLatency = batchMode === 'batch' ?
      decodeLatency / 4 : // Batch of 4 shares memory load
      decodeLatency;

    const throughput = 1000 / effectiveLatency; // tokens per second

    return {
      prefillTime: Math.round(prefillCompute + prefillMemory),
      decodeLatency: Math.round(decodeLatency),
      effectiveLatency: Math.round(effectiveLatency),
      throughput: Math.round(throughput * 10) / 10,
      kvCacheSavings: Math.round((1 - decodeComputeWithCache / decodeComputeNoCache) * 100),
      memoryBound: memoryBandwidthCost > decodeComputeWithCache,
    };
  }, [sequenceLength, modelLayers, kvCacheEnabled, batchMode]);

  const predictions = [
    { id: 'compute', label: 'Each word requires massive computation - that\'s what slows it down' },
    { id: 'memory', label: 'Memory bandwidth limits how fast we can load model weights' },
    { id: 'internet', label: 'It\'s just internet latency - the AI thinks instantly' },
    { id: 'dramatic', label: 'They slow it down on purpose for dramatic effect' },
  ];

  const twistPredictions = [
    { id: 'always_stream', label: 'Always stream - users want immediate feedback' },
    { id: 'always_batch', label: 'Always batch - it\'s more efficient' },
    { id: 'depends', label: 'It depends - different use cases need different approaches' },
    { id: 'no_diff', label: 'There\'s no real difference in practice' },
  ];

  const transferApplications = [
    {
      title: 'ChatGPT and Claude',
      description: 'Conversational AI assistants that stream responses word by word to users.',
      question: 'Why do chatbots stream text instead of showing the complete response at once?',
      answer: 'Streaming provides immediate feedback, reducing perceived latency. Users can start reading while generation continues. For long responses, this dramatically improves user experience even though total time is similar.',
    },
    {
      title: 'GitHub Copilot',
      description: 'AI code completion that suggests code as you type in your editor.',
      question: 'How does Copilot achieve such fast inline suggestions?',
      answer: 'Copilot uses speculative decoding and smaller models for initial suggestions. KV cache stores context from your file. Suggestions are pre-computed during typing pauses. Only the most likely completions are generated.',
    },
    {
      title: 'Real-time Translation',
      description: 'Live translation services that convert speech to another language instantly.',
      question: 'What techniques enable near-real-time AI translation?',
      answer: 'Chunked processing handles audio in segments. Specialized smaller models trade accuracy for speed. KV cache maintains conversation context. Some services use prediction to start translating before sentences end.',
    },
    {
      title: 'AI Image Generation',
      description: 'Services like Midjourney generate images from text descriptions.',
      question: 'Why is image generation latency measured in seconds while text is milliseconds per token?',
      answer: 'Image generation uses diffusion models that iterate many times over the entire image. Each step processes millions of pixels. Text generation is autoregressive - one token at a time. Different architectures, different bottlenecks.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does "autoregressive generation" mean in language models?',
      options: [
        { text: 'The model generates all words simultaneously', correct: false },
        { text: 'Each new token depends on all previous tokens, generated one at a time', correct: true },
        { text: 'The model automatically corrects its mistakes', correct: false },
        { text: 'Multiple models work together on generation', correct: false },
      ],
    },
    {
      question: 'The KV cache stores:',
      options: [
        { text: 'The model weights for faster loading', correct: false },
        { text: 'Previous key and value attention computations to avoid recomputation', correct: true },
        { text: 'User conversation history on disk', correct: false },
        { text: 'Compressed versions of generated text', correct: false },
      ],
    },
    {
      question: 'Why is memory bandwidth often the bottleneck for LLM inference?',
      options: [
        { text: 'GPUs don\'t have enough memory', correct: false },
        { text: 'Model weights must be loaded from memory for each token, which is slow', correct: true },
        { text: 'Memory is more expensive than compute', correct: false },
        { text: 'The model forgets previous context', correct: false },
      ],
    },
    {
      question: 'Batching multiple requests together improves efficiency because:',
      options: [
        { text: 'It uses less memory overall', correct: false },
        { text: 'The memory bandwidth cost of loading weights is shared across requests', correct: true },
        { text: 'Batched requests are simpler to process', correct: false },
        { text: 'Users prefer receiving responses together', correct: false },
      ],
    },
    {
      question: 'The "prefill" phase of LLM inference:',
      options: [
        { text: 'Generates the first few tokens quickly', correct: false },
        { text: 'Processes all input tokens in parallel to build initial KV cache', correct: true },
        { text: 'Pre-loads the model into memory', correct: false },
        { text: 'Fills empty space in memory', correct: false },
      ],
    },
    {
      question: 'Streaming tokens to users is valuable because:',
      options: [
        { text: 'It reduces total generation time', correct: false },
        { text: 'It reduces perceived latency - users can read while generation continues', correct: true },
        { text: 'It uses less server resources', correct: false },
        { text: 'It produces higher quality output', correct: false },
      ],
    },
    {
      question: 'Without KV cache, generating each new token would require:',
      options: [
        { text: 'Loading the model weights again', correct: false },
        { text: 'Recomputing attention over all previous tokens', correct: true },
        { text: 'Starting the generation from scratch', correct: false },
        { text: 'Clearing GPU memory', correct: false },
      ],
    },
    {
      question: 'Larger language models are slower primarily because:',
      options: [
        { text: 'They have more layers, requiring more weight loads per token', correct: true },
        { text: 'They need more training data', correct: false },
        { text: 'Users type slower for longer responses', correct: false },
        { text: 'The internet connection is slower', correct: false },
      ],
    },
    {
      question: 'Speculative decoding accelerates inference by:',
      options: [
        { text: 'Using a smaller model to draft tokens, then verifying with the large model', correct: true },
        { text: 'Guessing what the user wants to ask', correct: false },
        { text: 'Skipping unimportant tokens', correct: false },
        { text: 'Compressing the model weights', correct: false },
      ],
    },
    {
      question: 'The trade-off between batch size and latency is:',
      options: [
        { text: 'Larger batches always reduce latency', correct: false },
        { text: 'Larger batches improve throughput but increase latency for individual requests', correct: true },
        { text: 'Batch size doesn\'t affect latency', correct: false },
        { text: 'Smaller batches are always better', correct: false },
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

  const renderVisualization = () => {
    const metrics = calculateMetrics();
    const generatedText = "The quick brown fox jumps over the lazy dog".split(' ').slice(0, tokensGenerated);

    return (
      <svg width="100%" height="420" viewBox="0 0 500 420" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="prefillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="decodeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="420" fill="#0f172a" rx="12" />

        {/* Title */}
        <text x="250" y="30" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
          LLM Inference Pipeline
        </text>

        {/* Prefill Phase */}
        <g transform="translate(30, 50)">
          <text x="0" y="0" fill="#8b5cf6" fontSize="12" fontWeight="bold">1. Prefill Phase</text>
          <rect x="0" y="10" width="200" height="50" fill="url(#prefillGrad)" rx="6" opacity="0.3" />
          <rect x="0" y="10" width={Math.min(200, metrics.prefillTime / 2)} height="50" fill="url(#prefillGrad)" rx="6" />
          <text x="100" y="40" fill="#f8fafc" fontSize="10" textAnchor="middle">
            Process {sequenceLength} input tokens
          </text>
          <text x="210" y="40" fill="#8b5cf6" fontSize="11">{metrics.prefillTime}ms</text>
        </g>

        {/* Decode Phase */}
        <g transform="translate(30, 130)">
          <text x="0" y="0" fill="#f59e0b" fontSize="12" fontWeight="bold">2. Decode Phase (per token)</text>

          {/* Token generation visualization */}
          <g transform="translate(0, 20)">
            {[0, 1, 2, 3, 4].map(i => (
              <g key={i}>
                <rect
                  x={i * 42}
                  y="0"
                  width="38"
                  height="30"
                  fill={i < tokensGenerated % 5 ? '#f59e0b' : '#334155'}
                  rx="4"
                />
                <text x={i * 42 + 19} y="20" fill="#f8fafc" fontSize="8" textAnchor="middle">
                  {i < tokensGenerated % 5 ? 'tok' : '...'}
                </text>
              </g>
            ))}
          </g>

          <text x="230" y="35" fill="#f59e0b" fontSize="11">{metrics.decodeLatency}ms/token</text>
        </g>

        {/* KV Cache Visualization */}
        <g transform="translate(30, 210)">
          <text x="0" y="0" fill="#22c55e" fontSize="12" fontWeight="bold">KV Cache</text>
          <rect x="0" y="10" width="180" height="40" fill={kvCacheEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'} rx="6" stroke={kvCacheEnabled ? '#22c55e' : '#ef4444'} strokeWidth="1" />
          <text x="90" y="35" fill={kvCacheEnabled ? '#22c55e' : '#ef4444'} fontSize="10" textAnchor="middle">
            {kvCacheEnabled ? `Saves ${metrics.kvCacheSavings}% recomputation` : 'DISABLED - Recomputing all attention'}
          </text>
        </g>

        {/* Memory vs Compute indicator */}
        <g transform="translate(250, 210)">
          <text x="0" y="0" fill="#94a3b8" fontSize="12" fontWeight="bold">Bottleneck</text>
          <rect x="0" y="10" width="120" height="40" fill={metrics.memoryBound ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'} rx="6" />
          <text x="60" y="35" fill={metrics.memoryBound ? '#ef4444' : '#3b82f6'} fontSize="10" textAnchor="middle">
            {metrics.memoryBound ? 'Memory Bandwidth' : 'Compute'}
          </text>
        </g>

        {/* Generated Text Display */}
        <g transform="translate(30, 280)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Generated Output:</text>
          <rect x="0" y="10" width="440" height="50" fill="#1e293b" rx="6" />
          <text x="10" y="40" fill="#22c55e" fontSize="12">
            {generatedText.join(' ')}
            {isGenerating && <tspan fill="#f59e0b">|</tspan>}
          </text>
        </g>

        {/* Metrics Summary */}
        <g transform="translate(30, 360)">
          <rect x="0" y="0" width="140" height="50" fill="rgba(139, 92, 246, 0.1)" rx="6" />
          <text x="70" y="20" fill="#8b5cf6" fontSize="10" textAnchor="middle">Throughput</text>
          <text x="70" y="40" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{metrics.throughput} tok/s</text>

          <rect x="160" y="0" width="140" height="50" fill="rgba(245, 158, 11, 0.1)" rx="6" />
          <text x="230" y="20" fill="#f59e0b" fontSize="10" textAnchor="middle">Mode</text>
          <text x="230" y="40" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{batchMode === 'stream' ? 'Streaming' : 'Batched'}</text>

          <rect x="320" y="0" width="140" height="50" fill="rgba(34, 197, 94, 0.1)" rx="6" />
          <text x="390" y="20" fill="#22c55e" fontSize="10" textAnchor="middle">Latency</text>
          <text x="390" y="40" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{metrics.effectiveLatency}ms</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Input Sequence Length: {sequenceLength} tokens
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={sequenceLength}
          onChange={(e) => setSequenceLength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Model Layers: {modelLayers}
        </label>
        <input
          type="range"
          min="8"
          max="96"
          step="8"
          value={modelLayers}
          onChange={(e) => setModelLayers(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => setKvCacheEnabled(!kvCacheEnabled)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: kvCacheEnabled ? '#22c55e' : '#ef4444',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          KV Cache: {kvCacheEnabled ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setBatchMode(batchMode === 'stream' ? 'batch' : 'stream')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: batchMode === 'stream' ? '#f59e0b' : '#3b82f6',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Mode: {batchMode === 'stream' ? 'Stream' : 'Batch'}
        </button>
      </div>

      <button
        onClick={() => { setIsGenerating(true); setTokensGenerated(0); }}
        disabled={isGenerating}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: isGenerating ? '#475569' : '#8b5cf6',
          color: 'white',
          fontWeight: 'bold',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isGenerating ? 'Generating...' : 'Generate Tokens'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#f59e0b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Systems</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #f59e0b, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Inference Latency
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
              Why does ChatGPT respond word by word?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              When you ask ChatGPT a question, you see the response appear word by word.
              Is this just for dramatic effect, or is there a fundamental reason the AI can't just give you the answer instantly?
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
              The answer reveals deep insights about how modern AI actually works.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover Why')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              Large language models generate text one token (roughly one word) at a time.
              What's the primary reason this process is slow?
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
                  border: prediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
        </div>
      </div>,
      renderBottomBar(!!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore LLM Inference</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            See how different factors affect generation speed
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Try These Experiments:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Toggle KV Cache off - watch latency explode</li>
              <li>Increase model layers - see throughput drop</li>
              <li>Switch to batch mode - notice higher throughput</li>
              <li>Observe which scenarios are memory-bound vs compute-bound</li>
            </ul>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Concepts')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'memory';

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Correct!' : 'Close, but there\'s more to it!'}
            </h3>
            <p>Memory bandwidth is often the limiting factor! The GPU must load billions of model parameters from memory for each token generated.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Autoregressive Bottleneck</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>Why word-by-word?</strong> Language models are "autoregressive" - each new word depends on ALL previous words.
              The model can't know word #5 without first generating words #1-4.
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>The memory problem:</strong> For each token, the entire model (billions of parameters) must be loaded from GPU memory.
              Memory bandwidth, not compute power, is typically the limit.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>KV Cache saves the day:</strong> Without caching, each token would require recomputing attention over ALL previous tokens.
              KV cache stores these computations, trading memory for massive speedup.
            </p>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>Two Phases of Generation</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>Prefill:</strong> Process all input tokens in parallel (fast, compute-bound). Build the initial KV cache.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>Decode:</strong> Generate output tokens one at a time (slow, memory-bound). Each token requires loading model weights.
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
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>The Twist</h2>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>
              You now know that memory bandwidth limits single-request inference. But what if you have many users making requests simultaneously?
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
              Should AI services stream responses or wait to send complete answers?
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
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!twistPrediction, 'See the Answer')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Stream vs Batch</h2>

          {renderVisualization()}
          {renderControls()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Streaming</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Low perceived latency</li>
                <li>Users see progress</li>
                <li>Lower throughput</li>
                <li>One request at a time</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Batching</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Higher throughput</li>
                <li>Better GPU utilization</li>
                <li>Higher individual latency</li>
                <li>Shares memory bandwidth</li>
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
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Exactly!' : 'The key insight:'}
            </h3>
            <p>The right approach depends entirely on the use case! Interactive chat benefits from streaming, while API services might prefer batching for efficiency.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>The Tradeoff Space</h3>
            <div style={{ lineHeight: 1.8 }}>
              <p><strong style={{ color: '#f59e0b' }}>For Interactive Chat (ChatGPT, Claude):</strong></p>
              <p style={{ marginBottom: '16px', paddingLeft: '16px' }}>
                Streaming wins. Users perceive faster response when they see tokens appear.
                The perceived latency (time to first token) matters more than total time.
              </p>

              <p><strong style={{ color: '#3b82f6' }}>For API Services (bulk processing):</strong></p>
              <p style={{ paddingLeft: '16px' }}>
                Batching wins. When processing thousands of requests, throughput matters more than individual latency.
                Batching shares the memory bandwidth cost across requests.
              </p>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Complete all 4 to unlock the test ({transferCompleted.size}/4)
          </p>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #334155',
              }}
            >
              <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{app.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    background: 'transparent',
                    color: '#f59e0b',
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
        </div>
      </div>,
      renderBottomBar(transferCompleted.size >= 4, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: '24px', paddingBottom: '100px' }}>
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
              <p style={{ color: '#94a3b8' }}>
                {testScore >= 8 ? 'You understand LLM inference latency!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>
        </div>,
        renderBottomBar(true, testScore >= 8 ? 'Claim Mastery' : 'Try Again', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1}/10</span>
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
                  background: testAnswers[i] !== null ? '#f59e0b' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleTestAnswer(currentTestQuestion, i)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === i ? '2px solid #f59e0b' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === i ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
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
                Submit
              </button>
            )}
          </div>
        </div>
      </div>,
      null
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>MASTERY</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>AI Inference Expert!</h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            You understand why LLMs generate text word by word and the engineering tradeoffs involved
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
              <li>Autoregressive generation and token dependency</li>
              <li>Memory bandwidth as the inference bottleneck</li>
              <li>KV cache and attention computation reuse</li>
              <li>Prefill vs decode phases</li>
              <li>Streaming vs batching tradeoffs</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>The Core Insight</h4>
            <p style={{ color: '#e2e8f0' }}>
              LLM inference is fundamentally memory-bound. The GPU spends most of its time loading model weights, not computing.
              This shapes everything from model architecture to serving infrastructure.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Complete')
    );
  }

  return null;
};

export default AIInferenceLatencyRenderer;
