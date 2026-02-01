'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
  {
    icon: '🎮',
    title: 'Gaming Graphics Cards',
    short: 'PCIe enables high-performance GPU gaming',
    tagline: 'Feeding the graphics beast',
    description: 'Modern gaming GPUs like the RTX 4090 connect via PCIe x16 slots, providing up to 64 GB/s bandwidth. This enables rapid texture loading, asset streaming, and frame buffer transfers for 4K gaming.',
    connection: 'GPU bandwidth requirements scale with resolution and frame rate. PCIe 4.0 x16 provides enough headroom that most gaming workloads are compute-bound, not PCIe-limited.',
    howItWorks: 'The GPU fetches textures and geometry from system memory over PCIe. Once in VRAM, the GPU\'s internal 900+ GB/s memory bandwidth handles rendering. Completed frames transfer back for display.',
    stats: [
      { value: '64', label: 'GB/s (PCIe 5.0 x16)', icon: '⚡' },
      { value: '900+', label: 'GB/s VRAM bandwidth', icon: '📊' },
      { value: '$45B', label: 'GPU market', icon: '📈' }
    ],
    examples: ['NVIDIA GeForce gaming', 'AMD Radeon gaming', 'Ray tracing workloads', 'VR rendering'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'EVGA'],
    futureImpact: 'DirectStorage and PCIe 5.0 will enable instant loading and streaming of massive open-world game environments.',
    color: '#22C55E'
  },
  {
    icon: '🧠',
    title: 'AI Training Clusters',
    short: 'NVLink surpasses PCIe for GPU-GPU communication',
    tagline: 'Bandwidth for billion-parameter models',
    description: 'Training large language models requires multiple GPUs working together. NVLink provides 900 GB/s total bandwidth between GPUs, far exceeding PCIe limits for gradient synchronization.',
    connection: 'PCIe bottlenecks multi-GPU training when gradients must be exchanged. NVLink\'s 10-18x higher bandwidth enables efficient distributed training of trillion-parameter models.',
    howItWorks: 'NVSwitch fabrics connect 8 GPUs in a fully-connected topology. Each GPU has 900 GB/s total NVLink bandwidth, enabling collective operations at near-memory speeds.',
    stats: [
      { value: '900', label: 'GB/s (NVLink 4)', icon: '⚡' },
      { value: '8', label: 'GPUs per node', icon: '🔧' },
      { value: '$200B', label: 'AI chip market 2030', icon: '📈' }
    ],
    examples: ['ChatGPT training', 'Stable Diffusion models', 'AlphaFold protein folding', 'Autonomous driving AI'],
    companies: ['NVIDIA', 'OpenAI', 'Google', 'Meta'],
    futureImpact: 'Grace Hopper superchips and future NVLink generations will push aggregate bandwidth beyond 1 TB/s per GPU.',
    color: '#8B5CF6'
  },
  {
    icon: '💾',
    title: 'NVMe Storage',
    short: 'PCIe enables 14+ GB/s SSD speeds',
    tagline: 'Storage at memory speeds',
    description: 'NVMe SSDs connect directly via PCIe lanes, eliminating the SATA bottleneck. PCIe 5.0 x4 drives achieve 14+ GB/s sequential reads, revolutionizing storage performance.',
    connection: 'NVMe performance is directly limited by PCIe bandwidth. A PCIe 4.0 x4 drive maxes at ~7 GB/s, while PCIe 5.0 x4 doubles this to ~14 GB/s.',
    howItWorks: 'NVMe is a purpose-built protocol for flash storage over PCIe. It supports 64K queues with 64K commands each, enabling massive parallelism that saturates PCIe bandwidth.',
    stats: [
      { value: '14+', label: 'GB/s read speed', icon: '⚡' },
      { value: '2M', label: 'IOPS', icon: '📊' },
      { value: '$50B', label: 'SSD market', icon: '📈' }
    ],
    examples: ['Samsung 990 Pro', 'WD Black SN850X', 'Crucial T700', 'Seagate FireCuda'],
    companies: ['Samsung', 'Western Digital', 'Micron', 'SK Hynix'],
    futureImpact: 'PCIe 6.0 SSDs will approach 28 GB/s, blurring the line between storage and memory tiers.',
    color: '#06B6D4'
  },
  {
    icon: '🌐',
    title: 'Network Interface Cards',
    short: 'High-speed networking demands PCIe bandwidth',
    tagline: 'Connecting data centers at scale',
    description: 'Modern NICs support 100-400 Gbps speeds, requiring PCIe 4.0 x16 or PCIe 5.0 x8 to avoid becoming the bottleneck. Data center networks depend on this bandwidth.',
    connection: 'A 400 Gbps NIC needs 50 GB/s of PCIe bandwidth. PCIe 5.0 x8 provides 32 GB/s bidirectional, requiring careful attention to avoid bottlenecks.',
    howItWorks: 'DMA engines transfer packets directly between NIC and system memory over PCIe. RDMA bypasses the CPU entirely for ultra-low latency.',
    stats: [
      { value: '400', label: 'Gbps per port', icon: '🌐' },
      { value: '50', label: 'GB/s required', icon: '⚡' },
      { value: '$8B', label: 'NIC market', icon: '📈' }
    ],
    examples: ['NVIDIA ConnectX-7', 'Intel E810', 'Broadcom Thor', 'AMD Pensando'],
    companies: ['NVIDIA Mellanox', 'Intel', 'Broadcom', 'Marvell'],
    futureImpact: '800 Gbps and 1.6 Tbps NICs will require PCIe 6.0 and CXL for next-generation data center fabrics.',
    color: '#3B82F6'
  }
];

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PCIeBandwidthRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Overhead Lab',
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
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pcie: '#3b82f6',
  nvlink: '#22c55e',
  gpu: '#8b5cf6',
  cpu: '#f97316',
};

// PCIe Generation specs (GB/s per lane)
const PCIE_SPECS = {
  'PCIe 3.0': { perLane: 0.985, maxLanes: 16, color: '#3b82f6' },
  'PCIe 4.0': { perLane: 1.969, maxLanes: 16, color: '#8b5cf6' },
  'PCIe 5.0': { perLane: 3.938, maxLanes: 16, color: '#06b6d4' },
  'NVLink 3': { perLane: 25, maxLanes: 12, color: '#22c55e' },
  'NVLink 4': { perLane: 50, maxLanes: 18, color: '#10b981' },
};

const testQuestions = [
  // Q1: Core concept - what is PCIe (Easy)
  {
    scenario: "You're building your first custom PC and encounter the term 'PCIe' repeatedly in motherboard specifications. The manual mentions PCIe slots for graphics cards, SSDs, and expansion cards.",
    question: "What is PCIe and what role does it play in a computer system?",
    options: [
      { id: 'a', label: "PCIe is a type of memory that stores data temporarily for the CPU" },
      { id: 'b', label: "PCIe is a high-speed serial interface standard that connects expansion cards (GPUs, SSDs, network cards) to the motherboard", correct: true },
      { id: 'c', label: "PCIe is a cooling technology that manages heat dissipation across components" },
      { id: 'd', label: "PCIe is a power delivery standard that supplies electricity to peripherals" },
    ],
    explanation: "PCIe (Peripheral Component Interconnect Express) is the standard high-speed serial interface used to connect expansion cards to a computer's motherboard. It replaced older parallel buses like PCI and AGP, offering much higher bandwidth through point-to-point serial connections. PCIe is used for GPUs, NVMe SSDs, network cards, capture cards, and many other peripherals."
  },
  // Q2: Lane width (x1, x4, x16) (Easy-Medium)
  {
    scenario: "You're installing an NVIDIA RTX 4090 GPU which requires a PCIe x16 slot. Your motherboard has x16, x8, x4, and x1 slots available, and you're wondering if you could use a different slot.",
    question: "What does the 'x16' designation mean, and what happens if you install a x16 card in an x8 physical slot?",
    options: [
      { id: 'a', label: "x16 means 16 GB/s speed; the card won't physically fit in an x8 slot" },
      { id: 'b', label: "x16 indicates 16 parallel data lanes; the card will work in an x8 slot but at half the bandwidth", correct: true },
      { id: 'c', label: "x16 refers to the PCIe generation; the card will run at generation 8 instead" },
      { id: 'd', label: "x16 specifies power requirements; the card will throttle due to insufficient power" },
    ],
    explanation: "The 'x' number indicates the number of parallel data lanes. A PCIe x16 connection uses 16 lanes simultaneously, like a 16-lane highway. PCIe cards can operate in slots with fewer lanes than their maximum (backward compatibility), but bandwidth is reduced proportionally. An x16 card in an x8 slot runs at half bandwidth. Physical slot size may or may not match electrical lanes - some x16 physical slots are wired for only x8 or x4."
  },
  // Q3: PCIe generations comparison (Medium)
  {
    scenario: "Your company is upgrading servers and must choose between motherboards supporting PCIe 3.0, 4.0, or 5.0. The price increases significantly with each generation, and you need to justify the expense.",
    question: "How does bandwidth scale across PCIe generations for the same lane configuration?",
    options: [
      { id: 'a', label: "Each generation adds approximately 2 GB/s to the total bandwidth" },
      { id: 'b', label: "Each generation roughly doubles the per-lane bandwidth compared to its predecessor", correct: true },
      { id: 'c', label: "Bandwidth remains constant; newer generations only reduce latency" },
      { id: 'd', label: "Each generation increases bandwidth by 50% while reducing power consumption" },
    ],
    explanation: "Each PCIe generation approximately doubles the per-lane bandwidth. PCIe 3.0 provides ~1 GB/s per lane, PCIe 4.0 provides ~2 GB/s per lane, and PCIe 5.0 provides ~4 GB/s per lane. This means a PCIe 5.0 x16 slot (~64 GB/s) offers 4x the bandwidth of PCIe 3.0 x16 (~16 GB/s). The doubling comes from increased signaling rates: 8 GT/s for 3.0, 16 GT/s for 4.0, and 32 GT/s for 5.0."
  },
  // Q4: Bandwidth calculation (Medium)
  {
    scenario: "You're specifying hardware requirements for an AI workstation. The vendor asks whether you need PCIe 4.0 x16 or PCIe 5.0 x8 for the GPU, claiming both have similar total bandwidth.",
    question: "What is the approximate unidirectional bandwidth for PCIe 4.0 x16 and PCIe 5.0 x8?",
    options: [
      { id: 'a', label: "PCIe 4.0 x16 = 16 GB/s; PCIe 5.0 x8 = 40 GB/s" },
      { id: 'b', label: "PCIe 4.0 x16 = 64 GB/s; PCIe 5.0 x8 = 32 GB/s" },
      { id: 'c', label: "PCIe 4.0 x16 = ~32 GB/s; PCIe 5.0 x8 = ~32 GB/s (approximately equal)", correct: true },
      { id: 'd', label: "PCIe 4.0 x16 = 128 GB/s; PCIe 5.0 x8 = 64 GB/s" },
    ],
    explanation: "Bandwidth calculation: (per-lane bandwidth) x (number of lanes). PCIe 4.0 provides ~2 GB/s per lane, so x16 = ~32 GB/s. PCIe 5.0 provides ~4 GB/s per lane, so x8 = ~32 GB/s. The vendor is correct - both configurations provide similar unidirectional bandwidth. This flexibility allows system designers to trade lane count for generation, useful when lane allocation is constrained."
  },
  // Q5: GPU bottleneck from PCIe (Medium-Hard)
  {
    scenario: "A gaming enthusiast installed an RTX 4090 in their older PCIe 3.0 x16 motherboard. Benchmarks show the GPU performs at 95-98% of its rated performance compared to a PCIe 4.0 system.",
    question: "Why does the GPU still achieve near-full performance despite having half the PCIe bandwidth?",
    options: [
      { id: 'a', label: "Modern GPUs compress data before sending it over PCIe, effectively doubling bandwidth" },
      { id: 'b', label: "The GPU has internal caches that store frequently accessed data, reducing PCIe traffic" },
      { id: 'c', label: "Most GPU workloads are compute-bound, not bandwidth-bound; the GPU processes data faster than PCIe can feed it anyway", correct: true },
      { id: 'd', label: "PCIe 3.0 automatically overclocks when connected to high-end GPUs" },
    ],
    explanation: "Modern GPUs are primarily compute-bound for most gaming and rendering workloads. Once textures and geometry are loaded into GPU memory (VRAM), the GPU processes this data using its internal memory bandwidth (900+ GB/s on high-end cards). PCIe is mainly used for initial asset loading, frame buffer transfers, and CPU-GPU communication. The internal processing vastly outweighs PCIe transfers, so halving PCIe bandwidth has minimal impact on frame rates."
  },
  // Q6: NVMe SSD performance (Hard)
  {
    scenario: "You're comparing NVMe SSDs for a video editing workstation. A PCIe 4.0 x4 SSD advertises 7,000 MB/s read speeds, while a PCIe 3.0 x4 SSD shows 3,500 MB/s.",
    question: "What primarily determines the maximum theoretical bandwidth for an NVMe SSD, and why can't a PCIe 3.0 x4 SSD exceed ~3,500 MB/s?",
    options: [
      { id: 'a', label: "The SSD's internal flash memory chips limit speed; PCIe version is irrelevant" },
      { id: 'b', label: "The PCIe interface creates a hard bandwidth ceiling; PCIe 3.0 x4 maxes out at ~3.9 GB/s theoretical (~3.5 GB/s practical)", correct: true },
      { id: 'c', label: "NVMe protocol overhead consumes 50% of available bandwidth regardless of PCIe version" },
      { id: 'd', label: "Operating system drivers artificially limit PCIe 3.0 devices to maintain compatibility" },
    ],
    explanation: "PCIe creates an absolute bandwidth ceiling for connected devices. PCIe 3.0 x4 provides ~3.94 GB/s theoretical maximum (accounting for 128b/130b encoding). After NVMe protocol overhead and controller inefficiencies, practical limits are ~3.5 GB/s. PCIe 4.0 x4 doubles this to ~7.88 GB/s theoretical, enabling the faster SSDs. This is why cutting-edge SSDs require PCIe 4.0 or 5.0 - the flash chips can actually exceed PCIe 3.0's bandwidth limit."
  },
  // Q7: PCIe switching and routing (Hard)
  {
    scenario: "Your server has 4 GPUs, but the CPU only provides 64 PCIe lanes total. The system uses a PCIe switch chip to connect all GPUs with x16 connections each, totaling 64 lanes on the device side.",
    question: "What is the limitation of using a PCIe switch to expand connectivity beyond the CPU's native lane count?",
    options: [
      { id: 'a', label: "PCIe switches add 5ms latency to every transaction, making real-time applications impossible" },
      { id: 'b', label: "All devices behind the switch share the upstream bandwidth to the CPU; 4 GPUs at x16 share only the CPU's available lanes", correct: true },
      { id: 'c', label: "PCIe switches can only route data between devices, not between devices and the CPU" },
      { id: 'd', label: "Switches require proprietary drivers that are incompatible with standard PCIe devices" },
    ],
    explanation: "PCIe switches (like PLX/Broadcom chips) allow multiple devices to connect through fewer CPU lanes, but they create a bandwidth bottleneck. If 4 GPUs connect via x16 to a switch, but the switch connects to the CPU via only x16, all four GPUs share that x16 upstream bandwidth. Peer-to-peer traffic between GPUs can use full bandwidth through the switch, but CPU communication is constrained. This is why high-end workstations use CPUs with 128 lanes (like AMD Threadripper)."
  },
  // Q8: CXL and memory expansion (Hard)
  {
    scenario: "A new server technology called CXL (Compute Express Link) runs over PCIe 5.0 physical infrastructure. It promises to allow memory expansion and sharing between CPUs and accelerators.",
    question: "What capability does CXL provide that standard PCIe does not support?",
    options: [
      { id: 'a', label: "CXL provides 10x higher bandwidth than PCIe 5.0 using the same physical lanes" },
      { id: 'b', label: "CXL enables cache-coherent memory access, allowing CPUs and devices to share memory with hardware-managed consistency", correct: true },
      { id: 'c', label: "CXL eliminates the need for device drivers by implementing a universal hardware interface" },
      { id: 'd', label: "CXL allows wireless data transmission between PCIe slots without physical connections" },
    ],
    explanation: "CXL (Compute Express Link) builds on PCIe 5.0's physical layer but adds cache-coherent memory semantics. Standard PCIe treats devices as I/O endpoints requiring explicit DMA transfers. CXL allows devices to participate in the CPU's cache coherency domain, meaning attached memory (like CXL memory expanders or accelerator memory) appears as system memory with hardware-managed consistency. This enables memory pooling, expansion beyond DIMM slot limits, and efficient accelerator memory sharing without software overhead."
  },
  // Q9: Encoding overhead (Hard)
  {
    scenario: "A colleague calculates PCIe 5.0 x16 bandwidth as 32 GT/s x 16 lanes = 512 Gb/s = 64 GB/s. But specification sheets show ~63 GB/s effective bandwidth.",
    question: "What causes the approximately 1.5% reduction from the raw gigatransfers calculation to actual usable bandwidth?",
    options: [
      { id: 'a', label: "Electrical signal degradation over the physical traces loses approximately 1.5% of data" },
      { id: 'b', label: "The PCIe controller reserves 1.5% of bandwidth for error correction retransmissions" },
      { id: 'c', label: "128b/130b encoding adds 2 overhead bits per 128 data bits for synchronization and framing", correct: true },
      { id: 'd', label: "Operating systems reserve bandwidth for system management interrupts" },
    ],
    explanation: "PCIe 3.0 and later use 128b/130b encoding: every 128 bits of payload requires 130 bits on the wire (2 extra bits for synchronization and framing). This gives 128/130 = 98.46% efficiency, explaining the ~1.5% overhead. Notably, PCIe 1.0 and 2.0 used 8b/10b encoding with only 80% efficiency (8 data bits per 10 transmitted). The switch to 128b/130b in PCIe 3.0 significantly improved effective bandwidth relative to signaling rate, partially explaining the generational bandwidth jumps."
  },
  // Q10: Power delivery over PCIe (Hard)
  {
    scenario: "You're designing a custom PCIe expansion card. The specification indicates that a x16 slot can provide up to 75W of power directly through the slot connector, but high-power GPUs require additional power cables.",
    question: "How does PCIe slot power delivery work, and why do powerful GPUs need supplemental power connectors?",
    options: [
      { id: 'a', label: "PCIe slots only provide 5V power; GPUs need 12V which requires separate cables" },
      { id: 'b', label: "PCIe power is AC while GPU cores require DC power conversion" },
      { id: 'c', label: "The 75W slot limit is insufficient for GPUs drawing 300-450W; additional 8-pin connectors each provide up to 150W at 12V", correct: true },
      { id: 'd', label: "PCIe power fluctuates with data transfer rates, making it unreliable for sustained GPU loads" },
    ],
    explanation: "PCIe slots provide both 3.3V and 12V power rails, with a maximum combined power of 75W for x16 slots (66W from 12V, 9W from 3.3V). Modern high-end GPUs consume 300-450W under load, far exceeding slot power. Supplemental PCIe power connectors (6-pin = 75W, 8-pin = 150W, 12VHPWR = 600W) connect directly to the PSU to deliver the additional power. The slot power is typically used for initial card detection and low-power states, while heavy computation runs from supplemental power."
  },
];

// Legacy alias for backward compatibility
const TEST_QUESTIONS = testQuestions;

const TRANSFER_APPS = [
  {
    title: 'Data Center GPU Clusters',
    description: 'Modern AI data centers use NVLink and NVSwitch to connect up to 8 GPUs with 900 GB/s total bandwidth, enabling training of trillion-parameter models.',
    insight: 'DGX H100: 900 GB/s NVLink',
  },
  {
    title: 'Gaming Multi-GPU (SLI/CrossFire)',
    description: 'Consumer multi-GPU gaming struggled because PCIe bandwidth created bottlenecks when sharing frame data between GPUs.',
    insight: 'Why SLI died: PCIe too slow',
  },
  {
    title: 'Distributed Training',
    description: 'When training across multiple machines, network bandwidth (InfiniBand 400 Gb/s) becomes the bottleneck, not PCIe.',
    insight: '400 Gb/s = 50 GB/s network',
  },
  {
    title: 'Apple Silicon Unified Memory',
    description: 'Apple M-series chips share memory between CPU and GPU with 400+ GB/s bandwidth, eliminating PCIe copying entirely.',
    insight: 'M3 Max: 400 GB/s unified',
  },
];

const PCIeBandwidthRenderer: React.FC<PCIeBandwidthRendererProps> = ({
  gamePhase,
}) => {
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
  const [pcieGen, setPcieGen] = useState<keyof typeof PCIE_SPECS>('PCIe 4.0');
  const [numLanes, setNumLanes] = useState(16);
  const [numGPUs, setNumGPUs] = useState(2);
  const [modelSize, setModelSize] = useState(10); // GB
  const [useNVLink, setUseNVLink] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

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

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
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

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate bandwidth and efficiency
  const spec = PCIE_SPECS[pcieGen];
  const pcieBandwidth = spec.perLane * numLanes;
  const nvlinkBandwidth = useNVLink ? (pcieGen.includes('5') ? 900 : 600) : 0;
  const effectiveBandwidth = useNVLink ? nvlinkBandwidth : pcieBandwidth;

  // Transfer time calculation
  const transferTimePerGPU = (modelSize * 1000) / effectiveBandwidth; // ms for 1GB chunks
  const communicationOverhead = numGPUs > 1 ? (numGPUs - 1) * 0.15 : 0; // 15% overhead per additional GPU
  const scalingEfficiency = numGPUs > 1 ? 1 / (1 + communicationOverhead) : 1;
  const effectiveSpeedup = numGPUs * scalingEfficiency;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctOption = TEST_QUESTIONS[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 700;
    const height = 400;
    const dataFlowOffset = animationFrame % 60;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'transparent', borderRadius: '16px' }}
      >
        {/* Premium SVG Defs Section */}
        <defs>
          {/* Premium CPU chip gradient with metallic depth */}
          <linearGradient id="pcieCpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          {/* CPU die heat glow */}
          <radialGradient id="pcieCpuGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fdba74" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#fb923c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>

          {/* GPU chip gradient with purple depth */}
          <linearGradient id="pcieGpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="25%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="75%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>

          {/* GPU processing glow */}
          <radialGradient id="pcieGpuGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>

          {/* PCIe slot gradient - blue metallic */}
          <linearGradient id="pciePcieSlotGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="20%" stopColor="#1e40af" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* PCIe lane data flow gradient */}
          <linearGradient id="pcieLaneFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* NVLink high-speed gradient - green with energy */}
          <linearGradient id="pcieNvlinkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="25%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="75%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* NVLink data burst glow */}
          <radialGradient id="pcieNvlinkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Motherboard PCB gradient */}
          <linearGradient id="pciePcbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="30%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="70%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Data packet glow effect */}
          <radialGradient id="pcieDataPacketGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* Bandwidth meter gradient - cyan energy */}
          <linearGradient id="pcieBandwidthMeterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>

          {/* Efficiency meter gradient - success to warning */}
          <linearGradient id="pcieEfficiencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Warning efficiency gradient */}
          <linearGradient id="pcieWarningGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>

          {/* Background lab gradient */}
          <linearGradient id="pcieLabBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="30%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Premium glow filter for CPU */}
          <filter id="pcieCpuGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Premium glow filter for GPU */}
          <filter id="pcieGpuGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Data flow glow filter */}
          <filter id="pcieDataGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* NVLink intense glow filter */}
          <filter id="pcieNvlinkGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle shadow filter */}
          <filter id="pcieShadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* PCB trace pattern */}
          <pattern id="pciePcbTracePattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="#0d9488" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#0d9488" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="10" cy="10" r="1" fill="#0d9488" fillOpacity="0.4" />
          </pattern>

          {/* Lane indicator pattern */}
          <pattern id="pcieLanePattern" width="8" height="4" patternUnits="userSpaceOnUse">
            <rect width="6" height="3" rx="1" fill="#60a5fa" fillOpacity="0.6" />
          </pattern>
        </defs>

        {/* Premium dark lab background */}
        <rect width={width} height={height} fill="url(#pcieLabBgGradient)" rx="16" />

        {/* Subtle grid overlay */}
        <rect width={width} height={height} fill="url(#pciePcbTracePattern)" opacity="0.4" rx="16" />

        {/* === MOTHERBOARD BASE === */}
        <rect x="15" y="320" width={width - 30} height="70" rx="8" fill="url(#pciePcbGradient)" filter="url(#pcieShadowFilter)" />
        <rect x="15" y="320" width={width - 30} height="4" rx="2" fill="#10b981" opacity="0.3" />

        {/* PCB mounting holes */}
        {[50, 175, 350, 525, 650].map((x, i) => (
          <g key={`mount-${i}`}>
            <circle cx={x} cy="355" r="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <circle cx={x} cy="355" r="3" fill="#0f172a" />
          </g>
        ))}

        {/* === PREMIUM CPU WITH HEATSINK === */}
        <g transform="translate(40, 150)">
          {/* CPU socket base */}
          <rect x="-10" y="-10" width="110" height="100" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="2" />

          {/* CPU die with glow */}
          <rect x="0" y="0" width="90" height="80" rx="6" fill="url(#pcieCpuGradient)" filter="url(#pcieCpuGlowFilter)" />

          {/* CPU core pattern */}
          <g opacity="0.4">
            {[0, 1, 2, 3].map((row) => (
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`core-${row}-${col}`}
                  x={8 + col * 20}
                  y={8 + row * 18}
                  width="16"
                  height="14"
                  rx="2"
                  fill="#fdba74"
                  opacity={0.5 + Math.random() * 0.5}
                >
                  <animate
                    attributeName="opacity"
                    values={`${0.3 + Math.random() * 0.3};${0.6 + Math.random() * 0.4};${0.3 + Math.random() * 0.3}`}
                    dur={`${0.5 + Math.random() * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              ))
            ))}
          </g>

          {/* CPU label */}
          <text x="45" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">CPU</text>
          <text x="45" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="9">Host Processor</text>

          {/* Heat indicator glow */}
          <ellipse cx="45" cy="40" rx="35" ry="30" fill="url(#pcieCpuGlow)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* === PCIE SLOT VISUALIZATION === */}
        <g transform="translate(160, 180)">
          {/* PCIe slot housing */}
          <rect x="0" y="-5" width="120" height="50" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />

          {/* PCIe slot connector */}
          <rect x="5" y="5" width="110" height="30" rx="3" fill="url(#pciePcieSlotGradient)" />

          {/* Lane indicators based on numLanes */}
          <g>
            {Array.from({ length: numLanes }).map((_, i) => (
              <rect
                key={`lane-${i}`}
                x={8 + i * (104 / 16)}
                y="10"
                width={Math.max(2, (100 / 16) - 2)}
                height="20"
                rx="1"
                fill="#60a5fa"
                opacity={0.6 + (i % 2) * 0.2}
              >
                <animate
                  attributeName="opacity"
                  values="0.5;0.9;0.5"
                  dur={`${0.3 + (i * 0.05)}s`}
                  repeatCount="indefinite"
                />
              </rect>
            ))}
          </g>

          {/* PCIe generation label */}
          <rect x="30" y="-30" width="60" height="20" rx="4" fill="#1e293b" stroke={colors.pcie} strokeWidth="1" />
          <text x="60" y="-16" textAnchor="middle" fill={colors.pcie} fontSize="10" fontWeight="bold">{pcieGen}</text>

          {/* Bandwidth label */}
          <text x="60" y="60" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            x{numLanes} = {pcieBandwidth.toFixed(1)} GB/s
          </text>
        </g>

        {/* === DATA FLOW ANIMATION === */}
        <g>
          {/* Main PCIe data bus path */}
          <path
            d={`M 130 190 Q 180 190 280 190`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeOpacity="0.2"
            strokeLinecap="round"
          />

          {/* Animated data packets on PCIe bus */}
          {[0, 15, 30, 45].map((offset, i) => {
            const progress = ((dataFlowOffset + offset) % 60) / 60;
            const x = 130 + progress * 150;
            return (
              <g key={`packet-${i}`} filter="url(#pcieDataGlowFilter)">
                <rect
                  x={x}
                  y={185}
                  width="12"
                  height="10"
                  rx="2"
                  fill="url(#pcieLaneFlowGradient)"
                />
                <ellipse cx={x + 6} cy={190} rx="8" ry="6" fill="url(#pcieDataPacketGlow)" opacity="0.5" />
              </g>
            );
          })}
        </g>

        {/* === PREMIUM GPU CARDS === */}
        {Array.from({ length: Math.min(numGPUs, 4) }).map((_, i) => {
          const gpuX = 320;
          const gpuY = 50 + i * 80;
          const isActive = i < numGPUs;

          return (
            <g key={`gpu-${i}`} transform={`translate(${gpuX}, ${gpuY})`}>
              {/* GPU card body */}
              <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#334155" strokeWidth="1.5" filter="url(#pcieShadowFilter)" />

              {/* GPU die with gradient */}
              <rect x="10" y="8" width="60" height="44" rx="4" fill="url(#pcieGpuGradient)" filter="url(#pcieGpuGlowFilter)" />

              {/* GPU processing cores visualization */}
              <g opacity="0.5">
                {[0, 1, 2, 3].map((row) => (
                  [0, 1, 2, 3, 4].map((col) => (
                    <rect
                      key={`gpucore-${i}-${row}-${col}`}
                      x={14 + col * 11}
                      y={12 + row * 10}
                      width="8"
                      height="7"
                      rx="1"
                      fill="#c4b5fd"
                    >
                      <animate
                        attributeName="opacity"
                        values={`${0.2 + Math.random() * 0.3};${0.7 + Math.random() * 0.3};${0.2 + Math.random() * 0.3}`}
                        dur={`${0.2 + Math.random() * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </rect>
                  ))
                ))}
              </g>

              {/* VRAM modules */}
              {[0, 1, 2, 3].map((j) => (
                <rect key={`vram-${i}-${j}`} x={80 + (j % 2) * 25} y={10 + Math.floor(j / 2) * 22} width="20" height="18" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
              ))}

              {/* GPU label */}
              <text x="70" y="70" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">GPU {i + 1}</text>

              {/* PCIe connection line with animation */}
              <line
                x1="-40"
                y1="30"
                x2="0"
                y2="30"
                stroke={colors.pcie}
                strokeWidth="3"
                strokeDasharray="6,3"
                opacity="0.7"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-9" dur="0.5s" repeatCount="indefinite" />
              </line>

              {/* Processing glow */}
              <ellipse cx="40" cy="30" rx="25" ry="20" fill="url(#pcieGpuGlow)" opacity="0.4">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          );
        })}

        {/* === NVLINK CONNECTIONS === */}
        {useNVLink && numGPUs > 1 && (
          <g>
            {Array.from({ length: Math.min(numGPUs - 1, 3) }).map((_, i) => {
              const y1 = 80 + i * 80 + 30;
              const y2 = 80 + (i + 1) * 80 + 30;
              return (
                <g key={`nvlink-${i}`}>
                  {/* NVLink connection bar */}
                  <rect
                    x="475"
                    y={y1}
                    width="12"
                    height={y2 - y1}
                    rx="3"
                    fill="url(#pcieNvlinkGradient)"
                    filter="url(#pcieNvlinkGlowFilter)"
                  />

                  {/* Animated data flow on NVLink */}
                  {[0, 1, 2].map((j) => {
                    const flowY = y1 + ((dataFlowOffset * 2 + j * 20) % (y2 - y1));
                    return (
                      <ellipse
                        key={`nvflow-${i}-${j}`}
                        cx="481"
                        cy={flowY}
                        rx="4"
                        ry="3"
                        fill="url(#pcieNvlinkGlow)"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* NVLink label */}
            <g transform="translate(500, 160)">
              <rect x="-5" y="-15" width="80" height="40" rx="6" fill="#0f172a" stroke={colors.nvlink} strokeWidth="1" />
              <text x="35" y="2" textAnchor="middle" fill={colors.nvlink} fontSize="11" fontWeight="bold">NVLink</text>
              <text x="35" y="16" textAnchor="middle" fill={colors.textMuted} fontSize="9">{nvlinkBandwidth} GB/s</text>
            </g>
          </g>
        )}

        {/* === BANDWIDTH METER === */}
        <g transform="translate(40, 265)">
          <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Effective Bandwidth</text>

          {/* Meter background */}
          <rect x="0" y="8" width="200" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Meter fill with gradient */}
          <rect
            x="2"
            y="10"
            width={Math.min(196 * (effectiveBandwidth / 1000), 196)}
            height="12"
            rx="3"
            fill={useNVLink ? "url(#pcieNvlinkGradient)" : "url(#pcieBandwidthMeterGradient)"}
          >
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
          </rect>

          {/* Value label */}
          <text x="210" y="22" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
            {effectiveBandwidth.toFixed(0)} GB/s
          </text>
        </g>

        {/* === SCALING EFFICIENCY METER === */}
        <g transform="translate(320, 265)">
          <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Scaling Efficiency</text>

          {/* Meter background */}
          <rect x="0" y="8" width="200" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Meter fill with conditional gradient */}
          <rect
            x="2"
            y="10"
            width={196 * scalingEfficiency}
            height="12"
            rx="3"
            fill={scalingEfficiency > 0.8 ? "url(#pcieEfficiencyGradient)" : "url(#pcieWarningGradient)"}
          />

          {/* Value label */}
          <text x="210" y="22" fill={scalingEfficiency > 0.8 ? colors.success : colors.warning} fontSize="12" fontWeight="bold">
            {(scalingEfficiency * 100).toFixed(0)}%
          </text>
        </g>

        {/* === STATS DISPLAY === */}
        <g transform="translate(600, 320)">
          <rect x="-10" y="-10" width="95" height="70" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="38" y="8" textAnchor="middle" fill={colors.accent} fontSize="9" fontWeight="bold">PERFORMANCE</text>
          <text x="38" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            {effectiveSpeedup.toFixed(2)}x
          </text>
          <text x="38" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="8">
            Speedup
          </text>
          <text x="38" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="9">
            {numGPUs} GPU{numGPUs > 1 ? 's' : ''}
          </text>
        </g>

        {/* === LABELS === */}
        <text x="350" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
          PCIe Bandwidth Architecture
        </text>
        <text x="350" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="10">
          CPU ➔ PCIe {pcieGen} x{numLanes} ➔ GPU{numGPUs > 1 ? 's' : ''} {useNVLink ? '+ NVLink' : ''}
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Generation
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'] as const).map(gen => (
            <button
              key={gen}
              onClick={() => setPcieGen(gen)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: pcieGen === gen ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: pcieGen === gen ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {gen}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Lanes: x{numLanes}
        </label>
        <input
          type="range"
          min={1}
          max={16}
          value={numLanes}
          onChange={(e) => setNumLanes(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of GPUs: {numGPUs}
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={numGPUs}
          onChange={(e) => setNumGPUs(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.gpu }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize} GB
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setUseNVLink(!useNVLink)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: useNVLink ? colors.nvlink : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {useNVLink ? 'NVLink: ON' : 'NVLink: OFF'}
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          Direct GPU-to-GPU connection
        </span>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        zIndex: 1000,
        gap: '12px'
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          PCIe Bandwidth
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canProceed: boolean, buttonText: string, action?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={action || goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
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
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            PCIe Bandwidth Limits
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            Why can't you just add more GPUs to make training faster?
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
            Every GPU connects to your system through a PCIe slot - a highway with limited lanes.
            When GPUs need to share data during AI training, this highway can become a traffic jam.
          </p>
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              PCIe 4.0 x16: ~32 GB/s | GPU Memory Bandwidth: ~900 GB/s
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              That's a 28x bottleneck between the GPU and the rest of the system!
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'linear', text: '2 GPUs = 2x faster, 8 GPUs = 8x faster (linear scaling)' },
      { id: 'diminishing', text: 'Each added GPU gives less speedup than the previous' },
      { id: 'constant', text: 'More GPUs don\'t help - one GPU does all the work' },
      { id: 'negative', text: 'Too many GPUs actually slows things down' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens to training speed as you add more GPUs?
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
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : colors.bgCard,
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
              background: prediction === 'diminishing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'diminishing' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'diminishing' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'diminishing' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Due to communication overhead, each additional GPU provides diminishing returns.
                The bandwidth bottleneck means GPUs spend time waiting for data instead of computing.
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
          PCIe Bandwidth Lab
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
            <li>Doubling PCIe lanes doubles bandwidth</li>
            <li>Each PCIe generation approximately doubles per-lane speed</li>
            <li>NVLink provides 10-30x more GPU-to-GPU bandwidth than PCIe</li>
            <li>Communication overhead grows with GPU count</li>
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
          Understanding PCIe Bandwidth
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.pcie, marginBottom: '8px' }}>PCIe Bandwidth Formula</h3>
            <p style={{ color: colors.textPrimary, fontFamily: 'monospace', fontSize: '14px' }}>
              Total Bandwidth = Per-Lane Speed x Number of Lanes
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
              PCIe 4.0 x16 = 1.97 GB/s x 16 = 31.5 GB/s bidirectional
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Amdahl's Law</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Speedup is limited by the sequential (non-parallelizable) portion of your workload.
              With GPUs, communication is often the sequential bottleneck.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.nvlink, marginBottom: '8px' }}>Why NVLink Matters</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              NVLink provides direct GPU-to-GPU communication at 600-900 GB/s,
              bypassing the CPU and PCIe bottleneck entirely.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Communication Overhead')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'none', text: 'Communication overhead is negligible with fast interconnects' },
      { id: 'linear', text: 'Overhead grows linearly with GPU count' },
      { id: 'quadratic', text: 'Overhead can grow quadratically (all-to-all communication)' },
      { id: 'fixed', text: 'Overhead is fixed regardless of GPU count' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Communication Overhead
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            During training, GPUs must synchronize gradients. How does this scale?
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
              background: twistPrediction === 'quadratic' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'quadratic' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'quadratic' ? 'Correct!' : 'Partially right!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Naive all-reduce has O(n) communication, but with ring-reduce it's O(1) per GPU.
                However, synchronization barriers and network topology still cause overhead that limits scaling.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Communication Patterns')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Communication Overhead Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Gradient Synchronization</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
            When training with data parallelism, each GPU computes gradients on different data.
            Before updating weights, all gradients must be averaged across all GPUs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.error, fontSize: '12px', fontWeight: 'bold' }}>Naive All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Send all to one, then broadcast</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(N) data movement</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 'bold' }}>Ring All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Circular data passing</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(1) per GPU</p>
            </div>
          </div>
        </div>

        {renderControls()}
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Communication Limits Multi-GPU Scaling
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Problem</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Even with perfect algorithms, physical bandwidth limits how fast data can move.
              8 GPUs training a large model might only achieve 5-6x speedup, not 8x.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li>NVLink for high-bandwidth GPU interconnect</li>
              <li>Gradient compression to reduce data volume</li>
              <li>Overlapping computation with communication</li>
              <li>Model parallelism instead of data parallelism</li>
            </ul>
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
                background: 'rgba(6, 182, 212, 0.1)',
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
                background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `3px solid ${passed ? colors.success : colors.warning}`
              }}>
                {score === totalQuestions ? 'Trophy' : score >= 9 ? 'Star' : score >= 7 ? 'Check' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px', marginBottom: '8px' }}>
                {score}/{totalQuestions} Correct
              </h2>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {score === totalQuestions ? "Perfect! You've mastered PCIe bandwidth!" :
                 score >= 9 ? 'Excellent! You deeply understand PCIe concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - hardware concepts take time!'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(new Array(10).fill(null));
                    setCurrentTestIndex(0);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
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
                  onClick={() => goNext()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
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

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
                Question-by-Question Review
              </p>
            </div>

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
                    border: `2px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                  }}>
                    <div style={{
                      padding: '16px',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white'
                        }}>
                          {isCorrect ? 'Y' : 'X'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textPrimary, margin: 0 }}>
                            Question {i + 1}
                          </p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                            {q.question}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: isCorrect ? colors.success : colors.error
                        }}>
                          {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                        </p>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                          {userOption?.label || 'No answer selected'}
                        </p>
                      </div>

                      {!isCorrect && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '4px',
                            color: colors.success
                          }}>
                            Correct Answer
                          </p>
                          <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                            {correctOption?.label}
                          </p>
                        </div>
                      )}

                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)'
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: colors.accent
                        }}>
                          Why?
                        </p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '16px',
              textAlign: 'center',
              background: colors.bgCard,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '12px', color: colors.textSecondary }}>
                {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
              </p>
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(new Array(10).fill(null));
                  setCurrentTestIndex(0);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: colors.accent,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Retake Test
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.warning
            }}>
              Knowledge Test
            </p>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: colors.textPrimary }}>
              Question {currentTestIndex + 1} of {totalQuestions}
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalQuestions }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: '8px',
                    flex: 1,
                    borderRadius: '9999px',
                    background: i === currentTestIndex ? colors.warning :
                               testAnswers[i] !== null ? colors.success :
                               'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.accent
            }}>
              Scenario
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
              {currentQ.scenario}
            </p>
          </div>

          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px', color: colors.textPrimary }}>
            {currentQ.question}
          </p>

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
                  background: testAnswers[currentTestIndex] === opt.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
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
                    fontWeight: 'bold',
                    color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textMuted
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textSecondary,
                  margin: 0
                }}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>

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
                Submit
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
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.nvlink})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          PCIe Bandwidth Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand why "just add more GPUs" doesn't always work
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>PCIe bandwidth limits (lanes x generation)</li>
            <li>NVLink for high-speed GPU interconnect</li>
            <li>Communication overhead in multi-GPU training</li>
            <li>Diminishing returns with scaling</li>
            <li>Amdahl's Law and parallel efficiency</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "The fastest GPU is the one that doesn't wait for data."
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
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      {renderProgressBar()}
      {/* Main content with padding for fixed header */}
      <div style={{ paddingTop: '60px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default PCIeBandwidthRenderer;
