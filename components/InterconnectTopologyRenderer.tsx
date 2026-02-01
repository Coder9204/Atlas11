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

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#14b8a6',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
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

const realWorldApps = [
  {
    icon: '🤖',
    title: 'AI Training Clusters',
    short: 'Training massive AI models',
    tagline: 'Connecting thousands of GPUs efficiently',
    description: 'Training large language models like GPT-4 requires thousands of GPUs working in parallel. The interconnect topology determines how efficiently gradients can be synchronized across all GPUs during distributed training. Poor topology choices can make training 10x slower.',
    connection: 'Ring all-reduce and tree topologies directly apply to gradient synchronization. The bandwidth and latency characteristics we explored determine whether training is compute-bound or communication-bound at scale.',
    howItWorks: 'Modern training clusters use hierarchical topologies: NVLink connects GPUs within a node (full mesh), InfiniBand connects nodes in fat-tree configurations, and software implements ring all-reduce for gradient averaging. This hybrid approach optimizes for both bandwidth and latency.',
    stats: [
      { value: '10,000+', label: 'GPUs in cluster', icon: '⚡' },
      { value: '400Gb/s', label: 'InfiniBand speed', icon: '📈' },
      { value: '90%', label: 'Scaling efficiency', icon: '🚀' }
    ],
    examples: ['OpenAI GPT training infrastructure', 'Google TPU pods', 'NVIDIA DGX SuperPOD', 'Meta Research AI clusters'],
    companies: ['NVIDIA', 'Google', 'Microsoft', 'Meta'],
    futureImpact: 'Optical interconnects and photonic computing will enable even higher bandwidth with lower power consumption, making million-GPU clusters practical for training next-generation AI models.',
    color: '#8B5CF6'
  },
  {
    icon: '🌐',
    title: 'Data Center Networks',
    short: 'Internet backbone infrastructure',
    tagline: 'The hidden highways of the cloud',
    description: 'Modern data centers use carefully designed network topologies to handle massive traffic volumes. Fat-tree and Clos architectures provide non-blocking bandwidth between any two servers, essential for distributed applications like search and cloud computing.',
    connection: 'The scalability trade-offs between mesh, tree, and ring topologies directly apply to data center design. Fat-tree topologies solve the bandwidth bottleneck problem we observed at tree roots.',
    howItWorks: 'Leaf-spine architectures use two layers of switches. Every leaf switch connects to every spine switch, creating multiple paths between any two servers. Equal-cost multi-path routing distributes traffic across all available paths.',
    stats: [
      { value: '100Tb/s', label: 'Bisection BW', icon: '⚡' },
      { value: '500μs', label: 'Latency', icon: '📈' },
      { value: '$180B', label: 'DC market', icon: '🚀' }
    ],
    examples: ['Google global network', 'AWS availability zones', 'Facebook data centers', 'Microsoft Azure regions'],
    companies: ['Arista', 'Cisco', 'Juniper', 'Broadcom'],
    futureImpact: 'Disaggregated computing will separate CPU, memory, and storage resources connected by ultra-fast fabric, allowing dynamic resource allocation and eliminating server boundaries entirely.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'High-Performance Computing',
    short: 'Scientific supercomputers',
    tagline: 'Simulating the universe one node at a time',
    description: 'Supercomputers for weather prediction, drug discovery, and physics simulations require interconnects that minimize communication overhead. Dragonfly and fat-tree topologies enable thousands of nodes to share data with minimal latency.',
    connection: 'HPC applications like climate modeling require all-to-all communication patterns similar to our topology exercises. The O(log N) vs O(N) latency trade-offs directly impact simulation performance.',
    howItWorks: 'Modern supercomputers use dragonfly topologies with multiple hierarchy levels. Adaptive routing algorithms dynamically select paths to avoid congestion. High-radix switches minimize hop counts while maintaining scalability.',
    stats: [
      { value: '1 ExaFlop', label: 'Computing power', icon: '⚡' },
      { value: '50,000+', label: 'Nodes connected', icon: '📈' },
      { value: '$600M', label: 'System cost', icon: '🚀' }
    ],
    examples: ['Frontier at Oak Ridge', 'Fugaku in Japan', 'LUMI in Finland', 'Leonardo in Italy'],
    companies: ['Cray/HPE', 'IBM', 'Fujitsu', 'Intel'],
    futureImpact: 'Quantum networking will eventually connect quantum computers across data centers, requiring entirely new topology concepts for quantum entanglement distribution and error correction.',
    color: '#10B981'
  },
  {
    icon: '🎮',
    title: 'Multi-GPU Gaming Systems',
    short: 'Extreme graphics performance',
    tagline: 'Rendering reality in real-time',
    description: 'High-end gaming and professional visualization systems use multiple GPUs connected through NVLink or PCIe. The interconnect determines how efficiently GPUs can share frame rendering work and textures.',
    connection: 'The bandwidth and latency considerations from our topology study apply directly. NVLink provides near-mesh connectivity between GPUs, while PCIe creates a tree through the CPU.',
    howItWorks: 'NVLink bridges connect 2-4 GPUs with up to 900GB/s aggregate bandwidth. SLI/CrossFire splits frame rendering across GPUs. Professional applications use GPU memory pooling across the NVLink fabric.',
    stats: [
      { value: '900GB/s', label: 'NVLink BW', icon: '⚡' },
      { value: '4-way', label: 'GPU configs', icon: '📈' },
      { value: '2x', label: 'Performance gain', icon: '🚀' }
    ],
    examples: ['NVIDIA Quadro workstations', 'Gaming enthusiast builds', 'VR development systems', 'Real-time rendering farms'],
    companies: ['NVIDIA', 'AMD', 'ASUS', 'MSI'],
    futureImpact: 'Chiplet-based GPUs will use advanced packaging to integrate multiple GPU dies with ultra-wide interconnects, making multi-GPU performance seamless and automatic.',
    color: '#F59E0B'
  }
];

const TEST_QUESTIONS = [
  // Q1: Core Concept - Ring Topology (Easy)
  {
    scenario: "You're designing a distributed training system for 8 GPUs. Each GPU needs to share its gradient data with all other GPUs.",
    question: "Why is a ring topology considered bandwidth-optimal for all-reduce operations?",
    options: [
      { id: 'direct', label: "Each GPU sends directly to all others simultaneously" },
      { id: 'optimal', label: "Each GPU sends/receives exactly (N-1)/N of data, utilizing all links", correct: true },
      { id: 'central', label: "A central switch handles all the routing efficiently" },
      { id: 'fast', label: "Ring connections are physically faster than other types" },
    ],
    explanation: "In ring all-reduce, data flows around the ring in chunks. Each GPU sends one chunk while receiving another, perfectly utilizing all available bandwidth. No single bottleneck node exists."
  },
  // Q2: Core Concept - Network Impact (Easy-Medium)
  {
    scenario: "A research team notices their 1000-GPU training job is only 40% efficient compared to a single GPU baseline.",
    question: "What is the most likely cause of this efficiency loss?",
    options: [
      { id: 'power', label: "Power supply limitations across the data center" },
      { id: 'comm', label: "Communication overhead from gradient synchronization dominates compute time", correct: true },
      { id: 'memory', label: "GPUs are running out of memory" },
      { id: 'cooling', label: "Thermal throttling from heat buildup" },
    ],
    explanation: "At scale, network topology becomes critical. Poor topology choices lead to communication bottlenecks where GPUs spend more time waiting for gradients than computing. The network IS the computer at scale."
  },
  // Q3: Fat Tree Topology (Medium)
  {
    scenario: "NVIDIA's DGX SuperPOD uses a fat-tree topology with InfiniBand switches to connect hundreds of GPUs.",
    question: "What key advantage does a fat-tree topology provide over a simple tree?",
    options: [
      { id: 'simple', label: "Simpler wiring and fewer switches needed" },
      { id: 'paths', label: "Multiple redundant paths prevent bandwidth bottlenecks at higher levels", correct: true },
      { id: 'latency', label: "Lower latency due to shorter cable lengths" },
      { id: 'cheap', label: "Lower cost per connection" },
    ],
    explanation: "Fat-tree topologies have 'fatter' (more) links toward the root, providing multiple paths between any two nodes. This eliminates the bandwidth bottleneck that occurs at the root of simple trees."
  },
  // Q4: Latency Comparison (Medium)
  {
    scenario: "You need to synchronize gradients across 1024 GPUs. You're comparing ring vs tree topologies for latency.",
    question: "Which topology has lower latency for this operation, and why?",
    options: [
      { id: 'ring', label: "Ring - data flows continuously without waiting" },
      { id: 'tree', label: "Tree - O(log N) steps vs O(N) for ring", correct: true },
      { id: 'same', label: "Both have the same latency at this scale" },
      { id: 'mesh', label: "Neither - you need full mesh for low latency" },
    ],
    explanation: "Tree reduction completes in O(log N) = ~10 steps for 1024 nodes, while ring needs O(N) = 1023 steps. However, ring has better bandwidth utilization, so the choice depends on message size and network characteristics."
  },
  // Q5: Scalability (Medium-Hard)
  {
    scenario: "Your startup wants to build a 10,000-GPU cluster for training large language models.",
    question: "Why is full mesh topology impractical at this scale?",
    options: [
      { id: 'speed', label: "Full mesh connections are too slow" },
      { id: 'links', label: "Requires N(N-1)/2 ≈ 50 million physical links", correct: true },
      { id: 'protocol', label: "Network protocols don't support mesh topologies" },
      { id: 'latency', label: "Mesh has higher latency than other topologies" },
    ],
    explanation: "Full mesh needs N(N-1)/2 links - for 10,000 GPUs, that's ~50 million connections! This is physically and economically impossible. Real systems use hierarchical approaches instead."
  },
  // Q6: All-Reduce Operations (Medium)
  {
    scenario: "During distributed training, each GPU computes gradients locally. These must be combined before updating model weights.",
    question: "What does an all-reduce operation accomplish?",
    options: [
      { id: 'broadcast', label: "Sends data from one GPU to all others" },
      { id: 'reduce', label: "Combines data from all GPUs and distributes the result to all", correct: true },
      { id: 'gather', label: "Collects data from all GPUs to a single master" },
      { id: 'scatter', label: "Divides data from one GPU across all others" },
    ],
    explanation: "All-reduce = reduce + broadcast in one operation. It sums (or averages) gradients from all GPUs and ensures every GPU receives the final result. This is the fundamental operation for synchronous distributed training."
  },
  // Q7: NVLink/NVSwitch (Medium)
  {
    scenario: "NVIDIA's DGX H100 system uses NVSwitch to connect 8 H100 GPUs within a single node.",
    question: "What capability does NVSwitch provide?",
    options: [
      { id: 'nvswitch', label: "All-to-all GPU communication at full bandwidth simultaneously", correct: true },
      { id: 'pcie', label: "Standard PCIe connections with software routing" },
      { id: 'serial', label: "High-speed serial communication one pair at a time" },
      { id: 'cpu', label: "GPU-to-CPU communication bypassing system memory" },
    ],
    explanation: "NVSwitch enables any GPU to communicate with any other GPU at full NVLink bandwidth (900 GB/s on H100) simultaneously. It's essentially a full mesh within the node, enabling optimal intra-node communication."
  },
  // Q8: Communication vs Computation (Hard)
  {
    scenario: "A model has 175 billion parameters (700 GB in fp32). Training batch takes 100ms of compute per GPU across 1000 GPUs.",
    question: "At 100 Gb/s network bandwidth per GPU, approximately how long does gradient synchronization take?",
    options: [
      { id: 'negligible', label: "~1ms - negligible compared to compute" },
      { id: 'significant', label: "~56 seconds - communication dominates", correct: true },
      { id: 'equal', label: "~100ms - roughly equal to compute" },
      { id: 'faster', label: "Faster than compute due to pipelining" },
    ],
    explanation: "700 GB at 100 Gb/s = 56 seconds for a naive all-reduce! This is why gradient compression, pipelining, and topology optimization are critical. Without them, GPUs would spend 99%+ of time waiting."
  },
  // Q9: Hierarchical All-Reduce (Hard)
  {
    scenario: "Modern training systems like Megatron-LM use hierarchical all-reduce: ring within nodes, tree across nodes.",
    question: "Why use different topologies at different scales?",
    options: [
      { id: 'simple', label: "Simpler to implement than a single unified topology" },
      { id: 'match', label: "Matches algorithm to physical network characteristics at each level", correct: true },
      { id: 'backup', label: "Provides redundancy if one topology fails" },
      { id: 'legacy', label: "Legacy compatibility with older hardware" },
    ],
    explanation: "Intra-node (NVLink: 900 GB/s) vs inter-node (InfiniBand: 400 Gb/s) have 18x bandwidth difference! Ring maximizes bandwidth within nodes; tree minimizes latency across nodes. Hierarchical approaches get the best of both."
  },
  // Q10: Bandwidth Aggregation (Hard)
  {
    scenario: "You're comparing two network designs: (A) Single 400 Gb/s link per node, (B) Four 100 Gb/s links per node with adaptive routing.",
    question: "Which design likely achieves better effective bandwidth for all-reduce operations?",
    options: [
      { id: 'single', label: "Design A - single fast link has lower latency" },
      { id: 'multiple', label: "Design B - multiple paths enable bandwidth aggregation and fault tolerance", correct: true },
      { id: 'same', label: "Same bandwidth, so same performance" },
      { id: 'depends', label: "Depends entirely on the switch hardware" },
    ],
    explanation: "Multiple links with adaptive routing can aggregate bandwidth AND provide fault tolerance. If one link fails or is congested, traffic reroutes. This is why fat-tree topologies use multiple paths - they aggregate bandwidth at each level."
  },
];

const TRANSFER_APPS = [
  {
    title: 'NVIDIA DGX SuperPOD',
    description: 'Connects 32 DGX H100 systems (256 GPUs) with InfiniBand fat-tree topology. Used for training GPT-4 class models.',
    insight: '256 GPUs @ 400 Gb/s each',
  },
  {
    title: 'Google TPU Pods',
    description: 'Google TPUs use a 3D torus topology for direct chip-to-chip communication. TPU v4 pods have 4096 chips.',
    insight: 'TPU v4: 3D torus @ 4800 Gb/s',
  },
  {
    title: 'AWS Trainium',
    description: 'Amazon Trainium uses a 2D mesh topology with custom NeuronLink interconnect for ML training.',
    insight: 'Trn1: 800 Gb/s NeuronLink',
  },
  {
    title: 'Meta Research SuperCluster',
    description: 'Meta RSC uses 2000+ A100 GPUs with hierarchical InfiniBand topology for training LLaMA models.',
    insight: 'RSC: 5 exaflops peak',
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
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

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
  const totalDataTransferred = messageSize * numNodes; // Each node sends its data
  const effectiveTime = (totalDataTransferred / bandwidthEfficiency) * latencySteps / 100;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctOption = TEST_QUESTIONS[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
      return score;
    }, 0);
  };

  // Comprehensive testQuestions array covering interconnect topology topics
  const testQuestions = [
    // Q1: Core concept - what is network topology (Easy)
    {
      scenario: "A startup is designing their first GPU cluster for machine learning workloads. The infrastructure team needs to decide how to connect 16 GPUs together.",
      question: "What is network topology in the context of interconnected compute systems?",
      options: [
        { id: 'a', label: "The physical location of servers in a data center rack" },
        { id: 'b', label: "The arrangement and pattern of connections between nodes in a network", correct: true },
        { id: 'c', label: "The speed of individual network cables" },
        { id: 'd', label: "The operating system running on network switches" },
      ],
      explanation: "Network topology defines how nodes (like GPUs or servers) are interconnected. The topology determines communication patterns, latency, bandwidth utilization, and fault tolerance. Different topologies like ring, tree, or mesh have distinct trade-offs for various workloads."
    },
    // Q2: Bus vs star topology (Easy-Medium)
    {
      scenario: "An engineer is comparing legacy bus topology (where all devices share a single communication line) with star topology (where devices connect to a central switch) for a small training cluster.",
      question: "Why did star topology largely replace bus topology in modern compute clusters?",
      options: [
        { id: 'a', label: "Bus topology uses more cables than star topology" },
        { id: 'b', label: "Star topology eliminates the single point of failure of the shared bus and allows concurrent communication", correct: true },
        { id: 'c', label: "Star topology was invented more recently" },
        { id: 'd', label: "Bus topology requires more expensive hardware" },
      ],
      explanation: "In bus topology, all devices share one communication channel, creating contention and a single point of failure. Star topology connects each device to a central switch, enabling multiple simultaneous communications and isolating failures. If one link fails in star, other devices remain connected."
    },
    // Q3: Ring topology pros/cons (Medium)
    {
      scenario: "NVIDIA's NCCL library uses ring all-reduce for gradient synchronization. In a ring topology, each GPU connects to exactly two neighbors, forming a closed loop.",
      question: "What is the primary advantage and disadvantage of ring topology for collective operations?",
      options: [
        { id: 'a', label: "Advantage: lowest latency; Disadvantage: high cable cost" },
        { id: 'b', label: "Advantage: bandwidth-optimal utilization; Disadvantage: latency grows linearly with node count (O(N))", correct: true },
        { id: 'c', label: "Advantage: fault tolerant; Disadvantage: complex routing" },
        { id: 'd', label: "Advantage: simple wiring; Disadvantage: cannot scale beyond 8 nodes" },
      ],
      explanation: "Ring topology achieves optimal bandwidth utilization because every node simultaneously sends and receives, using all links fully. However, a message must traverse N-1 hops to reach all nodes, so latency scales as O(N). This makes ring excellent for bandwidth-bound operations but problematic for latency-sensitive workloads at large scale."
    },
    // Q4: Mesh network resilience (Medium)
    {
      scenario: "A cloud provider is designing a network for a mission-critical AI inference service. They need the system to remain operational even if multiple network links fail simultaneously.",
      question: "Why does a full mesh topology provide superior fault tolerance compared to tree or ring topologies?",
      options: [
        { id: 'a', label: "Mesh uses higher quality cables that fail less often" },
        { id: 'b', label: "Mesh has redundant direct paths between every pair of nodes, so failures can be routed around", correct: true },
        { id: 'c', label: "Mesh topology automatically repairs failed connections" },
        { id: 'd', label: "Mesh requires fewer total connections than other topologies" },
      ],
      explanation: "In a full mesh, every node connects directly to every other node, providing N-1 redundant paths. If one link fails, communication continues via alternative paths. In contrast, ring topology has a single path between nodes (one failure isolates nodes), and tree topology depends on parent links (one failure can disconnect entire subtrees)."
    },
    // Q5: Data center spine-leaf architecture (Medium-Hard)
    {
      scenario: "Modern hyperscale data centers like those at Google, Meta, and Microsoft use spine-leaf architecture. Leaf switches connect to servers, while spine switches connect all leaf switches together.",
      question: "What key benefit does spine-leaf architecture provide over traditional three-tier (core-aggregation-access) networks?",
      options: [
        { id: 'a', label: "Spine-leaf uses fewer switches overall" },
        { id: 'b', label: "Spine-leaf provides consistent low latency with equal hop count between any two servers", correct: true },
        { id: 'c', label: "Spine-leaf only works with specific vendor equipment" },
        { id: 'd', label: "Spine-leaf eliminates the need for network switches entirely" },
      ],
      explanation: "Spine-leaf architecture ensures every server is exactly two hops away from any other server (leaf to spine to leaf), providing predictable, uniform latency. Traditional three-tier networks have variable hop counts (2-6 hops) depending on traffic patterns, causing inconsistent latency. This predictability is crucial for distributed training where synchronization depends on consistent communication times."
    },
    // Q6: Fat tree topology in HPC (Hard)
    {
      scenario: "The Frontier supercomputer at Oak Ridge National Laboratory uses a fat-tree network topology built with Slingshot interconnect. Each level of the tree has progressively more aggregate bandwidth toward the root.",
      question: "Why do HPC systems use fat-tree rather than simple tree topology?",
      options: [
        { id: 'a', label: "Fat-tree uses less cabling than simple tree" },
        { id: 'b', label: "Fat-tree eliminates the root bandwidth bottleneck by providing multiple parallel uplinks at each level", correct: true },
        { id: 'c', label: "Fat-tree has lower latency than simple tree" },
        { id: 'd', label: "Fat-tree requires fewer switches than simple tree" },
      ],
      explanation: "In a simple tree, the root becomes a severe bandwidth bottleneck as all cross-branch traffic must pass through it. Fat-tree solves this by using multiple parallel links (fat pipes) at higher levels, maintaining non-blocking full bisection bandwidth. If leaves have bandwidth B, the aggregate bandwidth at each level equals the total leaf bandwidth, eliminating congestion at higher levels."
    },
    // Q7: Torus topology in supercomputers (Hard)
    {
      scenario: "Google's TPU v4 pods use a 3D torus topology where each TPU chip connects to 6 neighbors (2 in each dimension). IBM's Blue Gene supercomputers famously used 5D torus networks.",
      question: "What advantage does torus topology provide for scientific computing and AI workloads compared to fat-tree?",
      options: [
        { id: 'a', label: "Torus is simpler to cable and maintain" },
        { id: 'b', label: "Torus provides natural locality for nearest-neighbor communication patterns common in simulations and convolutions", correct: true },
        { id: 'c', label: "Torus has higher total bandwidth than fat-tree" },
        { id: 'd', label: "Torus requires no switches, only direct connections" },
      ],
      explanation: "Torus topology excels when workloads have strong spatial locality, like physics simulations (neighboring cells interact) or convolutional neural networks (neighboring pixels). Each node directly connects to its neighbors in multiple dimensions, providing low-latency local communication without traversing switches. Fat-tree is better for arbitrary all-to-all patterns, while torus optimizes for structured, local communication."
    },
    // Q8: Network diameter and latency (Hard)
    {
      scenario: "An architect is comparing network designs for a 1024-node cluster. Design A (hypercube) has diameter log2(N) = 10 hops. Design B (2D torus) has diameter N^0.5 = 32 hops. Design C (fat-tree) has diameter 2*log2(N) = 20 hops.",
      question: "How does network diameter affect worst-case communication latency between any two nodes?",
      options: [
        { id: 'a', label: "Diameter has no effect on latency; only bandwidth matters" },
        { id: 'b', label: "Larger diameter means more hops in worst case, directly increasing minimum latency for distant node pairs", correct: true },
        { id: 'c', label: "Smaller diameter always means lower bandwidth" },
        { id: 'd', label: "Diameter only affects fault tolerance, not latency" },
      ],
      explanation: "Network diameter is the maximum number of hops between any two nodes. Each hop adds latency (switch processing + propagation time). For latency-sensitive operations like barrier synchronization, smaller diameter is crucial. A 32-hop worst case (2D torus) versus 10-hop (hypercube) can mean 3x higher worst-case latency, directly impacting global synchronization performance."
    },
    // Q9: Bisection bandwidth (Hard)
    {
      scenario: "When evaluating network designs, engineers measure bisection bandwidth: the minimum bandwidth when the network is split into two equal halves. A 64-node fat-tree has full bisection bandwidth of 64 * link_speed, while a 64-node ring has bisection bandwidth of only 2 * link_speed.",
      question: "Why is bisection bandwidth a critical metric for distributed deep learning training?",
      options: [
        { id: 'a', label: "Higher bisection bandwidth reduces power consumption" },
        { id: 'b', label: "Bisection bandwidth determines the worst-case throughput for all-to-all communication patterns like gradient synchronization", correct: true },
        { id: 'c', label: "Bisection bandwidth only matters for storage networks" },
        { id: 'd', label: "Higher bisection bandwidth increases network latency" },
      ],
      explanation: "During gradient synchronization, every GPU must exchange data with every other GPU. When split in half, all cross-partition traffic must traverse the bisection. Low bisection bandwidth (like ring's 2 links) becomes a severe bottleneck for N/2 * N/2 communication pairs. Full bisection bandwidth (fat-tree) means the network can sustain all-to-all traffic without congestion, critical for training efficiency."
    },
    // Q10: NVLink/NVSwitch topology (Hard)
    {
      scenario: "NVIDIA's DGX H100 system connects 8 H100 GPUs using NVSwitch, providing 900 GB/s bidirectional bandwidth per GPU. The NVSwitch acts as a crossbar allowing any GPU to communicate with any other GPU simultaneously at full bandwidth.",
      question: "What topological property does NVSwitch provide that PCIe-based GPU connections cannot achieve?",
      options: [
        { id: 'a', label: "NVSwitch uses optical connections while PCIe uses copper" },
        { id: 'b', label: "NVSwitch enables non-blocking all-to-all GPU communication at full bandwidth simultaneously", correct: true },
        { id: 'c', label: "NVSwitch reduces the number of physical connections needed" },
        { id: 'd', label: "NVSwitch only benefits gaming workloads, not AI training" },
      ],
      explanation: "NVSwitch implements a full crossbar (non-blocking switch fabric) where all 8 GPUs can simultaneously send to any 8 destinations at full 900 GB/s each. PCIe topologies create bandwidth bottlenecks when multiple GPUs communicate through shared PCIe switches or CPU bridges. This non-blocking property makes NVSwitch essential for bandwidth-intensive operations like tensor parallelism and gradient all-reduce within a node."
    },
  ];

  const renderVisualization = () => {
    const width = 500;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 120;

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
          // Binary tree structure
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

    // Animation for data flow
    const animProgress = animationFrame / 200;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ borderRadius: '16px' }}
      >
        {/* Premium SVG Definitions */}
        <defs>
          {/* Premium dark background gradient */}
          <linearGradient id="itopLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Metallic copper interconnect gradient */}
          <linearGradient id="itopCopperTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="20%" stopColor="#d97706" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="60%" stopColor="#d97706" />
            <stop offset="80%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Metallic silver interconnect gradient for fat tree */}
          <linearGradient id="itopSilverTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="20%" stopColor="#cbd5e1" />
            <stop offset="40%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="80%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Gold trace for ring topology */}
          <linearGradient id="itopGoldTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Emerald trace for tree */}
          <linearGradient id="itopEmeraldTrace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="25%" stopColor="#059669" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="75%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* GPU chip 3D effect gradient */}
          <linearGradient id="itopChipTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="30%" stopColor="#334155" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* GPU chip side gradient for 3D effect */}
          <linearGradient id="itopChipSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* GPU die glow gradient (radial) */}
          <radialGradient id="itopDieGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="40%" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </radialGradient>

          {/* Active die glow for animation */}
          <radialGradient id="itopActiveDie" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0891b2" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
          </radialGradient>

          {/* Data packet glow */}
          <radialGradient id="itopDataPacket" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* NVLink glow gradient */}
          <radialGradient id="itopNVLinkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="1" />
            <stop offset="40%" stopColor="#84cc16" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#65a30d" stopOpacity="0" />
          </radialGradient>

          {/* Glow filter for nodes */}
          <filter id="itopNodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Data flow glow filter */}
          <filter id="itopDataGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trace glow filter */}
          <filter id="itopTraceGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for depth */}
          <filter id="itopInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Stats panel gradient */}
          <linearGradient id="itopStatsPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </linearGradient>

          {/* Grid pattern for background */}
          <pattern id="itopGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
        </defs>

        {/* Premium dark background */}
        <rect width={width} height={height} fill="url(#itopLabBg)" />

        {/* Subtle grid overlay */}
        <rect width={width} height={height} fill="url(#itopGrid)" opacity="0.3" />

        {/* Title with glow effect */}
        <text
          x={width / 2}
          y={32}
          textAnchor="middle"
          fill={colors.textPrimary}
          fontSize={18}
          fontWeight="bold"
          style={{ textShadow: `0 0 10px ${spec.color}` }}
        >
          {topology} Topology
        </text>
        <text
          x={width / 2}
          y={52}
          textAnchor="middle"
          fill={colors.textSecondary}
          fontSize={12}
        >
          {numNodes} GPU Nodes | {connections.length} Interconnects
        </text>

        {/* Connections with premium metallic traces */}
        {connections.map((conn, i) => {
          const from = nodePositions[conn.from];
          const to = nodePositions[conn.to];
          const isFatTree = topology === 'Fat Tree';
          const isRing = topology === 'Ring';
          const isTree = topology === 'Tree';

          // Select gradient based on topology
          const traceGradient = isRing ? 'url(#itopGoldTrace)' :
                                isFatTree ? 'url(#itopSilverTrace)' :
                                isTree ? 'url(#itopEmeraldTrace)' :
                                'url(#itopCopperTrace)';

          const traceWidth = isFatTree ? 6 : isRing ? 4 : 3;

          // Calculate angle for gradient rotation
          const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

          return (
            <g key={`conn-${i}`}>
              {/* Trace shadow for depth */}
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

              {/* Main metallic trace */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={traceGradient}
                strokeWidth={traceWidth}
                strokeLinecap="round"
                filter="url(#itopTraceGlow)"
              />

              {/* Trace highlight for 3D effect */}
              <line
                x1={from.x}
                y1={from.y - 1}
                x2={to.x}
                y2={to.y - 1}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
                strokeLinecap="round"
              />

              {/* Animated data flow packets */}
              {showDataFlow && (
                <>
                  {/* Primary data packet */}
                  <circle
                    cx={from.x + (to.x - from.x) * ((animProgress + i * 0.15) % 1)}
                    cy={from.y + (to.y - from.y) * ((animProgress + i * 0.15) % 1)}
                    r={5}
                    fill="url(#itopDataPacket)"
                    filter="url(#itopDataGlow)"
                  />
                  {/* Secondary data packet (offset) */}
                  <circle
                    cx={from.x + (to.x - from.x) * ((animProgress + i * 0.15 + 0.5) % 1)}
                    cy={from.y + (to.y - from.y) * ((animProgress + i * 0.15 + 0.5) % 1)}
                    r={4}
                    fill="url(#itopNVLinkGlow)"
                    filter="url(#itopDataGlow)"
                  />
                  {/* Trailing glow effect */}
                  <circle
                    cx={from.x + (to.x - from.x) * ((animProgress + i * 0.15 - 0.05) % 1)}
                    cy={from.y + (to.y - from.y) * ((animProgress + i * 0.15 - 0.05) % 1)}
                    r={3}
                    fill="rgba(251, 191, 36, 0.4)"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* GPU Nodes with 3D chip representation */}
        {nodePositions.map((pos, i) => {
          const chipSize = 36;
          const chipDepth = 6;
          const isActive = showDataFlow && (Math.floor(animationFrame / 25) % numNodes === i);

          return (
            <g key={`node-${i}`} filter="url(#itopNodeGlow)">
              {/* Chip shadow */}
              <rect
                x={pos.x - chipSize / 2 + 3}
                y={pos.y - chipSize / 2 + 3}
                width={chipSize}
                height={chipSize}
                rx={4}
                fill="rgba(0,0,0,0.4)"
              />

              {/* Chip side (3D depth effect) */}
              <path
                d={`M ${pos.x - chipSize/2} ${pos.y + chipSize/2}
                    L ${pos.x - chipSize/2 + chipDepth} ${pos.y + chipSize/2 + chipDepth}
                    L ${pos.x + chipSize/2 + chipDepth} ${pos.y + chipSize/2 + chipDepth}
                    L ${pos.x + chipSize/2 + chipDepth} ${pos.y - chipSize/2 + chipDepth}
                    L ${pos.x + chipSize/2} ${pos.y - chipSize/2}
                    L ${pos.x + chipSize/2} ${pos.y + chipSize/2}
                    Z`}
                fill="url(#itopChipSide)"
              />

              {/* Chip top surface */}
              <rect
                x={pos.x - chipSize / 2}
                y={pos.y - chipSize / 2}
                width={chipSize}
                height={chipSize}
                rx={4}
                fill="url(#itopChipTop)"
                stroke="#475569"
                strokeWidth={1}
              />

              {/* Die area with glow */}
              <rect
                x={pos.x - chipSize / 3}
                y={pos.y - chipSize / 3}
                width={chipSize * 2 / 3}
                height={chipSize * 2 / 3}
                rx={2}
                fill={isActive ? "url(#itopActiveDie)" : "url(#itopDieGlow)"}
              />

              {/* Die grid pattern */}
              <g opacity={0.3}>
                <line x1={pos.x - 8} y1={pos.y - 8} x2={pos.x - 8} y2={pos.y + 8} stroke="#fff" strokeWidth={0.5} />
                <line x1={pos.x} y1={pos.y - 8} x2={pos.x} y2={pos.y + 8} stroke="#fff" strokeWidth={0.5} />
                <line x1={pos.x + 8} y1={pos.y - 8} x2={pos.x + 8} y2={pos.y + 8} stroke="#fff" strokeWidth={0.5} />
                <line x1={pos.x - 8} y1={pos.y - 8} x2={pos.x + 8} y2={pos.y - 8} stroke="#fff" strokeWidth={0.5} />
                <line x1={pos.x - 8} y1={pos.y} x2={pos.x + 8} y2={pos.y} stroke="#fff" strokeWidth={0.5} />
                <line x1={pos.x - 8} y1={pos.y + 8} x2={pos.x + 8} y2={pos.y + 8} stroke="#fff" strokeWidth={0.5} />
              </g>

              {/* Pin/pad markers on edges */}
              {[-1, 0, 1].map(offset => (
                <React.Fragment key={`pins-${offset}`}>
                  <rect x={pos.x - chipSize/2 - 2} y={pos.y + offset * 8 - 2} width={4} height={4} fill="#94a3b8" rx={1} />
                  <rect x={pos.x + chipSize/2 - 2} y={pos.y + offset * 8 - 2} width={4} height={4} fill="#94a3b8" rx={1} />
                  <rect x={pos.x + offset * 8 - 2} y={pos.y - chipSize/2 - 2} width={4} height={4} fill="#94a3b8" rx={1} />
                  <rect x={pos.x + offset * 8 - 2} y={pos.y + chipSize/2 - 2} width={4} height={4} fill="#94a3b8" rx={1} />
                </React.Fragment>
              ))}

              {/* GPU label */}
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

              {/* Activity indicator */}
              {isActive && (
                <circle
                  cx={pos.x + chipSize / 2 - 4}
                  cy={pos.y - chipSize / 2 + 4}
                  r={3}
                  fill="#22c55e"
                >
                  <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Premium stats panel */}
        <g transform={`translate(12, ${height - 90})`}>
          <rect
            x={0}
            y={0}
            width={180}
            height={78}
            rx={10}
            fill="url(#itopStatsPanel)"
            stroke="#334155"
            strokeWidth={1}
          />

          {/* Stats header */}
          <text x={12} y={18} fill={spec.color} fontSize={11} fontWeight="bold">
            NETWORK METRICS
          </text>
          <line x1={12} y1={24} x2={168} y2={24} stroke="#334155" strokeWidth={1} />

          {/* Latency */}
          <text x={12} y={42} fill={colors.textMuted} fontSize={10}>Latency Steps</text>
          <text x={12} y={56} fill={spec.color} fontSize={16} fontWeight="bold">{latencySteps}</text>

          {/* Bandwidth */}
          <text x={95} y={42} fill={colors.textMuted} fontSize={10}>Bandwidth Eff.</text>
          <text x={95} y={56} fill={bandwidthEfficiency > 80 ? colors.success : colors.warning} fontSize={16} fontWeight="bold">
            {bandwidthEfficiency}%
          </text>

          {/* Links count */}
          <text x={12} y={72} fill={colors.textMuted} fontSize={9}>
            Total Links: {connections.length} | Complexity: {spec.latency}
          </text>
        </g>

        {/* Connection count warning for mesh */}
        {topology === 'Full Mesh' && numNodes > 8 && (
          <g transform={`translate(${width / 2}, ${height - 8})`}>
            <rect x={-100} y={-14} width={200} height={20} rx={4} fill="rgba(239, 68, 68, 0.2)" />
            <text textAnchor="middle" fill={colors.error} fontSize={11} fontWeight="bold">
              Warning: {(numNodes * (numNodes - 1)) / 2} links needed!
            </text>
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${width - 90}, ${height - 50})`}>
          <text x={0} y={0} fill={colors.textMuted} fontSize={9} fontWeight="bold">LEGEND</text>
          <circle cx={8} cy={15} r={4} fill="url(#itopDataPacket)" />
          <text x={18} y={18} fill={colors.textSecondary} fontSize={9}>Gradient Data</text>
          <circle cx={8} cy={30} r={3} fill="url(#itopNVLinkGlow)" />
          <text x={18} y={33} fill={colors.textSecondary} fontSize={9}>NVLink Packet</text>
        </g>
      </svg>
    );
  };

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
              onClick={() => setTopology(t)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: topology === t ? `2px solid ${TOPOLOGY_SPECS[t].color}` : '1px solid rgba(255,255,255,0.2)',
                background: topology === t ? `${TOPOLOGY_SPECS[t].color}22` : 'transparent',
                color: TOPOLOGY_SPECS[t].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
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
        onClick={() => setShowDataFlow(!showDataFlow)}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: showDataFlow ? colors.accent : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow'}
      </button>
    </div>
  );

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
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #0d9488 100%)` : 'rgba(30, 41, 59, 0.9)',
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

  // Phase renders
  const renderHook = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(20, 184, 166, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            Interconnect Topology
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            How do thousands of GPUs work together on one AI model?
          </p>
        </div>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginTop: '24px'
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
            Training GPT-4 used thousands of GPUs working together. But how do they
            synchronize? Every GPU needs to share its gradients with every other GPU.
          </p>
          <div style={{
            background: 'rgba(20, 184, 166, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              The network topology determines how fast gradients can be synchronized
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              Wrong topology = GPUs waiting instead of computing
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'broadcast', text: 'One GPU broadcasts to all others (star topology)' },
      { id: 'sequential', text: 'GPUs pass data one-by-one in a chain' },
      { id: 'ring', text: 'GPUs form a ring and pass partial sums around' },
      { id: 'random', text: 'GPUs randomly share with neighbors until done' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What's the most efficient way for 8 GPUs to average their gradients?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(20, 184, 166, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: prediction === 'ring' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'ring' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'ring' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'ring' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Ring all-reduce is bandwidth-optimal! Each GPU sends and receives exactly
                (N-1)/N of its data, using all available bandwidth. No single bottleneck node.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!prediction, 'Explore the Lab')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Topology Explorer Lab
        </h2>

        {renderVisualization()}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Observations:</h3>
          <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>Ring: Optimal bandwidth, O(N) latency steps</li>
            <li>Tree: O(log N) latency but root bottleneck</li>
            <li>Fat Tree: Fast + high bandwidth (used in data centers)</li>
            <li>Full Mesh: Fastest but O(N^2) links (impractical at scale)</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review Concepts')}
    </div>
  );

  const renderReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Understanding Network Topologies
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.ring, marginBottom: '8px' }}>Ring All-Reduce</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data flows around a ring. Each node sends a chunk while receiving another.
              Bandwidth-optimal: uses 100% of available links. Used by NCCL for small clusters.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.tree, marginBottom: '8px' }}>Tree Reduction</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data flows up to root, then broadcasts down. Fast (O(log N)) but root
              becomes a bandwidth bottleneck. Good for latency-sensitive workloads.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.mesh, marginBottom: '8px' }}>Fat Tree</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Tree with fatter links toward the root. Multiple paths prevent bottlenecks.
              Standard topology for InfiniBand data center networks.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.allreduce, marginBottom: '8px' }}>Hierarchical All-Reduce</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Combines topologies: Ring within a node (NVLink), Tree across nodes (InfiniBand).
              Best of both worlds for large-scale training.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Scale Matters')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'same', text: 'The same topology works best at any scale' },
      { id: 'ring_always', text: 'Ring is always best since it\'s bandwidth-optimal' },
      { id: 'hybrid', text: 'Different scales need different topologies combined' },
      { id: 'mesh', text: 'Full mesh is the answer at any scale' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Topology Depends on Scale
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            8 GPUs in one machine vs 8000 GPUs across a data center - same approach?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: twistPrediction === 'hybrid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'hybrid' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'hybrid' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Modern systems use hierarchical approaches: NVLink ring within a node (900 GB/s),
                InfiniBand tree across nodes (400 Gb/s), different algorithms at each level.
                The optimal strategy changes with scale!
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Scale Effects')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Scale-Dependent Topology Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${colors.warning}`
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Hierarchical Communication</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '4px' }}>Intra-Node (NVLink)</div>
              <div style={{ color: colors.textMuted }}>8 GPUs, 900 GB/s</div>
              <div style={{ color: colors.textSecondary }}>Ring all-reduce</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: colors.tree, fontWeight: 'bold', marginBottom: '4px' }}>Inter-Node (InfiniBand)</div>
              <div style={{ color: colors.textMuted }}>1000s of nodes, 400 Gb/s</div>
              <div style={{ color: colors.textSecondary }}>Tree/Fat-tree</div>
            </div>
          </div>
        </div>

        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Scaling Laws</h3>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>Small scale (8 GPU): Ring is optimal</li>
            <li>Medium scale (64 GPU): Hierarchical ring + tree</li>
            <li>Large scale (1000+ GPU): Fat-tree + specialized algorithms</li>
            <li>Communication time scales with sqrt(N) with good topology</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Topology Determines Training Speed at Scale
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Challenge</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              With 1000 GPUs, naive all-reduce takes 999 steps. Training would be
              dominated by communication, not computation. Need smarter algorithms.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li><strong>Gradient compression:</strong> Send less data</li>
              <li><strong>Overlap:</strong> Communicate while computing next layer</li>
              <li><strong>Hierarchical:</strong> Different algorithms at different scales</li>
              <li><strong>Async SGD:</strong> Don't wait for all workers</li>
            </ul>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Key Insight</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The best systems achieve 90%+ scaling efficiency even with thousands of GPUs
              by carefully matching topology to the physical network and using pipelined
              communication that overlaps with computation.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Real-World Applications')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Explore all 4 applications to continue
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {TRANSFER_APPS.map((app, i) => (
            <div
              key={i}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(i) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
              </div>
              {!transferCompleted.has(i) && (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, i]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
    </div>
  );

  const renderTest = () => {
    const totalQuestions = TEST_QUESTIONS.length;

    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                background: passed ? `${colors.success}20` : `${colors.warning}20`,
                border: `3px solid ${passed ? colors.success : colors.warning}`
              }}>
                {score === totalQuestions ? 'Trophy' : score >= 9 ? 'Star' : score >= 7 ? 'Check' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px', marginBottom: '8px' }}>
                {score}/{totalQuestions} Correct
              </h2>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {score === totalQuestions ? "Perfect! You've mastered interconnect topology!" :
                 score >= 9 ? 'Excellent! You deeply understand network concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - network topology takes time!'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => { setCurrentTestIndex(0); setTestAnswers(new Array(10).fill(null)); setTestSubmitted(false); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    background: colors.bgCard,
                    color: colors.textSecondary,
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => goToPhase('mastery')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    background: passed ? colors.success : colors.warning,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {passed ? 'Claim Mastery' : 'Review Lesson'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
              Question-by-Question Review
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {TEST_QUESTIONS.map((q, i) => {
                const correctOption = q.options.find(o => o.correct);
                const correctId = correctOption?.id;
                const userAnswer = testAnswers[i];
                const userOption = q.options.find(o => o.id === userAnswer);
                const isCorrect = userAnswer === correctId;

                return (
                  <div key={i} style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: colors.bgCard,
                    border: `2px solid ${isCorrect ? colors.success : colors.error}40`
                  }}>
                    <div style={{ padding: '16px', background: isCorrect ? `${colors.success}15` : `${colors.error}15` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white'
                        }}>
                          {isCorrect ? 'Y' : 'X'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Question {i + 1}</p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>{q.question}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCorrect ? `${colors.success}10` : `${colors.error}10`,
                        border: `1px solid ${isCorrect ? colors.success : colors.error}30`
                      }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: isCorrect ? colors.success : colors.error }}>
                          {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                        </p>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>{userOption?.label || 'No answer selected'}</p>
                      </div>

                      {!isCorrect && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: `${colors.success}10`,
                          border: `1px solid ${colors.success}30`
                        }}>
                          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.success }}>Correct Answer</p>
                          <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>{correctOption?.label}</p>
                        </div>
                      )}

                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.accent }}>Why?</p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.warning }}>
            Step 9 - Knowledge Test
          </p>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
            Question {currentTestIndex + 1} of {totalQuestions}
          </h2>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div key={i} style={{
                height: '8px',
                flex: 1,
                borderRadius: '9999px',
                background: i === currentTestIndex ? colors.warning : i < currentTestIndex ? colors.success : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>

          {/* Scenario */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}30`
          }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.accent }}>Scenario</p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>{currentQ.scenario}</p>
          </div>

          {/* Question */}
          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: colors.textPrimary }}>{currentQ.question}</p>

          {/* Options */}
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentTestIndex] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '16px',
                  textAlign: 'left',
                  background: testAnswers[currentTestIndex] === opt.id ? `${colors.warning}20` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textMuted
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textSecondary, margin: 0 }}>{opt.label}</p>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                zIndex: 10,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setTestSubmitted(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.ring})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Interconnect Topology Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand how thousands of GPUs work together
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>Ring, Tree, Fat-Tree topologies</li>
            <li>All-reduce and gradient synchronization</li>
            <li>Bandwidth vs latency trade-offs</li>
            <li>Hierarchical communication strategies</li>
            <li>Scaling efficiency at different scales</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(20, 184, 166, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "At scale, the network is the computer."
          </p>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: colors.bgPrimary, color: colors.textPrimary }}>
      {/* Progress bar at top */}
      <div style={{ flexShrink: 0 }}>
        {renderProgressBar()}
      </div>

      {/* Main content - scrollable */}
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default InterconnectTopologyRenderer;
