'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Attention Memory Scaling - Complete 10-Phase Game
// Why transformer memory grows quadratically with sequence length
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

interface AttentionMemoryRendererProps {
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
    scenario: "A research team fine-tunes a language model on documents. With 1,000 tokens, it uses 2GB of GPU memory. When they try 4,000 tokens, the training crashes with an out-of-memory error.",
    question: "Why does quadrupling the sequence length cause a memory crash, not just 4x more usage?",
    options: [
      { id: 'a', label: "The model weights get larger with longer sequences" },
      { id: 'b', label: "Attention memory scales O(n^2), so 4x length means 16x memory for attention", correct: true },
      { id: 'c', label: "Longer sequences require more model layers" },
      { id: 'd', label: "GPU memory fragmentation becomes worse with longer sequences" }
    ],
    explanation: "Self-attention computes relationships between every pair of tokens. With n tokens, this creates an n×n attention matrix. Doubling the sequence quadruples memory; quadrupling it increases memory by 16x. This O(n²) scaling is the fundamental bottleneck in transformer memory."
  },
  {
    scenario: "An AI company claims their new model can process 1 million token contexts, while GPT-4's context is 128K tokens. The new model requires specialized memory-efficient techniques.",
    question: "What makes processing 1 million tokens fundamentally challenging?",
    options: [
      { id: 'a', label: "The vocabulary would need to be 8x larger" },
      { id: 'b', label: "A standard attention matrix would need 1 trillion entries, requiring terabytes of memory", correct: true },
      { id: 'c', label: "The model would need 8x more layers" },
      { id: 'd', label: "Training data for long contexts doesn't exist" }
    ],
    explanation: "With 1M tokens, a standard attention matrix has 1M × 1M = 1 trillion entries. At 2 bytes per entry (FP16), that's 2TB just for one attention layer. Long-context models use techniques like Flash Attention, sparse attention, or sliding windows to avoid materializing the full matrix."
  },
  {
    scenario: "A developer notices that GPT-4 with 32 attention heads processes 4K tokens using 2GB for attention. They wonder how the heads affect total memory.",
    question: "If the model had 64 heads instead of 32, how would attention memory change?",
    options: [
      { id: 'a', label: "Memory would double because there are twice as many heads" },
      { id: 'b', label: "Memory stays roughly the same; more heads means smaller head dimension, total stays similar", correct: true },
      { id: 'c', label: "Memory would halve because work is distributed across more heads" },
      { id: 'd', label: "Memory would quadruple because heads interact with each other" }
    ],
    explanation: "Multi-head attention splits the embedding dimension across heads. With d_model=1024 and 32 heads, each head has dimension 32. With 64 heads, each has dimension 16. Total attention memory is roughly n² × d_model, independent of head count, because head_dim × num_heads = d_model."
  },
  {
    scenario: "A machine learning engineer profiles their transformer and finds that attention uses 8GB while the feed-forward network uses only 1GB during a forward pass with 8K tokens.",
    question: "Why does attention dominate memory usage at long sequence lengths?",
    options: [
      { id: 'a', label: "The feed-forward network is poorly optimized" },
      { id: 'b', label: "Attention stores n² relationships while feed-forward processes tokens independently (n × d)", correct: true },
      { id: 'c', label: "Feed-forward layers use more efficient data types" },
      { id: 'd', label: "Attention layers have more parameters" }
    ],
    explanation: "Feed-forward layers process each token independently, using O(n × d) memory. Attention must compute and store all pairwise relationships, using O(n²) memory. As sequences get longer, the n² term dominates, making attention the memory bottleneck."
  },
  {
    scenario: "A company develops Flash Attention, which computes exact attention with 10x less memory. They claim it doesn't approximate or lose any information.",
    question: "How can Flash Attention use less memory while computing exact attention?",
    options: [
      { id: 'a', label: "It uses lower precision numbers (INT8 instead of FP16)" },
      { id: 'b', label: "It processes blocks of the attention matrix sequentially, never storing the full n×n matrix", correct: true },
      { id: 'c', label: "It skips attention computation for unimportant tokens" },
      { id: 'd', label: "It stores attention weights on CPU memory instead of GPU" }
    ],
    explanation: "Flash Attention is IO-aware: instead of materializing the full n×n attention matrix in GPU memory (which is slow to access), it computes attention in blocks that fit in fast SRAM cache. It's mathematically identical but processes tiles sequentially, dramatically reducing peak memory."
  },
  {
    scenario: "A researcher experiments with sparse attention, where each token only attends to 256 nearby tokens plus 64 global tokens, regardless of sequence length.",
    question: "How does this sparse attention pattern affect memory scaling?",
    options: [
      { id: 'a', label: "Memory still scales O(n²) but with a smaller constant" },
      { id: 'b', label: "Memory now scales O(n × 320) = O(n), enabling much longer sequences", correct: true },
      { id: 'c', label: "Memory becomes O(log n) due to hierarchical attention" },
      { id: 'd', label: "Memory becomes constant regardless of sequence length" }
    ],
    explanation: "With fixed local window (256) and global tokens (64), each token attends to at most 320 tokens regardless of sequence length. Total memory is O(n × 320) = O(n), not O(n²). This enables processing 100K+ tokens but may miss long-range dependencies the global tokens don't capture."
  },
  {
    scenario: "When training a transformer on 2K-token sequences, batch size is 32. Increasing to 8K-token sequences forces the team to reduce batch size to 2 to fit in GPU memory.",
    question: "Why does longer sequence length require such drastic batch size reduction?",
    options: [
      { id: 'a', label: "Longer sequences need more gradient checkpointing" },
      { id: 'b', label: "Memory for attention scales with batch × n², so 4x length with same batch needs 16x memory", correct: true },
      { id: 'c', label: "Optimizer states grow proportionally with sequence length" },
      { id: 'd', label: "Gradient accumulation becomes less efficient" }
    ],
    explanation: "Attention memory per example is O(n²). With batch_size B and sequence length n, total attention memory is O(B × n²). Going from 2K to 8K (4x) requires 16x more memory per example. To maintain same total memory, batch must drop by 16x (32 → 2)."
  },
  {
    scenario: "An engineer compares KV-cache memory during inference. For a 7B model generating text, the cache uses 500MB at 1K tokens but 8GB at 16K tokens.",
    question: "Why does the KV-cache grow linearly with context length during inference?",
    options: [
      { id: 'a', label: "The model weights need to be duplicated for each token" },
      { id: 'b', label: "Each new token's keys and values must be stored for all future tokens to attend to", correct: true },
      { id: 'c', label: "Inference uses higher precision than training" },
      { id: 'd', label: "The KV-cache stores the full attention matrices" }
    ],
    explanation: "During autoregressive generation, we cache the keys (K) and values (V) for all previous tokens so we don't recompute them. Memory is O(n × layers × d_model × 2), which is linear in sequence length. This is separate from the O(n²) attention computation memory."
  },
  {
    scenario: "A team uses gradient checkpointing to train on 16K-token sequences. Training is 30% slower but uses 4x less memory.",
    question: "What tradeoff does gradient checkpointing make to reduce memory?",
    options: [
      { id: 'a', label: "It uses lower precision for backward pass computations" },
      { id: 'b', label: "It discards intermediate activations and recomputes them during backward pass", correct: true },
      { id: 'c', label: "It processes different layers on different GPUs" },
      { id: 'd', label: "It approximates gradients instead of computing exactly" }
    ],
    explanation: "Gradient checkpointing saves memory by not storing all intermediate activations (like attention matrices). During backward pass, it recomputes them from saved 'checkpoints'. This trades 30-40% more compute time for 3-4x less activation memory, enabling longer sequences."
  },
  {
    scenario: "A paper proposes 'Linear Attention' that replaces softmax attention with a kernel function, achieving O(n) memory. However, language modeling quality drops by 5%.",
    question: "What fundamental capability does linear attention sacrifice?",
    options: [
      { id: 'a', label: "The ability to process multiple sequences in a batch" },
      { id: 'b', label: "The ability to compute exact pairwise token interactions; approximations lose fine-grained context", correct: true },
      { id: 'c', label: "The ability to use pre-trained weights" },
      { id: 'd', label: "The ability to generate text autoregressively" }
    ],
    explanation: "Standard attention computes exact softmax over all n² pairs, allowing precise focus on specific tokens. Linear attention approximates this with kernel features, avoiding the n×n matrix. While O(n) memory, it can't represent arbitrary attention patterns as precisely, hurting tasks requiring exact long-range retrieval."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📚',
    title: 'Long Document Understanding',
    short: 'Processing entire books and codebases',
    tagline: 'When context is measured in chapters, not paragraphs',
    description: 'Legal documents, research papers, and codebases often span hundreds of pages. Understanding them requires models that can hold entire documents in context, connecting references across thousands of paragraphs.',
    connection: 'A 300-page legal document has ~150K tokens. Standard attention would need 22.5 billion attention weights per layer. Memory-efficient techniques like Flash Attention and sparse patterns make this tractable.',
    howItWorks: 'Models like Claude, GPT-4, and Gemini use hierarchical attention, sliding windows, and memory-efficient kernels to process 100K+ tokens. They trade some long-range precision for dramatic memory savings.',
    stats: [
      { value: '200K+', label: 'Token context windows', icon: '📖' },
      { value: '100x', label: 'Memory reduction with Flash Attention', icon: '💾' },
      { value: '95%', label: 'Quality retention vs full attention', icon: '✨' }
    ],
    examples: ['Contract analysis', 'Codebase Q&A', 'Research synthesis', 'Book summarization'],
    companies: ['Anthropic', 'OpenAI', 'Google DeepMind', 'Cohere'],
    futureImpact: 'Future models may maintain million-token contexts, enabling AI assistants that remember your entire work history.',
    color: '#8B5CF6'
  },
  {
    icon: '🎬',
    title: 'Video Understanding',
    short: 'Hours of video in a single model call',
    tagline: 'Every frame tells part of the story',
    description: 'Video transformers process sequences of image patches from multiple frames. A 1-hour video at 1 FPS with 256 patches per frame creates 921K tokens—pushing attention memory to the extreme.',
    connection: 'Video attention matrices grow as (frames × patches)². For 3,600 frames × 256 patches, that\'s 850 billion attention weights. Without memory-efficient attention, this would require 1.7TB per layer.',
    howItWorks: 'Video models use factorized attention (spatial within frames, temporal across frames), sparse patterns, and aggressive frame sampling. Flash Attention enables processing 10x longer videos in the same memory.',
    stats: [
      { value: '1M+', label: 'Tokens in hour-long video', icon: '🎞️' },
      { value: '10x', label: 'Video length increase with FlashAttn', icon: '⚡' },
      { value: '60%', label: 'Compute saved with factorized attention', icon: '🔧' }
    ],
    examples: ['Movie summarization', 'Sports analysis', 'Surveillance review', 'Tutorial understanding'],
    companies: ['Google', 'Meta', 'Runway', 'Twelve Labs'],
    futureImpact: 'Real-time video understanding will enable AI directors, automated sports commentary, and continuous life-logging assistants.',
    color: '#EC4899'
  },
  {
    icon: '🧬',
    title: 'Genomic Sequence Analysis',
    short: 'DNA sequences with billions of base pairs',
    tagline: 'Finding patterns across the human genome',
    description: 'The human genome has 3 billion base pairs. Understanding gene regulation requires attention over extremely long sequences to find distant regulatory elements that affect gene expression.',
    connection: 'Even processing 100K base pairs requires 10 billion attention computations per layer. Full genome analysis at single-nucleotide resolution is computationally prohibitive without sparse or hierarchical attention.',
    howItWorks: 'Genomic transformers use multi-scale attention (local for nearby bases, sparse for distant interactions) and learned attention patterns based on biological priors like chromatin structure.',
    stats: [
      { value: '3B', label: 'Base pairs in human genome', icon: '🧬' },
      { value: '100K', label: 'Typical sequence window', icon: '📊' },
      { value: '1000x', label: 'Range increase with sparse attention', icon: '🔬' }
    ],
    examples: ['Variant effect prediction', 'Gene expression modeling', 'Protein structure', 'Drug target discovery'],
    companies: ['DeepMind', 'Insilico Medicine', 'Recursion', 'Genentech'],
    futureImpact: 'Full-genome attention could enable personalized medicine based on your complete genetic context.',
    color: '#10B981'
  },
  {
    icon: '💬',
    title: 'Conversational AI Memory',
    short: 'Remembering months of conversation history',
    tagline: 'An AI that truly knows your context',
    description: 'Ideal AI assistants would remember all past conversations—potentially millions of tokens spanning months. This requires both efficient attention for processing and smart retrieval for accessing relevant history.',
    connection: 'A year of daily conversations might be 10M tokens. Standard attention would need 100 trillion weights per layer—impossible. Long-term memory requires hierarchical storage with retrieval-augmented generation.',
    howItWorks: 'Production systems combine limited working context (200K tokens) with vector databases for long-term memory. The model retrieves relevant past conversations rather than attending to everything directly.',
    stats: [
      { value: '200K', label: 'Active context tokens', icon: '🧠' },
      { value: '10M+', label: 'Retrievable memory tokens', icon: '💾' },
      { value: '100ms', label: 'Memory retrieval latency', icon: '⚡' }
    ],
    examples: ['Personal AI assistants', 'Customer support continuity', 'Healthcare history', 'Educational tutoring'],
    companies: ['Anthropic', 'OpenAI', 'Inflection AI', 'Character.AI'],
    futureImpact: 'AI companions with perfect memory of your preferences, projects, and conversations will transform personal productivity.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AttentionMemoryRenderer: React.FC<AttentionMemoryRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [sequenceLength, setSequenceLength] = useState(512);
  const [numHeads, setNumHeads] = useState(8);
  const [embeddingDim, setEmbeddingDim] = useState(512);
  const [useFlashAttention, setUseFlashAttention] = useState(false);
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
    accent: '#8B5CF6', // Purple for AI/attention theme
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
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
    twist_play: 'Multi-Head Lab',
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

  // Calculate memory usage
  const calculateMemory = useCallback(() => {
    // Attention matrix size: n^2 per head, but head_dim = embedding_dim / num_heads
    // Total attention memory: n^2 * num_heads * (head_dim) for Q, K, V projections
    // Simplified: attention scores are n^2, and we have num_heads of them
    const n = sequenceLength;
    const attentionMatrixSize = n * n; // entries per head
    const totalAttentionEntries = attentionMatrixSize * numHeads;

    // Memory in bytes (assuming FP16 = 2 bytes)
    const bytesPerEntry = 2;
    const attentionMemoryBytes = totalAttentionEntries * bytesPerEntry;

    // KV cache memory: 2 * n * embedding_dim * num_layers (assume 12 layers)
    const numLayers = 12;
    const kvCacheBytes = 2 * n * embeddingDim * numLayers * bytesPerEntry;

    // Flash Attention reduces peak memory by ~10x by not materializing full attention matrix
    const flashReduction = useFlashAttention ? 0.1 : 1;
    const peakAttentionMemory = attentionMemoryBytes * flashReduction;

    return {
      attentionMemoryMB: (peakAttentionMemory / (1024 * 1024)),
      kvCacheMB: (kvCacheBytes / (1024 * 1024)),
      totalMB: ((peakAttentionMemory + kvCacheBytes) / (1024 * 1024)),
      attentionEntries: totalAttentionEntries,
      scalingFactor: n * n, // O(n^2)
    };
  }, [sequenceLength, numHeads, embeddingDim, useFlashAttention]);

  const memory = calculateMemory();

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
  };

  // Attention Matrix Visualization Component
  const AttentionMatrixVisualization = ({ size = 300, showAnimation = true }: { size?: number; showAnimation?: boolean }) => {
    const gridSize = Math.min(sequenceLength, 32); // Cap visual grid at 32x32
    const cellSize = size / gridSize;
    const actualRatio = sequenceLength / gridSize;

    // Generate attention pattern (simplified - diagonal dominant with some random attention)
    const getAttentionValue = (i: number, j: number) => {
      const distance = Math.abs(i - j);
      const baseAttention = Math.exp(-distance * 0.3);
      // Add some "interesting" attention patterns
      const globalToken = (i === 0 || j === 0) ? 0.5 : 0;
      const periodicAttention = Math.sin((i + j) * 0.5 + animationFrame * 0.05) * 0.2 + 0.2;
      return Math.min(1, baseAttention + globalToken + (showAnimation ? periodicAttention : 0.2));
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={size + 60} height={size + 60} style={{ background: colors.bgCard, borderRadius: '12px' }}>
          {/* Axis labels */}
          <text x={size / 2 + 30} y={20} fill={colors.textSecondary} fontSize="12" textAnchor="middle">
            Keys (tokens to attend to)
          </text>
          <text x={15} y={size / 2 + 30} fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${size / 2 + 30})`}>
            Queries (tokens)
          </text>

          {/* Grid */}
          <g transform="translate(30, 30)">
            {Array.from({ length: gridSize }).map((_, i) => (
              Array.from({ length: gridSize }).map((_, j) => {
                const value = getAttentionValue(i, j);
                const intensity = Math.floor(value * 255);
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={j * cellSize}
                    y={i * cellSize}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    fill={`rgb(${intensity * 0.55}, ${intensity * 0.36}, ${intensity})`}
                    style={{ transition: 'fill 0.1s' }}
                  />
                );
              })
            ))}

            {/* Grid border */}
            <rect x={0} y={0} width={size} height={size} fill="none" stroke={colors.border} strokeWidth="2" />
          </g>

          {/* Scale indicator */}
          {actualRatio > 1 && (
            <text x={size / 2 + 30} y={size + 50} fill={colors.textMuted} fontSize="10" textAnchor="middle">
              Showing {gridSize}x{gridSize} of {sequenceLength}x{sequenceLength} matrix
            </text>
          )}
        </svg>

        {/* Memory indicator */}
        <div style={{
          marginTop: '12px',
          padding: '8px 16px',
          background: colors.bgSecondary,
          borderRadius: '8px',
          display: 'inline-block',
        }}>
          <span style={{ ...typo.small, color: colors.textMuted }}>Matrix size: </span>
          <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
            {sequenceLength.toLocaleString()} x {sequenceLength.toLocaleString()} = {(sequenceLength * sequenceLength).toLocaleString()} entries
          </span>
        </div>
      </div>
    );
  };

  // Memory Growth Chart
  const MemoryGrowthChart = () => {
    const width = isMobile ? 320 : 450;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate data points for O(n^2) and O(n) scaling
    const maxSeq = 4096;
    const dataPoints: { n: number; quadratic: number; linear: number }[] = [];
    for (let n = 256; n <= maxSeq; n += 256) {
      dataPoints.push({
        n,
        quadratic: (n * n) / (maxSeq * maxSeq), // Normalize to 0-1
        linear: n / maxSeq
      });
    }

    const currentPoint = {
      n: sequenceLength,
      quadratic: (sequenceLength * sequenceLength) / (maxSeq * maxSeq),
      linear: sequenceLength / maxSeq
    };

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={frac}
            x1={padding.left}
            y1={padding.top + (1 - frac) * plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + (1 - frac) * plotHeight}
            stroke={colors.border}
            strokeDasharray="3,3"
          />
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Sequence Length</text>
        <text x={12} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform={`rotate(-90, 12, ${padding.top + plotHeight / 2})`}>Memory</text>

        {/* Linear scaling line (O(n)) - dashed */}
        <path
          d={dataPoints.map((pt, i) =>
            `${i === 0 ? 'M' : 'L'} ${padding.left + (pt.n / maxSeq) * plotWidth} ${padding.top + (1 - pt.linear) * plotHeight}`
          ).join(' ')}
          fill="none"
          stroke={colors.success}
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Quadratic scaling line (O(n^2)) */}
        <path
          d={dataPoints.map((pt, i) =>
            `${i === 0 ? 'M' : 'L'} ${padding.left + (pt.n / maxSeq) * plotWidth} ${padding.top + (1 - pt.quadratic) * plotHeight}`
          ).join(' ')}
          fill="none"
          stroke={colors.error}
          strokeWidth="3"
        />

        {/* Current position marker */}
        <circle
          cx={padding.left + (currentPoint.n / maxSeq) * plotWidth}
          cy={padding.top + (1 - currentPoint.quadratic) * plotHeight}
          r="8"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
        />

        {/* Legend */}
        <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
          <rect x="0" y="0" width="15" height="3" fill={colors.error} />
          <text x="20" y="4" fill={colors.textSecondary} fontSize="10">O(n^2) Attention</text>
          <rect x="0" y="14" width="15" height="3" fill={colors.success} strokeDasharray="3,3" />
          <text x="20" y="18" fill={colors.textSecondary} fontSize="10">O(n) Linear</text>
        </g>
      </svg>
    );
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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🧠
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Attention Memory Scaling
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why can't AI models just remember everything? The answer lies in <span style={{ color: colors.accent }}>quadratic memory</span>—and it's why your context window has limits."
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
            "When sequence length doubles, attention memory doesn't just double—it quadruples. This O(n^2) scaling is the fundamental bottleneck of transformers."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Attention Is All You Need (Vaswani et al., 2017)
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore the Memory Wall →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Memory doubles with sequence length—straightforward linear scaling' },
      { id: 'b', text: 'Memory quadruples when length doubles—each token must attend to all others' },
      { id: 'c', text: 'Memory stays constant—only the weights need to be stored' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            A transformer processes 1,000 tokens using 100MB for attention. If you double to 2,000 tokens, how much memory does attention need?
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
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                <p style={{ ...typo.small, color: colors.textSecondary }}>1,000 tokens</p>
                <p style={{ ...typo.small, color: colors.accent }}>100MB</p>
              </div>
              <div style={{ fontSize: '32px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                <p style={{ ...typo.small, color: colors.textSecondary }}>2,000 tokens</p>
                <p style={{ ...typo.small, color: colors.warning }}>???</p>
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
              See How Memory Actually Grows →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Attention Matrix
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Watch Attention Memory Explode
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust sequence length and watch the attention matrix—and memory usage—grow
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <AttentionMatrixVisualization size={isMobile ? 250 : 300} />
            </div>

            {/* Sequence length slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Sequence Length</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{sequenceLength.toLocaleString()} tokens</span>
              </div>
              <input
                type="range"
                min="128"
                max="4096"
                step="128"
                value={sequenceLength}
                onChange={(e) => setSequenceLength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((sequenceLength - 128) / (4096 - 128)) * 100}%, ${colors.border} ${((sequenceLength - 128) / (4096 - 128)) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>128</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>4096</span>
              </div>
            </div>

            {/* Memory stats */}
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
                <div style={{ ...typo.h3, color: colors.error }}>{memory.attentionMemoryMB.toFixed(1)}MB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Attention Memory</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{(sequenceLength * sequenceLength / 1000000).toFixed(2)}M</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Matrix Entries</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: sequenceLength > 2048 ? colors.error : sequenceLength > 1024 ? colors.warning : colors.success
                }}>
                  O(n^2)
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Scaling</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {sequenceLength >= 2048 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how doubling from 1024 to 2048 tokens quadrupled the matrix size!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Math →
          </button>
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Attention Scales Quadratically
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MemoryGrowthChart />
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Self-attention computes: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The <span style={{ color: colors.error }}>QK^T term</span> creates an n×n matrix where every token "looks at" every other token.
              </p>
              <p style={{ marginBottom: '16px' }}>
                With <span style={{ color: colors.accent }}>n tokens</span>, we compute n^2 attention scores.
              </p>
              <p>
                Double the tokens? <span style={{ color: colors.error, fontWeight: 600 }}>Quadruple the memory.</span> This is why context windows have limits.
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
              At 100K tokens, the attention matrix has 10 billion entries. At 1M tokens, it has 1 trillion entries. This is why "just add more context" isn't simple—memory grows explosively.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Multi-Head Attention →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Memory multiplies by number of heads—8 heads = 8x memory' },
      { id: 'b', text: 'Memory stays similar—heads divide the embedding dimension, trading width for count' },
      { id: 'c', text: 'Memory decreases—heads process in parallel, sharing memory' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
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
              New Variable: Multi-Head Attention
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            GPT-4 uses 96 attention heads. How does adding more heads affect memory usage?
          </h2>

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
              Experiment with Multi-Head →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const headDim = embeddingDim / numHeads;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Multi-Head Attention Memory
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust heads and embedding dimension to see how memory changes
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Sliders */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Sequence Length</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{sequenceLength} tokens</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={sequenceLength}
                onChange={(e) => setSequenceLength(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Number of Heads</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{numHeads} heads</span>
              </div>
              <input
                type="range"
                min="1"
                max="32"
                step="1"
                value={numHeads}
                onChange={(e) => setNumHeads(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Embedding Dimension</span>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{embeddingDim}</span>
              </div>
              <input
                type="range"
                min="256"
                max="2048"
                step="256"
                value={embeddingDim}
                onChange={(e) => setEmbeddingDim(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Flash Attention toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '12px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Standard Attention</span>
              <button
                onClick={() => setUseFlashAttention(!useFlashAttention)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: useFlashAttention ? colors.success : colors.border,
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
                  left: useFlashAttention ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: useFlashAttention ? colors.success : colors.textSecondary, fontWeight: useFlashAttention ? 600 : 400 }}>
                Flash Attention
              </span>
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{headDim}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Head Dimension</div>
                <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>(d_model / heads)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: useFlashAttention ? colors.success : colors.error }}>
                  {memory.attentionMemoryMB.toFixed(1)}MB
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Attention Memory</div>
                {useFlashAttention && <div style={{ ...typo.small, color: colors.success, fontSize: '10px' }}>10x reduction!</div>}
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{memory.kvCacheMB.toFixed(1)}MB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>KV Cache</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{memory.totalMB.toFixed(1)}MB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Total Memory</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Memory-Efficient Techniques →
          </button>
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Breaking the Quadratic Barrier
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Flash Attention</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <span style={{ color: colors.success }}>Exact attention</span>, but never materializes the full n×n matrix. Processes in tiles that fit in fast GPU SRAM cache. <span style={{ color: colors.success }}>10x memory reduction</span> with no accuracy loss.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🪟</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Sliding Window Attention</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Each token only attends to nearby tokens (e.g., 4K window). Memory becomes <span style={{ color: colors.success }}>O(n × window_size)</span> = O(n). Trades long-range precision for linear scaling.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🗜️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>KV-Cache Compression</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                During generation, compress old keys/values or evict less important tokens. Enables <span style={{ color: colors.success }}>much longer contexts</span> at inference time with minor quality trade-offs.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Linear Attention (Research)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Replace softmax with kernel functions for true <span style={{ color: colors.success }}>O(n) memory</span>. Still an active research area—current methods trade 5-10% quality for linear scaling.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Impact →
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

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                Memory Challenge:
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

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🧠' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Attention Memory Scaling!'
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
          Attention Memory Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why attention memory scales quadratically and how modern techniques overcome this fundamental challenge.
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
              'O(n^2) attention memory scaling',
              'Why context windows have limits',
              'Multi-head attention memory breakdown',
              'Flash Attention and sparse patterns',
              'Real-world applications from documents to DNA',
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

export default AttentionMemoryRenderer;
