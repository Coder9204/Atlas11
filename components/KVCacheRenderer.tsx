'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme, withOpacity } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// KV Cache (Key-Value Cache) - Complete 10-Phase Game
// Why caching attention matrices accelerates LLM inference
// -----------------------------------------------------------------------------

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

interface KVCacheRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A chatbot is generating a response word by word. Without any optimization, generating each new token requires recomputing attention for all previous tokens.",
    question: "Why is recomputing attention from scratch wasteful during autoregressive generation?",
    options: [
      { id: 'a', label: "The GPU runs out of memory after a few tokens" },
      { id: 'b', label: "Previous tokens' K and V projections never change, so recomputing them wastes compute", correct: true },
      { id: 'c', label: "The model's weights change during generation" },
      { id: 'd', label: "Attention scores must always be recalculated for accuracy" }
    ],
    explanation: "In autoregressive generation, once a token is processed, its Key and Value projections remain constant. Recomputing them with each new token wastes significant compute. KV Cache stores these projections, so only the new token's Q, K, V need to be computed."
  },
  {
    scenario: "An LLM with 32 attention heads and hidden dimension 4096 is generating text. After processing 1000 tokens, the KV cache consumes significant GPU memory.",
    question: "What determines the memory footprint of a KV cache?",
    options: [
      { id: 'a', label: "Only the model's total parameter count" },
      { id: 'b', label: "Number of layers x heads x sequence length x head dimension x 2 (K+V)", correct: true },
      { id: 'c', label: "The vocabulary size and embedding dimension" },
      { id: 'd', label: "The batch size alone determines memory usage" }
    ],
    explanation: "KV cache memory = (num_layers * num_heads * seq_len * head_dim * 2) * precision_bytes. For a 32-layer model with 32 heads, dim 128, and 1000 tokens in FP16: 32 * 32 * 1000 * 128 * 2 * 2 bytes = ~524 MB per sequence."
  },
  {
    scenario: "A developer notices that their LLM inference server becomes memory-bound rather than compute-bound when serving long-context requests.",
    question: "Why does KV cache create a memory bandwidth bottleneck in LLM inference?",
    options: [
      { id: 'a', label: "The model weights grow larger with context length" },
      { id: 'b', label: "Each new token requires loading the entire KV cache from memory, but compute per token is small", correct: true },
      { id: 'c', label: "Attention computation requires exponentially more memory" },
      { id: 'd', label: "The GPU cannot process cached values efficiently" }
    ],
    explanation: "Generating each token requires reading the full KV cache to compute attention, but the actual computation (matrix multiply) is relatively small. The ratio of memory reads to compute is very high, making inference memory-bandwidth limited rather than compute-limited."
  },
  {
    scenario: "A company wants to deploy a 70B parameter LLM to serve multiple users simultaneously. With standard KV caching, they can only fit 4 concurrent requests in GPU memory.",
    question: "What technique could help serve more concurrent users with the same GPU memory?",
    options: [
      { id: 'a', label: "Increase the GPU clock speed" },
      { id: 'b', label: "Use PagedAttention or vLLM to efficiently manage and share KV cache memory", correct: true },
      { id: 'c', label: "Reduce the model's vocabulary size" },
      { id: 'd', label: "Use longer context windows to amortize overhead" }
    ],
    explanation: "PagedAttention (used in vLLM) manages KV cache like virtual memory pages, eliminating fragmentation and enabling memory sharing across requests. This can increase throughput 2-4x by packing more sequences into the same GPU memory."
  },
  {
    scenario: "An LLM is configured with a 128K token context window, but most requests only use 2K tokens. The system pre-allocates KV cache for the full 128K.",
    question: "What problem does this pre-allocation strategy cause?",
    options: [
      { id: 'a', label: "The model becomes slower for short sequences" },
      { id: 'b', label: "Most allocated memory is wasted, severely limiting concurrent request capacity", correct: true },
      { id: 'c', label: "The attention mechanism produces incorrect results" },
      { id: 'd', label: "GPU compute units remain idle" }
    ],
    explanation: "Pre-allocating for maximum context wastes memory when actual sequences are shorter. If 98% of sequences use <2K tokens but you allocate 128K, you waste 98% of KV cache memory. Dynamic allocation or paged approaches solve this."
  },
  {
    scenario: "A multi-turn chatbot maintains conversation history. When the context grows to 50K tokens, response latency increases significantly.",
    question: "Why does latency increase as context length grows, even with KV caching?",
    options: [
      { id: 'a', label: "The model's weights become larger" },
      { id: 'b', label: "Each new token must attend to all cached K/V entries, and memory bandwidth becomes the bottleneck", correct: true },
      { id: 'c', label: "The vocabulary probability distribution becomes wider" },
      { id: 'd', label: "KV cache becomes corrupted with long sequences" }
    ],
    explanation: "Even with KV cache, generating each new token requires computing attention against ALL cached entries. With 50K tokens, each generation step must read 50K K/V pairs from memory. Memory bandwidth, not compute, becomes the limiting factor."
  },
  {
    scenario: "A team implements KV cache quantization, storing cache values in INT8 instead of FP16. Generation quality remains nearly identical.",
    question: "Why does reducing KV cache precision work well despite using lower bit representations?",
    options: [
      { id: 'a', label: "Attention weights don't need high precision" },
      { id: 'b', label: "KV values have limited dynamic range and attention softmax is robust to small quantization errors", correct: true },
      { id: 'c', label: "INT8 is actually higher precision than FP16" },
      { id: 'd', label: "The model automatically compensates for precision loss" }
    ],
    explanation: "KV cache values typically have bounded ranges that fit well in INT8. The softmax in attention is relatively robust to small quantization errors because it normalizes across the sequence. This allows 2x memory savings with minimal quality impact."
  },
  {
    scenario: "Two identical prompts are sent to an LLM server. A naive implementation processes each independently, computing the same KV cache twice.",
    question: "How can prefix caching help with duplicate or similar prompts?",
    options: [
      { id: 'a', label: "It compresses the prompts into shorter sequences" },
      { id: 'b', label: "It shares the KV cache for common prefixes across requests, avoiding redundant computation", correct: true },
      { id: 'c', label: "It skips attention computation for repeated words" },
      { id: 'd', label: "It increases the batch size automatically" }
    ],
    explanation: "Prefix caching stores KV cache entries for common prompts (like system prompts). When multiple requests share the same prefix, they can reuse the precomputed KV cache, saving both compute and memory. This is especially effective for system prompts used across many requests."
  },
  {
    scenario: "A researcher implements Multi-Query Attention (MQA), where all attention heads share the same K and V projections but have separate Q projections.",
    question: "How does MQA reduce KV cache memory requirements?",
    options: [
      { id: 'a', label: "It eliminates the need for caching entirely" },
      { id: 'b', label: "With only one K/V per layer instead of one per head, cache size drops by num_heads factor", correct: true },
      { id: 'c', label: "It compresses the attention patterns" },
      { id: 'd', label: "It reduces the sequence length that needs caching" }
    ],
    explanation: "Standard MHA has separate K,V for each head. MQA shares one K,V across all heads, reducing cache by num_heads (e.g., 32x). GQA is a middle ground, grouping heads to share K,V. This dramatically improves throughput with minimal quality loss."
  },
  {
    scenario: "An inference server sees that 80% of its GPU memory is consumed by KV cache, while model weights only take 20%.",
    question: "What does this memory distribution reveal about the system's operational characteristics?",
    options: [
      { id: 'a', label: "The model is too small for the GPU" },
      { id: 'b', label: "The server is handling long contexts or many concurrent sequences, making KV cache the main constraint", correct: true },
      { id: 'c', label: "The model weights should be quantized further" },
      { id: 'd', label: "The KV cache is being stored inefficiently" }
    ],
    explanation: "When KV cache dominates memory, it indicates either long contexts, many concurrent sequences, or both. This is the typical regime for production LLM serving. Optimizing KV cache (paging, quantization, MQA/GQA) becomes critical for throughput."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💬',
    title: 'ChatGPT & Conversational AI',
    short: 'Real-time conversation at scale',
    tagline: 'Every chat message relies on KV caching',
    description: 'ChatGPT and similar conversational AI systems use KV caching to maintain context across multi-turn conversations. Without caching, each response would require reprocessing the entire conversation history, making real-time interaction impossible at scale.',
    connection: 'When you send a message, the KV cache stores all previous turns. The model only computes K,V for your new message and retrieves cached values for context. This is why adding to a conversation is fast, but starting a new one with a long system prompt takes longer.',
    howItWorks: 'OpenAI and other providers use optimized KV caching with techniques like PagedAttention to serve millions of concurrent users. System prompts are prefix-cached to avoid recomputation. Memory-efficient attention variants reduce per-user memory footprint.',
    stats: [
      { value: '100M+', label: 'Weekly users served', icon: '👥' },
      { value: '10x', label: 'Faster with caching', icon: '⚡' },
      { value: '<500ms', label: 'Response latency', icon: '⏱️' }
    ],
    examples: ['ChatGPT API', 'Claude conversations', 'Gemini chat', 'Copilot in Microsoft 365'],
    companies: ['OpenAI', 'Anthropic', 'Google', 'Microsoft'],
    futureImpact: 'Advances in KV cache compression will enable million-token conversations with near-instant responses, transforming how we interact with AI assistants.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Code Generation & IDEs',
    short: 'Context-aware coding assistance',
    tagline: 'Your entire codebase in memory',
    description: 'AI coding assistants like GitHub Copilot use KV caching to maintain awareness of your entire file, project context, and coding patterns. The cache enables real-time suggestions as you type without re-reading all context for each keystroke.',
    connection: 'When you open a file, the assistant processes it once and caches K,V values. As you type, only new code triggers fresh computation. The cached context enables suggestions that understand function signatures, variable names, and coding style from earlier in the file.',
    howItWorks: 'IDE integrations use streaming KV cache updates. As you edit, the cache is partially invalidated and updated. Prefix caching shares common library code patterns across users. Speculative decoding accelerates multi-token suggestions.',
    stats: [
      { value: '55%', label: 'Code accepted rate', icon: '✅' },
      { value: '2x', label: 'Developer speed boost', icon: '🚀' },
      { value: '100K', label: 'Tokens of context', icon: '📄' }
    ],
    examples: ['GitHub Copilot', 'Cursor IDE', 'Amazon CodeWhisperer', 'Tabnine'],
    companies: ['GitHub', 'Cursor', 'Amazon', 'Tabnine'],
    futureImpact: 'Full repository understanding with efficient KV caching will enable AI that truly understands your entire codebase, suggesting refactors that span hundreds of files.',
    color: '#3B82F6'
  },
  {
    icon: '📚',
    title: 'Document Analysis & RAG',
    short: 'Long documents without limits',
    tagline: 'Analyze books, not just paragraphs',
    description: 'Retrieval-Augmented Generation (RAG) systems and document analyzers use KV caching to efficiently process long documents. The cache allows querying against pre-processed documents without re-encoding them for each question.',
    connection: 'When a document is ingested, its KV cache is computed once and stored. Multiple queries against the same document reuse this cache, making subsequent questions nearly instant. This is why "chat with your PDF" tools get faster after the initial processing.',
    howItWorks: 'Documents are chunked and their KV caches pre-computed and stored. Query processing only requires computing the question\'s K,V and attending to cached document representations. Hierarchical caching enables book-length analysis.',
    stats: [
      { value: '1M+', label: 'Tokens per document', icon: '📖' },
      { value: '50x', label: 'Query speedup', icon: '⚡' },
      { value: '99%', label: 'Retrieval accuracy', icon: '🎯' }
    ],
    examples: ['Perplexity AI', 'ChatPDF', 'Notion AI', 'Enterprise search tools'],
    companies: ['Perplexity', 'Anthropic', 'Cohere', 'OpenAI'],
    futureImpact: 'Persistent KV caches will create "document memories" that accumulate understanding over time, enabling AI that truly learns from every document it reads.',
    color: '#8B5CF6'
  },
  {
    icon: '🤖',
    title: 'Autonomous AI Agents',
    short: 'Long-running AI with memory',
    tagline: 'Agents that remember everything',
    description: 'AI agents performing multi-step tasks (browsing, coding, research) need to maintain context across many actions. KV caching enables agents to remember their entire action history without reprocessing at each step.',
    connection: 'As an agent takes actions, each observation is appended to context and its K,V cached. The agent can reference any previous step instantly. Without caching, a 100-step task would require 100x recomputation by the end.',
    howItWorks: 'Agent frameworks use rolling KV caches with summarization for very long contexts. Critical memories are retained while older, less relevant context may be compressed. State checkpointing enables resumption of long-running tasks.',
    stats: [
      { value: '1000+', label: 'Steps per task', icon: '🔄' },
      { value: '24hrs', label: 'Continuous operation', icon: '⏰' },
      { value: '10GB', label: 'Cache per agent', icon: '💾' }
    ],
    examples: ['Devin (AI developer)', 'AutoGPT', 'Claude computer use', 'OpenAI Assistants'],
    companies: ['Cognition AI', 'OpenAI', 'Anthropic', 'Adept'],
    futureImpact: 'Efficient KV caching will enable truly autonomous agents that work for days or weeks, maintaining perfect recall of their entire journey.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const KVCacheRenderer: React.FC<KVCacheRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [tokenCount, setTokenCount] = useState(1);
  const [kvCacheEnabled, setKvCacheEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [showComputeBreakdown, setShowComputeBreakdown] = useState(false);
  const [contextLength, setContextLength] = useState(512);
  const [numLayers, setNumLayers] = useState(12);
  const [animationFrame, setAnimationFrame] = useState(0);

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
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors - text uses brightness >= 180 for contrast
  const colors = {
    ...theme.colors,
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    key: '#f59e0b',
    value: '#06b6d4',
    cache: '#8b5cf6',
    evict: '#ef4444',
    cached: '#10B981', // Green for cached
    compute: '#EF4444', // Red for compute
    memory: '#3B82F6', // Blue for memory
    textDecorative: 'rgba(255, 255, 255, 0.6)', // Muted decorative text
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
    twist_play: 'Twist Lab',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate compute and memory metrics
  const computeWithoutCache = tokenCount * tokenCount; // O(n^2) for attention
  const computeWithCache = tokenCount * 2; // O(n) - only new token attends to all
  const cacheMemory = tokenCount * numLayers * 2; // K + V per layer
  const computeSavings = computeWithoutCache > 0 ? ((computeWithoutCache - computeWithCache) / computeWithoutCache * 100) : 0;

  // Token generation simulation
  useEffect(() => {
    if (isGenerating && phase === 'play') {
      const interval = setInterval(() => {
        setGenerationStep(s => {
          if (s >= tokenCount) {
            setIsGenerating(false);
            return s;
          }
          return s + 1;
        });
      }, kvCacheEnabled ? 100 : 300);
      return () => clearInterval(interval);
    }
  }, [isGenerating, kvCacheEnabled, tokenCount, phase]);

  // KV Cache Visualization Component
  const KVCacheVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 280 : 350;
    const padding = { top: 30, right: 20, bottom: 30, left: 20 };
    const matrixWidth = width - padding.left - padding.right;
    const matrixHeight = height - padding.top - padding.bottom;

    const maxTokensDisplay = Math.min(tokenCount, 8);
    const cellSize = Math.min(matrixWidth / (maxTokensDisplay + 2), matrixHeight / (numLayers + 1)) - 4;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="K V Cache visualization">
        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
          KV Cache Structure (Layers x Tokens)
        </text>

        {/* Layer labels */}
        {Array.from({ length: Math.min(numLayers, 6) }).map((_, layerIdx) => (
          <text
            key={`layer-${layerIdx}`}
            x={padding.left - 5}
            y={padding.top + 30 + layerIdx * (cellSize + 4) + cellSize / 2}
            fill={colors.textMuted}
            fontSize="11"
            textAnchor="end"
            dominantBaseline="middle"
          >
            L{layerIdx + 1}
          </text>
        ))}

        {/* KV Cache matrix */}
        {Array.from({ length: Math.min(numLayers, 6) }).map((_, layerIdx) =>
          Array.from({ length: maxTokensDisplay }).map((_, tokenIdx) => {
            const isCached = tokenIdx < generationStep;
            const isCurrentToken = tokenIdx === generationStep - 1 && isGenerating;
            const x = padding.left + 20 + tokenIdx * (cellSize + 4);
            const y = padding.top + 30 + layerIdx * (cellSize + 4);

            return (
              <g key={`cell-${layerIdx}-${tokenIdx}`}>
                {/* K cell */}
                <rect
                  x={x}
                  y={y}
                  width={cellSize / 2 - 1}
                  height={cellSize}
                  fill={isCached ? colors.cached : colors.bgSecondary}
                  stroke={isCurrentToken ? colors.warning : colors.border}
                  strokeWidth={isCurrentToken ? 2 : 1}
                  rx="3"
                  opacity={isCached ? 0.8 + Math.sin(animationFrame * 0.1 + tokenIdx) * 0.2 : 0.3}
                />
                {/* V cell */}
                <rect
                  x={x + cellSize / 2 + 1}
                  y={y}
                  width={cellSize / 2 - 1}
                  height={cellSize}
                  fill={isCached ? colors.memory : colors.bgSecondary}
                  stroke={isCurrentToken ? colors.warning : colors.border}
                  strokeWidth={isCurrentToken ? 2 : 1}
                  rx="3"
                  opacity={isCached ? 0.8 + Math.sin(animationFrame * 0.1 + tokenIdx + 1) * 0.2 : 0.3}
                />
              </g>
            );
          })
        )}

        {/* Token labels */}
        {Array.from({ length: maxTokensDisplay }).map((_, tokenIdx) => (
          <text
            key={`token-${tokenIdx}`}
            x={padding.left + 20 + tokenIdx * (cellSize + 4) + cellSize / 2}
            y={height - 10}
            fill={tokenIdx < generationStep ? colors.textSecondary : colors.textMuted}
            fontSize="11"
            textAnchor="middle"
          >
            T{tokenIdx + 1}
          </text>
        ))}

        {/* Legend */}
        <g transform={`translate(${width - 100}, ${padding.top + 30})`}>
          <rect x="0" y="0" width="12" height="12" fill={colors.cached} rx="2" />
          <text x="18" y="10" fill={colors.textSecondary} fontSize="11">Keys (K)</text>
          <rect x="0" y="18" width="12" height="12" fill={colors.memory} rx="2" />
          <text x="18" y="28" fill={colors.textSecondary} fontSize="11">Values (V)</text>
          <rect x="0" y="36" width="12" height="12" fill={colors.bgSecondary} stroke={colors.border} rx="2" />
          <text x="18" y="46" fill={colors.textSecondary} fontSize="11">Empty</text>
        </g>
      </svg>
    );
  };

  // Attention Pattern Visualization
  const AttentionVisualization = ({ showCache = true }: { showCache?: boolean }) => {
    const width = isMobile ? 320 : 460;
    const height = isMobile ? 280 : 340;
    const padL = 50, padR = 20, padT = 50, padB = 60;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const tokens = ['The', 'cat', 'sat', 'on', 'the', 'mat', '.'];
    const displayTokens = tokens.slice(0, Math.min(tokenCount, tokens.length));
    const numVisible = displayTokens.length;
    const tokenSpacing = numVisible > 1 ? chartW / (numVisible - 1) : chartW / 2;
    const queryX = padL + chartW / 2;
    const queryY = padT + chartH * 0.82;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="cacheGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur" /><feFlood floodColor="#8b5cf6" floodOpacity="0.4" result="color" /><feComposite in="color" in2="blur" operator="in" result="colorBlur" /><feMerge><feMergeNode in="colorBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="kvGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" /></linearGradient>
          <pattern id="gridDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.5" fill="rgba(148,163,184,0.15)" /></pattern>
          <linearGradient id="kvCachedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="kvComputeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="kvQueryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="kvBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a30" />
            <stop offset="100%" stopColor="#0a0a1a" />
          </linearGradient>
          <filter id="kvGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="kvGlowStrong">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#kvBgGrad)" rx="12" />

        {/* Grid lines (horizontal) */}
        <g id="grid-lines" opacity="0.25">
          {[0, 0.33, 0.66, 1].map((frac, i) => (
            <line key={i}
              x1={padL} y1={padT + frac * chartH}
              x2={padL + chartW} y2={padT + frac * chartH}
              stroke={colors.border} strokeWidth="1" strokeDasharray="4,4"
            />
          ))}
          {displayTokens.map((_, i) => {
            const x = padL + i * tokenSpacing;
            return <line key={i} x1={x} y1={padT} x2={x} y2={padT + chartH} stroke={colors.border} strokeWidth="1" strokeDasharray="3,5" />;
          })}
        </g>

        {/* Y-axis label */}
        <text x="12" y={padT + chartH / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle"
          transform={`rotate(-90, 12, ${padT + chartH / 2})`}>
          Token Layer
        </text>

        {/* X-axis label */}
        <text x={padL + chartW / 2} y={height - 8} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Sequence Position → Time
        </text>

        {/* Axis tick marks */}
        <g id="tick-marks">
          {displayTokens.map((_, i) => (
            <line key={i}
              x1={padL + i * tokenSpacing} y1={padT + chartH}
              x2={padL + i * tokenSpacing} y2={padT + chartH + 6}
              stroke={colors.textMuted} strokeWidth="1"
            />
          ))}
        </g>

        {/* Attention lines from query to each cached token */}
        <g id="attention-lines">
          {displayTokens.map((_, i) => {
            const endX = padL + i * tokenSpacing;
            const endY = padT + chartH * 0.2;
            const isCached = showCache && i < generationStep;
            const isCurrentToken = i === generationStep - 1 && isGenerating;

            return (
              <g key={`attn-${i}`}>
                <line
                  x1={queryX} y1={queryY - 18}
                  x2={endX} y2={endY + 18}
                  stroke={isCached ? '#10B981' : '#EF4444'}
                  strokeWidth={isCurrentToken ? 3 : isCached ? 2 : 1}
                  strokeDasharray={isCached ? "none" : "5,5"}
                  opacity={isCached ? 0.8 : 0.35}
                  filter={isCurrentToken ? "url(#kvGlow)" : undefined}
                />
                <circle
                  cx={endX} cy={endY + 16}
                  r={isCached ? 5 : 3}
                  fill={isCached ? '#10B981' : '#EF4444'}
                  opacity={isCached ? 0.9 : 0.3}
                  filter={isCurrentToken ? "url(#kvGlowStrong)" : undefined}
                />
              </g>
            );
          })}
        </g>

        {/* Cached/uncached K/V token boxes at top */}
        <g id="token-boxes">
          {displayTokens.map((token, i) => {
            const x = padL + i * tokenSpacing;
            const y = padT + chartH * 0.2;
            const isCached = showCache && i < generationStep;
            const isCurrentToken = i === generationStep - 1 && isGenerating;

            return (
              <g key={`tok-${i}`} filter={isCurrentToken ? "url(#kvGlowStrong)" : undefined}>
                <rect x={x - 22} y={y - 16} width="44" height="32" rx="6"
                  fill={isCached ? 'url(#kvCachedGrad)' : 'url(#kvComputeGrad)'}
                  stroke={isCurrentToken ? colors.warning : isCached ? '#10B981' : '#EF4444'}
                  strokeWidth={isCurrentToken ? 2.5 : 1.5}
                  opacity={isCached ? 1 : 0.4}
                />
                <text x={x} y={y + 5} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
                  {token}
                </text>
              </g>
            );
          })}
        </g>

        {/* Token labels below the boxes (status: cached / compute) */}
        <g id="token-labels">
          {displayTokens.map((_, i) => {
            const x = padL + i * tokenSpacing;
            const isCached = showCache && i < generationStep;
            return (
              <text key={i} x={x} y={padT + chartH * 0.2 + 30}
                fill={isCached ? '#10B981' : colors.textMuted}
                fontSize="11" textAnchor="middle" fontWeight={isCached ? 600 : 400}>
                {isCached ? 'cached' : 'miss'}
              </text>
            );
          })}
        </g>

        {/* Attention flow arc (decorative path showing Q→K attention reach) */}
        <path
          d={`M ${padL + 10} ${padT + 10} Q ${padL + chartW * 0.2} ${padT + chartH * 0.55} ${queryX - 30} ${queryY - 20}`}
          fill="none"
          stroke={showCache ? '#10B981' : '#EF4444'}
          strokeWidth="1.5"
          strokeDasharray="6,4"
          opacity="0.2"
        />
        <path
          d={`M ${padL + chartW - 10} ${padT + 10} Q ${padL + chartW * 0.8} ${padT + chartH * 0.55} ${queryX + 30} ${queryY - 20}`}
          fill="none"
          stroke={showCache ? '#10B981' : '#EF4444'}
          strokeWidth="1.5"
          strokeDasharray="6,4"
          opacity="0.2"
        />

        {/* Query box (new token) */}
        <g id="query-box" filter="url(#kvGlow)">
          <rect x={queryX - 28} y={queryY - 16} width="56" height="32" rx="8"
            fill="url(#kvQueryGrad)"
            stroke={colors.warning}
            strokeWidth="2"
          />
          <text x={queryX} y={queryY + 5} fill="white" fontSize="13" fontWeight="700" textAnchor="middle">Q</text>
        </g>
        <text x={queryX} y={queryY + 26} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          New Token
        </text>

        {/* Title */}
        <text x={padL + chartW / 2} y="22" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          {showCache ? 'KV Cache: Attend without recompute' : 'No Cache: Recompute all K,V'}
        </text>

        {/* Legend */}
        <g id="legend">
          {(() => {
            const lx = width - 110;
            const ly = padT + 4;
            return (
              <>
                <rect x={lx} y={ly} width="100" height="50" rx="6" fill="#0f172a" opacity="0.7" />
                <rect x={lx + 6} y={ly + 8} width="14" height="12" rx="3" fill="#10B981" />
                <text x={lx + 24} y={ly + 19} fill={colors.textSecondary} fontSize="11">Cached K,V</text>
                <rect x={lx + 6} y={ly + 26} width="14" height="12" rx="3" fill="#EF4444" opacity="0.5" />
                <text x={lx + 24} y={ly + 37} fill={colors.textSecondary} fontSize="11">Recompute</text>
              </>
            );
          })()}
        </g>
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
      zIndex: 1001,
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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style - minHeight 44px for touch targets
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

  // Navigate to previous phase
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Navigation bar component - fixed position with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {phaseOrder.indexOf(phase) > 0 && (
          <button
            onClick={prevPhase}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: colors.textSecondary,
              cursor: 'pointer',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Back
          </button>
        )}
        <span style={{ fontSize: '24px' }}>🧠💾</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>KV Cache</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🧠💾
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            KV Cache in Transformers
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Why recompute what you already know? The secret to fast LLM inference is <span style={{ color: colors.accent }}>remembering past computations</span>."
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
              "Without KV caching, generating 100 tokens would require 100x the computation of generating 1 token. With caching, it's nearly linear."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.8)', marginTop: '8px' }}>
              — LLM Inference Optimization
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Start: Discover the Cache Secret
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Compute doubles with each token - previous tokens must be fully reprocessed' },
      { id: 'b', text: 'Compute grows quadratically (O(n^2)) because attention requires comparing all token pairs' },
      { id: 'c', text: 'Compute stays constant - the model processes one token at a time' },
    ];

    // Static SVG for predict phase
    const PredictSVG = () => {
      const svgWidth = isMobile ? 320 : 450;
      const svgHeight = 200;
      return (
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
          {/* Tokens */}
          {['The', 'cat', 'sat', '...', '?'].map((token, i) => {
            const x = 40 + i * (isMobile ? 55 : 80);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={60}
                  width={isMobile ? 45 : 60}
                  height={40}
                  fill={i === 4 ? colors.warning : `${colors.accent}44`}
                  stroke={i === 4 ? colors.warning : colors.accent}
                  strokeWidth={2}
                  rx={8}
                />
                <text x={x + (isMobile ? 22 : 30)} y={85} fill={colors.textPrimary} fontSize="14" fontWeight="500" textAnchor="middle">
                  {token}
                </text>
              </g>
            );
          })}
          {/* Arrow connections showing attention */}
          {[0, 1, 2, 3].map(i => {
            const startX = 40 + 4 * (isMobile ? 55 : 80) + (isMobile ? 22 : 30);
            const endX = 40 + i * (isMobile ? 55 : 80) + (isMobile ? 22 : 30);
            return (
              <line
                key={i}
                x1={startX}
                y1={60}
                x2={endX}
                y2={100}
                stroke={colors.compute}
                strokeWidth={1.5}
                strokeDasharray="4,4"
                opacity={0.6}
              />
            );
          })}
          <text x={svgWidth / 2} y={150} fill={colors.textSecondary} fontSize="13" textAnchor="middle">
            Each new token attends to all previous tokens
          </text>
          <text x={svgWidth / 2} y={175} fill={colors.textMuted} fontSize="11" textAnchor="middle">
            What happens to compute as sequence grows?
          </text>
        </svg>
      );
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress indicator */}
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step 1 of 1
              </span>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              When an LLM generates tokens one by one WITHOUT caching, how does computation grow with sequence length?
            </h2>

            {/* Static SVG diagram */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <PredictSVG />
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
                    minHeight: '44px',
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
                Test My Prediction
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive KV Cache Visualization
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Watch the KV Cache in Action
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Generate tokens and see how caching changes compute requirements
            </p>

            {/* Physics definition */}
            <div style={{
              background: `${colors.memory}11`,
              border: `1px solid ${colors.memory}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.memory }}>Key Concept:</strong> KV Cache stores Key (<span style={{ color: '#fbbf24', fontWeight: 700 }}>K</span>) and Value (<span style={{ color: '#22d3ee', fontWeight: 700 }}>V</span>) projections from attention layers. Without cache, compute ∝ <span style={{ color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>n²</span> per step. With cache, compute ∝ <span style={{ color: '#86efac', fontFamily: 'monospace', fontWeight: 700 }}>n</span> per step. Savings = (n²−n)/n² × 100%. Attention complexity theory shows <span style={{ color: '#fbbf24', fontWeight: 700 }}>K</span> and <span style={{ color: '#22d3ee', fontWeight: 700 }}>V</span> projections are constant once computed.
              </p>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Toggle KV Cache on/off and watch how compute requirements change. Notice how cached tokens (green) avoid recomputation.
              </p>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> KV caching is important because it enables real-time LLM inference in practical applications like ChatGPT, GitHub Copilot, and other AI assistants. Without this technology, generating responses would be too slow for interactive use.
              </p>
            </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <AttentionVisualization showCache={kvCacheEnabled} />
                </div>

                {/* Compute comparison */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                    border: `2px solid ${kvCacheEnabled ? colors.border : colors.compute}`,
                  }}>
                    <div style={{ ...typo.h3, color: colors.compute }}>{computeWithoutCache}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Without Cache</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                    border: `2px solid ${kvCacheEnabled ? colors.cached : colors.border}`,
                  }}>
                    <div style={{ ...typo.h3, color: colors.cached }}>{computeWithCache}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>With Cache</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Token count slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Sequence Length</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{tokenCount} tokens</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={tokenCount}
                  onChange={(e) => {
                    setTokenCount(parseInt(e.target.value));
                    setGenerationStep(0);
                  }}
                  disabled={isGenerating}
                  style={{
                    width: '100%',
                    height: '24px',
                    borderRadius: '4px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    opacity: isGenerating ? 0.5 : 1,
                    WebkitAppearance: 'none',
                    touchAction: 'pan-y',
                    accentColor: colors.accent,
                  }}
                />
              </div>

              {/* KV Cache toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>No Cache</span>
                <button
                  onClick={() => {
                    setKvCacheEnabled(!kvCacheEnabled);
                    setGenerationStep(0);
                  }}
                  style={{
                    width: '60px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: kvCacheEnabled ? colors.success : colors.border,
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
                    left: kvCacheEnabled ? '33px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{ ...typo.small, color: kvCacheEnabled ? colors.success : colors.textSecondary, fontWeight: kvCacheEnabled ? 600 : 400 }}>
                  Cache ON
                </span>
              </div>

              {/* Generate button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => {
                    setGenerationStep(0);
                    setIsGenerating(true);
                    playSound('click');
                  }}
                  disabled={isGenerating}
                  style={{
                    background: isGenerating ? colors.border : colors.accent,
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  {isGenerating ? `Generating... (${generationStep}/${tokenCount})` : 'Generate Tokens'}
                </button>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {generationStep >= tokenCount && tokenCount >= 4 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                {kvCacheEnabled
                  ? `KV Cache saves ${computeSavings.toFixed(0)}% of compute! Only the new token's K,V are calculated.`
                  : `Without caching, you'd need ${computeWithoutCache - computeWithCache} extra operations!`}
              </p>
            </div>
          )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand How It Works
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              How KV Cache Eliminates Redundant Work
            </h2>

            {/* Reference to prediction */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Your Prediction:</strong> As you observed in the experiment, compute grows quadratically without caching because attention requires comparing all token pairs. Your prediction helped you discover this fundamental relationship between sequence length and computational cost.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <KVCacheVisualization />
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Attention = Softmax(Q * K^T) * V</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  For each new token, we need <span style={{ color: colors.warning }}>Q (Query)</span> for the new token,
                  but <span style={{ color: colors.cached }}>K (Keys)</span> and <span style={{ color: colors.memory }}>V (Values)</span> from ALL previous tokens.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Key Insight:</strong> Once a token is processed, its K and V projections never change!
                </p>
                <p>
                  By caching K and V after each token, we avoid recomputing them, turning O(n^2) generation into O(n).
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
                Key Insight
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                KV Cache trades memory for compute. We store 2 * num_layers * hidden_dim values per token,
                but save num_tokens operations per generation step. For long sequences, this is a massive win.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Memory Tradeoffs
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Memory stays constant - only the newest K/V are stored' },
      { id: 'b', text: 'Memory grows linearly with context - each token adds K/V for every layer' },
      { id: 'c', text: 'Memory grows quadratically - attention needs all pair combinations' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Memory Requirements
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            As context grows from 1K to 100K tokens, how does KV cache memory change?
          </h2>

          {/* Memory growth visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 320 : 450} height={180} viewBox={`0 0 ${isMobile ? 320 : 450} 180`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              {/* Memory bars */}
              {[1, 2, 4, 8, 16].map((mult, i) => {
                const x = 40 + i * (isMobile ? 55 : 80);
                const height = Math.min(mult * 15, 120);
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={140 - height}
                      width={isMobile ? 40 : 55}
                      height={height}
                      fill={colors.memory}
                      rx={4}
                      opacity={0.7}
                    />
                    <text x={x + (isMobile ? 20 : 27)} y={160} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
                      {mult}K
                    </text>
                  </g>
                );
              })}
              <text x={isMobile ? 160 : 225} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
                Memory Usage vs Context Length
              </text>
              <text x={isMobile ? 160 : 225} y={175} fill={colors.textDecorative} fontSize="11" textAnchor="middle">
                Tokens (in thousands)
              </text>
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
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Memory Impact
            </button>
          )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const memoryPerToken = numLayers * 2 * 128 * 2 / 1024; // KB per token (assuming 128 dim, FP16)
    const totalMemory = contextLength * memoryPerToken / 1024; // MB

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Memory vs Context Length Tradeoff
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust parameters to see KV cache memory requirements
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Adjust context length and number of layers to see how KV cache memory scales. Notice how longer contexts and deeper models dramatically increase memory requirements.
              </p>
            </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>

            {/* KV Cache Memory Scaling SVG */}
            {(() => {
              const svgW = isMobile ? 320 : 460;
              const svgH = 200;
              const pad = { top: 30, right: 20, bottom: 40, left: 55 };
              const chartW = svgW - pad.left - pad.right;
              const chartH = svgH - pad.top - pad.bottom;
              const maxCtx = 8192;
              const maxMem = (maxCtx * numLayers * 2 * 128 * 2) / (1024 * 1024); // MB at current layers - auto-scales
              const pts = Array.from({ length: 20 }, (_, k) => {
                const ctx = (k / 19) * maxCtx;
                const mem = (ctx * numLayers * 2 * 128 * 2) / (1024 * 1024);
                const px = pad.left + (ctx / maxCtx) * chartW;
                const py = pad.top + chartH * (1 - Math.min(mem / maxMem, 1));
                return `${k === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
              }).join(' ');
              const curCtxX = pad.left + (contextLength / maxCtx) * chartW;
              const curMem = (contextLength * numLayers * 2 * 128 * 2) / (1024 * 1024);
              const curY = pad.top + chartH * (1 - Math.min(curMem / maxMem, 1));
              return (
                <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ background: colors.bgCard, borderRadius: '12px', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="kvMemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.error} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={colors.memory} stopOpacity={0.3} />
                    </linearGradient>
                    <filter id="kvGlow">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1={pad.left} y1={pad.top + i * chartH / 4} x2={pad.left + chartW} y2={pad.top + i * chartH / 4}
                      stroke="#334155" strokeWidth={0.5} opacity={0.4} strokeDasharray="4,4" />
                  ))}
                  {/* Area fill */}
                  <path d={`${pts} L ${pad.left + chartW} ${pad.top + chartH} L ${pad.left} ${pad.top + chartH} Z`} fill="url(#kvMemGrad)" opacity={0.3} />
                  {/* Memory line */}
                  <path d={pts} fill="none" stroke={colors.memory} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  {/* Current position marker */}
                  <line x1={curCtxX} y1={pad.top} x2={curCtxX} y2={pad.top + chartH} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7} />
                  <circle cx={curCtxX} cy={curY} r={8} fill={colors.accent} stroke="#ffffff" strokeWidth={2} filter="url(#kvGlow)" />
                  <text x={curCtxX + 12} y={curY - 4} fill={colors.accent} fontSize={11} fontWeight="600">{curMem.toFixed(0)} MB</text>
                  {/* Axis labels */}
                  <text x={pad.left + chartW / 2} y={svgH - 4} fill={colors.textMuted} fontSize={11} textAnchor="middle">Context Length (tokens)</text>
                  <text x={14} y={pad.top + chartH / 2} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, 14, ${pad.top + chartH / 2})`}>Memory (MB)</text>
                  <text x={svgW / 2} y={20} fill={colors.textSecondary} fontSize={12} fontWeight="600" textAnchor="middle">KV Cache Memory Scaling</text>
                </svg>
              );
            })()}

            {/* Memory visualization */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${colors.memory}, ${colors.accent})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  💾
                </div>
                <div>
                  <div style={{ ...typo.h2, color: colors.textPrimary }}>{totalMemory.toFixed(1)} MB</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>KV Cache per sequence</div>
                </div>
              </div>

              {/* Memory bar */}
              <div style={{
                height: '24px',
                background: colors.bgPrimary,
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((totalMemory / 1024) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${colors.success}, ${totalMemory > 512 ? colors.warning : colors.success}, ${totalMemory > 1024 ? colors.error : colors.warning})`,
                  transition: 'width 0.3s ease',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  ...typo.small,
                  color: colors.textPrimary,
                  fontWeight: 600,
                }}>
                  {totalMemory > 1024 ? '> 1 GB!' : totalMemory > 512 ? 'High' : 'Manageable'}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.cached }}>{memoryPerToken.toFixed(1)} KB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Per Token</div>
              </div>
              <div style={{
                background: colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.memory }}>{numLayers * 2}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>K+V Matrices</div>
              </div>
              <div style={{
                background: colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{(1024 / totalMemory).toFixed(0)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Seqs per GB</div>
              </div>
            </div>
          </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Context length slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Context Length</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{contextLength.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="128"
                max="8192"
                step="128"
                value={contextLength}
                onChange={(e) => setContextLength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  touchAction: 'pan-y',
                  accentColor: colors.accent,
                }}
              />
            </div>

            {/* Number of layers slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Layers</span>
                <span style={{ ...typo.small, color: colors.memory, fontWeight: 600 }}>{numLayers}</span>
              </div>
              <input
                type="range"
                min="6"
                max="96"
                step="6"
                value={numLayers}
                onChange={(e) => setNumLayers(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  touchAction: 'pan-y',
                  accentColor: colors.memory,
                }}
              />
            </div>
          </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Bottleneck
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Memory Bandwidth Bottleneck
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💾</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Memory-Bound Inference</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Each new token requires reading the <span style={{ color: colors.error }}>entire KV cache</span> from GPU memory.
                With long contexts, memory bandwidth (not compute) becomes the bottleneck.
                This is why inference is often slower than training despite lower compute.
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Solutions</h3>
              </div>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.success }}>Multi-Query Attention (MQA):</strong> Share K,V across heads, reducing cache by 32x
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.memory }}>Grouped-Query Attention (GQA):</strong> Middle ground - groups of heads share K,V
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.warning }}>KV Cache Quantization:</strong> Store in INT8 instead of FP16 (2x reduction)
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: colors.accent }}>PagedAttention:</strong> Virtual memory for KV cache (no fragmentation)
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Core Tradeoff</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                KV Cache converts compute to memory. For serving, this creates a new bottleneck:
                <strong style={{ color: colors.textPrimary }}> how many concurrent sequences can fit in GPU memory?</strong> This determines throughput and cost-per-token.
              </p>
            </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="K V Cache"
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
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
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
                    checkmark
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
                How KV Cache Connects:
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

          {/* Got It / Next Application button */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  setSelectedApp(selectedApp + 1);
                }}
                style={{ ...primaryButtonStyle, flex: 1 }}
              >
                Next Application
              </button>
            ) : (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, flex: 1 }}
              >
                Got It
              </button>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
          </div>

          {renderNavDots()}
        </div>
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingTop: '80px',
          }}>
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
                ? 'You\'ve mastered KV Cache in Transformers!'
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
            {renderNavDots()}
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>

          {renderNavDots()}
        </div>
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
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          KV Cache Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how KV Cache accelerates LLM inference and the critical memory-compute tradeoffs involved.
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
              'Why recomputing attention is wasteful',
              'How KV Cache stores Key and Value matrices',
              'Memory vs compute tradeoffs',
              'Context length and memory scaling',
              'Memory bandwidth bottleneck in inference',
              'Solutions: MQA, GQA, quantization, paging',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>checkmark</span>
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
                minHeight: '44px',
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
      </div>
    );
  }

  return null;
};

export default KVCacheRenderer;
