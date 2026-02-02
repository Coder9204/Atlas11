'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DC-DC Converter Physics - Complete 10-Phase Learning Game
// How Buck and Boost Converters Transform Voltage Efficiently
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

interface DCDCConverterRendererProps {
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
    scenario: "A solar panel outputs 36V during peak sunlight, but your RV's battery system needs 14.4V for charging. You're designing a power system using a buck converter.",
    question: "What duty cycle should you set on the buck converter to step down from 36V to 14.4V?",
    options: [
      { id: 'a', label: "40% - The converter outputs D x Vin, so 0.40 x 36V = 14.4V", correct: true },
      { id: 'b', label: "60% - You need more ON time to push current through" },
      { id: 'c', label: "25% - Lower duty cycle means higher voltage conversion" },
      { id: 'd', label: "50% - Always use 50% for optimal efficiency" }
    ],
    explanation: "For a buck converter, Vout = D x Vin. To get 14.4V from 36V: D = 14.4/36 = 0.40 or 40%. The switch is ON 40% of the time, averaging the voltage down to exactly what the battery needs."
  },
  {
    scenario: "A USB-C charger receives 380V DC from its power factor correction stage. It needs to deliver 20V at 3A for a laptop. An engineer notices the inductor is getting warm during operation.",
    question: "What is the inductor's primary role that causes it to heat up?",
    options: [
      { id: 'a', label: "Filtering out high-frequency noise from the output" },
      { id: 'b', label: "Storing energy during switch ON time and releasing it during OFF time", correct: true },
      { id: 'c', label: "Providing electrical isolation between input and output" },
      { id: 'd', label: "Limiting inrush current when the charger is first plugged in" }
    ],
    explanation: "The inductor stores magnetic energy when current flows through it (switch ON), then releases that energy to the output when the switch turns OFF. The continuous charge/discharge cycle causes core losses and resistive heating in the windings, making inductors one of the warmest components."
  },
  {
    scenario: "An electric bicycle controller steps up the 48V battery to 60V for the motor during hill climbing. At 75% duty cycle, the boost converter suddenly becomes very inefficient and the MOSFETs overheat.",
    question: "Why does efficiency drop dramatically at high duty cycles in boost converters?",
    options: [
      { id: 'a', label: "The capacitor cannot store enough energy at high duty cycles" },
      { id: 'b', label: "Very short OFF times mean high peak currents and excessive switch losses", correct: true },
      { id: 'c', label: "The inductor saturates at duty cycles above 70%" },
      { id: 'd', label: "Boost converters are only designed for duty cycles below 50%" }
    ],
    explanation: "At high duty cycles, the switch is ON most of the time, charging the inductor. Energy transfer to output only happens during the brief OFF time, requiring very high peak currents. These spikes cause excessive I²R losses in switches, diodes, and traces. Practical boost converters limit to about 4:1 ratio."
  },
  {
    scenario: "A data center runs thousands of servers. Each server's motherboard has voltage regulator modules (VRMs) converting 12V to 1.0V for the CPU cores, delivering 300A total.",
    question: "Why do server VRMs use multi-phase designs (6-phase, 8-phase, or more)?",
    options: [
      { id: 'a', label: "More phases are needed for better filtering and reduced ripple" },
      { id: 'b', label: "Phases share current, reducing stress and heat on each component", correct: true },
      { id: 'c', label: "Multi-phase is a marketing term with no real technical benefit" },
      { id: 'd', label: "CPUs require exactly 6 or 8 separate voltage inputs" }
    ],
    explanation: "At 300A, a single-phase would need impossibly large MOSFETs and inductors. Multi-phase design splits current across parallel phases, each handling 50A or less. Phase interleaving also reduces input/output ripple, allows smaller capacitors, and provides redundancy if one phase fails."
  },
  {
    scenario: "An MPPT solar charge controller tracks a 250W panel's maximum power point at 32V, but the battery bank is at 28V. A PWM controller would simply connect panel to battery directly.",
    question: "How does an MPPT controller extract more power than a PWM controller in this scenario?",
    options: [
      { id: 'a', label: "MPPT uses higher quality solar cells that generate more power" },
      { id: 'b', label: "MPPT operates the panel at 32V and buck converts to 28V, trading voltage for current", correct: true },
      { id: 'c', label: "MPPT spins the panel to track the sun more accurately" },
      { id: 'd', label: "PWM controllers waste power in resistance, MPPT doesn't" }
    ],
    explanation: "PWM forces the panel to operate at battery voltage (28V), below its optimal 32V MPP. The panel produces less power at this non-optimal voltage. MPPT keeps the panel at 32V where it makes maximum power, then a buck converter efficiently steps down to 28V while stepping up current proportionally."
  },
  {
    scenario: "A camera flash needs 300V to fire the xenon tube, but the batteries only provide 3V. The boost converter must step up 100:1 from two AA batteries.",
    question: "Why do camera flashes typically use specialized flyback topology instead of a simple boost converter for this extreme voltage ratio?",
    options: [
      { id: 'a', label: "Flyback converters are smaller and cheaper than boost converters" },
      { id: 'b', label: "Simple boost would need 99%+ duty cycle; flyback uses transformer turns ratio for most of the step-up", correct: true },
      { id: 'c', label: "AA batteries cannot power standard boost converter circuits" },
      { id: 'd', label: "Flyback topology produces brighter flashes than boost" }
    ],
    explanation: "Boosting 100:1 with a standard boost converter would require D approaching 99%, leaving almost no OFF time to transfer energy. A flyback uses a transformer with 50:1 turns ratio to get most of the step-up magnetically, then only needs a modest duty cycle. This is far more efficient and controllable for extreme ratios."
  },
  {
    scenario: "A buck converter switching at 500 kHz uses a 22 µH inductor. The engineer considers increasing switching frequency to 2 MHz to shrink the inductor size.",
    question: "What trade-off must be considered when increasing switching frequency?",
    options: [
      { id: 'a', label: "Higher frequency requires special inductor core materials" },
      { id: 'b', label: "Switching losses increase proportionally with frequency, potentially negating inductor size benefits", correct: true },
      { id: 'c', label: "Output voltage accuracy decreases at higher frequencies" },
      { id: 'd', label: "EMI compliance becomes easier at higher frequencies" }
    ],
    explanation: "Each switch transition dissipates energy. At 2 MHz, you have 4x the transitions per second as 500 kHz, meaning 4x the switching losses. Modern GaN transistors with faster switching help, but at some frequency the loss increase outweighs the benefit of smaller passives. It's an optimization balance."
  },
  {
    scenario: "A telecom base station runs on 48V DC from batteries. Small DC-DC converters distribute power to various subsystems. One converter shows 89% efficiency on its datasheet.",
    question: "If the converter delivers 100W to its load, how much heat must be dissipated?",
    options: [
      { id: 'a', label: "About 12W - the 11% losses become heat that must be removed", correct: true },
      { id: 'b', label: "About 89W - most of the input power is wasted" },
      { id: 'c', label: "About 100W - all energy eventually becomes heat" },
      { id: 'd', label: "About 5W - modern converters are highly efficient" }
    ],
    explanation: "At 89% efficiency, input power is 100W / 0.89 = 112.4W. The difference (12.4W) is dissipated as heat. This requires proper thermal design - heatsinks, airflow, or thermal interface materials. In a data center with thousands of converters, these losses add up to kilowatts requiring active cooling."
  },
  {
    scenario: "An automotive 48V mild hybrid system needs to power the 12V legacy electrical system. The converter must handle bidirectional power flow - charging the 12V battery from 48V, and boosting 12V to 48V during regenerative braking.",
    question: "What topology enables bidirectional power flow in this application?",
    options: [
      { id: 'a', label: "Two separate converters, one for each direction" },
      { id: 'b', label: "Synchronous buck-boost with MOSFETs replacing diodes for reverse conduction", correct: true },
      { id: 'c', label: "A standard buck converter with a reversing relay" },
      { id: 'd', label: "Only specialized transformer-coupled topologies work bidirectionally" }
    ],
    explanation: "Replacing diodes with actively controlled MOSFETs enables current flow in both directions. In buck mode (48V to 12V), the high-side switch controls duty cycle. In boost mode (12V to 48V), the low-side switch controls duty cycle. The same hardware operates in both modes, controlled by software detecting power flow direction."
  },
  {
    scenario: "A drone's power distribution board receives 22.2V from a 6S LiPo battery but needs stable 5V at 3A for the flight controller. The battery voltage varies from 25.2V (fully charged) to 18V (depleted).",
    question: "Why might a buck-boost topology be necessary instead of just a buck converter?",
    options: [
      { id: 'a', label: "Buck-boost produces cleaner DC with less ripple" },
      { id: 'b', label: "When battery drops below 5V input overhead, a buck alone cannot regulate; buck-boost handles both cases", correct: true },
      { id: 'c', label: "Drones require isolated power supplies for safety" },
      { id: 'd', label: "Buck converters cannot handle the high current draw" }
    ],
    explanation: "A buck converter needs input voltage higher than output plus dropout margin (typically 1-2V minimum). When the LiPo drops below ~6-7V, a pure buck cannot maintain 5V output. A buck-boost topology can step down when input is high AND step up when input drops low, maintaining regulation across the entire battery discharge range."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications with comprehensive info
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '⚡',
    title: 'Electric Vehicle Power Systems',
    short: 'Multi-voltage architecture for next-gen EVs',
    tagline: '800V to 12V: The hidden complexity of EV power',
    description: 'Modern EVs operate multiple voltage domains simultaneously: 800V for the main battery and drivetrain, 48V for high-power auxiliaries like air conditioning compressors, and 12V for legacy systems like lights and infotainment. DC-DC converters bridge these domains, transferring kilowatts of power with minimal loss.',
    connection: 'The buck converter principles you explored scale directly to EV applications. An EV\'s DC-DC converter steps down from 400-800V to 12V - a 30:1 to 66:1 ratio - using the same duty cycle control, just with much higher power semiconductors like silicon carbide MOSFETs rated for 1200V.',
    howItWorks: 'EV DC-DC converters use isolated topologies like phase-shifted full-bridge or LLC resonant converters for safety isolation between high-voltage and low-voltage systems. Soft-switching techniques reduce losses at high frequency. Multiple interleaved phases handle 3-5kW continuous power. Liquid cooling removes heat from power stages.',
    stats: [
      { value: '3.3 kW', label: 'Typical onboard DC-DC power', icon: '⚡' },
      { value: '95%', label: 'Peak efficiency achieved', icon: '📊' },
      { value: '800V', label: 'New EV architecture voltage', icon: '🔋' }
    ],
    examples: ['Tesla Model 3/Y 3kW DC-DC converter', 'Porsche Taycan 800V to 400V adapter', 'Rivian 48V auxiliary system', 'BYD Blade battery management'],
    companies: ['Tesla', 'BorgWarner', 'Vitesco', 'Delphi', 'Bosch'],
    futureImpact: 'Vehicle-to-grid (V2G) will make EV DC-DC converters bidirectional, allowing parked cars to power homes during outages or sell energy back to the grid. 800V+ architectures will push DC-DC efficiency above 97% with silicon carbide and gallium nitride semiconductors.',
    color: '#EF4444'
  },
  {
    icon: '☀️',
    title: 'Solar MPPT Charge Controllers',
    short: 'Extracting maximum power from every sunbeam',
    tagline: 'Smart voltage conversion that tracks the sun',
    description: 'Maximum Power Point Tracking (MPPT) controllers use DC-DC converters to operate solar panels at their optimal voltage regardless of battery state. This seemingly simple task recovers 20-30% more energy compared to basic PWM controllers, making MPPT essential for serious off-grid and grid-tie systems.',
    connection: 'The duty cycle adjustment you practiced is exactly how MPPT works in real-time. The controller continuously measures panel power (V x I), adjusts duty cycle slightly, measures again, and tracks toward maximum power. This "perturb and observe" algorithm runs hundreds of times per second.',
    howItWorks: 'MPPT controllers use buck topology when panel voltage exceeds battery voltage (most common), boost when panel voltage is lower, or buck-boost for flexible systems. Fast digital controllers track MPP in milliseconds, responding to cloud shadows instantly. Advanced algorithms predict optimal points using machine learning.',
    stats: [
      { value: '30%', label: 'More harvest vs PWM', icon: '☀️' },
      { value: '150V', label: 'Typical max panel input', icon: '🔌' },
      { value: '99%', label: 'MPPT tracking accuracy', icon: '🎯' }
    ],
    examples: ['Victron SmartSolar MPPT series', 'MidNite Solar Classic controllers', 'Outback FlexMax 80', 'Morningstar TriStar MPPT'],
    companies: ['Victron Energy', 'Morningstar', 'Outback Power', 'Schneider Electric', 'EPEVER'],
    futureImpact: 'Panel-level power optimizers will put an MPPT converter behind each individual panel, eliminating mismatch losses from partial shading. Combined with AI prediction of cloud movements, solar harvesting will approach theoretical limits.',
    color: '#F59E0B'
  },
  {
    icon: '💻',
    title: 'Processor Voltage Regulation',
    short: 'Powering billions of transistors at sub-1V',
    tagline: 'From 12V to 0.8V at 500 amps',
    description: 'Modern CPUs and GPUs consume 300-600W at voltages below 1V, requiring currents exceeding 500A. Voltage Regulator Modules (VRMs) are sophisticated multi-phase buck converters that sit millimeters from the processor, responding to load changes in microseconds as workloads shift.',
    connection: 'The buck converter formula Vout = D x Vin applies directly. A VRM converting 12V to 0.9V operates at D = 0.075 (7.5% duty cycle). But at 500A, even tiny resistances cause huge losses, so every milliohm matters. This drives the multi-phase designs and exotic materials used.',
    howItWorks: 'Multi-phase VRMs interleave switching times so output ripple cancels. DrMOS packages integrate driver and MOSFETs for minimal inductance. Digital controllers adapt phase count based on load - fewer phases at idle for efficiency, all phases at full load for capacity. Some designs now integrate VRM directly into the CPU package.',
    stats: [
      { value: '500A+', label: 'Peak current delivery', icon: '⚡' },
      { value: '12-16', label: 'Typical VRM phases', icon: '🔢' },
      { value: '<1μs', label: 'Transient response time', icon: '⏱️' }
    ],
    examples: ['Intel Voltage Regulator 13.0 spec', 'AMD Infinity Fabric power delivery', 'NVIDIA H100 power stages', 'Server-grade 1600W supplies'],
    companies: ['Infineon', 'Renesas', 'Texas Instruments', 'MPS', 'ON Semiconductor'],
    futureImpact: 'Integrated voltage regulators (IVR) will move power conversion onto the CPU die itself, using on-chip inductors to deliver power within microns of transistors. This enables per-core voltage domains and dramatic efficiency improvements.',
    color: '#3B82F6'
  },
  {
    icon: '📱',
    title: 'USB Power Delivery',
    short: 'Universal charging from 5W to 240W',
    tagline: 'One cable to power them all',
    description: 'USB Power Delivery (USB-PD) transformed a simple data port into a universal power standard. A single USB-C cable can negotiate anything from 5V/0.5A for earbuds to 48V/5A for gaming laptops. This flexibility requires sophisticated DC-DC conversion on both charger and device sides.',
    connection: 'USB-PD chargers are essentially programmable DC-DC converters. When you plug in your phone, it negotiates 9V for fast charging. Your laptop requests 20V. The charger\'s internal buck or flyback converter adjusts its duty cycle to deliver exactly what each device requests - the same principle we explored.',
    howItWorks: 'A PD charger contains a PFC front-end converting AC to ~400V DC, then a resonant LLC or flyback converter stepping down to the negotiated voltage. The PD controller chip handles the CC-line communication protocol. Secondary-side regulation adjusts output voltage in real-time. GaN switches enable compact, efficient designs.',
    stats: [
      { value: '240W', label: 'Max USB-PD 3.1 power', icon: '⚡' },
      { value: '5-48V', label: 'Voltage range', icon: '🔌' },
      { value: '94%', label: 'GaN charger efficiency', icon: '📊' }
    ],
    examples: ['Apple 140W MacBook charger', 'Anker GaN series', 'Samsung 45W phone charger', 'Framework laptop power adapter'],
    companies: ['Anker', 'Apple', 'Samsung', 'Belkin', 'Navitas'],
    futureImpact: 'USB-PD will extend beyond electronics to power tools, kitchen appliances, and even e-bike charging. 48V capability opens industrial applications. Gallium nitride will shrink chargers to credit-card size while maintaining high power output.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PREDICTION OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const hookPredictions = [
  { id: 'duty_cycle', label: 'The ratio of switch ON time to total cycle time (duty cycle)', correct: true },
  { id: 'resistance', label: 'Resistor ratios, like a voltage divider circuit' },
  { id: 'turns_ratio', label: 'The number of wire turns in the inductor coil' },
  { id: 'capacitor', label: 'The capacitor charge/discharge rate' }
];

const twistPredictions = [
  { id: 'unlimited', label: 'No limit - boost converters can achieve any voltage ratio' },
  { id: 'practical_4x', label: 'About 4-5x - parasitic losses become severe at high duty cycles', correct: true },
  { id: 'double_only', label: 'Double the input voltage maximum' },
  { id: 'same_as_buck', label: 'Same limits as buck converters, just in reverse' }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DCDCConverterRenderer: React.FC<DCDCConverterRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [converterType, setConverterType] = useState<'buck' | 'boost'>('buck');
  const [inputVoltage, setInputVoltage] = useState(24);
  const [dutyCycle, setDutyCycle] = useState(50);
  const [loadCurrent, setLoadCurrent] = useState(2);
  const [switchingFrequency, setSwitchingFrequency] = useState(100); // kHz
  const [inductance, setInductance] = useState(100); // uH
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

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
    if (!isAnimating) return;
    const timer = setInterval(() => {
      setAnimationPhase(f => (f + 3) % 360);
    }, 30);
    return () => clearInterval(timer);
  }, [isAnimating]);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Switch to boost mode for twist phases
  useEffect(() => {
    if (phase === 'twist_predict' || phase === 'twist_play' || phase === 'twist_review') {
      setConverterType('boost');
    }
  }, [phase]);

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const D = dutyCycle / 100;
    const efficiency = 0.90;

    let outputVoltage: number;
    let inputCurrent: number;

    if (converterType === 'buck') {
      outputVoltage = D * inputVoltage;
      inputCurrent = (outputVoltage * loadCurrent) / (inputVoltage * efficiency);
    } else {
      outputVoltage = D >= 0.99 ? inputVoltage * 100 : inputVoltage / (1 - D);
      inputCurrent = (outputVoltage * loadCurrent) / (inputVoltage * efficiency);
    }

    // Ripple current calculation
    const period = 1 / (switchingFrequency * 1000);
    const inductanceH = inductance / 1e6;
    let rippleCurrent: number;

    if (converterType === 'buck') {
      rippleCurrent = (inputVoltage - outputVoltage) * D * period / inductanceH;
    } else {
      rippleCurrent = inputVoltage * D * period / inductanceH;
    }

    const outputPower = outputVoltage * loadCurrent;

    return {
      outputVoltage: Math.max(0, Math.min(outputVoltage, 200)),
      inputCurrent: Math.max(0, inputCurrent),
      outputPower,
      efficiency: efficiency * 100,
      rippleCurrent: Math.abs(rippleCurrent),
    };
  }, [converterType, inputVoltage, dutyCycle, loadCurrent, switchingFrequency, inductance]);

  const output = calculateOutput();

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    input: '#3B82F6',
    output: '#22C55E',
    inductor: '#A855F7',
    switchOn: '#EC4899',
    diode: '#06B6D4',
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
    twist_play: 'Boost Limits',
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
        gameType: 'dc-dc-converter',
        gameTitle: 'DC-DC Converter Physics',
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

  // Test handling
  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = answerId;
    setTestAnswers(newAnswers);
    playSound('click');
    if (onGameEvent) {
      onGameEvent({
        eventType: 'answer_submitted',
        gameType: 'dc-dc-converter',
        gameTitle: 'DC-DC Converter Physics',
        details: { question: currentQuestion, answer: answerId },
        timestamp: Date.now()
      });
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const userAnswer = testAnswers[i];
      const correct = q.options.find(o => o.correct)?.id;
      if (userAnswer === correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 8 ? 'success' : 'failure');
    if (onGameEvent) {
      onGameEvent({
        eventType: score >= 8 ? 'correct_answer' : 'incorrect_answer',
        gameType: 'dc-dc-converter',
        gameTitle: 'DC-DC Converter Physics',
        details: { score, total: 10 },
        timestamp: Date.now()
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION COMPONENT
  // ─────────────────────────────────────────────────────────────────────────────
  const ConverterVisualization = ({ interactive = true }: { interactive?: boolean }) => {
    const width = isMobile ? 360 : 520;
    const height = isMobile ? 340 : 400;
    const D = dutyCycle / 100;
    const switchOn = (animationPhase / 360) < D;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '16px' }}>
          <defs>
            <linearGradient id="dcInputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="dcOutputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="dcInductorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="dcSwitchOnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BE185D" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="dcDiodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <filter id="dcGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="dcCurrentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <pattern id="dcGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#dcGrid)" rx="16" />

          {/* Title */}
          <text x={width / 2} y="30" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? '18' : '22'} fontWeight="700">
            {converterType === 'buck' ? 'Buck Converter' : 'Boost Converter'}
          </text>
          <text x={width / 2} y="50" textAnchor="middle" fill={colors.textMuted} fontSize="12">
            {converterType === 'buck' ? '(Step-Down)' : '(Step-Up)'}
          </text>

          {converterType === 'buck' ? (
            // Buck converter circuit
            <g transform={`translate(${isMobile ? 20 : 40}, 70)`}>
              {/* Input Source */}
              <rect x="0" y="30" width="50" height="80" rx="8" fill="url(#dcInputGrad)" />
              <text x="25" y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">VIN</text>
              <text x="25" y="75" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{inputVoltage}V</text>
              <text x="25" y="100" textAnchor="middle" fill="#93C5FD" fontSize="10">+</text>

              {/* Switch (MOSFET) */}
              <g transform="translate(70, 25)">
                <rect x="0" y="0" width="40" height="30" rx="6"
                  fill={switchOn ? 'url(#dcSwitchOnGrad)' : colors.bgSecondary}
                  stroke={switchOn ? '#F472B6' : colors.border} strokeWidth="2"
                  filter={switchOn ? 'url(#dcGlow)' : undefined} />
                <text x="20" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                  {switchOn ? 'ON' : 'OFF'}
                </text>
              </g>

              {/* Inductor */}
              <g transform="translate(130, 30)">
                <path d="M0,10 Q15,-5 30,10 Q45,25 60,10 Q75,-5 90,10"
                  fill="none" stroke="url(#dcInductorGrad)" strokeWidth="5" strokeLinecap="round" />
                <text x="45" y="35" textAnchor="middle" fill={colors.inductor} fontSize="11">L = {inductance}uH</text>
              </g>

              {/* Diode */}
              <g transform="translate(100, 80)">
                <polygon points="0,0 20,15 0,30"
                  fill={!switchOn ? 'url(#dcDiodeGrad)' : colors.bgSecondary}
                  stroke={!switchOn ? '#22D3EE' : colors.border} strokeWidth="2"
                  filter={!switchOn ? 'url(#dcGlow)' : undefined} />
                <line x1="20" y1="0" x2="20" y2="30" stroke={!switchOn ? '#22D3EE' : colors.border} strokeWidth="3" />
              </g>

              {/* Output Capacitor */}
              <g transform={`translate(${isMobile ? 230 : 270}, 50)`}>
                <rect x="0" y="0" width="12" height="50" rx="3" fill={colors.textMuted} />
                <text x="6" y="-5" textAnchor="middle" fill={colors.textMuted} fontSize="10">C</text>
              </g>

              {/* Output/Load */}
              <rect x={isMobile ? 260 : 300} y="30" width="50" height="80" rx="8" fill="url(#dcOutputGrad)" />
              <text x={isMobile ? 285 : 325} y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">VOUT</text>
              <text x={isMobile ? 285 : 325} y="75" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{output.outputVoltage.toFixed(1)}V</text>
              <text x={isMobile ? 285 : 325} y="100" textAnchor="middle" fill="#86EFAC" fontSize="10">{loadCurrent}A</text>

              {/* Connection lines */}
              <line x1="50" y1="40" x2="70" y2="40" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="110" y1="40" x2="130" y2="40" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="220" y1="40" x2={isMobile ? 260 : 300} y2="40" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="110" y1="55" x2="110" y2="80" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="25" y1="110" x2={isMobile ? 285 : 325} y2="110" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="25" y1="110" x2="25" y2="130" stroke={colors.textMuted} strokeWidth="3" />
              <line x1={isMobile ? 285 : 325} y1="110" x2={isMobile ? 285 : 325} y2="130" stroke={colors.textMuted} strokeWidth="3" />

              {/* Current flow animation */}
              {isAnimating && (
                <g>
                  {switchOn ? (
                    <circle cx={70 + (animationPhase % 180)} cy="40" r="6" fill="url(#dcCurrentGlow)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  ) : (
                    <circle cx={220 - (animationPhase % 120)} cy="95" r="6" fill="url(#dcCurrentGlow)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )}
            </g>
          ) : (
            // Boost converter circuit
            <g transform={`translate(${isMobile ? 20 : 40}, 70)`}>
              {/* Input Source */}
              <rect x="0" y="30" width="50" height="80" rx="8" fill="url(#dcInputGrad)" />
              <text x="25" y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">VIN</text>
              <text x="25" y="75" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{inputVoltage}V</text>

              {/* Inductor (before switch in boost) */}
              <g transform="translate(70, 30)">
                <path d="M0,10 Q15,-5 30,10 Q45,25 60,10 Q75,-5 90,10"
                  fill="none" stroke="url(#dcInductorGrad)" strokeWidth="5" strokeLinecap="round" />
                <text x="45" y="35" textAnchor="middle" fill={colors.inductor} fontSize="11">L = {inductance}uH</text>
              </g>

              {/* Switch to ground */}
              <g transform="translate(155, 75)">
                <rect x="0" y="0" width="40" height="30" rx="6"
                  fill={switchOn ? 'url(#dcSwitchOnGrad)' : colors.bgSecondary}
                  stroke={switchOn ? '#F472B6' : colors.border} strokeWidth="2"
                  filter={switchOn ? 'url(#dcGlow)' : undefined} />
                <text x="20" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                  {switchOn ? 'ON' : 'OFF'}
                </text>
              </g>

              {/* Diode */}
              <g transform="translate(180, 30)">
                <polygon points="0,15 20,0 20,30"
                  fill={!switchOn ? 'url(#dcDiodeGrad)' : colors.bgSecondary}
                  stroke={!switchOn ? '#22D3EE' : colors.border} strokeWidth="2"
                  filter={!switchOn ? 'url(#dcGlow)' : undefined} />
                <line x1="0" y1="0" x2="0" y2="30" stroke={!switchOn ? '#22D3EE' : colors.border} strokeWidth="3" />
              </g>

              {/* Output Capacitor */}
              <g transform={`translate(${isMobile ? 220 : 250}, 50)`}>
                <rect x="0" y="0" width="12" height="50" rx="3" fill={colors.textMuted} />
              </g>

              {/* Output/Load */}
              <rect x={isMobile ? 250 : 290} y="30" width="50" height="80" rx="8" fill="url(#dcOutputGrad)" />
              <text x={isMobile ? 275 : 315} y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">VOUT</text>
              <text x={isMobile ? 275 : 315} y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">{output.outputVoltage.toFixed(1)}V</text>
              <text x={isMobile ? 275 : 315} y="100" textAnchor="middle" fill="#86EFAC" fontSize="10">{loadCurrent}A</text>

              {/* Connection lines */}
              <line x1="50" y1="40" x2="70" y2="40" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="160" y1="40" x2="180" y2="45" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="175" y1="75" x2="175" y2="55" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="200" y1="45" x2={isMobile ? 250 : 290} y2="45" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="175" y1="105" x2="175" y2="120" stroke={colors.textMuted} strokeWidth="3" />
              <line x1="25" y1="110" x2={isMobile ? 275 : 315} y2="110" stroke={colors.textMuted} strokeWidth="3" />

              {/* Current flow animation */}
              {isAnimating && (
                <g>
                  {switchOn ? (
                    <circle cx={70 + (animationPhase % 100)} cy="40" r="6" fill="url(#dcCurrentGlow)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  ) : (
                    <circle cx={170 + (animationPhase % 80)} cy="45" r="6" fill="url(#dcCurrentGlow)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )}
            </g>
          )}

          {/* PWM Waveform */}
          <g transform={`translate(${isMobile ? 20 : 40}, ${height - 90})`}>
            <rect x="0" y="0" width={isMobile ? 140 : 180} height="50" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
            <text x="10" y="15" fill={colors.textSecondary} fontSize="10">PWM Signal</text>
            {[0, 1, 2].map(i => {
              const pulseWidth = (isMobile ? 35 : 50) * D;
              const x = 10 + i * (isMobile ? 40 : 55);
              return (
                <g key={i}>
                  <line x1={x} y1="40" x2={x} y2="25" stroke={colors.switchOn} strokeWidth="2" />
                  <line x1={x} y1="25" x2={x + pulseWidth} y2="25" stroke={colors.switchOn} strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="25" x2={x + pulseWidth} y2="40" stroke={colors.switchOn} strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="40" x2={x + (isMobile ? 35 : 50)} y2="40" stroke={colors.textMuted} strokeWidth="2" />
                </g>
              );
            })}
          </g>

          {/* Stats Panel */}
          <g transform={`translate(${isMobile ? 180 : 240}, ${height - 90})`}>
            <rect x="0" y="0" width={isMobile ? 160 : 200} height="50" rx="8" fill={colors.bgSecondary} stroke={colors.accent} />
            <text x={isMobile ? 80 : 100} y="15" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">Efficiency: {output.efficiency.toFixed(0)}%</text>
            <text x={isMobile ? 40 : 50} y="38" textAnchor="middle" fill={colors.success} fontSize="10">{output.outputPower.toFixed(1)}W out</text>
            <text x={isMobile ? 120 : 150} y="38" textAnchor="middle" fill={colors.warning} fontSize="10">{(output.rippleCurrent * 1000).toFixed(0)}mA ripple</text>
          </g>

          {/* Formula */}
          <text x={width / 2} y={height - 20} textAnchor="middle" fill={colors.inductor} fontSize={isMobile ? '12' : '14'} fontWeight="600">
            {converterType === 'buck'
              ? `Vout = D x Vin = ${D.toFixed(2)} x ${inputVoltage}V = ${output.outputVoltage.toFixed(1)}V`
              : `Vout = Vin/(1-D) = ${inputVoltage}V/(1-${D.toFixed(2)}) = ${output.outputVoltage.toFixed(1)}V`
            }
          </text>
        </svg>

        {/* Controls */}
        {interactive && (
          <div style={{ width: '100%', maxWidth: width, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Duty Cycle Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Duty Cycle</span>
                <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 600 }}>{dutyCycle}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={dutyCycle}
                onChange={(e) => setDutyCycle(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
            </div>

            {/* Input Voltage Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Input Voltage</span>
                <span style={{ color: colors.input, fontSize: '14px', fontWeight: 600 }}>{inputVoltage}V</span>
              </div>
              <input
                type="range"
                min="5"
                max="48"
                value={inputVoltage}
                onChange={(e) => setInputVoltage(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
            </div>

            {/* Load Current Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Load Current</span>
                <span style={{ color: colors.output, fontSize: '14px', fontWeight: 600 }}>{loadCurrent.toFixed(1)}A</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={loadCurrent}
                onChange={(e) => setLoadCurrent(parseFloat(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAnimating ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {isAnimating ? 'Stop' : 'Start'} Animation
              </button>
              <button
                onClick={() => setConverterType(converterType === 'buck' ? 'boost' : 'buck')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.inductor,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Switch to {converterType === 'buck' ? 'Boost' : 'Buck'}
              </button>
              <button
                onClick={() => { setDutyCycle(50); setInputVoltage(24); setLoadCurrent(2); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `2px solid ${colors.accent}`,
                  background: 'transparent',
                  color: colors.accent,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR
  // ─────────────────────────────────────────────────────────────────────────────
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '16px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        overflowX: 'auto',
      }}>
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button
              onClick={() => index <= currentIndex && goToPhase(p)}
              disabled={index > currentIndex}
              style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                borderRadius: '50%',
                border: 'none',
                background: index === currentIndex
                  ? colors.accent
                  : index < currentIndex
                    ? colors.success
                    : colors.bgCard,
                color: index <= currentIndex ? 'white' : colors.textMuted,
                fontSize: '12px',
                fontWeight: 600,
                cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title={phaseLabels[p]}
            >
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{
                width: isMobile ? '12px' : '24px',
                height: '3px',
                background: index < currentIndex ? colors.success : colors.bgCard,
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    let canProceed = true;
    let nextLabel = 'Continue';

    switch (phase) {
      case 'hook':
        nextLabel = 'Make a Prediction';
        break;
      case 'predict':
        canProceed = !!prediction;
        nextLabel = 'Test Your Prediction';
        break;
      case 'play':
        nextLabel = 'See the Explanation';
        break;
      case 'review':
        nextLabel = 'A New Challenge';
        break;
      case 'twist_predict':
        canProceed = !!twistPrediction;
        nextLabel = 'Explore Boost Limits';
        break;
      case 'twist_play':
        nextLabel = 'Deep Understanding';
        break;
      case 'twist_review':
        nextLabel = 'Real World Applications';
        break;
      case 'transfer':
        canProceed = completedApps.every(c => c);
        nextLabel = 'Take the Test';
        break;
      case 'test':
        if (!testSubmitted) {
          canProceed = !testAnswers.includes(null);
          nextLabel = 'Submit Test';
        } else {
          canProceed = testScore >= 8;
          nextLabel = testScore >= 8 ? 'Complete Mastery' : 'Review & Retry';
        }
        break;
      case 'mastery':
        nextLabel = 'Finished!';
        canProceed = false;
        break;
    }

    const handleNext = () => {
      if (phase === 'test' && !testSubmitted) {
        submitTest();
      } else if (phase === 'test' && testSubmitted && testScore < 8) {
        setTestSubmitted(false);
        setTestAnswers(Array(10).fill(null));
        setCurrentQuestion(0);
      } else {
        nextPhase();
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 100,
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${isFirst ? colors.border : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 600,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed || isLast}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed && !isLast ? colors.accent : colors.bgCard,
            color: canProceed && !isLast ? 'white' : colors.textMuted,
            fontWeight: 600,
            cursor: canProceed && !isLast ? 'pointer' : 'not-allowed',
            flex: 1,
            maxWidth: '280px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT RENDERING
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPhaseContent = () => {
    switch (phase) {
      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 1: HOOK
      // ─────────────────────────────────────────────────────────────────────────
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '8px' }}>
              DC-DC Converters
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              How do electronics transform voltage efficiently?
            </p>

            <ConverterVisualization interactive={true} />

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginTop: '24px',
              textAlign: 'left',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>
                Your phone charger takes 120V AC from the wall, rectifies it to DC, then a
                <strong style={{ color: colors.inductor }}> DC-DC converter</strong> steps it down to
                exactly 5V for your phone or up to 20V for fast charging. Solar systems use the same
                principle to match panel voltage to battery voltage.
              </p>
              <div style={{
                background: `${colors.accent}22`,
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `4px solid ${colors.accent}`,
              }}>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                  <strong>The Big Question:</strong> Unlike resistive voltage dividers that waste
                  energy as heat, DC-DC converters achieve 90%+ efficiency. How do they transform
                  voltage so efficiently?
                </p>
              </div>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 2: PREDICT
      // ─────────────────────────────────────────────────────────────────────────
      case 'predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Make Your Prediction
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              What determines the output voltage of a DC-DC converter?
            </p>

            <ConverterVisualization interactive={false} />

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginTop: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                You see a switch rapidly turning ON and OFF, an inductor storing energy, and a
                diode providing a current path. What controls the output voltage ratio?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {hookPredictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPrediction(p.id); playSound('click'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: prediction === p.id
                        ? `2px solid ${colors.accent}`
                        : `1px solid ${colors.border}`,
                      background: prediction === p.id ? `${colors.accent}22` : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      ...typo.body,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 3: PLAY
      // ─────────────────────────────────────────────────────────────────────────
      case 'play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Experiment with the Converter
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust the duty cycle and watch how output voltage changes
            </p>

            <ConverterVisualization interactive={true} />

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginTop: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Experiments to Try:
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Sweep duty cycle from 5% to 95% and watch Vout follow the formula</li>
                <li>Switch between Buck and Boost modes to see different behaviors</li>
                <li>In Boost mode, what happens as duty cycle approaches 95%?</li>
                <li>Notice: Output power is always less than input power (energy conservation)</li>
              </ul>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 4: REVIEW
      // ─────────────────────────────────────────────────────────────────────────
      case 'review':
        const wasCorrect = prediction === 'duty_cycle';
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                The <strong style={{ color: colors.accent }}>duty cycle</strong> (the ratio of switch ON time
                to total cycle time) directly controls the output voltage. This principle is called
                <strong> Pulse Width Modulation (PWM)</strong>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                How DC-DC Converters Work
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.inductor }}>The Inductor is Key:</strong> Inductors resist
                  changes in current. When the switch is ON, current builds up in the inductor, storing
                  energy in its magnetic field. When OFF, the inductor maintains current flow through
                  the diode, releasing stored energy to the output.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.input }}>Buck (Step-Down):</strong> Vout = D x Vin. The
                  switch chops the input voltage, and the LC filter averages it. 50% duty cycle gives
                  half the input voltage.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.output }}>Boost (Step-Up):</strong> Vout = Vin / (1-D).
                  When the switch is ON, the inductor charges from input. When OFF, inductor voltage
                  ADDS to input voltage, boosting the output higher than the input.
                </p>
                <p>
                  <strong style={{ color: colors.success }}>Efficiency Secret:</strong> Unlike resistors
                  that dissipate excess voltage as heat, inductors store and release energy. The only
                  losses come from resistance in wires and switching transitions, achieving 85-95% efficiency!
                </p>
              </div>
            </div>

            <ConverterVisualization interactive={true} />
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 5: TWIST PREDICT
      // ─────────────────────────────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, textAlign: 'center', marginBottom: '8px' }}>
              The Twist: Boost Converter Limits
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              The formula says Vout approaches infinity as D approaches 100%. But does it really?
            </p>

            <ConverterVisualization interactive={false} />

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginTop: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                The boost formula Vout = Vin/(1-D) suggests that at 99% duty cycle, you'd get 100x
                voltage multiplication. At 99.9%, you'd get 1000x. What limits real boost converters?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {twistPredictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setTwistPrediction(p.id); playSound('click'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: twistPrediction === p.id
                        ? `2px solid ${colors.warning}`
                        : `1px solid ${colors.border}`,
                      background: twistPrediction === p.id ? `${colors.warning}22` : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      ...typo.body,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 6: TWIST PLAY
      // ─────────────────────────────────────────────────────────────────────────
      case 'twist_play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, textAlign: 'center', marginBottom: '8px' }}>
              Explore Boost Converter Limits
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Push the duty cycle high and observe what happens to efficiency
            </p>

            <ConverterVisualization interactive={true} />

            <div style={{
              background: `${colors.warning}22`,
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${colors.warning}`,
              marginTop: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Observations:
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>At 80% duty cycle, theoretical boost is 5x. In practice, losses mount rapidly.</li>
                <li>At 90% duty cycle, the switch has only 10% of the time to transfer energy to output.</li>
                <li>Peak currents become extreme, causing I squared R losses in every component.</li>
                <li>Practical boost ratios max out around 4-5x before efficiency becomes unacceptable.</li>
              </ul>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 7: TWIST REVIEW
      // ─────────────────────────────────────────────────────────────────────────
      case 'twist_review':
        const twistCorrect = twistPrediction === 'practical_4x';
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              background: twistCorrect ? `${colors.success}22` : `${colors.error}22`,
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistCorrect ? colors.success : colors.error}`,
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: twistCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                Real boost converters are practically limited to about <strong>4-5x voltage gain</strong>.
                Beyond this, efficiency drops dramatically due to parasitic losses, and the duty cycle
                approaching 100% leaves almost no time for energy transfer to the output.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
                Practical Limitations Explained
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.error }}>Parasitic Resistance:</strong> Every component
                  has resistance - MOSFETs, inductors, PCB traces, diodes. At high boost ratios, input
                  current is high (power conservation), making I squared R losses significant.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.switchOn }}>Switching Losses:</strong> Each time the
                  MOSFET turns ON or OFF, energy is lost during the transition. Higher currents mean
                  more energy lost per transition. The diode's forward voltage drop also wastes energy.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.diode }}>Duty Cycle Limit:</strong> At 95% duty cycle,
                  the switch is only OFF for 5% of the cycle. All the energy transfer to output happens
                  in this tiny window, requiring enormous peak currents.
                </p>
                <p>
                  <strong style={{ color: colors.success }}>Solutions:</strong> For higher voltage ratios,
                  engineers use cascaded converters, transformer-based topologies (flyback, forward),
                  or charge pump circuits that trade complexity for better high-ratio performance.
                </p>
              </div>
            </div>

            <ConverterVisualization interactive={true} />
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 8: TRANSFER - Real World Applications
      // ─────────────────────────────────────────────────────────────────────────
      case 'transfer':
        const app = realWorldApps[selectedApp];
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              DC-DC converters power the modern world
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Explore all 4 applications to unlock the test
            </p>

            {/* Application Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedApp(i)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedApp === i ? a.color : colors.bgCard,
                    color: selectedApp === i ? 'white' : colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: completedApps[i] ? 1 : 0.7,
                  }}
                >
                  <span>{a.icon}</span>
                  <span style={{ fontSize: '13px' }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success }}>Done</span>}
                </button>
              ))}
            </div>

            {/* Selected Application Content */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              overflow: 'hidden',
              border: `1px solid ${app.color}33`,
            }}>
              {/* Header */}
              <div style={{
                background: `${app.color}22`,
                padding: '20px',
                borderBottom: `1px solid ${app.color}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                  {app.description}
                </p>

                {/* Connection to lesson */}
                <div style={{
                  background: `${colors.accent}15`,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.accent}`,
                  marginBottom: '20px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                    Connection to What You Learned:
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {app.connection}
                  </p>
                </div>

                {/* How it works */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '20px' }}>
                  {app.howItWorks}
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      background: colors.bgSecondary,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      flex: '1',
                      minWidth: '100px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Examples */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  Real Examples:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      background: colors.bgSecondary,
                      padding: '6px 12px',
                      borderRadius: '16px',
                      ...typo.small,
                      color: colors.textSecondary,
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>

                {/* Companies */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  Key Players:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {app.companies.map((co, i) => (
                    <span key={i} style={{
                      background: `${app.color}22`,
                      padding: '6px 12px',
                      borderRadius: '16px',
                      ...typo.small,
                      color: app.color,
                    }}>
                      {co}
                    </span>
                  ))}
                </div>

                {/* Future Impact */}
                <div style={{
                  background: `${colors.success}15`,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.success}`,
                }}>
                  <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                    Future Impact:
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {app.futureImpact}
                  </p>
                </div>

                {/* Mark Complete Button */}
                {!completedApps[selectedApp] && (
                  <button
                    onClick={() => {
                      const newCompleted = [...completedApps];
                      newCompleted[selectedApp] = true;
                      setCompletedApps(newCompleted);
                      playSound('success');
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      marginTop: '20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: app.color,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      ...typo.body,
                    }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              ...typo.small,
              color: completedApps.every(c => c) ? colors.success : colors.textMuted,
            }}>
              {completedApps.filter(c => c).length} of 4 applications completed
              {completedApps.every(c => c) && ' - Ready for the test!'}
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 9: TEST
      // ─────────────────────────────────────────────────────────────────────────
      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '24px' }}>
              <div style={{
                background: testScore >= 8 ? `${colors.success}22` : `${colors.error}22`,
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {testScore >= 8 ? '🎉' : '📚'}
                </div>
                <h2 style={{ ...typo.h2, color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent Work!' : 'Keep Learning!'}
                </h2>
                <p style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
                  {testScore} / 10
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  {testScore >= 8
                    ? 'You have mastered DC-DC converter physics!'
                    : 'Review the explanations below and try again.'}
                </p>
              </div>

              {/* Show all questions with answers */}
              {testQuestions.map((q, i) => {
                const userAnswer = testAnswers[i];
                const correctAnswer = q.options.find(o => o.correct)?.id;
                const isCorrect = userAnswer === correctAnswer;

                return (
                  <div key={i} style={{
                    background: colors.bgCard,
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isCorrect ? colors.success : colors.error,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error }}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontStyle: 'italic' }}>
                      {q.scenario}
                    </p>

                    <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '12px' }}>
                      {q.question}
                    </p>

                    {q.options.map((opt) => (
                      <div key={opt.id} style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        background: opt.correct
                          ? `${colors.success}22`
                          : userAnswer === opt.id
                            ? `${colors.error}22`
                            : 'transparent',
                        border: `1px solid ${
                          opt.correct
                            ? colors.success
                            : userAnswer === opt.id
                              ? colors.error
                              : colors.border
                        }`,
                      }}>
                        <span style={{
                          ...typo.small,
                          color: opt.correct ? colors.success : userAnswer === opt.id ? colors.error : colors.textSecondary
                        }}>
                          {opt.correct && 'Correct: '}{userAnswer === opt.id && !opt.correct && 'Your answer: '}{opt.label}
                        </span>
                      </div>
                    ))}

                    <div style={{
                      background: `${colors.accent}15`,
                      padding: '12px',
                      borderRadius: '8px',
                      marginTop: '12px',
                    }}>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        <strong style={{ color: colors.accent }}>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        const currentQ = testQuestions[currentQuestion];
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: 0 }}>
                Knowledge Test
              </h2>
              <span style={{ ...typo.body, color: colors.textSecondary }}>
                {currentQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i]
                      ? colors.accent
                      : i === currentQuestion
                        ? colors.textMuted
                        : colors.bgCard,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgSecondary,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `4px solid ${colors.warning}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentQuestion] === opt.id
                      ? `2px solid ${colors.accent}`
                      : `1px solid ${colors.border}`,
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...typo.body,
                  }}
                >
                  <span style={{
                    fontWeight: 600,
                    color: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.textMuted,
                    marginRight: '12px',
                  }}>
                    {opt.id.toUpperCase()}.
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${currentQuestion === 0 ? colors.border : colors.textMuted}`,
                  background: 'transparent',
                  color: currentQuestion === 0 ? colors.textMuted : colors.textPrimary,
                  fontWeight: 600,
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              {currentQuestion < testQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={testAnswers.includes(null)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: testAnswers.includes(null) ? colors.bgCard : colors.success,
                    color: testAnswers.includes(null) ? colors.textMuted : 'white',
                    fontWeight: 600,
                    cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                    flex: 1,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────────────────
      // PHASE 10: MASTERY
      // ─────────────────────────────────────────────────────────────────────────
      case 'mastery':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
              Mastery Achieved!
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              You have mastered DC-DC converter physics
            </p>

            <div style={{
              background: colors.bgCard,
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Key Concepts Mastered:
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
                <li><strong style={{ color: colors.input }}>Buck converter:</strong> Vout = D x Vin (step-down)</li>
                <li><strong style={{ color: colors.output }}>Boost converter:</strong> Vout = Vin / (1-D) (step-up)</li>
                <li><strong style={{ color: colors.inductor }}>Inductor role:</strong> Energy storage and transfer each cycle</li>
                <li><strong style={{ color: colors.accent }}>Duty cycle control:</strong> PWM determines output voltage</li>
                <li><strong style={{ color: colors.success }}>High efficiency:</strong> 90%+ through energy storage vs. dissipation</li>
                <li><strong style={{ color: colors.warning }}>Boost limits:</strong> Practical 4-5x maximum ratio</li>
              </ul>
            </div>

            <div style={{
              background: `${colors.accent}22`,
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Beyond the Basics:
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Advanced topologies include <strong>buck-boost</strong> (bidirectional), <strong>SEPIC</strong> and
                <strong> Cuk</strong> (non-inverting buck-boost), <strong>flyback</strong> (isolated step-up/down),
                and <strong>full-bridge</strong> converters for high power. Synchronous rectification replaces
                diodes with MOSFETs for higher efficiency. Digital control enables adaptive algorithms for
                maximum efficiency across varying loads. Silicon carbide and gallium nitride semiconductors
                are pushing boundaries in voltage, frequency, and efficiency.
              </p>
            </div>

            <ConverterVisualization interactive={true} />

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: colors.bgCard,
              borderRadius: '12px',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                Game completed! You can continue experimenting with the converter above,
                or return to explore more physics games.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomNav()}
    </div>
  );
};

export default DCDCConverterRenderer;
