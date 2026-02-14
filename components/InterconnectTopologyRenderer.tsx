'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface InterconnectTopologyRendererProps {
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
  twist_play: 'Scale Effects',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  bgSecondary: '#1e293b',
  accent: '#14b8a6',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#334155',
  ring: '#06b6d4',
  tree: '#8b5cf6',
  mesh: '#f97316',
  allreduce: '#22c55e',
  gpu: '#3b82f6',
};

// Topology specs
const TOPOLOGY_SPECS = {
  'Ring': { latency: 'O(N)', bandwidth: 'Optimal', scalability: 'Good for small N', color: colors.ring },
  'Tree': { latency: 'O(log N)', bandwidth: 'Sub-optimal', scalability: 'Good for large N', color: colors.tree },
  'Fat Tree': { latency: 'O(log N)', bandwidth: 'High', scalability: 'Excellent', color: colors.mesh },
  'Full Mesh': { latency: 'O(1)', bandwidth: 'Maximum', scalability: 'Poor (N^2 links)', color: colors.allreduce },
};

// Real-world applications with detailed stats
const realWorldApps = [
  {
    icon: '🤖',
    title: 'AI Training Clusters',
    short: 'Training massive AI models',
    tagline: 'Connecting thousands of GPUs efficiently',
    description: 'Training large language models like GPT-4 requires thousands of GPUs working in parallel. The interconnect topology determines how efficiently gradients can be synchronized across all GPUs during distributed training.',
    connection: 'Ring all-reduce and tree topologies directly apply to gradient synchronization. The bandwidth and latency characteristics we explored determine whether training is compute-bound or communication-bound at scale.',
    howItWorks: 'Modern training clusters use hierarchical topologies: NVLink connects GPUs within a node (full mesh), InfiniBand connects nodes in fat-tree configurations, and software implements ring all-reduce for gradient averaging.',
    stats: [
      { value: '10,000+', label: 'GPUs in cluster', icon: '⚡' },
      { value: '400Gb/s', label: 'InfiniBand speed', icon: '📈' },
      { value: '90%', label: 'Scaling efficiency', icon: '🚀' }
    ],
    examples: ['OpenAI GPT training infrastructure', 'Google TPU pods', 'NVIDIA DGX SuperPOD', 'Meta Research AI clusters'],
    companies: ['NVIDIA', 'Google', 'Microsoft', 'Meta'],
    futureImpact: 'Optical interconnects and photonic computing will enable even higher bandwidth with lower power consumption.',
    color: '#8B5CF6'
  },
  {
    icon: '🌐',
    title: 'Data Center Networks',
    short: 'Internet backbone infrastructure',
    tagline: 'The hidden highways of the cloud',
    description: 'Modern data centers use carefully designed network topologies to handle massive traffic volumes. Fat-tree and Clos architectures provide non-blocking bandwidth between any two servers.',
    connection: 'The scalability trade-offs between mesh, tree, and ring topologies directly apply to data center design. Fat-tree topologies solve the bandwidth bottleneck problem we observed at tree roots.',
    howItWorks: 'Leaf-spine architectures use two layers of switches. Every leaf switch connects to every spine switch, creating multiple paths between any two servers.',
    stats: [
      { value: '100Tb/s', label: 'Bisection BW', icon: '⚡' },
      { value: '500μs', label: 'Latency', icon: '📈' },
      { value: '$180B', label: 'DC market', icon: '🚀' }
    ],
    examples: ['Google global network', 'AWS availability zones', 'Facebook data centers', 'Microsoft Azure regions'],
    companies: ['Arista', 'Cisco', 'Juniper', 'Broadcom'],
    futureImpact: 'Disaggregated computing will separate CPU, memory, and storage resources connected by ultra-fast fabric.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'High-Performance Computing',
    short: 'Scientific supercomputers',
    tagline: 'Simulating the universe one node at a time',
    description: 'Supercomputers for weather prediction, drug discovery, and physics simulations require interconnects that minimize communication overhead. Dragonfly and fat-tree topologies enable thousands of nodes to share data.',
    connection: 'HPC applications like climate modeling require all-to-all communication patterns similar to our topology exercises. The O(log N) vs O(N) latency trade-offs directly impact simulation performance.',
    howItWorks: 'Modern supercomputers use dragonfly topologies with multiple hierarchy levels. Adaptive routing algorithms dynamically select paths to avoid congestion.',
    stats: [
      { value: '1 ExaFlop', label: 'Computing power', icon: '⚡' },
      { value: '50,000+', label: 'Nodes connected', icon: '📈' },
      { value: '$600M', label: 'System cost', icon: '🚀' }
    ],
    examples: ['Frontier at Oak Ridge', 'Fugaku in Japan', 'LUMI in Finland', 'Leonardo in Italy'],
    companies: ['Cray/HPE', 'IBM', 'Fujitsu', 'Intel'],
    futureImpact: 'Quantum networking will eventually connect quantum computers across data centers.',
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Multi-GPU Gaming Systems',
    short: 'Extreme graphics performance',
    tagline: 'Rendering reality in real-time',
    description: 'High-end gaming and professional visualization systems use multiple GPUs connected through NVLink or PCIe. The interconnect determines how efficiently GPUs can share frame rendering work.',
    connection: 'The bandwidth and latency considerations from our topology study apply directly. NVLink provides near-mesh connectivity between GPUs, while PCIe creates a tree through the CPU.',
    howItWorks: 'NVLink bridges connect 2-4 GPUs with up to 900GB/s aggregate bandwidth. Professional applications use GPU memory pooling across the NVLink fabric.',
    stats: [
      { value: '900GB/s', label: 'NVLink BW', icon: '⚡' },
      { value: '4-way', label: 'GPU configs', icon: '📈' },
      { value: '2x', label: 'Performance gain', icon: '🚀' }
    ],
    examples: ['NVIDIA Quadro workstations', 'Gaming enthusiast builds', 'VR development systems', 'Real-time rendering farms'],
    companies: ['NVIDIA', 'AMD', 'ASUS', 'MSI'],
    futureImpact: 'Chiplet-based GPUs will use advanced packaging to integrate multiple GPU dies with ultra-wide interconnects.',
    color: '#F59E0B'
  }
];

// Test questions - 10 scenario-based multiple choice questions
const testQuestions = [
  {
    scenario: "You're designing a distributed training system for 8 GPUs. Each GPU needs to share its gradient data with all other GPUs.",
    question: "Why is a ring topology considered bandwidth-optimal for all-reduce operations?",
    options: [
      { id: 'a', label: "Each GPU sends directly to all others simultaneously" },
      { id: 'b', label: "Each GPU sends/receives exactly (N-1)/N of data, utilizing all links", correct: true },
      { id: 'c', label: "A central switch handles all the routing efficiently" },
      { id: 'd', label: "Ring connections are physically faster than other types" },
    ],
    explanation: "In ring all-reduce, data flows around the ring in chunks. Each GPU sends one chunk while receiving another, perfectly utilizing all available bandwidth. No single bottleneck node exists."
  },
  {
    scenario: "A research team notices their 1000-GPU training job is only 40% efficient compared to a single GPU baseline.",
    question: "What is the most likely cause of this efficiency loss?",
    options: [
      { id: 'a', label: "Power supply limitations across the data center" },
      { id: 'b', label: "Communication overhead from gradient synchronization dominates compute time", correct: true },
      { id: 'c', label: "GPUs are running out of memory" },
      { id: 'd', label: "Thermal throttling from heat buildup" },
    ],
    explanation: "At scale, network topology becomes critical. Poor topology choices lead to communication bottlenecks where GPUs spend more time waiting for gradients than computing."
  },
  {
    scenario: "NVIDIA's DGX SuperPOD uses a fat-tree topology with InfiniBand switches to connect hundreds of GPUs.",
    question: "What key advantage does a fat-tree topology provide over a simple tree?",
    options: [
      { id: 'a', label: "Simpler wiring and fewer switches needed" },
      { id: 'b', label: "Multiple redundant paths prevent bandwidth bottlenecks at higher levels", correct: true },
      { id: 'c', label: "Lower latency due to shorter cable lengths" },
      { id: 'd', label: "Lower cost per connection" },
    ],
    explanation: "Fat-tree topologies have 'fatter' (more) links toward the root, providing multiple paths between any two nodes. This eliminates the bandwidth bottleneck at the root of simple trees."
  },
  {
    scenario: "You need to synchronize gradients across 1024 GPUs. You're comparing ring vs tree topologies for latency.",
    question: "Which topology has lower latency for this operation, and why?",
    options: [
      { id: 'a', label: "Ring - data flows continuously without waiting" },
      { id: 'b', label: "Tree - O(log N) steps vs O(N) for ring", correct: true },
      { id: 'c', label: "Both have the same latency at this scale" },
      { id: 'd', label: "Neither - you need full mesh for low latency" },
    ],
    explanation: "Tree reduction completes in O(log N) = ~10 steps for 1024 nodes, while ring needs O(N) = 1023 steps. However, ring has better bandwidth utilization."
  },
  {
    scenario: "Your startup wants to build a 10,000-GPU cluster for training large language models.",
    question: "Why is full mesh topology impractical at this scale?",
    options: [
      { id: 'a', label: "Full mesh connections are too slow" },
      { id: 'b', label: "Requires N(N-1)/2 = 50 million physical links", correct: true },
      { id: 'c', label: "Network protocols don't support mesh topologies" },
      { id: 'd', label: "Mesh has higher latency than other topologies" },
    ],
    explanation: "Full mesh needs N(N-1)/2 links - for 10,000 GPUs, that's approximately 50 million connections! This is physically and economically impossible."
  },
  {
    scenario: "During distributed training, each GPU computes gradients locally. These must be combined before updating model weights.",
    question: "What does an all-reduce operation accomplish?",
    options: [
      { id: 'a', label: "Sends data from one GPU to all others" },
      { id: 'b', label: "Combines data from all GPUs and distributes the result to all", correct: true },
      { id: 'c', label: "Collects data from all GPUs to a single master" },
      { id: 'd', label: "Divides data from one GPU across all others" },
    ],
    explanation: "All-reduce = reduce + broadcast in one operation. It sums (or averages) gradients from all GPUs and ensures every GPU receives the final result."
  },
  {
    scenario: "NVIDIA's DGX H100 system uses NVSwitch to connect 8 H100 GPUs within a single node.",
    question: "What capability does NVSwitch provide?",
    options: [
      { id: 'a', label: "All-to-all GPU communication at full bandwidth simultaneously", correct: true },
      { id: 'b', label: "Standard PCIe connections with software routing" },
      { id: 'c', label: "High-speed serial communication one pair at a time" },
      { id: 'd', label: "GPU-to-CPU communication bypassing system memory" },
    ],
    explanation: "NVSwitch enables any GPU to communicate with any other GPU at full NVLink bandwidth (900 GB/s on H100) simultaneously. It's essentially a full mesh within the node."
  },
  {
    scenario: "A model has 175 billion parameters (700 GB in fp32). Training batch takes 100ms of compute per GPU across 1000 GPUs.",
    question: "At 100 Gb/s network bandwidth per GPU, approximately how long does gradient synchronization take?",
    options: [
      { id: 'a', label: "~1ms - negligible compared to compute" },
      { id: 'b', label: "~56 seconds - communication dominates", correct: true },
      { id: 'c', label: "~100ms - roughly equal to compute" },
      { id: 'd', label: "Faster than compute due to pipelining" },
    ],
    explanation: "700 GB at 100 Gb/s = 56 seconds for a naive all-reduce! This is why gradient compression, pipelining, and topology optimization are critical."
  },
  {
    scenario: "Modern training systems like Megatron-LM use hierarchical all-reduce: ring within nodes, tree across nodes.",
    question: "Why use different topologies at different scales?",
    options: [
      { id: 'a', label: "Simpler to implement than a single unified topology" },
      { id: 'b', label: "Matches algorithm to physical network characteristics at each level", correct: true },
      { id: 'c', label: "Provides redundancy if one topology fails" },
      { id: 'd', label: "Legacy compatibility with older hardware" },
    ],
    explanation: "Intra-node (NVLink: 900 GB/s) vs inter-node (InfiniBand: 400 Gb/s) have 18x bandwidth difference! Ring maximizes bandwidth within nodes; tree minimizes latency across nodes."
  },
  {
    scenario: "You're comparing two network designs: (A) Single 400 Gb/s link per node, (B) Four 100 Gb/s links per node with adaptive routing.",
    question: "Which design likely achieves better effective bandwidth for all-reduce operations?",
    options: [
      { id: 'a', label: "Design A - single fast link has lower latency" },
      { id: 'b', label: "Design B - multiple paths enable bandwidth aggregation and fault tolerance", correct: true },
      { id: 'c', label: "Same bandwidth, so same performance" },
      { id: 'd', label: "Depends entirely on the switch hardware" },
    ],
    explanation: "Multiple links with adaptive routing can aggregate bandwidth AND provide fault tolerance. If one link fails or is congested, traffic reroutes. This is why fat-tree topologies use multiple paths."
  },
];

const InterconnectTopologyRenderer: React.FC<InterconnectTopologyRendererProps> = ({
  gamePhase,
}) => {
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
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

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
  const [testScore, setTestScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Simulation state
  const [topology, setTopology] = useState<keyof typeof TOPOLOGY_SPECS>('Ring');
  const [numNodes, setNumNodes] = useState(8);
  const [messageSize, setMessageSize] = useState(100); // MB
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showDataFlow, setShowDataFlow] = useState(true);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 200);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Internal navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;
    playSound('transition');

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

  // Calculate metrics
  const spec = TOPOLOGY_SPECS[topology];
  const calculateLatencySteps = () => {
    switch (topology) {
      case 'Ring': return numNodes - 1;
      case 'Tree': return Math.ceil(2 * Math.log2(numNodes));
      case 'Fat Tree': return Math.ceil(2 * Math.log2(numNodes));
      case 'Full Mesh': return 1;
    }
  };

  const calculateBandwidthEfficiency = () => {
    switch (topology) {
      case 'Ring': return 100; // Bandwidth optimal
      case 'Tree': return 50; // Bottleneck at root
      case 'Fat Tree': return 90; // Near optimal with fat links
      case 'Full Mesh': return 100; // Direct paths
    }
  };

  const latencySteps = calculateLatencySteps();
  const bandwidthEfficiency = calculateBandwidthEfficiency();

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0d9488)`,
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

  // Visualization component
  const renderVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 320 : 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = isMobile ? 100 : 120;

    // Generate node positions based on topology
    const getNodePositions = () => {
      const positions: { x: number; y: number }[] = [];
      for (let i = 0; i < numNodes; i++) {
        const angle = (2 * Math.PI * i) / numNodes - Math.PI / 2;
        positions.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
      return positions;
    };

    const nodePositions = getNodePositions();

    // Get connections based on topology
    const getConnections = () => {
      const connections: { from: number; to: number }[] = [];

      switch (topology) {
        case 'Ring':
          for (let i = 0; i < numNodes; i++) {
            connections.push({ from: i, to: (i + 1) % numNodes });
          }
          break;

        case 'Tree':
        case 'Fat Tree':
          for (let i = 0; i < Math.floor(numNodes / 2); i++) {
            if (2 * i + 1 < numNodes) connections.push({ from: i, to: 2 * i + 1 });
            if (2 * i + 2 < numNodes) connections.push({ from: i, to: 2 * i + 2 });
          }
          break;

        case 'Full Mesh':
          for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
              connections.push({ from: i, to: j });
            }
          }
          break;
      }

      return connections;
    };

    const connections = getConnections();
    const animProgress = animationFrame / 200;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ borderRadius: '16px' }}
      >
        <defs>
          <linearGradient id="itopLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="itopGoldTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="itopEmeraldTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="itopSilverTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="itopCopperTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <radialGradient id="itopDataPacket" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="itopDieGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </radialGradient>
          <filter id="itopNodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="itopDataGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="itopGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#itopLabBg)" />
        <rect width={width} height={height} fill="url(#itopGrid)" opacity="0.3" />

        <text x={width / 2} y={32} textAnchor="middle" fill={colors.textPrimary} fontSize={18} fontWeight="bold">
          {topology} Topology
        </text>
        <text x={width / 2} y={52} textAnchor="middle" fill={colors.textSecondary} fontSize={12}>
          {numNodes} GPU Nodes | {connections.length} Interconnects
        </text>

        {/* Connections */}
        {connections.map((conn, i) => {
          const from = nodePositions[conn.from];
          const to = nodePositions[conn.to];
          const isFatTree = topology === 'Fat Tree';
          const isRing = topology === 'Ring';
          const isTree = topology === 'Tree';

          const traceGradient = isRing ? 'url(#itopGoldTrace)' :
                                isFatTree ? 'url(#itopSilverTrace)' :
                                isTree ? 'url(#itopEmeraldTrace)' :
                                'url(#itopCopperTrace)';
          const traceWidth = isFatTree ? 6 : isRing ? 4 : 3;

          return (
            <g key={`conn-${i}`}>
              <line
                x1={from.x}
                y1={from.y + 2}
                x2={to.x}
                y2={to.y + 2}
                stroke="#000"
                strokeWidth={traceWidth + 2}
                opacity={0.3}
                strokeLinecap="round"
              />
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={traceGradient}
                strokeWidth={traceWidth}
                strokeLinecap="round"
              />
              {showDataFlow && (
                <>
                  <circle
                    cx={from.x + (to.x - from.x) * ((animProgress + i * 0.15) % 1)}
                    cy={from.y + (to.y - from.y) * ((animProgress + i * 0.15) % 1)}
                    r={5}
                    fill="url(#itopDataPacket)"
                    filter="url(#itopDataGlow)"
                  />
                  <circle
                    cx={from.x + (to.x - from.x) * ((animProgress + i * 0.15 + 0.5) % 1)}
                    cy={from.y + (to.y - from.y) * ((animProgress + i * 0.15 + 0.5) % 1)}
                    r={4}
                    fill="rgba(163, 230, 53, 0.8)"
                    filter="url(#itopDataGlow)"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* GPU Nodes */}
        {nodePositions.map((pos, i) => {
          const chipSize = isMobile ? 30 : 36;
          const isActive = showDataFlow && (Math.floor(animationFrame / 25) % numNodes === i);

          return (
            <g key={`node-${i}`} filter="url(#itopNodeGlow)">
              <rect
                x={pos.x - chipSize / 2 + 3}
                y={pos.y - chipSize / 2 + 3}
                width={chipSize}
                height={chipSize}
                rx={4}
                fill="rgba(0,0,0,0.4)"
              />
              <rect
                x={pos.x - chipSize / 2}
                y={pos.y - chipSize / 2}
                width={chipSize}
                height={chipSize}
                rx={4}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth={1}
              />
              <rect
                x={pos.x - chipSize / 3}
                y={pos.y - chipSize / 3}
                width={chipSize * 2 / 3}
                height={chipSize * 2 / 3}
                rx={2}
                fill={isActive ? "#22d3ee" : "url(#itopDieGlow)"}
              />
              <text
                x={pos.x}
                y={pos.y + chipSize / 2 + 16}
                textAnchor="middle"
                fill={colors.textSecondary}
                fontSize={10}
                fontWeight="bold"
              >
                GPU {i}
              </text>
              {isActive && (
                <circle cx={pos.x + chipSize / 2 - 4} cy={pos.y - chipSize / 2 + 4} r={3} fill="#22c55e">
                  <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Stats panel */}
        <g transform={`translate(12, ${height - 90})`}>
          <rect x={0} y={0} width={180} height={78} rx={10} fill="rgba(15, 23, 42, 0.95)" stroke="#334155" strokeWidth={1} />
          <text x={12} y={18} fill={spec.color} fontSize={11} fontWeight="bold">NETWORK METRICS</text>
          <line x1={12} y1={24} x2={168} y2={24} stroke="#334155" strokeWidth={1} />
          <text x={12} y={42} fill={colors.textMuted} fontSize={10}>Latency Steps</text>
          <text x={12} y={56} fill={spec.color} fontSize={16} fontWeight="bold">{latencySteps}</text>
          <text x={95} y={42} fill={colors.textMuted} fontSize={10}>Bandwidth Eff.</text>
          <text x={95} y={56} fill={bandwidthEfficiency > 80 ? colors.success : colors.warning} fontSize={16} fontWeight="bold">
            {bandwidthEfficiency}%
          </text>
          <text x={12} y={72} fill={colors.textMuted} fontSize={9}>
            Total Links: {connections.length} | Complexity: {spec.latency}
          </text>
        </g>

        {topology === 'Full Mesh' && numNodes > 8 && (
          <g transform={`translate(${width / 2}, ${height - 8})`}>
            <rect x={-100} y={-14} width={200} height={20} rx={4} fill="rgba(239, 68, 68, 0.2)" />
            <text textAnchor="middle" fill={colors.error} fontSize={11} fontWeight="bold">
              Warning: {(numNodes * (numNodes - 1)) / 2} links needed!
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Controls component
  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Network Topology
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(TOPOLOGY_SPECS) as Array<keyof typeof TOPOLOGY_SPECS>).map(t => (
            <button
              key={t}
              onClick={() => { playSound('click'); setTopology(t); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: topology === t ? `2px solid ${TOPOLOGY_SPECS[t].color}` : '1px solid rgba(255,255,255,0.2)',
                background: topology === t ? `${TOPOLOGY_SPECS[t].color}22` : 'transparent',
                color: TOPOLOGY_SPECS[t].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                minHeight: '44px',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Nodes (GPUs): {numNodes}
        </label>
        <input
          type="range"
          min={4}
          max={16}
          value={numNodes}
          onChange={(e) => setNumNodes(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Message Size: {messageSize} MB
        </label>
        <input
          type="range"
          min={10}
          max={1000}
          step={10}
          value={messageSize}
          onChange={(e) => setMessageSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h4 style={{ color: spec.color, marginTop: 0, marginBottom: '12px' }}>{topology} Properties</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div>
            <div style={{ color: colors.textMuted }}>Latency</div>
            <div style={{ color: colors.textPrimary }}>{spec.latency}</div>
          </div>
          <div>
            <div style={{ color: colors.textMuted }}>Bandwidth</div>
            <div style={{ color: colors.textPrimary }}>{spec.bandwidth}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ color: colors.textMuted }}>Scalability</div>
            <div style={{ color: colors.textPrimary }}>{spec.scalability}</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { playSound('click'); setShowDataFlow(!showDataFlow); }}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: showDataFlow ? colors.accent : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow'}
      </button>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <nav style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        backgroundColor: colors.bgDark,
      }}>
        <button
          onClick={() => currentIdx > 0 && goBack()}
          disabled={currentIdx === 0}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentIdx > 0 ? colors.textSecondary : 'transparent',
            cursor: currentIdx > 0 ? 'pointer' : 'default',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            minHeight: '44px',
            minWidth: '70px',
          }}
        >
          Back
        </button>
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
      </nav>
    );
  };

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
        paddingTop: '70px',
        textAlign: 'center',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌐🔗
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Interconnect Topology
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          How do <span style={{ color: colors.accent }}>thousands of GPUs</span> work together to train massive AI models? The answer lies in how they're connected - and the right topology makes all the difference.
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
            "Training GPT-4 used thousands of GPUs. Every GPU needs to share its gradients with every other GPU. Without the right network topology, GPUs spend more time waiting than computing."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - The Network IS the Computer
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); goNext(); }}
          style={primaryButtonStyle}
        >
          Explore Network Topologies
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // Static visualization for predict phase
  const renderStaticVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 280 : 320;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = isMobile ? 80 : 100;
    const staticNodes = 8;

    const nodePositions: { x: number; y: number }[] = [];
    for (let i = 0; i < staticNodes; i++) {
      const angle = (2 * Math.PI * i) / staticNodes - Math.PI / 2;
      nodePositions.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ borderRadius: '12px' }}
        role="img"
        aria-label="8 GPUs needing to share gradient data"
      >
        <defs>
          <radialGradient id="staticDieGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="#030712" />
        <text x={width / 2} y={28} textAnchor="middle" fill={colors.textPrimary} fontSize={16} fontWeight="bold">
          8 GPUs Need to Share Data
        </text>
        <text x={width / 2} y={48} textAnchor="middle" fill={colors.textSecondary} fontSize={12}>
          How should they communicate?
        </text>
        {nodePositions.map((pos, i) => {
          const chipSize = isMobile ? 28 : 32;
          return (
            <g key={`static-node-${i}`}>
              <rect
                x={pos.x - chipSize / 2}
                y={pos.y - chipSize / 2}
                width={chipSize}
                height={chipSize}
                rx={4}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth={1}
              />
              <rect
                x={pos.x - chipSize / 3}
                y={pos.y - chipSize / 3}
                width={chipSize * 2 / 3}
                height={chipSize * 2 / 3}
                rx={2}
                fill="url(#staticDieGlow)"
              />
              <text
                x={pos.x}
                y={pos.y + chipSize / 2 + 14}
                textAnchor="middle"
                fill={colors.textSecondary}
                fontSize={10}
                fontWeight="bold"
              >
                GPU {i}
              </text>
            </g>
          );
        })}
        <text x={width / 2} y={height - 20} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
          Each GPU has 700MB of gradient data
        </text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'broadcast', text: 'One GPU broadcasts to all others (star topology)' },
      { id: 'sequential', text: 'GPUs pass data one-by-one in a chain' },
      { id: 'ring', text: 'GPUs form a ring and pass partial sums around', correct: true },
      { id: 'random', text: 'GPUs randomly share with neighbors until done' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
      }}>
        {renderProgressBar()}

        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '24px',
          overflowY: 'auto' as const,
        }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Step 1 of 2: Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What's the most efficient way for 8 GPUs to average their gradients?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderStaticVisualization()}
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '16px' }}>
              Each GPU has 700MB of gradient data. They all need to end up with the average of everyone's gradients.
            </p>
            <div style={{ marginTop: '16px', fontSize: '14px', color: colors.accent, fontFamily: 'monospace' }}>
              GPU0: [grad_0] {"--->"} ??? {"--->"} [avg_all]<br/>
              GPU1: [grad_1] {"--->"} ??? {"--->"} [avg_all]<br/>
              ...all GPUs need the same result...
            </div>
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
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: prediction === 'ring' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'ring' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'ring' ? colors.success : colors.warning, fontWeight: 'bold', margin: 0 }}>
                {prediction === 'ring' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                Ring all-reduce is bandwidth-optimal! Each GPU sends and receives exactly (N-1)/N of its data, using all available bandwidth. No single bottleneck node.
              </p>
            </div>
          )}

          {prediction && (
            <button
              onClick={() => { playSound('success'); goNext(); }}
              style={primaryButtonStyle}
            >
              Explore the Lab
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Topology Explorer Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Experiment with different topologies and observe their trade-offs.
          </p>
          <div style={{
            background: `${colors.accent}15`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> When you increase the number of nodes, latency steps grow differently for each topology. As you change from Ring to Tree, notice how the trade-off shifts between bandwidth and latency.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{ color: colors.accent, marginTop: 0, marginBottom: '12px' }}>Key Definitions</h4>
            <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8, fontSize: '14px' }}>
              <li><strong style={{ color: colors.textPrimary }}>Latency</strong> is defined as the time delay for data to travel from source to destination, measured in network hops or steps.</li>
              <li><strong style={{ color: colors.textPrimary }}>Bandwidth Efficiency</strong> is the ratio of actual data throughput to theoretical maximum capacity.</li>
              <li><strong style={{ color: colors.textPrimary }}>Scalability</strong> describes how performance changes as N (number of nodes) increases.</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderVisualization()}
            </div>
            {renderControls()}
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: colors.accent, marginTop: 0, marginBottom: '12px' }}>Key Observations:</h3>
            <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li><strong style={{ color: colors.ring }}>Ring:</strong> Optimal bandwidth, O(N) latency steps</li>
              <li><strong style={{ color: colors.tree }}>Tree:</strong> O(log N) latency but root bottleneck</li>
              <li><strong style={{ color: colors.mesh }}>Fat Tree:</strong> Fast + high bandwidth (used in data centers)</li>
              <li><strong style={{ color: colors.allreduce }}>Full Mesh:</strong> Fastest but O(N^2) links (impractical at scale)</li>
            </ul>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}33`,
          }}>
            <h4 style={{ color: colors.warning, marginTop: 0, marginBottom: '8px' }}>Why This Matters in the Real World</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Data center engineers must choose the right topology when designing GPU clusters for AI training.
              The wrong choice can make training 10x slower or cost millions more in networking equipment.
              This is why understanding topology trade-offs is essential for anyone building large-scale AI systems.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); goNext(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
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
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Network Topologies
          </h2>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {prediction === 'ring'
                ? "Your prediction was correct! Ring all-reduce is indeed the most bandwidth-efficient approach."
                : "As you observed in the experiment, ring all-reduce turned out to be the bandwidth-optimal solution."}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${colors.ring}` }}>
              <h3 style={{ color: colors.ring, marginTop: 0, marginBottom: '8px' }}>Ring All-Reduce</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                Data flows around a ring. Each node sends a chunk while receiving another.
              </p>
              <ul style={{ ...typo.small, color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                <li>Bandwidth-optimal: uses 100% of available links</li>
                <li>Latency: O(N) - grows linearly with nodes</li>
                <li>Used by NCCL for small clusters</li>
              </ul>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${colors.tree}` }}>
              <h3 style={{ color: colors.tree, marginTop: 0, marginBottom: '8px' }}>Tree Reduction</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                Data flows up to root, then broadcasts down. Fast but root becomes a bottleneck.
              </p>
              <ul style={{ ...typo.small, color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                <li>Latency: O(log N) - scales well</li>
                <li>Bandwidth bottleneck at root</li>
                <li>Good for latency-sensitive workloads</li>
              </ul>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${colors.mesh}` }}>
              <h3 style={{ color: colors.mesh, marginTop: 0, marginBottom: '8px' }}>Fat Tree</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                Tree with fatter links toward the root. Multiple paths prevent bottlenecks.
              </p>
              <ul style={{ ...typo.small, color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                <li>Standard topology for InfiniBand data centers</li>
                <li>Non-blocking: full bisection bandwidth</li>
                <li>Best balance of latency and bandwidth</li>
              </ul>
            </div>

            <div style={{ background: `${colors.accent}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.accent}33` }}>
              <h3 style={{ color: colors.accent, marginTop: 0, marginBottom: '8px' }}>Key Insight: Hierarchical All-Reduce</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern systems combine topologies: Ring within a node (NVLink), Tree across nodes (InfiniBand).
                This matches the algorithm to the physical network at each level.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}`, marginTop: '16px' }}>
              <h3 style={{ color: colors.warning, marginTop: 0, marginBottom: '12px' }}>Mathematical Relationships</h3>
              <div style={{ fontFamily: 'monospace', color: colors.textPrimary, fontSize: '14px', lineHeight: 2 }}>
                <p style={{ margin: '8px 0' }}>Ring Latency = O(N) steps</p>
                <p style={{ margin: '8px 0' }}>Tree Latency = O(log N) steps</p>
                <p style={{ margin: '8px 0' }}>Full Mesh Links = N × (N-1) / 2</p>
                <p style={{ margin: '8px 0' }}>Bandwidth Efficiency ∝ 1 / Bottleneck Factor</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); goNext(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'same', text: 'The same topology works best at any scale' },
      { id: 'ring_always', text: "Ring is always best since it's bandwidth-optimal" },
      { id: 'hybrid', text: 'Different scales need different topologies combined', correct: true },
      { id: 'mesh', text: 'Full mesh is the answer at any scale' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              Step 1 of 2: The Twist - Topology Depends on Scale
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            8 GPUs in one machine vs 8000 GPUs across a data center - same approach?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ marginBottom: '16px' }}>
              <defs>
                <linearGradient id="twistGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.success} />
                  <stop offset="100%" stopColor={colors.warning} />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="#030712" rx="8" />
              <text x="100" y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Single Machine</text>
              <text x="300" y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Data Center</text>
              {/* 8 GPUs in ring */}
              {[0,1,2,3,4,5,6,7].map(i => {
                const angle = (2 * Math.PI * i) / 8 - Math.PI / 2;
                const x = 100 + 50 * Math.cos(angle);
                const y = 110 + 50 * Math.sin(angle);
                return <rect key={`small-${i}`} x={x-8} y={y-8} width="16" height="16" rx="2" fill={colors.gpu} />;
              })}
              <circle cx="100" cy="110" r="55" fill="none" stroke={colors.success} strokeWidth="2" strokeDasharray="4,2" />
              <text x="100" y="180" textAnchor="middle" fill={colors.success} fontSize="11">900 GB/s NVLink</text>
              {/* 8000 GPUs in tree */}
              <rect x="260" y="55" width="80" height="20" rx="4" fill={colors.warning} opacity="0.5" />
              <rect x="250" y="90" width="40" height="15" rx="3" fill={colors.warning} opacity="0.4" />
              <rect x="310" y="90" width="40" height="15" rx="3" fill={colors.warning} opacity="0.4" />
              <rect x="240" y="120" width="20" height="12" rx="2" fill={colors.gpu} />
              <rect x="270" y="120" width="20" height="12" rx="2" fill={colors.gpu} />
              <rect x="310" y="120" width="20" height="12" rx="2" fill={colors.gpu} />
              <rect x="340" y="120" width="20" height="12" rx="2" fill={colors.gpu} />
              <line x1="300" y1="75" x2="270" y2="90" stroke={colors.warning} strokeWidth="2" />
              <line x1="300" y1="75" x2="330" y2="90" stroke={colors.warning} strokeWidth="2" />
              <line x1="270" y1="105" x2="250" y2="120" stroke={colors.warning} strokeWidth="1" />
              <line x1="270" y1="105" x2="280" y2="120" stroke={colors.warning} strokeWidth="1" />
              <line x1="330" y1="105" x2="320" y2="120" stroke={colors.warning} strokeWidth="1" />
              <line x1="330" y1="105" x2="350" y2="120" stroke={colors.warning} strokeWidth="1" />
              <text x="300" y="180" textAnchor="middle" fill={colors.warning} fontSize="11">400 Gb/s InfiniBand</text>
            </svg>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>8 GPUs</div>
                <div style={{ color: colors.success, fontWeight: 'bold' }}>NVLink: 900 GB/s</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Within a single machine</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>8000 GPUs</div>
                <div style={{ color: colors.warning, fontWeight: 'bold' }}>InfiniBand: 400 Gb/s</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Across data center</div>
              </div>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
              18x bandwidth difference between intra-node and inter-node!
            </p>
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
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: twistPrediction === 'hybrid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'hybrid' ? colors.success : colors.warning, fontWeight: 'bold', margin: 0 }}>
                {twistPrediction === 'hybrid' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                Modern systems use hierarchical approaches: NVLink ring within a node (900 GB/s),
                InfiniBand tree across nodes (400 Gb/s), different algorithms at each level.
              </p>
            </div>
          )}

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); goNext(); }}
              style={primaryButtonStyle}
            >
              Explore Scale Effects
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>
            Scale-Dependent Topology Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            See how topology choice changes with scale
          </p>
          <div style={{
            background: `${colors.warning}15`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}33`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Increase the number of nodes to 16 and compare Ring vs Fat Tree topologies. Notice how latency steps scale differently.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderVisualization()}
            </div>
            {renderControls()}
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}`
          }}>
            <h3 style={{ color: colors.warning, marginTop: 0, marginBottom: '12px' }}>Hierarchical Communication</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '4px' }}>Intra-Node (NVLink)</div>
                <div style={{ color: colors.textMuted }}>8 GPUs, 900 GB/s</div>
                <div style={{ color: colors.textSecondary }}>Ring all-reduce optimal</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: colors.tree, fontWeight: 'bold', marginBottom: '4px' }}>Inter-Node (InfiniBand)</div>
                <div style={{ color: colors.textMuted }}>1000s of nodes, 400 Gb/s</div>
                <div style={{ color: colors.textSecondary }}>Tree/Fat-tree optimal</div>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: colors.accent, marginTop: 0, marginBottom: '8px' }}>Scaling Laws</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li><strong>Small scale (8 GPU):</strong> Ring is optimal</li>
              <li><strong>Medium scale (64 GPU):</strong> Hierarchical ring + tree</li>
              <li><strong>Large scale (1000+ GPU):</strong> Fat-tree + specialized algorithms</li>
              <li>Communication time scales with sqrt(N) with good topology</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); goNext(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px', textAlign: 'center' }}>
            Topology Determines Training Speed at Scale
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '20px', border: `1px solid ${colors.error}` }}>
              <h3 style={{ color: colors.error, marginTop: 0, marginBottom: '8px' }}>The Challenge</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                With 1000 GPUs, naive all-reduce takes 999 steps. Training would be
                dominated by communication, not computation. We need smarter algorithms.
              </p>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}` }}>
              <h3 style={{ color: colors.success, marginTop: 0, marginBottom: '12px' }}>Solutions</h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li><strong>Gradient compression:</strong> Send less data (1-bit SGD, top-k)</li>
                <li><strong>Overlap:</strong> Communicate while computing next layer</li>
                <li><strong>Hierarchical:</strong> Different algorithms at different scales</li>
                <li><strong>Async SGD:</strong> Don't wait for all workers</li>
              </ul>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.accent, marginTop: 0, marginBottom: '8px' }}>Key Insight</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The best systems achieve <span style={{ color: colors.success }}>90%+ scaling efficiency</span> even with thousands of GPUs
                by carefully matching topology to the physical network and using pipelined
                communication that overlaps with computation.
              </p>
            </div>

            <div style={{ background: `${colors.accent}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.accent}33` }}>
              <h3 style={{ color: colors.accent, marginTop: 0, marginBottom: '8px' }}>The Network IS the Computer</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At scale, network topology and collective algorithms matter as much as the GPUs themselves.
                The interconnect becomes the defining factor in training speed and efficiency.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); goNext(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '70px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} explored)
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
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600, marginTop: 0 }}>
                How Topology Connects:
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

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600, marginTop: 0 }}>
                Industry Examples:
              </h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                {app.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>

            <div style={{
              background: `${app.color}15`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: `1px solid ${app.color}33`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: app.color }}>Future Impact:</strong> {app.futureImpact}
              </p>
            </div>

            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                  newCompleted[selectedApp + 1] = true;
                  setCompletedApps(newCompleted);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                background: `linear-gradient(135deg, ${app.color}, ${app.color}dd)`,
              }}
            >
              {!completedApps[selectedApp] ? 'Got It' : selectedApp < realWorldApps.length - 1 ? 'Next Application' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); goNext(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
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
          paddingTop: '70px',
          overflowY: 'auto' as const,
        }}>
          {renderProgressBar()}

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
                ? 'You understand interconnect topology and distributed training!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); goNext(); }}
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
                Review and Try Again
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
        paddingTop: '70px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
        overflowY: 'auto' as const,
      }}>
        {renderProgressBar()}

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
          Interconnect Topology Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how thousands of GPUs work together to train massive AI models.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', marginTop: 0 }}>
            You Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Ring, Tree, and Fat-Tree topologies',
              'All-reduce and gradient synchronization',
              'Bandwidth vs latency trade-offs',
              'Hierarchical communication strategies',
              'Scaling efficiency at different scales',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}11`,
          borderRadius: '12px',
          padding: '16px',
          maxWidth: '400px',
          marginBottom: '32px',
          border: `1px solid ${colors.accent}33`,
        }}>
          <p style={{ ...typo.body, color: colors.accent, margin: 0, fontStyle: 'italic' }}>
            "At scale, the network IS the computer."
          </p>
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
    );
  }

  return null;
};

export default InterconnectTopologyRenderer;
