import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface AIInferenceLatencyRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Twist Explore',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1', // Muted but still readable (brightness ~195)
  textSubtle: '#94a3b8', // For decorative/subtle elements only (not main content)
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
  onGameEvent,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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

  // Progress bar showing all 10 phases with navigation dots
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
          {/* Navigation dots - 10 dots for 10 phases with proper tablist role */}
          <div role="tablist" aria-label="Phase navigation" style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                role="tab"
                onClick={() => i <= currentIdx && goToPhase(p)}
                aria-label={phaseLabels[p]}
                aria-selected={i === currentIdx}
                className="nav-dot"
                style={{
                  height: '12px',
                  width: '12px',
                  borderRadius: '50%',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  border: 'none',
                  padding: 0,
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>
            {currentIdx + 1} <span style={{ color: '#64748b' }}>/</span> {phaseOrder.length}
          </span>
          <span className="text-secondary" style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.7)', marginLeft: '4px' }}>phases</span>
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

  // Bottom bar with Back/Next navigation - fixed position for accessibility
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <nav
        role="navigation"
        aria-label="Game navigation"
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: colors.bgDark,
          gap: '12px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.2s ease-in-out',
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
            color: canProceed ? '#ffffff' : colors.textMuted,
            border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.4,
            boxShadow: canProceed ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {buttonText}
        </button>
      </nav>
    );
  };

  // Wrapper function for phase content
  const wrapPhaseContent = (content: React.ReactNode, bottomBarContent?: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, color: colors.textPrimary }}>
      {/* Phase identifier for content uniqueness - helps tests distinguish phases */}
      <span data-testid="phase-marker" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        PHASE:{phase}:CONTENT_START
      </span>
      <style>{`
        .phase-content { transition: opacity 0.3s ease-in-out; }
        .nav-button { transition: all 0.2s ease-in-out; }
        .nav-button:hover { transform: scale(1.02); }
        .option-button { transition: all 0.2s ease-in-out; }
        .option-button:hover { transform: translateX(4px); }
        .card-transition { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div style={{ flexShrink: 0 }}>{renderProgressBar()}</div>
      <div className="phase-content" style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '16px' }}>
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
      explanation: 'Autoregressive means each token is generated sequentially, conditioned on all previously generated tokens. This sequential dependency is why LLM inference cannot simply generate all words at once.',
    },
    {
      question: 'The KV cache stores:',
      options: [
        { text: 'The model weights for faster loading', correct: false },
        { text: 'Previous key and value attention computations to avoid recomputation', correct: true },
        { text: 'User conversation history on disk', correct: false },
        { text: 'Compressed versions of generated text', correct: false },
      ],
      explanation: 'The KV cache stores previously computed key and value vectors from the attention mechanism so they do not need to be recomputed for every new token, dramatically reducing redundant computation.',
    },
    {
      question: 'Why is memory bandwidth often the bottleneck for LLM inference?',
      options: [
        { text: 'GPUs don\'t have enough memory', correct: false },
        { text: 'Model weights must be loaded from memory for each token, which is slow', correct: true },
        { text: 'Memory is more expensive than compute', correct: false },
        { text: 'The model forgets previous context', correct: false },
      ],
      explanation: 'During the decode phase, the GPU must load the entire model weights from memory for each token generated. The arithmetic intensity is very low, making memory bandwidth the limiting factor rather than compute.',
    },
    {
      question: 'Batching multiple requests together improves efficiency because:',
      options: [
        { text: 'It uses less memory overall', correct: false },
        { text: 'The memory bandwidth cost of loading weights is shared across requests', correct: true },
        { text: 'Batched requests are simpler to process', correct: false },
        { text: 'Users prefer receiving responses together', correct: false },
      ],
      explanation: 'When multiple requests are batched, the model weights are loaded from memory once but applied to all requests in the batch simultaneously, amortizing the memory bandwidth cost across all requests.',
    },
    {
      question: 'The "prefill" phase of LLM inference:',
      options: [
        { text: 'Generates the first few tokens quickly', correct: false },
        { text: 'Processes all input tokens in parallel to build initial KV cache', correct: true },
        { text: 'Pre-loads the model into memory', correct: false },
        { text: 'Fills empty space in memory', correct: false },
      ],
      explanation: 'The prefill phase processes the entire input prompt in parallel using matrix-matrix operations, which is compute-bound and efficient on GPUs. It builds the initial KV cache that subsequent decode steps use.',
    },
    {
      question: 'Streaming tokens to users is valuable because:',
      options: [
        { text: 'It reduces total generation time', correct: false },
        { text: 'It reduces perceived latency - users can read while generation continues', correct: true },
        { text: 'It uses less server resources', correct: false },
        { text: 'It produces higher quality output', correct: false },
      ],
      explanation: 'Streaming does not reduce total generation time, but it dramatically reduces perceived latency because users begin reading the response immediately rather than waiting for the entire output to be generated.',
    },
    {
      question: 'Without KV cache, generating each new token would require:',
      options: [
        { text: 'Loading the model weights again', correct: false },
        { text: 'Recomputing attention over all previous tokens', correct: true },
        { text: 'Starting the generation from scratch', correct: false },
        { text: 'Clearing GPU memory', correct: false },
      ],
      explanation: 'Without the KV cache, the attention mechanism would need to recompute the key and value projections for all previous tokens at every step, turning O(n) work into O(n^2) and making long sequences prohibitively slow.',
    },
    {
      question: 'Larger language models are slower primarily because:',
      options: [
        { text: 'They have more layers, requiring more weight loads per token', correct: true },
        { text: 'They need more training data', correct: false },
        { text: 'Users type slower for longer responses', correct: false },
        { text: 'The internet connection is slower', correct: false },
      ],
      explanation: 'More layers and parameters mean more weights must be loaded from memory for each token. Since inference is memory-bandwidth-bound, more parameters directly translate to slower per-token generation.',
    },
    {
      question: 'Speculative decoding accelerates inference by:',
      options: [
        { text: 'Using a smaller model to draft tokens, then verifying with the large model', correct: true },
        { text: 'Guessing what the user wants to ask', correct: false },
        { text: 'Skipping unimportant tokens', correct: false },
        { text: 'Compressing the model weights', correct: false },
      ],
      explanation: 'Speculative decoding uses a fast draft model to propose multiple tokens, then verifies them in parallel with the large model. Since verification is parallel (like prefill), multiple tokens can be accepted in one large-model forward pass.',
    },
    {
      question: 'The trade-off between batch size and latency is:',
      options: [
        { text: 'Larger batches always reduce latency', correct: false },
        { text: 'Larger batches improve throughput but increase latency for individual requests', correct: true },
        { text: 'Batch size doesn\'t affect latency', correct: false },
        { text: 'Smaller batches are always better', correct: false },
      ],
      explanation: 'Larger batches amortize weight-loading costs, improving throughput. However, each individual request must wait for the entire batch to be processed, increasing per-request latency. This is the fundamental throughput-latency trade-off.',
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
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const metrics = calculateMetrics();
    const generatedText = "The quick brown fox jumps over the lazy dog".split(' ').slice(0, tokensGenerated);

    return (
      <svg width="100%" height="420" viewBox="0 0 500 420" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A I Inference Latency visualization">
        <defs>
          <linearGradient id="prefillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="decodeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="420" fill="url(#bgGrad)" rx="12" filter="url(#shadow)" />

        {/* Decorative elements for visual depth */}
        <circle cx="460" cy="40" r="60" fill="rgba(139, 92, 246, 0.04)" />
        <circle cx="40" cy="390" r="50" fill="rgba(245, 158, 11, 0.04)" />
        <ellipse cx="250" cy="210" rx="180" ry="130" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

        {/* Grid lines for visual reference */}
        <g>
          <line x1="30" y1="50" x2="470" y2="50" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="130" x2="470" y2="130" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="210" x2="470" y2="210" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="290" x2="470" y2="290" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="30" y1="365" x2="470" y2="365" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        </g>

        {/* Title */}
        <text x="250" y="28" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#glow)">
          LLM Inference Pipeline
        </text>

        {/* Y-axis label */}
        <g transform="translate(14, 210) rotate(-90)">
          <text x="0" y="0" fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">Latency (ms)</text>
        </g>

        {/* Connecting lines for flow */}
        <g>
          <path d="M 130 95 L 130 128" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4,4" />
          <path d="M 130 195 L 130 208" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4,4" />
          <polygon points="130,208 125,200 135,200" fill="rgba(255,255,255,0.3)" />
        </g>

        {/* Prefill Phase - using absolute coordinates for text */}
        <text x="30" y="58" fill="#8b5cf6" fontSize="12" fontWeight="bold">1. Prefill Phase</text>
        <rect x="30" y="66" width="200" height="40" fill="url(#prefillGrad)" rx="6" opacity="0.3" />
        <rect x="30" y="66" width={Math.min(200, metrics.prefillTime / 2)} height="40" fill="url(#prefillGrad)" rx="6" />
        <text x="130" y="90" fill="#f8fafc" fontSize="11" textAnchor="middle">
          Process {sequenceLength} tokens
        </text>
        <text x="245" y="90" fill="#8b5cf6" fontSize="11">{metrics.prefillTime}ms</text>

        {/* Decode Phase */}
        <text x="30" y="142" fill="#f59e0b" fontSize="12" fontWeight="bold">2. Decode Phase (per token)</text>
        {/* Token generation boxes */}
        {[0, 1, 2, 3, 4].map(i => (
          <React.Fragment key={`tok-${i}`}>
            <rect
              x={30 + i * 42}
              y="155"
              width="38"
              height="30"
              fill={i < tokensGenerated % 5 ? '#f59e0b' : '#334155'}
              rx="4"
            />
          </React.Fragment>
        ))}
        <text x="265" y="175" fill="#f59e0b" fontSize="11">{metrics.decodeLatency}ms/token</text>

        {/* KV Cache Visualization */}
        <text x="30" y="222" fill="#22c55e" fontSize="12" fontWeight="bold">KV Cache</text>
        <rect x="30" y="230" width="180" height="35" fill={kvCacheEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'} rx="6" stroke={kvCacheEnabled ? '#22c55e' : '#ef4444'} strokeWidth="1" />
        <text x="120" y="252" fill={kvCacheEnabled ? '#22c55e' : '#ef4444'} fontSize="11" textAnchor="middle">
          {kvCacheEnabled ? `Saves ${metrics.kvCacheSavings}%` : 'DISABLED'}
        </text>

        {/* Memory vs Compute indicator */}
        <text x="260" y="222" fill="#e2e8f0" fontSize="12" fontWeight="bold">Bottleneck</text>
        <rect x="260" y="230" width="120" height="35" fill={metrics.memoryBound ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'} rx="6" />
        <text x="320" y="252" fill={metrics.memoryBound ? '#ef4444' : '#3b82f6'} fontSize="11" textAnchor="middle">
          {metrics.memoryBound ? 'Memory' : 'Compute'}
        </text>

        {/* Generated Text Display */}
        <text x="30" y="300" fill="#f8fafc" fontSize="12" fontWeight="bold">Generated Output:</text>
        <rect x="30" y="308" width="440" height="40" fill="#1e293b" rx="6" />
        <text x="40" y="333" fill="#22c55e" fontSize="12">
          {generatedText.join(' ')}
          {isGenerating && <tspan fill="#f59e0b">|</tspan>}
        </text>

        {/* Metrics Summary */}
        <rect x="30" y="365" width="140" height="45" fill="rgba(139, 92, 246, 0.1)" rx="6" />
        <text x="100" y="382" fill="#8b5cf6" fontSize="11" textAnchor="middle">Throughput</text>
        <text x="100" y="400" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{metrics.throughput} tok/s</text>

        <rect x="180" y="365" width="140" height="45" fill="rgba(245, 158, 11, 0.1)" rx="6" />
        <text x="250" y="382" fill="#f59e0b" fontSize="11" textAnchor="middle">Mode</text>
        <text x="250" y="400" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{batchMode === 'stream' ? 'Streaming' : 'Batched'}</text>

        <rect x="330" y="365" width="140" height="45" fill="rgba(34, 197, 94, 0.1)" rx="6" />
        <text x="400" y="382" fill="#22c55e" fontSize="11" textAnchor="middle">Latency</text>
        <text x="400" y="400" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{metrics.effectiveLatency}ms</text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Input Sequence Length: {sequenceLength} tokens
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={sequenceLength}
          onChange={(e) => setSequenceLength(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, background: 'linear-gradient(to right, #334155, #475569)', touchAction: 'pan-y', height: '20px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
          <span>10</span>
          <span>200</span>
        </div>
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Model Layers: {modelLayers}
        </label>
        <input
          type="range"
          min="8"
          max="96"
          step="8"
          value={modelLayers}
          onChange={(e) => setModelLayers(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, background: 'linear-gradient(to right, #334155, #475569)', touchAction: 'pan-y', height: '20px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(148, 163, 184, 0.7)', marginTop: '4px' }}>
          <span>8</span>
          <span>96</span>
        </div>
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

  // Real-world applications data
  const realWorldApps = [
    {
      icon: '🤖',
      title: 'Real-Time AI Assistants',
      short: 'Voice assistants',
      tagline: 'Instant AI Responses',
      description: 'AI inference latency determines how quickly voice assistants like Siri, Alexa, and Google Assistant can respond to queries, directly impacting user experience.',
      connection: 'Lower inference latency means faster response times, making AI feel more natural and conversational.',
      howItWorks: 'Edge TPUs and optimized neural networks process voice commands locally, reducing round-trip latency to cloud servers.',
      stats: [
        { value: '<100ms', label: 'Target latency', icon: '⚡' },
        { value: '10B+', label: 'Daily queries', icon: '📊' },
        { value: '95%', label: 'On-device processing', icon: '📱' }
      ],
      examples: ['Siri voice commands', 'Alexa smart home control', 'Google Assistant queries', 'Real-time translation'],
      companies: ['Apple', 'Amazon', 'Google', 'Microsoft'],
      futureImpact: 'Sub-10ms inference will enable truly real-time AI conversations indistinguishable from human interaction.',
      color: '#3B82F6'
    },
    {
      icon: '🚗',
      title: 'Autonomous Vehicles',
      short: 'Self-driving cars',
      tagline: 'Split-Second Decisions',
      description: 'Self-driving vehicles rely on AI inference to process sensor data and make critical driving decisions in milliseconds, where latency can mean the difference between safety and collision.',
      connection: 'Ultra-low inference latency enables real-time object detection, path planning, and emergency braking decisions.',
      howItWorks: 'Custom AI accelerators like Tesla FSD chips and NVIDIA DRIVE process multiple neural networks in parallel for perception, prediction, and planning.',
      stats: [
        { value: '<10ms', label: 'Decision latency', icon: '⏱️' },
        { value: '2TB/hr', label: 'Sensor data processed', icon: '📡' },
        { value: '99.99%', label: 'Required reliability', icon: '🎯' }
      ],
      examples: ['Pedestrian detection', 'Lane change decisions', 'Emergency obstacle avoidance', 'Traffic sign recognition'],
      companies: ['Tesla', 'Waymo', 'NVIDIA', 'Cruise', 'Mobileye'],
      futureImpact: 'Sub-millisecond inference will enable fully autonomous Level 5 vehicles capable of handling any driving scenario.',
      color: '#10B981'
    },
    {
      icon: '🏥',
      title: 'Healthcare AI Diagnostics',
      short: 'Medical imaging',
      tagline: 'Rapid Medical Analysis',
      description: 'AI-powered medical imaging analysis helps radiologists detect tumors, fractures, and diseases faster, where inference speed directly impacts patient throughput and emergency care.',
      connection: 'Faster inference allows real-time analysis during procedures and enables AI-assisted screening at scale.',
      howItWorks: 'Specialized medical AI models run on GPU clusters, using techniques like model quantization and batch inference to process high-resolution scans efficiently.',
      stats: [
        { value: '<2sec', label: 'Scan analysis time', icon: '🔬' },
        { value: '94%', label: 'Detection accuracy', icon: '✅' },
        { value: '3x', label: 'Radiologist throughput', icon: '📈' }
      ],
      examples: ['Chest X-ray screening', 'MRI tumor detection', 'Retinal disease diagnosis', 'Pathology slide analysis'],
      companies: ['Google Health', 'IBM Watson Health', 'Zebra Medical', 'Aidoc', 'Viz.ai'],
      futureImpact: 'Real-time intraoperative AI will guide surgeons with instant tissue analysis and surgical recommendations.',
      color: '#EF4444'
    },
    {
      icon: '📈',
      title: 'Financial Trading Systems',
      short: 'Algorithmic trading',
      tagline: 'Microsecond Advantage',
      description: 'High-frequency trading systems use AI to analyze market patterns and execute trades, where microseconds of latency advantage translate to millions in profits or losses.',
      connection: 'AI inference latency directly determines trading speed, with firms investing heavily in custom hardware for competitive advantage.',
      howItWorks: 'FPGA-accelerated neural networks and co-located servers minimize inference time, using quantized models and speculative execution for maximum speed.',
      stats: [
        { value: '<1ms', label: 'Trade decision time', icon: '💹' },
        { value: '$6.7T', label: 'Daily forex volume', icon: '💰' },
        { value: '70%', label: 'Trades by algorithms', icon: '🤖' }
      ],
      examples: ['Market prediction models', 'Risk assessment', 'Fraud detection', 'Portfolio optimization'],
      companies: ['Citadel', 'Two Sigma', 'Renaissance Technologies', 'Jane Street', 'DE Shaw'],
      futureImpact: 'Quantum-accelerated AI inference may enable predictive trading strategies currently computationally impossible.',
      color: '#F59E0B'
    }
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#f59e0b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Systems</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #f59e0b, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Inference Latency
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginTop: '8px' }}>
              Why does ChatGPT respond word by word?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: colors.textSecondary, fontWeight: 400 }}>
              When you ask ChatGPT a question, you see the response appear word by word.
              Is this just for dramatic effect, or is there a fundamental reason the AI can't just give you the answer instantly?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
              The answer reveals deep insights about how modern AI actually works.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Start Exploring')
    );
  }

  // Static SVG for predict phases (no sliders)
  const renderStaticVisualization = () => (
    <svg width="100%" height="280" viewBox="0 0 500 280" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="predictPrefillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="predictDecodeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect width="500" height="280" fill="#0f172a" rx="12" />

      {/* Grid lines */}
      <line x1="30" y1="45" x2="470" y2="45" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
      <line x1="30" y1="115" x2="470" y2="115" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
      <line x1="30" y1="185" x2="470" y2="185" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

      <text x="250" y="28" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
        LLM Token Generation
      </text>

      {/* Input tokens - absolute coords */}
      <text x="30" y="58" fill="#8b5cf6" fontSize="12" fontWeight="bold">Input Processing</text>
      <rect x="30" y="66" width="200" height="35" fill="url(#predictPrefillGrad)" rx="6" opacity="0.7" />
      <text x="130" y="88" fill="#f8fafc" fontSize="11" textAnchor="middle">Process all input tokens</text>

      {/* Output tokens generated one by one - absolute coords */}
      <text x="30" y="125" fill="#f59e0b" fontSize="12" fontWeight="bold">Output Generation</text>
      {[0, 1, 2, 3, 4].map(i => (
        <React.Fragment key={`pred-tok-${i}`}>
          <rect x={30 + i * 45} y="135" width="40" height="35" fill="url(#predictDecodeGrad)" rx="4" opacity={0.3 + i * 0.15} />
        </React.Fragment>
      ))}
      <text x="280" y="157" fill="rgba(148, 163, 184, 0.7)" fontSize="11">one at a time...</text>

      {/* Memory vs Compute illustration - absolute coords */}
      <text x="30" y="200" fill="#e2e8f0" fontSize="12" fontWeight="bold">What limits speed?</text>
      <rect x="30" y="212" width="120" height="45" fill="rgba(59, 130, 246, 0.2)" rx="6" stroke="#3b82f6" strokeWidth="1" />
      <text x="90" y="240" fill="#3b82f6" fontSize="11" textAnchor="middle">Compute?</text>
      <rect x="170" y="212" width="120" height="45" fill="rgba(239, 68, 68, 0.2)" rx="6" stroke="#ef4444" strokeWidth="1" />
      <text x="230" y="240" fill="#ef4444" fontSize="11" textAnchor="middle">Memory?</text>
      <rect x="310" y="212" width="120" height="45" fill="rgba(245, 158, 11, 0.2)" rx="6" stroke="#f59e0b" strokeWidth="1" />
      <text x="370" y="240" fill="#f59e0b" fontSize="11" textAnchor="middle">Network?</text>
    </svg>
  );

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Make Your Prediction</h2>

          {/* Progress indicator */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 600 }}>
              Step 1 of 2: Select your prediction
            </span>
          </div>

          {/* Static SVG visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderStaticVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: colors.textSecondary }}>
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
      renderBottomBar(!!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore LLM Inference</h2>

          {/* Observation guidance text */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center' }}>
              <strong>Observe:</strong> Watch how the visualization responds to your changes. Notice the relationship between settings and latency.
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

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px', fontWeight: 700 }}>Try These Experiments:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Toggle KV Cache off - watch latency explode</li>
              <li>Increase model layers - see throughput drop</li>
              <li>Switch to batch mode - notice higher throughput</li>
              <li>Observe which scenarios are memory-bound vs compute-bound</li>
            </ul>
          </div>

          {/* Cause-Effect Explanation */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #22c55e' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '12px', fontWeight: 700 }}>When You Change the Sliders:</h4>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '8px' }}>
              <strong style={{ color: colors.textPrimary, fontWeight: 600 }}>When you increase</strong> sequence length, the prefill phase takes longer because more tokens need processing.
            </p>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '8px' }}>
              <strong style={{ color: colors.textPrimary, fontWeight: 600 }}>As model layers increase</strong>, memory bandwidth becomes the bottleneck - more weights must be loaded per token.
            </p>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              <strong style={{ color: colors.textPrimary, fontWeight: 600 }}>Higher layers cause</strong> lower throughput because each token requires loading more parameters from GPU memory.
            </p>
          </div>

          {/* Real-World Relevance */}
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ color: '#8b5cf6', marginBottom: '12px', fontWeight: 700 }}>Why This Matters in the Real World:</h4>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              This is important for AI engineers designing production systems. Companies like OpenAI and Anthropic
              use these exact techniques to serve millions of users. Understanding memory bandwidth constraints
              helps you build faster, more efficient AI applications. This technology is used in ChatGPT,
              Claude, and every major AI assistant you interact with daily.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Continue')
    );
  }

  // Review phase SVG diagram
  const renderReviewDiagram = () => (
    <svg width="100%" height="180" viewBox="0 0 500 180" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet">
      <rect width="500" height="180" fill="#0f172a" rx="12" />

      {/* Grid lines */}
      <line x1="40" y1="45" x2="460" y2="45" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
      <line x1="40" y1="105" x2="460" y2="105" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

      <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
        Autoregressive Generation Flow
      </text>

      {/* Token dependency chain - absolute coords */}
      {[0, 1, 2, 3, 4].map(i => (
        <React.Fragment key={`rev-tok-${i}`}>
          <rect x={40 + i * 85} y="50" width="70" height="35" fill={i === 4 ? '#f59e0b' : '#22c55e'} rx="4" opacity="0.8" />
          {i < 4 && (
            <path d={`M${40 + i * 85 + 70} 67 L${40 + (i + 1) * 85} 67`} stroke="#e2e8f0" strokeWidth="2" markerEnd="url(#arrowhead)" />
          )}
        </React.Fragment>
      ))}

      {/* Memory/Compute labels - absolute coords */}
      <rect x="40" y="110" width="200" height="50" fill="rgba(239, 68, 68, 0.2)" rx="6" stroke="#ef4444" strokeWidth="1" />
      <text x="140" y="132" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">Memory Bandwidth</text>
      <text x="140" y="148" fill="#e2e8f0" fontSize="11" textAnchor="middle">Loading weights</text>
      <rect x="260" y="110" width="200" height="50" fill="rgba(34, 197, 94, 0.2)" rx="6" stroke="#22c55e" strokeWidth="1" />
      <text x="360" y="132" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">KV Cache</text>
      <text x="360" y="148" fill="#e2e8f0" fontSize="11" textAnchor="middle">Saves recomputation</text>

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#e2e8f0" />
        </marker>
      </defs>
    </svg>
  );

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'memory';

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
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
              {wasCorrect ? 'Your Prediction Was Correct!' : 'Let\'s Review What You Observed'}
            </h3>
            <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
              {wasCorrect
                ? 'As you predicted, memory bandwidth is often the limiting factor! The GPU must load billions of model parameters from memory for each token generated.'
                : 'You saw in the experiment that memory bandwidth is often the limiting factor! The GPU must load billions of model parameters from memory for each token generated.'}
            </p>
          </div>

          {/* Visual diagram for review phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderReviewDiagram()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Autoregressive Bottleneck</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Why word-by-word?</strong> Language models are "autoregressive" - each new word depends on ALL previous words.
              The model can't know word #5 without first generating words #1-4.
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>The memory problem:</strong> For each token, the entire model (billions of parameters) must be loaded from GPU memory.
              Memory bandwidth, not compute power, is typically the limit.
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>KV Cache saves the day:</strong> Without caching, each token would require recomputing attention over ALL previous tokens.
              KV cache stores these computations, trading memory for massive speedup.
            </p>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>Two Phases of Generation</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Prefill:</strong> Process all input tokens in parallel (fast, compute-bound). Build the initial KV cache.
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Decode:</strong> Generate output tokens one at a time (slow, memory-bound). Each token requires loading model weights.
            </p>
          </div>

          {/* Cause-Effect Educational Content */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #22c55e' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Cause and Effect</h3>
            <div style={{ lineHeight: 1.8, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Because</strong> each token depends on all previous tokens,
                <strong style={{ color: colors.textPrimary }}> therefore</strong> the model cannot parallelize output generation.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Because</strong> model weights must be loaded for each token,
                <strong style={{ color: colors.textPrimary }}> therefore</strong> memory bandwidth becomes the bottleneck.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Because</strong> KV cache stores previous attention computations,
                <strong style={{ color: colors.textPrimary }}> therefore</strong> we avoid exponential slowdown with sequence length.
              </p>
            </div>
          </div>

          {/* Real-World Relevance */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Real-World Relevance</h3>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              Understanding inference latency is crucial for building production AI systems. Companies like OpenAI, Anthropic, and Google
              invest billions in hardware and software optimizations specifically to reduce latency. This directly impacts user experience -
              every millisecond saved translates to happier users and lower costs. The techniques you're learning here are used in
              ChatGPT, Claude, Gemini, and every major AI assistant you interact with daily.
            </p>
          </div>

          {/* Conceptual Scaffolding */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Building Understanding</h3>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>What you knew before:</strong> AI seems to think word by word
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>What you learned:</strong> This is autoregressive generation - a fundamental constraint
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Why it matters:</strong> Memory bandwidth limits speed, and KV cache is the key optimization
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover the Twist')
    );
  }

  // Static SVG for twist predict (streaming vs batching concept)
  const renderTwistStaticVisualization = () => (
    <svg width="100%" height="200" viewBox="0 0 500 200" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet">
      <rect width="500" height="200" fill="#0f172a" rx="12" />

      {/* Grid lines */}
      <line x1="30" y1="45" x2="470" y2="45" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
      <line x1="30" y1="110" x2="470" y2="110" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

      <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
        Streaming vs Batching
      </text>

      {/* Streaming visualization - absolute coords */}
      <text x="30" y="58" fill="#f59e0b" fontSize="12" fontWeight="bold">Streaming</text>
      <rect x="30" y="66" width="180" height="30" fill="rgba(245, 158, 11, 0.2)" rx="4" stroke="#f59e0b" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={`s-${i}`} x={40 + i * 35} y="71" width="30" height="20" fill="#f59e0b" rx="3" opacity={0.4 + i * 0.15} />
      ))}
      <text x="230" y="85" fill="rgba(148, 163, 184, 0.7)" fontSize="11">Low latency per user</text>

      {/* Batching visualization - absolute coords */}
      <text x="30" y="122" fill="#3b82f6" fontSize="12" fontWeight="bold">Batching</text>
      <rect x="30" y="130" width="180" height="50" fill="rgba(59, 130, 246, 0.2)" rx="4" stroke="#3b82f6" strokeWidth="1" />
      {[0, 1, 2].map(row => (
        <React.Fragment key={`br-${row}`}>
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={`b-${row}-${i}`} x={40 + i * 35} y={135 + row * 15} width="30" height="12" fill="#3b82f6" rx="2" opacity="0.7" />
          ))}
        </React.Fragment>
      ))}
      <text x="230" y="160" fill="rgba(148, 163, 184, 0.7)" fontSize="11">Higher throughput</text>
    </svg>
  );

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '8px' }}>The Twist</h2>

          {/* Progress indicator */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: '#a855f7', fontSize: '14px', fontWeight: 600 }}>
              Step 1 of 2: Make your prediction
            </span>
          </div>

          {/* Static SVG visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderTwistStaticVisualization()}
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px', color: colors.textSecondary }}>
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
      renderBottomBar(!!twistPrediction, 'See the Answer')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '8px' }}>Stream vs Batch</h2>

          {/* Observation guidance text */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center' }}>
              <strong>Observe:</strong> Toggle between stream and batch mode. Watch how throughput and latency change with each setting.
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
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Streaming</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Low perceived latency</li>
                <li>Users see progress</li>
                <li>Lower throughput</li>
                <li>One request at a time</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Batching</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
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

  // Twist review phase SVG diagram
  const renderTwistReviewDiagram = () => (
    <svg width="100%" height="160" viewBox="0 0 500 160" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet">
      <rect width="500" height="160" fill="#0f172a" rx="12" />

      {/* Grid lines */}
      <line x1="30" y1="45" x2="470" y2="45" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
      <line x1="30" y1="100" x2="470" y2="100" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

      <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
        Streaming vs Batching Tradeoff
      </text>

      {/* Streaming side - absolute coords */}
      <rect x="30" y="50" width="200" height="90" fill="rgba(245, 158, 11, 0.1)" rx="8" stroke="#f59e0b" strokeWidth="1" />
      <text x="130" y="75" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">Streaming</text>
      <text x="130" y="95" fill="#e2e8f0" fontSize="11" textAnchor="middle">Low perceived latency</text>
      <text x="130" y="115" fill="#e2e8f0" fontSize="11" textAnchor="middle">Interactive chat</text>
      <text x="130" y="135" fill="#22c55e" fontSize="11" textAnchor="middle">User Experience</text>

      {/* Batching side - absolute coords */}
      <rect x="270" y="50" width="200" height="90" fill="rgba(59, 130, 246, 0.1)" rx="8" stroke="#3b82f6" strokeWidth="1" />
      <text x="370" y="75" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">Batching</text>
      <text x="370" y="95" fill="#e2e8f0" fontSize="11" textAnchor="middle">High throughput</text>
      <text x="370" y="115" fill="#e2e8f0" fontSize="11" textAnchor="middle">API services</text>
      <text x="370" y="135" fill="#22c55e" fontSize="11" textAnchor="middle">Efficiency</text>
    </svg>
  );

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
              {wasCorrect ? 'Exactly!' : 'The key insight:'}
            </h3>
            <p style={{ color: colors.textSecondary }}>The right approach depends entirely on the use case! Interactive chat benefits from streaming, while API services might prefer batching for efficiency.</p>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderTwistReviewDiagram()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>The Tradeoff Space</h3>
            <div style={{ lineHeight: 1.8 }}>
              <p><strong style={{ color: '#f59e0b' }}>For Interactive Chat (ChatGPT, Claude):</strong></p>
              <p style={{ marginBottom: '16px', paddingLeft: '16px', color: colors.textSecondary }}>
                Streaming wins. Users perceive faster response when they see tokens appear.
                The perceived latency (time to first token) matters more than total time.
              </p>

              <p><strong style={{ color: '#3b82f6' }}>For API Services (bulk processing):</strong></p>
              <p style={{ paddingLeft: '16px', color: colors.textSecondary }}>
                Batching wins. When processing thousands of requests, throughput matters more than individual latency.
                Batching shares the memory bandwidth cost across requests.
              </p>
            </div>
          </div>

          {/* Cause-Effect for Twist */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #22c55e' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Cause and Effect</h3>
            <div style={{ lineHeight: 1.8, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Because</strong> streaming shows tokens immediately,
                <strong style={{ color: colors.textPrimary }}> therefore</strong> users perceive faster responses even if total time is similar.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Because</strong> batching amortizes memory bandwidth across requests,
                <strong style={{ color: colors.textPrimary }}> therefore</strong> total throughput increases but individual latency rises.
              </p>
            </div>
          </div>

          {/* Real-World Relevance for Twist */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Real-World Relevance</h3>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              This streaming vs batching tradeoff is central to how AI companies architect their systems. ChatGPT and Claude use
              streaming for interactive conversations. Meanwhile, enterprise API services batch requests for efficiency.
              Understanding this helps you design better AI applications and choose the right approach for your use case.
            </p>
          </div>

          {/* Conceptual Scaffolding for Twist */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Building Understanding</h3>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>What you knew before:</strong> Memory bandwidth limits inference speed
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>What you learned:</strong> Batching can share this cost across multiple requests
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Why it matters:</strong> The right choice depends on user experience vs efficiency tradeoffs
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // Transfer app reveal state
  const [revealedApps, setRevealedApps] = useState<Set<number>>(new Set());

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="A I Inference Latency"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>

          {/* Progress indicator */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <span style={{ color: colors.success, fontSize: '14px', fontWeight: 600 }}>
              Progress: {transferCompleted.size} of {transferApplications.length} applications completed
            </span>
          </div>

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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
              </div>

              {/* Show answer if revealed */}
              {revealedApps.has(index) && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '12px' }}>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>{app.answer}</p>
                </div>
              )}

              {/* Button area - always shows a button */}
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => {
                    if (!revealedApps.has(index)) {
                      setRevealedApps(new Set([...revealedApps, index]));
                    }
                    setTransferCompleted(new Set([...transferCompleted, index]));
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: revealedApps.has(index) ? colors.success : '#f59e0b',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Got It
                </button>
              ) : (
                <span style={{ color: colors.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{'\u2713'}</span> Completed
                </span>
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
                {testScore >= 8 ? 'You understand LLM inference latency!' : 'Review the concepts and try again.'}
              </p>
            </div>

            <div style={{ padding: '16px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
              {testQuestions.map((q, idx) => {
                const userAnswer = testAnswers[idx];
                const correctOption = q.options.find(o => o.correct);
                const correctAnswerIdx = q.options.indexOf(correctOption!);
                const userOption = userAnswer !== null ? q.options[userAnswer] : undefined;
                const isCorrect = userAnswer !== null && q.options[userAnswer!]?.correct;
                return (
                  <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                      <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                    </div>
                    {!isCorrect && (<div style={{ marginLeft: '26px', marginBottom: '6px' }}><span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span><span style={{ color: '#64748b', fontSize: '13px' }}>{userOption?.text}</span></div>)}
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}><span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span></div>
                    <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}><span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span><span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        renderBottomBar(true, testScore >= 8 ? 'Claim Mastery' : 'Try Again', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            {/* Question number in Q1 format */}
            <span style={{ color: colors.accent, fontWeight: 'bold', fontSize: '16px' }}>
              Question {currentTestQuestion + 1} of 10
            </span>
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
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: colors.textSecondary }}>{currentQ.question}</p>
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
                  minHeight: '44px',
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
                minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>MASTERY</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>AI Inference Expert!</h1>
          <p style={{ color: '#e2e8f0', marginBottom: '32px' }}>
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
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
        <button onClick={() => { onGameEvent?.({ type: 'mastery_achieved', details: { score: testQuestions.filter(q => testAnswers[testQuestions.indexOf(q)] !== null && q.options[testAnswers[testQuestions.indexOf(q)]!]?.correct).length, total: testQuestions.length } }); window.location.href = '/games'; }}
          style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          Complete Game &rarr;
        </button>
      </div>
    );
  }

  return null;
};

export default AIInferenceLatencyRenderer;
