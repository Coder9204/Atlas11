'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Batching vs Latency - Complete 10-Phase Game
// Understanding the tradeoff between throughput and response time in ML inference
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

interface BatchingLatencyRendererProps {
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
    scenario: "A chatbot API processes requests one at a time. Users report fast responses (50ms), but during peak hours, the GPU utilization drops to only 15%, and the system can't handle the load.",
    question: "What is causing the low GPU utilization despite high demand?",
    options: [
      { id: 'a', label: "The GPU is overheating and throttling performance" },
      { id: 'b', label: "Processing single requests doesn't fully utilize GPU parallel processing capability", correct: true },
      { id: 'c', label: "Network latency is the bottleneck, not GPU speed" },
      { id: 'd', label: "The model is too small for the GPU" }
    ],
    explanation: "GPUs excel at parallel processing. When handling one request at a time, most of the GPU's parallel cores sit idle. Batching multiple requests together allows the GPU to process them simultaneously, dramatically improving utilization and throughput."
  },
  {
    scenario: "An ML team switches from batch size 1 to batch size 32. GPU utilization jumps from 15% to 85%, but average latency increases from 50ms to 400ms.",
    question: "Why did latency increase despite better GPU utilization?",
    options: [
      { id: 'a', label: "Larger batches cause memory fragmentation" },
      { id: 'b', label: "The first requests in a batch must wait for the batch to fill before processing begins", correct: true },
      { id: 'c', label: "The GPU is now overloaded" },
      { id: 'd', label: "Batch processing uses a slower algorithm" }
    ],
    explanation: "With batching, early-arriving requests must wait in a queue until the batch is full (or a timeout occurs). This 'queuing delay' adds to total latency. The tradeoff is higher throughput at the cost of individual request latency."
  },
  {
    scenario: "A real-time fraud detection system has a strict 100ms SLA. The ML team wants to improve throughput but finds that batch size 16 causes 120ms p99 latency.",
    question: "What strategy could maintain the SLA while still improving throughput?",
    options: [
      { id: 'a', label: "Use dynamic batching with a maximum wait time of 50ms", correct: true },
      { id: 'b', label: "Use batch size 64 to process more requests at once" },
      { id: 'c', label: "Remove the SLA requirement" },
      { id: 'd', label: "Process fraud checks asynchronously" }
    ],
    explanation: "Dynamic batching with a timeout allows the system to process smaller batches when traffic is low (maintaining low latency) and larger batches during high traffic (improving throughput), while never exceeding the maximum wait time that would violate the SLA."
  },
  {
    scenario: "According to Little's Law: L = λW (queue length = arrival rate × wait time). A system receives 100 requests/second and each request waits 200ms on average.",
    question: "How many requests are in the queue on average?",
    options: [
      { id: 'a', label: "5 requests" },
      { id: 'b', label: "20 requests", correct: true },
      { id: 'c', label: "50 requests" },
      { id: 'd', label: "200 requests" }
    ],
    explanation: "Using Little's Law: L = λW = 100 requests/sec × 0.2 sec = 20 requests. This fundamental queuing theory result helps engineers understand the relationship between arrival rate, latency, and queue depth in batching systems."
  },
  {
    scenario: "An image classification service uses batch size 8. At 3 AM, only 2 requests arrive per second. Many requests experience 3-4 second latencies waiting for the batch to fill.",
    question: "What mechanism would solve this low-traffic latency problem?",
    options: [
      { id: 'a', label: "Increase batch size to accumulate more requests" },
      { id: 'b', label: "A batch timeout that processes partial batches after a maximum wait", correct: true },
      { id: 'c', label: "Disable the service during off-peak hours" },
      { id: 'd', label: "Use a faster GPU" }
    ],
    explanation: "A batch timeout ensures that even if a batch isn't full, it will be processed after a maximum wait time. This prevents indefinite waiting during low-traffic periods while still allowing efficient batching during high-traffic times."
  },
  {
    scenario: "A translation API uses an encoder-decoder transformer. The team notices that input sequences of varying lengths in the same batch cause significant padding waste.",
    question: "What technique minimizes this padding overhead in batched inference?",
    options: [
      { id: 'a', label: "Use a fixed sequence length for all inputs" },
      { id: 'b', label: "Bucket inputs by similar length before batching", correct: true },
      { id: 'c', label: "Process only maximum-length sequences" },
      { id: 'd', label: "Disable batching for transformers" }
    ],
    explanation: "Length bucketing groups inputs of similar lengths together, minimizing padding. For example, short sentences are batched together, and long sentences are batched together. This improves GPU efficiency by reducing wasted computation on padding tokens."
  },
  {
    scenario: "A serving system uses continuous batching (iteration-level batching) for an LLM. Unlike traditional batching, new requests can join mid-generation.",
    question: "What is the primary advantage of continuous batching over static batching for LLMs?",
    options: [
      { id: 'a', label: "It uses less GPU memory" },
      { id: 'b', label: "Sequences completing early free up slots for new requests, improving overall throughput", correct: true },
      { id: 'c', label: "It produces higher quality outputs" },
      { id: 'd', label: "It eliminates the need for a request queue" }
    ],
    explanation: "In static batching, all sequences must complete before new ones start. With continuous batching, when a sequence finishes generating, a new request immediately takes its slot. This keeps the GPU busy and significantly improves throughput, especially for variable-length outputs."
  },
  {
    scenario: "An ML platform sees these metrics: p50 latency = 80ms, p99 latency = 450ms. The team suspects batching is causing the tail latency.",
    question: "Why does batching cause such high p99 latency compared to p50?",
    options: [
      { id: 'a', label: "1% of GPU cores are faulty" },
      { id: 'b', label: "Requests arriving just after a batch dispatches must wait for an entire new batch cycle", correct: true },
      { id: 'c', label: "99th percentile requests have larger inputs" },
      { id: 'd', label: "The model is non-deterministic" }
    ],
    explanation: "The worst-case scenario is a request arriving just after a batch starts processing. It must wait for the current batch to complete, then wait for enough new requests to fill the next batch. This creates high tail latency even though average latency is reasonable."
  },
  {
    scenario: "A recommendation system serves 10,000 requests/second. The team debates between GPU inference (supports batching, higher latency) and CPU inference (no batching, lower latency per request).",
    question: "Under what condition would GPU with batching be more cost-effective?",
    options: [
      { id: 'a', label: "When request volume is consistently high and latency requirements are relaxed", correct: true },
      { id: 'b', label: "When each request requires sub-10ms latency" },
      { id: 'c', label: "When traffic is highly variable" },
      { id: 'd', label: "When the model is very small" }
    ],
    explanation: "GPUs shine with high throughput requirements and relaxed latency constraints. Batching amortizes the GPU's fixed costs across many requests. For strict latency requirements or low/variable traffic, CPUs may be more cost-effective despite lower per-request efficiency."
  },
  {
    scenario: "A voice assistant has a 300ms end-to-end latency budget. The audio processing takes 50ms, and network round-trip is 80ms. The team must allocate the remaining budget for ML inference.",
    question: "What is the maximum batch wait time the team can use without violating the latency budget?",
    options: [
      { id: 'a', label: "300ms" },
      { id: 'b', label: "170ms" },
      { id: 'c', label: "Less than 170ms to leave room for inference computation", correct: true },
      { id: 'd', label: "80ms" }
    ],
    explanation: "Budget remaining = 300ms - 50ms - 80ms = 170ms. But this must cover BOTH batch wait time AND model inference time. If inference takes 50ms, the maximum batch wait is about 120ms. Always leave headroom for actual computation, not just queuing."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🤖',
    title: 'LLM Chat Inference',
    short: 'Serving conversational AI at scale',
    tagline: 'Making ChatGPT fast for millions',
    description: 'Large Language Models like GPT and Claude serve millions of concurrent users. Dynamic batching and continuous batching are essential to keep GPU utilization high while maintaining acceptable response times for interactive conversations.',
    connection: 'Chat applications need low latency for natural conversations but high throughput for cost efficiency. Continuous batching allows new prompts to join ongoing generation, maximizing GPU utilization while keeping first-token latency low.',
    howItWorks: 'Requests enter a queue and are grouped by compatible parameters. Continuous batching (vLLM, TensorRT-LLM) processes at the token level, inserting new sequences as others complete. KV-cache sharing reduces memory overhead across batched sequences.',
    stats: [
      { value: '10x', label: 'Throughput with batching', icon: '🚀' },
      { value: '<1s', label: 'First token latency goal', icon: '⚡' },
      { value: '80%+', label: 'Target GPU utilization', icon: '📊' }
    ],
    examples: ['ChatGPT serving infrastructure', 'Claude API batching', 'Llama inference servers', 'Hugging Face TGI'],
    companies: ['OpenAI', 'Anthropic', 'Meta', 'Hugging Face'],
    futureImpact: 'Speculative decoding and advanced scheduling will push throughput even higher while maintaining sub-second latency for real-time applications.',
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Real-Time Game AI',
    short: 'NPCs that think in milliseconds',
    tagline: 'Intelligence at 60 FPS',
    description: 'Modern games use ML for NPC behavior, physics prediction, and content generation. These systems must deliver results within a single frame (16ms at 60 FPS) while processing hundreds of game entities simultaneously.',
    connection: 'Games naturally batch AI requests for all NPCs in a scene. The challenge is balancing batch size against the strict frame-time budget. Dynamic batching based on scene complexity keeps frame rates smooth.',
    howItWorks: 'Entity states are gathered each frame and batched for inference. Priority queues ensure player-facing NPCs get processed first. Level-of-detail reduces inference complexity for distant entities.',
    stats: [
      { value: '16ms', label: 'Max frame budget', icon: '🎯' },
      { value: '100+', label: 'NPCs per batch', icon: '🤖' },
      { value: '60 FPS', label: 'Target frame rate', icon: '🖥️' }
    ],
    examples: ['Enemy AI pathfinding', 'Physics simulation ML', 'Procedural animation', 'Dynamic difficulty'],
    companies: ['NVIDIA', 'Unity', 'Epic Games', 'EA'],
    futureImpact: 'On-device inference with specialized NPUs will enable more sophisticated game AI while maintaining strict latency requirements.',
    color: '#8B5CF6'
  },
  {
    icon: '🏦',
    title: 'Financial Trading ML',
    short: 'Microseconds matter for markets',
    tagline: 'Where latency equals money',
    description: 'High-frequency trading systems use ML for price prediction, risk assessment, and order routing. Latency requirements are extreme—microseconds, not milliseconds—often making batching impractical.',
    connection: 'Trading ML often sacrifices throughput for minimal latency. Each microsecond of delay can cost millions. Systems may use specialized hardware (FPGAs) instead of GPUs to avoid batching overhead entirely.',
    howItWorks: 'Predictions are made on streaming market data with ultra-low latency. Model architectures are simplified to reduce inference time. Batching is typically only used for end-of-day analytics, not live trading.',
    stats: [
      { value: '<1ms', label: 'Inference latency', icon: '⚡' },
      { value: '$M+', label: 'Cost per ms delay', icon: '💰' },
      { value: '1', label: 'Typical batch size', icon: '📊' }
    ],
    examples: ['Price prediction models', 'Risk scoring systems', 'Order routing ML', 'Fraud detection'],
    companies: ['Jane Street', 'Two Sigma', 'Citadel', 'Renaissance'],
    futureImpact: 'Custom silicon for ML inference will continue to push latency lower, potentially enabling micro-batching even in ultra-low-latency scenarios.',
    color: '#F59E0B'
  },
  {
    icon: '🚗',
    title: 'Autonomous Vehicle Perception',
    short: 'Seeing the road in real-time',
    tagline: 'Safety-critical ML at the edge',
    description: 'Self-driving cars run multiple ML models (object detection, lane tracking, prediction) that must process sensor data in real-time. Batching across cameras and time steps maximizes throughput within strict latency budgets.',
    connection: 'AV systems batch across multiple cameras and sensor types. A single inference pass processes 8+ camera views simultaneously. Temporal batching also processes consecutive frames together for temporal consistency.',
    howItWorks: 'Sensor data from cameras, LiDAR, and radar is synchronized and batched. Spatial batching combines multiple camera views. Temporal batching includes recent frames for motion understanding. All within 50-100ms total cycle time.',
    stats: [
      { value: '50ms', label: 'Perception cycle time', icon: '⏱️' },
      { value: '8+', label: 'Camera views batched', icon: '📷' },
      { value: '99.99%', label: 'Required reliability', icon: '✅' }
    ],
    examples: ['Multi-camera object detection', 'LiDAR point cloud processing', 'Trajectory prediction', 'Scene understanding'],
    companies: ['Waymo', 'Tesla', 'Cruise', 'Mobileye'],
    futureImpact: 'Custom automotive AI chips will enable higher throughput with guaranteed latency, supporting more sophisticated perception models.',
    color: '#3B82F6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BatchingLatencyRenderer: React.FC<BatchingLatencyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [batchSize, setBatchSize] = useState(4);
  const [requestRate, setRequestRate] = useState(20); // requests per second
  const [processingTime, setProcessingTime] = useState(50); // ms per batch
  const [batchTimeout, setBatchTimeout] = useState(100); // max wait time ms
  const [dynamicBatching, setDynamicBatching] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Queue simulation state
  const [queue, setQueue] = useState<{ id: number; arrivedAt: number }[]>([]);
  const [processing, setProcessing] = useState<{ id: number; arrivedAt: number }[]>([]);
  const [completed, setCompleted] = useState<{ id: number; latency: number }[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const nextRequestId = useRef(0);
  const lastProcessingStart = useRef(0);

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
    accent: '#6366F1', // Indigo for ML/tech theme
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Bright enough for contrast (brightness >= 180)
    textMuted: 'rgba(226, 232, 240, 0.7)', // Using rgba for muted colors
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
    twist_play: 'Explore Dynamic',
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

  // Calculate metrics
  const calculateMetrics = useCallback(() => {
    // Throughput: how many requests can be processed per second
    // With batching: batch_size / (processing_time / 1000) = requests per second capacity
    const throughput = (batchSize / (processingTime / 1000));

    // Average latency: queue wait + processing time
    // Queue wait depends on batch size and arrival rate
    const avgBatchFormTime = dynamicBatching
      ? Math.min(batchSize / requestRate * 1000, batchTimeout)
      : (batchSize / requestRate) * 1000;
    const avgLatency = avgBatchFormTime / 2 + processingTime;

    // GPU utilization: depends on how well we can keep the GPU busy
    // At batch size 1, utilization is low; at higher batch sizes, better utilization
    const baseUtilization = Math.min(100, 15 + (batchSize - 1) * 10);
    const trafficFactor = Math.min(1, requestRate / (throughput * 0.8));
    const gpuUtilization = baseUtilization * trafficFactor;

    // Queue depth using Little's Law: L = lambda * W
    const queueDepth = requestRate * (avgLatency / 1000);

    return { throughput, avgLatency, gpuUtilization, queueDepth };
  }, [batchSize, requestRate, processingTime, dynamicBatching, batchTimeout]);

  const metrics = calculateMetrics();

  // Simulation logic
  useEffect(() => {
    if (!isSimulationRunning || phase !== 'play') return;

    // Add new requests at the request rate
    const requestInterval = setInterval(() => {
      const now = Date.now();
      setQueue(q => [...q, { id: nextRequestId.current++, arrivedAt: now }]);
    }, 1000 / requestRate);

    // Process batches
    const processInterval = setInterval(() => {
      const now = Date.now();

      setQueue(q => {
        if (q.length === 0) return q;

        const canProcess = q.length >= batchSize ||
          (dynamicBatching && q.length > 0 && (now - q[0].arrivedAt) >= batchTimeout);

        if (canProcess && now - lastProcessingStart.current >= processingTime) {
          const batchToProcess = q.slice(0, Math.min(batchSize, q.length));
          const remaining = q.slice(batchToProcess.length);

          setProcessing(batchToProcess);
          lastProcessingStart.current = now;

          setTimeout(() => {
            const completedBatch = batchToProcess.map(req => ({
              id: req.id,
              latency: Date.now() - req.arrivedAt
            }));
            setCompleted(c => [...c.slice(-20), ...completedBatch]);
            setProcessing([]);
          }, processingTime);

          return remaining;
        }

        return q;
      });
    }, 20);

    return () => {
      clearInterval(requestInterval);
      clearInterval(processInterval);
    };
  }, [isSimulationRunning, phase, requestRate, batchSize, processingTime, dynamicBatching, batchTimeout]);

  // Reset simulation when parameters change
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      setQueue([]);
      setProcessing([]);
      setCompleted([]);
      nextRequestId.current = 0;
      lastProcessingStart.current = 0;
    }
  }, [batchSize, requestRate, processingTime, dynamicBatching, batchTimeout, phase]);

  // Batching Visualization render function (NOT a component - prevents remounting)
  const renderBatchingVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 200 : 250;

    const queueWidth = 120;
    const gpuWidth = 150;
    const completedWidth = 100;

    const requestSize = 12;
    const maxVisibleRequests = 8;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          {/* Gradients for premium visual quality */}
          <linearGradient id="queueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.warning} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="gpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.bgSecondary} />
            <stop offset="100%" stopColor={colors.bgPrimary} />
          </linearGradient>
          {/* Filter for depth/shadow effect */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
          </marker>
          <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.success} />
          </marker>
        </defs>

        {/* Background group */}
        <g className="background-layer">
          <rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" rx="12" />
        </g>

        {/* Queue area group */}
        <g className="queue-layer" filter="url(#dropShadow)">
          <rect x="20" y="40" width={queueWidth} height={height - 80} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x={20 + queueWidth / 2} y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Request Queue</text>

          {/* Queue requests */}
          {queue.slice(0, maxVisibleRequests).map((req, i) => (
            <rect
              key={req.id}
              x={30 + (i % 4) * (requestSize + 4)}
              y={50 + Math.floor(i / 4) * (requestSize + 4)}
              width={requestSize}
              height={requestSize}
              rx="2"
              fill="url(#queueGradient)"
              opacity={0.8 + (Math.sin(animationFrame * 0.1 + i) * 0.2)}
            />
          ))}
          {queue.length > maxVisibleRequests && (
            <text x="80" y={height - 50} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              +{queue.length - maxVisibleRequests} more
            </text>
          )}
        </g>

        {/* Arrow from queue to GPU */}
        <g className="arrow-layer">
          <path d={`M ${20 + queueWidth + 10} ${height / 2} L ${20 + queueWidth + 40} ${height / 2}`} stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)" />
        </g>

        {/* GPU Processing area group */}
        <g className="gpu-layer" filter="url(#dropShadow)">
          <rect x={20 + queueWidth + 50} y="40" width={gpuWidth} height={height - 80} rx="8" fill={colors.bgSecondary} stroke={processing.length > 0 ? colors.success : colors.border} strokeWidth={processing.length > 0 ? "2" : "1"} />
          <text x={20 + queueWidth + 50 + gpuWidth / 2} y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">GPU Batch Processing</text>

          {/* Processing requests */}
          {processing.map((req, i) => (
            <rect
              key={req.id}
              x={20 + queueWidth + 60 + (i % 4) * (requestSize + 8)}
              y={60 + Math.floor(i / 4) * (requestSize + 8)}
              width={requestSize + 4}
              height={requestSize + 4}
              rx="3"
              fill="url(#gpuGradient)"
              style={{
                animation: 'pulse 0.5s infinite',
                transformOrigin: 'center'
              }}
            />
          ))}
          {processing.length === 0 && (
            <text x={20 + queueWidth + 50 + gpuWidth / 2} y={height / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              Waiting for batch...
            </text>
          )}
        </g>

        {/* Arrow from GPU to completed */}
        <g className="arrow-layer-2">
          <path d={`M ${20 + queueWidth + 50 + gpuWidth + 10} ${height / 2} L ${20 + queueWidth + 50 + gpuWidth + 40} ${height / 2}`} stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead2)" />
        </g>

        {/* Completed area group */}
        <g className="completed-layer" filter="url(#dropShadow)">
          <rect x={width - completedWidth - 20} y="40" width={completedWidth} height={height - 80} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x={width - completedWidth / 2 - 20} y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Completed</text>

          {/* Completed count */}
          <text x={width - completedWidth / 2 - 20} y={height / 2} fill={colors.success} fontSize="24" fontWeight="bold" textAnchor="middle">
            {completed.length}
          </text>
          <text x={width - completedWidth / 2 - 20} y={height / 2 + 20} fill={colors.textMuted} fontSize="11" textAnchor="middle">
            requests
          </text>
        </g>

        {/* Utilization indicator bar - color changes from blue to green/red based on batch size */}
        <rect
          x="20"
          y={height - 42}
          width={Math.min(1, batchSize / 32) * (width - 40)}
          height="6"
          rx="3"
          fill={batchSize <= 4 ? '#3B82F6' : batchSize <= 10 ? '#10B981' : '#EF4444'}
        />

        {/* Grid lines for visual reference */}
        <line x1="20" y1={height * 0.25} x2={width - 20} y2={height * 0.25} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1={height * 0.5} x2={width - 20} y2={height * 0.5} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1={height * 0.75} x2={width - 20} y2={height * 0.75} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

        {/* Axis labels */}
        <text x={25} y={height - 3} fill={colors.textSecondary} fontSize="11" textAnchor="start">Time (processing rate)</text>
        <text x={10} y={60} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, 10, 60)`}>Throughput (rate)</text>

        {/* Info layer with formula */}
        <g className="info-layer">
          <text x={width / 2} y={height - 28} fill={colors.accent} fontSize="11" textAnchor="middle">
            Batch: {batchSize} | Rate: {requestRate} req/s | Throughput = BatchSize {'\u00D7'} (1/T) = {metrics.throughput.toFixed(0)} req/s
          </text>
        </g>
      </svg>
    );
  };

  // Latency vs Throughput Chart render function (NOT a component - prevents remounting)
  const renderLatencyThroughputChart = () => {
    const width = isMobile ? 320 : 400;
    const height = isMobile ? 180 : 220;
    const padding = { top: 30, right: 40, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate data points for different batch sizes
    const dataPoints = [];
    for (let bs = 1; bs <= 32; bs *= 2) {
      const tp = (bs / (processingTime / 1000));
      const lat = (bs / requestRate) * 500 + processingTime;
      dataPoints.push({ batchSize: bs, throughput: tp, latency: lat });
    }

    const maxThroughput = Math.max(...dataPoints.map(d => d.throughput));
    const maxLatency = Math.max(...dataPoints.map(d => d.latency));

    // Current operating point
    const currentTp = metrics.throughput;
    const currentLat = metrics.avgLatency;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <g key={`grid-${frac}`}>
            <line
              x1={padding.left}
              y1={padding.top + frac * plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + frac * plotHeight}
              stroke="#334155"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Throughput (req/s)</text>
        <text x={15} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}>Latency (ms)</text>

        {/* Tradeoff curve */}
        <path
          d={dataPoints.map((pt, i) => {
            const x = padding.left + (pt.throughput / maxThroughput) * plotWidth;
            const y = padding.top + plotHeight - (pt.latency / maxLatency) * plotHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Data points */}
        {dataPoints.map((pt, i) => {
          const x = padding.left + (pt.throughput / maxThroughput) * plotWidth;
          const y = padding.top + plotHeight - (pt.latency / maxLatency) * plotHeight;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill={colors.bgCard} stroke={colors.accent} strokeWidth="2" />
              <text x={x} y={y - 12} fill={colors.textMuted} fontSize="11" textAnchor="middle">b={pt.batchSize}</text>
            </g>
          );
        })}

        {/* Current operating point */}
        <circle
          cx={padding.left + (currentTp / maxThroughput) * plotWidth}
          cy={padding.top + plotHeight - (currentLat / maxLatency) * plotHeight}
          r="8"
          fill={colors.success}
          stroke="white"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }}
        />
        <text
          x={padding.left + (currentTp / maxThroughput) * plotWidth + 12}
          y={padding.top + plotHeight - (currentLat / maxLatency) * plotHeight - 5}
          fill={colors.success}
          fontSize="11"
          fontWeight="600"
        >
          Current
        </text>

        {/* Legend */}
        <g transform={`translate(${padding.left + 10}, ${padding.top + 5})`}>
          <text fill={colors.textMuted} fontSize="11">Higher is better (Throughput)</text>
          <text y="14" fill={colors.textMuted} fontSize="11">Lower is better (Latency)</text>
        </g>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '40px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 999,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Common slider style for all range inputs
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
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

  // Fixed navigation bar at top
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      padding: '8px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            style={{
              width: phase === p ? '20px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minHeight: '8px',
            }}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
          />
        ))}
      </div>
    </nav>
  );

  // Fixed footer with navigation buttons
  const renderFooter = (prevLabel?: string, nextLabel?: string, onNext?: () => void, showPrev: boolean = true) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {showPrev && phaseOrder.indexOf(phase) > 0 ? (
        <button
          onClick={() => goToPhase(phaseOrder[phaseOrder.indexOf(phase) - 1])}
          style={{
            background: 'transparent',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          {'\u2190'} {prevLabel || 'Back'}
        </button>
      ) : <div />}
      {onNext && nextLabel && (
        <button
          onClick={onNext}
          style={{
            ...primaryButtonStyle,
            minHeight: '44px',
          }}
        >
          {nextLabel} {'\u2192'}
        </button>
      )}
    </div>
  );

  // Scrollable content wrapper render function (NOT a component - prevents remounting)
  const renderScrollableContent = (children: React.ReactNode, paddingTop: string = '60px') => (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop,
        paddingBottom: '100px',
      }}>
        {children}
      </div>
    </div>
  );

  // Static batching visualization render function (NOT a component - prevents remounting)
  const renderStaticBatchingVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 200 : 250;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* Queue area */}
        <rect x="20" y="40" width="120" height={height - 80} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
        <text x="80" y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Request Queue</text>

        {/* Sample requests in queue */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x={30 + (i % 4) * 16}
            y={50 + Math.floor(i / 4) * 16}
            width="12"
            height="12"
            rx="2"
            fill={colors.warning}
            opacity="0.8"
          />
        ))}

        {/* Arrow */}
        <path d="M 150 125 L 200 125" stroke={colors.accent} strokeWidth="2" markerEnd="url(#staticArrow)" />
        <defs>
          <marker id="staticArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
          </marker>
        </defs>

        {/* GPU area */}
        <rect x="210" y="40" width="150" height={height - 80} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
        <text x="285" y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">GPU Processing</text>
        <text x="285" y={height / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle">Batch Size = ?</text>

        {/* Completed area */}
        <rect x={width - 100} y="40" width="80" height={height - 80} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
        <text x={width - 60} y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Done</text>
        <text x={width - 60} y={height / 2} fill={colors.success} fontSize="20" fontWeight="bold" textAnchor="middle">?</text>

        {/* Labels */}
        <text x={width / 2} y={height - 15} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          How does batch size affect latency?
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            minHeight: 'calc(100vh - 160px)',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 2s infinite',
            }}>
              <span role="img" aria-label="batch">📦</span><span role="img" aria-label="clock">⏱️</span>
            </div>
            <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Batching vs Latency
            </h1>

            <p style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              marginBottom: '32px',
            }}>
              Why do ML services sometimes feel instant and other times take seconds? The answer lies in <span style={{ color: colors.accent }}>batching</span>—a tradeoff that powers every AI system at scale.
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
                You can have it fast, or you can have it cheap—but batching lets you find the sweet spot in between.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                — ML Infrastructure Wisdom
              </p>
            </div>
          </div>
        )}
        {renderFooter(undefined, 'Start Exploring', () => { playSound('click'); nextPhase(); }, false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Latency stays the same—batching only affects throughput' },
      { id: 'b', text: 'Latency increases because requests wait in a queue for the batch to fill' },
      { id: 'c', text: 'Latency decreases because GPUs are more efficient with batches' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step 1 of 3: Make Your Prediction
              </span>
            </div>

            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                What to Watch: Observe how batch size affects the time each request must wait before processing
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              An ML service switches from processing one request at a time to batching 8 requests together. What happens to individual request latency?
            </h2>

            {/* Static visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              {renderStaticBatchingVisualization()}
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
          </div>
        )}
        {renderFooter('Back', prediction ? 'See What Happens' : undefined, prediction ? () => { playSound('success'); nextPhase(); } : undefined)}
      </div>
    );
  }

  // PLAY PHASE - Interactive Batching Simulation
  if (phase === 'play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Batching Simulation
            </h2>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                What to Watch: Observe how increasing batch size affects both throughput (good) and latency (tradeoff). Try sliding the batch size to see the effect.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px', margin: '8px 0 0 0' }}>
                <strong>Throughput</strong> = BatchSize {'\u00D7'} (1/ProcessingTime) measures requests processed per second. <strong>Latency</strong> is the measure of time from request arrival to response. This is important for real-world ML systems that need to balance cost efficiency with user experience.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderBatchingVisualization()}
              </div>

              {/* Batch size slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Batch Size (request rate)</span>
                  <span data-testid="batch-size-value" style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{batchSize} requests</span>
                </div>
                <div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    onInput={(e) => setBatchSize(parseInt((e.target as HTMLInputElement).value))}
                    aria-label="Batch Size"
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>1 (low)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>16 (high)</span>
                  </div>
                </div>
              </div>

              {/* Request rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Rate (acceleration period)</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{requestRate} req/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={requestRate}
                  onChange={(e) => setRequestRate(parseInt(e.target.value))}
                  onInput={(e) => setRequestRate(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Request Rate"
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>5 (slow)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>100 (fast)</span>
                </div>
              </div>

              {/* Processing time slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Processing Time (latency period)</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{processingTime} ms</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={processingTime}
                  onChange={(e) => setProcessingTime(parseInt(e.target.value))}
                  onInput={(e) => setProcessingTime(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Processing Time"
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>20 (low)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>200 (high)</span>
                </div>
              </div>

              {/* Simulation controls */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => setIsSimulationRunning(!isSimulationRunning)}
                  style={{
                    background: isSimulationRunning ? colors.error : colors.success,
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
                </button>
              </div>

              {/* Metrics display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{metrics.throughput.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max Throughput</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>(req/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: metrics.avgLatency > 500 ? colors.error : metrics.avgLatency > 200 ? colors.warning : colors.success }}>
                    {metrics.avgLatency.toFixed(0)}ms
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Avg Latency</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: metrics.gpuUtilization > 70 ? colors.success : metrics.gpuUtilization > 40 ? colors.warning : colors.error
                  }}>
                    {metrics.gpuUtilization.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>GPU Utilization</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{metrics.queueDepth.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Avg Queue Depth</div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {batchSize >= 8 && metrics.gpuUtilization > 60 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Notice how larger batches increase throughput but also increase latency. This is the core tradeoff!
                </p>
              </div>
            )}
          </div>
        )}
        {renderFooter('Back', 'Understand Why', () => { playSound('success'); setIsSimulationRunning(false); nextPhase(); })}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Batching-Latency Tradeoff
            </h2>

            {/* Connection to observation */}
            <div style={{
              background: `${colors.success}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.success}44`,
            }}>
              <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                As you observed in the experiment, larger batches increased latency while improving throughput. Your prediction about batching's effect on latency was {prediction === 'b' ? 'correct!' : 'a learning opportunity!'}
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderLatencyThroughputChart()}
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Why does this tradeoff exist?</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.accent }}>GPUs are parallel processors.</span> They have thousands of cores designed to work on many operations simultaneously. Processing one request uses only a fraction of this capacity.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.accent }}>Batching amortizes overhead.</span> Each GPU operation has fixed costs (memory transfers, kernel launches). Larger batches spread this overhead across more requests.
                </p>
                <p>
                  <span style={{ color: colors.warning }}>But waiting has a cost.</span> To form a batch, early-arriving requests must wait for later ones. This queue time adds directly to latency.
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
                Little's Law
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>L = lambda x W</strong> — The average number of items in a queue equals the arrival rate times the average wait time. This fundamental relationship governs all batching systems.
              </p>
            </div>
          </div>
        )}
        {renderFooter('Back', 'Explore Dynamic Batching', () => { playSound('success'); nextPhase(); })}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Use the same batch size regardless of traffic—consistency is key' },
      { id: 'b', text: 'Use dynamic batching: small batches when traffic is low, large when high' },
      { id: 'c', text: 'Always use the largest possible batch size for maximum efficiency' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step 2 of 3: New Variable
              </span>
            </div>

            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                What to Watch: Consider how variable traffic patterns affect the optimal batching strategy
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Traffic varies from 10 req/s at night to 500 req/s during peak hours. How should the batching strategy adapt?
            </h2>

            {/* Static visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              {renderStaticBatchingVisualization()}
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
                    minHeight: '44px',
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
          </div>
        )}
        {renderFooter('Back', twistPrediction ? 'Explore Dynamic Batching' : undefined, twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined)}
      </div>
    );
  }

  // TWIST PLAY PHASE - Dynamic Batching
  if (phase === 'twist_play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Dynamic Batching with Timeout
            </h2>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                What to Watch: Enable dynamic batching and adjust the timeout to see how it balances throughput and latency
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderBatchingVisualization()}
              </div>

              {/* Dynamic batching toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Static Batching</span>
                <button
                  onClick={() => setDynamicBatching(!dynamicBatching)}
                  style={{
                    width: '60px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: dynamicBatching ? colors.success : colors.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                    minHeight: '30px',
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: dynamicBatching ? '33px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{ ...typo.small, color: dynamicBatching ? colors.success : colors.textSecondary, fontWeight: dynamicBatching ? 600 : 400 }}>
                  Dynamic Batching
                </span>
              </div>

              {/* Batch timeout slider (only visible when dynamic) */}
              {dynamicBatching && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Max Wait Time (latency period)</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{batchTimeout} ms</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={batchTimeout}
                    onChange={(e) => setBatchTimeout(parseInt(e.target.value))}
                    onInput={(e) => setBatchTimeout(parseInt((e.target as HTMLInputElement).value))}
                    aria-label="Max Wait Time"
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>10 (low)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>500 (high)</span>
                  </div>
                </div>
              )}

              {/* Other sliders */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Max Batch Size (rate)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{batchSize}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="32"
                  step="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  onInput={(e) => setBatchSize(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Max Batch Size"
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>1 (low)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>32 (high)</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Rate (acceleration period)</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{requestRate} req/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={requestRate}
                  onChange={(e) => setRequestRate(parseInt(e.target.value))}
                  onInput={(e) => setRequestRate(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Request Rate"
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>5 (slow)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>200 (fast)</span>
                </div>
              </div>

              {/* Metrics display */}
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
                  <div style={{ ...typo.h3, color: colors.success }}>{metrics.throughput.toFixed(0)} req/s</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max Throughput</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: metrics.avgLatency > 300 ? colors.error : metrics.avgLatency > 150 ? colors.warning : colors.success }}>
                    {metrics.avgLatency.toFixed(0)} ms
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Avg Latency</div>
                </div>
              </div>
            </div>

            {dynamicBatching && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Dynamic batching with timeout ensures requests never wait forever, even during low traffic!
                </p>
              </div>
            )}
          </div>
        )}
        {renderFooter('Back', 'Understand the Strategies', () => { playSound('success'); nextPhase(); })}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Advanced Batching Strategies
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⏱️</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Timeout-Based Batching</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Process batches when full OR when a <span style={{ color: colors.accent }}>maximum wait time</span> expires. This prevents indefinite waiting during low traffic while still achieving efficiency during high traffic.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔄</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Continuous Batching (LLMs)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  For auto-regressive models, <span style={{ color: colors.success }}>new requests can join mid-generation</span>. When a sequence finishes, its slot is immediately filled. This maximizes GPU utilization for variable-length outputs.
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
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Length Bucketing</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Group inputs by similar length before batching to <span style={{ color: colors.warning }}>minimize padding waste</span>. Short sequences are batched together, long sequences together. Reduces wasted computation on padding tokens.
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
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>SLA-Constrained Batching</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When you have a latency SLA (e.g., p99 &lt; 200ms), work backwards: <strong>Max batch wait = SLA - processing time - safety margin</strong>. The SLA constrains your maximum batch size.
                </p>
              </div>
            </div>
          </div>
        )}
        {renderFooter('Back', 'See Real-World Applications', () => { playSound('success'); nextPhase(); })}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
              </span>
            </div>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
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
                    minHeight: '44px',
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
                  Batching Strategy:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
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

              {/* Got It button */}
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  if (selectedApp < realWorldApps.length - 1) {
                    setSelectedApp(selectedApp + 1);
                  }
                }}
                style={{
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: '44px',
                }}
              >
                Got It! {selectedApp < realWorldApps.length - 1 ? 'Next App' : ''}
              </button>
            </div>
          </div>
        )}
        {renderFooter('Back', 'Continue to Take the Knowledge Test', () => { playSound('success'); nextPhase(); })}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {renderNavBar()}
          {renderProgressBar()}
          {renderScrollableContent(
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
              <div style={{
                fontSize: '80px',
                marginBottom: '24px',
              }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed
                  ? 'You\'ve mastered the batching-latency tradeoff!'
                  : 'Review the concepts and try again.'}
              </p>
            </div>
          )}
          {passed ? (
            renderFooter('Back', 'Complete Lesson', () => { playSound('complete'); nextPhase(); })
          ) : (
            renderFooter('Back', 'Review & Try Again', () => {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestScore(0);
              goToPhase('hook');
            })
          )}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                Q{currentQuestion + 1} of 10
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
                    minHeight: '44px',
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
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderScrollableContent(
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            minHeight: 'calc(100vh - 160px)',
          }}>
            <div style={{
              fontSize: '100px',
              marginBottom: '24px',
              animation: 'bounce 1s infinite',
            }}>
              <span role="img" aria-label="trophy">🏆</span>
            </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              Batching Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
              You now understand the fundamental tradeoff between batching and latency that powers every ML system at scale.
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
                  'Why batching increases throughput but adds latency',
                  'Little\'s Law: L = lambda x W for queue analysis',
                  'Dynamic batching with timeouts',
                  'Continuous batching for LLMs',
                  'SLA-constrained batching strategies',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success }}>✓</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default BatchingLatencyRenderer;
