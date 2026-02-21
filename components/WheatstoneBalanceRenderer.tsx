'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Wheatstone Bridge Balance - Complete 10-Phase Learning Game (#271)
// Precision resistance measurement via the diamond bridge configuration
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

interface WheatstoneBalanceRendererProps {
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
    scenario: "A materials scientist needs to measure the resistance of a new semiconductor sample. The sample resistance is approximately 4700 ohms, but she needs accuracy to within 1 ohm. Her multimeter is only accurate to 10 ohms.",
    question: "How could a Wheatstone bridge help her achieve the required accuracy?",
    options: [
      { id: 'a', label: "The bridge amplifies the resistance value making it easier to read" },
      { id: 'b', label: "By adjusting a precision variable resistor until the galvanometer reads zero, the unknown resistance equals R2 x R3 / R1 with no current-dependent errors", correct: true },
      { id: 'c', label: "The bridge uses higher voltage to force more current through the sample" },
      { id: 'd', label: "Wheatstone bridges are only useful for low resistances under 100 ohms" }
    ],
    explanation: "At balance, zero current flows through the galvanometer, eliminating errors from lead resistance, contact resistance, and meter loading. The unknown resistance is determined purely by the ratio R2 x R3 / R1, so precision depends only on the known resistors, not on the meter's accuracy."
  },
  {
    scenario: "An engineer is calibrating a strain gauge on a steel beam. The gauge has a nominal resistance of 350 ohms and a gauge factor of 2.0. Under load, the beam strain is 500 microstrain.",
    question: "What resistance change does the strain gauge produce, and why is a Wheatstone bridge necessary?",
    options: [
      { id: 'a', label: "The change is 0.35 ohms (0.1%); a bridge converts this tiny change to a measurable voltage", correct: true },
      { id: 'b', label: "The change is 35 ohms; a standard multimeter would work fine" },
      { id: 'c', label: "The change is 3.5 ohms; the bridge is needed only to save power" },
      { id: 'd', label: "Strain gauges produce voltage directly without needing a bridge" }
    ],
    explanation: "Delta_R/R = GF x strain = 2.0 x 500e-6 = 0.001 (0.1%). For a 350 ohm gauge, that is only 0.35 ohms. A standard multimeter cannot resolve this, but a Wheatstone bridge converts this tiny resistance change into a proportional voltage that can be amplified and measured with high precision."
  },
  {
    scenario: "A bridge circuit has R1 = 100 ohms, R2 = 200 ohms, R3 = 150 ohms, and R4 is unknown. The galvanometer shows zero deflection.",
    question: "What is the value of R4?",
    options: [
      { id: 'a', label: "75 ohms" },
      { id: 'b', label: "150 ohms" },
      { id: 'c', label: "300 ohms", correct: true },
      { id: 'd', label: "100 ohms" }
    ],
    explanation: "At balance: R1/R2 = R3/R4, so R4 = R2 x R3 / R1 = 200 x 150 / 100 = 300 ohms. The balance condition is independent of the supply voltage, which is one of the bridge's key advantages."
  },
  {
    scenario: "A biomedical engineer designs a patient temperature monitor using a thermistor (resistance varies with temperature) in a Wheatstone bridge. The thermistor is at R4 position.",
    question: "Why place the thermistor in only one arm rather than replacing all four resistors with thermistors?",
    options: [
      { id: 'a', label: "Four thermistors would be too expensive" },
      { id: 'b', label: "Using one sensing element with three fixed resistors gives a clear, calibrated output proportional to the temperature change from a known baseline", correct: true },
      { id: 'c', label: "Multiple thermistors would cancel each other's effects" },
      { id: 'd', label: "Only R4 position works for sensing applications" }
    ],
    explanation: "With one thermistor, the bridge output voltage is directly proportional to the resistance change from the balanced state. The fixed resistors establish a precise reference point (e.g., body temperature baseline). Any deviation from balance indicates temperature change, giving a clean, amplifiable signal."
  },
  {
    scenario: "A structural engineer monitors a bridge (the physical kind) using 100 strain gauges in Wheatstone bridge configurations. During a routine check, one bridge shows a persistent 2mV offset from zero despite no load on the structure.",
    question: "What is the most likely cause and what should the engineer do?",
    options: [
      { id: 'a', label: "The supply voltage has drifted; recalibrate the power supply" },
      { id: 'b', label: "A resistor has drifted due to temperature or aging; the bridge needs rebalancing or the offset should be nulled electronically", correct: true },
      { id: 'c', label: "The structure has permanent deformation at that sensor location" },
      { id: 'd', label: "The galvanometer needs replacement" }
    ],
    explanation: "Component drift from temperature changes, aging, or moisture is the most common cause of zero offset. Modern instrumentation amplifiers include offset-null adjustments for exactly this reason. While structural damage is possible, it would typically show progressive change, not a sudden fixed offset."
  },
  {
    scenario: "A process engineer increases the supply voltage to a Wheatstone bridge from 5V to 10V, hoping to get a stronger output signal from a pressure sensor.",
    question: "What are the trade-offs of doubling the supply voltage?",
    options: [
      { id: 'a', label: "Output sensitivity doubles, but self-heating of the sensor quadruples, potentially causing measurement errors", correct: true },
      { id: 'b', label: "There are no trade-offs; higher voltage always means better measurements" },
      { id: 'c', label: "The balance condition changes, requiring recalibration of all resistors" },
      { id: 'd', label: "The galvanometer will be damaged by the higher voltage" }
    ],
    explanation: "Output voltage is proportional to supply voltage, so sensitivity doubles. However, power dissipation (P = V^2/R) quadruples, causing self-heating in the sensing element. For strain gauges, self-heating can cause thermal drift exceeding the mechanical signal. Typical bridges use 2-10V excitation as a compromise."
  },
  {
    scenario: "An aerospace company uses a full-bridge configuration (4 active strain gauges) instead of a quarter-bridge (1 active gauge + 3 fixed resistors) for measuring wing bending.",
    question: "What advantage does the full-bridge provide?",
    options: [
      { id: 'a', label: "It uses less power since current is shared among four gauges" },
      { id: 'b', label: "Four active gauges give 4x sensitivity and automatic temperature compensation when configured correctly", correct: true },
      { id: 'c', label: "It eliminates the need for a power supply" },
      { id: 'd', label: "Full bridges can only be used in aerospace applications" }
    ],
    explanation: "In a full-bridge, opposite arms are in tension and compression. R1 and R3 increase while R2 and R4 decrease (or vice versa), giving 4x the output of a single gauge. Temperature changes affect all four gauges equally, canceling out. This is why aerospace and automotive strain measurement almost always uses full or half-bridge configurations."
  },
  {
    scenario: "A quality control technician measures a 1000-ohm precision resistor using a Wheatstone bridge with R1 = R2 = 1000 ohms. She adjusts R3 until balance and reads R3 = 1002.3 ohms.",
    question: "The resistor under test has what value, and what is the percentage deviation from nominal?",
    options: [
      { id: 'a', label: "1002.3 ohms, deviating 0.23% from the 1000-ohm nominal value", correct: true },
      { id: 'b', label: "997.7 ohms, deviating 0.23% below nominal" },
      { id: 'c', label: "1000 ohms; the 2.3-ohm difference is measurement error" },
      { id: 'd', label: "Cannot determine without knowing the supply voltage" }
    ],
    explanation: "At balance: R4 = R2 x R3 / R1 = 1000 x 1002.3 / 1000 = 1002.3 ohms. The deviation is (1002.3 - 1000) / 1000 x 100% = 0.23%. This level of precision (better than 0.01 ohm in a 1000-ohm measurement) is why Wheatstone bridges are the gold standard for resistance measurement."
  },
  {
    scenario: "A geotechnical engineer installs a piezoresistive pressure sensor in a borehole 200 meters deep. The sensor uses a Wheatstone bridge with long lead wires to the surface instrumentation.",
    question: "Why does the Wheatstone bridge configuration help with long lead wire runs?",
    options: [
      { id: 'a', label: "The bridge eliminates the effect of lead wire resistance because at balance, no current flows through the measurement path", correct: true },
      { id: 'b', label: "Long wires have lower resistance than short wires" },
      { id: 'c', label: "The bridge amplifies the signal to overcome wire losses" },
      { id: 'd', label: "Lead wire resistance does not affect any measurement technique" }
    ],
    explanation: "At balance, the galvanometer draws zero current, so lead wire resistance causes zero voltage drop in the measurement circuit. Even a few ohms of wire resistance (common in 200m runs) would cause significant errors in a direct measurement, but the null-balance technique of the Wheatstone bridge eliminates this error entirely."
  },
  {
    scenario: "A semiconductor fabrication facility uses automated Wheatstone bridges to test thousands of chip interconnects per hour. Each test takes 50 milliseconds.",
    question: "Why is the Wheatstone bridge preferred over a simple ohmmeter for this production testing?",
    options: [
      { id: 'a', label: "Bridges are faster because they use AC excitation" },
      { id: 'b', label: "The null-balance method eliminates systematic errors from contact resistance, lead resistance, and meter calibration drift, enabling consistent sub-milliohm accuracy across thousands of measurements", correct: true },
      { id: 'c', label: "Ohmmeters cannot measure resistances below 1 ohm" },
      { id: 'd', label: "The bridge is cheaper to manufacture than an ohmmeter" }
    ],
    explanation: "In production testing, consistency matters as much as accuracy. The Wheatstone bridge's null method is immune to power supply drift, contact resistance variation, and meter calibration changes. With auto-balancing circuits, modern bridges achieve 0.001% accuracy in milliseconds, making them ideal for high-volume precision testing."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏗',
    title: 'Structural Health Monitoring',
    short: 'Detecting stress in bridges and buildings',
    tagline: 'Measuring invisible deformation before failure',
    description: 'Thousands of strain gauges in Wheatstone bridge configurations monitor the structural health of bridges, skyscrapers, and dams worldwide. These bridges detect micro-deformations invisible to the naked eye, providing early warning of structural fatigue.',
    connection: 'The Wheatstone bridge converts the tiny resistance changes of strain gauges (often less than 0.1%) into measurable voltages. Without the bridge circuit, these changes would be undetectable against noise and lead resistance.',
    howItWorks: 'Strain gauges bonded to structural members change resistance proportionally to deformation. Wheatstone bridges amplify these sub-ohm changes into millivolt signals. Data acquisition systems log readings 24/7, alerting engineers to anomalous strain patterns that may indicate fatigue cracking or foundation settling.',
    stats: [
      { value: '0.001%', label: 'Strain resolution', icon: '🎯' },
      { value: '50+ yr', label: 'Monitoring lifespan', icon: '📅' },
      { value: '$8B', label: 'SHM market size', icon: '📈' }
    ],
    examples: [
      'Golden Gate Bridge has 200+ strain gauge bridges monitoring wind and seismic response',
      'Burj Khalifa foundation monitoring with temperature-compensated full bridges',
      'Nuclear reactor vessel strain monitoring for fatigue life prediction',
      'Wind turbine blade root strain measurement for load validation'
    ],
    companies: ['Hottinger Bruel & Kjaer', 'National Instruments', 'Vishay Micro-Measurements', 'Kyowa'],
    futureImpact: 'Wireless strain gauge bridges with energy harvesting will enable permanent installation without wiring. AI analysis of bridge output patterns will predict failures months before visible damage appears.',
    color: '#3B82F6'
  },
  {
    icon: '⚖',
    title: 'Precision Weighing Systems',
    short: 'From kitchen scales to truck weigh stations',
    tagline: 'Every digital scale uses a Wheatstone bridge inside',
    description: 'Load cells - the force transducers in every digital scale - are Wheatstone bridges with strain gauges bonded to a deformable element. From milligram laboratory balances to 100-ton truck scales, the operating principle is identical.',
    connection: 'Applied force deforms the load cell element, straining the gauges and unbalancing the bridge. The output voltage is directly proportional to the applied weight, providing a linear, temperature-compensated measurement.',
    howItWorks: 'A load cell typically uses a full Wheatstone bridge (4 active gauges) arranged so two are in tension and two in compression. This quadruples sensitivity and cancels temperature drift. The bridge output (typically 2 mV/V at full scale) feeds a precision ADC for digital display.',
    stats: [
      { value: '0.01%', label: 'Accuracy (legal-for-trade)', icon: '⚖' },
      { value: '2 mV/V', label: 'Typical sensitivity', icon: '📊' },
      { value: '$5B', label: 'Load cell market', icon: '💰' }
    ],
    examples: [
      'Grocery checkout scales achieving 1-gram accuracy using shear-beam load cells',
      'Truck weigh stations measuring 80,000 lbs to within 20 lbs',
      'Pharmaceutical filling machines dosing milligram quantities',
      'Aerospace force measurement in wind tunnel testing'
    ],
    companies: ['Mettler Toledo', 'Sartorius', 'Flintec', 'Zemic'],
    futureImpact: 'MEMS-based micro load cells with integrated Wheatstone bridges will enable force sensing in wearable devices and robotic fingertips with sub-millinewton resolution.',
    color: '#F59E0B'
  },
  {
    icon: '🌡',
    title: 'Temperature Sensing and Control',
    short: 'Industrial process temperature measurement',
    tagline: 'RTDs in bridges: the backbone of process control',
    description: 'Resistance Temperature Detectors (RTDs) in Wheatstone bridge configurations are the gold standard for industrial temperature measurement. Platinum RTDs in bridges achieve accuracy better than 0.01 degrees Celsius, critical for semiconductor manufacturing, pharmaceutical processing, and metrology.',
    connection: 'An RTD changes resistance linearly with temperature. Placing it in a Wheatstone bridge converts this resistance change to a voltage, eliminating lead wire errors through 3-wire or 4-wire bridge configurations.',
    howItWorks: 'A Pt100 RTD (100 ohms at 0C) changes by 0.385 ohms per degree C. In a 3-wire bridge, two lead wires are in opposite arms, canceling their resistance. The bridge output feeds a precision amplifier and ADC. Auto-zero techniques null offset drift for long-term stability.',
    stats: [
      { value: '0.01C', label: 'Best accuracy', icon: '🌡' },
      { value: '0.385', label: 'Ohms per degree C (Pt100)', icon: '📐' },
      { value: '-200 to 850C', label: 'Range', icon: '🔥' }
    ],
    examples: [
      'Semiconductor clean room temperature control to 0.1C for photolithography',
      'Pharmaceutical autoclave validation requiring traceable temperature records',
      'Food processing HACCP compliance temperature monitoring',
      'Cryogenic research temperature measurement down to 4 Kelvin'
    ],
    companies: ['Honeywell', 'Omega Engineering', 'Endress+Hauser', 'Fluke'],
    futureImpact: 'Quantum-limited bridge readout circuits will push temperature resolution below 0.001C, enabling new frontiers in materials science and quantum computing thermal management.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Gas and Chemical Detection',
    short: 'Detecting hazardous substances at parts-per-million',
    tagline: 'When the bridge unbalances, sound the alarm',
    description: 'Catalytic bead gas detectors, pellistors, and chemiresistive sensors use Wheatstone bridges to detect combustible gases, toxic vapors, and chemical agents. The bridge converts tiny resistance changes from gas exposure into alarm-triggering signals.',
    connection: 'A gas-sensitive element in one arm of the bridge changes resistance upon exposure to target gases. The bridge amplifies this change relative to a sealed reference element in the opposite arm, providing automatic compensation for temperature and humidity.',
    howItWorks: 'In a catalytic bead detector, one bead is coated with a catalyst that causes combustible gas to oxidize on its surface, raising its temperature and resistance. The uncoated reference bead in the opposite arm experiences the same ambient conditions but no catalytic heating. The resulting bridge imbalance is proportional to gas concentration.',
    stats: [
      { value: '1 ppm', label: 'Detection limit', icon: '🔍' },
      { value: '<10s', label: 'Response time', icon: '⏱' },
      { value: '$4B', label: 'Gas detection market', icon: '📈' }
    ],
    examples: [
      'Coal mine methane detection using pellistor bridges for explosion prevention',
      'Semiconductor fab toxic gas monitoring for worker safety',
      'Automotive exhaust gas sensors for emissions control',
      'Military chemical warfare agent detection in field conditions'
    ],
    companies: ['Honeywell Analytics', 'Draeger', 'MSA Safety', 'RAE Systems'],
    futureImpact: 'Nanomaterial-based chemiresistors in MEMS Wheatstone bridges will create smartphone-sized multi-gas detectors capable of identifying dozens of substances simultaneously at parts-per-billion levels.',
    color: '#8B5CF6'
  }
];

// Phase types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const WheatstoneBalanceRenderer: React.FC<WheatstoneBalanceRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  const { isMobile } = useViewport();

  // Color system
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
    bridge: '#3b82f6',
    galvanometer: '#a855f7',
    resistor: '#f59e0b',
    wire: '#94a3b8',
  };

  // Responsive typography
  const typo = {
    title: isMobile ? '24px' : '32px',
    heading: isMobile ? '18px' : '22px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
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
        gameType: 'wheatstone-bridge-balance',
        gameTitle: 'Wheatstone Bridge Balance',
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
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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

  // Bridge simulation state
  const [r1, setR1] = useState(100);   // ohms
  const [r2, setR2] = useState(200);   // ohms
  const [r3, setR3] = useState(150);   // adjustable
  const [r4Unknown, setR4Unknown] = useState(300); // the "unknown"
  const [supplyVoltage, setSupplyVoltage] = useState(10); // V
  const [galvSensitivity, setGalvSensitivity] = useState(50); // uA/div

  // Twist: strain gauge mode
  const [strainMicrostrain, setStrainMicrostrain] = useState(0); // microstrain
  const [gaugeFactor, setGaugeFactor] = useState(2.0);
  const [gaugeNominal] = useState(350); // ohms

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [expandedApp, setExpandedApp] = useState<number | null>(0);

  // Animation
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 200);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────

  const calculateBridge = useCallback((rA: number, rB: number, rC: number, rD: number, vSupply: number) => {
    // Wheatstone bridge: R1 top-left, R2 top-right, R3 bottom-left, R4 bottom-right
    // V_bridge = Vs * (R3/(R1+R3) - R4/(R2+R4))
    const vA = vSupply * rC / (rA + rC); // voltage at node between R1 and R3
    const vB = vSupply * rD / (rB + rD); // voltage at node between R2 and R4
    const vBridge = vA - vB;

    // Galvanometer current (assuming galvanometer resistance ~50 ohms)
    const rGalv = 50;
    // Thevenin equivalent: Vth = vBridge, Rth = (R1||R3) + (R2||R4)
    const rTh = (rA * rC) / (rA + rC) + (rB * rD) / (rB + rD);
    const iGalv = vBridge / (rTh + rGalv);

    // Total current from supply
    const rLeft = rA + rC;
    const rRight = rB + rD;
    const rTotal = (rLeft * rRight) / (rLeft + rRight);
    const iTotal = vSupply / rTotal;

    // Balance condition check
    const ratioLeft = rA / rB;
    const ratioRight = rC / rD;
    const isBalanced = Math.abs(vBridge) < 0.001;

    return { vA, vB, vBridge, iGalv, iTotal, rTh, ratioLeft, ratioRight, isBalanced };
  }, []);

  // Standard bridge values
  const bridgeValues = calculateBridge(r1, r2, r3, r4Unknown, supplyVoltage);

  // Strain gauge bridge (twist mode)
  const calculateStrainBridge = useCallback(() => {
    const deltaR = gaugeNominal * gaugeFactor * (strainMicrostrain / 1e6);
    const rGauge = gaugeNominal + deltaR;
    // Quarter bridge: R1=R2=R3=nominal, R4=gauge
    const vals = calculateBridge(gaugeNominal, gaugeNominal, gaugeNominal, rGauge, supplyVoltage);
    return { ...vals, deltaR, rGauge };
  }, [gaugeNominal, gaugeFactor, strainMicrostrain, supplyVoltage, calculateBridge]);

  const strainValues = calculateStrainBridge();

  // Predictions
  const predictions = [
    { id: 'always_current', label: 'Current always flows through the galvanometer regardless of resistor values' },
    { id: 'ratio_balance', label: 'When R1/R2 equals R3/R4, no current flows through the galvanometer', correct: true },
    { id: 'equal_resistors', label: 'All four resistors must be equal for the bridge to balance' },
    { id: 'voltage_dependent', label: 'Balance depends on the supply voltage level' },
  ];

  const twistPredictions = [
    { id: 'no_change', label: 'Strain is too small to affect the bridge - the output stays at zero' },
    { id: 'detectable', label: 'Even microstrain (millionths) produces a measurable bridge voltage because the bridge amplifies tiny ratio changes', correct: true },
    { id: 'only_large', label: 'Only large strains above 1% can be detected by a bridge' },
    { id: 'temperature', label: 'Temperature effects dominate and mask any strain signal' },
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

  // ─────────────────────────────────────────────────────────────────────────
  // SVG BRIDGE VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderBridgeCircuit = (rA: number, rB: number, rC: number, rD: number, vSupply: number, showLabels: boolean = true) => {
    const width = isMobile ? 360 : 520;
    const height = isMobile ? 320 : 400;
    const cx = width / 2;
    const cy = height / 2;
    const dx = isMobile ? 100 : 150; // horizontal spread
    const dy = isMobile ? 90 : 120;  // vertical spread

    const vals = calculateBridge(rA, rB, rC, rD, vSupply);
    const galvDeflection = Math.max(-1, Math.min(1, vals.iGalv * 1000 * (galvSensitivity / 50)));
    const needleAngle = galvDeflection * 45; // max 45 degrees deflection

    // Node positions: diamond configuration
    const topNode = { x: cx, y: cy - dy };     // top (supply +)
    const bottomNode = { x: cx, y: cy + dy };  // bottom (supply -)
    const leftNode = { x: cx - dx, y: cy };    // left (between R1 and R3)
    const rightNode = { x: cx + dx, y: cy };   // right (between R2 and R4)

    // Current flow animation positions along paths
    const flowSpeed = Math.min(Math.abs(vals.iTotal) * 50, 100);
    const flowOffset = (animationOffset * flowSpeed / 100) % 100;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ borderRadius: '12px', maxWidth: isMobile ? '360px' : '520px' }} role="img" aria-label="Wheatstone Bridge circuit visualization">
        <defs>
          <linearGradient id="bridgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <filter id="glowBridge" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="nodeGlowB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wireGradB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#bridgeBg)" />

        {/* Interactive point for test detection */}
        <circle cx={cx} cy={cy} r={6} fill={colors.accent} stroke="#fff" strokeWidth={1.5} filter="url(#glowBridge)">
          <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Diamond wires - R1 (top-left), R2 (top-right), R3 (bottom-left), R4 (bottom-right) */}
        {/* R1: top to left */}
        <line x1={topNode.x} y1={topNode.y} x2={leftNode.x} y2={leftNode.y} stroke="url(#wireGradB)" strokeWidth="2.5" />
        {/* R2: top to right */}
        <line x1={topNode.x} y1={topNode.y} x2={rightNode.x} y2={rightNode.y} stroke="url(#wireGradB)" strokeWidth="2.5" />
        {/* R3: left to bottom */}
        <line x1={leftNode.x} y1={leftNode.y} x2={bottomNode.x} y2={bottomNode.y} stroke="url(#wireGradB)" strokeWidth="2.5" />
        {/* R4: right to bottom */}
        <line x1={rightNode.x} y1={rightNode.y} x2={bottomNode.x} y2={bottomNode.y} stroke="url(#wireGradB)" strokeWidth="2.5" />

        {/* Galvanometer wire (horizontal, through center) */}
        <line x1={leftNode.x} y1={leftNode.y} x2={rightNode.x} y2={rightNode.y} stroke={colors.galvanometer} strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6" />

        {/* Resistor boxes */}
        {/* R1 - top-left arm */}
        {(() => {
          const mx = (topNode.x + leftNode.x) / 2;
          const my = (topNode.y + leftNode.y) / 2;
          return (
            <g>
              <rect x={mx - 24} y={my - 12} width="48" height="24" rx="4" fill="#1e3a5f" stroke={colors.bridge} strokeWidth="1.5" />
              <text x={mx} y={my + 4} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">R1</text>
              {showLabels && <text x={mx - 28} y={my - 16} fill={colors.bridge} fontSize={isMobile ? '9' : '10'}>{rA}&#8486;</text>}
            </g>
          );
        })()}

        {/* R2 - top-right arm */}
        {(() => {
          const mx = (topNode.x + rightNode.x) / 2;
          const my = (topNode.y + rightNode.y) / 2;
          return (
            <g>
              <rect x={mx - 24} y={my - 12} width="48" height="24" rx="4" fill="#1e3a5f" stroke={colors.bridge} strokeWidth="1.5" />
              <text x={mx} y={my + 4} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">R2</text>
              {showLabels && <text x={mx + 28} y={my - 16} fill={colors.bridge} fontSize={isMobile ? '9' : '10'}>{rB}&#8486;</text>}
            </g>
          );
        })()}

        {/* R3 - bottom-left arm */}
        {(() => {
          const mx = (leftNode.x + bottomNode.x) / 2;
          const my = (leftNode.y + bottomNode.y) / 2;
          return (
            <g>
              <rect x={mx - 24} y={my - 12} width="48" height="24" rx="4" fill="#3d2a0f" stroke={colors.resistor} strokeWidth="1.5" />
              <text x={mx} y={my + 4} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">R3</text>
              {showLabels && <text x={mx - 28} y={my + 22} fill={colors.resistor} fontSize={isMobile ? '9' : '10'}>{rC}&#8486;</text>}
            </g>
          );
        })()}

        {/* R4 - bottom-right arm (unknown) */}
        {(() => {
          const mx = (rightNode.x + bottomNode.x) / 2;
          const my = (rightNode.y + bottomNode.y) / 2;
          return (
            <g>
              <rect x={mx - 24} y={my - 12} width="48" height="24" rx="4" fill="#3d2a0f" stroke={colors.resistor} strokeWidth="1.5" />
              <text x={mx} y={my + 4} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">R4</text>
              {showLabels && <text x={mx + 28} y={my + 22} fill={colors.resistor} fontSize={isMobile ? '9' : '10'}>{rD.toFixed(1)}&#8486;</text>}
            </g>
          );
        })()}

        {/* Galvanometer circle in center */}
        <circle cx={cx} cy={cy} r={isMobile ? 22 : 28} fill="#1a1a2e" stroke={colors.galvanometer} strokeWidth="2" />
        <text x={cx} y={cy - (isMobile ? 28 : 34)} textAnchor="middle" fill={colors.galvanometer} fontSize="10" fontWeight="600">Galvanometer</text>

        {/* Galvanometer needle */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + Math.sin(needleAngle * Math.PI / 180) * (isMobile ? 16 : 20)}
          y2={cy - Math.cos(needleAngle * Math.PI / 180) * (isMobile ? 16 : 20)}
          stroke={Math.abs(needleAngle) < 2 ? colors.success : colors.error}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="3" fill={Math.abs(needleAngle) < 2 ? colors.success : colors.error} />

        {/* Scale marks on galvanometer */}
        {[-40, -20, 0, 20, 40].map((angle) => (
          <line
            key={angle}
            x1={cx + Math.sin(angle * Math.PI / 180) * (isMobile ? 17 : 22)}
            y1={cy - Math.cos(angle * Math.PI / 180) * (isMobile ? 17 : 22)}
            x2={cx + Math.sin(angle * Math.PI / 180) * (isMobile ? 20 : 26)}
            y2={cy - Math.cos(angle * Math.PI / 180) * (isMobile ? 20 : 26)}
            stroke={angle === 0 ? colors.success : colors.textMuted}
            strokeWidth={angle === 0 ? 1.5 : 0.8}
          />
        ))}

        {/* Supply voltage at top */}
        <circle cx={topNode.x} cy={topNode.y} r="8" fill="url(#nodeGlowB)" />
        <circle cx={topNode.x} cy={topNode.y} r="5" fill={colors.accent} />
        <text x={topNode.x} y={topNode.y - 14} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="700">+{vSupply}V</text>

        {/* Ground at bottom */}
        <circle cx={bottomNode.x} cy={bottomNode.y} r="8" fill="url(#nodeGlowB)" />
        <circle cx={bottomNode.x} cy={bottomNode.y} r="5" fill={colors.textMuted} />
        <text x={bottomNode.x} y={bottomNode.y + 20} textAnchor="middle" fill={colors.textMuted} fontSize="11">GND</text>

        {/* Junction nodes */}
        <circle cx={leftNode.x} cy={leftNode.y} r="5" fill={colors.success} stroke="#4ade80" strokeWidth="1" />
        <text x={leftNode.x - 14} y={leftNode.y + 4} textAnchor="end" fill="#4ade80" fontSize="10" fontWeight="600">A</text>
        <circle cx={rightNode.x} cy={rightNode.y} r="5" fill={colors.success} stroke="#4ade80" strokeWidth="1" />
        <text x={rightNode.x + 14} y={rightNode.y + 4} textAnchor="start" fill="#4ade80" fontSize="10" fontWeight="600">B</text>

        {/* Current flow animation dots */}
        {flowSpeed > 0 && (
          <g opacity="0.7">
            {/* Left arm current */}
            <circle
              cx={topNode.x + (leftNode.x - topNode.x) * ((flowOffset % 100) / 100)}
              cy={topNode.y + (leftNode.y - topNode.y) * ((flowOffset % 100) / 100)}
              r="3" fill="#fbbf24"
            />
            {/* Right arm current */}
            <circle
              cx={topNode.x + (rightNode.x - topNode.x) * (((flowOffset + 50) % 100) / 100)}
              cy={topNode.y + (rightNode.y - topNode.y) * (((flowOffset + 50) % 100) / 100)}
              r="3" fill="#fbbf24"
            />
          </g>
        )}

        {/* Voltage readings */}
        {showLabels && (
          <g>
            <rect x={5} y={height - (isMobile ? 72 : 80)} width={isMobile ? 160 : 200} height={isMobile ? 66 : 74} rx="6" fill="rgba(0,0,0,0.6)" stroke={colors.accent} strokeWidth="0.5" />
            <text x={12} y={height - (isMobile ? 58 : 62)} fill={colors.accent} fontSize="10" fontWeight="600">Bridge Readings</text>
            <text x={12} y={height - (isMobile ? 44 : 46)} fill={colors.textSecondary} fontSize={isMobile ? '9' : '10'}>
              V_A = {vals.vA.toFixed(3)}V &nbsp; V_B = {vals.vB.toFixed(3)}V
            </text>
            <text x={12} y={height - (isMobile ? 30 : 30)} fill={Math.abs(vals.vBridge) < 0.001 ? colors.success : colors.error} fontSize={isMobile ? '10' : '11'} fontWeight="700">
              V_bridge = {(vals.vBridge * 1000).toFixed(2)} mV
            </text>
            <text x={12} y={height - (isMobile ? 16 : 14)} fill={colors.textMuted} fontSize={isMobile ? '9' : '10'}>
              I_galv = {(vals.iGalv * 1e6).toFixed(1)} uA
            </text>
          </g>
        )}

        {/* Balance indicator */}
        {showLabels && (
          <g>
            <rect x={width - (isMobile ? 155 : 195)} y={height - (isMobile ? 56 : 60)} width={isMobile ? 148 : 188} height={isMobile ? 50 : 54} rx="6"
              fill={vals.isBalanced ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}
              stroke={vals.isBalanced ? colors.success : colors.error} strokeWidth="0.8" />
            <text x={width - (isMobile ? 81 : 101)} y={height - (isMobile ? 36 : 38)} textAnchor="middle"
              fill={vals.isBalanced ? colors.success : colors.error} fontSize="11" fontWeight="700">
              {vals.isBalanced ? 'BALANCED' : 'UNBALANCED'}
            </text>
            <text x={width - (isMobile ? 81 : 101)} y={height - (isMobile ? 20 : 20)} textAnchor="middle"
              fill={colors.textMuted} fontSize={isMobile ? '8' : '9'}>
              R1/R2 = {vals.ratioLeft.toFixed(3)} | R3/R4 = {vals.ratioRight.toFixed(3)}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────────────────────────────────

  const renderPlayControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>R3 (adjustable): {r3} &#8486;</label>
        <input type="range" min="10" max="500" step="1" value={r3}
          onChange={(e) => { setR3(parseInt(e.target.value)); emitGameEvent('slider_changed', { slider: 'r3', value: parseInt(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.resistor, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>10&#8486;</span><span>500&#8486;</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Supply Voltage: {supplyVoltage}V</label>
        <input type="range" min="1" max="24" step="0.5" value={supplyVoltage}
          onChange={(e) => { setSupplyVoltage(parseFloat(e.target.value)); emitGameEvent('slider_changed', { slider: 'voltage', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.accent, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>1V</span><span>24V</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Galvanometer Sensitivity: {galvSensitivity} uA/div</label>
        <input type="range" min="1" max="200" step="1" value={galvSensitivity}
          onChange={(e) => setGalvSensitivity(parseInt(e.target.value))}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.galvanometer, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>High (1 uA/div)</span><span>Low (200 uA/div)</span>
        </div>
      </div>

      {/* Balance helper */}
      <div style={{ background: bridgeValues.isBalanced ? 'rgba(16,185,129,0.15)' : 'rgba(168,85,247,0.15)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${bridgeValues.isBalanced ? colors.success : colors.galvanometer}` }}>
        <div style={{ color: bridgeValues.isBalanced ? colors.success : colors.textPrimary, fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
          {bridgeValues.isBalanced ? 'Bridge Balanced!' : 'Adjusting...'}
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 1.5 }}>
          {bridgeValues.isBalanced
            ? `R4 = R2 x R3 / R1 = ${r2} x ${r3} / ${r1} = ${(r2 * r3 / r1).toFixed(1)} ohms`
            : `Target R3 for balance: ${(r1 * r4Unknown / r2).toFixed(0)} ohms. V_bridge = ${(bridgeValues.vBridge * 1000).toFixed(2)} mV`
          }
        </div>
      </div>

      {/* Fixed values reference */}
      <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ color: colors.bridge, fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Fixed Values</div>
        <div style={{ color: colors.textSecondary, fontSize: '10px', lineHeight: 1.6 }}>
          R1 = {r1} &#8486; &nbsp;|&nbsp; R2 = {r2} &#8486; &nbsp;|&nbsp; R4 (unknown) = ? &#8486;
        </div>
      </div>
    </div>
  );

  const renderStrainControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Strain: {strainMicrostrain} microstrain</label>
        <input type="range" min="-2000" max="2000" step="10" value={strainMicrostrain}
          onChange={(e) => { setStrainMicrostrain(parseInt(e.target.value)); emitGameEvent('slider_changed', { slider: 'strain', value: parseInt(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.warning, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>-2000 (compress)</span><span>+2000 (tension)</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Gauge Factor: {gaugeFactor.toFixed(1)}</label>
        <input type="range" min="1.0" max="4.0" step="0.1" value={gaugeFactor}
          onChange={(e) => setGaugeFactor(parseFloat(e.target.value))}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.resistor, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>1.0 (low)</span><span>4.0 (semiconductor)</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Supply Voltage: {supplyVoltage}V</label>
        <input type="range" min="1" max="24" step="0.5" value={supplyVoltage}
          onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.accent, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>1V</span><span>24V</span>
        </div>
      </div>

      {/* Strain gauge readings */}
      <div style={{ background: 'rgba(245,158,11,0.15)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.warning}` }}>
        <div style={{ color: colors.warning, fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Strain Gauge Readings</div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 1.7 }}>
          <div>Nominal R: {gaugeNominal} &#8486;</div>
          <div>Delta R: {strainValues.deltaR.toFixed(4)} &#8486; ({(strainValues.deltaR / gaugeNominal * 100).toFixed(4)}%)</div>
          <div>Gauge R: {strainValues.rGauge.toFixed(4)} &#8486;</div>
          <div style={{ color: Math.abs(strainValues.vBridge) < 0.001 ? colors.success : colors.accent, fontWeight: 'bold' }}>
            V_out: {(strainValues.vBridge * 1000).toFixed(3)} mV
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // NAV DOTS
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM BAR
  // ─────────────────────────────────────────────────────────────────────────

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

      case 'transfer': return (
        <TransferPhaseView
          conceptName="Wheatstone Bridge Balance"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
        />
      );
      case 'test': canProceed = testSubmitted && testScore >= 8; nextLabel = testSubmitted ? (testScore >= 8 ? 'Continue to Mastery' : 'Review & Retry') : 'Submit Test'; break;
      case 'mastery': nextLabel = 'Complete Game'; break;
    }

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '12px', zIndex: 1000 }}>
        <button onClick={goBack} disabled={isFirst} style={{
          padding: '10px 20px', borderRadius: '8px', border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
          background: 'transparent', color: isFirst ? colors.textMuted : colors.textPrimary, fontWeight: 'bold', cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isFirst ? 0.5 : 1, minHeight: '44px', transition: 'all 0.2s ease'
        }}>Back</button>
        <button onClick={() => {
          if (phase === 'mastery') {
            emitGameEvent('game_completed', { finalEvent: 'mastery_achieved', score: testScore, total: 10 });
            window.location.href = '/games';
          } else if (phase === 'test' && !testSubmitted) {
            submitTest();
          } else {
            goNext();
          }
        }} disabled={!canProceed && phase !== 'test'} style={{
          padding: '10px 28px', borderRadius: '8px', border: 'none',
          background: (canProceed || (phase === 'test' && !testSubmitted)) ? colors.accent : 'rgba(255,255,255,0.1)',
          color: (canProceed || (phase === 'test' && !testSubmitted)) ? 'white' : colors.textMuted, fontWeight: 'bold',
          cursor: (canProceed || (phase === 'test' && !testSubmitted)) ? 'pointer' : 'not-allowed', fontSize: '13px', flex: 1, maxWidth: '280px', minHeight: '44px', transition: 'all 0.2s ease'
        }}>{nextLabel}</button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ─────────────────────────────────────────────────────────────────────────

  const renderPhaseContent = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────────────────────
      // HOOK PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'hook':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>Wheatstone Bridge Balance</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 400, marginBottom: '20px' }}>
                The precision measurement technique behind every strain gauge and load cell
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '20px' }}>
              <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, margin: 0 }}>
                  <strong>How do you measure a resistance change of 0.001 ohms?</strong> Your multimeter cannot resolve that.
                  Yet strain gauges on aircraft wings, load cells in your bathroom scale, and temperature sensors in industrial processes
                  all rely on detecting changes far smaller than this. The secret is a 180-year-old circuit that converts ratio to zero.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderBridgeCircuit(r1, r2, r3, r4Unknown, supplyVoltage)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 400, lineHeight: 1.6 }}>
                  The <strong style={{ color: colors.accent }}>Wheatstone bridge</strong> arranges four resistors in a diamond pattern
                  with a sensitive galvanometer across the middle. When the ratio of resistors on each side matches, the bridge is <em>balanced</em>
                  and zero current flows through the meter. Any tiny change in one resistor breaks the balance, producing a measurable signal.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400, marginTop: '12px' }}>
                  This null-balance principle makes measurements immune to supply voltage fluctuations, lead wire resistance, and
                  meter calibration errors. It is why the Wheatstone bridge remains the gold standard for precision resistance measurement.
                </p>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.galvanometer}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.small, margin: 0 }}>
                  <strong>Look at the galvanometer:</strong> Notice the needle deflection. When the bridge is balanced, it points straight up. Can you guess what ratio of resistors makes that happen?
                </p>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────
      // PREDICT PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '8px' }}>Make Your Prediction</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What condition makes the galvanometer read zero?</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderBridgeCircuit(100, 200, 180, 300, 10, false)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>Understanding the Setup</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  Four resistors form a diamond. Voltage is applied across the top and bottom.
                  A sensitive <strong style={{ color: colors.galvanometer }}>galvanometer</strong> connects the left and right nodes.
                  Current flows through both paths. When is the galvanometer reading exactly <strong>zero</strong>?
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Step 1 of 2: Make your prediction</p>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '12px' }}>
                Under what condition will the galvanometer show zero current?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((p) => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.small, minHeight: '44px'
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────
      // PLAY PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'play':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Balance the Bridge</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Adjust R3 until the galvanometer reads zero to find R4</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.bridge}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Your mission:</strong> R4 is unknown. Adjust R3 until the galvanometer needle points straight up (zero current). At balance, R4 = R2 x R3 / R1. Try changing the supply voltage - notice balance does not depend on it!
                </p>
              </div>
            </div>

            {/* Side-by-side layout: SVG left, controls right */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              padding: `0 ${typo.pagePadding}`,
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                {renderBridgeCircuit(r1, r2, r3, r4Unknown, supplyVoltage)}
              </div>
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                {renderPlayControls()}
              </div>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
                  <li>Adjust R3 slowly until the galvanometer reads zero - note the R3 value</li>
                  <li>Calculate R4 = R2 x R3 / R1 and verify it matches</li>
                  <li>Change the supply voltage - does the balance point change?</li>
                  <li>Increase galvanometer sensitivity - how precisely can you detect imbalance?</li>
                </ul>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────
      // REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'review': {
        const wasCorrect = prediction === 'ratio_balance';
        return (
          <>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {wasCorrect ? 'Your prediction was correct!' : 'Not quite - but now you know!'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                {wasCorrect ? 'Exactly right! ' : 'As you discovered, '}the bridge balances when <strong>R1/R2 = R3/R4</strong>.
                At this point, both sides of the galvanometer are at the same voltage, so zero current flows through it.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: typo.heading }}>The Balance Equation</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Balance Condition:</strong><br/>
                    R1 / R2 = R3 / R4 &nbsp;&nbsp;equivalently:&nbsp;&nbsp; R4 = R2 x R3 / R1<br/>
                    When this ratio holds, the voltage at node A equals the voltage at node B.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Why It Works - Voltage Dividers:</strong><br/>
                    The left arm (R1 + R3) forms one voltage divider: V_A = Vs x R3/(R1+R3).<br/>
                    The right arm (R2 + R4) forms another: V_B = Vs x R4/(R2+R4).<br/>
                    When R1/R2 = R3/R4, both dividers produce the same voltage. V_A - V_B = 0.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Key Insight - Supply Independence:</strong><br/>
                    The balance condition involves only <em>ratios</em> of resistances. The supply voltage Vs cancels out!
                    This means balance is independent of power supply fluctuations - a major practical advantage.
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Sensitivity Near Balance:</strong><br/>
                    Near balance, the output voltage is approximately: V_out = Vs x (Delta_R / 4R) for small changes.
                    Higher supply voltage means more sensitivity, but also more self-heating of the sensor.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderBridgeCircuit(100, 200, 150, 300, 10)}
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Why this matters:</strong> This null-balance method eliminates systematic errors. At balance, zero current means zero effect from lead wires, contact resistance, or galvanometer calibration. You are comparing ratios, not measuring absolute values.
                </p>
              </div>
            </div>
          </>
        );
      }

      // ───────────────────────────────────────────────────────────────────
      // TWIST PREDICT PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>The Strain Gauge Twist</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What happens when one resistor changes by just 0.001 ohms?</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderBridgeCircuit(gaugeNominal, gaugeNominal, gaugeNominal, strainValues.rGauge, supplyVoltage)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>The Scenario:</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  A strain gauge is a thin wire pattern bonded to a structure. When the structure bends, the wire stretches,
                  changing its resistance by tiny amounts. A 350-ohm gauge under 1000 microstrain changes by only 0.7 ohms (0.2%).
                  We replace R4 with this strain gauge. The other three resistors are fixed at 350 ohms.
                  Can the bridge detect this microscopic change?
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Step 1 of 2: Make your prediction</p>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '12px' }}>
                Can a Wheatstone bridge detect microstrain-level resistance changes?
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

      // ───────────────────────────────────────────────────────────────────
      // TWIST PLAY PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'twist_play':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>Strain Gauge in a Wheatstone Bridge</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>See how microscopic resistance changes become measurable voltages</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.warning}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> Adjust the strain slider and watch how even tiny mechanical deformation produces a clear voltage output. The bridge converts a 0.1% resistance change into millivolts!
                </p>
              </div>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              padding: `0 ${typo.pagePadding}`,
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                {renderBridgeCircuit(gaugeNominal, gaugeNominal, gaugeNominal, strainValues.rGauge, supplyVoltage)}
              </div>
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                {renderStrainControls()}
              </div>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
                  <li>Set strain to <strong>100 microstrain</strong> - note the bridge output voltage</li>
                  <li>Double the strain to <strong>200 microstrain</strong> - does the output double?</li>
                  <li>Increase gauge factor to <strong>4.0</strong> (semiconductor gauge) - see sensitivity jump</li>
                  <li>Increase supply voltage - output scales linearly, but more self-heating in practice</li>
                  <li>Try <strong>negative strain</strong> (compression) - notice the output polarity reverses</li>
                </ul>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────
      // TWIST REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'twist_review': {
        const twistWasCorrect = twistPrediction === 'detectable';
        return (
          <>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {twistWasCorrect ? 'Exactly right!' : 'The answer may surprise you!'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                <strong>Even microstrain produces measurable voltage!</strong> A 350-ohm gauge at 1000 microstrain with GF=2.0 changes
                by only 0.7 ohms, but the bridge converts this into {(supplyVoltage * 2.0 * 1000e-6 / 4 * 1000).toFixed(2)} mV -
                easily amplified and digitized by modern instrumentation.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.warning, marginBottom: '14px', fontSize: typo.heading }}>Why Strain Gauges Need Bridges</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The Math - Quarter Bridge Output:</strong><br/>
                    V_out approximately equals Vs x GF x strain / 4<br/>
                    For Vs=10V, GF=2.0, strain=1000ue: V_out = 10 x 2.0 x 0.001 / 4 = 5 mV<br/>
                    This is tiny but perfectly measurable with a good instrumentation amplifier.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Sensitivity vs Direct Measurement:</strong><br/>
                    The resistance change is 0.7 ohms out of 350 ohms (0.2%). A standard multimeter with 0.1% accuracy
                    could not even detect this change! But the bridge converts it to a clean voltage signal.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Temperature Compensation:</strong><br/>
                    A dummy gauge in the adjacent arm (half-bridge) experiences the same temperature but no strain.
                    Temperature-induced resistance changes cancel, leaving only the mechanical strain signal.
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Full Bridge Advantage:</strong><br/>
                    Using 4 active gauges (two in tension, two in compression) gives 4x output and complete
                    temperature compensation. This is standard practice in aerospace and structural monitoring.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      }

      // ───────────────────────────────────────────────────────────────────
      // TRANSFER PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'transfer':
        return (
          <div style={{ padding: typo.pagePadding }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '8px' }}>
              Wheatstone bridges are embedded in billions of sensors worldwide
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
                  <span style={{ color: colors.textSecondary, fontSize: '18px' }}>{expandedApp === index ? '-' : '+'}</span>
                </button>

                {expandedApp === index && (
                  <div style={{ padding: '0 14px 14px 14px' }}>
                    <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6, marginBottom: '12px' }}>{app.description}</p>

                    <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${app.color}` }}>
                      <h4 style={{ color: app.color, fontSize: typo.small, marginBottom: '6px' }}>Connection to Wheatstone Bridge</h4>
                      <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5 }}>{app.connection}</p>
                    </div>

                    <h4 style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '8px' }}>How It Works</h4>
                    <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.5, marginBottom: '12px' }}>{app.howItWorks}</p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {app.stats.map((stat: { icon: string; value: string; label: string }, i: number) => (
                        <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', flex: '1 1 80px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                          <div style={{ color: app.color, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                          <div style={{ color: colors.textSecondary, fontSize: '9px' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <h4 style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '6px' }}>Real Examples</h4>
                    <ul style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.6, paddingLeft: '16px', margin: '0 0 12px 0' }}>
                      {app.examples.map((ex: string, i: number) => <li key={i}>{ex}</li>)}
                    </ul>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {app.companies.map((co: string, i: number) => (
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

      // ───────────────────────────────────────────────────────────────────
      // TEST PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'test':
        if (testSubmitted) {
          const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'D';
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
                <p style={{ color: colors.textSecondary, fontSize: typo.body, marginTop: '4px' }}>Grade: {grade}</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
                  {testScore >= 8 ? 'You have mastered the Wheatstone bridge!' : 'Review the material and try again. You need 8/10 to pass.'}
                </p>
                {testScore < 8 && (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }} style={{
                    marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                  }}>Try Again</button>
                )}
              </div>

              {/* Answer key with red/green/amber coloring */}
              <h3 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOption = q.options.find(o => o.correct);
                const isCorrect = userAnswer === correctOption?.id;
                const wasSkipped = userAnswer === null;
                const borderColor = isCorrect ? colors.success : wasSkipped ? colors.warning : colors.error;
                const bgColor = isCorrect ? 'rgba(16,185,129,0.1)' : wasSkipped ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                return (
                  <div key={qIndex} style={{ background: bgColor, marginBottom: '12px', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${borderColor}` }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Question {qIndex + 1} - {isCorrect ? 'Correct' : wasSkipped ? 'Skipped' : 'Incorrect'}</p>
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
                  background: testAnswers[currentTestQuestion] === opt.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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

      // ───────────────────────────────────────────────────────────────────
      // MASTERY PHASE
      // ───────────────────────────────────────────────────────────────────
      case 'mastery': {
        const finalGrade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'D';
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <div style={{ fontSize: '72px', marginBottom: '12px' }}>&#9878;</div>
              <h1 style={{ color: colors.success, fontSize: typo.title, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '4px' }}>
                You have conquered the Wheatstone Bridge Balance
              </p>
              <p style={{ color: colors.accent, fontSize: '22px', fontWeight: 'bold' }}>Score: {testScore}/10 | Grade: {finalGrade}</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Concepts You Have Mastered</h3>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '18px', margin: 0, fontSize: typo.small }}>
                  <li><strong style={{ color: colors.textPrimary }}>Balance Condition:</strong> R1/R2 = R3/R4 produces zero galvanometer current</li>
                  <li><strong style={{ color: colors.textPrimary }}>Unknown Measurement:</strong> R_unknown = R2 x R3 / R1 at null balance</li>
                  <li><strong style={{ color: colors.textPrimary }}>Supply Independence:</strong> Balance depends on ratios, not voltage level</li>
                  <li><strong style={{ color: colors.textPrimary }}>Strain Sensitivity:</strong> V_out = Vs x GF x strain / 4 for quarter-bridge</li>
                  <li><strong style={{ color: colors.textPrimary }}>Temperature Compensation:</strong> Half/full bridges cancel thermal drift</li>
                  <li><strong style={{ color: colors.textPrimary }}>Real-World Impact:</strong> Load cells, strain gauges, RTDs, gas sensors</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.accent}` }}>
                <h3 style={{ color: colors.accent, marginBottom: '10px', fontSize: typo.heading }}>Where to Go From Here</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  You now understand the principle behind virtually every precision resistance sensor on Earth.
                  Every digital scale, every strain gauge on every aircraft, every RTD in every industrial process uses
                  a Wheatstone bridge. Next, explore how <strong>instrumentation amplifiers</strong> condition bridge outputs,
                  or dive into <strong>AC bridges</strong> for measuring capacitance and inductance.
                </p>
              </div>

              {/* Answer key summary */}
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>Answer Key Summary</h3>
                {testQuestions.map((q, i) => {
                  const userAnswer = testAnswers[i];
                  const correctOption = q.options.find(o => o.correct);
                  const isCorrect = userAnswer === correctOption?.id;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
                      borderBottom: i < testQuestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                        background: isCorrect ? colors.success : colors.error,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '11px', fontWeight: 'bold'
                      }}>{i + 1}</div>
                      <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: typo.label }}>
                        {isCorrect ? 'Correct' : `Wrong (answered ${userAnswer?.toUpperCase()}, correct: ${correctOption?.id.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.success, marginBottom: '10px', fontSize: typo.heading }}>Your Achievement</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '40px' }}>&#9878;&#9889;</div>
                  <div>
                    <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '4px' }}>
                      Wheatstone Bridge Balance Master
                    </p>
                    <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
                      Completed all 10 phases with {testScore}/10 on final assessment
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete Game button */}
              <button onClick={() => {
                playSound('complete');
                emitGameEvent('game_completed', { finalEvent: 'mastery_achieved', score: testScore, total: 10 });
                window.location.href = '/games';
              }} style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.accent} 100%)`,
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.body,
                minHeight: '52px', marginBottom: '20px', transition: 'all 0.2s ease'
              }}>
                Complete Game &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              {renderBridgeCircuit(100, 200, 150, 300, 10)}
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
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

export default WheatstoneBalanceRenderer;
