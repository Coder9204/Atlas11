'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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
  twist_play: 'Limit Lab',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
  // Q1: Core Concept - Clock Gating (Easy) - Correct: A
  {
    scenario: "A GPU has millions of transistors, but during a light desktop workload, only 10% of its shader units are actively processing data.",
    question: "How does the GPU save power for the unused 90% of shader units?",
    options: [
      { id: 'gating', label: "Clock gating disables clock signals to unused transistors, eliminating switching power", correct: true },
      { id: 'remove', label: "The GPU physically disconnects unused transistors from the circuit" },
      { id: 'slow', label: "Unused transistors run at a slower clock speed automatically" },
      { id: 'same', label: "All transistors consume the same power regardless of activity" },
    ],
    explanation: "Clock gating stops the clock signal to inactive circuits. Since dynamic power only occurs when transistors switch states, no clock means no switching means no power consumption in those regions."
  },
  // Q2: Core Concept - Power Formula (Medium) - Correct: C
  {
    scenario: "An engineer is trying to reduce GPU power consumption. The power formula is P = CV²f, where C is capacitance, V is voltage, and f is frequency.",
    question: "Which modification would reduce power consumption the MOST?",
    options: [
      { id: 'freq', label: "Halving the clock frequency (f) while keeping voltage the same" },
      { id: 'cap', label: "Reducing capacitance (C) by 25% through smaller transistors" },
      { id: 'volt', label: "Reducing voltage (V) by 30% while slightly lowering frequency", correct: true },
      { id: 'both', label: "Doubling frequency while halving voltage" },
    ],
    explanation: "Voltage is squared in the power equation! Reducing voltage by 30% reduces power by about 51% (0.7² = 0.49). This is why voltage scaling is the most effective power-saving technique."
  },
  // Q3: Core Concept - DVFS (Medium) - Correct: B
  {
    scenario: "Your laptop GPU switches between 400 MHz at 0.7V when browsing the web and 2100 MHz at 1.1V when gaming. This happens automatically without user intervention.",
    question: "What technology enables this automatic adjustment?",
    options: [
      { id: 'manual', label: "Manual power profiles that the operating system switches between" },
      { id: 'dvfs', label: "Dynamic Voltage and Frequency Scaling (DVFS) that monitors workload in real-time", correct: true },
      { id: 'fixed', label: "Fixed power states that change only when applications request them" },
      { id: 'thermal', label: "Thermal throttling that forces lower clocks when the GPU overheats" },
    ],
    explanation: "DVFS continuously monitors GPU workload and adjusts both voltage and frequency together. This saves power during light tasks while providing full performance when needed - all automatically."
  },
  // Q4: Thermal vs Power Limits (Medium-Hard) - Correct: D
  {
    scenario: "Two identical GPUs are tested: GPU A has a high-end water cooling loop, GPU B has a stock air cooler. Both have a 300W TDP limit and 83°C thermal limit.",
    question: "Under sustained heavy load, which limit will each GPU hit first?",
    options: [
      { id: 'both_thermal', label: "Both hit thermal limit first - cooling quality doesn't affect this" },
      { id: 'both_power', label: "Both hit power limit first - TDP is always the primary constraint" },
      { id: 'a_thermal', label: "GPU A hits thermal first, GPU B hits power first" },
      { id: 'a_power', label: "GPU A hits power limit first (stays cool enough), GPU B hits thermal limit first", correct: true },
    ],
    explanation: "With excellent cooling, GPU A stays below 83°C even at 300W, so power is the limit. GPU B's weaker cooling causes temperature to rise faster than power draw, hitting thermal limits before reaching full TDP."
  },
  // Q5: Idle Power States (Medium) - Correct: A
  {
    scenario: "A GPU at idle displays a static desktop. Monitoring software shows it consuming 15W instead of 0W, with clocks at 300 MHz and voltage at 0.75V.",
    question: "Why doesn't the GPU consume zero watts at idle?",
    options: [
      { id: 'leakage', label: "Static leakage current flows through transistors even when not switching, plus display output requires some power", correct: true },
      { id: 'ready', label: "The GPU keeps all circuits powered on to be ready for instant gaming" },
      { id: 'error', label: "The monitoring software is incorrect - idle GPUs do consume zero watts" },
      { id: 'fan', label: "The 15W is entirely consumed by the cooling fans" },
    ],
    explanation: "Even at idle, transistors have static leakage current (electrons tunneling through thin insulation). Plus, the display engine, memory interface, and video output circuits must remain active. True zero power is impossible while the system is on."
  },
  // Q6: Boost Clocks (Hard) - Correct: C
  {
    scenario: "A GPU has a base clock of 1800 MHz and a boost clock of 2400 MHz. During gaming, you notice it actually runs at 2250 MHz sustained.",
    question: "Why doesn't the GPU maintain its maximum 2400 MHz boost clock?",
    options: [
      { id: 'defect', label: "The GPU chip is defective and cannot reach its rated speed" },
      { id: 'driver', label: "The driver artificially limits boost clocks to extend GPU lifespan" },
      { id: 'balance', label: "Boost algorithms continuously balance power budget, thermals, and reliability margins", correct: true },
      { id: 'game', label: "The game doesn't require the full 2400 MHz, so the GPU saves power" },
    ],
    explanation: "Boost clocks are opportunistic maximums, not guaranteed speeds. The GPU's firmware constantly evaluates power headroom, temperature trends, and voltage reliability margins. 2250 MHz sustained means the algorithm found the optimal balance point."
  },
  // Q7: Thermal Throttling (Medium) - Correct: B
  {
    scenario: "During a stress test, your GPU temperature hits 83°C. The clock speed suddenly drops from 2100 MHz to 1650 MHz, and temperature stabilizes at 82°C.",
    question: "What mechanism caused this behavior?",
    options: [
      { id: 'crash', label: "The GPU detected an error and entered a safe mode" },
      { id: 'throttle', label: "Thermal throttling reduced clocks to prevent exceeding the temperature limit", correct: true },
      { id: 'power', label: "Power throttling kicked in because 2100 MHz exceeded the TDP" },
      { id: 'driver', label: "The graphics driver limited performance to prevent damage" },
    ],
    explanation: "Thermal throttling is a hardware protection mechanism. When temperature approaches the limit (83°C), the GPU automatically reduces voltage and frequency to lower power dissipation and stabilize temperature."
  },
  // Q8: Sleep States and Wake Latency (Hard) - Correct: D
  {
    scenario: "A mobile GPU supports multiple power states: D0 (active), D1 (light sleep), D2 (deep sleep), and D3 (off). Wake latency increases from D1 (0.1ms) to D3 (50ms).",
    question: "Why would a system choose D1 over D3 for a GPU that's been idle for 100ms?",
    options: [
      { id: 'same', label: "D1 and D3 consume the same power, so latency is the only factor" },
      { id: 'never', label: "Systems always choose the deepest sleep state for maximum power savings" },
      { id: 'damage', label: "Entering D3 too frequently causes physical damage to the GPU" },
      { id: 'tradeoff', label: "The energy saved by D3 over 100ms doesn't offset the wake energy cost and latency penalty", correct: true },
    ],
    explanation: "Deeper sleep states save more power per second but cost energy to enter/exit. For short idle periods, the wake latency penalty and transition energy can exceed the savings. The OS power manager predicts idle duration to choose optimally."
  },
  // Q9: Power Efficiency Metrics (Hard) - Correct: A
  {
    scenario: "Comparing two GPUs: GPU X delivers 100 FPS at 250W, GPU Y delivers 90 FPS at 180W. A data center is choosing between them for AI training.",
    question: "Which GPU should the data center choose for 24/7 operation, and why?",
    options: [
      { id: 'y_efficient', label: "GPU Y - it has better performance per watt (0.5 vs 0.4 FPS/W), reducing electricity costs", correct: true },
      { id: 'x_fast', label: "GPU X - faster completion means less total energy used" },
      { id: 'x_fewer', label: "GPU X - fewer GPUs needed means lower hardware costs" },
      { id: 'same', label: "Both are equivalent - total work done per dollar is the same" },
    ],
    explanation: "For 24/7 operation, performance-per-watt dominates. GPU Y achieves 0.5 FPS/W vs GPU X's 0.4 FPS/W. Over years of operation, electricity costs often exceed hardware costs. Data centers optimize for efficiency, not peak performance."
  },
  // Q10: Silicon Quality and Binning (Medium-Hard) - Correct: C
  {
    scenario: "Two GPUs of the same model have different maximum stable clocks: Card A reaches 2500 MHz at 1.1V, Card B only reaches 2350 MHz at the same voltage.",
    question: "What causes this variation between identical GPU models?",
    options: [
      { id: 'fake', label: "Card B is a counterfeit with inferior components" },
      { id: 'worn', label: "Card B was used previously and has degraded over time" },
      { id: 'silicon', label: "Manufacturing variations in silicon quality create chips with different characteristics", correct: true },
      { id: 'firmware', label: "Different firmware versions limit Card B's maximum clock" },
    ],
    explanation: "The 'silicon lottery' refers to natural variations in chip manufacturing. Microscopic differences in transistor size, doping levels, and defect density mean every chip has slightly different voltage-frequency characteristics. This is why overclock results vary."
  },
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
            <path
              d="M15 -8 L12 0 L17 0 L13 10 L18 0 L13 0 Z"
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
                <path d="M0 -8 L-5 2 L-1 2 L-1 8 L5 -2 L1 -2 L1 -8 Z" fill={colors.voltage} />
              ) : (
                <path d="M0 -8 L-8 8 L8 8 Z M0 -4 L0 2 M0 5 L0 6" fill="none" stroke={colors.error} strokeWidth="2" />
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
          <text x="430" y="165" textAnchor="middle" fill={colors.clock} fontSize="10" fontWeight="bold">
            {currentClock.toFixed(0)}
          </text>

          {/* Voltage value below voltage bar */}
          <text x="460" y="165" textAnchor="middle" fill={colors.voltage} fontSize="10" fontWeight="bold">
            {currentVoltage.toFixed(2)}V
          </text>

          {/* Workload percentage */}
          <text x="250" y="192" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            {workload}%
          </text>

          {/* Status text */}
          <text x="250" y="235" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">
            {limitingFactor === 'none' ? 'Operating Normally' : limitingFactor === 'power' ? 'POWER LIMITED' : 'THERMAL LIMITED'}
          </text>
          <text x="250" y="253" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            {limitingFactor === 'none' ? 'GPU running at requested performance' : limitingFactor === 'power' ? `Throttling to stay under ${powerLimit}W TDP` : `Throttling to stay under ${thermalLimit}C`}
          </text>

          {/* === FORMULA DISPLAY === */}
          <g transform="translate(30, 280)">
            <rect x="0" y="0" width="440" height="35" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" strokeWidth="1" />
            <text x="220" y="15" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
              P = CV²f
            </text>
            <text x="220" y="28" textAnchor="middle" fill={colors.textMuted} fontSize="9">
              Power = Capacitance × Voltage² × Frequency
            </text>
          </g>

          {/* Bar labels */}
          <text x="385" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="9">PWR</text>
          <text x="430" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="9">CLK</text>
          <text x="460" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="9">V</text>
          <text x="300" y="30" textAnchor="middle" fill={colors.textMuted} fontSize="9">TEMP</text>
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
    WebkitTapHighlightColor: 'transparent' as const,
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
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          Power States
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
          style={{
            ...buttonStyle,
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={!canProceed}
          style={{
            ...buttonStyle,
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Your GPU might use 15W at the desktop but boost to 300W+ while gaming.
                That is a 20x difference! How do GPUs manage such dramatic power swings,
                and why do they sometimes throttle even when you want maximum performance?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer involves voltage, frequency, and careful thermal management.
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Power scales with voltage SQUARED times frequency: P = CV squared f
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
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

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderPowerStateVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
              />
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Power Formula: P = CV squared f</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                <li><strong>C:</strong> Capacitance (fixed by chip design)</li>
                <li><strong>V:</strong> Voltage - reducing this saves the most power!</li>
                <li><strong>f:</strong> Frequency (clock speed)</li>
                <li>Halving voltage reduces power by 75%</li>
              </ul>
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
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              GPUs use Dynamic Voltage and Frequency Scaling (DVFS) to gradually adjust
              performance based on workload. This saves power during light tasks while
              boosting for demanding games.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of GPU Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Clock Gating:</strong> Transistors that
                are not in use have their clock signals disabled. No switching = no dynamic power.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Voltage Scaling:</strong> Lower
                workloads allow lower voltages. Since power scales with V squared, this is very effective.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Boost Clocks:</strong> When power and
                thermal headroom exist, the GPU boosts above base clock for extra performance.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Throttling:</strong> When limits are
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

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderPowerStateVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
              />
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Current Status:</h4>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                {limitingFactor === 'none' && 'GPU running freely - neither limit reached'}
                {limitingFactor === 'power' && `Power limited at ${powerLimit}W - would run hotter with more power`}
                {limitingFactor === 'thermal' && `Thermal limited at ${thermalLimit}C - needs better cooling to use full power`}
              </p>
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
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Either limit can be reached first! With excellent cooling, you hit the power limit.
              With a restrictive power limit, you might never reach thermal limits. The GPU
              constantly monitors both.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Understanding the Limits</h3>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
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
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
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
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestIndex + 1} / {TEST_QUESTIONS.length}</span>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
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
