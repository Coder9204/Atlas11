'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Battery Internal Resistance - Complete 10-Phase Learning Game
// Why batteries feel weak when cold, nearly empty, or under heavy load
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

interface BatteryInternalResistanceRendererProps {
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
    scenario: "You're hiking in winter and need to use your phone's GPS, but at 15% battery it suddenly shuts off. Your friend's identical phone at the same charge level works fine because they kept it warm in their pocket.",
    question: "Why does the cold phone shut off while the warm phone works?",
    options: [
      { id: 'a', label: "Cold phones use more power for GPS calculations" },
      { id: 'b', label: "Cold temperatures increase internal resistance, causing voltage to drop below minimum operating threshold under load", correct: true },
      { id: 'c', label: "The battery percentage indicator is inaccurate in cold weather" },
      { id: 'd', label: "GPS satellites have difficulty communicating with cold devices" }
    ],
    explanation: "Internal resistance increases 2-5x in cold temperatures. When the phone demands high current for GPS, the voltage drop (V = I x R) across this elevated resistance pushes terminal voltage below the minimum ~3.0V needed for the processor to operate, triggering protective shutdown."
  },
  {
    scenario: "A mechanic tests a car battery and finds it measures 12.6V with no load - perfectly healthy. But when the customer tries to start the car on a -10C morning, the starter motor barely turns and the engine won't start.",
    question: "Why does this 'good' battery fail to start the car in cold weather?",
    options: [
      { id: 'a', label: "The starter motor is frozen and cannot rotate" },
      { id: 'b', label: "12.6V is actually too low for starting" },
      { id: 'c', label: "Cold multiplies internal resistance, and the 200-400A starter current causes massive voltage drop", correct: true },
      { id: 'd', label: "Engine oil is too thick for any battery to overcome" }
    ],
    explanation: "At -10C, internal resistance can be 3-4x higher than at 25C. A starter drawing 300A through 0.1 ohm resistance at room temp loses 30V (battery collapses). The same battery at 0.3 ohm cold loses 90V - complete failure. This is why 'cold cranking amps' (CCA) ratings matter."
  },
  {
    scenario: "An electric vehicle owner notices their car accelerates noticeably slower and has reduced range on cold winter mornings, even after a full charge. After driving 20 minutes, normal performance returns.",
    question: "What causes the initial performance reduction, and why does it improve after driving?",
    options: [
      { id: 'a', label: "The motor needs to warm up like a traditional engine" },
      { id: 'b', label: "Cold battery resistance limits power delivery; driving generates heat that warms the pack and reduces resistance", correct: true },
      { id: 'c', label: "Regenerative braking doesn't work in cold weather" },
      { id: 'd', label: "Tire pressure drops in cold weather, causing more rolling resistance" }
    ],
    explanation: "EV batteries have 2-3x higher internal resistance when cold. The I^2R losses during driving generate heat, warming the pack to optimal 25-35C operating temperature. Modern EVs actively precondition batteries using cabin heat pump waste heat or dedicated heaters before fast charging."
  },
  {
    scenario: "A smartphone manufacturer discovers that after 500 charge cycles, users report their phones dying at 20-30% battery during gaming, while web browsing works fine at the same charge level.",
    question: "Why does gaming fail at higher charge percentages after battery aging?",
    options: [
      { id: 'a', label: "Gaming apps become corrupted over time" },
      { id: 'b', label: "Aged batteries have higher internal resistance; high-current gaming causes voltage collapse that low-current browsing doesn't", correct: true },
      { id: 'c', label: "The battery percentage algorithm needs recalibration" },
      { id: 'd', label: "Processor thermal throttling reduces performance" }
    ],
    explanation: "Battery aging increases internal resistance as electrolyte degrades and electrodes develop surface films. High-power gaming demands 2-3A while browsing uses 0.3A. The 10x higher current means 10x more voltage drop. At low SOC where resistance is already elevated, gaming hits the shutdown threshold first."
  },
  {
    scenario: "A grid-scale battery storage facility rates their 100MWh system for only 25MW continuous discharge, despite the batteries theoretically being capable of 100MW peak output.",
    question: "Why is continuous power rating so much lower than peak capacity?",
    options: [
      { id: 'a', label: "Power electronics limit continuous operation" },
      { id: 'b', label: "High-current continuous operation causes excessive I^2R losses and thermal runaway risk", correct: true },
      { id: 'c', label: "Utility regulations prohibit high continuous discharge" },
      { id: 'd', label: "Marketing teams inflate peak ratings for advertising" }
    ],
    explanation: "At 100MW from a 100MWh pack, the C-rate is 1C (full discharge in 1 hour). Internal resistance losses (P = I^2R) generate massive heat. At 25MW (0.25C), losses are 16x lower (1/4 current squared = 1/16 power loss). Thermal management systems have capacity limits, so continuous ratings balance efficiency and safety."
  },
  {
    scenario: "A medical device engineer must choose between two battery chemistries for a pacemaker: Lithium-iodine (very low self-discharge, higher resistance) and Lithium-CFx (moderate self-discharge, lower resistance).",
    question: "Why might the higher-resistance lithium-iodine be preferred despite worse electrical characteristics?",
    options: [
      { id: 'a', label: "Lithium-iodine batteries are simply cheaper" },
      { id: 'b', label: "Pacemakers draw microamps; internal resistance matters less than the 10+ year shelf life from low self-discharge", correct: true },
      { id: 'c', label: "Lower resistance batteries are considered experimental" },
      { id: 'd', label: "FDA regulations require lithium-iodine specifically" }
    ],
    explanation: "Pacemakers draw only 10-30 microamps average. Even with higher resistance (100-1000 ohms), voltage drop is negligible (V = 0.00003A x 1000 = 0.03V). But self-discharge of 1% per year vs 5% per year means the difference between 10-year and 6-year device life - a major factor for implanted devices."
  },
  {
    scenario: "A battery engineer measures that her new cell design has 50 milliohm internal resistance at 100% SOC but 150 milliohms at 10% SOC. She wants to predict the efficiency at different discharge rates.",
    question: "At what approximate current would a fully charged battery lose 10% of its energy to internal resistance?",
    options: [
      { id: 'a', label: "About 8A - when voltage drop equals 10% of cell voltage" },
      { id: 'b', label: "About 4A - when I^2R losses equal 10% of delivered power", correct: true },
      { id: 'c', label: "About 20A - efficiency losses are only significant at very high currents" },
      { id: 'd', label: "About 1A - even small currents cause significant losses" }
    ],
    explanation: "For a 3.7V nominal cell, 10% efficiency loss means P_loss/P_total = 0.1. At current I: I^2 x 0.05 / (3.7 x I) = 0.1. Solving: I = 3.7 x 0.1 / 0.05 = 7.4A, but efficiency loss is P_loss/(P_load + P_loss), so actual answer is ~4A. This is why fast charging (2-3C rates) generates significant heat."
  },
  {
    scenario: "Tesla's battery management system shows that cells in the center of their pack consistently have higher internal resistance than cells on the edges, even though all cells are identical when new.",
    question: "Why do center cells develop higher resistance over time?",
    options: [
      { id: 'a', label: "Center cells receive less charge from the battery management system" },
      { id: 'b', label: "Center cells run hotter due to poor heat dissipation, accelerating electrolyte degradation", correct: true },
      { id: 'c', label: "Edge cells receive more vibration which improves their performance" },
      { id: 'd', label: "Manufacturing places lower quality cells in the center" }
    ],
    explanation: "Lithium-ion cell aging accelerates exponentially with temperature. Center cells are surrounded by other heat-generating cells with longer thermal paths to cooling plates. Running 5-10C hotter can double degradation rate. This is why advanced battery thermal management uses serpentine cooling channels to ensure uniform temperature."
  },
  {
    scenario: "A drone pilot notices their aircraft's voltage sag is much worse during aggressive maneuvers than during gentle cruising, even at the same average power consumption and state of charge.",
    question: "Why does aggressive flying cause worse voltage sag than gentle flying at equal average power?",
    options: [
      { id: 'a', label: "Drone motors are less efficient during fast movements" },
      { id: 'b', label: "Peak current during maneuvers far exceeds average; voltage sag follows I x R, not average power", correct: true },
      { id: 'c', label: "Battery chemistry changes during high-G maneuvers" },
      { id: 'd', label: "ESCs reduce efficiency during rapid throttle changes" }
    ],
    explanation: "Aggressive flying might average 30A but peak at 100A during snap maneuvers, while gentle flying holds steady at 30A. Even though average power matches, the 100A peaks cause 3.3x more voltage drop than 30A steady-state. Drone flight controllers compensate by reducing maximum throttle as voltage sags."
  },
  {
    scenario: "A researcher comparing two methods of measuring battery State of Health (SOH) finds that the 'capacity fade' method gives 92% health while the 'resistance growth' method gives only 78% health for the same aged battery.",
    question: "Why might the resistance-based method show worse health, and which is more relevant for high-power applications?",
    options: [
      { id: 'a', label: "The capacity method is always more accurate" },
      { id: 'b', label: "Resistance grows faster than capacity fades; resistance-based SOH better predicts power capability", correct: true },
      { id: 'c', label: "Resistance measurement equipment has higher error margins" },
      { id: 'd', label: "Both methods should always give identical results" }
    ],
    explanation: "Internal resistance often increases 50-100% while capacity only drops 20-30%. For energy applications (EVs driving gently), capacity matters most. For power applications (EVs accelerating, power tools), resistance matters most. A battery with good capacity but high resistance can store energy but cannot deliver it quickly."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '⚡',
    title: 'Electric Vehicle Battery Systems',
    short: 'Maximizing range and acceleration performance',
    tagline: 'Why your EV feels sluggish in winter and peppy in summer',
    description: 'Electric vehicle batteries must deliver hundreds of kilowatts during acceleration while maintaining efficiency over hundreds of thousands of miles. Internal resistance directly determines acceleration capability, charging speed, and how much range is lost to heat.',
    connection: 'The voltage sag you observed during high current draw explains why EVs limit acceleration when cold or at low state of charge - the battery management system protects against excessive voltage drop that could damage cells or cause shutdown.',
    howItWorks: 'EV battery management systems continuously measure voltage under load to calculate real-time internal resistance for each cell module. This data feeds into thermal preconditioning algorithms that warm batteries before fast charging, power limiting strategies that prevent damage during cold starts, and predictive range calculations that account for resistance-based efficiency losses.',
    stats: [
      { value: '15-25%', label: 'Winter range loss due to resistance', icon: '❄️' },
      { value: '350 kW', label: 'Peak charging power limited by resistance', icon: '⚡' },
      { value: '500,000 mi', label: 'Fleet vehicles with proper thermal management', icon: '🛣️' }
    ],
    examples: [
      'Tesla Model 3 battery preconditioning before Supercharging reduces resistance by 40%',
      'Porsche Taycan 800V architecture halves current for same power, reducing I^2R losses by 75%',
      'Rivian R1T thermal management maintains 25-35C optimal resistance zone during towing',
      'BYD Blade Battery design uses long cells for better heat dissipation and lower resistance gradient'
    ],
    companies: ['Tesla', 'BYD', 'CATL', 'Panasonic', 'LG Energy Solution', 'Samsung SDI'],
    futureImpact: 'Solid-state batteries promise 50% lower internal resistance through elimination of liquid electrolyte. Combined with dry electrode manufacturing, EVs may achieve 10-minute 0-80% charging with minimal heat generation by 2030.',
    color: '#10b981'
  },
  {
    icon: '📱',
    title: 'Smartphone Battery Health Management',
    short: 'Preventing unexpected shutdowns and optimizing longevity',
    tagline: 'Why your phone dies at 20% during gaming but lasts to 5% for texting',
    description: 'Smartphone batteries must balance extreme thinness with delivering 3-5W for gaming while lasting 1000+ charge cycles. Internal resistance monitoring enables adaptive charging, performance management, and accurate battery health reporting.',
    connection: 'The relationship between current draw and voltage drop you explored is exactly why phones shut down at higher percentages under load - gaming at 3A hits the voltage floor much faster than idle at 0.1A, even though both show the same battery percentage.',
    howItWorks: 'Modern smartphones measure battery impedance during charging and discharging to track resistance growth over time. iOS and Android use this data to calculate battery health percentages, throttle processor speed when resistance is high, and implement adaptive charging that reduces overnight charge rate to minimize degradation.',
    stats: [
      { value: '500', label: 'Cycles before significant resistance increase', icon: '🔄' },
      { value: '80%', label: 'Health threshold triggering performance management', icon: '📊' },
      { value: '20%', label: 'Faster aging from heat during wireless charging', icon: '🌡️' }
    ],
    examples: [
      'Apple Battery Health feature showing both capacity and peak performance capability',
      'Samsung Adaptive Charging learning user wake time to minimize full-charge duration',
      'Google Pixel Adaptive Battery predicting app usage to pre-warm processor without battery stress',
      'OnePlus SUPERVOOC splitting cells in parallel to halve charging current and resistance losses'
    ],
    companies: ['Apple', 'Samsung', 'Google', 'Qualcomm', 'MediaTek', 'OPPO'],
    futureImpact: 'AI-powered charging will predict optimal charge rates based on real-time resistance measurements, ambient temperature, and user schedule. Graphene-enhanced anodes may reduce resistance degradation by 60%, enabling 5-year battery lifespans without performance throttling.',
    color: '#3b82f6'
  },
  {
    icon: '🏭',
    title: 'Grid-Scale Energy Storage Efficiency',
    short: 'Balancing power capacity against round-trip efficiency',
    tagline: 'Why utility batteries rate power separately from energy capacity',
    description: 'Utility-scale batteries store gigawatt-hours of renewable energy but must carefully balance charge/discharge rates against efficiency losses. Internal resistance determines how much energy is lost as heat and how quickly the system can respond to grid needs.',
    connection: 'The I^2R power loss relationship means that doubling discharge rate quadruples heat generation. Grid operators must trade off between fast frequency response (high value, high losses) and efficient energy arbitrage (lower value, minimal losses).',
    howItWorks: 'Grid battery management systems track resistance for each rack of cells, routing high-power requests to lower-resistance modules while keeping degraded modules for slower applications. Sophisticated thermal modeling predicts cell temperatures under different dispatch scenarios, automatically limiting power to prevent thermal runaway.',
    stats: [
      { value: '85-95%', label: 'Round-trip efficiency depending on C-rate', icon: '⚡' },
      { value: '20 MW/80 MWh', label: 'Typical 4-hour duration system power/energy ratio', icon: '🔋' },
      { value: '15-20 yr', label: 'Expected lifespan with proper resistance management', icon: '📅' }
    ],
    examples: [
      'Hornsdale Power Reserve 150MW system providing 100ms frequency response while maintaining 90% efficiency',
      'Moss Landing 400MWh facility using cell-level resistance monitoring to predict maintenance needs',
      'UK Dynamic Containment market paying premium for fast response, accepting 5% efficiency penalty',
      'Hawaiian Electric using resistance-based dispatch to balance solar intermittency'
    ],
    companies: ['Tesla Energy', 'Fluence', 'BYD', 'Sungrow', 'Wärtsilä', 'Northvolt'],
    futureImpact: 'Iron-air and sodium-ion batteries will offer lower-cost storage with different resistance characteristics. By 2035, hybrid systems may combine high-power lithium cells (low resistance, frequency response) with high-energy alternatives (higher resistance, bulk storage).',
    color: '#f59e0b'
  },
  {
    icon: '🏥',
    title: 'Medical Device Battery Reliability',
    short: 'Life-critical power where failure is not an option',
    tagline: 'When a pacemaker battery says 10%, it really means 10%',
    description: 'Implantable medical devices like pacemakers, defibrillators, and insulin pumps require batteries that perform predictably for a decade. Internal resistance monitoring provides early warning of approaching end-of-life, enabling scheduled replacement before failure.',
    connection: 'Unlike consumer devices that can recharge, implanted batteries must accurately predict remaining capacity based on resistance trends. A resistance spike that would cause a phone to show "20% remaining" and shut down could mean life-or-death miscalculation for a pacemaker.',
    howItWorks: 'Medical device batteries undergo extensive characterization of resistance vs state-of-charge curves during manufacturing. Implanted devices measure impedance during therapy delivery pulses, comparing against baseline to detect degradation. When resistance exceeds thresholds, the device signals "elective replacement indicator" months before actual failure.',
    stats: [
      { value: '8-15 yr', label: 'Pacemaker battery lifespan with resistance monitoring', icon: '❤️' },
      { value: '750 V', label: 'Defibrillator discharge requiring ultra-low resistance', icon: '⚡' },
      { value: '99.99%', label: 'Required reliability for life-critical devices', icon: '✓' }
    ],
    examples: [
      'Medtronic pacemakers measuring impedance during every pacing pulse to track resistance trends',
      'Abbott ICD devices using resistance-based algorithms to optimize high-voltage therapy energy',
      'Insulet Omnipod calculating insulin delivery accuracy based on pump motor current draw',
      'Cochlear implant processors warning users of battery health based on voltage sag patterns'
    ],
    companies: ['Medtronic', 'Abbott', 'Boston Scientific', 'Biotronik', 'Philips'],
    futureImpact: 'Wireless charging and energy harvesting from body heat or motion may supplement primary batteries in future implants. Advanced lithium chemistries with ultra-stable resistance profiles could enable 20+ year device lifespans, eliminating replacement surgery for many patients.',
    color: '#ec4899'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM AND TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  battery: '#22c55e',
  batteryLow: '#ef4444',
  batteryMid: '#f59e0b',
  voltage: '#3b82f6',
  current: '#a855f7',
  resistance: '#ec4899',
  power: '#f97316',
};

// Phase types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BatteryInternalResistanceRenderer: React.FC<BatteryInternalResistanceRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography with font weights
  const typo = {
    title: isMobile ? '24px' : '32px',
    heading: isMobile ? '18px' : '22px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    // Font weights for typography variety
    bodyWeight: 400 as const,
    smallWeight: 400 as const,
    boldWeight: 700 as const,
  };

  // Phase state
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with gamePhase prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Emit game event helper
  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'battery-internal-resistance',
        gameTitle: 'Battery Internal Resistance',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200 || isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitGameEvent('phase_changed', { from: phase, to: newPhase });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [phase, emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Simulation state
  const [stateOfCharge, setStateOfCharge] = useState(100);
  const [temperature, setTemperature] = useState(25);
  const [loadCurrent, setLoadCurrent] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<number | null>(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateBatteryValues = useCallback(() => {
    // Base internal resistance at 100% SOC and 25C (typical Li-ion: 20-100 milliohms)
    const baseResistance = 0.05; // 50 milliohms

    // SOC effect: internal resistance increases exponentially as battery depletes
    const socFactor = 1 + 2 * Math.pow(1 - stateOfCharge / 100, 2);

    // Temperature effect: resistance increases significantly in cold
    let tempFactor = 1;
    if (temperature < 25) {
      tempFactor = 1 + 0.05 * Math.pow(25 - temperature, 1.3);
    } else if (temperature > 25) {
      tempFactor = 1 - 0.01 * Math.min(temperature - 25, 20);
    }

    const internalResistance = baseResistance * socFactor * tempFactor;
    const openCircuitVoltage = 3.0 + 1.2 * (stateOfCharge / 100);
    const voltageDrop = loadCurrent * internalResistance;
    const terminalVoltage = Math.max(0, openCircuitVoltage - voltageDrop);
    const powerDelivered = terminalVoltage * loadCurrent;
    const powerWasted = voltageDrop * loadCurrent;
    const efficiency = openCircuitVoltage > 0 ? (terminalVoltage / openCircuitVoltage) * 100 : 0;

    return { internalResistance, openCircuitVoltage, terminalVoltage, voltageDrop, powerDelivered, powerWasted, efficiency };
  }, [stateOfCharge, temperature, loadCurrent]);

  const values = calculateBatteryValues();

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLoadCurrent(prev => {
        let newVal = prev + animationDirection * 0.2;
        if (newVal >= 10) { setAnimationDirection(-1); newVal = 10; }
        else if (newVal <= 0.1) { setAnimationDirection(1); newVal = 0.1; }
        return Math.round(newVal * 10) / 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, animationDirection]);

  // Predictions
  const predictions = [
    { id: 'voltage_same', label: 'Battery voltage stays the same regardless of current draw' },
    { id: 'voltage_drops', label: 'Battery voltage drops when current increases due to internal resistance' },
    { id: 'voltage_increases', label: 'Battery voltage increases when you draw more current' },
    { id: 'only_empty', label: 'Internal resistance only matters when the battery is empty' },
  ];

  const twistPredictions = [
    { id: 'cold_fine', label: 'Cold batteries work just as well - temperature only affects capacity' },
    { id: 'cold_worse', label: 'Cold dramatically increases internal resistance, multiplying voltage drop under load', correct: true },
    { id: 'cold_better', label: 'Cold actually improves battery performance by reducing self-discharge' },
    { id: 'cold_same', label: 'Temperature affects all batteries equally regardless of current draw' },
  ];

  // Test functions
  const handleTestAnswer = (questionIndex: number, answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerId;
    setTestAnswers(newAnswers);
    emitGameEvent('answer_submitted', { questionIndex, answerId });
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const userAnswer = testAnswers[i];
      const correctOption = q.options.find(o => o.correct);
      if (userAnswer === correctOption?.id) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 8 ? 'success' : 'failure');
    emitGameEvent('game_completed', { score, total: 10, passed: score >= 8 });
  };

  // Get battery color based on SOC
  const getBatteryColor = () => {
    if (stateOfCharge > 60) return colors.battery;
    if (stateOfCharge > 30) return colors.batteryMid;
    return colors.batteryLow;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderVisualization = (interactive: boolean, showTempControl: boolean = false) => {
    const width = 700;
    const height = 420;
    const electronCount = Math.floor(loadCurrent * 3);
    const electrons = Array.from({ length: electronCount }, (_, i) => ({ id: i, offset: (i * 100 / electronCount) % 100 }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ borderRadius: '12px', maxWidth: '700px' }}>
          <defs>
            <linearGradient id="labBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <linearGradient id="batteryCasing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="terminalPos" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="terminalNeg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="electrolyteFull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="electrolyteMid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="electrolyteLow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.75" />
            </linearGradient>
            <radialGradient id="resistanceHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#labBg)" />

          {/* Battery Cell */}
          <g transform="translate(30, 30)">
            <rect x="0" y="0" width="110" height="170" rx="10" fill="url(#batteryCasing)" stroke="#64748b" strokeWidth="2" />
            <rect x="6" y="6" width="98" height="158" rx="6" fill="#0f172a" />
            <rect x="35" y="-12" width="40" height="16" rx="3" fill="url(#terminalPos)" />
            <text x="55" y="0" fill="#78350f" fontSize="9" fontWeight="bold" textAnchor="middle">+</text>
            <rect x="35" y="166" width="40" height="12" rx="3" fill="url(#terminalNeg)" />
            <text x="55" y="176" fill="#334155" fontSize="9" fontWeight="bold" textAnchor="middle">-</text>

            {/* Electrolyte fill */}
            <rect
              x="10" y={10 + 150 * (1 - stateOfCharge / 100)} width="90"
              height={150 * (stateOfCharge / 100)} rx="4"
              fill={stateOfCharge > 60 ? 'url(#electrolyteFull)' : stateOfCharge > 30 ? 'url(#electrolyteMid)' : 'url(#electrolyteLow)'}
            >
              <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite" />
            </rect>

            {/* SOC display */}
            <rect x="25" y="70" width="60" height="28" rx="5" fill="rgba(0,0,0,0.7)" />
            <text x="55" y="90" fill={getBatteryColor()} fontSize="16" fontWeight="bold" textAnchor="middle">{stateOfCharge}%</text>

            {/* Heat glow when resistance high */}
            {values.internalResistance > 0.08 && (
              <ellipse cx="55" cy="85" rx={25 + values.internalResistance * 150} ry={15 + values.internalResistance * 80} fill="url(#resistanceHeat)" filter="url(#glow)">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
              </ellipse>
            )}

            <text x="55" y="205" fill={colors.textSecondary} fontSize="10" textAnchor="middle" fontWeight="600">Li-ion Cell</text>
            <text x="55" y="218" fill={colors.textMuted} fontSize="8" textAnchor="middle">Nominal 3.7V</text>
          </g>

          {/* Temperature gauge */}
          {showTempControl && (
            <g transform="translate(160, 40)">
              <rect x="-5" y="-5" width="40" height="120" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <rect x="8" y="5" width="14" height="80" rx="7" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <rect x="10" y={7 + 68 * (1 - (temperature + 20) / 80)} width="10" height={68 * ((temperature + 20) / 80)} rx="5"
                fill={temperature < 10 ? '#0ea5e9' : temperature > 35 ? '#ef4444' : '#f59e0b'} />
              <circle cx="15" cy="90" r="10" fill={temperature < 10 ? '#0ea5e9' : temperature > 35 ? '#ef4444' : '#f59e0b'} filter="url(#glow)" />
              <text x="15" y="115" fill={temperature < 10 ? '#38bdf8' : temperature > 35 ? '#f87171' : '#fbbf24'} fontSize="11" fontWeight="bold" textAnchor="middle">{temperature}C</text>
            </g>
          )}

          {/* Circuit diagram */}
          <g transform={showTempControl ? "translate(220, 25)" : "translate(160, 25)"}>
            <text x="0" y="0" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Internal Circuit Model</text>

            {/* OCV source */}
            <g transform="translate(25, 25)">
              <circle cx="0" cy="28" r="22" fill="none" stroke={colors.voltage} strokeWidth="2.5" filter="url(#glow)" />
              <circle cx="0" cy="28" r="19" fill="#1e293b" />
              <text x="0" y="23" fill={colors.voltage} fontSize="8" textAnchor="middle" fontWeight="bold">OCV</text>
              <text x="0" y="35" fill={colors.voltage} fontSize="10" textAnchor="middle" fontWeight="bold">{values.openCircuitVoltage.toFixed(2)}V</text>
            </g>

            {/* Wire to resistor */}
            <line x1="47" y1="53" x2="80" y2="53" stroke="#f97316" strokeWidth="3" />

            {/* Electrons on wire */}
            {loadCurrent > 0 && electrons.slice(0, 3).map((e) => (
              <circle key={`e1-${e.id}`} cx="63" cy="53" r="2.5" fill="url(#electronGlow)" filter="url(#glow)">
                <animate attributeName="cx" from="47" to="80" dur={`${0.5 / Math.max(0.1, loadCurrent)}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Internal resistance */}
            <g transform="translate(80, 40)">
              <rect x="0" y="0" width="70" height="26" rx="3" fill="#78350f" stroke="#92400e" strokeWidth="1" />
              <path d="M5,13 l6,-9 l10,18 l10,-18 l10,18 l10,-18 l10,18 l5,-9" fill="none" stroke="#fcd34d" strokeWidth="1.5" />
              {values.powerWasted > 0.1 && (
                <ellipse cx="35" cy="13" rx={18 + values.powerWasted * 8} ry={8 + values.powerWasted * 4} fill="url(#resistanceHeat)" opacity={Math.min(0.7, values.powerWasted / 2)}>
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur="0.8s" repeatCount="indefinite" />
                </ellipse>
              )}
            </g>

            <text x="115" y="82" fill={colors.resistance} fontSize="9" textAnchor="middle" fontWeight="bold">R_int</text>
            <text x="115" y="95" fill={colors.resistance} fontSize="11" textAnchor="middle" fontWeight="bold">{(values.internalResistance * 1000).toFixed(0)} mOhm</text>

            {/* Wire to output */}
            <line x1="150" y1="53" x2="185" y2="53" stroke="#f97316" strokeWidth="3" />
            {loadCurrent > 0 && electrons.slice(0, 3).map((e) => (
              <circle key={`e2-${e.id}`} cx="167" cy="53" r="2.5" fill="url(#electronGlow)" filter="url(#glow)">
                <animate attributeName="cx" from="150" to="185" dur={`${0.5 / Math.max(0.1, loadCurrent)}s`} repeatCount="indefinite" begin={`${e.offset / 100}s`} />
              </circle>
            ))}

            {/* Terminal voltage output */}
            <g transform="translate(185, 30)">
              <rect x="0" y="0" width="75" height="46" rx="6" fill="rgba(34, 197, 94, 0.15)" stroke={colors.battery} strokeWidth="1.5" filter="url(#glow)" />
              <text x="37.5" y="17" fill={colors.battery} fontSize="9" textAnchor="middle" fontWeight="bold">V_terminal</text>
              <text x="37.5" y="36" fill={colors.battery} fontSize="15" textAnchor="middle" fontWeight="bold">{values.terminalVoltage.toFixed(2)}V</text>
            </g>

            {/* Voltage drop bar */}
            <g transform="translate(25, 115)">
              <text x="0" y="0" fill={colors.textSecondary} fontSize="9" fontWeight="600">Voltage Distribution</text>
              <rect x="0" y="8" width="235" height="22" rx="4" fill="rgba(0,0,0,0.4)" />
              <rect x="0" y="8" width={235 * (values.terminalVoltage / values.openCircuitVoltage)} height="22" rx="4" fill={colors.battery} />
              <rect x={235 * (values.terminalVoltage / values.openCircuitVoltage)} y="8" width={235 * (values.voltageDrop / values.openCircuitVoltage)} height="22" fill={colors.error} filter="url(#glow)">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
              </rect>
              <text x="5" y="23" fill={colors.textPrimary} fontSize="8" fontWeight="bold">V_term: {values.terminalVoltage.toFixed(2)}V</text>
              <text x={Math.max(235 * (values.terminalVoltage / values.openCircuitVoltage) + 3, 160)} y="23" fill={colors.textPrimary} fontSize="8">Loss: {values.voltageDrop.toFixed(3)}V</text>
              <text x="117.5" y="45" fill={colors.error} fontSize="10" textAnchor="middle" fontWeight="bold">
                {((values.voltageDrop / values.openCircuitVoltage) * 100).toFixed(1)}% lost to internal resistance
              </text>
            </g>
          </g>

          {/* Current indicator */}
          <g transform={showTempControl ? "translate(480, 25)" : "translate(430, 25)"}>
            <rect x="0" y="0" width="180" height="50" rx="6" fill="rgba(0,0,0,0.5)" stroke={colors.current} strokeWidth="1" />
            <text x="90" y="18" fill={colors.current} fontSize="11" textAnchor="middle" fontWeight="bold">Load Current</text>
            <text x="90" y="40" fill={colors.current} fontSize="18" textAnchor="middle" fontWeight="bold">{loadCurrent.toFixed(1)} A</text>
            <g transform="translate(145, 27)">
              {[0, 1, 2].map((i) => (
                <circle key={`ind-${i}`} cx={i * 10} cy="0" r="3" fill="url(#electronGlow)" filter="url(#glow)">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>
          </g>

          {/* Power analysis */}
          <g transform="translate(30, 260)">
            <text x="0" y="0" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Power Analysis</text>
            <rect x="0" y="12" width="280" height="24" rx="5" fill="rgba(0,0,0,0.4)" />
            <rect x="0" y="12" width={Math.min(280, 280 * (values.powerDelivered / (values.powerDelivered + values.powerWasted + 0.01)))} height="24" rx="5" fill={colors.success} />
            <text x="8" y="28" fill={colors.textPrimary} fontSize="10" fontWeight="600">Delivered: {values.powerDelivered.toFixed(2)}W</text>

            <rect x="0" y="42" width="280" height="24" rx="5" fill="rgba(0,0,0,0.4)" />
            <rect x="0" y="42" width={Math.min(280, 280 * (values.powerWasted / (values.powerDelivered + values.powerWasted + 0.01)))} height="24" rx="5" fill={colors.error}>
              {values.powerWasted > 0.1 && <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />}
            </rect>
            <text x="8" y="58" fill={colors.textPrimary} fontSize="10" fontWeight="600">Lost as Heat (I^2R): {values.powerWasted.toFixed(3)}W</text>

            <rect x="290" y="12" width="70" height="54" rx="6" fill="rgba(245, 158, 11, 0.15)" stroke={colors.accent} strokeWidth="1" />
            <text x="325" y="30" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Efficiency</text>
            <text x="325" y="52" fill={colors.accent} fontSize="16" textAnchor="middle" fontWeight="bold">{values.efficiency.toFixed(1)}%</text>
          </g>

          {/* V-I graph */}
          <g transform="translate(400, 260)">
            <rect x="0" y="0" width="280" height="140" rx="6" fill="rgba(0,0,0,0.4)" stroke="#334155" strokeWidth="1" />
            <text x="140" y="16" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">Terminal Voltage vs Load Current</text>
            <g transform="translate(35, 28)">
              {[0, 1, 2, 3, 4].map((i) => (<line key={`hg-${i}`} x1="0" y1={i * 20} x2="220" y2={i * 20} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" />))}
              {[0, 1, 2, 3, 4].map((i) => (<line key={`vg-${i}`} x1={i * 55} y1="0" x2={i * 55} y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" />))}
              <line x1="0" y1="80" x2="220" y2="80" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="80" stroke={colors.textMuted} strokeWidth="1.5" />
              <path d={`M0,${80 - 80 * (values.openCircuitVoltage / 4.5)} L220,${80 - 80 * ((values.openCircuitVoltage - 10 * values.internalResistance) / 4.5)}`} fill="none" stroke={colors.voltage} strokeWidth="2" strokeLinecap="round" />
              <circle cx={220 * (loadCurrent / 10)} cy={80 - 80 * (values.terminalVoltage / 4.5)} r="7" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#glow)">
                <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x="110" y="105" fill={colors.textMuted} fontSize="8" textAnchor="middle">Current (A)</text>
              <text x="-10" y="40" fill={colors.textMuted} fontSize="8" textAnchor="middle" transform="rotate(-90, -10, 40)">Voltage (V)</text>
              <text x="0" y="92" fill={colors.textMuted} fontSize="8" textAnchor="middle">0</text>
              <text x="55" y="92" fill={colors.textMuted} fontSize="8" textAnchor="middle">2.5</text>
              <text x="165" y="92" fill={colors.textMuted} fontSize="8" textAnchor="middle">7.5</text>
              <text x="220" y="92" fill={colors.textMuted} fontSize="8" textAnchor="middle">10</text>
            </g>
          </g>

          {/* Formula */}
          <g transform="translate(400, 210)">
            <rect x="0" y="0" width="280" height="40" rx="5" fill="rgba(168, 85, 247, 0.1)" stroke={colors.current} strokeWidth="1" />
            <text x="140" y="15" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Key Equations:</text>
            <text x="140" y="30" fill={colors.current} fontSize="10" textAnchor="middle" fontWeight="bold">V_term = OCV - (I x R_int)  |  P_loss = I^2 x R</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button onClick={() => setIsAnimating(!isAnimating)} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: isAnimating ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', minHeight: '44px'
            }}>
              {isAnimating ? 'Stop Current Sweep' : 'Sweep Current (0-10A)'}
            </button>
            <button onClick={() => { setStateOfCharge(100); setTemperature(25); setLoadCurrent(1); setIsAnimating(false); }} style={{
              padding: '10px 20px', borderRadius: '8px', border: `2px solid ${colors.accent}`,
              background: 'transparent', color: colors.accent, fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', minHeight: '44px'
            }}>
              Reset All
            </button>
          </div>
        )}
      </div>
    );
  };

  // Controls
  const renderControls = (showTempControl: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Load Current: {loadCurrent.toFixed(1)} A</label>
        <input type="range" min="0.1" max="10" step="0.1" value={loadCurrent}
          onChange={(e) => setLoadCurrent(parseFloat(e.target.value))}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>Low (0.1A)</span><span>High (10A)</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>State of Charge: {stateOfCharge}%</label>
        <input type="range" min="5" max="100" step="5" value={stateOfCharge}
          onChange={(e) => setStateOfCharge(parseInt(e.target.value))}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>Nearly Empty (5%)</span><span>Full (100%)</span>
        </div>
      </div>
      {showTempControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Temperature: {temperature}C</label>
          <input type="range" min="-20" max="50" step="5" value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.accent }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
            <span>Freezing (-20C)</span><span>Hot (50C)</span>
          </div>
        </div>
      )}
      <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.current}` }}>
        <div style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Key Insight</div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 1.5 }}>
          Voltage drop = Current x Internal Resistance (V = IR). Higher current or higher resistance means more voltage loss and wasted power as heat.
        </div>
      </div>
    </div>
  );

  // Progress bar
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '3px', padding: '10px 16px', background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button onClick={() => index <= currentIndex && goToPhase(p)} disabled={index > currentIndex} style={{
              width: isMobile ? '26px' : '30px', height: isMobile ? '26px' : '30px', borderRadius: '50%', border: 'none',
              background: index === currentIndex ? colors.accent : index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)',
              color: index <= currentIndex ? 'white' : colors.textMuted, fontSize: isMobile ? '9px' : '10px', fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }} title={phaseLabels[p]}>
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{ width: isMobile ? '10px' : '18px', height: '2px', background: index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Navigation dots (for transfer phase)
  const renderNavDots = (total: number, current: number, onSelect: (i: number) => void) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => onSelect(i)} style={{
          width: '10px', height: '10px', borderRadius: '50%', border: 'none',
          background: i === current ? colors.accent : 'rgba(255,255,255,0.3)', cursor: 'pointer'
        }} />
      ))}
    </div>
  );

  // Bottom navigation
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    let canProceed = true;
    let nextLabel = 'Continue';

    switch (phase) {
      case 'hook': nextLabel = 'Start Exploring'; break;
      case 'predict': canProceed = !!prediction; nextLabel = 'Continue to Experiment'; break;
      case 'play': nextLabel = 'Continue to Review'; break;
      case 'review': nextLabel = 'Next: A Twist!'; break;
      case 'twist_predict': canProceed = !!twistPrediction; nextLabel = 'Continue to Experiment'; break;
      case 'twist_play': nextLabel = 'Continue to Explanation'; break;
      case 'twist_review': nextLabel = 'Continue to Applications'; break;
      case 'transfer': canProceed = expandedApp !== null; nextLabel = 'Continue to Test'; break;
      case 'test': canProceed = testSubmitted && testScore >= 8; nextLabel = testSubmitted ? (testScore >= 8 ? 'Continue to Mastery' : 'Review & Retry') : 'Submit Test'; break;
      case 'mastery': nextLabel = 'Complete Lesson'; break;
    }

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '12px', zIndex: 1000 }}>
        <button onClick={goBack} disabled={isFirst} style={{
          padding: '10px 20px', borderRadius: '8px', border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
          background: 'transparent', color: isFirst ? colors.textMuted : colors.textPrimary, fontWeight: 'bold', cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isFirst ? 0.5 : 1, minHeight: '44px', transition: 'all 0.2s ease'
        }}>Back</button>
        <button onClick={phase === 'test' && !testSubmitted ? submitTest : goNext} disabled={!canProceed && phase !== 'test'} style={{
          padding: '10px 28px', borderRadius: '8px', border: 'none',
          background: (canProceed || (phase === 'test' && !testSubmitted)) ? colors.accent : 'rgba(255,255,255,0.1)',
          color: (canProceed || (phase === 'test' && !testSubmitted)) ? 'white' : colors.textMuted, fontWeight: 'bold',
          cursor: (canProceed || (phase === 'test' && !testSubmitted)) ? 'pointer' : 'not-allowed', fontSize: '13px', flex: 1, maxWidth: '280px', minHeight: '44px', transition: 'all 0.2s ease'
        }}>{nextLabel}</button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPhaseContent = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────────────────────────
      // HOOK PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'hook':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>Battery Internal Resistance</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 400, marginBottom: '20px' }}>
                The hidden enemy that steals power from every battery
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '20px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, margin: 0 }}>
                  <strong>Have you ever wondered...</strong> Why does your phone die at 20% when gaming but lasts to 5% for texting?
                  Why does your car struggle to start on cold mornings even with a "good" battery? Why do electric vehicles lose range in winter?
                </p>
              </div>
            </div>

            {renderVisualization(true)}

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 400, lineHeight: 1.6 }}>
                  Every battery has a hidden enemy inside: <strong style={{ color: colors.resistance }}>internal resistance</strong>.
                  This resistance is not on any circuit diagram - it exists within the battery's own chemistry. When current flows,
                  this resistance steals voltage and converts energy to heat.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400, marginTop: '12px' }}>
                  The effect is small at low currents but becomes <strong>dramatic</strong> under heavy loads. Understanding internal
                  resistance explains countless everyday battery mysteries.
                </p>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.current}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.small, margin: 0 }}>
                  <strong>Try it now:</strong> Use the sliders to change load current and state of charge. Watch how the terminal voltage drops!
                </p>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // PREDICT PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '8px' }}>Make Your Prediction</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What happens to battery voltage when you increase current draw?</p>
            </div>

            {renderVisualization(false)}

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>Understanding the Setup</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  The battery has an internal resistance (R_int) that causes voltage drop when current flows.
                  <strong style={{ color: colors.voltage }}> Open Circuit Voltage (OCV)</strong> is what you measure with no load.
                  <strong style={{ color: colors.battery }}> Terminal voltage</strong> is what the device actually receives.
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Step 1 of 2: Make your prediction</p>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '12px' }}>
                When you increase the current draw from a battery, the terminal voltage will...
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((p) => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.small, minHeight: '44px'
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // PLAY PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'play':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Explore Internal Resistance</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>See how current and state of charge affect voltage</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.voltage}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> Notice how the terminal voltage changes as you adjust the controls. Watch the voltage drop increase with higher current.
                </p>
              </div>
            </div>

            {renderVisualization(true)}
            {renderControls()}

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
                  <li>Set current to <strong>10A</strong> and watch voltage drop dramatically</li>
                  <li>Reduce SOC to <strong>10%</strong> - notice how resistance increases further</li>
                  <li>Compare efficiency at <strong>1A</strong> vs <strong>10A</strong> load</li>
                  <li>Click "Sweep Current" to see the full range of behavior</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Why this matters:</strong> Internal resistance is important in real-world applications from electric vehicles to smartphones. Engineers design battery systems to minimize resistance losses, which is why this concept is used in the industry to improve technology every day.
                </p>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'review':
        const wasCorrect = prediction === 'voltage_drops';
        return (
          <>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {wasCorrect ? 'Your prediction was correct!' : 'Not Quite What You Predicted!'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                {wasCorrect ? 'As you predicted, battery' : 'As you observed in the experiment, battery'} voltage <strong>drops when current increases</strong> because of internal resistance.
                The voltage available at the terminals equals OCV minus the voltage lost across R_internal.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: typo.heading }}>The Physics of Internal Resistance</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Ohm's Law Inside the Battery:</strong><br/>
                    V_terminal = V_OCV - (I x R_internal)<br/>
                    The higher the current, the more voltage is "lost" inside the battery itself.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Power Loss Equation:</strong><br/>
                    P_loss = I^2 x R<br/>
                    Power loss scales with the <strong>square</strong> of current! Double the current = 4x the heat generated inside the battery.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>SOC Effect:</strong><br/>
                    As the battery depletes, chemical reactions slow and ion transport becomes harder, increasing resistance.
                    A nearly empty battery can have 2-3x higher resistance than when full.
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Why It Matters:</strong><br/>
                    This explains why fast charging generates heat (high current), why phones die at 15% under gaming load,
                    and why cold batteries cannot deliver high power. The battery is not "empty" - it just cannot deliver voltage under load!
                  </p>
                </div>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TWIST PREDICT PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>The Temperature Twist</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What happens to internal resistance when batteries get cold?</p>
            </div>

            {renderVisualization(false, true)}

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>The Scenario:</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  It is a cold winter morning (-10C). Your car battery measured 12.6V yesterday in the garage - perfectly healthy.
                  But now when you turn the key, the starter motor barely turns. The headlights work fine, though.
                  What is happening inside the battery?
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Step 1 of 2: Make your prediction</p>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '12px' }}>
                How does cold temperature affect internal resistance?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twistPredictions.map((p) => (
                  <button key={p.id} onClick={() => { setTwistPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.small, minHeight: '44px'
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TWIST PLAY PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'twist_play':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>Temperature and Current Effects Combined</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>See the dramatic impact of cold on high-current applications</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.voltage}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> Notice how temperature dramatically affects voltage under load. Watch what happens to terminal voltage when you combine cold temperature with high current.
                </p>
              </div>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${colors.warning}` }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Critical Experiment:</h4>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  1. Set temperature to <strong>-20C</strong> and SOC to <strong>30%</strong><br/>
                  2. Compare terminal voltage at <strong>0.5A</strong> (headlights) vs <strong>5A</strong> (power tool)<br/>
                  3. Now try <strong>10A</strong> (starter motor) - the voltage collapses!<br/>
                  <br/>
                  This is why a battery that can run lights all night cannot start your car in winter.
                </p>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TWIST REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'cold_worse';
        return (
          <>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {twistWasCorrect ? 'You Got It!' : 'Close, but...'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                <strong>Cold dramatically increases internal resistance!</strong> At -20C, resistance can be 3-5x higher than at 25C.
                Combined with high-current demands, this creates catastrophic voltage drops.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.warning, marginBottom: '14px', fontSize: typo.heading }}>Why Cold Batteries Fail Under Load</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The Chemistry:</strong><br/>
                    Cold temperatures slow the chemical reactions that generate electricity. Ion mobility through the electrolyte
                    decreases, electrode kinetics slow, and the battery's equivalent resistance increases dramatically.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The Math (Car Battery Example):</strong><br/>
                    At 25C: R_int = 10 milliohms. Starter motor at 300A: V_drop = 3V. Battery delivers 9V - works!<br/>
                    At -20C: R_int = 40 milliohms. Starter motor at 300A: V_drop = 12V. Battery collapses to 0V!<br/>
                    <em>Same battery, same charge, completely different behavior.</em>
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Why Headlights Still Work:</strong><br/>
                    Headlights draw only 4-8 amps. At 40 milliohms cold resistance, that is only 0.16-0.32V drop - barely noticeable.
                    The 300A starter motor sees 40x more current and 40x more voltage drop.
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Solutions in Practice:</strong><br/>
                    EV battery preconditioning, block heaters for cars, battery blankets, and high-CCA (Cold Cranking Amps) ratings
                    all address this fundamental physics. Engineers cannot eliminate internal resistance - they can only manage it.
                  </p>
                </div>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TRANSFER PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'transfer':
        return (
          <div style={{ padding: typo.pagePadding }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '8px' }}>
              Internal resistance affects every battery-powered system on Earth
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '16px' }}>
              Application {expandedApp !== null ? expandedApp + 1 : 0} of {realWorldApps.length}
            </p>

            {realWorldApps.map((app, index) => (
              <div key={index} style={{ background: colors.bgCard, marginBottom: '14px', borderRadius: '12px', border: expandedApp === index ? `2px solid ${app.color}` : '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <button onClick={() => { setExpandedApp(expandedApp === index ? null : index); playSound('click'); }} style={{
                  width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px'
                }}>
                  <span style={{ fontSize: '28px' }}>{app.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: colors.textPrimary, fontSize: typo.body, margin: 0 }}>{app.title}</h3>
                    <p style={{ color: colors.textSecondary, fontSize: typo.label, margin: '4px 0 0 0' }}>{app.tagline}</p>
                  </div>
                  <span style={{ color: colors.textSecondary, fontSize: '18px' }}>{expandedApp === index ? '−' : '+'}</span>
                </button>

                {expandedApp === index && (
                  <div style={{ padding: '0 14px 14px 14px' }}>
                    <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6, marginBottom: '12px' }}>{app.description}</p>

                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${app.color}` }}>
                      <h4 style={{ color: app.color, fontSize: typo.small, marginBottom: '6px' }}>Connection to Internal Resistance</h4>
                      <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5 }}>{app.connection}</p>
                    </div>

                    <h4 style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '8px' }}>How It Works</h4>
                    <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5, marginBottom: '12px' }}>{app.howItWorks}</p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {app.stats.map((stat, i) => (
                        <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', flex: '1 1 80px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                          <div style={{ color: app.color, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                          <div style={{ color: colors.textSecondary, fontSize: '9px' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <h4 style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '6px' }}>Real Examples</h4>
                    <ul style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.6, paddingLeft: '16px', margin: '0 0 12px 0' }}>
                      {app.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                    </ul>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {app.companies.map((co, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: typo.label, color: colors.textSecondary }}>{co}</span>
                      ))}
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                      <h4 style={{ color: colors.success, fontSize: typo.label, marginBottom: '4px' }}>Future Impact</h4>
                      <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5 }}>{app.futureImpact}</p>
                    </div>

                    <button onClick={() => { if (index < realWorldApps.length - 1) setExpandedApp(index + 1); playSound('click'); }} style={{
                      width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                      background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                    }}>
                      {index < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It - Continue'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {renderNavDots(4, expandedApp ?? -1, setExpandedApp)}
          </div>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TEST PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: typo.pagePadding }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px'
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.title }}>
                  {testScore >= 8 ? 'Excellent Work!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
                  {testScore >= 8 ? 'You have mastered battery internal resistance!' : 'Review the material and try again. You need 8/10 to pass.'}
                </p>
                {testScore < 8 && (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }} style={{
                    marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                  }}>Try Again</button>
                )}
              </div>

              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOption = q.options.find(o => o.correct);
                const isCorrect = userAnswer === correctOption?.id;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, marginBottom: '12px', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Question {qIndex + 1}</p>
                    <p style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '10px' }}>{q.question}</p>
                    {q.options.map((opt) => (
                      <div key={opt.id} style={{
                        padding: '8px 10px', marginBottom: '4px', borderRadius: '6px',
                        background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === opt.id ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === opt.id ? colors.error : colors.textMuted,
                        fontSize: typo.label
                      }}>
                        {opt.correct ? 'Correct: ' : userAnswer === opt.id && !opt.correct ? 'Your answer: ' : ''}{opt.label}
                      </div>
                    ))}
                    <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '6px', marginTop: '8px' }}>
                      <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5 }}>{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
          <div style={{ padding: typo.pagePadding }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Question {currentTestQuestion + 1} of 10</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{
                  flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)'
                }} />
              ))}
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '6px' }}>Scenario:</p>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>{currentQ.scenario}</p>
            </div>

            <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt) => (
                <button key={opt.id} onClick={() => handleTestAnswer(currentTestQuestion, opt.id)} style={{
                  padding: '14px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: typo.small,
                  border: testAnswers[currentTestQuestion] === opt.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === opt.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary, minHeight: '44px'
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>{opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{
                padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`,
                background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', fontSize: typo.small, minHeight: '44px'
              }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: colors.accent, color: 'white', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                }}>Next Question</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontSize: typo.small, minHeight: '44px'
                }}>Submit Test</button>
              )}
            </div>
          </div>
        );

      // ───────────────────────────────────────────────────────────────────────
      // MASTERY PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'mastery':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <div style={{ fontSize: '72px', marginBottom: '12px' }}>🏆</div>
              <h1 style={{ color: colors.success, fontSize: typo.title, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '20px' }}>
                You have conquered Battery Internal Resistance
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Concepts You Have Mastered</h3>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '18px', margin: 0, fontSize: typo.small }}>
                  <li><strong style={{ color: colors.textPrimary }}>Voltage Drop:</strong> V_terminal = OCV - (I x R_internal)</li>
                  <li><strong style={{ color: colors.textPrimary }}>Power Loss:</strong> P_loss = I^2 x R - losses scale with current squared</li>
                  <li><strong style={{ color: colors.textPrimary }}>SOC Effect:</strong> Resistance increases 2-3x as battery depletes</li>
                  <li><strong style={{ color: colors.textPrimary }}>Temperature Effect:</strong> Cold increases resistance 3-5x</li>
                  <li><strong style={{ color: colors.textPrimary }}>High-Current Sensitivity:</strong> Problems only appear under heavy load</li>
                  <li><strong style={{ color: colors.textPrimary }}>Real-World Impact:</strong> EVs, smartphones, medical devices, grid storage</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.accent}` }}>
                <h3 style={{ color: colors.accent, marginBottom: '10px', fontSize: typo.heading }}>Where to Go From Here</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  You now understand one of the most important yet overlooked concepts in electrical engineering.
                  Internal resistance explains countless everyday mysteries and drives billions of dollars in battery R&D.
                  Next, explore how <strong>battery management systems</strong> use resistance measurements for state-of-health estimation,
                  or dive into <strong>thermal management</strong> strategies that minimize resistance-related losses.
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '18px', borderRadius: '12px' }}>
                <h3 style={{ color: colors.success, marginBottom: '10px', fontSize: typo.heading }}>Your Achievement</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '40px' }}>🔋⚡</div>
                  <div>
                    <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '4px' }}>
                      Battery Internal Resistance Master
                    </p>
                    <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
                      Completed all 10 phases with {testScore}/10 on final assessment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {renderVisualization(true, true)}
          </>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px', paddingTop: '60px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default BatteryInternalResistanceRenderer;
