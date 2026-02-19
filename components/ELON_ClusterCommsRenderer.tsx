'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// CLUSTER COMMS - Complete 10-Phase Game (Game #21 of 36 ELON Games)
// GPU cluster networking — how thousands of GPUs communicate during distributed AI training
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

interface Props {
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
    scenario: "A 1024-GPU cluster uses ring all-reduce to synchronize gradients. Each GPU has 40GB of model parameters to sync.",
    question: "Why does ring all-reduce require exactly 2×(N-1)/N of the data to be transferred per GPU?",
    options: [
      { id: 'a', label: "Each GPU sends 1/N of data in N-1 steps (scatter-reduce), then receives in N-1 steps (allgather)", correct: true },
      { id: 'b', label: "Each GPU broadcasts its entire buffer to all others" },
      { id: 'c', label: "Only the master node collects and redistributes" },
      { id: 'd', label: "Data is compressed to 2/N of original size" }
    ],
    explanation: "Ring all-reduce works in two phases: scatter-reduce (N-1 steps sending 1/N chunks) and allgather (N-1 steps). Total data per GPU = 2×(N-1)/N × buffer_size, approaching 2× for large N."
  },
  {
    scenario: "Your training cluster uses a fat-tree topology with 1:4 oversubscription at the core layer.",
    question: "What does 1:4 oversubscription mean for cross-rack communication?",
    options: [
      { id: 'a', label: "Cross-rack bandwidth is 1/4 of intra-rack bandwidth per port", correct: true },
      { id: 'b', label: "Four times more bandwidth is available cross-rack" },
      { id: 'c', label: "Each rack has 4 uplinks" },
      { id: 'd', label: "Latency is 4× higher cross-rack" }
    ],
    explanation: "Oversubscription ratio describes the bandwidth bottleneck. At 1:4, if each server has 100Gbps to the ToR switch, only 25Gbps per server is available for cross-rack traffic. This creates congestion during all-reduce."
  },
  {
    scenario: "NVLink provides 900GB/s bidirectional bandwidth between GPUs in the same node, while InfiniBand provides 400Gb/s between nodes.",
    question: "How does this bandwidth gap affect distributed training strategy?",
    options: [
      { id: 'a', label: "Use hierarchical all-reduce: NVLink within nodes first, then InfiniBand between nodes", correct: true },
      { id: 'b', label: "Always use InfiniBand for consistency" },
      { id: 'c', label: "NVLink is only used for model parallelism" },
      { id: 'd', label: "The gap doesn't matter for training" }
    ],
    explanation: "Hierarchical all-reduce exploits the topology: reduce within a node via fast NVLink (900GB/s), then across nodes via IB (400Gb/s). This minimizes data sent over the slower inter-node links."
  },
  {
    scenario: "During large-scale training, you notice that 5% of nodes consistently finish their gradient computation 30% slower than others.",
    question: "What is the impact of these 'straggler' nodes on all-reduce?",
    options: [
      { id: 'a', label: "All GPUs must wait for the slowest — the straggler determines total iteration time", correct: true },
      { id: 'b', label: "Stragglers are automatically excluded from the reduction" },
      { id: 'c', label: "Other nodes compute extra to compensate" },
      { id: 'd', label: "Stragglers only affect their own local training" }
    ],
    explanation: "All-reduce is a synchronous collective: every GPU must participate. The slowest GPU (tail latency) determines the iteration time. This is why straggler mitigation is critical at scale."
  },
  {
    scenario: "A training job on 256 GPUs shows 60% compute utilization. The rest is communication overhead.",
    question: "What is the most effective way to improve the compute-to-communication ratio?",
    options: [
      { id: 'a', label: "Overlap communication with computation by pipelining gradient transfers", correct: true },
      { id: 'b', label: "Simply add more GPUs to distribute the work" },
      { id: 'c', label: "Reduce the model size" },
      { id: 'd', label: "Use synchronous SGD instead of asynchronous" }
    ],
    explanation: "Communication-computation overlap is key: while layer N+1 computes forward/backward, layer N's gradients can be transferred. This hides communication latency behind computation."
  },
  {
    scenario: "You're designing a 10,000 GPU cluster for training a 1 trillion parameter model.",
    question: "Why is a 3D torus topology sometimes preferred over fat-tree at this scale?",
    options: [
      { id: 'a', label: "3D torus provides more uniform bisection bandwidth and simpler cabling at extreme scale", correct: true },
      { id: 'b', label: "3D torus is always cheaper" },
      { id: 'c', label: "Fat-tree cannot scale beyond 1000 nodes" },
      { id: 'd', label: "3D torus has lower latency for all traffic patterns" }
    ],
    explanation: "At very large scale, fat-tree requires enormous core switches. 3D torus (used by Google TPU pods) provides uniform bandwidth with direct neighbor connections, though it requires topology-aware placement."
  },
  {
    scenario: "Your cluster uses RDMA (Remote Direct Memory Access) over Converged Ethernet (RoCE v2) for GPU-to-GPU communication.",
    question: "What is the primary advantage of RDMA for distributed training?",
    options: [
      { id: 'a', label: "Bypasses the CPU and OS kernel, enabling direct GPU memory transfers with microsecond latency", correct: true },
      { id: 'b', label: "RDMA compresses data automatically" },
      { id: 'c', label: "RDMA provides unlimited bandwidth" },
      { id: 'd', label: "RDMA eliminates the need for switches" }
    ],
    explanation: "RDMA allows GPUs to read/write remote memory without CPU involvement or kernel transitions. This reduces latency from milliseconds to microseconds — critical when doing millions of small transfers per training step."
  },
  {
    scenario: "A model with 175B parameters requires 350GB for gradients (FP16). You have 1000 GPUs with 200Gb/s interconnect each.",
    question: "What is the theoretical minimum all-reduce time for one gradient sync?",
    options: [
      { id: 'a', label: "About 28 seconds — 2×350GB / 25GB/s per GPU", correct: true },
      { id: 'b', label: "Under 1 second" },
      { id: 'c', label: "About 350 seconds" },
      { id: 'd', label: "It depends only on the number of GPUs" }
    ],
    explanation: "Ring all-reduce transfers ~2× the buffer size per GPU. At 200Gb/s = 25GB/s: time = 2×350GB / 25GB/s = 28s. In practice, gradient compression and overlap reduce this significantly."
  },
  {
    scenario: "Your team is choosing between InfiniBand HDR (200Gb/s) and InfiniBand NDR (400Gb/s) for a new AI cluster.",
    question: "Beyond raw bandwidth, what other factor most impacts training performance?",
    options: [
      { id: 'a', label: "Tail latency and congestion management — consistent low latency matters more than peak bandwidth", correct: true },
      { id: 'b', label: "The color of the cables" },
      { id: 'c', label: "Power consumption of the switches" },
      { id: 'd', label: "The brand of the GPU" }
    ],
    explanation: "At scale, congestion and tail latency dominate. Adaptive routing, congestion control (ECN/PFC), and consistent sub-microsecond latency matter more than peak bandwidth — a single congested link can slow the entire job."
  },
  {
    scenario: "A large training run uses gradient compression, reducing communication volume by 100× via TopK sparsification.",
    question: "What is the main tradeoff of aggressive gradient compression?",
    options: [
      { id: 'a', label: "Convergence may slow or become unstable — compressed gradients lose information", correct: true },
      { id: 'b', label: "No tradeoff — compression is always beneficial" },
      { id: 'c', label: "GPUs must be faster to decompress" },
      { id: 'd', label: "It requires more memory per GPU" }
    ],
    explanation: "Gradient compression trades communication bandwidth for convergence quality. TopK keeps only the largest gradients, losing small but potentially important updates. Error feedback helps but doesn't fully compensate."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F5A5}\uFE0F',
    title: 'NVIDIA DGX SuperPOD',
    short: 'The gold standard for enterprise AI supercomputing',
    tagline: 'NVLink + InfiniBand at datacenter scale',
    description: 'NVIDIA DGX SuperPOD combines hundreds of DGX nodes into a unified AI supercomputer. Each node uses NVLink for intra-node GPU communication at 900GB/s, while InfiniBand NDR connects nodes at 400Gb/s. The hierarchical design maximizes bandwidth utilization across the entire fabric.',
    connection: 'Hierarchical all-reduce exploits the NVLink/IB bandwidth gap — reduce locally first via fast NVLink, then sync across nodes via InfiniBand.',
    howItWorks: 'Fat-tree InfiniBand fabric with rail-optimized topology connects DGX nodes. NVSwitch provides full bisection bandwidth within each node.',
    stats: [
      { value: '640', label: 'GPUs per pod', icon: '\u{1F5A5}\uFE0F' },
      { value: 'NVLink+IB', label: 'Dual fabric', icon: '\u{1F517}' },
      { value: '20TB/s', label: 'Aggregate bandwidth', icon: '\u{26A1}' }
    ],
    examples: ['Meta AI Research', 'Microsoft Azure', 'Oracle Cloud', 'CoreWeave'],
    companies: ['NVIDIA', 'Mellanox', 'Quantum', 'Spectrum-X'],
    futureImpact: 'NVLink 5.0 will extend high-bandwidth interconnect across nodes, blurring the intra/inter-node boundary.',
    color: '#76B900'
  },
  {
    icon: '\u{1F535}',
    title: 'Google TPU v4 Pods',
    short: 'Custom silicon with 3D torus interconnect',
    tagline: '4096 chips in a single logical accelerator',
    description: 'Google TPU v4 pods connect 4096 TPU chips in a 3D torus topology using custom Inter-Chip Interconnect (ICI). Unlike fat-tree networks, the torus provides uniform bandwidth to all neighbors, enabling efficient all-reduce without core switch bottlenecks. This powers models like PaLM and Gemini.',
    connection: 'The 3D torus topology eliminates oversubscription — every chip has equal bandwidth to its 6 neighbors, making all-reduce inherently balanced.',
    howItWorks: 'Each TPU connects directly to 6 neighbors in a 3D mesh. Software maps collective operations to minimize hops.',
    stats: [
      { value: '4096', label: 'Chips per pod', icon: '\u{1F535}' },
      { value: '3D torus', label: 'Topology', icon: '\u{1F310}' },
      { value: 'Custom ICI', label: 'Interconnect', icon: '\u{1F50C}' }
    ],
    examples: ['PaLM training', 'Gemini training', 'AlphaFold', 'Google Search'],
    companies: ['Google', 'DeepMind', 'Google Cloud', 'Alphabet'],
    futureImpact: 'TPU v5 and beyond will extend optical interconnect for pod-to-pod communication.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F4F1}',
    title: 'Meta Grand Teton',
    short: 'Purpose-built AI training platform at social media scale',
    tagline: 'RoCE v2 fabric for 16,000+ GPU training',
    description: 'Meta Grand Teton is an open AI hardware platform designed for massive-scale training. Using RoCE v2 (RDMA over Converged Ethernet), it connects 16,000+ GPUs with a focus on cost-effective, high-bandwidth networking. The platform trains models like LLaMA and powers recommendation systems serving billions.',
    connection: 'RoCE v2 provides RDMA capability over standard Ethernet — enabling GPU-direct communication without CPU overhead, at lower cost than InfiniBand.',
    howItWorks: 'Spine-leaf Ethernet fabric with PFC and ECN for lossless RDMA. Rail-optimized topology reduces cross-rail traffic.',
    stats: [
      { value: '16,000', label: 'GPUs connected', icon: '\u{1F4F1}' },
      { value: 'RoCE v2', label: 'Network protocol', icon: '\u{1F310}' },
      { value: 'AI platform', label: 'Open design', icon: '\u{1F527}' }
    ],
    examples: ['LLaMA training', 'Instagram Reels AI', 'WhatsApp features', 'Meta Quest'],
    companies: ['Meta', 'Arista', 'Broadcom', 'OCP'],
    futureImpact: 'Ultra Ethernet Consortium aims to make Ethernet a first-class AI fabric.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F916}',
    title: 'xAI Colossus',
    short: "World's largest GPU cluster for frontier AI",
    tagline: '100K H100s on a custom networking fabric',
    description: "xAI's Colossus cluster connects 100,000 NVIDIA H100 GPUs — the largest single AI training cluster ever built. Custom networking fabric provides full bisection bandwidth at unprecedented scale, enabling training of Grok models. The cluster demonstrates that network topology is the key bottleneck at extreme scale.",
    connection: "At 100K GPU scale, network bisection bandwidth becomes the dominant constraint — Colossus's custom fabric ensures gradients flow without congestion.",
    howItWorks: 'Multi-tier fat-tree with custom scheduling ensures even traffic distribution. Adaptive routing handles hotspots dynamically.',
    stats: [
      { value: '100K', label: 'H100 GPUs', icon: '\u{1F916}' },
      { value: "World's largest", label: 'AI cluster', icon: '\u{1F30D}' },
      { value: 'Custom fabric', label: 'Network design', icon: '\u{1F3D7}\uFE0F' }
    ],
    examples: ['Grok-1 training', 'Grok-2 training', 'xAI research', 'Frontier model development'],
    companies: ['xAI', 'NVIDIA', 'Supermicro', 'Custom integration'],
    futureImpact: 'Will pioneer co-packaged optics and photonic switching for next-generation AI fabrics.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_ClusterCommsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — bisection bandwidth ratio (0.25 = 1:4 oversubscribed, 1.0 = full bisection)
  const [bisectionRatio, setBisectionRatio] = useState(0.5);
  const [gpuCount, setGpuCount] = useState(256);
  const [animTick, setAnimTick] = useState(0);

  // Twist phase — ring vs hierarchical all-reduce
  const [messageSize, setMessageSize] = useState(500); // MB
  const [clusterSize, setClusterSize] = useState(512);

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

  // Animation tick
  useEffect(() => {
    const interval = setInterval(() => setAnimTick(t => (t + 1) % 360), 50);
    return () => clearInterval(interval);
  }, []);

  // Compute cluster metrics
  const computeAllReduceTime = (gpus: number, bwRatio: number, msgMB: number) => {
    const perGpuBandwidthGbps = 200 * bwRatio;
    const perGpuBandwidthGBs = perGpuBandwidthGbps / 8;
    const dataPerGpu = 2 * ((gpus - 1) / gpus) * (msgMB / 1000);
    return dataPerGpu / perGpuBandwidthGBs;
  };

  const computeCommRatio = (gpus: number, bwRatio: number, msgMB: number) => {
    const allReduceTime = computeAllReduceTime(gpus, bwRatio, msgMB);
    const computeTime = 0.5; // assume 500ms compute per step
    return allReduceTime / (allReduceTime + computeTime);
  };

  const computeCongestion = (gpus: number, bwRatio: number) => {
    const load = (gpus / 64) * (1 / bwRatio);
    return Math.min(1, load / 10);
  };

  // Ring all-reduce time
  const ringAllReduceTime = (gpus: number, msgMB: number, bwGBs: number) => {
    const dataPerGpu = 2 * ((gpus - 1) / gpus) * (msgMB / 1000);
    return dataPerGpu / bwGBs;
  };

  // Hierarchical all-reduce time
  const hierarchicalAllReduceTime = (gpus: number, msgMB: number, nvlinkGBs: number, ibGBs: number, gpusPerNode: number) => {
    const nodes = Math.ceil(gpus / gpusPerNode);
    const localData = 2 * ((gpusPerNode - 1) / gpusPerNode) * (msgMB / 1000);
    const localTime = localData / nvlinkGBs;
    const interData = 2 * ((nodes - 1) / nodes) * (msgMB / (1000 * gpusPerNode));
    const interTime = interData / ibGBs;
    return localTime + interTime;
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#22D3EE',
    accentGlow: 'rgba(34, 211, 238, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'cluster-comms',
        gameTitle: 'Cluster Comms',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Current simulation values
  const allReduceTime = computeAllReduceTime(gpuCount, bisectionRatio, 500);
  const commRatio = computeCommRatio(gpuCount, bisectionRatio, 500);
  const congestion = computeCongestion(gpuCount, bisectionRatio);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.cold})`,
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
          data-navigation-dot="true"
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.cold})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Network Topology SVG Visualization (fat-tree with animated data packets)
  // ───────────────────────────────────────────────────────────────────────────
  const NetworkVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const t = animTick;
    const congLevel = congestion;
    const bwNorm = bisectionRatio;

    // Node positions for a simplified fat-tree
    const gpuNodes = Array.from({ length: 8 }, (_, i) => ({
      x: 40 + i * ((width - 80) / 7),
      y: 280,
    }));
    const torSwitches = Array.from({ length: 4 }, (_, i) => ({
      x: 60 + i * ((width - 120) / 3),
      y: 200,
    }));
    const aggSwitches = Array.from({ length: 4 }, (_, i) => ({
      x: 60 + i * ((width - 120) / 3),
      y: 130,
    }));
    const coreSwitches = Array.from({ length: 2 }, (_, i) => ({
      x: width / 2 - 60 + i * 120,
      y: 60,
    }));

    // Link thickness based on bandwidth
    const linkBase = 1 + bwNorm * 3;
    const coreLink = linkBase * bwNorm;

    // Congestion color interpolation
    const linkColor = (level: number) => {
      if (level < 0.3) return '#10B981';
      if (level < 0.6) return '#F59E0B';
      return '#EF4444';
    };

    // Animated packet positions
    const packetPhase = (t % 60) / 60;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="switchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id="coreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="packetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bgFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="linkShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="congestionRadial">
            <stop offset="0%" stopColor={linkColor(congLevel)} stopOpacity="0.4" />
            <stop offset="100%" stopColor={linkColor(congLevel)} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <rect x="0" y="0" width={width} height={height} fill="url(#bgFade)" />
        {[80, 140, 210, 290].map(y => (
          <line key={y} x1="20" y1={y} x2={width - 20} y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,8" />
        ))}

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Fat-Tree Topology — {gpuCount} GPUs — Bisection: {(bisectionRatio * 100).toFixed(0)}%
        </text>

        {/* Layer labels */}
        <text x={15} y={64} fill={colors.textMuted} fontSize="11" fontWeight="400">Core</text>
        <text x={15} y={134} fill={colors.textMuted} fontSize="11" fontWeight="400">Agg</text>
        <text x={15} y={204} fill={colors.textMuted} fontSize="11" fontWeight="400">ToR</text>
        <text x={15} y={270} fill={colors.textMuted} fontSize="11" fontWeight="400">GPU</text>

        {/* Links: GPU to ToR */}
        {gpuNodes.map((gpu, gi) => {
          const tor = torSwitches[Math.floor(gi / 2)];
          return (
            <line key={`gpu-tor-${gi}`} x1={gpu.x} y1={gpu.y - 10} x2={tor.x} y2={tor.y + 10}
              stroke={linkColor(congLevel * 0.3)} strokeWidth={linkBase} opacity="0.6"
              filter="url(#linkShadow)" />
          );
        })}

        {/* Links: ToR to Agg */}
        {torSwitches.map((tor, ti) => (
          aggSwitches.map((agg, ai) => {
            const show = Math.abs(ti - ai) <= 1;
            if (!show) return null;
            return (
              <line key={`tor-agg-${ti}-${ai}`} x1={tor.x} y1={tor.y - 10} x2={agg.x} y2={agg.y + 10}
                stroke={linkColor(congLevel * 0.5)} strokeWidth={linkBase * 0.8} opacity="0.5"
                filter="url(#linkShadow)" />
            );
          })
        ))}

        {/* Links: Agg to Core */}
        {aggSwitches.map((agg, ai) => (
          coreSwitches.map((core, ci) => (
            <line key={`agg-core-${ai}-${ci}`} x1={agg.x} y1={agg.y - 10} x2={core.x} y2={core.y + 10}
              stroke={linkColor(congLevel)} strokeWidth={coreLink} opacity="0.7"
              filter="url(#linkShadow)" />
          ))
        ))}

        {/* Animated data packets during all-reduce */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const phaseOffset = (packetPhase + i * 0.15) % 1;
          const srcGpu = gpuNodes[i % 8];
          const dstTor = torSwitches[Math.floor((i % 8) / 2)];
          const px = srcGpu.x + (dstTor.x - srcGpu.x) * phaseOffset;
          const py = srcGpu.y - 10 + (dstTor.y + 10 - (srcGpu.y - 10)) * phaseOffset;
          return (
            <circle key={`pkt-${i}`} cx={px} cy={py} r={3} fill="#22D3EE"
              filter="url(#packetGlow)" opacity={0.8}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Upward packets (agg to core) */}
        {[0, 1, 2].map(i => {
          const phaseOffset = (packetPhase + i * 0.25 + 0.5) % 1;
          const srcAgg = aggSwitches[i % 4];
          const dstCore = coreSwitches[i % 2];
          const px = srcAgg.x + (dstCore.x - srcAgg.x) * phaseOffset;
          const py = srcAgg.y - 10 + (dstCore.y + 10 - (srcAgg.y - 10)) * phaseOffset;
          return (
            <circle key={`pkt-up-${i}`} cx={px} cy={py} r={3}
              fill={congLevel > 0.6 ? '#EF4444' : '#F59E0B'}
              filter="url(#packetGlow)" opacity={0.8}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Congestion heatspot at core when oversubscribed */}
        {congLevel > 0.4 && (
          <circle cx={width / 2} cy={60} r={20 + congLevel * 30} fill="url(#congestionRadial)" opacity={0.4 + congLevel * 0.3}>
            <animate attributeName="r" values={`${20 + congLevel * 25};${25 + congLevel * 35};${20 + congLevel * 25}`} dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Core switches */}
        {coreSwitches.map((s, i) => (
          <g key={`core-${i}`}>
            <rect x={s.x - 18} y={s.y - 10} width="36" height="20" rx="4" fill="url(#coreGrad)" filter="url(#nodeGlow)" />
            <text x={s.x} y={s.y + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">C{i}</text>
          </g>
        ))}

        {/* Agg switches */}
        {aggSwitches.map((s, i) => (
          <g key={`agg-${i}`}>
            <rect x={s.x - 16} y={s.y - 9} width="32" height="18" rx="3" fill="url(#switchGrad)" filter="url(#nodeGlow)" />
            <text x={s.x} y={s.y + 4} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">A{i}</text>
          </g>
        ))}

        {/* ToR switches */}
        {torSwitches.map((s, i) => (
          <g key={`tor-${i}`}>
            <rect x={s.x - 16} y={s.y - 9} width="32" height="18" rx="3" fill="url(#switchGrad)" opacity="0.8" />
            <text x={s.x} y={s.y + 4} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">T{i}</text>
          </g>
        ))}

        {/* GPU nodes */}
        {gpuNodes.map((g, i) => (
          <g key={`gpu-${i}`}>
            <rect x={g.x - 12} y={g.y - 8} width="24" height="16" rx="3" fill="url(#gpuGrad)" />
            <text x={g.x} y={g.y + 3} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">G{i}</text>
          </g>
        ))}

        {/* Legend */}
        <g>
          <rect x={30} y={height - 40} width="10" height="10" rx="2" fill="url(#gpuGrad)" />
          <text x={44} y={height - 31} fill={colors.textMuted} fontSize="11">GPU</text>
          <rect x={80} y={height - 40} width="10" height="10" rx="2" fill="url(#switchGrad)" />
          <text x={94} y={height - 31} fill={colors.textMuted} fontSize="11">Switch</text>
          <rect x={140} y={height - 40} width="10" height="10" rx="2" fill="url(#coreGrad)" />
          <text x={154} y={height - 31} fill={colors.textMuted} fontSize="11">Core</text>
          <circle cx={210} cy={height - 35} r="3" fill="#22D3EE" />
          <text x={218} y={height - 31} fill={colors.textMuted} fontSize="11">Packet</text>
          <circle cx={270} cy={height - 35} r="6" fill={linkColor(congLevel)} opacity="0.5" />
          <text x={280} y={height - 31} fill={colors.textMuted} fontSize="11">Congestion</text>
        </g>

        {/* Bandwidth indicator */}
        <rect x={width / 2 - 110} y={height - 22} width="220" height="18" rx="4" fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" />
        <text x={width / 2} y={height - 10} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          All-Reduce Time: {allReduceTime.toFixed(2)}s | Comm Rate: {(commRatio * 100).toFixed(0)}% | Congestion: {(congLevel * 100).toFixed(0)}%
        </text>
      </svg>
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Twist Visualization: Ring vs Hierarchical All-Reduce
  // ───────────────────────────────────────────────────────────────────────────
  const TwistVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;

    const ibBandwidthGBs = 50;
    const nvlinkBandwidthGBs = 450;
    const gpusPerNode = 8;

    const ringTime = ringAllReduceTime(clusterSize, messageSize, ibBandwidthGBs);
    const hierTime = hierarchicalAllReduceTime(clusterSize, messageSize, nvlinkBandwidthGBs, ibBandwidthGBs, gpusPerNode);
    const maxTime = Math.max(ringTime, hierTime, 0.001);
    const ringBar = Math.min(1, ringTime / (maxTime * 1.2));
    const hierBar = Math.min(1, hierTime / (maxTime * 1.2));
    const winner = hierTime < ringTime ? 'hierarchical' : 'ring';
    const speedup = ringTime / Math.max(hierTime, 0.0001);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="hierGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,6" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,6" />
        <line x1="30" y1="180" x2={width - 30} y2="180" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,6" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Ring vs Hierarchical All-Reduce — {clusterSize} GPUs, {messageSize}MB
        </text>

        {/* Ring bar */}
        <text x={50} y={60} fill="#60A5FA" fontSize="11" fontWeight="600">Ring All-Reduce</text>
        <rect x={50} y={68} width={(width - 100)} height={20} rx="4" fill={colors.border} />
        <rect x={50} y={68} width={(width - 100) * ringBar} height={20} rx="4" fill="url(#ringGrad)"
          filter={winner === 'ring' ? 'url(#twistGlow)' : undefined} />
        <text x={55 + (width - 100) * ringBar} y={82} fill={colors.textPrimary} fontSize="11" fontWeight="600">
          {ringTime.toFixed(3)}s
        </text>

        {/* Hier bar */}
        <text x={50} y={115} fill="#34D399" fontSize="11" fontWeight="600">Hierarchical All-Reduce</text>
        <rect x={50} y={123} width={(width - 100)} height={20} rx="4" fill={colors.border} />
        <rect x={50} y={123} width={(width - 100) * hierBar} height={20} rx="4" fill="url(#hierGrad)"
          filter={winner === 'hierarchical' ? 'url(#twistGlow)' : undefined} />
        <text x={55 + (width - 100) * hierBar} y={137} fill={colors.textPrimary} fontSize="11" fontWeight="600">
          {hierTime.toFixed(3)}s
        </text>

        {/* Speedup badge */}
        <rect x={width / 2 - 80} y={160} width="160" height="28" rx="6"
          fill={winner === 'hierarchical' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)'}
          stroke={winner === 'hierarchical' ? '#10B981' : '#3B82F6'} strokeWidth="1" />
        <text x={width / 2} y={178} fill={winner === 'hierarchical' ? '#10B981' : '#3B82F6'}
          fontSize="11" fontWeight="700" textAnchor="middle">
          {winner === 'hierarchical' ? 'Hierarchical' : 'Ring'} wins — {speedup.toFixed(1)}x faster
        </text>

        {/* Ring diagram */}
        <g>
          <text x={width / 4} y={210} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="500">Ring Topology</text>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const cx = width / 4;
            const cy = 260;
            const r = 35;
            const nx = cx + Math.cos(angle) * r;
            const ny = cy + Math.sin(angle) * r;
            const nextAngle = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
            const nnx = cx + Math.cos(nextAngle) * r;
            const nny = cy + Math.sin(nextAngle) * r;
            return (
              <g key={`ring-node-${i}`}>
                <line x1={nx} y1={ny} x2={nnx} y2={nny} stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                <circle cx={nx} cy={ny} r={6} fill="#3B82F6" />
                <text x={nx} y={ny + 3} fill="white" fontSize="6" textAnchor="middle">{i}</text>
              </g>
            );
          })}
        </g>

        {/* Hierarchical diagram */}
        <g>
          <text x={3 * width / 4} y={210} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="500">Hierarchical Topology</text>
          {/* Nodes grouped */}
          {[0, 1].map(group => {
            const gx = 3 * width / 4 - 30 + group * 60;
            return (
              <g key={`hier-group-${group}`}>
                <rect x={gx - 22} y={240} width="44" height="40" rx="4" fill="rgba(16,185,129,0.1)" stroke="#10B981" strokeWidth="0.5" strokeDasharray="3,3" />
                {[0, 1, 2, 3].map(n => {
                  const nx = gx - 12 + (n % 2) * 24;
                  const ny = 250 + Math.floor(n / 2) * 18;
                  return <circle key={`h-${group}-${n}`} cx={nx} cy={ny} r={5} fill="#10B981" />;
                })}
              </g>
            );
          })}
          {/* Inter-group link */}
          <line x1={3 * width / 4 - 8} y1={260} x2={3 * width / 4 + 8} y2={260}
            stroke="#F59E0B" strokeWidth="2" />
          <text x={3 * width / 4} y={295} fill={colors.textMuted} fontSize="11" textAnchor="middle">NVLink local, IB cross-node</text>
        </g>

        {/* Formula */}
        <rect x={width / 2 - 130} y={height - 22} width="260" height="18" rx="4" fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" />
        <text x={width / 2} y={height - 10} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Ring: 2(N-1)/N × M/BW | Hier: local_reduce + inter_reduce
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F5A7}\u{1F916}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Cluster Comms
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"How do "}
            <span style={{ color: colors.accent }}>thousands of GPUs</span>
            {" talk to each other during AI training? The network topology determines whether your $100M cluster trains models — or waits on data."}
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              {'"The biggest bottleneck in training frontier AI models isn\'t compute — it\'s communication. Network topology is the silent architect of AI progress."'}
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Distributed Systems Engineering
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Less than 1% — modern GPUs are so fast communication is negligible' },
      { id: 'b', text: '10-20% — communication is noticeable but compute dominates' },
      { id: 'c', text: '30-50% — communication often dominates at scale' },
      { id: 'd', text: '90% — GPUs are mostly idle waiting for data' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              In a 1000-GPU training cluster, what fraction of time is spent on communication vs computation?
            </h2>

            {/* Static SVG showing cluster concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predCompGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22D3EE" />
                    <stop offset="100%" stopColor="#0891B2" />
                  </linearGradient>
                  <linearGradient id="predCommGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">1000-GPU Training Iteration Timeline</text>
                <text x="200" y="55" textAnchor="middle" fill="#22D3EE" fontSize="11">Compute (forward + backward pass)</text>
                <rect x="40" y="62" width="150" height="22" rx="4" fill="url(#predCompGrad)" opacity="0.7" />
                <text x="115" y="78" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Compute</text>
                <text x="200" y="105" textAnchor="middle" fill="#F97316" fontSize="11">Communication (gradient sync)</text>
                <rect x="40" y="112" width="320" height="22" rx="4" fill="url(#predCommGrad)" opacity="0.7" />
                <text x="200" y="128" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">??? of total time</text>
                <text x="200" y="165" textAnchor="middle" fill={colors.textMuted} fontSize="11">How much time is actually spent communicating?</text>
              </svg>
            </div>

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
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Cluster Network Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Cluster Network Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> GPU cluster networking determines how fast AI models train. The bisection bandwidth — total bandwidth between two halves of the network — is the key bottleneck in distributed training.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>All-Reduce</strong> is defined as a collective operation where every GPU shares its gradients with all other GPUs, producing identical summed results everywhere.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Bisection Bandwidth</strong> is the measure of total bandwidth available when the network is cut in half — the fundamental limit on cross-cluster communication.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.hot }}>Oversubscription</strong> refers to providing less uplink bandwidth than downlink, creating potential congestion at higher network layers.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                The all-reduce time is calculated as T = 2(N-1)/N {'\u00D7'} M/BW, where N = GPU count, M = message size, and BW = bandwidth.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a fat-tree network topology. Watch how changing bisection bandwidth affects congestion and all-reduce time. Data packets flow between GPU nodes through switches — observe how they congest at the core when bandwidth is low.
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <NetworkVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Bisection bandwidth slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Network Bisection Bandwidth</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {bisectionRatio <= 0.25 ? '1:4 oversubscribed' : bisectionRatio <= 0.5 ? '1:2 oversubscribed' : bisectionRatio < 1 ? `${(bisectionRatio * 100).toFixed(0)}% bisection` : 'Full bisection'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="1.0"
                      step="0.05"
                      value={bisectionRatio}
                      onChange={(e) => setBisectionRatio(parseFloat(e.target.value))}
                      onInput={(e) => setBisectionRatio(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Network Bisection Bandwidth"
                      style={sliderStyle(colors.accent, bisectionRatio, 0.25, 1.0)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.hot }}>1:4 Oversubscribed</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1:2</span>
                      <span style={{ ...typo.small, color: colors.success }}>Full Bisection</span>
                    </div>
                  </div>

                  {/* GPU count selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>GPU Count</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {gpuCount} GPUs
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[64, 128, 256, 512, 1024, 2048].map(count => (
                        <button
                          key={count}
                          onClick={() => { playSound('click'); setGpuCount(count); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: gpuCount === count ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: gpuCount === count ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{allReduceTime.toFixed(2)}s</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>All-Reduce Time</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: commRatio > 0.4 ? colors.hot : colors.success }}>
                        {(commRatio * 100).toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Comm Ratio</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: congestion > 0.5 ? colors.hot : congestion > 0.3 ? colors.warning : colors.success }}>
                        {(congestion * 100).toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Congestion</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Cluster Communication
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — as you observed in the simulator, communication often consumes 30-50% of training time at scale, sometimes even more with poor network topology.'
                : 'As you observed in the simulator, communication overhead is a major bottleneck. At 1000-GPU scale, 30-50% of iteration time is commonly spent on gradient synchronization — and with poor bisection bandwidth, it can be even worse.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>All-Reduce Time = 2(N-1)/N x M / BW</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because each GPU must exchange <span style={{ color: colors.accent }}>gradients</span> with every other GPU. In ring all-reduce, data travels in a ring: each GPU sends <span style={{ color: colors.success }}>1/N of its buffer</span> per step, taking <span style={{ color: colors.hot }}>2(N-1) steps</span> total.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Example: 1024 GPUs, 1GB gradients, 25GB/s = <strong>~80ms per sync</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Bisection Bandwidth Matters
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                In all-reduce, data must cross between racks. The bisection bandwidth — total bandwidth when the network is split in half — determines the maximum throughput. With 1:4 oversubscription, cross-rack communication is 4x slower, creating congestion at the core switches.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Network Topologies Compared
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Fat-Tree', metric: 'Full bisection', note: 'Expensive core' },
                  { name: '3D Torus', metric: 'Uniform BW', note: 'Topology-aware' },
                  { name: 'Dragonfly', metric: 'Low diameter', note: 'Adaptive routing' },
                  { name: 'Rail-Opt', metric: 'Low cost', note: 'GPU-aware' },
                  { name: 'Spine-Leaf', metric: 'Simple', note: 'Ethernet-based' },
                  { name: 'DGX Mesh', metric: 'NVLink', note: 'Intra-node' },
                ].map(topo => (
                  <div key={topo.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{topo.name}</div>
                    <div style={{ ...typo.small, color: colors.accent }}>{topo.metric}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{topo.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Same performance — both algorithms produce identical results' },
      { id: 'b', text: 'Ring is bandwidth-optimal for large gradients, hierarchical for small messages — must choose by workload' },
      { id: 'c', text: 'Hierarchical always wins because it uses faster NVLink' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Ring vs Hierarchical All-Reduce
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Hierarchical all-reduce vs ring all-reduce — which is better?
            </h2>

            {/* Static SVG showing the two approaches */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twPredRing" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="twPredHier" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                <text x="100" y="20" textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="600">Ring All-Reduce</text>
                {Array.from({ length: 6 }, (_, i) => {
                  const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                  const cx = 100; const cy = 70; const r = 35;
                  return <circle key={i} cx={cx + Math.cos(angle) * r} cy={cy + Math.sin(angle) * r} r={6} fill="#3B82F6" />;
                })}
                <circle cx={100} cy={70} r={35} fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
                <text x="100" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Every GPU in one ring</text>

                <text x="300" y="20" textAnchor="middle" fill="#34D399" fontSize="11" fontWeight="600">Hierarchical All-Reduce</text>
                {[0, 1].map(g => (
                  <g key={g}>
                    <rect x={250 + g * 60} y={38} width="40" height="55" rx="4" fill="rgba(16,185,129,0.1)" stroke="#10B981" strokeWidth="0.5" />
                    {[0, 1, 2].map(n => (
                      <circle key={n} cx={270 + g * 60} cy={50 + n * 16} r={5} fill="#10B981" />
                    ))}
                  </g>
                ))}
                <line x1="290" y1="65" x2="310" y2="65" stroke="#F59E0B" strokeWidth="2" />
                <text x="300" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Local reduce, then cross-node</text>
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
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Comparison
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Ring vs Hierarchical Comparison
  if (phase === 'twist_play') {
    const ibBW = 50;
    const nvBW = 450;
    const gpn = 8;
    const ringT = ringAllReduceTime(clusterSize, messageSize, ibBW);
    const hierT = hierarchicalAllReduceTime(clusterSize, messageSize, nvBW, ibBW, gpn);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              All-Reduce Strategy Comparison
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Adjust message size and cluster scale to see when each strategy wins
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* SVG Visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <TwistVisualization />
                  </div>

                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> Ring all-reduce sends data around a single ring of all GPUs, while hierarchical all-reduce first reduces locally via fast NVLink, then syncs across nodes over InfiniBand.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Increasing the cluster size widens the gap in favor of hierarchical, because local NVLink reduction shrinks the data that must traverse the slower inter-node fabric.</p>
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Message size slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Gradient Message Size</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{messageSize} MB</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2000"
                      step="10"
                      value={messageSize}
                      onChange={(e) => setMessageSize(parseInt(e.target.value))}
                      onInput={(e) => setMessageSize(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Gradient message size"
                      style={sliderStyle(colors.accent, messageSize, 1, 2000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.cold }}>1 MB (small model)</span>
                      <span style={{ ...typo.small, color: colors.hot }}>2000 MB (giant model)</span>
                    </div>
                  </div>

                  {/* Cluster size slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Cluster Size</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{clusterSize} GPUs</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="4096"
                      step="16"
                      value={clusterSize}
                      onChange={(e) => setClusterSize(parseInt(e.target.value))}
                      onInput={(e) => setClusterSize(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Cluster size"
                      style={sliderStyle(colors.accent, clusterSize, 16, 4096)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.cold }}>16 GPUs</span>
                      <span style={{ ...typo.small, color: colors.hot }}>4096 GPUs</span>
                    </div>
                  </div>

                  {/* Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#3B82F6' }}>{ringT.toFixed(3)}s</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Ring All-Reduce</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#10B981' }}>{hierT.toFixed(3)}s</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Hierarchical All-Reduce</div>
                    </div>
                  </div>

                  {/* Insight */}
                  <div style={{
                    background: `${hierT < ringT ? colors.success : colors.cold}22`,
                    border: `1px solid ${hierT < ringT ? colors.success : colors.cold}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      {hierT < ringT
                        ? 'Hierarchical wins here — NVLink handles local reduction, minimizing slow inter-node traffic.'
                        : 'Ring is competitive here — with small clusters or large messages, the ring bandwidth-optimality shines.'}
                    </p>
                    <div style={{
                      ...typo.h3,
                      color: hierT < ringT ? colors.success : colors.cold
                    }}>
                      {hierT < ringT ? 'Hierarchical' : 'Ring'} is {Math.abs(ringT / Math.max(hierT, 0.0001)).toFixed(1)}x {hierT < ringT ? 'faster' : 'the better choice'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Tradeoffs
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              The Hidden Tradeoff: Latency vs Bandwidth
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Ring All-Reduce</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>T = 2(N-1)/N x M / BW</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Bandwidth-optimal: transfers exactly 2M bytes regardless of cluster size. But uses the slowest link (inter-node InfiniBand) for every step, and latency grows linearly with N.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Hierarchical All-Reduce</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>T = T_local(NVLink) + T_inter(IB)</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Exploits the NVLink/IB bandwidth gap. Reduces data locally via fast NVLink (900GB/s), then sends only 1/8th the data over slower InfiniBand. Wins when intra-node bandwidth massively exceeds inter-node.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  There is no universally best all-reduce algorithm. Ring is bandwidth-optimal for large messages on flat networks. Hierarchical exploits hardware topology. Modern systems like NCCL automatically select the best strategy based on message size, GPU count, and network topology.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Network Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      // Auto-advance to next uncompleted app, or to test if all done
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '80px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand GPU cluster networking and distributed training communication!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Cluster Communications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of GPU cluster networking to real-world distributed training scenarios. Consider all-reduce algorithms, network topology, bisection bandwidth, and the interplay between computation and communication as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
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
                  padding: '14px 24px',
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
          {renderNavDots()}
        </NavigationBar>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Cluster Comms Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how GPU clusters communicate, why network topology determines training speed, and how all-reduce algorithms trade off latency versus bandwidth.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'All-reduce: T = 2(N-1)/N x M / BW',
                'Fat-tree bisection bandwidth determines throughput',
                'Ring vs hierarchical all-reduce tradeoffs',
                'NVLink for intra-node, InfiniBand for inter-node',
                'Tail latency and congestion dominate at scale',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_ClusterCommsRenderer;
