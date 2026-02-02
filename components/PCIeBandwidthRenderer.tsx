'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// PCIe Bandwidth - Complete 10-Phase Game
// Why you can't just add more GPUs to make training faster
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

interface PCIeBandwidthRendererProps {
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
    scenario: "You're building your first custom PC and encounter the term 'PCIe' repeatedly in motherboard specifications. The manual mentions PCIe slots for graphics cards, SSDs, and expansion cards.",
    question: "What is PCIe and what role does it play in a computer system?",
    options: [
      { id: 'a', label: "PCIe is a type of memory that stores data temporarily for the CPU" },
      { id: 'b', label: "PCIe is a high-speed serial interface standard that connects expansion cards (GPUs, SSDs, network cards) to the motherboard", correct: true },
      { id: 'c', label: "PCIe is a cooling technology that manages heat dissipation across components" },
      { id: 'd', label: "PCIe is a power delivery standard that supplies electricity to peripherals" },
    ],
    explanation: "PCIe (Peripheral Component Interconnect Express) is the standard high-speed serial interface used to connect expansion cards to a computer's motherboard. It replaced older parallel buses like PCI and AGP, offering much higher bandwidth through point-to-point serial connections."
  },
  {
    scenario: "You're installing an NVIDIA RTX 4090 GPU which requires a PCIe x16 slot. Your motherboard has x16, x8, x4, and x1 slots available, and you're wondering if you could use a different slot.",
    question: "What does the 'x16' designation mean, and what happens if you install a x16 card in an x8 physical slot?",
    options: [
      { id: 'a', label: "x16 means 16 GB/s speed; the card won't physically fit in an x8 slot" },
      { id: 'b', label: "x16 indicates 16 parallel data lanes; the card will work in an x8 slot but at half the bandwidth", correct: true },
      { id: 'c', label: "x16 refers to the PCIe generation; the card will run at generation 8 instead" },
      { id: 'd', label: "x16 specifies power requirements; the card will throttle due to insufficient power" },
    ],
    explanation: "The 'x' number indicates the number of parallel data lanes. A PCIe x16 connection uses 16 lanes simultaneously, like a 16-lane highway. PCIe cards can operate in slots with fewer lanes than their maximum (backward compatibility), but bandwidth is reduced proportionally."
  },
  {
    scenario: "Your company is upgrading servers and must choose between motherboards supporting PCIe 3.0, 4.0, or 5.0. The price increases significantly with each generation, and you need to justify the expense.",
    question: "How does bandwidth scale across PCIe generations for the same lane configuration?",
    options: [
      { id: 'a', label: "Each generation adds approximately 2 GB/s to the total bandwidth" },
      { id: 'b', label: "Each generation roughly doubles the per-lane bandwidth compared to its predecessor", correct: true },
      { id: 'c', label: "Bandwidth remains constant; newer generations only reduce latency" },
      { id: 'd', label: "Each generation increases bandwidth by 50% while reducing power consumption" },
    ],
    explanation: "Each PCIe generation approximately doubles the per-lane bandwidth. PCIe 3.0 provides ~1 GB/s per lane, PCIe 4.0 provides ~2 GB/s per lane, and PCIe 5.0 provides ~4 GB/s per lane. This means a PCIe 5.0 x16 slot (~64 GB/s) offers 4x the bandwidth of PCIe 3.0 x16 (~16 GB/s)."
  },
  {
    scenario: "You're specifying hardware requirements for an AI workstation. The vendor asks whether you need PCIe 4.0 x16 or PCIe 5.0 x8 for the GPU, claiming both have similar total bandwidth.",
    question: "What is the approximate unidirectional bandwidth for PCIe 4.0 x16 and PCIe 5.0 x8?",
    options: [
      { id: 'a', label: "PCIe 4.0 x16 = 16 GB/s; PCIe 5.0 x8 = 40 GB/s" },
      { id: 'b', label: "PCIe 4.0 x16 = 64 GB/s; PCIe 5.0 x8 = 32 GB/s" },
      { id: 'c', label: "PCIe 4.0 x16 = ~32 GB/s; PCIe 5.0 x8 = ~32 GB/s (approximately equal)", correct: true },
      { id: 'd', label: "PCIe 4.0 x16 = 128 GB/s; PCIe 5.0 x8 = 64 GB/s" },
    ],
    explanation: "Bandwidth calculation: (per-lane bandwidth) x (number of lanes). PCIe 4.0 provides ~2 GB/s per lane, so x16 = ~32 GB/s. PCIe 5.0 provides ~4 GB/s per lane, so x8 = ~32 GB/s. The vendor is correct - both configurations provide similar unidirectional bandwidth."
  },
  {
    scenario: "A gaming enthusiast installed an RTX 4090 in their older PCIe 3.0 x16 motherboard. Benchmarks show the GPU performs at 95-98% of its rated performance compared to a PCIe 4.0 system.",
    question: "Why does the GPU still achieve near-full performance despite having half the PCIe bandwidth?",
    options: [
      { id: 'a', label: "Modern GPUs compress data before sending it over PCIe, effectively doubling bandwidth" },
      { id: 'b', label: "The GPU has internal caches that store frequently accessed data, reducing PCIe traffic" },
      { id: 'c', label: "Most GPU workloads are compute-bound, not bandwidth-bound; the GPU processes data faster than PCIe can feed it anyway", correct: true },
      { id: 'd', label: "PCIe 3.0 automatically overclocks when connected to high-end GPUs" },
    ],
    explanation: "Modern GPUs are primarily compute-bound for most gaming and rendering workloads. Once textures and geometry are loaded into GPU memory (VRAM), the GPU processes this data using its internal memory bandwidth (900+ GB/s on high-end cards). PCIe is mainly used for initial asset loading."
  },
  {
    scenario: "You're comparing NVMe SSDs for a video editing workstation. A PCIe 4.0 x4 SSD advertises 7,000 MB/s read speeds, while a PCIe 3.0 x4 SSD shows 3,500 MB/s.",
    question: "What primarily determines the maximum theoretical bandwidth for an NVMe SSD, and why can't a PCIe 3.0 x4 SSD exceed ~3,500 MB/s?",
    options: [
      { id: 'a', label: "The SSD's internal flash memory chips limit speed; PCIe version is irrelevant" },
      { id: 'b', label: "The PCIe interface creates a hard bandwidth ceiling; PCIe 3.0 x4 maxes out at ~3.9 GB/s theoretical (~3.5 GB/s practical)", correct: true },
      { id: 'c', label: "NVMe protocol overhead consumes 50% of available bandwidth regardless of PCIe version" },
      { id: 'd', label: "Operating system drivers artificially limit PCIe 3.0 devices to maintain compatibility" },
    ],
    explanation: "PCIe creates an absolute bandwidth ceiling for connected devices. PCIe 3.0 x4 provides ~3.94 GB/s theoretical maximum (accounting for 128b/130b encoding). After NVMe protocol overhead and controller inefficiencies, practical limits are ~3.5 GB/s."
  },
  {
    scenario: "Your server has 4 GPUs, but the CPU only provides 64 PCIe lanes total. The system uses a PCIe switch chip to connect all GPUs with x16 connections each, totaling 64 lanes on the device side.",
    question: "What is the limitation of using a PCIe switch to expand connectivity beyond the CPU's native lane count?",
    options: [
      { id: 'a', label: "PCIe switches add 5ms latency to every transaction, making real-time applications impossible" },
      { id: 'b', label: "All devices behind the switch share the upstream bandwidth to the CPU; 4 GPUs at x16 share only the CPU's available lanes", correct: true },
      { id: 'c', label: "PCIe switches can only route data between devices, not between devices and the CPU" },
      { id: 'd', label: "Switches require proprietary drivers that are incompatible with standard PCIe devices" },
    ],
    explanation: "PCIe switches allow multiple devices to connect through fewer CPU lanes, but they create a bandwidth bottleneck. If 4 GPUs connect via x16 to a switch, but the switch connects to the CPU via only x16, all four GPUs share that x16 upstream bandwidth."
  },
  {
    scenario: "A new server technology called CXL (Compute Express Link) runs over PCIe 5.0 physical infrastructure. It promises to allow memory expansion and sharing between CPUs and accelerators.",
    question: "What capability does CXL provide that standard PCIe does not support?",
    options: [
      { id: 'a', label: "CXL provides 10x higher bandwidth than PCIe 5.0 using the same physical lanes" },
      { id: 'b', label: "CXL enables cache-coherent memory access, allowing CPUs and devices to share memory with hardware-managed consistency", correct: true },
      { id: 'c', label: "CXL eliminates the need for device drivers by implementing a universal hardware interface" },
      { id: 'd', label: "CXL allows wireless data transmission between PCIe slots without physical connections" },
    ],
    explanation: "CXL (Compute Express Link) builds on PCIe 5.0's physical layer but adds cache-coherent memory semantics. Standard PCIe treats devices as I/O endpoints requiring explicit DMA transfers. CXL allows devices to participate in the CPU's cache coherency domain."
  },
  {
    scenario: "A colleague calculates PCIe 5.0 x16 bandwidth as 32 GT/s x 16 lanes = 512 Gb/s = 64 GB/s. But specification sheets show ~63 GB/s effective bandwidth.",
    question: "What causes the approximately 1.5% reduction from the raw gigatransfers calculation to actual usable bandwidth?",
    options: [
      { id: 'a', label: "Electrical signal degradation over the physical traces loses approximately 1.5% of data" },
      { id: 'b', label: "The PCIe controller reserves 1.5% of bandwidth for error correction retransmissions" },
      { id: 'c', label: "128b/130b encoding adds 2 overhead bits per 128 data bits for synchronization and framing", correct: true },
      { id: 'd', label: "Operating systems reserve bandwidth for system management interrupts" },
    ],
    explanation: "PCIe 3.0 and later use 128b/130b encoding: every 128 bits of payload requires 130 bits on the wire (2 extra bits for synchronization and framing). This gives 128/130 = 98.46% efficiency, explaining the ~1.5% overhead."
  },
  {
    scenario: "You're designing a custom PCIe expansion card. The specification indicates that a x16 slot can provide up to 75W of power directly through the slot connector, but high-power GPUs require additional power cables.",
    question: "How does PCIe slot power delivery work, and why do powerful GPUs need supplemental power connectors?",
    options: [
      { id: 'a', label: "PCIe slots only provide 5V power; GPUs need 12V which requires separate cables" },
      { id: 'b', label: "PCIe power is AC while GPU cores require DC power conversion" },
      { id: 'c', label: "The 75W slot limit is insufficient for GPUs drawing 300-450W; additional 8-pin connectors each provide up to 150W at 12V", correct: true },
      { id: 'd', label: "PCIe power fluctuates with data transfer rates, making it unreliable for sustained GPU loads" },
    ],
    explanation: "PCIe slots provide both 3.3V and 12V power rails, with a maximum combined power of 75W for x16 slots. Modern high-end GPUs consume 300-450W under load, far exceeding slot power. Supplemental PCIe power connectors (8-pin = 150W, 12VHPWR = 600W) deliver the additional power."
  },
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
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

// PCIe Generation specs (GB/s per lane)
const PCIE_SPECS = {
  'PCIe 3.0': { perLane: 0.985, maxLanes: 16, color: '#3b82f6' },
  'PCIe 4.0': { perLane: 1.969, maxLanes: 16, color: '#8b5cf6' },
  'PCIe 5.0': { perLane: 3.938, maxLanes: 16, color: '#06b6d4' },
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PCIeBandwidthRenderer: React.FC<PCIeBandwidthRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [pcieGen, setPcieGen] = useState<keyof typeof PCIE_SPECS>('PCIe 4.0');
  const [numLanes, setNumLanes] = useState(16);
  const [numGPUs, setNumGPUs] = useState(2);
  const [modelSize, setModelSize] = useState(10); // GB
  const [useNVLink, setUseNVLink] = useState(false);
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
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate bandwidth and efficiency
  const spec = PCIE_SPECS[pcieGen];
  const pcieBandwidth = spec.perLane * numLanes;
  const nvlinkBandwidth = useNVLink ? 900 : 0;
  const effectiveBandwidth = useNVLink ? nvlinkBandwidth : pcieBandwidth;

  // Scaling efficiency calculation
  const communicationOverhead = numGPUs > 1 ? (numGPUs - 1) * 0.15 : 0;
  const scalingEfficiency = numGPUs > 1 ? 1 / (1 + communicationOverhead) : 1;
  const effectiveSpeedup = numGPUs * scalingEfficiency;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    pcie: '#3B82F6',
    nvlink: '#22C55E',
    gpu: '#8B5CF6',
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
    twist_play: 'Overhead Lab',
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
        gameType: 'pcie-bandwidth',
        gameTitle: 'PCIe Bandwidth',
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
  }, [phase, goToPhase, phaseOrder]);

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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

  // PCIe Visualization Component
  const PCIeVisualization = () => {
    const width = isMobile ? 340 : 600;
    const height = isMobile ? 280 : 350;
    const dataFlowOffset = animationFrame % 60;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="pcieGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="nvlinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          PCIe Bandwidth Architecture
        </text>

        {/* CPU */}
        <g transform={`translate(${isMobile ? 30 : 50}, 60)`}>
          <rect width="80" height="60" rx="8" fill="url(#cpuGrad)" filter="url(#glow)" />
          <text x="40" y="35" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">CPU</text>
          <text x="40" y="50" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Host</text>
        </g>

        {/* PCIe Bus */}
        <g transform={`translate(${isMobile ? 130 : 160}, 80)`}>
          <rect width={isMobile ? 80 : 120} height="24" rx="4" fill="#1e293b" stroke={colors.pcie} strokeWidth="2" />
          <text x={isMobile ? 40 : 60} y="16" textAnchor="middle" fill={colors.pcie} fontSize="10" fontWeight="bold">
            {pcieGen} x{numLanes}
          </text>

          {/* Animated data flow */}
          {[0, 20, 40].map((offset, i) => (
            <rect
              key={i}
              x={(dataFlowOffset + offset) % (isMobile ? 80 : 120)}
              y="8"
              width="8"
              height="8"
              rx="2"
              fill="url(#pcieGrad)"
              opacity="0.8"
            />
          ))}
        </g>

        {/* GPUs */}
        {Array.from({ length: Math.min(numGPUs, 4) }).map((_, i) => {
          const gpuX = isMobile ? 230 : 320;
          const gpuY = 50 + i * (isMobile ? 55 : 70);

          return (
            <g key={i} transform={`translate(${gpuX}, ${gpuY})`}>
              {/* GPU Card */}
              <rect width={isMobile ? 90 : 110} height={isMobile ? 45 : 55} rx="6" fill="url(#gpuGrad)" filter="url(#glow)" />
              <text x={isMobile ? 45 : 55} y={isMobile ? 25 : 30} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                GPU {i + 1}
              </text>
              <text x={isMobile ? 45 : 55} y={isMobile ? 38 : 45} textAnchor="middle" fill="white" fontSize="8" opacity="0.7">
                {(pcieBandwidth).toFixed(1)} GB/s
              </text>

              {/* PCIe Connection Line */}
              <line
                x1={isMobile ? -20 : -30}
                y1={(isMobile ? 45 : 55) / 2}
                x2="0"
                y2={(isMobile ? 45 : 55) / 2}
                stroke={colors.pcie}
                strokeWidth="2"
                strokeDasharray="4,2"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.3s" repeatCount="indefinite" />
              </line>
            </g>
          );
        })}

        {/* NVLink Connections */}
        {useNVLink && numGPUs > 1 && (
          <g>
            {Array.from({ length: Math.min(numGPUs - 1, 3) }).map((_, i) => {
              const gpuX = isMobile ? 320 : 430;
              const y1 = 72 + i * (isMobile ? 55 : 70);
              const y2 = 72 + (i + 1) * (isMobile ? 55 : 70);

              return (
                <g key={i}>
                  <rect
                    x={gpuX}
                    y={y1}
                    width="8"
                    height={y2 - y1}
                    rx="4"
                    fill="url(#nvlinkGrad)"
                    filter="url(#glow)"
                  />
                  {/* Animated flow */}
                  <circle cx={gpuX + 4} cy={y1 + ((animationFrame * 2) % (y2 - y1))} r="3" fill="#86efac">
                    <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
            <text x={isMobile ? 340 : 450} y={height - 30} textAnchor="middle" fill={colors.nvlink} fontSize="10" fontWeight="bold">
              NVLink: {nvlinkBandwidth} GB/s
            </text>
          </g>
        )}

        {/* Stats Panel */}
        <g transform={`translate(${isMobile ? 20 : 50}, ${height - 80})`}>
          <rect width={width - (isMobile ? 40 : 100)} height="60" rx="8" fill="#0f172a" stroke={colors.border} />

          <text x="15" y="20" fill={colors.textMuted} fontSize="10">Effective Bandwidth:</text>
          <text x="15" y="38" fill={colors.accent} fontSize="16" fontWeight="bold">{effectiveBandwidth.toFixed(1)} GB/s</text>

          <text x={isMobile ? 130 : 200} y="20" fill={colors.textMuted} fontSize="10">Scaling Efficiency:</text>
          <text x={isMobile ? 130 : 200} y="38" fill={scalingEfficiency > 0.8 ? colors.success : colors.warning} fontSize="16" fontWeight="bold">
            {(scalingEfficiency * 100).toFixed(0)}%
          </text>

          <text x={isMobile ? 240 : 380} y="20" fill={colors.textMuted} fontSize="10">Effective Speedup:</text>
          <text x={isMobile ? 240 : 380} y="38" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            {effectiveSpeedup.toFixed(2)}x
          </text>
        </g>
      </svg>
    );
  };

  // Controls Component
  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
      {/* PCIe Generation */}
      <div>
        <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Generation
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'] as const).map(gen => (
            <button
              key={gen}
              onClick={() => { playSound('click'); setPcieGen(gen); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: pcieGen === gen ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: pcieGen === gen ? `${colors.accent}22` : 'transparent',
                color: pcieGen === gen ? colors.accent : colors.textSecondary,
                cursor: 'pointer',
                fontWeight: pcieGen === gen ? 600 : 400,
              }}
            >
              {gen}
            </button>
          ))}
        </div>
      </div>

      {/* PCIe Lanes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>PCIe Lanes</span>
          <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>x{numLanes}</span>
        </div>
        <input
          type="range"
          min="1"
          max="16"
          value={numLanes}
          onChange={(e) => { playSound('click'); setNumLanes(parseInt(e.target.value)); }}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      {/* Number of GPUs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>Number of GPUs</span>
          <span style={{ ...typo.small, color: colors.gpu, fontWeight: 600 }}>{numGPUs}</span>
        </div>
        <input
          type="range"
          min="1"
          max="8"
          value={numGPUs}
          onChange={(e) => { playSound('click'); setNumGPUs(parseInt(e.target.value)); }}
          style={{ width: '100%', accentColor: colors.gpu }}
        />
      </div>

      {/* Model Size */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>Model Size</span>
          <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{modelSize} GB</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={modelSize}
          onChange={(e) => { playSound('click'); setModelSize(parseInt(e.target.value)); }}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      {/* NVLink Toggle */}
      <button
        onClick={() => { playSound('click'); setUseNVLink(!useNVLink); }}
        style={{
          padding: '14px 24px',
          borderRadius: '10px',
          border: 'none',
          background: useNVLink ? colors.nvlink : colors.bgSecondary,
          color: useNVLink ? 'white' : colors.textSecondary,
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '18px' }}>🔗</span>
        {useNVLink ? 'NVLink: ON (900 GB/s)' : 'NVLink: OFF'}
      </button>
    </div>
  );

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
          🔌⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          PCIe Bandwidth Limits
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why can't you just <span style={{ color: colors.accent }}>add more GPUs</span> to make AI training faster? The answer lies in the <span style={{ color: colors.pcie }}>bandwidth bottleneck</span> that connects them all."
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
            "Every GPU connects to your system through a PCIe slot - a highway with limited lanes. When GPUs need to share data during AI training, this highway can become a traffic jam."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
            PCIe 4.0 x16: ~32 GB/s | GPU VRAM: ~900 GB/s
          </p>
          <p style={{ ...typo.small, color: colors.warning, marginTop: '4px' }}>
            That's a 28x bottleneck between the GPU and the system!
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore PCIe Bandwidth
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: '2 GPUs = 2x faster, 8 GPUs = 8x faster (linear scaling)' },
      { id: 'b', text: 'Each added GPU gives less speedup than the previous (diminishing returns)', correct: true },
      { id: 'c', text: 'More GPUs don\'t help - one GPU does all the work' },
      { id: 'd', text: 'Too many GPUs actually slows things down' },
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
            What happens to AI training speed as you add more GPUs connected via PCIe?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ padding: '16px', background: '#fb923c33', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px' }}>CPU</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.pcie }}>--PCIe--</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ padding: '8px 16px', background: '#8b5cf633', borderRadius: '6px', color: colors.gpu }}>
                    GPU {i}
                  </div>
                ))}
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive PCIe Simulator
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
            PCIe Bandwidth Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust settings to see how bandwidth affects multi-GPU scaling.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PCIeVisualization />
            </div>

            {renderControls()}
          </div>

          {/* Discovery prompt */}
          {numGPUs >= 4 && scalingEfficiency < 0.7 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how scaling efficiency drops as you add more GPUs! Communication overhead is eating into your speedup.
              </p>
            </div>
          )}

          {useNVLink && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                NVLink provides 900 GB/s - that's 28x more bandwidth than PCIe 4.0 x16!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of PCIe Bandwidth
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Bandwidth = Per-Lane Speed x Number of Lanes</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                PCIe 4.0 x16 provides ~<span style={{ color: colors.accent }}>32 GB/s</span> bidirectional bandwidth.
                Each generation doubles the per-lane speed: 3.0 (~1 GB/s), 4.0 (~2 GB/s), 5.0 (~4 GB/s).
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>GPU Internal Bandwidth: 900+ GB/s</strong>
              </p>
              <p>
                High-end GPUs have 900+ GB/s VRAM bandwidth internally, but only ~32 GB/s to the outside world. This 28x gap creates the PCIe bottleneck.
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
              Key Insight: Amdahl's Law
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Speedup is limited by the sequential (non-parallelizable) portion of your workload:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>With GPUs, communication becomes the sequential bottleneck</li>
              <li>Even with perfect parallel computation, data must synchronize</li>
              <li>This is why 8 GPUs rarely give 8x speedup</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.nvlink, marginBottom: '12px' }}>
              Why NVLink Exists
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              NVIDIA created NVLink to bypass the PCIe bottleneck. It provides 600-900 GB/s direct GPU-to-GPU communication, enabling near-linear scaling for multi-GPU workloads.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Communication overhead is negligible with fast interconnects' },
      { id: 'b', text: 'Overhead grows linearly with GPU count' },
      { id: 'c', text: 'Overhead can grow quadratically with naive algorithms, but ring-reduce makes it O(1) per GPU', correct: true },
      { id: 'd', text: 'Overhead is fixed regardless of GPU count' },
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
              New Variable: Gradient Synchronization
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            During AI training, GPUs must synchronize gradients after each batch. How does this communication overhead scale with GPU count?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Each GPU computes gradients on different data. Before updating weights, all gradients must be averaged across all GPUs.
            </p>
            <div style={{ marginTop: '16px', fontSize: '14px', color: colors.accent, fontFamily: 'monospace' }}>
              GPU1 ---gradient--- GPU2 ---gradient--- GPU3 ---gradient--- GPU4
            </div>
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
              Explore Communication Patterns
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Communication Overhead Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how gradient synchronization affects multi-GPU scaling.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PCIeVisualization />
            </div>

            {renderControls()}

            {/* Communication pattern comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginTop: '24px',
            }}>
              <div style={{
                background: `${colors.error}11`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.error}33`,
              }}>
                <h4 style={{ ...typo.small, color: colors.error, marginBottom: '8px', fontWeight: 600 }}>
                  Naive All-Reduce
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Send all gradients to one GPU, average, broadcast back.
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  O(N) data movement - creates bottleneck
                </p>
              </div>
              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.success}33`,
              }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                  Ring All-Reduce
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  GPUs pass gradient chunks in a ring, each doing partial reductions.
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  O(1) per GPU - scales efficiently
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
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
            Defeating the Communication Bottleneck
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔗</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>NVLink & NVSwitch</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Direct GPU-to-GPU interconnect at 600-900 GB/s. NVSwitch enables fully-connected topology for 8 GPUs. This is why DGX systems are so expensive - they include the interconnect fabric.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Gradient Compression</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Compress gradients before sending (quantization, sparsification). Trade compute for bandwidth - often 10-100x reduction with minimal accuracy loss.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⏱️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Computation-Communication Overlap</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Start sending gradients for early layers while still computing later layers. Hides communication latency behind useful compute.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧩</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Model Parallelism</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Split the model across GPUs instead of the data. Different layers or tensor dimensions on different GPUs. Changes communication patterns to favor larger, less frequent transfers.
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
                    Y
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
                How PCIe Bandwidth Connects:
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
                ? 'You understand PCIe bandwidth and multi-GPU scaling!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Question-by-question review */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Review Your Answers:
              </h3>
              {testQuestions.map((q, i) => {
                const correctOption = q.options.find(o => o.correct);
                const isCorrect = testAnswers[i] === correctOption?.id;
                return (
                  <div key={i} style={{
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                    border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700 }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

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
          PCIe Bandwidth Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why "just add more GPUs" doesn't always work, and how to overcome the bandwidth bottleneck.
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
              'PCIe bandwidth limits (lanes x generation)',
              'NVLink provides 28x more GPU-to-GPU bandwidth',
              'Communication overhead limits multi-GPU scaling',
              'Ring all-reduce enables efficient gradient sync',
              'Amdahl\'s Law governs parallel speedup',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>Y</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}11`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <p style={{ ...typo.body, color: colors.accent, fontStyle: 'italic', margin: 0 }}>
            "The fastest GPU is the one that doesn't wait for data."
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

export default PCIeBandwidthRenderer;
