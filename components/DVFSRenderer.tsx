'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// DVFS (Dynamic Voltage/Frequency Scaling) - Complete 10-Phase Game
// Why GPUs can't sustain boost clocks forever - thermal and power limits
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

interface DVFSRendererProps {
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
    scenario: "A gamer notices their GPU boosts to 2100 MHz at the start of a benchmark, but after 5 minutes of intensive gaming, the clock speed has dropped to 1850 MHz even though the GPU isn't reaching its thermal limit of 83C.",
    question: "What is the most likely cause of this clock speed reduction?",
    options: [
      { id: 'a', label: "The GPU driver has a bug that needs updating" },
      { id: 'b', label: "The power limit is being reached before the thermal limit", correct: true },
      { id: 'c', label: "The game is not demanding enough to sustain boost clocks" },
      { id: 'd', label: "The GPU memory is overheating and throttling the core" }
    ],
    explanation: "Modern GPUs have both thermal and power limits. The power limit (TDP) is often reached before thermal limits, especially with efficient cooling. The GPU's power management reduces clocks to stay within its power budget, even when temperatures are acceptable."
  },
  {
    scenario: "An engineer notices that doubling the voltage from 1.0V to 1.2V (20% increase) causes the GPU power consumption to increase by more than 20%.",
    question: "Why does power increase disproportionately to voltage increase?",
    options: [
      { id: 'a', label: "The power supply is inefficient at higher voltages" },
      { id: 'b', label: "Dynamic power scales with V squared (P = C * V^2 * f)", correct: true },
      { id: 'c', label: "The GPU has a design flaw causing power leakage" },
      { id: 'd', label: "Higher voltage activates more transistors" }
    ],
    explanation: "Dynamic power follows P = C * V^2 * f. Power scales with voltage squared, so a 20% voltage increase (1.2/1.0 = 1.44) causes roughly 44% more power consumption. This quadratic relationship is why voltage reduction is so effective for power savings."
  },
  {
    scenario: "A data center operator runs AI training workloads 24/7. They notice that running GPUs at 85% of maximum clock speed instead of 100% reduces power consumption by 25% while only reducing training time by 10%.",
    question: "Why does this efficiency tradeoff occur?",
    options: [
      { id: 'a', label: "Lower clocks allow the cooling system to work less" },
      { id: 'b', label: "Lower frequency requires lower voltage, and power scales with V^2", correct: true },
      { id: 'c', label: "The AI training algorithm is more efficient at lower speeds" },
      { id: 'd', label: "The GPUs can process data more accurately at lower speeds" }
    ],
    explanation: "DVFS allows voltage reduction when frequency decreases. Since power scales with V^2 * f, a modest frequency reduction that enables significant voltage reduction yields disproportionate power savings. This is why efficiency-optimized clocks often provide better perf-per-watt."
  },
  {
    scenario: "A thermal engineer models a GPU die as a thermal RC circuit. They measure that after a power step, the die temperature reaches 63% of its final value in 0.5 seconds.",
    question: "What does this 0.5 second time constant tell us about the thermal system?",
    options: [
      { id: 'a', label: "The GPU heatsink is undersized for the application" },
      { id: 'b', label: "The thermal interface material is of poor quality" },
      { id: 'c', label: "The product of thermal resistance and thermal capacitance is 0.5 seconds", correct: true },
      { id: 'd', label: "The die will reach maximum temperature in exactly 0.5 seconds" }
    ],
    explanation: "The thermal time constant tau = R_th * C_th determines how quickly temperatures respond to power changes. A 0.5s time constant means the die reaches 63% of final temperature change after 0.5s, 86% after 1s, 95% after 1.5s. This RC model is crucial for understanding thermal throttling dynamics."
  },
  {
    scenario: "Two identical laptops run the same game. Laptop A has a small fan curve (low RPM). Laptop B has an aggressive fan curve (high RPM). After 10 minutes, Laptop A's GPU runs at 1600 MHz while Laptop B sustains 1900 MHz.",
    question: "How does the cooling solution affect sustained clock speed?",
    options: [
      { id: 'a', label: "Better cooling allows higher power limits before hitting thermal limits", correct: true },
      { id: 'b', label: "Faster fans directly increase the GPU's clock speed potential" },
      { id: 'c', label: "The aggressive fan curve reduces electrical resistance in the GPU" },
      { id: 'd', label: "Laptop B has faster memory that requires higher clocks" }
    ],
    explanation: "Better cooling (lower thermal resistance) means the GPU can dissipate more power while staying under thermal limits. This allows the GPU to sustain higher voltages and frequencies. The thermal headroom directly translates to higher sustained clocks."
  },
  {
    scenario: "A smartphone processor runs at 3.0 GHz for short bursts but sustains only 2.0 GHz under continuous load. The burst lasts about 30 seconds before clocks drop.",
    question: "Why can mobile processors sustain burst frequencies for a short time?",
    options: [
      { id: 'a', label: "The battery provides extra power for short periods" },
      { id: 'b', label: "Thermal capacitance absorbs heat temporarily before temperatures rise", correct: true },
      { id: 'c', label: "The OS disables background tasks during burst mode" },
      { id: 'd', label: "The processor uses special high-power transistors for bursts" }
    ],
    explanation: "Thermal capacitance (the 'C' in the RC model) allows processors to briefly exceed sustainable power levels. Heat accumulates in the silicon and package before temperatures rise enough to trigger throttling. This 'thermal budget' enables short boost periods."
  },
  {
    scenario: "A GPU manufacturer advertises their card can reach 2400 MHz boost clock. In reviews, the card typically sustains 2200-2300 MHz in games. Some users with aggressive water cooling report sustaining 2350-2400 MHz.",
    question: "What does this variation in sustained clocks demonstrate?",
    options: [
      { id: 'a', label: "GPU manufacturers exaggerate performance specifications" },
      { id: 'b', label: "Sustained clocks depend on the thermal solution, not just the GPU", correct: true },
      { id: 'c', label: "Silicon lottery causes some GPUs to be faster than others" },
      { id: 'd', label: "Reviewers don't test games properly" }
    ],
    explanation: "Boost clocks represent what the GPU CAN achieve under ideal conditions. Sustained clocks depend on cooling - better thermal resistance means more power headroom. Water cooling's lower thermal resistance allows sustained clocks closer to maximum boost."
  },
  {
    scenario: "An overclocker increases their GPU's power limit from 250W to 300W (20% increase). They achieve only a 5% increase in sustained clock speed.",
    question: "Why is the performance gain smaller than the power increase?",
    options: [
      { id: 'a', label: "The power limit setting doesn't actually work" },
      { id: 'b', label: "Higher clocks require disproportionately higher voltage due to V^2 scaling", correct: true },
      { id: 'c', label: "The GPU reaches memory bandwidth limits at higher clocks" },
      { id: 'd', label: "The VRM cannot deliver 300W of power" }
    ],
    explanation: "Due to P = C * V^2 * f, achieving higher frequencies requires higher voltages, and power scales with voltage squared. Each additional MHz requires increasingly more power. This diminishing returns curve is why extreme overclocks require disproportionate power increases."
  },
  {
    scenario: "A data center uses NVIDIA's GPU Boost 4.0 technology, which continuously adjusts clock speeds based on temperature, power, and utilization. During training, clocks vary between 1800-2100 MHz throughout a run.",
    question: "What advantage does dynamic frequency scaling provide over fixed frequencies?",
    options: [
      { id: 'a', label: "It makes the GPU run quieter at all times" },
      { id: 'b', label: "It maximizes performance within thermal and power constraints at each moment", correct: true },
      { id: 'c', label: "It extends the warranty coverage of the GPU" },
      { id: 'd', label: "It reduces the complexity of workload scheduling" }
    ],
    explanation: "DVFS allows the GPU to opportunistically boost when there's thermal/power headroom and throttle when limits are reached. This maximizes performance by using every available watt efficiently, rather than leaving performance on the table with conservative fixed frequencies."
  },
  {
    scenario: "An engineer measures that their GPU's thermal resistance from die to ambient is 0.3 C/W. At 200W power, the die runs at 80C. They want to know the equilibrium temperature at 250W.",
    question: "What will the equilibrium die temperature be at 250W?",
    options: [
      { id: 'a', label: "85C - linear scaling with power" },
      { id: 'b', label: "95C - calculated as T_ambient + (Power * R_thermal)", correct: true },
      { id: 'c', label: "100C - power and temperature scale together" },
      { id: 'd', label: "Cannot be determined without knowing ambient temperature" }
    ],
    explanation: "At 200W with 80C die temp and 0.3 C/W resistance: T_die = T_ambient + P * R_th. So 80 = T_ambient + 200 * 0.3, giving T_ambient = 20C. At 250W: T_die = 20 + 250 * 0.3 = 95C. This linear relationship between power and temperature rise is fundamental to thermal design."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F3AE}',
    title: 'Gaming GPU Boost',
    short: 'Why your GPU clock speeds dance around',
    tagline: 'Maximum performance within thermal limits',
    description: 'Modern GPUs like NVIDIA RTX and AMD RDNA continuously adjust clock speeds based on temperature, power, and workload. GPU Boost technology opportunistically increases clocks when there is thermal and power headroom, then backs off as limits are reached.',
    connection: 'The thermal RC model explains why boost clocks can be sustained initially (thermal capacitance absorbs heat) but must drop as equilibrium is reached. Better cooling directly translates to higher sustained clocks.',
    howItWorks: 'Hundreds of times per second, the GPU measures die temperature, power consumption, and current headroom. An algorithm determines the maximum safe frequency based on voltage-frequency curves and power budgets. Clocks adjust in small steps to maximize performance.',
    stats: [
      { value: '200 MHz', label: 'Clock variation' },
      { value: '10ms', label: 'Adjustment time' },
      { value: '25%', label: 'Boost vs base' }
    ],
    examples: ['NVIDIA GPU Boost 4.0', 'AMD PowerTune', 'Intel Adaptive Boost', 'Apple ProMotion'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'Qualcomm'],
    futureImpact: 'AI-driven boost algorithms will predict workload changes and pre-emptively adjust power delivery for even faster response.',
    color: '#10B981'
  },
  {
    icon: '\u{1F4F1}',
    title: 'Mobile SoC Throttling',
    short: 'Why phones get hot and slow down',
    tagline: 'Thermal limits in your pocket',
    description: 'Smartphones face extreme thermal challenges - thin bodies, no active cooling, and power-hungry apps. Mobile SoCs use aggressive DVFS to balance performance, battery life, and skin temperature. The thermal capacitance of the device allows brief performance bursts.',
    connection: 'The thermal time constant of a phone (case + battery + PCB) is typically 30-60 seconds. This explains why burst performance can last for short periods before sustained thermal limits force throttling.',
    howItWorks: 'Mobile DVFS uses multiple sensors (die, skin, battery, ambient) to manage power. Big.LITTLE architectures allow shifting work to efficient cores. When skin temperature approaches 42C (discomfort threshold), aggressive throttling begins.',
    stats: [
      { value: '50%', label: 'Burst vs sustained' },
      { value: '42C', label: 'Skin temp limit' },
      { value: '5-10W', label: 'Sustained power' }
    ],
    examples: ['Apple A-series chips', 'Snapdragon thermal management', 'Samsung Game Booster', 'MediaTek Dimensity'],
    companies: ['Apple', 'Qualcomm', 'Samsung', 'MediaTek'],
    futureImpact: 'Advanced phase-change materials and vapor chambers will extend burst duration, enabling console-quality gaming on phones.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F3E2}',
    title: 'Data Center Power Management',
    short: 'Optimizing perf-per-watt at scale',
    tagline: 'Every watt costs money',
    description: 'Data centers optimize for performance-per-watt, not raw performance. Running GPUs at 80-90% of maximum frequency often provides 95% of performance at 75% of power. At scale, this translates to millions in electricity savings.',
    connection: 'The V^2 relationship in P = CV^2f means modest frequency reductions enable significant voltage drops. A 10% clock reduction might enable 15% voltage reduction, yielding 25%+ power savings.',
    howItWorks: 'Hyperscalers profile workloads and set power/frequency targets per job type. AI training often runs at reduced clocks for efficiency. Batch scheduling fills gaps to maintain high utilization at optimal efficiency points.',
    stats: [
      { value: '30%', label: 'Power savings' },
      { value: '95%', label: 'Performance retained' },
      { value: 'MWs', label: 'Saved per datacenter' }
    ],
    examples: ['Google TPU power management', 'AWS Inferentia optimization', 'Microsoft Azure GPU pools', 'Meta AI clusters'],
    companies: ['Google', 'Microsoft', 'Meta', 'Amazon'],
    futureImpact: 'Dynamic per-workload DVFS will automatically find optimal perf/watt points for each AI model architecture.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F3CE}',
    title: 'Automotive & Embedded Systems',
    short: 'Safety-critical thermal management',
    tagline: 'When throttling isnt an option',
    description: 'Autonomous vehicles and safety-critical systems require guaranteed performance. DVFS in these applications must ensure worst-case sustainable performance, not opportunistic boosts. Thermal design targets sustained rather than peak power.',
    connection: 'The thermal RC model is used to design cooling systems that guarantee equilibrium temperatures under worst-case sustained loads. Safety margins ensure no throttling occurs during critical operations.',
    howItWorks: 'Automotive-grade processors specify sustainable power, not boost power. Cooling systems are designed for 100% duty cycle at maximum sustainable load. DVFS provides efficiency at light loads while guaranteeing full performance when needed.',
    stats: [
      { value: '100%', label: 'Guaranteed perf' },
      { value: '105C', label: 'Junction limit' },
      { value: '15 years', label: 'Reliability target' }
    ],
    examples: ['NVIDIA DRIVE', 'Tesla FSD computer', 'Mobileye EyeQ', 'Qualcomm Snapdragon Ride'],
    companies: ['NVIDIA', 'Tesla', 'Intel/Mobileye', 'Qualcomm'],
    futureImpact: 'Higher performance automotive chips will require liquid cooling, enabling data center-class AI in vehicles.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const DVFSRenderer: React.FC<DVFSRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [powerLimit, setPowerLimit] = useState(250); // Watts
  const [thermalLimit, setThermalLimit] = useState(83); // Celsius
  const [ambientTemp] = useState(25); // Celsius
  const [thermalResistance] = useState(0.25); // C/W

  // Simulation data history
  const [clockHistory, setClockHistory] = useState<number[]>([]);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [powerHistory, setPowerHistory] = useState<number[]>([]);

  // Twist phase - cooling improvement
  const [fanSpeed, setFanSpeed] = useState(50); // % fan speed
  const [coolingImproved, setCoolingImproved] = useState(false);

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
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate GPU state based on thermal RC model
  const calculateGPUState = useCallback((time: number, thermalR: number) => {
    const maxBoostClock = 2400;
    const baseClock = 1800;
    const maxPower = 300;
    const thermalCapacitance = 150;
    const tau = thermalR * thermalCapacitance;
    const steadyStateTemp = ambientTemp + maxPower * thermalR;
    const currentTemp = ambientTemp + (steadyStateTemp - ambientTemp) * (1 - Math.exp(-time / tau));
    let targetClock = maxBoostClock;
    let currentPower = maxPower;
    if (currentPower > powerLimit) {
      targetClock = maxBoostClock * Math.pow(powerLimit / maxPower, 1 / 1.2);
      currentPower = powerLimit;
    }
    if (currentTemp > thermalLimit - 5) {
      const thermalHeadroom = Math.max(0, thermalLimit - currentTemp) / 10;
      const thermalFactor = Math.min(1, thermalHeadroom + 0.7);
      targetClock = Math.min(targetClock, maxBoostClock * thermalFactor);
    }
    targetClock = Math.max(baseClock, targetClock);
    const clockRatio = targetClock / maxBoostClock;
    currentPower = maxPower * Math.pow(clockRatio, 1.2);
    return {
      clock: Math.round(targetClock),
      temperature: Math.min(thermalLimit + 2, Math.round(currentTemp * 10) / 10),
      power: Math.round(currentPower),
      throttling: currentTemp > thermalLimit - 5 || currentPower >= powerLimit - 5
    };
  }, [ambientTemp, powerLimit, thermalLimit]);

  // Compute a "static" GPU state from current parameters (no simulation needed)
  // This maps power limit and thermal limit directly to visible clock/temp/power
  const getStaticGPUState = useCallback((pl: number, tl: number, tr: number) => {
    const maxBoostClock = 2400;
    const baseClock = 1800;
    // Direct mapping: power limit linearly maps to clock speed range
    // PL 150 -> ~1850 MHz, PL 250 -> ~2100 MHz, PL 350 -> ~2400 MHz
    const plMin = 150;
    const plMax = 350;
    const plFrac = Math.max(0, Math.min(1, (pl - plMin) / (plMax - plMin)));
    let targetClock = baseClock + (maxBoostClock - baseClock) * plFrac;
    // Apply thermal limit modulation: lower TL reduces clock
    // tl ranges 70-95, default 83. Higher tl = more headroom = higher clocks
    const tlMin = 70;
    const tlMax = 95;
    const tlFrac = Math.max(0, Math.min(1, (tl - tlMin) / (tlMax - tlMin)));
    const thermalMod = 0.85 + 0.15 * tlFrac; // 0.85 to 1.0
    // Thermal resistance also affects: lower tr = better cooling = higher clocks
    const trMod = Math.max(0.9, Math.min(1.0, 1.0 - (tr - 0.125) * 0.4));
    targetClock = targetClock * thermalMod * trMod;
    targetClock = Math.max(baseClock, Math.min(maxBoostClock, Math.round(targetClock)));
    const clockRatio = targetClock / maxBoostClock;
    const effectivePower = Math.round(pl * Math.pow(clockRatio, 1.2));
    const finalTemp = Math.round((ambientTemp + effectivePower * tr) * 10) / 10;
    return {
      clock: targetClock,
      temperature: Math.min(tl + 2, finalTemp),
      power: effectivePower,
    };
  }, [ambientTemp]);

  // Run simulation
  useEffect(() => {
    if (isSimulating && simulationTime < 120) {
      simulationRef.current = setInterval(() => {
        setSimulationTime(t => {
          const newTime = t + 0.5;
          const effectiveThermalR = coolingImproved
            ? thermalResistance * (1 - fanSpeed / 200)
            : thermalResistance;
          const state = calculateGPUState(newTime, effectiveThermalR);
          setClockHistory(h => [...h.slice(-59), state.clock]);
          setTempHistory(h => [...h.slice(-59), state.temperature]);
          setPowerHistory(h => [...h.slice(-59), state.power]);
          return newTime;
        });
      }, 100);
    } else if (simulationTime >= 120) {
      setIsSimulating(false);
    }
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isSimulating, simulationTime, calculateGPUState, thermalResistance, coolingImproved, fanSpeed]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    clock: '#22D3EE',
    temp: '#EF4444',
    power: '#A855F7',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  const phaseOrder: Phase[] = validPhases;
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

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'dvfs',
        gameTitle: 'Dynamic Voltage/Frequency Scaling',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationTime(0);
    setClockHistory([]);
    setTempHistory([]);
    setPowerHistory([]);
  }, []);

  // Slider style shared across all sliders
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    touchAction: 'pan-y',
    accentColor: colors.accent,
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    background: `linear-gradient(90deg, ${colors.accent}44, ${colors.accent})`,
  };

  // Render the interactive V-F curve SVG inline (not as a separate component to avoid remounting)
  const renderDVFSSVG = (pl: number, tl: number, effectiveTR: number) => {
    const width = isMobile ? 340 : 450;
    const height = 260;
    const state = getStaticGPUState(pl, tl, effectiveTR);
    const clockPercent = Math.max(0, Math.min(1, (state.clock - 1800) / (2400 - 1800)));
    const tempPercent = Math.max(0, Math.min(1, (state.temperature - ambientTemp) / (tl - ambientTemp + 1)));
    const powerPercent = Math.max(0, Math.min(1, state.power / pl));

    // Generate data points for the V-F curve
    const vfPoints: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const frac = i / 20;
      const voltage = 0.8 + frac * 0.4 * Math.pow(frac, 0.3);
      const x = 40 + frac * (width - 80);
      const y = height - 50 - (voltage - 0.7) * (height - 100) / 0.6;
      vfPoints.push({ x, y });
    }

    const markerIdx = Math.round(clockPercent * 20);
    const markerX = vfPoints[Math.min(markerIdx, 20)]?.x || 40;
    const markerY = vfPoints[Math.min(markerIdx, 20)]?.y || height / 2;

    const plFrac = Math.min(1, (pl - 150) / 200);
    const plX = 40 + plFrac * (width - 80);
    const tlFrac = Math.min(1, (tl - 70) / 25);
    const tlY = height - 50 - tlFrac * (height - 100);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="dvfs-vf-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.8" />
            <stop offset="50%" stopColor={colors.clock} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.temp} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="dvfs-bar-clock" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.clock} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.clock} />
          </linearGradient>
          <linearGradient id="dvfs-bar-temp" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.warning} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.temp} />
          </linearGradient>
          <linearGradient id="dvfs-bar-power" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.power} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.power} />
          </linearGradient>
          <filter id="dvfs-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dvfs-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          V-F Curve: P = C x V^2 x f
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const gy = height - 50 - frac * (height - 100);
          return (
            <line key={`hg-${frac}`} x1="40" y1={gy} x2={width - 40} y2={gy}
              stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const gx = 40 + frac * (width - 80);
          return (
            <line key={`vg-${frac}`} x1={gx} y1="30" x2={gx} y2={height - 50}
              stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
          );
        })}

        {/* V-F curve path */}
        <path
          d={vfPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke="url(#dvfs-vf-grad)"
          strokeWidth="3"
          filter="url(#dvfs-shadow)"
        />

        {/* Operating point marker */}
        <circle cx={markerX} cy={markerY} r="8" fill={colors.accent} filter="url(#dvfs-glow)" opacity="0.9" />
        <circle cx={markerX} cy={markerY} r="4" fill="white" />

        {/* Power limit line */}
        <line x1={plX} y1="30" x2={plX} y2={height - 50}
          stroke={colors.power} strokeWidth="2" strokeDasharray="6,3" opacity="0.7" />
        <text x={plX} y={height - 38} textAnchor="middle" fill={colors.power} fontSize="11">
          PL: {pl}W
        </text>

        {/* Thermal limit line */}
        <line x1="40" y1={tlY} x2={width - 40} y2={tlY}
          stroke={colors.temp} strokeWidth="2" strokeDasharray="6,3" opacity="0.7" />
        <text x={width - 38} y={tlY - 4} textAnchor="start" fill={colors.temp} fontSize="11">
          TL: {tl}C
        </text>

        {/* Axis labels */}
        <text x={width / 2} y={height - 22} textAnchor="middle" fill={colors.textMuted} fontSize="12">
          Frequency (MHz)
        </text>
        <text x="12" y={height / 2 - 20} textAnchor="middle" fill={colors.textMuted} fontSize="12"
          transform={`rotate(-90, 12, ${height / 2 - 20})`}>
          Voltage (V)
        </text>

        {/* Min/max boundary labels */}
        <text x="40" y={height - 38} textAnchor="start" fill={colors.textMuted} fontSize="11">1800</text>
        <text x={width - 40} y={height - 38} textAnchor="end" fill={colors.textMuted} fontSize="11">2400</text>
        <text x="38" y="38" textAnchor="end" fill={colors.textMuted} fontSize="11">1.2V</text>
        <text x="38" y={height - 52} textAnchor="end" fill={colors.textMuted} fontSize="11">0.8V</text>

        {/* Status bars at bottom */}
        <g>
          <rect x="40" y={height - 14} width={100} height="8" rx="4" fill={colors.clock + '33'} />
          <rect x="40" y={height - 14} width={100 * clockPercent} height="8" rx="4" fill="url(#dvfs-bar-clock)" />
          <text x="40" y={height - 2} fill={colors.clock} fontSize="11">{state.clock} MHz</text>
        </g>
        <g>
          <rect x={width / 2 - 50} y={height - 14} width={100} height="8" rx="4" fill={colors.temp + '33'} />
          <rect x={width / 2 - 50} y={height - 14} width={100 * tempPercent} height="8" rx="4" fill="url(#dvfs-bar-temp)" />
          <text x={width / 2 - 50} y={height - 2} fill={colors.temp} fontSize="11">{state.temperature}C</text>
        </g>
        <g>
          <rect x={width - 140} y={height - 14} width={100} height="8" rx="4" fill={colors.power + '33'} />
          <rect x={width - 140} y={height - 14} width={100 * powerPercent} height="8" rx="4" fill="url(#dvfs-bar-power)" />
          <text x={width - 140} y={height - 2} fill={colors.power} fontSize="11">{state.power}W</text>
        </g>
      </svg>
    );
  };

  // Simulation chart sub-component
  const SimulationChart = ({ data, color, label, unit, maxVal }: {
    data: number[];
    color: string;
    label: string;
    unit: string;
    maxVal: number;
  }) => {
    const width = isMobile ? 300 : 400;
    const height = 100;
    const padding = 30;
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ ...typo.small, color: color, fontWeight: 600 }}>{label}</span>
          <span style={{ ...typo.small, color: colors.textSecondary }}>
            {data.length > 0 ? `${data[data.length - 1]}${unit}` : `--${unit}`}
          </span>
        </div>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgSecondary, borderRadius: '8px' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(frac => (
            <line
              key={frac}
              x1={padding}
              y1={height - padding - (height - 2 * padding) * frac}
              x2={width - 10}
              y2={height - padding - (height - 2 * padding) * frac}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          {data.length > 1 && (
            <path
              d={data.map((val, i) => {
                const x = padding + (i / 59) * (width - padding - 10);
                const y = height - padding - (val / maxVal) * (height - 2 * padding);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${Math.max(padding, Math.min(height - padding, y)).toFixed(1)}`;
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
          )}
          <text x="5" y={padding} fill={colors.textMuted} fontSize="11">{maxVal}</text>
          <text x="5" y={height - padding + 4} fill={colors.textMuted} fontSize="11">0</text>
        </svg>
      </div>
    );
  };

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
    background: `linear-gradient(135deg, ${colors.accent}, #EA580C)`,
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

  // Bottom navigation bar with Back / Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.bgSecondary,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.border : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={isTestActive || currentIndex === phaseOrder.length - 1}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: (isTestActive || currentIndex === phaseOrder.length - 1) ? colors.border : colors.accent,
            color: 'white',
            cursor: (isTestActive || currentIndex === phaseOrder.length - 1) ? 'not-allowed' : 'pointer',
            opacity: isTestActive ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // Scroll container style (inlined to avoid inner component remounting)
  const scrollContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingTop: '60px',
    paddingBottom: '16px',
    paddingLeft: '24px',
    paddingRight: '24px',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>
              <span role="img" aria-label="GPU">{'\u{1F5A5}'}</span><span role="img" aria-label="thermometer">{'\u{1F321}'}</span>
            </div>

            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Why Can't GPUs Run Max Clocks Forever?
            </h1>

            <p style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              margin: '0 auto 32px',
            }}>
              Your GPU advertises 2400 MHz boost clock, but in games it hovers around 2000 MHz. What's happening? The answer lies in <span style={{ color: colors.accent }}>thermal physics</span> and <span style={{ color: colors.power }}>power limits</span>.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '500px',
              margin: '0 auto 32px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
                "Boost clocks are a promise of potential, not a guarantee. Physics determines what you actually get."
              </p>
              <p style={{ ...typo.small, color: 'rgba(156,163,175, 0.7)', marginTop: '8px' }}>
                — DVFS Engineering Principle
              </p>
            </div>

            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore DVFS Physics
            </button>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Clocks stay constant at 2400 MHz - the GPU is designed to handle it' },
      { id: 'b', text: 'Clocks gradually decrease as temperature rises toward thermal limits', correct: true },
      { id: 'c', text: 'Clocks oscillate randomly as the GPU struggles with the workload' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              ...typo.small,
              color: colors.textSecondary,
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              Step 1 of 2: Make your prediction
            </div>

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
              A GPU starts a demanding game at 2400 MHz boost clock. After 5 minutes of sustained load, what happens to the clock speed?
            </h2>

            {/* Static SVG diagram */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 320 : 400} height="150" viewBox="0 0 400 150" style={{ maxWidth: '100%' }}>
                <rect x="0" y="0" width="400" height="150" fill={colors.bgSecondary} rx="8" />
                <rect x="30" y="40" width="80" height="60" fill={colors.bgCard} stroke={colors.clock} strokeWidth="2" rx="4" />
                <text x="70" y="65" textAnchor="middle" fill={colors.clock} fontSize="12" fontWeight="600">GPU</text>
                <text x="70" y="85" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="700">2400 MHz</text>
                <text x="70" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">t=0</text>
                <line x1="120" y1="70" x2="170" y2="70" stroke={colors.textMuted} strokeWidth="2" />
                <polygon points="170,65 180,70 170,75" fill={colors.textMuted} />
                <rect x="180" y="40" width="80" height="60" fill={colors.accent + '33'} stroke={colors.accent} strokeWidth="2" rx="4" />
                <text x="220" y="65" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="600">LOAD</text>
                <text x="220" y="85" textAnchor="middle" fill={colors.textPrimary} fontSize="11">5 min load</text>
                <line x1="270" y1="70" x2="320" y2="70" stroke={colors.textMuted} strokeWidth="2" />
                <polygon points="320,65 330,70 320,75" fill={colors.textMuted} />
                <rect x="330" y="40" width="60" height="60" fill={colors.bgCard} stroke={colors.border} strokeWidth="2" rx="4" />
                <text x="360" y="70" textAnchor="middle" fill={colors.textSecondary} fontSize="24">?</text>
                <text x="360" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">t=5min</text>
              </svg>
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

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Test My Prediction
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Thermal RC Simulation
  if (phase === 'play') {
    const gpuState = getStaticGPUState(powerLimit, thermalLimit, thermalResistance);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              GPU Thermal Throttling Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Watch how clock speeds drop as temperature rises under sustained load. When you increase the power limit, higher voltage causes more heat due to the equation P = C × V² × f.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              <strong>Real-world relevance:</strong> This same DVFS mechanism operates in gaming GPUs, smartphones, and data center hardware — balancing performance against thermal and power constraints. The thermal time constant is calculated as tau = R_th × C_th.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {renderDVFSSVG(powerLimit, thermalLimit, thermalResistance)}
                  </div>

                  {/* Charts */}
                  <SimulationChart data={clockHistory} color={colors.clock} label="Clock Speed" unit=" MHz" maxVal={2500} />
                  <SimulationChart data={tempHistory} color={colors.temp} label="Temperature" unit="C" maxVal={100} />
                  <SimulationChart data={powerHistory} color={colors.power} label="Power" unit="W" maxVal={350} />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Current vs reference comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '2px' }}>Reference (baseline)</div>
                    <div style={{ ...typo.body, color: colors.clock, fontWeight: 600 }}>2400 MHz at 300W</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '2px' }}>Current output</div>
                    <div style={{ ...typo.body, color: gpuState.clock < 2200 ? colors.warning : colors.success, fontWeight: 600 }}>
                      {gpuState.clock} MHz at {gpuState.power}W
                    </div>
                  </div>
                </div>

                {/* Control sliders */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Power Limit</span>
                    <span style={{ ...typo.small, color: colors.power, fontWeight: 600 }}>{powerLimit}W</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="350"
                    value={powerLimit}
                    onChange={(e) => setPowerLimit(Number(e.target.value))}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>150W</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>350W</span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Thermal Limit</span>
                    <span style={{ ...typo.small, color: colors.temp, fontWeight: 600 }}>{thermalLimit}C</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="95"
                    value={thermalLimit}
                    onChange={(e) => { setThermalLimit(Number(e.target.value)); resetSimulation(); }}
                    onInput={(e) => { setThermalLimit(Number((e.target as HTMLInputElement).value)); resetSimulation(); }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>70C</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>95C</span>
                  </div>
                </div>

                {/* Simulation controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSimulating ? colors.error : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSimulating ? 'Pause' : simulationTime > 0 ? 'Resume' : 'Start Load'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>

                {/* Observation guidance */}
                <div style={{
                  background: `${colors.accent}11`,
                  border: `1px solid ${colors.accent}33`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    <strong style={{ color: colors.accent }}>What to observe:</strong> Start the simulation and watch how clock speed, temperature, and power interact over time. Try adjusting power and thermal limits to see their effects on GPU performance.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics
            </button>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of GPU Throttling
            </h2>

            {/* Reference user's prediction */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Your prediction:</strong> {
                  prediction === 'b'
                    ? 'You predicted that clocks would gradually decrease as temperature rises — and you were right! As you observed in the experiment, the GPU throttles as thermal limits approach.'
                    : prediction === 'a'
                    ? 'You predicted clocks would stay constant at 2400 MHz. As you observed, thermal physics causes throttling over time.'
                    : prediction === 'c'
                    ? 'You predicted clocks would oscillate randomly. The actual behavior is more predictable — driven by thermal and power limits as you saw in the experiment.'
                    : 'As you saw in the experiment, GPU clocks decrease predictably as temperature rises toward thermal limits.'
                }
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.h3, color: colors.power, margin: 0 }}>
                  P = C × V² × f
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Power = Capacitance × Voltage² × Frequency
                </p>
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Dynamic Power</strong> scales with voltage squared. Higher clocks need higher voltage, causing power to increase faster than clock speed.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.temp }}>Thermal Equilibrium</strong>: T_die = T_ambient + Power × R_thermal. Heat flows from die to ambient based on thermal resistance.
                </p>
                <p>
                  <strong style={{ color: colors.clock }}>Thermal RC Model</strong>: Temperature rises exponentially toward equilibrium with T(t) = T_amb + P × R × (1 - e^(-t/tau)). Time constant tau = R_th × C_th determines how quickly this happens.
                </p>
              </div>
            </div>

            {/* Review SVG diagram */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 320 : 400} height="160" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="review-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.success} />
                    <stop offset="100%" stopColor={colors.temp} />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="160" fill={colors.bgSecondary} rx="8" />
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Throttling Timeline</text>
                {/* Boost phase */}
                <rect x="30" y="40" width="120" height="30" rx="4" fill={colors.success + '33'} stroke={colors.success} strokeWidth="1" />
                <text x="90" y="60" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">Boost Phase</text>
                {/* Arrow */}
                <line x1="155" y1="55" x2="185" y2="55" stroke={colors.textMuted} strokeWidth="2" />
                <polygon points="185,50 195,55 185,60" fill={colors.textMuted} />
                {/* Throttle phase */}
                <rect x="200" y="40" width="170" height="30" rx="4" fill={colors.temp + '33'} stroke={colors.temp} strokeWidth="1" />
                <text x="285" y="60" textAnchor="middle" fill={colors.temp} fontSize="12" fontWeight="600">Thermal Throttling</text>
                {/* Bottom labels */}
                <text x="90" y="90" textAnchor="middle" fill={colors.textMuted} fontSize="11">2400 MHz</text>
                <text x="285" y="90" textAnchor="middle" fill={colors.textMuted} fontSize="11">1800-2100 MHz</text>
                <text x="90" y="110" textAnchor="middle" fill={colors.success} fontSize="11">T &lt; T_limit</text>
                <text x="285" y="110" textAnchor="middle" fill={colors.temp} fontSize="11">T approaches T_limit</text>
                {/* Time axis */}
                <line x1="30" y1="130" x2="370" y2="130" stroke={colors.textMuted} strokeWidth="1" />
                <text x="30" y="148" fill={colors.textMuted} fontSize="11">0s</text>
                <text x="200" y="148" textAnchor="middle" fill={colors.textMuted} fontSize="11">Time</text>
                <text x="370" y="148" textAnchor="end" fill={colors.textMuted} fontSize="11">5min</text>
              </svg>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Insight: Two Throttling Mechanisms
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong>Power Limit:</strong> GPU reduces clocks when power draw exceeds TDP. This happens instantly.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Thermal Limit:</strong> GPU reduces clocks when temperature approaches max. This develops over time as heat accumulates.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Can We Improve This?
            </button>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Clock speeds stay the same - the GPU is already at its limits' },
      { id: 'b', text: 'Better cooling allows higher sustained clocks by reducing thermal throttling', correct: true },
      { id: 'c', text: 'Fan speed only affects noise, not performance' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.success}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.success}44`,
            }}>
              <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                New Variable: Cooling Performance
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens to sustained GPU clocks if we improve the cooling system (increase fan speed, better heatsink)?
            </h2>

            {/* Static comparison SVG for twist predict */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 320 : 400} height="180" viewBox="0 0 400 180">
                <defs>
                  <linearGradient id="tp-cool-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.clock} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={colors.clock} />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="180" fill={colors.bgSecondary} rx="8" />
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
                  Cooling Impact on Sustained Clocks
                </text>
                {/* Current baseline */}
                <rect x="30" y="45" width="160" height="50" rx="6" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
                <text x="110" y="65" textAnchor="middle" fill={colors.textMuted} fontSize="12">Current cooling</text>
                <text x="110" y="85" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="700">~2000 MHz</text>
                {/* Arrow */}
                <text x="210" y="75" textAnchor="middle" fill={colors.textMuted} fontSize="20">{'\u2192'}</text>
                {/* Improved */}
                <rect x="230" y="45" width="150" height="50" rx="6" fill={colors.success + '11'} stroke={colors.success} strokeWidth="1" strokeDasharray="4,2" />
                <text x="305" y="65" textAnchor="middle" fill={colors.success} fontSize="12">Better cooling</text>
                <text x="305" y="85" textAnchor="middle" fill={colors.textSecondary} fontSize="18" fontWeight="700">?</text>
                {/* Labels */}
                <text x="110" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">R_th = 0.25 C/W</text>
                <text x="305" y="115" textAnchor="middle" fill={colors.success} fontSize="11">R_th reduced</text>
                <text x="200" y="145" textAnchor="middle" fill={colors.textMuted} fontSize="12">
                  Lower thermal resistance = more headroom?
                </text>
                <text x="200" y="165" textAnchor="middle" fill={colors.accent} fontSize="11">
                  T_eq = T_amb + P × R_th
                </text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.success}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.success : colors.border}`,
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
                    background: twistPrediction === opt.id ? colors.success : colors.bgSecondary,
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
                onClick={() => {
                  playSound('success');
                  resetSimulation();
                  setCoolingImproved(true);
                  nextPhase();
                }}
                style={primaryButtonStyle}
              >
                Test Better Cooling
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const effectiveTR = thermalResistance * (1 - fanSpeed / 200);

    const handleFanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFanSpeed(parseInt(e.target.value));
      resetSimulation();
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Cooling Impact on Performance
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust fan speed to reduce thermal resistance and sustain higher clocks
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {renderDVFSSVG(powerLimit, thermalLimit, effectiveTR)}
                  </div>

                  {/* Charts */}
                  <SimulationChart data={clockHistory} color={colors.clock} label="Clock Speed" unit=" MHz" maxVal={2500} />
                  <SimulationChart data={tempHistory} color={colors.temp} label="Temperature" unit="C" maxVal={100} />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Fan speed slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Fan Speed</span>
                    <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{fanSpeed}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={fanSpeed}
                    onChange={handleFanChange}
                    onInput={handleFanChange}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>30% Quiet</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>100% Aggressive</span>
                  </div>
                </div>

                {/* Thermal resistance display */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>Effective Thermal Resistance:</div>
                  <div style={{ ...typo.body, color: colors.success, fontWeight: 600 }}>
                    {effectiveTR.toFixed(3)} C/W
                  </div>
                </div>

                {/* Simulation controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSimulating ? colors.error : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSimulating ? 'Pause' : simulationTime > 0 ? 'Resume' : 'Start Load'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Connection
            </button>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Thermal-Performance Connection
            </h2>

            {/* Review SVG */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <svg width={isMobile ? 320 : 400} height="120" viewBox="0 0 400 120">
                <defs>
                  <linearGradient id="tr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.success} />
                    <stop offset="100%" stopColor={colors.clock} />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="120" fill={colors.bgSecondary} rx="8" />
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Cooling vs Performance</text>
                <rect x="30" y="40" width="160" height="35" rx="4" fill={colors.warning + '22'} stroke={colors.warning} strokeWidth="1" />
                <text x="110" y="62" textAnchor="middle" fill={colors.warning} fontSize="12">Stock: ~2000 MHz</text>
                <rect x="210" y="40" width="160" height="35" rx="4" fill={colors.success + '22'} stroke={colors.success} strokeWidth="1" />
                <text x="290" y="62" textAnchor="middle" fill={colors.success} fontSize="12">Improved: ~2300 MHz</text>
                <text x="200" y="100" textAnchor="middle" fill={colors.accent} fontSize="12">Lower R_th = Higher sustained clocks</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Lower R_thermal = Higher Sustained Clocks</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  T_equilibrium = T_ambient + P × R_thermal. Better cooling (lower R_th) means lower equilibrium temperature at the same power. This leaves <span style={{ color: colors.clock }}>thermal headroom for higher clocks</span>.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Thermal Time Constant</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  tau = R_th × C_th. This determines how quickly temperature rises. A larger heatsink (more C_th) allows <span style={{ color: colors.power }}>longer boost periods</span> before throttling kicks in.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.power, marginBottom: '12px' }}>Power Budget = Thermal Budget</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The maximum sustainable power is limited by: P_max = (T_limit - T_ambient) / R_thermal. Want more power? Either raise the thermal limit, lower ambient, or improve cooling.
                </p>
              </div>

              <div style={{
                background: `${colors.warning}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.warning}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>Real-World Prediction</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  You can calculate the throttling point! If R_th = 0.25 C/W, T_limit = 83C, T_ambient = 25C, then P_max = (83-25)/0.25 = <strong>232W</strong>. Clocks will reduce to stay at this power level.
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
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="D V F S"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length}
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
                      {'\u2713'}
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
                  How DVFS Applies:
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
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                <strong>Companies:</strong> {app.companies.join(', ')}. <strong>Examples:</strong> {app.examples.join(', ')}.
              </p>

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
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}CC)`,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Got It - Continue
              </button>
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
        </div>

        {renderBottomNav()}
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}

          <div style={scrollContainerStyle}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F389}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
                {passed
                  ? 'You understand DVFS and thermal management!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer review */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>
                  Answer Review:
                </h4>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                    }}>
                      <span style={{
                        color: isCorrect ? colors.success : colors.error,
                        fontSize: '16px',
                        fontWeight: 700,
                      }}>
                        {isCorrect ? '\u2713' : '\u2717'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : `Incorrect (was ${userAnswer?.toUpperCase()}, correct: ${correctId?.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                    Review & Try Again
                  </button>
                )}
                <a
                  href="/"
                  style={{
                    padding: '14px 28px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 600,
                  }}
                >
                  Dashboard
                </a>
              </div>
            </div>
          </div>

          {renderBottomNav()}
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
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
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={scrollContainerStyle}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px' }}>
              {'\u{1F3C6}'}
            </div>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              DVFS Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px' }}>
              You now understand why GPUs can't sustain boost clocks forever and how thermal physics governs performance.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '400px',
              margin: '0 auto 32px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                You Learned:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                {[
                  'P = C × V² × f — power scales with voltage squared',
                  'Thermal RC model predicts temperature rise',
                  'Thermal and power limits cause throttling',
                  'Better cooling enables higher sustained clocks',
                  'Time constant determines boost duration',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success }}>{'\u2713'}</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  resetSimulation();
                  setCoolingImproved(false);
                  setFanSpeed(50);
                  goToPhase('hook');
                }}
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
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default DVFSRenderer;
