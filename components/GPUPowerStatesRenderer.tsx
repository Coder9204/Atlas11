'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface GPUPowerStatesRendererProps {
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
  twist_play: 'Twist Explore',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'Laptop Battery Life',
    short: 'How GPUs switch states to extend unplugged runtime',
    tagline: 'From 8 hours browsing to 45 minutes gaming',
    description: 'Modern laptops use aggressive GPU power management to achieve 8+ hour battery life for light tasks. The GPU drops to <5W idle states when browsing, then instantly ramps to 100W+ for gaming, maximizing both battery life and performance.',
    connection: 'The DVFS (voltage/frequency scaling) you explored enables this: idle states run at 300 MHz/0.7V consuming 5W, while gaming states reach 2000 MHz/1.1V consuming 100W+.',
    howItWorks: 'NVIDIA Optimus and AMD Switchable Graphics can completely power off discrete GPUs, using integrated graphics for desktop tasks. When games launch, the discrete GPU powers on within milliseconds.',
    stats: [
      { value: '5W vs 150W', label: 'Idle vs gaming power', icon: '🔋' },
      { value: '10+ hours', label: 'Light use battery life', icon: '⏰' },
      { value: '<1 hour', label: 'Gaming battery life', icon: '🎮' }
    ],
    examples: ['MacBook Pro GPU switching', 'ASUS ROG laptops', 'Dell XPS hybrid graphics', 'Razer Blade power profiles'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'Qualcomm'],
    futureImpact: 'AI workload prediction will pre-emptively adjust GPU states, eliminating micro-stutters during transitions.',
    color: '#22C55E'
  },
  {
    icon: '🖥️',
    title: 'Data Center Efficiency',
    short: 'Millions of GPUs optimizing power 24/7',
    tagline: 'Every watt matters at hyperscale',
    description: 'Cloud data centers operate millions of GPUs. Power efficiency directly impacts operating costs and carbon footprint. Advanced power states and DVFS reduce idle power consumption by 80%, saving billions in electricity annually.',
    connection: 'The P = CV²f relationship you learned means that reducing voltage from 1.0V to 0.8V at idle cuts power by 36% - multiplied across millions of GPUs.',
    howItWorks: 'Hyperscalers use custom power profiles: "power-saver" states for inference, "turbo" for training bursts. GPU telemetry informs cooling, allowing higher boost clocks when thermal headroom exists.',
    stats: [
      { value: '700W', label: 'H100 TDP', icon: '⚡' },
      { value: '15 GW', label: 'US data center power', icon: '🏭' },
      { value: '$10B+', label: 'Annual electricity cost', icon: '💰' }
    ],
    examples: ['AWS Inferentia instances', 'Google TPU power management', 'Azure GPU optimization', 'Meta AI infrastructure'],
    companies: ['NVIDIA', 'Google', 'Amazon', 'Microsoft'],
    futureImpact: 'Liquid cooling will enable higher power limits while waste heat recovery powers adjacent buildings.',
    color: '#3B82F6'
  },
  {
    icon: '🎮',
    title: 'Overclocking & Enthusiast Tuning',
    short: 'Pushing beyond stock limits for maximum FPS',
    tagline: 'When milliseconds per frame matter',
    description: 'Enthusiasts manipulate GPU power states to extract maximum performance. By increasing power limits, optimizing voltage curves, and improving cooling, 15-25% performance gains are achievable beyond stock settings.',
    connection: 'Understanding that higher clocks require higher voltage (and quadratically more power) lets overclockers find the optimal balance between performance, power, and thermals.',
    howItWorks: 'Custom BIOS or software unlocks higher power limits. Undervolting finds minimum stable voltage per clock speed. Custom cooling allows sustained boost without thermal throttling. Power delivery must handle increased current.',
    stats: [
      { value: '15-25%', label: 'Typical OC performance gain', icon: '📈' },
      { value: '450W+', label: 'Extreme RTX 4090 power draw', icon: '⚡' },
      { value: '2700 MHz', label: 'World record core clocks', icon: '🏆' }
    ],
    examples: ['MSI Afterburner tuning', 'EVGA Precision X1', 'Custom water cooling loops', 'LN2 extreme overclocking'],
    companies: ['EVGA', 'MSI', 'ASUS', 'Corsair'],
    futureImpact: 'AI-assisted auto-tuning will find each GPU\'s optimal voltage/frequency curve automatically, democratizing overclocking.',
    color: '#F59E0B'
  },
  {
    icon: '🚗',
    title: 'Automotive GPU Power Management',
    short: 'Balancing infotainment, ADAS, and vehicle range',
    tagline: 'Every watt affects how far you can drive',
    description: 'Electric vehicles use GPUs for infotainment, driver assistance, and autonomous driving. These GPUs must carefully manage power states because every watt consumed reduces driving range.',
    connection: 'The power state transitions you studied are critical in EVs: the GPU must sleep during highway cruise, wake for map updates, and max out for autonomous navigation - all while minimizing energy drain.',
    howItWorks: 'Automotive GPUs use specialized power profiles: minimal power for instrument cluster, moderate for infotainment, maximum for ADAS and autonomous driving. Wake-on-event allows instant response from deep sleep states.',
    stats: [
      { value: '300-500W', label: 'Autonomous driving GPU power', icon: '🚗' },
      { value: '2-3%', label: 'Range impact from compute', icon: '🔋' },
      { value: '10W idle', label: 'Parked vehicle consumption', icon: '💤' }
    ],
    examples: ['Tesla FSD computer', 'NVIDIA DRIVE platform', 'Mobileye EyeQ', 'Qualcomm Snapdragon Ride'],
    companies: ['Tesla', 'NVIDIA', 'Qualcomm', 'Intel Mobileye'],
    futureImpact: 'Edge AI accelerators with <10W TDP will enable always-on autonomous features without significant range penalty.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  power: '#ef4444',
  thermal: '#f97316',
  clock: '#3b82f6',
  voltage: '#8b5cf6',
};

const TEST_QUESTIONS = [
  // Q1: Core concept - what are power states (Easy)
  {
    scenario: "You notice your GPU fan speeds up dramatically when you launch a game, but becomes nearly silent when you return to the desktop. Your monitoring software shows the GPU switching between different operating modes.",
    question: "What are GPU power states and why does the GPU switch between them?",
    options: [
      { id: 'a', label: "Power states are predefined operating modes with different voltage, frequency, and power levels that balance performance and efficiency" , correct: true },
      { id: 'b', label: "Power states are error conditions that indicate the GPU is malfunctioning" },
      { id: 'c', label: "Power states only control fan speeds and have no effect on GPU performance" },
      { id: 'd', label: "Power states are fixed settings that users must manually configure in BIOS" }
    ],
    explanation: "GPU power states (like P-states and D-states) are predefined operating configurations that adjust voltage, clock speed, and power consumption based on workload demands. The GPU automatically transitions between states to deliver high performance when needed while conserving energy and reducing heat during lighter tasks."
  },
  // Q2: Idle vs load power consumption (Easy-Medium)
  {
    scenario: "A tech reviewer measures a high-end GPU consuming 25W while displaying a static desktop wallpaper, but jumping to 350W during intensive gaming. The difference is a factor of 14x.",
    question: "What accounts for this massive difference in power consumption between idle and full load?",
    options: [
      { id: 'a', label: "At idle, only the display output circuitry is active; at load, billions of transistors switch rapidly at high voltage" , correct: true },
      { id: 'b', label: "The GPU disables its memory completely when idle, which accounts for most power savings" },
      { id: 'c', label: "Idle power is a measurement error; GPUs actually consume the same power regardless of activity" },
      { id: 'd', label: "The cooling fans consume most of the power difference between idle and load" }
    ],
    explanation: "At idle, the GPU drops to minimal clock speeds (300-500 MHz) and low voltage, with most compute units clock-gated. During gaming, clocks rise to 2000+ MHz at higher voltages, and billions of transistors switch states billions of times per second. Since dynamic power scales with frequency and voltage squared (P = CV²f), this creates the dramatic difference."
  },
  // Q3: Dynamic voltage/frequency scaling (Medium)
  {
    scenario: "Your GPU monitoring tool shows constant fluctuations during gaming: clock speeds varying between 1800-2400 MHz and voltage between 0.9-1.1V, updating multiple times per second.",
    question: "What mechanism allows the GPU to make these rapid adjustments, and why are voltage and frequency changed together?",
    options: [
      { id: 'a', label: "The operating system manually adjusts settings based on CPU usage patterns" },
      { id: 'b', label: "DVFS (Dynamic Voltage and Frequency Scaling) adjusts both together because higher frequencies require higher voltages for stable operation" , correct: true },
      { id: 'c', label: "The GPU driver randomly varies settings to prevent overheating" },
      { id: 'd', label: "Voltage and frequency are independent; they only appear correlated by coincidence" }
    ],
    explanation: "DVFS is a hardware-level power management technique. Higher clock frequencies require higher voltages because transistors need more voltage to switch states quickly enough. The GPU continuously monitors workload, temperature, and power, adjusting both parameters together to find the optimal operating point that maximizes performance within thermal and power constraints."
  },
  // Q4: Power limit and throttling (Medium)
  {
    scenario: "You increase your GPU's power limit from 300W to 350W using overclocking software. During a benchmark, the GPU initially runs faster but after 30 seconds, performance drops back to nearly the same level as before.",
    question: "Why did increasing the power limit fail to provide sustained performance improvement?",
    options: [
      { id: 'a', label: "The benchmark software doesn't support higher power limits" },
      { id: 'b', label: "Power limits have no effect on GPU performance whatsoever" },
      { id: 'c', label: "The GPU hit its thermal limit; the cooling solution couldn't dissipate the extra heat, triggering thermal throttling" , correct: true },
      { id: 'd', label: "The motherboard refused to supply more than 300W of power" }
    ],
    explanation: "Increasing the power limit allows higher clocks initially, but those higher clocks generate more heat. If your cooling solution can't handle the extra thermal load, the GPU temperature rises until it hits the thermal limit (typically 83-90°C), triggering automatic clock reduction. Performance becomes cooling-limited rather than power-limited."
  },
  // Q5: TDP vs actual power draw (Medium-Hard)
  {
    scenario: "A GPU is marketed with a 320W TDP (Thermal Design Power). During testing, a reviewer measures actual power consumption of 280W in most games, but 380W during a synthetic stress test.",
    question: "How can the GPU exceed its TDP rating, and what does TDP actually represent?",
    options: [
      { id: 'a', label: "The reviewer's measurements are wrong; GPUs can never exceed TDP" },
      { id: 'b', label: "TDP is a cooling requirement guideline, not a hard power limit; actual draw depends on workload, boost algorithms, and power limits" , correct: true },
      { id: 'c', label: "TDP represents maximum power draw, so 380W indicates a defective unit" },
      { id: 'd', label: "Stress tests force the GPU into an unsafe overclocked state" }
    ],
    explanation: "TDP is the thermal power the cooling system should be designed to dissipate under typical loads - it's a thermal specification, not an electrical limit. Modern GPUs have separate power limits that can exceed TDP during demanding workloads. Boost algorithms may push power higher when thermal headroom exists, which is why well-cooled cards often draw more power than their TDP suggests."
  },
  // Q6: GPU boost algorithms (Hard)
  {
    scenario: "Two identical GPUs in different systems show different sustained boost clocks: System A maintains 2400 MHz while System B only reaches 2200 MHz. Both GPUs are from the same manufacturing batch and have the same firmware.",
    question: "What factors do modern GPU boost algorithms consider when determining clock speeds?",
    options: [
      { id: 'a', label: "Only the current temperature - cooler GPUs always clock higher" },
      { id: 'b', label: "Temperature, power consumption, voltage limits, and current draw across multiple rails - all evaluated simultaneously in real-time" , correct: true },
      { id: 'c', label: "Only the power limit setting configured by the user" },
      { id: 'd', label: "The brand of motherboard and power supply in the system" }
    ],
    explanation: "Modern boost algorithms (like NVIDIA's GPU Boost or AMD's PowerTune) continuously evaluate multiple constraints: GPU temperature, power consumption against the power limit, voltage against reliability limits, and current draw on individual power rails. The algorithm finds the highest clock that satisfies ALL constraints simultaneously. System A likely has better cooling and a higher-quality power delivery system."
  },
  // Q7: Multi-GPU power management (Hard)
  {
    scenario: "A workstation with four GPUs for machine learning training draws 600W at idle despite only displaying a basic desktop. When training begins, total system power jumps to 2000W and the room temperature rises noticeably.",
    question: "What unique power management challenges arise in multi-GPU configurations?",
    options: [
      { id: 'a', label: "Multi-GPU systems have no special challenges; each GPU manages itself independently" },
      { id: 'b', label: "Coordinated power delivery, thermal management across shared airflow, and aggregate power limits from PSU and circuits become critical constraints" , correct: true },
      { id: 'c', label: "Only the primary GPU consumes power; secondary GPUs use negligible electricity" },
      { id: 'd', label: "Multi-GPU setups always run at reduced clocks to prevent overload" }
    ],
    explanation: "Multi-GPU systems face compounded challenges: each GPU has idle leakage (explaining high idle power), the PSU must handle aggregate peak loads, thermal solutions must prevent hot GPUs from heating each other, and the electrical circuit must support total current draw. Power management must consider the system holistically, not just individual cards."
  },
  // Q8: Laptop GPU power profiles (Hard)
  {
    scenario: "A gaming laptop offers three GPU modes: 'Silent' (60W), 'Performance' (100W), and 'Turbo' (140W). A user notices that 'Turbo' mode only provides 15% more FPS than 'Performance' mode despite using 40% more power.",
    question: "Why does the relationship between power and performance become less efficient at higher power levels?",
    options: [
      { id: 'a', label: "The laptop's software is buggy and doesn't properly utilize the extra power" },
      { id: 'b', label: "Diminishing returns occur because voltage must increase disproportionately to achieve higher frequencies, and power scales with voltage squared" , correct: true },
      { id: 'c', label: "The laptop battery limits performance in all modes" },
      { id: 'd', label: "Turbo mode only affects the CPU, not the GPU" }
    ],
    explanation: "GPU efficiency follows a curve of diminishing returns. To achieve each incremental MHz increase, voltage must rise, and since power scales with V², small frequency gains require disproportionately large power increases. The sweet spot for efficiency is often at moderate power levels. Laptop profiles offer users the choice between maximum performance (Turbo) and better efficiency (Performance)."
  },
  // Q9: Undervolting for efficiency (Hard)
  {
    scenario: "An enthusiast undervolts their GPU by 100mV while maintaining the same clock speeds. The GPU now runs 8°C cooler and consumes 45W less power, but occasionally crashes in certain applications.",
    question: "Why does undervolting improve efficiency, and what determines the limit of how far you can undervolt?",
    options: [
      { id: 'a', label: "Undervolting only reduces fan noise; it has no effect on actual power consumption" },
      { id: 'b', label: "Lower voltage reduces power (P = CV²f), but each chip has a minimum voltage below which transistors fail to switch reliably at the target frequency" , correct: true },
      { id: 'c', label: "Undervolting damages the GPU over time, causing the crashes" },
      { id: 'd', label: "The crashes are caused by memory errors unrelated to voltage" }
    ],
    explanation: "Since power scales with voltage squared, even small voltage reductions yield significant power savings. However, each chip has a minimum voltage threshold for stable operation at a given frequency - below this, transistors cannot switch fast enough, causing computation errors and crashes. The 'silicon lottery' means each chip's minimum stable voltage varies slightly."
  },
  // Q10: Data center GPU power management (Hard)
  {
    scenario: "A data center runs 10,000 GPUs for AI training. The facility pays $0.10/kWh for electricity. Engineers discover that reducing GPU clocks by 15% lowers power consumption by 30% while only increasing training time by 18%.",
    question: "Why might the data center choose to run GPUs at reduced performance, and what metrics drive this decision?",
    options: [
      { id: 'a', label: "Data centers always maximize performance regardless of power costs" },
      { id: 'b', label: "Performance-per-watt and total cost of ownership matter more than raw speed; lower power reduces electricity costs, cooling costs, and enables higher GPU density" , correct: true },
      { id: 'c', label: "GPU manufacturers require data centers to undervolt for warranty purposes" },
      { id: 'd', label: "The reduced clocks only affect gaming workloads, not AI training" }
    ],
    explanation: "At data center scale, electricity becomes a major operational cost. With 10,000 GPUs, a 30% power reduction saves ~1MW, translating to ~$876,000/year in electricity alone, plus reduced cooling costs. The 18% longer training time may be acceptable if total cost per training run decreases. Data centers optimize for TCO (Total Cost of Ownership) and often find the efficiency sweet spot is below maximum performance."
  }
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Gaming Laptops',
    description: 'Laptop GPUs must balance performance with battery life and thin cooling solutions. Power limits are often 30-50% lower than desktop versions.',
    question: 'Why do laptop GPUs run slower than desktop GPUs with the same chip?',
    answer: 'Lower power limits (80-150W vs 300W+) force lower voltages and clock speeds. Thermal constraints in thin chassis further limit sustained performance.',
  },
  {
    title: 'Data Centers',
    description: 'GPU clusters for AI training must manage thousands of watts efficiently. Power and cooling costs can exceed hardware costs over the system lifetime.',
    question: 'Why do data center GPUs often run at lower clocks than gaming cards?',
    answer: 'Data centers optimize for perf-per-watt, not peak performance. Running at lower voltages/clocks reduces power dramatically while only modestly reducing throughput.',
  },
  {
    title: 'Cryptocurrency Mining',
    description: 'Miners discovered that undervolting GPUs significantly improves efficiency. The same hashrate at lower power means more profit.',
    question: 'Why does undervolting work so well for mining?',
    answer: 'Mining workloads are very predictable and dont need peak burst performance. Lower voltage at slightly reduced clocks can cut power 30-40% with only 5-10% hashrate loss.',
  },
  {
    title: 'Mobile Phones',
    description: 'Phone GPUs operate under extreme power constraints (2-10W TDP) while still delivering console-quality graphics for gaming.',
    question: 'How do mobile GPUs achieve good performance at such low power?',
    answer: 'Aggressive clock gating, tile-based rendering, and finely-tuned DVFS. The GPU scales from milliwatts when idle to full power only during demanding games.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GPUPowerStatesRenderer: React.FC<GPUPowerStatesRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
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

  // Simulation state
  const [workload, setWorkload] = useState(50); // 0-100%
  const [powerLimit, setPowerLimit] = useState(300); // Watts TDP
  const [thermalLimit, setThermalLimit] = useState(83); // Celsius
  const [isSimulating, setIsSimulating] = useState(false);

  // Dynamic state
  const [currentClock, setCurrentClock] = useState(300); // MHz
  const [currentVoltage, setCurrentVoltage] = useState(0.75); // V
  const [currentPower, setCurrentPower] = useState(15); // W
  const [currentTemp, setCurrentTemp] = useState(35); // C
  const [limitingFactor, setLimitingFactor] = useState<'none' | 'power' | 'thermal'>('none');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate GPU state based on workload and limits
  const calculateGPUState = useCallback(() => {
    // Base clock scales with workload
    const baseClock = 300 + (workload / 100) * 2400; // 300-2700 MHz range
    const baseVoltage = 0.75 + (workload / 100) * 0.45; // 0.75-1.2V range

    // Power formula: P = CV²f (capacitance * voltage² * frequency)
    const capacitance = 0.00015; // Arbitrary constant for scaling
    let power = capacitance * Math.pow(baseVoltage, 2) * baseClock * 1000;

    // Temperature rises with power (simplified model)
    let temp = 35 + (power / powerLimit) * 60;

    // Apply limits
    let clock = baseClock;
    let voltage = baseVoltage;
    let limiting: 'none' | 'power' | 'thermal' = 'none';

    // Power limiting
    if (power > powerLimit) {
      const scaleFactor = Math.sqrt(powerLimit / power);
      clock = baseClock * scaleFactor;
      voltage = baseVoltage * Math.sqrt(scaleFactor);
      power = powerLimit;
      limiting = 'power';
    }

    // Thermal limiting (takes precedence)
    if (temp > thermalLimit) {
      const thermalScale = (thermalLimit - 35) / (temp - 35);
      clock = clock * thermalScale;
      voltage = voltage * Math.sqrt(thermalScale);
      power = power * Math.pow(thermalScale, 1.5);
      temp = thermalLimit;
      limiting = 'thermal';
    }

    return {
      clock: Math.max(300, Math.min(2700, clock)),
      voltage: Math.max(0.75, Math.min(1.2, voltage)),
      power: Math.max(15, power),
      temp: Math.max(35, Math.min(thermalLimit + 5, temp)),
      limiting,
    };
  }, [workload, powerLimit, thermalLimit]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const state = calculateGPUState();
      setCurrentClock(state.clock);
      setCurrentVoltage(state.voltage);
      setCurrentPower(state.power);
      setCurrentTemp(state.temp);
      setLimitingFactor(state.limiting);
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, calculateGPUState]);

  // Initialize state on mount
  useEffect(() => {
    const state = calculateGPUState();
    setCurrentClock(state.clock);
    setCurrentVoltage(state.voltage);
    setCurrentPower(state.power);
    setCurrentTemp(state.temp);
    setLimitingFactor(state.limiting);
  }, [workload, powerLimit, thermalLimit, calculateGPUState]);

  const predictions = [
    { id: 'instant', label: 'GPUs instantly jump from idle to max power when gaming starts' },
    { id: 'gradual', label: 'GPUs gradually increase clock speed based on workload demand' },
    { id: 'fixed', label: 'GPUs always run at their rated boost clock during any workload' },
    { id: 'random', label: 'Clock speeds are random and uncontrolled' },
  ];

  const twistPredictions = [
    { id: 'thermal', label: 'Thermal limit is always reached before power limit' },
    { id: 'power', label: 'Power limit is always reached before thermal limit' },
    { id: 'either', label: 'Either limit can be reached first depending on cooling and power settings' },
    { id: 'neither', label: 'Modern GPUs never hit either limit due to advanced cooling' },
  ];

  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answerId;
    setTestAnswers(newAnswers);
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
    let score = 0;
    testAnswers.forEach((answer, i) => {
      const correctOption = TEST_QUESTIONS[i].options.find(o => o.correct);
      if (answer === correctOption?.id) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer(); // 70% threshold (7/10)
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPowerStateVisualization = () => {
    const width = 500;
    const height = 380;

    // Calculate percentages for visualization
    const powerPercent = Math.min(100, (currentPower / powerLimit) * 100);
    const tempPercent = Math.min(100, ((currentTemp - 35) / (thermalLimit - 35)) * 100);
    const clockPercent = Math.min(100, ((currentClock - 300) / 2400) * 100);
    const voltagePercent = Math.min(100, ((currentVoltage - 0.75) / 0.45) * 100);

    // State-dependent colors for GPU chip
    const getGPUStateColor = () => {
      if (limitingFactor === 'thermal') return 'url(#gpupsThermalState)';
      if (limitingFactor === 'power') return 'url(#gpupsPowerState)';
      if (workload > 70) return 'url(#gpupsHighLoad)';
      if (workload > 30) return 'url(#gpupsMediumLoad)';
      return 'url(#gpupsIdleState)';
    };

    // Animation offset for state transitions
    const animOffset = (Date.now() / 50) % 360;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ maxWidth: '520px' }}
        >
          <defs>
            {/* === BACKGROUND GRADIENTS === */}
            <linearGradient id="gpupsLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === GPU STATE GRADIENTS === */}
            <linearGradient id="gpupsIdleState" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            <linearGradient id="gpupsMediumLoad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="25%" stopColor="#047857" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            <linearGradient id="gpupsHighLoad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="25%" stopColor="#c2410c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>

            <linearGradient id="gpupsThermalState" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="25%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            <linearGradient id="gpupsPowerState" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="25%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="75%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>

            {/* === POWER BAR GRADIENT === */}
            <linearGradient id="gpupsPowerBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#84cc16" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* === TEMPERATURE GAUGE GRADIENT === */}
            <linearGradient id="gpupsTempGaugeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* === CLOCK SPEED GRADIENT === */}
            <linearGradient id="gpupsClockGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* === VOLTAGE GRADIENT === */}
            <linearGradient id="gpupsVoltageGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="30%" stopColor="#6d28d9" />
              <stop offset="60%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>

            {/* === GPU CHIP METAL GRADIENT === */}
            <linearGradient id="gpupsChipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="80%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* === HEATSINK METAL GRADIENT === */}
            <linearGradient id="gpupsHeatsinkMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="15%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="85%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>

            {/* === PCB GRADIENT === */}
            <linearGradient id="gpupsPCB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="30%" stopColor="#065f46" />
              <stop offset="70%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* === WORKLOAD BAR GRADIENT === */}
            <linearGradient id="gpupsWorkloadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* === STATUS BOX GRADIENTS === */}
            <linearGradient id="gpupsStatusNormal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
              <stop offset="50%" stopColor="rgba(16, 185, 129, 0.15)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.3)" />
            </linearGradient>

            <linearGradient id="gpupsStatusPower" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
              <stop offset="50%" stopColor="rgba(139, 92, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
            </linearGradient>

            <linearGradient id="gpupsStatusThermal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
              <stop offset="50%" stopColor="rgba(239, 68, 68, 0.15)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.3)" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            <filter id="gpupsChipGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="gpupsLimitGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="gpupsBarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="gpupsStatusGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="gpupsInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            {/* === GRID PATTERN === */}
            <pattern id="gpupsGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#gpupsLabBg)" rx="12" />
          <rect width={width} height={height} fill="url(#gpupsGridPattern)" rx="12" />

          {/* === GPU VISUALIZATION SECTION === */}
          <g transform="translate(30, 30)">
            {/* PCB Board */}
            <rect x="0" y="20" width="200" height="120" rx="6" fill="url(#gpupsPCB)" stroke="#065f46" strokeWidth="1" />

            {/* PCB Traces */}
            <g opacity="0.4">
              <line x1="10" y1="40" x2="50" y2="40" stroke="#22c55e" strokeWidth="1" />
              <line x1="10" y1="60" x2="40" y2="60" stroke="#22c55e" strokeWidth="1" />
              <line x1="10" y1="80" x2="45" y2="80" stroke="#22c55e" strokeWidth="1" />
              <line x1="10" y1="100" x2="50" y2="100" stroke="#22c55e" strokeWidth="1" />
              <line x1="10" y1="120" x2="40" y2="120" stroke="#22c55e" strokeWidth="1" />
              <line x1="150" y1="40" x2="190" y2="40" stroke="#22c55e" strokeWidth="1" />
              <line x1="160" y1="60" x2="190" y2="60" stroke="#22c55e" strokeWidth="1" />
              <line x1="155" y1="80" x2="190" y2="80" stroke="#22c55e" strokeWidth="1" />
              <line x1="150" y1="100" x2="190" y2="100" stroke="#22c55e" strokeWidth="1" />
              <line x1="160" y1="120" x2="190" y2="120" stroke="#22c55e" strokeWidth="1" />
            </g>

            {/* Heatsink Fins */}
            <g transform="translate(50, 0)">
              {[0, 12, 24, 36, 48, 60, 72, 84].map((offset, i) => (
                <rect
                  key={i}
                  x={offset}
                  y="10"
                  width="8"
                  height="20"
                  fill="url(#gpupsHeatsinkMetal)"
                  rx="1"
                />
              ))}
            </g>

            {/* GPU Die / Chip */}
            <rect
              x="55"
              y="45"
              width="90"
              height="70"
              rx="4"
              fill="url(#gpupsChipMetal)"
              stroke="#6b7280"
              strokeWidth="1"
            />

            {/* GPU Die Core with state-dependent color */}
            <rect
              x="65"
              y="55"
              width="70"
              height="50"
              rx="3"
              fill={getGPUStateColor()}
              filter={limitingFactor !== 'none' ? 'url(#gpupsChipGlow)' : undefined}
            >
              {limitingFactor !== 'none' && (
                <animate
                  attributeName="opacity"
                  values="1;0.7;1"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>

            {/* GPU Die pattern */}
            <g opacity="0.3">
              {[0, 1, 2, 3, 4].map((row) => (
                [0, 1, 2, 3, 4, 5].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={70 + col * 10}
                    y={60 + row * 9}
                    width="7"
                    height="6"
                    fill="#fff"
                    opacity={workload > (row * 6 + col) * 3.3 ? 0.4 : 0.1}
                    rx="1"
                  />
                ))
              ))}
            </g>

            {/* Memory chips */}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`mem-left-${i}`}
                x="15"
                y={35 + i * 25}
                width="25"
                height="15"
                rx="2"
                fill="#1f2937"
                stroke="#374151"
                strokeWidth="0.5"
              />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`mem-right-${i}`}
                x="160"
                y={35 + i * 25}
                width="25"
                height="15"
                rx="2"
                fill="#1f2937"
                stroke="#374151"
                strokeWidth="0.5"
              />
            ))}

            {/* VRM components */}
            {[0, 1, 2].map((i) => (
              <rect
                key={`vrm-${i}`}
                x={15 + i * 28}
                y="125"
                width="20"
                height="10"
                rx="1"
                fill="#374151"
                stroke="#4b5563"
                strokeWidth="0.5"
              />
            ))}
          </g>

          {/* === TEMPERATURE GAUGE (Circular) === */}
          <g transform="translate(250, 50)">
            {/* Gauge background */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />

            {/* Gauge fill */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gpupsTempGaugeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${tempPercent * 2.83} 283`}
              transform="rotate(-90 50 50)"
              filter={limitingFactor === 'thermal' ? 'url(#gpupsLimitGlow)' : undefined}
            />

            {/* Inner circle */}
            <circle cx="50" cy="50" r="32" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* Temperature needle */}
            <g transform={`rotate(${-135 + tempPercent * 2.7} 50 50)`}>
              <line x1="50" y1="50" x2="50" y2="25" stroke={limitingFactor === 'thermal' ? '#ef4444' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
              <circle cx="50" cy="50" r="4" fill={limitingFactor === 'thermal' ? '#ef4444' : '#64748b'} />
            </g>

            {/* Thermal limit marker */}
            <g transform="rotate(135 50 50)">
              <line x1="50" y1="8" x2="50" y2="15" stroke="#ef4444" strokeWidth="2" />
            </g>
          </g>

          {/* === POWER LEVEL INDICATOR (Vertical) === */}
          <g transform="translate(370, 30)">
            {/* Background track */}
            <rect x="0" y="0" width="30" height="120" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />

            {/* Power fill */}
            <rect
              x="3"
              y={120 - powerPercent * 1.14}
              width="24"
              height={powerPercent * 1.14}
              rx="4"
              fill="url(#gpupsPowerBarGrad)"
              filter={limitingFactor === 'power' ? 'url(#gpupsLimitGlow)' : 'url(#gpupsBarGlow)'}
            />

            {/* Power limit line */}
            <line
              x1="-5"
              y1={120 - (powerLimit / 450) * 114}
              x2="35"
              y2={120 - (powerLimit / 450) * 114}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4,2"
            />

            {/* Scale markers */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <g key={pct} transform={`translate(32, ${120 - pct * 1.14})`}>
                <line x1="0" y1="0" x2="5" y2="0" stroke="#4b5563" strokeWidth="1" />
              </g>
            ))}

            {/* Lightning bolt icon */}
            <polygon
              points="15,-8 12,0 17,0 13,10 18,0 13,0"
              fill={limitingFactor === 'power' ? '#a855f7' : '#f59e0b'}
              transform="translate(0, -5)"
            />
          </g>

          {/* === CLOCK & VOLTAGE BARS === */}
          <g transform="translate(420, 30)">
            {/* Clock Speed Bar */}
            <rect x="0" y="0" width="20" height="120" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect
              x="2"
              y={120 - clockPercent * 1.16}
              width="16"
              height={clockPercent * 1.16}
              rx="3"
              fill="url(#gpupsClockGrad)"
              filter="url(#gpupsBarGlow)"
            />

            {/* Voltage Bar */}
            <rect x="30" y="0" width="20" height="120" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect
              x="32"
              y={120 - voltagePercent * 1.16}
              width="16"
              height={voltagePercent * 1.16}
              rx="3"
              fill="url(#gpupsVoltageGrad)"
              filter="url(#gpupsBarGlow)"
            />
          </g>

          {/* === WORKLOAD BAR === */}
          <g transform="translate(30, 175)">
            <rect x="0" y="0" width="440" height="20" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect
              x="2"
              y="2"
              width={Math.max(0, workload * 4.36)}
              height="16"
              rx="4"
              fill="url(#gpupsWorkloadGrad)"
              filter="url(#gpupsBarGlow)"
            />
            {/* Workload segments */}
            {[25, 50, 75].map((pct) => (
              <line
                key={pct}
                x1={pct * 4.4}
                y1="0"
                x2={pct * 4.4}
                y2="20"
                stroke="#334155"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* === STATUS BOX === */}
          <g transform="translate(30, 210)">
            <rect
              width="440"
              height="55"
              fill={limitingFactor === 'none' ? 'url(#gpupsStatusNormal)' : limitingFactor === 'power' ? 'url(#gpupsStatusPower)' : 'url(#gpupsStatusThermal)'}
              rx="10"
              stroke={limitingFactor === 'none' ? colors.success : limitingFactor === 'power' ? colors.voltage : colors.error}
              strokeWidth="2"
              filter="url(#gpupsStatusGlow)"
            />

            {/* Status icon */}
            <g transform="translate(20, 27)">
              {limitingFactor === 'none' ? (
                <circle cx="0" cy="0" r="8" fill={colors.success} />
              ) : limitingFactor === 'power' ? (
                <polygon points="0,-8 -5,2 -1,2 -1,8 5,-2 1,-2 1,-8" fill={colors.voltage} />
              ) : (
                <polygon points="0,-8 -8,8 8,8" fill="none" stroke={colors.error} strokeWidth="2" />
              )}
            </g>
          </g>

          {/* === STATE TRANSITION ANIMATION RING === */}
          {limitingFactor !== 'none' && (
            <g transform="translate(100, 80)">
              <circle
                cx="0"
                cy="0"
                r="55"
                fill="none"
                stroke={limitingFactor === 'power' ? colors.voltage : colors.error}
                strokeWidth="2"
                strokeDasharray="10 5"
                opacity="0.5"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {/* === METRIC VALUES (positioned near their indicators) === */}
          {/* Temperature value in gauge center */}
          <text x="300" y="105" textAnchor="middle" fill={limitingFactor === 'thermal' ? colors.error : colors.textPrimary} fontSize="16" fontWeight="bold">
            {currentTemp.toFixed(0)}C
          </text>

          {/* Power value below power bar */}
          <text x="385" y="165" textAnchor="middle" fill={limitingFactor === 'power' ? colors.voltage : colors.power} fontSize="12" fontWeight="bold">
            {currentPower.toFixed(0)}W
          </text>

          {/* Clock value below clock bar */}
          <text x="432" y="165" textAnchor="middle" fill={colors.clock} fontSize="11" fontWeight="bold">
            {currentClock.toFixed(0)}
          </text>

          {/* Voltage value below voltage bar */}
          <text x="465" y="165" textAnchor="middle" fill={colors.voltage} fontSize="11" fontWeight="bold">
            {currentVoltage.toFixed(2)}V
          </text>

          {/* Workload percentage */}
          <text x="250" y="192" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            {workload}%
          </text>

          {/* Status text */}
          <text x="250" y="235" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">
            {limitingFactor === 'none' ? 'Operating Normally' : limitingFactor === 'power' ? 'POWER LIMITED' : 'THERMAL LIMITED'}
          </text>
          <text x="250" y="253" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            {limitingFactor === 'none' ? 'GPU running at requested performance' : limitingFactor === 'power' ? `Throttling to stay under ${powerLimit}W TDP` : `Throttling to stay under ${thermalLimit}C`}
          </text>

          {/* === POWER RESPONSE CURVE (P = CV²f theoretical curve) === */}
          <path
            d="M30 340 L70 338 L110 334 L150 325 L190 310 L230 285 L270 250 L310 205 L350 150 L390 95 L430 60 L470 50"
            fill="none"
            stroke="rgba(249, 115, 22, 0.12)"
            strokeWidth="2"
            strokeDasharray="6,4"
          />

          {/* === FORMULA DISPLAY === */}
          <rect x="30" y="280" width="440" height="35" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" strokeWidth="1" />
          <text x="250" y="295" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
            P = CV²f
          </text>
          <text x="250" y="308" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Power = Capacitance × Voltage² × Frequency
          </text>

          {/* Bar labels */}
          <text x="385" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="11">PWR</text>
          <text x="432" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="11">CLK</text>
          <text x="465" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="11">V</text>
          <text x="300" y="30" textAnchor="middle" fill={colors.textMuted} fontSize="11">TEMP</text>
        </svg>

        {/* External labels using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '520px',
          paddingLeft: typo.pagePadding,
          paddingRight: typo.pagePadding
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPU State</div>
            <div style={{
              fontSize: typo.small,
              fontWeight: 700,
              color: limitingFactor === 'thermal' ? colors.error : limitingFactor === 'power' ? colors.voltage : workload > 70 ? colors.thermal : workload > 30 ? colors.success : colors.clock
            }}>
              {limitingFactor === 'thermal' ? 'Thermal Throttle' : limitingFactor === 'power' ? 'Power Throttle' : workload > 70 ? 'High Load' : workload > 30 ? 'Active' : 'Idle'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workload</div>
            <div style={{ fontSize: typo.small, fontWeight: 700, color: colors.accent }}>{workload}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temperature</div>
            <div style={{ fontSize: typo.small, fontWeight: 700, color: limitingFactor === 'thermal' ? colors.error : colors.thermal }}>{currentTemp.toFixed(0)}°C</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Power</div>
            <div style={{ fontSize: typo.small, fontWeight: 700, color: limitingFactor === 'power' ? colors.voltage : colors.power }}>{currentPower.toFixed(0)}W</div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    minHeight: '44px',
    WebkitTapHighlightColor: 'transparent' as const,
    transition: 'all 0.2s ease',
  };

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
        <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600 }}>
          Power States
        </span>
        <div
          role="navigation"
          aria-label="Phase navigation"
          className="nav-dots"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}
        >
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              aria-label={`${phaseLabels[p]} phase${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
              aria-current={i === currentIdx ? 'step' : undefined}
              className="nav-dot"
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                border: 'none',
                padding: 0,
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
  const renderBottomBar = (canProceed: boolean, buttonText: string) => {
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
          aria-label="Go back to previous phase"
          style={{
            ...buttonStyle,
            background: canGoBack ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={!canProceed}
          aria-label={`Continue to next phase: ${buttonText}`}
          style={{
            ...buttonStyle,
            background: canProceed ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Does Your GPU Idle at Low Power?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The physics of dynamic power management
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderPowerStateVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Your GPU might use 15W at the desktop but boost to 300W+ while gaming.
                That is a 20x difference! How do GPUs manage such dramatic power swings,
                and why do they sometimes throttle even when you want maximum performance?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                The answer involves voltage, frequency, and careful thermal management.
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                <strong style={{ fontWeight: 700 }}>Key Formula:</strong> Power scales with voltage SQUARED times frequency: P = CV squared f
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>How Do GPUs Manage Power?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What happens when you launch a game?
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderPowerStateVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does a GPU transition from idle to gaming?
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
                    background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>GPU Power Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust workload and limits to see power management in action
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start', padding: '0 16px' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPowerStateVisualization()}
              </div>

              {/* Observation guidance */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.15)',
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                  Try adjusting the workload slider and observe how the GPU automatically adjusts clock speed and voltage. Notice what happens when you hit the power or thermal limits.
                </p>
              </div>

              {/* Real-world relevance */}
              <div style={{
                background: colors.bgCard,
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Real-world relevance:</strong> This same power management technology enables laptops to last 10+ hours on battery while still delivering gaming performance when plugged in. Data centers use these techniques to save millions in electricity costs annually.
                </p>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  GPU Workload: {workload}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={workload}
                  onChange={(e) => setWorkload(parseInt(e.target.value))}
                  onInput={(e) => setWorkload(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Power Limit (TDP): {powerLimit}W
                </label>
                <input
                  type="range"
                  min="100"
                  max="450"
                  step="10"
                  value={powerLimit}
                  onChange={(e) => setPowerLimit(parseInt(e.target.value))}
                  onInput={(e) => setPowerLimit(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Thermal Limit: {thermalLimit}C
                </label>
                <input
                  type="range"
                  min="70"
                  max="95"
                  value={thermalLimit}
                  onChange={(e) => setThermalLimit(parseInt(e.target.value))}
                  onInput={(e) => setThermalLimit(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              {/* Cause-effect explanation */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                borderLeft: `3px solid ${colors.clock}`,
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Observe:</strong> When you increase the workload, the GPU automatically raises voltage and clock speed. As these values rise, power consumption increases exponentially due to the V-squared relationship. When you hit the power or thermal limit, the GPU throttles by reducing clocks to stay within safe operating parameters.
                </p>
              </div>

              {/* Before/After Comparison */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}>
                  <div style={{ color: colors.clock, fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Reference: Idle Baseline</div>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Clock: 300 MHz</div>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Voltage: 0.75V</div>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Power: 15W</div>
                </div>
                <div style={{
                  background: 'rgba(249, 115, 22, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid rgba(249, 115, 22, 0.3)`,
                }}>
                  <div style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Current State</div>
                  <div style={{ color: colors.textPrimary, fontSize: '13px' }}>Clock: {currentClock.toFixed(0)} MHz</div>
                  <div style={{ color: colors.textPrimary, fontSize: '13px' }}>Voltage: {currentVoltage.toFixed(2)}V</div>
                  <div style={{ color: colors.textPrimary, fontSize: '13px' }}>Power: {currentPower.toFixed(0)}W ({(currentPower / 15).toFixed(1)}x vs baseline)</div>
                </div>
              </div>

              <div style={{
                background: colors.bgCard,
                padding: '16px',
                borderRadius: '8px',
              }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Power Formula: P = CV squared f</h4>
                <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px', fontWeight: 400 }}>
                  <li><strong style={{ fontWeight: 700 }}>C:</strong> Capacitance (fixed by chip design)</li>
                  <li><strong style={{ fontWeight: 700 }}>V:</strong> Voltage - reducing this saves the most power!</li>
                  <li><strong style={{ fontWeight: 700 }}>f:</strong> Frequency (clock speed)</li>
                  <li>Halving voltage reduces power by 75%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'gradual';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>
              You predicted: {userPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              GPUs use Dynamic Voltage and Frequency Scaling (DVFS) to gradually adjust
              performance based on workload. This saves power during light tasks while
              boosting for demanding games.
            </p>
          </div>

          {/* SVG Diagram for DVFS concept */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ maxWidth: '400px' }}>
              <defs>
                <linearGradient id="reviewDvfsGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="400" height="200" fill="#0f172a" rx="12" />

              {/* Title */}
              <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">DVFS: Dynamic Voltage & Frequency Scaling</text>

              {/* Workload axis */}
              <line x1="50" y1="170" x2="350" y2="170" stroke={colors.textMuted} strokeWidth="2" />
              <text x="200" y="190" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Workload</text>
              <text x="50" y="185" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Low</text>
              <text x="350" y="185" fill={colors.textSecondary} fontSize="11" textAnchor="middle">High</text>

              {/* Power/Voltage axis */}
              <line x1="50" y1="170" x2="50" y2="40" stroke={colors.textMuted} strokeWidth="2" />
              <text x="25" y="105" fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform="rotate(-90, 25, 105)">Power</text>

              {/* DVFS curve */}
              <path d="M50 160 Q150 150 200 120 Q250 90 300 60 Q325 45 350 40" fill="none" stroke="url(#reviewDvfsGrad)" strokeWidth="4" strokeLinecap="round" />

              {/* State markers */}
              <circle cx="80" cy="155" r="8" fill="#22c55e" />
              <text x="80" y="143" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Idle</text>

              <circle cx="200" cy="120" r="8" fill="#f59e0b" />
              <text x="200" y="108" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Active</text>

              <circle cx="320" cy="50" r="8" fill="#ef4444" />
              <text x="320" y="38" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Boost</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Physics of GPU Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Clock Gating:</strong> Transistors that
                are not in use have their clock signals disabled. No switching = no dynamic power.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Voltage Scaling:</strong> Lower
                workloads allow lower voltages. Since power scales with V squared, this is very effective.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Boost Clocks:</strong> When power and
                thermal headroom exist, the GPU boosts above base clock for extra performance.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Throttling:</strong> When limits are
                reached, the GPU reduces clocks to stay within safe operating parameters.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Power vs Thermal Limits</h2>
            <p style={{ color: colors.textSecondary }}>
              Which limit do GPUs hit first?
            </p>
          </div>

          {/* SVG visualization for twist_predict */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ maxWidth: '400px' }}>
              <defs>
                <linearGradient id="twistPowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="twistThermalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="400" height="200" fill="#0f172a" rx="12" />

              {/* Power limit bar */}
              <text x="30" y="50" fill={colors.textSecondary} fontSize="12">Power Limit</text>
              <rect x="30" y="60" width="150" height="30" fill="url(#twistPowerGrad)" rx="6" />
              <text x="95" y="80" fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">TDP (Watts)</text>

              {/* Thermal limit bar */}
              <text x="220" y="50" fill={colors.textSecondary} fontSize="12">Thermal Limit</text>
              <rect x="220" y="60" width="150" height="30" fill="url(#twistThermalGrad)" rx="6" />
              <text x="295" y="80" fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">Max Temp (C)</text>

              {/* GPU in center */}
              <rect x="150" y="120" width="100" height="50" fill="#1e293b" rx="8" stroke="#4b5563" strokeWidth="2" />
              <text x="200" y="150" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">GPU</text>

              {/* Arrows pointing to GPU */}
              <path d="M105 90 L160 120" stroke="#8b5cf6" strokeWidth="2" fill="none" markerEnd="url(#arrowPurple)" />
              <path d="M295 90 L240 120" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />

              {/* Question mark */}
              <text x="200" y="195" fill={colors.warning} fontSize="18" textAnchor="middle" fontWeight="bold">Which hits first?</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              GPUs have both a power limit (TDP in watts) and a thermal limit (max safe temperature).
              Either one can cause throttling. But which one typically limits performance?
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which limit is typically reached first?
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
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Limiting Factor</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust power and thermal limits to see which one throttles first
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start', padding: '0 16px' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPowerStateVisualization()}
              </div>

              {/* Observation guidance */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.15)',
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                  Experiment with lowering the power limit or thermal limit to see which one causes throttling first. Notice how the GPU color and status change when limits are hit.
                </p>
              </div>

              {/* Real-world relevance */}
              <div style={{
                background: colors.bgCard,
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Real-world relevance:</strong> Overclocking enthusiasts and data center operators tune these limits daily. Understanding which constraint is active helps optimize for either maximum performance or energy efficiency.
                </p>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Workload: {workload}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={workload}
                  onChange={(e) => setWorkload(parseInt(e.target.value))}
                  onInput={(e) => setWorkload(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Power Limit: {powerLimit}W (try lowering to see power throttling)
                </label>
                <input
                  type="range"
                  min="150"
                  max="400"
                  step="10"
                  value={powerLimit}
                  onChange={(e) => setPowerLimit(parseInt(e.target.value))}
                  onInput={(e) => setPowerLimit(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Thermal Limit: {thermalLimit}C (try lowering to see thermal throttling)
                </label>
                <input
                  type="range"
                  min="65"
                  max="95"
                  value={thermalLimit}
                  onChange={(e) => setThermalLimit(parseInt(e.target.value))}
                  onInput={(e) => setThermalLimit(parseInt((e.target as HTMLInputElement).value))}
                  style={{ width: '100%', accentColor: colors.accent, height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, cursor: 'pointer' }}
                />
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.warning}`,
              }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Current Status:</h4>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                  {limitingFactor === 'none' && 'GPU running freely - neither limit reached'}
                  {limitingFactor === 'power' && `Power limited at ${powerLimit}W - would run hotter with more power`}
                  {limitingFactor === 'thermal' && `Thermal limited at ${thermalLimit}C - needs better cooling to use full power`}
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'either';
    const userTwistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>
              You predicted: {userTwistPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              Either limit can be reached first! With excellent cooling, you hit the power limit.
              With a restrictive power limit, you might never reach thermal limits. The GPU
              constantly monitors both.
            </p>
          </div>

          {/* SVG Diagram for limit comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <svg width="100%" height="180" viewBox="0 0 400 180" style={{ maxWidth: '400px' }}>
              <defs>
                <linearGradient id="twistReviewPowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="twistReviewThermalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="400" height="180" fill="#0f172a" rx="12" />

              {/* Title */}
              <text x="200" y="25" fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="bold">Power vs Thermal: Either Can Limit Performance</text>

              {/* Scenario A: Power-limited */}
              <rect x="20" y="50" width="170" height="60" fill="rgba(139, 92, 246, 0.2)" rx="8" stroke="#8b5cf6" strokeWidth="1" />
              <text x="105" y="68" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Good Cooling</text>
              <text x="105" y="88" fill="#a855f7" fontSize="12" textAnchor="middle" fontWeight="bold">POWER LIMITED</text>
              <text x="105" y="105" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Hits TDP first</text>

              {/* Scenario B: Thermal-limited */}
              <rect x="210" y="50" width="170" height="60" fill="rgba(239, 68, 68, 0.2)" rx="8" stroke="#ef4444" strokeWidth="1" />
              <text x="295" y="68" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Poor Cooling</text>
              <text x="295" y="88" fill="#ef4444" fontSize="12" textAnchor="middle" fontWeight="bold">THERMAL LIMITED</text>
              <text x="295" y="105" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Overheats first</text>

              {/* Bottom insight */}
              <text x="200" y="138" fill={colors.warning} fontSize="12" textAnchor="middle" fontWeight="bold">Which limit matters depends on your setup!</text>
              <text x="200" y="158" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Better cooling = power-limited | Poor airflow = thermal-limited</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Understanding the Limits</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power-Limited Scenario:</strong> With
                high-end cooling (custom water loops), the GPU stays cool enough to sustain
                max power indefinitely. Performance is limited by TDP settings.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal-Limited Scenario:</strong> With
                poor airflow or hot ambient temperatures, the GPU throttles to avoid damage
                even if power headroom exists.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Balancing Act:</strong> Manufacturers
                tune default limits so most users hit power limits before thermal limits with
                stock coolers - maximizing safe performance.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Tuning Options:</strong> Enthusiasts
                can raise power limits (more performance, more heat) or lower them (quieter,
                more efficient) based on their cooling and preferences.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="G P U Power States"
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              Complete all 4 applications to unlock the test. Click each card to learn how GPU power management applies in practice.
            </p>

            {/* Introduction Got It button for immediate interaction */}
            {transferCompleted.size === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => setTransferCompleted(new Set([0]))}
                  style={{
                    ...buttonStyle,
                    padding: '12px 24px',
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`,
                    border: 'none',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  Got It - Start Exploring
                </button>
              </div>
            )}
          </div>

          {TRANSFER_APPLICATIONS.map((app, index) => (
            <div
              key={index}
              data-transfer-card
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    ...buttonStyle,
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.accent}`,
                    color: colors.accent,
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {
                      // Move to next uncompleted application or stay if all done
                      const nextIndex = TRANSFER_APPLICATIONS.findIndex((_, i) => i > index && !transferCompleted.has(i));
                      if (nextIndex !== -1) {
                        // Scroll to next application
                        const cards = document.querySelectorAll('[data-transfer-card]');
                        if (cards[nextIndex]) {
                          cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }}
                    style={{
                      ...buttonStyle,
                      padding: '8px 16px',
                      background: colors.success,
                      border: 'none',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 700,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {index < TRANSFER_APPLICATIONS.length - 1 ? 'Got It - Next Application' : 'Got It'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7; // 70% threshold
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
            <div style={{
              background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: passed ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore === 10 ? 'Perfect!' : testScore >= 8 ? 'Excellent!' : testScore >= 7 ? 'Great Job!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {passed ? 'You understand GPU power management!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {TEST_QUESTIONS.map((q, i) => {
              const userAnswer = testAnswers[i];
              const correctOption = q.options.find(o => o.correct);
              const userOption = q.options.find(o => o.id === userAnswer);
              const isCorrect = userAnswer === correctOption?.id;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '8px' }}>
                    {i + 1}. {q.question}
                  </p>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px' }}>
                    {q.scenario}
                  </p>
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    marginBottom: '8px',
                  }}>
                    <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                    </p>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
                      {userOption?.label || 'No answer selected'}
                    </p>
                  </div>
                  {!isCorrect && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      marginBottom: '8px',
                    }}>
                      <p style={{ color: colors.success, fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                        Correct Answer
                      </p>
                      <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
                        {correctOption?.label}
                      </p>
                    </div>
                  )}
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(249, 115, 22, 0.1)',
                  }}>
                    <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                      Explanation
                    </p>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {renderBottomBar(passed, passed ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 400 }}>Question {currentTestIndex + 1} of {TEST_QUESTIONS.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {TEST_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestIndex(i)}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestIndex ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                />
              ))}
            </div>

            {/* Scenario Box */}
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: `1px solid ${colors.accent}30`,
            }}>
              <p style={{ color: colors.accent, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Scenario
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <p style={{ color: colors.textPrimary, fontSize: '17px', fontWeight: 'bold', marginBottom: '20px', lineHeight: 1.4 }}>
              {currentQ.question}
            </p>

            {/* Multiple Choice Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    background: testAnswers[currentTestIndex] === opt.id ? 'rgba(249, 115, 22, 0.2)' : colors.bgCard,
                    border: testAnswers[currentTestIndex] === opt.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    zIndex: 10,
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: testAnswers[currentTestIndex] === opt.id ? colors.accent : 'rgba(255,255,255,0.1)',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: testAnswers[currentTestIndex] === opt.id ? 'white' : colors.textMuted,
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textSecondary,
                    margin: 0,
                    lineHeight: 1.4,
                  }}>
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>

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
                  WebkitTapHighlightColor: 'transparent',
                  zIndex: 10,
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  style={{
                    ...buttonStyle,
                    background: colors.accent,
                    color: 'white',
                    WebkitTapHighlightColor: 'transparent',
                    zIndex: 10,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!allAnswered}
                  style={{
                    ...buttonStyle,
                    background: allAnswered ? colors.success : colors.textMuted,
                    color: 'white',
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    WebkitTapHighlightColor: 'transparent',
                    zIndex: 10,
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand GPU power states and thermal management
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
              <li>Power scales with V squared times f - voltage matters most</li>
              <li>Clock gating saves power by disabling unused circuits</li>
              <li>DVFS dynamically adjusts voltage and frequency to workload</li>
              <li>Boost clocks use thermal and power headroom for extra performance</li>
              <li>Either power or thermal limits can cause throttling</li>
              <li>Good cooling enables higher sustained clocks</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(249, 115, 22, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern GPUs have hundreds of individual power domains that can be gated
              independently. Advanced boost algorithms consider workload type, silicon
              quality, and even aging effects. The next frontier is chiplet designs where
              different components can run at different power states simultaneously!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderPowerStateVisualization()}
          </div>
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default GPUPowerStatesRenderer;
