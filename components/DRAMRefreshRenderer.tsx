'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 185: DRAM REFRESH
// ============================================================================
// Physics: DRAM stores bits as charge in capacitors that leak over time
// Refresh cycles must periodically restore charge to prevent data loss
// Temperature and memory speed affect refresh requirements
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DRAMRefreshRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(203, 213, 225, 0.85)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  capacitor: '#3b82f6',
  charge: '#22d3ee',
  leak: '#f97316',
  border: '#334155',
};

// Phase order and labels for navigation
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

// Test questions array - 10 scenario-based multiple choice questions
// covering DRAM refresh and memory topics from easy to hard
const testQuestions = [
  // Q1: Core Concept - Why DRAM Needs Refresh (Easy)
  {
    scenario: "You are building a computer and notice that RAM modules are labeled as 'volatile memory' while SSDs are labeled as 'non-volatile'. When you turn off the computer, the RAM loses all its data instantly.",
    question: "Why does DRAM require periodic refresh cycles to maintain stored data?",
    options: [
      { id: 'a', label: "The magnetic domains in DRAM cells gradually demagnetize over time" },
      { id: 'b', label: "DRAM stores bits as electrical charge in tiny capacitors that naturally leak over time", correct: true },
      { id: 'c', label: "The transistors in DRAM wear out and need to be reset periodically" },
      { id: 'd', label: "Refresh cycles synchronize data between the CPU cache and main memory" },
    ],
    explanation: "DRAM stores each bit as electrical charge in a microscopic capacitor (about 30 femtofarads). Due to leakage currents through the access transistor and other parasitic paths, this charge naturally dissipates within 32-64 milliseconds. Without periodic refresh cycles that read and rewrite each cell, the charge would drop below the threshold needed to distinguish a 1 from a 0, causing data corruption."
  },
  // Q2: Capacitor Charge Leakage (Easy-Medium)
  {
    scenario: "A hardware engineer is debugging a prototype DRAM chip that works perfectly at room temperature (25C) but shows random bit errors when tested in an environmental chamber at 55C.",
    question: "What causes the charge in DRAM capacitors to leak faster at higher temperatures?",
    options: [
      { id: 'a', label: "Heat causes the capacitor plates to physically expand and touch, creating short circuits" },
      { id: 'b', label: "Higher temperatures increase thermal energy, accelerating electron movement through leakage paths", correct: true },
      { id: 'c', label: "The dielectric material melts at high temperatures, allowing charge to escape" },
      { id: 'd', label: "Heat damages the refresh circuitry, preventing proper charge restoration" },
    ],
    explanation: "Leakage current in semiconductors follows the Arrhenius equation and roughly doubles for every 10C temperature increase. At higher temperatures, electrons have more thermal energy to overcome potential barriers, increasing subthreshold leakage through the access transistor and junction leakage currents. This can reduce retention time from 64ms at 25C to as little as 16ms at 85C, requiring more frequent refresh cycles."
  },
  // Q3: DRAM vs SRAM Tradeoffs (Medium)
  {
    scenario: "A computer architect is designing a new processor and must decide how to allocate the limited on-chip area. The L1 cache needs to be extremely fast (sub-nanosecond access), while main memory needs to be large (gigabytes) and cost-effective.",
    question: "Why do modern CPUs use SRAM for cache but DRAM for main memory?",
    options: [
      { id: 'a', label: "SRAM is faster because it uses 6 transistors per cell with no refresh overhead, while DRAM is denser using only 1 transistor and 1 capacitor per cell", correct: true },
      { id: 'b', label: "SRAM is more reliable because it stores data magnetically, while DRAM uses less reliable electrical storage" },
      { id: 'c', label: "DRAM is faster but generates too much heat for on-chip use, so SRAM is used despite being slower" },
      { id: 'd', label: "SRAM and DRAM have identical performance, but manufacturing constraints require different technologies" },
    ],
    explanation: "SRAM uses a bistable flip-flop circuit with 6 transistors that actively maintains its state without refresh, enabling access times under 1 nanosecond. However, SRAM cells are approximately 6x larger and more expensive than DRAM cells. DRAM uses just 1 transistor and 1 capacitor per cell, achieving much higher density at lower cost, but requires refresh cycles and has slower access times (tens of nanoseconds). This makes SRAM ideal for small, fast caches and DRAM ideal for large main memory."
  },
  // Q4: Refresh Rate and Power Consumption (Medium)
  {
    scenario: "A smartphone manufacturer is trying to extend battery life during standby mode. The device has 12GB of LPDDR5 RAM that must retain its contents while the screen is off, but the battery is draining faster than competitors' devices.",
    question: "How does the DRAM refresh rate affect power consumption in mobile devices?",
    options: [
      { id: 'a', label: "Refresh operations consume negligible power since they only involve reading existing data" },
      { id: 'b', label: "Power consumption is fixed regardless of refresh rate due to constant background leakage" },
      { id: 'c', label: "Each refresh cycle requires activating rows and rewriting cells, consuming significant power that scales with refresh frequency", correct: true },
      { id: 'd', label: "Faster refresh rates actually reduce power by preventing charge decay that wastes energy" },
    ],
    explanation: "DRAM refresh is a major power consumer, accounting for 15-40% of total DRAM power in idle states. Each refresh cycle activates a row, reads all cells through sense amplifiers, and rewrites the data back - operations that draw substantial current. In standby mode, refresh becomes the dominant power consumer. LPDDR memory addresses this with partial array self-refresh (only refreshing active memory regions) and temperature-compensated refresh (slowing refresh when cool), but refresh overhead remains a key battery life challenge."
  },
  // Q5: ECC Memory and Error Correction (Medium-Hard)
  {
    scenario: "A data center operator notices that their servers with ECC memory log several corrected single-bit errors per day, even though the memory passed all diagnostic tests and operates within temperature specifications. The errors appear randomly across different memory addresses.",
    question: "What is the primary source of these random single-bit errors in properly functioning ECC memory?",
    options: [
      { id: 'a', label: "Manufacturing defects in the memory chips cause intermittent failures" },
      { id: 'b', label: "High-energy cosmic rays and alpha particles from packaging materials strike memory cells and flip bits", correct: true },
      { id: 'c', label: "Electromagnetic interference from nearby servers induces voltage spikes" },
      { id: 'd', label: "The ECC algorithm itself introduces errors during the correction process" },
    ],
    explanation: "Cosmic rays (high-energy particles from space) and alpha particles (emitted by trace radioactive elements in chip packaging) can deposit enough charge in a memory cell to flip a bit instantaneously - an event called a soft error or single-event upset (SEU). These events occur at a rate of roughly 1000-5000 FIT (failures in time per billion hours) per megabit. ECC memory adds extra parity bits that can detect and correct single-bit errors, which is why servers and critical systems require ECC despite the 12.5% memory overhead."
  },
  // Q6: DDR Memory Timing Parameters (Hard)
  {
    scenario: "An overclocker is tuning their DDR5-6000 memory and sees timing parameters listed as CL36-36-36-76. They want to understand what these numbers mean before attempting to tighten them for better performance.",
    question: "What does the CAS Latency (CL) timing parameter represent in DDR memory specifications?",
    options: [
      { id: 'a', label: "The number of clock cycles between sending a column address and receiving the first data word", correct: true },
      { id: 'b', label: "The total time in nanoseconds to complete a full read-write-refresh cycle" },
      { id: 'c', label: "The maximum number of simultaneous memory accesses the controller can handle" },
      { id: 'd', label: "The delay between consecutive refresh operations measured in microseconds" },
    ],
    explanation: "CAS Latency (CL) is the number of clock cycles between the memory controller sending a column address strobe (CAS) command and the memory returning the first word of data. The four timing numbers (CL-tRCD-tRP-tRAS) represent: CL (column access delay), tRCD (row-to-column delay), tRP (row precharge time), and tRAS (row active time). Lower values mean faster access but require higher-quality memory cells. At DDR5-6000, CL36 translates to 12 nanoseconds absolute latency (36 cycles / 3000 MHz effective clock)."
  },
  // Q7: Rowhammer Attack Vulnerability (Hard)
  {
    scenario: "A security researcher discovers that repeatedly accessing specific memory rows on a test system causes bit flips in adjacent rows that their program never directly accessed. This behavior persists across multiple DRAM modules from different manufacturers.",
    question: "What fundamental DRAM characteristic enables the Rowhammer security vulnerability?",
    options: [
      { id: 'a', label: "Software bugs in the memory controller firmware allow unauthorized memory access" },
      { id: 'b', label: "Repeated row activations cause electromagnetic interference that disturbs charge in physically adjacent rows", correct: true },
      { id: 'c', label: "The refresh circuit has a bug that skips certain rows under heavy access patterns" },
      { id: 'd', label: "Memory encryption keys are stored in predictable locations that can be targeted" },
    ],
    explanation: "Rowhammer exploits the physical proximity of DRAM cells. When a row is repeatedly activated (hammered), the voltage fluctuations on the wordline and the resulting electromagnetic coupling can disturb charge in physically adjacent rows before they are refreshed. This can flip bits in memory the attacker cannot directly access, potentially bypassing security boundaries. Modern mitigations include Target Row Refresh (TRR), increased refresh rates, and ECC, but the fundamental vulnerability exists because DRAM cells are packed so densely that they electrically interfere with neighbors."
  },
  // Q8: Self-Refresh Mode in Mobile Devices (Hard)
  {
    scenario: "A mobile device enters deep sleep mode to conserve battery. The operating system needs RAM contents preserved but wants to minimize power consumption. The LPDDR5 memory supports multiple power-saving modes including self-refresh.",
    question: "How does DRAM self-refresh mode differ from normal controller-managed refresh?",
    options: [
      { id: 'a', label: "Self-refresh uses a lower voltage that reduces power but increases error rates" },
      { id: 'b', label: "The DRAM chip manages its own refresh timing internally, allowing the memory controller to power down", correct: true },
      { id: 'c', label: "Self-refresh stores data to flash memory and restores it when exiting sleep" },
      { id: 'd', label: "The refresh rate is eliminated entirely by using backup capacitors to maintain charge" },
    ],
    explanation: "In normal operation, the memory controller issues refresh commands to the DRAM. In self-refresh mode, the DRAM chip activates an internal oscillator and refresh counter to manage its own refresh timing autonomously. This allows the memory controller, memory bus, and associated circuitry to power down completely, dramatically reducing system power. LPDDR further optimizes this with partial array self-refresh (only refreshing memory regions marked as containing data) and temperature-compensated self-refresh (adjusting refresh rate based on on-die temperature sensors)."
  },
  // Q9: Memory Controller Scheduling (Hard)
  {
    scenario: "A system architect is optimizing memory performance for a real-time application that requires guaranteed worst-case latency. They notice that memory access times vary significantly depending on the pattern of requests.",
    question: "Why do memory controllers reorder pending requests rather than processing them in arrival order?",
    options: [
      { id: 'a', label: "Reordering hides security vulnerabilities by randomizing memory access patterns" },
      { id: 'b', label: "Grouping accesses to the same row avoids repeated row activation overhead and increases throughput", correct: true },
      { id: 'c', label: "Processing in arrival order would cause the refresh circuit to skip necessary refresh cycles" },
      { id: 'd', label: "The memory bus protocol requires requests to be sorted by address before transmission" },
    ],
    explanation: "DRAM access involves three phases: row activation (tRCD), column access (CL), and precharge (tRP). If sequential requests target different rows, each requires the full activation-access-precharge cycle. Memory controllers use scheduling algorithms (like FR-FCFS - First Ready, First Come First Served) to reorder requests, grouping those targeting the same open row. This row buffer locality optimization can improve throughput by 2-3x for favorable access patterns, but introduces variable latency that complicates real-time system design."
  },
  // Q10: Future Memory Technologies (Hard)
  {
    scenario: "A research team is evaluating emerging memory technologies to replace DRAM in future systems. They need non-volatile memory with DRAM-like speed and endurance, but without the refresh overhead and volatility limitations.",
    question: "Which emerging memory technology stores data using magnetic tunnel junctions and offers non-volatility with near-DRAM speeds?",
    options: [
      { id: 'a', label: "Phase-Change Memory (PCM), which uses chalcogenide glass state changes" },
      { id: 'b', label: "Resistive RAM (ReRAM), which uses metal oxide filament formation" },
      { id: 'c', label: "Magnetoresistive RAM (MRAM), which uses electron spin orientation in magnetic layers", correct: true },
      { id: 'd', label: "Ferroelectric RAM (FeRAM), which uses polarization in ferroelectric crystals" },
    ],
    explanation: "MRAM (specifically STT-MRAM - Spin-Transfer Torque MRAM) stores data by orienting the magnetic spin of electrons in a magnetic tunnel junction. It offers non-volatility (data persists without power), near-DRAM read speeds, unlimited write endurance (unlike flash), and no refresh requirement. The tradeoffs include higher write energy than DRAM, larger cell size, and manufacturing complexity. MRAM is already used in some embedded applications and is being developed as a potential DRAM replacement for applications where instant-on capability and data persistence are critical."
  },
];

// Legacy constant for backward compatibility
const TEST_QUESTIONS = testQuestions;

const TRANSFER_APPLICATIONS = [
  {
    title: 'Server Memory',
    description: 'Data centers run 24/7 with massive DRAM arrays. ECC (Error Correcting Code) memory adds extra bits to detect and fix errors caused by charge loss or cosmic rays.',
    question: 'Why do servers use ECC memory?',
    answer: 'ECC memory can detect and correct single-bit errors caused by charge leakage, cosmic rays, or electrical noise. This prevents crashes and data corruption in mission-critical systems.',
  },
  {
    title: 'Mobile Devices',
    description: 'Phones use LPDDR (Low Power DDR) memory with optimized refresh rates to extend battery life while maintaining performance.',
    question: 'How does LPDDR save power compared to standard DDR?',
    answer: 'LPDDR uses lower voltages, partial array self-refresh (only refreshing active sections), and temperature-compensated refresh rates to minimize power consumption.',
  },
  {
    title: 'Graphics Cards',
    description: 'GPUs use GDDR or HBM memory with extremely high bandwidth. These must balance refresh overhead with data throughput for gaming and AI workloads.',
    question: 'Why is refresh timing critical for GPU memory?',
    answer: 'GPUs need maximum bandwidth for rendering and compute. Refresh cycles steal bandwidth, so GDDR uses optimized refresh patterns that minimize interference with data transfers.',
  },
  {
    title: 'Embedded Systems',
    description: 'Cars, medical devices, and industrial controllers use special DRAM with extended temperature ranges and longer retention times for reliability.',
    question: 'Why do embedded systems need automotive-grade DRAM?',
    answer: 'Automotive environments have extreme temperatures (-40C to +125C). Higher temperatures increase leakage dramatically, requiring faster refresh rates and more robust cell designs.',
  },
];

const realWorldApps = [
  {
    icon: "☁️",
    title: "Data Center Memory",
    short: "Cloud Computing",
    tagline: "Powering the cloud with persistent memory",
    description: "Hyperscale data centers running cloud services rely on massive DRAM arrays to store active workloads for millions of users simultaneously. Each server contains hundreds of gigabytes of DDR5 ECC memory that must maintain data integrity 24/7/365 while consuming minimal power. The refresh challenge becomes critical at scale—a single data center may have petabytes of DRAM all requiring continuous refresh cycles.",
    connection: "Just like our simulation showed charge leaking from capacitors, data center DRAM faces the same physics. The difference is scale—instead of 8 cells, we're talking about trillions of capacitors per server, all leaking simultaneously. ECC memory adds extra bits to detect and correct the inevitable single-bit errors from charge loss, cosmic rays, and electrical noise.",
    howItWorks: "Server DRAM uses registered DIMMs (RDIMMs) with a buffer chip that re-drives signals for reliability across long memory traces. Each DIMM contains multiple ranks of memory chips, each chip containing billions of capacitor cells. The memory controller schedules refresh commands across all ranks, staggering them to maintain bandwidth for compute operations. Temperature sensors adjust refresh rates dynamically—hotter servers refresh more frequently to compensate for accelerated charge leakage.",
    stats: [
      { val: "512 GB", label: "RAM per server typical" },
      { val: "15-40%", label: "DRAM power from refresh" },
      { val: "99.999%", label: "Required uptime SLA" }
    ],
    examples: [
      "AWS EC2 instances with up to 24 TB RAM",
      "Google Cloud in-memory databases",
      "Azure Redis Cache clusters",
      "Meta's social graph caching layer"
    ],
    companies: ["Amazon AWS", "Google Cloud", "Microsoft Azure", "Meta", "Oracle"],
    futureImpact: "Future data centers will adopt CXL (Compute Express Link) memory pooling, allowing flexible allocation of DRAM across servers. Persistent memory technologies like Intel Optane and emerging CXL-attached DRAM will blur the line between memory and storage, while AI-driven memory management will predict access patterns to optimize refresh scheduling and reduce power consumption by up to 30%.",
    color: "#3b82f6"
  },
  {
    icon: "📱",
    title: "Smartphone RAM",
    short: "Mobile Devices",
    tagline: "Maximum performance from minimum power",
    description: "Modern smartphones pack 8-16 GB of LPDDR5X memory into a space smaller than a postage stamp, delivering desktop-class performance while sipping battery power. The memory must instantly wake from deep sleep states to handle notifications, maintain app state across dozens of background applications, and sustain high bandwidth for gaming and camera processing—all while maximizing battery life.",
    connection: "Our temperature slider demonstrated how heat accelerates charge leakage. In a smartphone, the memory sits millimeters from a hot processor, and the device can go from a cold pocket to a sun-baked car dashboard. LPDDR memory uses the same refresh physics we explored, but with sophisticated power-saving modes that would cause data loss in standard DRAM.",
    howItWorks: "LPDDR (Low Power DDR) memory operates at lower voltages (0.5V vs 1.1V for DDR5) and includes partial array self-refresh—only memory regions containing active data are refreshed during sleep, while empty regions power down completely. Temperature-compensated self-refresh adjusts timing based on on-die thermal sensors. Deep power-down mode can retain data for extended periods by using the minimum refresh rate the physics allows at the current temperature.",
    stats: [
      { val: "16 GB", label: "Flagship phone RAM (2024)" },
      { val: "0.5V", label: "LPDDR5X operating voltage" },
      { val: "8533 MT/s", label: "LPDDR5X peak transfer rate" }
    ],
    examples: [
      "iPhone 16 Pro with 8 GB LPDDR5X",
      "Samsung Galaxy S24 Ultra with 12 GB",
      "Gaming phones with 16-24 GB RAM",
      "Foldable devices with dual-screen memory management"
    ],
    companies: ["Apple", "Samsung", "Qualcomm", "MediaTek", "SK Hynix"],
    futureImpact: "Next-generation smartphones will feature on-device AI that requires even more memory bandwidth for large language models and real-time image processing. LPDDR6 will double bandwidth while further reducing power consumption. Memory compression and intelligent app hibernation will allow phones to keep more apps truly instant-resume ready without proportionally increasing power consumption.",
    color: "#10b981"
  },
  {
    icon: "🎮",
    title: "Gaming Systems",
    short: "Consoles and PCs",
    tagline: "Zero latency for ultimate immersion",
    description: "Gaming demands the most from memory systems—massive open worlds require streaming gigabytes of textures and geometry, while competitive esports demand sub-millisecond response times. Modern gaming PCs use DDR5 at 6000+ MHz with carefully tuned timings, while consoles employ unified memory architectures where CPU and GPU share the same high-bandwidth pool.",
    connection: "Our simulation showed how refresh cycles interrupt memory access. In gaming, every microsecond of refresh overhead steals bandwidth from rendering the next frame. GDDR (Graphics DDR) memory on dedicated GPUs uses optimized refresh patterns that hide latency behind parallel memory channels, but the fundamental capacitor physics remains identical to what we explored.",
    howItWorks: "Gaming systems use aggressive memory timing configurations that push refresh intervals to their limits based on temperature monitoring. Enthusiast overclockers tune primary timings (CAS latency, tRCD, tRP, tRAS) and secondary timings to minimize the delay between requesting data and receiving it. GPU memory controllers interleave refresh commands with texture fetches across multiple channels, ensuring the GPU never stalls waiting for refresh to complete.",
    stats: [
      { val: "32 GB", label: "Standard gaming PC RAM" },
      { val: "24 GB", label: "RTX 4090 GDDR6X VRAM" },
      { val: "6000+ MHz", label: "Enthusiast DDR5 speeds" }
    ],
    examples: [
      "PlayStation 5 with 16 GB unified GDDR6",
      "Xbox Series X with 16 GB split GDDR6",
      "High-end gaming PCs with DDR5-8000+",
      "Steam Deck with LPDDR5 unified memory"
    ],
    companies: ["NVIDIA", "AMD", "Sony", "Microsoft", "Corsair"],
    futureImpact: "Ray tracing and AI upscaling are driving demand for even more memory bandwidth. GDDR7 will deliver over 1.5 TB/s per GPU, while DDR5 speeds will push past 10,000 MT/s for enthusiasts. Cloud gaming will shift memory demands to data centers, but local gaming will adopt new memory architectures like 3D-stacked HBM in high-end systems for ultimate bandwidth.",
    color: "#8b5cf6"
  },
  {
    icon: "🚗",
    title: "Autonomous Vehicle Computing",
    short: "Automotive AI",
    tagline: "Safety-critical memory for self-driving futures",
    description: "Self-driving vehicles process terabytes of sensor data per hour through neural networks that must make life-or-death decisions in milliseconds. Automotive-grade memory must operate reliably from -40°C in arctic winters to +125°C under desert sun, all while meeting stringent automotive safety standards (ISO 26262) that demand error rates approaching zero.",
    connection: "Our temperature experiment showed leakage doubling with every 10°C increase. Automotive memory faces this challenge at extremes—a cold-soaked car might start at -30°C with minimal leakage, then heat to 85°C during operation, requiring the memory controller to dynamically adjust refresh rates by 8x or more. Any bit flip could cause catastrophic decisions.",
    howItWorks: "Automotive LPDDR4X/5 memory uses inline ECC that corrects single-bit errors and detects multi-bit errors in real-time. Temperature sensors throughout the memory system continuously report to the memory controller, which adjusts refresh timing using lookup tables calibrated for each temperature range. Redundant memory channels allow the system to continue operating if one channel fails, while built-in self-test (BIST) continuously validates memory integrity during vehicle operation.",
    stats: [
      { val: "32+ GB", label: "RAM in L4 autonomous systems" },
      { val: "-40 to 125°C", label: "Operating temperature range" },
      { val: "ASIL-D", label: "Highest automotive safety level" }
    ],
    examples: [
      "Tesla Full Self-Driving computer",
      "Waymo Driver perception system",
      "NVIDIA DRIVE Orin platform",
      "Mobileye EyeQ Ultra processors"
    ],
    companies: ["Tesla", "Waymo", "NVIDIA", "Mobileye", "Qualcomm"],
    futureImpact: "Level 5 autonomy will require even more on-vehicle processing power and memory bandwidth for real-time world modeling. Radiation-hardened automotive memory will become standard as cosmic ray soft errors gain attention. Vehicle-to-everything (V2X) communication will demand ultra-low-latency memory access for real-time coordination between vehicles, while over-the-air updates will require safe memory management during software upgrades.",
    color: "#f59e0b"
  }
];

const DRAMRefreshRenderer: React.FC<DRAMRefreshRendererProps> = ({
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

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
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

  // Simulation state
  const [refreshRate, setRefreshRate] = useState(64); // ms between refreshes
  const [temperature, setTemperature] = useState(25); // Celsius
  const [memorySpeed, setMemorySpeed] = useState(3200); // MHz
  const [isSimulating, setIsSimulating] = useState(false);
  const [time, setTime] = useState(0);
  const [cellCharges, setCellCharges] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [dataLost, setDataLost] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate leakage rate based on temperature and speed
  const getLeakageRate = useCallback(() => {
    const baseLeakage = 0.5; // % per ms
    const tempFactor = 1 + (temperature - 25) * 0.03; // 3% increase per degree above 25C
    const speedFactor = 1 + (memorySpeed - 2400) / 2400 * 0.2; // Faster memory leaks slightly more
    return baseLeakage * tempFactor * speedFactor;
  }, [temperature, memorySpeed]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTime(t => {
        const newTime = t + 1;

        // Check if refresh is due
        if (newTime - lastRefreshTime >= refreshRate) {
          setLastRefreshTime(newTime);
          setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
          setDataLost(false);
        } else {
          // Apply leakage
          const leakage = getLeakageRate();
          setCellCharges(charges =>
            charges.map(c => {
              const newCharge = c - leakage;
              if (newCharge < 50) setDataLost(true);
              return Math.max(0, newCharge);
            })
          );
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, refreshRate, lastRefreshTime, getLeakageRate]);

  const resetSimulation = () => {
    setTime(0);
    setLastRefreshTime(0);
    setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
    setDataLost(false);
    setIsSimulating(false);
  };

  const predictions = [
    { id: 'permanent', label: 'RAM stores data permanently in magnetic domains' },
    { id: 'capacitor', label: 'RAM stores data as electric charge that slowly leaks away' },
    { id: 'light', label: 'RAM stores data as light pulses in fiber optics' },
    { id: 'crystal', label: 'RAM stores data in crystal structures like an SSD' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Faster memory has the same refresh rate - speed does not affect storage' },
    { id: 'less', label: 'Faster memory needs less refresh - better technology means less leakage' },
    { id: 'more', label: 'Faster memory needs more frequent refresh - smaller capacitors leak faster' },
    { id: 'none', label: 'Faster memory eliminates refresh entirely with new technology' },
  ];

  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answerId;
    setTestAnswers(newAnswers);
  };

  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = TEST_QUESTIONS[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  const nextTestQuestion = () => {
    if (currentTestIndex < TEST_QUESTIONS.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
    }
  };

  const prevTestQuestion = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(currentTestIndex - 1);
    }
  };

  const submitTest = () => {
    const score = calculateTestScore();
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Visualization
  const renderDRAMVisualization = () => {
    const width = 400;
    const height = 300;
    const avgCharge = cellCharges.reduce((a, b) => a + b, 0) / cellCharges.length;
    const timeSinceRefresh = time - lastRefreshTime;
    const refreshProgress = Math.min(100, (timeSinceRefresh / refreshRate) * 100);

    return (
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ borderRadius: '12px' }}
        >
          <defs>
            {/* Premium chip substrate gradient */}
            <linearGradient id="dramChipSubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="25%" stopColor="#16213e" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>

            {/* Capacitor body metallic gradient */}
            <linearGradient id="dramCapacitorBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Capacitor plate gradient */}
            <linearGradient id="dramCapacitorPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Charge level gradient - full charge */}
            <linearGradient id="dramChargeHigh" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="75%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </linearGradient>

            {/* Charge level gradient - medium charge */}
            <linearGradient id="dramChargeMedium" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="25%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Charge level gradient - low charge (critical) */}
            <linearGradient id="dramChargeLow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="25%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Refresh progress bar gradient */}
            <linearGradient id="dramRefreshBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="75%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Refresh progress bar critical gradient */}
            <linearGradient id="dramRefreshBarCritical" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Leakage particle gradient */}
            <radialGradient id="dramLeakageGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            {/* Transistor gate gradient */}
            <linearGradient id="dramTransistorGate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Circuit trace gradient */}
            <linearGradient id="dramCircuitTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>

            {/* Cell glow filter for charged state */}
            <filter id="dramCellGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Leakage glow filter */}
            <filter id="dramLeakageFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Refresh pulse glow */}
            <filter id="dramRefreshPulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Status indicator glow */}
            <filter id="dramStatusGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker for leakage */}
            <marker id="dramArrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="url(#dramLeakageGlow)" />
            </marker>

            {/* Grid pattern for chip background */}
            <pattern id="dramChipGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background with chip substrate */}
          <rect width={width} height={height} fill="url(#dramChipSubstrate)" />
          <rect width={width} height={height} fill="url(#dramChipGrid)" />

          {/* Memory cells grid */}
          {cellCharges.map((charge, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 60 + col * 80;
            const y = 45 + row * 95;
            const chargeHeight = (charge / 100) * 45;
            const chargeGradient = charge > 70 ? 'url(#dramChargeHigh)' : charge > 50 ? 'url(#dramChargeMedium)' : 'url(#dramChargeLow)';
            const isRefreshing = timeSinceRefresh < 5 && charge > 95;

            return (
              <g key={i}>
                {/* Cell container with metallic border */}
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={54}
                  height={74}
                  fill="url(#dramCapacitorBody)"
                  rx={6}
                  stroke="#475569"
                  strokeWidth={1}
                />

                {/* Capacitor plates visualization */}
                <rect x={x} y={y} width={50} height={3} fill="url(#dramCapacitorPlate)" rx={1} />
                <rect x={x} y={y + 67} width={50} height={3} fill="url(#dramCapacitorPlate)" rx={1} />

                {/* Dielectric layer (capacitor interior) */}
                <rect
                  x={x + 3}
                  y={y + 5}
                  width={44}
                  height={60}
                  fill="#0a0f1a"
                  rx={3}
                />

                {/* Charge level visualization with glow */}
                <g filter={charge > 70 ? 'url(#dramCellGlow)' : undefined}>
                  <rect
                    x={x + 5}
                    y={y + 62 - chargeHeight}
                    width={40}
                    height={chargeHeight}
                    fill={chargeGradient}
                    rx={2}
                    opacity={0.9}
                  />
                </g>

                {/* Charge particles (animated dots) */}
                {charge > 30 && Array.from({ length: Math.floor(charge / 25) }).map((_, idx) => (
                  <circle
                    key={idx}
                    cx={x + 10 + (idx % 3) * 15}
                    cy={y + 55 - Math.floor(idx / 3) * 12 - (charge / 100) * 20}
                    r={2}
                    fill={charge > 70 ? '#67e8f9' : charge > 50 ? '#fbbf24' : '#f87171'}
                    opacity={0.7 + Math.random() * 0.3}
                  >
                    {isSimulating && (
                      <animate
                        attributeName="opacity"
                        values="0.7;1;0.7"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                ))}

                {/* Transistor gate (access transistor) */}
                <rect
                  x={x + 18}
                  y={y - 8}
                  width={14}
                  height={6}
                  fill="url(#dramTransistorGate)"
                  rx={2}
                />
                <rect x={x + 23} y={y - 12} width={4} height={4} fill="#fbbf24" />

                {/* Word line trace */}
                <line
                  x1={x - 10}
                  y1={y - 5}
                  x2={x + 60}
                  y2={y - 5}
                  stroke="url(#dramCircuitTrace)"
                  strokeWidth={2}
                  opacity={0.6}
                />

                {/* Bit line trace */}
                <line
                  x1={x + 25}
                  y1={y + 72}
                  x2={x + 25}
                  y2={y + 85}
                  stroke="url(#dramCircuitTrace)"
                  strokeWidth={2}
                  opacity={0.6}
                />

                {/* Leakage visualization (animated particles flowing down) */}
                {isSimulating && charge < 95 && charge > 10 && (
                  <g filter="url(#dramLeakageFilter)">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <circle
                        key={idx}
                        cx={x + 15 + idx * 10}
                        cy={y + 65}
                        r={2}
                        fill="url(#dramLeakageGlow)"
                      >
                        <animate
                          attributeName="cy"
                          values={`${y + 65};${y + 80};${y + 65}`}
                          dur={`${0.8 + idx * 0.2}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0.3;0.8"
                          dur={`${0.8 + idx * 0.2}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}
                  </g>
                )}

                {/* Refresh pulse animation */}
                {isRefreshing && (
                  <rect
                    x={x + 3}
                    y={y + 5}
                    width={44}
                    height={60}
                    fill="#22d3ee"
                    opacity={0.3}
                    rx={3}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.5;0;0.5"
                      dur="0.3s"
                      repeatCount="3"
                    />
                  </rect>
                )}
              </g>
            );
          })}

          {/* Refresh cycle indicator arc */}
          <g transform={`translate(${width / 2}, 235)`}>
            {/* Background arc */}
            <path
              d={`M -140 0 A 140 140 0 0 1 140 0`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={12}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M -140 0 A 140 140 0 0 1 ${-140 + 280 * (1 - refreshProgress / 100)} ${-Math.sin(Math.acos((280 * (1 - refreshProgress / 100) - 140) / 140)) * 140 || 0}`}
              fill="none"
              stroke={refreshProgress > 80 ? 'url(#dramRefreshBarCritical)' : 'url(#dramRefreshBar)'}
              strokeWidth={12}
              strokeLinecap="round"
              filter={refreshProgress > 80 ? 'url(#dramRefreshPulse)' : undefined}
            />
          </g>

          {/* Status indicators */}
          <g transform="translate(50, 260)">
            {/* Charge status */}
            <rect
              x={0}
              y={0}
              width={140}
              height={30}
              fill="#0f172a"
              rx={8}
              stroke={avgCharge > 70 ? '#22d3ee' : avgCharge > 50 ? '#fbbf24' : '#ef4444'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <circle
              cx={20}
              cy={15}
              r={5}
              fill={avgCharge > 70 ? '#22d3ee' : avgCharge > 50 ? '#fbbf24' : '#ef4444'}
            />
            <text x={35} y={250} fill="#e2e8f0" fontSize="11" fontWeight="600">Charge Level</text>

            {/* Data status */}
            <rect
              x={160}
              y={0}
              width={140}
              height={30}
              fill="#0f172a"
              rx={8}
              stroke={dataLost ? '#ef4444' : '#10b981'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <circle
              cx={180}
              cy={15}
              r={5}
              fill={dataLost ? '#ef4444' : '#10b981'}
            >
              {dataLost && (
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            <text x={195} y={250} fill="#e2e8f0" fontSize="11" fontWeight="600">Data Status</text>
          </g>

          {/* Legend Panel - positioned at bottom-right corner */}
          <g transform={`translate(${width - 120}, 10)`}>
            <rect x={0} y={0} width={110} height={70} fill="rgba(15,23,42,0.9)" rx={6} stroke="#334155" strokeWidth={1} />
            <text x={10} y={16} fill="#f8fafc" fontSize="11" fontWeight="700">LEGEND</text>
            <circle cx={18} cy={30} r={5} fill="#22d3ee" />
            <text x={30} y={34} fill="#e2e8f0" fontSize="11">Full Charge</text>
            <circle cx={18} cy={48} r={5} fill="#fbbf24" />
            <text x={30} y={52} fill="#e2e8f0" fontSize="11">Medium</text>
            <circle cx={18} cy={66} r={5} fill="#ef4444" />
            <text x={30} y={70} fill="#e2e8f0" fontSize="11">Critical</text>
          </g>

          {/* Axis labels */}
          <text x={width / 2} y={height - 3} fill="#e2e8f0" fontSize="11" textAnchor="middle">Time →</text>
          <text x={12} y={height / 2} fill="#e2e8f0" fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`}>Charge Level</text>

          {/* Grid lines */}
          <line x1={50} y1={230} x2={width - 10} y2={230} strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />
          <line x1={50} y1={200} x2={width - 10} y2={200} strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />

          {/* Interactive point showing current refresh timing */}
          <circle
            cx={50 + ((refreshRate - 16) / (128 - 16)) * (width - 100)}
            cy={230 - ((128 - refreshRate) / (128 - 16)) * 60}
            r={8}
            fill={refreshRate < 32 ? '#22d3ee' : refreshRate < 80 ? '#fbbf24' : '#ef4444'}
            filter="url(#dramCellGlow)"
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 50px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${avgCharge > 70 ? 'rgba(34, 211, 238, 0.3)' : avgCharge > 50 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: avgCharge > 70 ? colors.charge : avgCharge > 50 ? colors.warning : colors.error,
            }}>
              Avg Charge: {avgCharge.toFixed(0)}%
            </span>
          </div>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${dataLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 700,
              color: dataLost ? colors.error : colors.success,
            }}>
              {dataLost ? 'DATA LOST!' : 'Data Intact'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <span style={{
            fontSize: typo.small,
            color: refreshProgress > 80 ? colors.error : colors.accent,
            fontWeight: 600,
          }}>
            Refresh in: {Math.max(0, refreshRate - timeSinceRefresh).toFixed(0)}ms
          </span>
        </div>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }} role="tablist" aria-label="Phase navigation">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                role="tab"
                aria-selected={i === currentIdx}
                aria-label={phaseLabels[p]}
                data-navigation-dot="true"
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px',
                  border: 'none',
                  padding: 0
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

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 400
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #a78bfa 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    WebkitTapHighlightColor: 'transparent' as const,
    transition: 'all 0.2s ease',
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: '#ffffff', fontSize: '28px', marginBottom: '8px' }}>
              Why Does RAM Forget Everything?
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '18px', marginBottom: '24px' }}>
              The physics of volatile memory
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: 1.6 }}>
                Every time you turn off your computer, all the RAM goes blank. Programs disappear,
                unsaved work vanishes. Yet SSDs and hard drives remember everything. What makes
                RAM so forgetful?
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '12px' }}>
                The answer lies in tiny capacitors that are constantly fighting physics.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: '#ffffff', fontSize: '14px' }}>
                DRAM capacitors hold charge measured in femtofarads - that is 0.000000000000001 farads!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const selectedCount = prediction ? 1 : 0;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>How Does DRAM Store Data?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Each bit needs to be stored somehow
            </p>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              padding: '8px 16px',
              background: colors.bgCard,
              borderRadius: '20px',
              width: 'fit-content',
              margin: '12px auto 0'
            }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>Progress:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: prediction ? colors.success : colors.warning }}>
                {selectedCount}/1 selected
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What stores the 1s and 0s in DRAM?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '44px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>DRAM Refresh Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch capacitors leak and see why refresh is essential
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
              <strong>Observe:</strong> Watch how the charge level drops over time. Try adjusting the temperature slider to see how heat affects the leakage rate.
            </p>
          </div>

          <div style={{ padding: '0 16px' }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderDRAMVisualization()}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                    Refresh Rate: {refreshRate}ms (every {refreshRate}ms)
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="128"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                    Temperature: {temperature}C
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    style={{
                      ...buttonStyle,
                      background: isSimulating ? colors.error : colors.success,
                      color: 'white',
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    {isSimulating ? 'Pause' : 'Start Simulation'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    style={{
                      ...buttonStyle,
                      background: 'transparent',
                      border: `1px solid ${colors.accent}`,
                      color: colors.accent,
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    Reset
                  </button>
                </div>

                {/* Comparison display: reference vs current values */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginTop: '16px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    background: 'rgba(34, 211, 238, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                  }}>
                    <p style={{ color: colors.charge, fontSize: '12px', fontWeight: 700, margin: 0 }}>Reference (25C)</p>
                    <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, margin: '4px 0 0' }}>0.53%/ms</p>
                  </div>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    <p style={{ color: colors.warning, fontSize: '12px', fontWeight: 700, margin: 0 }}>Current ({temperature}C)</p>
                    <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, margin: '4px 0 0' }}>{getLeakageRate().toFixed(2)}%/ms</p>
                  </div>
                </div>

                <div style={{
                  background: colors.bgCard,
                  padding: '16px',
                  borderRadius: '8px',
                  marginTop: '8px',
                }}>
                  <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
                  <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                    <li>Charge leaks continuously from each capacitor</li>
                    <li>Below 50% charge, data bits flip (errors!)</li>
                    <li>Refresh restores all cells to 100%</li>
                    <li>Higher temperature = faster leakage</li>
                  </ul>
                </div>

                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '12px',
                  borderLeft: `3px solid ${colors.capacitor}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400, margin: 0 }}>
                    <strong>Why this matters:</strong> This technology is used in every computer, phone, and server. Understanding DRAM refresh is important for engineers designing real-world applications from data centers to mobile devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'capacitor';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
              <strong>You predicted:</strong> {userPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary }}>
              DRAM stores each bit as electric charge in a tiny capacitor. The capacitors are so
              small that charge naturally leaks away through quantum tunneling and parasitic paths.
            </p>
          </div>

          {/* SVG Diagram for review */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="320" height="200" viewBox="0 0 320 200">
              <rect width="320" height="200" fill="#0f172a" rx="8" />
              <text x="160" y="22" fill="#f8fafc" fontSize="13" fontWeight="700" textAnchor="middle">DRAM Cell Structure</text>
              {/* Capacitor */}
              <rect x="80" y="40" width="70" height="90" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="4" />
              <rect x="90" y="95" width="50" height="25" fill="#22d3ee" opacity="0.8" />
              <text x="115" y="112" fill="#0f172a" fontSize="11" fontWeight="600" textAnchor="middle">Charge</text>
              <text x="115" y="150" fill="#e2e8f0" fontSize="11" textAnchor="middle">Capacitor</text>
              {/* Transistor */}
              <rect x="190" y="60" width="50" height="45" fill="#f59e0b" opacity="0.8" rx="4" />
              <text x="215" y="88" fill="#0f172a" fontSize="11" fontWeight="600" textAnchor="middle">Gate</text>
              <text x="215" y="125" fill="#e2e8f0" fontSize="11" textAnchor="middle">Transistor</text>
              {/* Connection line */}
              <line x1="150" y1="82" x2="190" y2="82" stroke="#14b8a6" strokeWidth="2" />
              {/* Leakage arrow */}
              <line x1="115" y1="133" x2="115" y2="165" stroke="#ef4444" strokeWidth="2" />
              <text x="60" y="180" fill="#ef4444" fontSize="11">Leakage</text>
              {/* Grid lines */}
              <line x1="30" y1="170" x2="290" y2="170" strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />
              {/* Axis label */}
              <text x="280" y="192" fill="#e2e8f0" fontSize="11" textAnchor="end">Time</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of DRAM</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitor Storage:</strong> Each DRAM cell
                has one transistor and one capacitor. A charged capacitor = 1, discharged = 0.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Charge Leakage:</strong> Capacitors lose
                charge through junction leakage, subthreshold conduction, and quantum tunneling.
                Typical retention time is 32-64ms.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Refresh Cycles:</strong> Every few
                milliseconds, the memory controller reads each row and rewrites it, restoring
                full charge to all capacitors.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Cost:</strong> Refresh consumes
                about 15-20% of DRAM power and temporarily blocks read/write operations.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const selectedCount = twistPrediction ? 1 : 0;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Speed Paradox</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when we make memory faster?
            </p>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              padding: '8px 16px',
              background: colors.bgCard,
              borderRadius: '20px',
              width: 'fit-content',
              margin: '12px auto 0'
            }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>Progress:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: twistPrediction ? colors.success : colors.warning }}>
                {selectedCount}/1 selected
              </span>
            </div>
          </div>

          {/* SVG Visualization for Twist Predict */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="320" height="200" viewBox="0 0 320 200">
              <rect width="320" height="200" fill="#0f172a" rx="8" />
              <text x="160" y="22" fill="#f8fafc" fontSize="13" fontWeight="700" textAnchor="middle">DDR4 vs DDR5 Capacitor Size</text>

              {/* DDR4 capacitor - larger */}
              <rect x="55" y="45" width="70" height="90" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="4" />
              <rect x="65" y="95" width="50" height="30" fill="#22d3ee" opacity="0.8" />
              <text x="90" y="155" fill="#e2e8f0" fontSize="12" textAnchor="middle">DDR4</text>
              <text x="90" y="78" fill="#e2e8f0" fontSize="11" textAnchor="middle">Larger</text>

              {/* DDR5 capacitor - smaller */}
              <rect x="200" y="65" width="45" height="60" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" rx="4" />
              <rect x="208" y="95" width="30" height="20" fill="#fbbf24" opacity="0.8" />
              <text x="222" y="155" fill="#e2e8f0" fontSize="12" textAnchor="middle">DDR5</text>
              <text x="222" y="85" fill="#e2e8f0" fontSize="11" textAnchor="middle">Smaller</text>

              {/* Arrow indicating comparison */}
              <line x1="135" y1="90" x2="190" y2="90" stroke="#e2e8f0" strokeWidth="2" />
              <text x="162" y="82" fill="#e2e8f0" fontSize="12" textAnchor="middle">3x Faster</text>

              {/* Grid line */}
              <line x1="30" y1="170" x2="290" y2="170" strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />
              <text x="160" y="190" fill="#e2e8f0" fontSize="11" textAnchor="middle">Generation</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              DDR4-2400 runs at 2400 MHz. DDR5-6400 runs at 6400 MHz - nearly 3x faster!
              But to achieve this speed, the capacitors must be smaller and closer together.
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does faster memory affect refresh requirements?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Speed vs Power Trade-off</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore how memory speed affects refresh needs
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
              <strong>Observe:</strong> Increase the memory speed slider and watch how the leakage rate changes. Faster memory has smaller capacitors that leak charge more quickly.
            </p>
          </div>

          <div style={{ padding: '0 16px' }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderDRAMVisualization()}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                    Memory Speed: DDR5-{memorySpeed}
                  </label>
                  <input
                    type="range"
                    min="2400"
                    max="8000"
                    step="400"
                    value={memorySpeed}
                    onChange={(e) => setMemorySpeed(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                    Refresh Rate: {refreshRate}ms
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="128"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    style={{
                      ...buttonStyle,
                      background: isSimulating ? colors.error : colors.success,
                      color: 'white',
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    {isSimulating ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    style={{
                      ...buttonStyle,
                      background: 'transparent',
                      border: `1px solid ${colors.warning}`,
                      color: colors.warning,
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginTop: '16px',
                  borderLeft: `3px solid ${colors.warning}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                    <strong>Observation:</strong> At DDR5-{memorySpeed}, leakage rate is {getLeakageRate().toFixed(2)}%/ms.
                    {memorySpeed > 4800 && ' Faster memory needs more frequent refresh to stay stable!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';
    const userTwistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
              <strong>You predicted:</strong> {userTwistPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary }}>
              Faster memory requires MORE frequent refresh, not less! Smaller capacitors at
              tighter pitches have higher leakage rates and less charge margin.
            </p>
          </div>

          {/* SVG Diagram for Twist Review */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', marginBottom: '16px' }}>
            <svg width="340" height="220" viewBox="0 0 340 220">
              <rect width="340" height="220" fill="#0f172a" rx="8" />
              <text x="170" y="22" fill="#f8fafc" fontSize="13" fontWeight="700" textAnchor="middle">Speed vs Refresh Rate Trade-off</text>

              {/* Chart axes */}
              <line x1="60" y1="170" x2="300" y2="170" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="60" y1="40" x2="60" y2="170" stroke="#e2e8f0" strokeWidth="1" />

              {/* Grid lines */}
              <line x1="60" y1="105" x2="300" y2="105" strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />
              <line x1="60" y1="70" x2="300" y2="70" strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />
              <line x1="60" y1="140" x2="300" y2="140" strokeDasharray="4 4" opacity={0.3} stroke="#64748b" />

              {/* X-axis label */}
              <text x="180" y="198" fill="#e2e8f0" fontSize="12" textAnchor="middle">Memory Speed (MHz)</text>

              {/* Y-axis label */}
              <text x="25" y="105" fill="#e2e8f0" fontSize="12" textAnchor="middle" transform="rotate(-90, 25, 105)">Refresh Rate</text>

              {/* Data points - showing correlation */}
              <circle cx="100" cy="150" r="6" fill="#22d3ee" />
              <text x="100" y="168" fill="#e2e8f0" fontSize="11" textAnchor="middle">2400</text>

              <circle cx="160" cy="120" r="6" fill="#fbbf24" />
              <text x="160" y="168" fill="#e2e8f0" fontSize="11" textAnchor="middle">4000</text>

              <circle cx="220" cy="85" r="6" fill="#f97316" />
              <text x="220" y="168" fill="#e2e8f0" fontSize="11" textAnchor="middle">6000</text>

              <circle cx="280" cy="55" r="6" fill="#ef4444" />
              <text x="280" y="168" fill="#e2e8f0" fontSize="11" textAnchor="middle">8000</text>

              {/* Trend line */}
              <line x1="100" y1="150" x2="280" y2="55" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" />

              <text x="295" y="48" fill="#ef4444" fontSize="11">High</text>
              <text x="78" y="148" fill="#22d3ee" fontSize="11">Low</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Speed-Power Trade-off</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Smaller Capacitors:</strong> Higher speed
                requires smaller cells. DDR5 cells are ~40% smaller than DDR4, holding less charge.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>More Leakage:</strong> Smaller geometry
                means more parasitic leakage paths and worse retention time.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DDR5 Solution:</strong> DDR5 uses
                same-bank refresh to refresh smaller portions more frequently, reducing
                overall power impact while maintaining data integrity.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Paradox:</strong> Faster memory
                can actually use MORE power due to increased refresh overhead!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="D R A M Refresh"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
              Complete all 4 applications to unlock the test
            </p>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: colors.bgCard,
              borderRadius: '20px',
              width: 'fit-content',
              margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>Progress:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: transferCompleted.size >= 4 ? colors.success : colors.warning }}>
                {transferCompleted.size}/4 completed
              </span>
            </div>
          </div>

          {/* Numeric statistics summary */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            margin: '0 16px 16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '120px', background: colors.bgCard, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: colors.accent, fontSize: '18px', fontWeight: 700, margin: 0 }}>64ms</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0' }}>Typical refresh interval</p>
            </div>
            <div style={{ flex: 1, minWidth: '120px', background: colors.bgCard, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, margin: 0 }}>15-40%</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0' }}>DRAM power from refresh</p>
            </div>
            <div style={{ flex: 1, minWidth: '120px', background: colors.bgCard, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: colors.success, fontSize: '18px', fontWeight: 700, margin: 0 }}>2x</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0' }}>Leakage per 10C rise</p>
            </div>
          </div>

          {TRANSFER_APPLICATIONS.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>{'\u2705'}</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      ...buttonStyle,
                      padding: '8px 16px',
                      background: colors.success,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {}}
                    style={{
                      ...buttonStyle,
                      padding: '8px 16px',
                      background: colors.success,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: '44px',
                      opacity: 0.6,
                    }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const totalQuestions = TEST_QUESTIONS.length;
    const passed = testScore >= 7;

    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
            <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '672px', margin: '0 auto' }}>
              {/* Score Summary */}
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
                  {testScore === totalQuestions ? '\uD83C\uDFC6' : testScore >= 9 ? '\u2B50' : testScore >= 7 ? '\u2705' : '\uD83D\uDCDA'}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px', color: colors.textPrimary }}>
                  {testScore}/{totalQuestions} Correct
                </h2>
                <p style={{ fontSize: '14px', marginBottom: '16px', color: passed ? colors.success : colors.warning }}>
                  {testScore === totalQuestions ? "Perfect! You've mastered DRAM refresh!" :
                   testScore >= 9 ? 'Excellent! You deeply understand memory concepts.' :
                   testScore >= 7 ? 'Great job! You understand the key concepts.' :
                   'Keep exploring - memory technology takes time!'}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                  <button
                    onClick={() => {
                      setCurrentTestIndex(0);
                      setTestAnswers(new Array(10).fill(null));
                      setTestSubmitted(false);
                      setTestScore(0);
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: colors.bgCard,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative'
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: passed ? colors.success : colors.warning,
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    {passed ? 'Claim Mastery' : 'Review Lesson'}
                  </button>
                </div>
              </div>

              {/* Question-by-Question Review */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '12px',
                  color: colors.textMuted
                }}>
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
                      border: `2px solid ${isCorrect ? colors.success : colors.error}40`
                    }}>
                      <div style={{
                        padding: '16px',
                        background: isCorrect ? `${colors.success}15` : `${colors.error}15`
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
                            fontWeight: 700,
                            background: isCorrect ? colors.success : colors.error,
                            color: 'white'
                          }}>
                            {isCorrect ? 'Y' : 'N'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                              Question {i + 1}
                            </p>
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
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 700,
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
                            background: `${colors.success}10`,
                            border: `1px solid ${colors.success}30`
                          }}>
                            <p style={{
                              fontSize: '10px',
                              fontWeight: 700,
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
                          background: colors.bgCardLight
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 700,
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

              {/* Retake Button at Bottom */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                borderRadius: '16px',
                textAlign: 'center',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`
              }}>
                <p style={{ fontSize: '14px', marginBottom: '12px', color: colors.textSecondary }}>
                  {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
                </p>
                <button
                  onClick={() => {
                    setCurrentTestIndex(0);
                    setTestAnswers(new Array(10).fill(null));
                    setTestSubmitted(false);
                    setTestScore(0);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    background: colors.accent,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Retake Test
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '672px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                color: colors.warning
              }}>
                Step 8 - Knowledge Test
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px', color: colors.textPrimary }}>
                Question {currentTestIndex + 1} of {totalQuestions}
              </h2>

              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '8px',
                      flex: 1,
                      borderRadius: '9999px',
                      background: i === currentTestIndex ? colors.warning :
                                  i < currentTestIndex ? colors.success :
                                  testAnswers[i] !== null ? colors.accent : colors.bgCardLight
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario Box */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '24px',
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}30`
            }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
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

            {/* Question */}
            <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: colors.textPrimary }}>
              Q{currentTestIndex + 1}: {currentQ.question}
            </p>

            {/* Answer Options */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '16px',
                    textAlign: 'left',
                    background: testAnswers[currentTestIndex] === opt.id ? `${colors.warning}20` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentTestIndex] === opt.id ? colors.warning : colors.border}`,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: testAnswers[currentTestIndex] === opt.id ? colors.warning : colors.bgCardLight,
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
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

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={prevTestQuestion}
                disabled={currentTestIndex === 0}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.textMuted}`,
                  color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                  cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentTestIndex === 0 ? 0.5 : 1,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  disabled={!testAnswers[currentTestIndex]}
                  style={{
                    ...buttonStyle,
                    background: testAnswers[currentTestIndex] ? colors.accent : colors.bgCardLight,
                    color: testAnswers[currentTestIndex] ? 'white' : colors.textMuted,
                    cursor: testAnswers[currentTestIndex] ? 'pointer' : 'not-allowed',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!allAnswered}
                  style={{
                    ...buttonStyle,
                    background: allAnswered ? colors.success : colors.bgCardLight,
                    color: allAnswered ? 'white' : colors.textMuted,
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand DRAM refresh and volatile memory physics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>DRAM stores bits as charge in tiny capacitors</li>
              <li>Capacitors leak charge continuously (retention time ~64ms)</li>
              <li>Refresh cycles read and rewrite each cell periodically</li>
              <li>Faster memory has smaller cells that leak faster</li>
              <li>Temperature dramatically affects leakage rate</li>
              <li>Refresh consumes power and reduces available bandwidth</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern memory research explores alternatives like FeRAM (ferroelectric), MRAM
              (magnetic), and ReRAM (resistive) that do not need refresh. These non-volatile
              technologies could someday replace DRAM for instant-on computers!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderDRAMVisualization()}
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default DRAMRefreshRenderer;
