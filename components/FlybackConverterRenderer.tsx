'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Game #267: Flyback Converter - Complete 10-Phase Game
// The most common isolated power supply topology. Energy stores in a
// transformer's magnetizing inductance during switch ON, then transfers
// to the secondary during switch OFF. Galvanic isolation between I/O.
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

interface FlybackConverterRendererProps {
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
    scenario: "A phone charger manufacturer needs to convert 120V AC (rectified to ~170V DC) down to 5V DC for USB charging. The design must pass safety certification requiring galvanic isolation between mains and user-touchable output.",
    question: "Why is a flyback converter the best choice for this application?",
    options: [
      { id: 'a', label: "Flyback converters are the cheapest components available" },
      { id: 'b', label: "The transformer provides galvanic isolation while the topology efficiently handles the large voltage step-down ratio", correct: true },
      { id: 'c', label: "Flyback converters work without any control circuit" },
      { id: 'd', label: "Only flyback converters can produce 5V output" }
    ],
    explanation: "Flyback converters use a coupled inductor (transformer) that provides galvanic isolation between hazardous mains voltage and the safe low-voltage output. The turns ratio handles the large step-down (170V to 5V) efficiently, and the topology is cost-effective for power levels under 100W - perfect for phone chargers."
  },
  {
    scenario: "An engineer is designing a 48V-to-5V flyback converter. The transformer has a turns ratio of Np:Ns = 8:1. They set the duty cycle to 40%.",
    question: "What is the expected output voltage using the ideal flyback formula Vout = Vin x (Ns/Np) x D/(1-D)?",
    options: [
      { id: 'a', label: "2.0V" },
      { id: 'b', label: "4.0V", correct: true },
      { id: 'c', label: "6.0V" },
      { id: 'd', label: "8.0V" }
    ],
    explanation: "Using Vout = Vin x (Ns/Np) x D/(1-D) = 48 x (1/8) x 0.4/(1-0.4) = 48 x 0.125 x 0.667 = 4.0V. The turns ratio steps down by 8x, then the duty cycle ratio D/(1-D) = 0.667 further adjusts the output. To get exactly 5V, the duty cycle would need to increase to about 45.5%."
  },
  {
    scenario: "During testing of a flyback power supply, the engineer notices the MOSFET switch experiences a large voltage spike the instant it turns OFF, well above the expected reflected voltage.",
    question: "What causes this voltage spike and how is it mitigated?",
    options: [
      { id: 'a', label: "The spike is from the battery discharging" },
      { id: 'b', label: "Transformer leakage inductance stores energy that cannot transfer to the secondary, creating a voltage spike; an RCD snubber circuit absorbs it", correct: true },
      { id: 'c', label: "The output capacitor is too large" },
      { id: 'd', label: "The gate driver is too fast" }
    ],
    explanation: "Real transformers have leakage inductance - magnetic flux that doesn't couple between primary and secondary. When the switch turns OFF, this energy (0.5 x L_leak x I^2) has nowhere to go and generates a dangerous voltage spike (V = L x dI/dt). An RCD (Resistor-Capacitor-Diode) snubber across the primary clamps this spike to a safe level."
  },
  {
    scenario: "A flyback converter for a medical device must maintain exactly 12V output as the input varies between 90V and 265V AC (worldwide mains voltage range). The transformer turns ratio is fixed at 10:1.",
    question: "How does the converter maintain constant output across this wide input range?",
    options: [
      { id: 'a', label: "The transformer automatically adjusts its turns ratio" },
      { id: 'b', label: "A feedback loop using an optocoupler adjusts the duty cycle: higher Vin means lower D, keeping Vout constant", correct: true },
      { id: 'c', label: "A voltage regulator after the flyback handles it" },
      { id: 'd', label: "The output capacitor absorbs the excess voltage" }
    ],
    explanation: "The control loop continuously adjusts duty cycle D to maintain Vout. Since Vout = Vin x (Ns/Np) x D/(1-D), when Vin increases, the controller reduces D to compensate. An optocoupler provides isolated feedback from the secondary to the primary-side controller, maintaining galvanic isolation while regulating output."
  },
  {
    scenario: "An engineer increases the duty cycle of a flyback converter from 40% to 75% to get higher output voltage. The converter initially works but then the output voltage drops and the transformer makes an audible buzzing noise.",
    question: "What has happened to the transformer?",
    options: [
      { id: 'a', label: "The transformer has overheated" },
      { id: 'b', label: "The transformer core has saturated - the magnetizing inductance drops, causing excessive current that doesn't transfer energy effectively", correct: true },
      { id: 'c', label: "The output diode has failed" },
      { id: 'd', label: "The switching frequency is too high" }
    ],
    explanation: "At high duty cycles, the switch ON time is long, allowing magnetizing current to ramp up excessively: I = V x t_on / L. When current exceeds the core's saturation limit, inductance drops dramatically, current spikes uncontrollably, and energy transfer becomes inefficient. The core mechanically vibrates (magnetostriction), causing the audible buzz. This is why flyback converters typically operate below 50% duty cycle."
  },
  {
    scenario: "A laptop power adapter produces 20V at 3.25A (65W). The designer must choose between Continuous Conduction Mode (CCM) and Discontinuous Conduction Mode (DCM) for the flyback converter.",
    question: "Why is CCM preferred for this higher-power application?",
    options: [
      { id: 'a', label: "CCM uses fewer components" },
      { id: 'b', label: "In CCM, the magnetizing current never reaches zero, resulting in lower peak currents and reduced component stress for a given power level", correct: true },
      { id: 'c', label: "DCM cannot operate above 50W" },
      { id: 'd', label: "CCM eliminates the need for a transformer" }
    ],
    explanation: "In CCM, magnetizing current never falls to zero between cycles, so energy transfers continuously. This means lower peak currents (I_peak is much lower in CCM vs DCM for the same average power), reducing stress on the MOSFET, diode, and capacitors. DCM is simpler to control but has higher peak currents, making it better suited for lower power applications (<50W)."
  },
  {
    scenario: "A telecom power supply uses a flyback converter with multiple secondary windings to produce +5V, +12V, and -12V outputs from a single transformer. The +5V output is tightly regulated with the feedback loop.",
    question: "Why might the +12V and -12V outputs have poor regulation compared to the +5V?",
    options: [
      { id: 'a', label: "The +12V and -12V windings are defective" },
      { id: 'b', label: "Cross-regulation error: only the +5V is directly regulated; the other outputs depend on transformer coupling and load balance", correct: true },
      { id: 'c', label: "Multiple outputs are not possible with flyback converters" },
      { id: 'd', label: "The feedback optocoupler limits it to one output" }
    ],
    explanation: "In multi-output flyback converters, only one output (usually the most critical, like +5V) is directly regulated by the feedback loop. Other outputs track via transformer turns ratios but suffer from cross-regulation error due to different leakage inductances, diode forward voltage drops, and varying load currents. Post-regulators (like LDOs) are often added to tighten regulation on auxiliary outputs."
  },
  {
    scenario: "Two flyback converter designs are compared. Design A uses a ferrite core transformer with magnetizing inductance of 500uH. Design B uses 200uH. Both operate at 100kHz with the same input/output voltages.",
    question: "How does the magnetizing inductance affect the converter's operation?",
    options: [
      { id: 'a', label: "Higher inductance has no effect on performance" },
      { id: 'b', label: "Higher inductance means lower peak current but slower transient response; lower inductance means higher peak current but faster response", correct: true },
      { id: 'c', label: "Lower inductance is always better" },
      { id: 'd', label: "Inductance only affects the physical size" }
    ],
    explanation: "Magnetizing inductance directly controls the current ramp rate: dI/dt = V/L. Higher L (500uH) means slower current rise, lower peak currents, and lower ripple - but the energy stored per cycle (0.5 x L x I^2) builds more slowly, limiting transient response. Lower L (200uH) has higher peak currents but responds faster to load changes. Designers balance these tradeoffs based on application requirements."
  },
  {
    scenario: "A safety engineer is reviewing a flyback converter design for a patient-connected medical device. The transformer must provide reinforced insulation with a minimum creepage distance of 8mm between primary and secondary windings.",
    question: "What is the critical safety requirement the transformer provides?",
    options: [
      { id: 'a', label: "It amplifies the voltage for the medical device" },
      { id: 'b', label: "Galvanic isolation prevents hazardous mains voltage from ever reaching the patient, even if a component fails", correct: true },
      { id: 'c', label: "It filters electromagnetic noise" },
      { id: 'd', label: "It provides backup power if mains fails" }
    ],
    explanation: "In medical devices, galvanic isolation is a life-safety requirement. The transformer's insulation barrier prevents any conductive path between mains voltage (120/240V) and the patient. The 8mm creepage distance, triple-insulated wire, and hipot testing (4kV for 1 minute) ensure isolation is maintained even under fault conditions. This is why flyback converters are the dominant topology for medical power supplies."
  },
  {
    scenario: "A GaN (Gallium Nitride) FET is being considered to replace the silicon MOSFET in a 65W USB-C charger flyback converter. The current design switches at 65kHz.",
    question: "What advantage does the GaN FET provide in this application?",
    options: [
      { id: 'a', label: "GaN FETs are cheaper than silicon" },
      { id: 'b', label: "GaN switches faster with lower losses, enabling higher switching frequency (300kHz+), which shrinks the transformer and makes the charger much smaller", correct: true },
      { id: 'c', label: "GaN FETs provide better isolation" },
      { id: 'd', label: "GaN eliminates the need for a transformer" }
    ],
    explanation: "GaN FETs have much lower switching losses than silicon MOSFETs, enabling switching frequencies of 300kHz-1MHz+. Higher frequency means smaller transformer core (since energy per cycle is lower but cycles are more frequent). This is why modern GaN chargers (like Apple's 140W or Anker Nano) are a fraction of the size of older silicon-based designs while achieving 93%+ efficiency."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications for transfer phase
// -----------------------------------------------------------------------------
const transferApplications = [
  {
    icon: '\u{1F50C}',
    title: 'USB Phone Chargers',
    short: 'Every phone charger uses flyback',
    tagline: 'The most common power supply in the world',
    description: 'Every USB phone charger, from the basic 5W cube to the latest 140W GaN fast charger, uses a flyback converter at its core. The topology safely converts dangerous mains voltage (120/240V AC) to safe USB voltage (5-20V DC) with galvanic isolation.',
    connection: 'The Vout = Vin x (Ns/Np) x D/(1-D) formula you learned directly determines the USB output voltage. The feedback loop adjusts duty cycle in real-time to maintain precise voltage as the phone draws varying current during charging.',
    howItWorks: 'Mains AC is rectified to ~170-340V DC. A flyback controller switches a GaN or Si MOSFET at 65-300kHz. The transformer stores energy during ON and delivers it to the secondary during OFF. An optocoupler sends feedback to regulate output voltage. USB-PD chargers dynamically adjust the turns ratio (via multiple windings) to provide 5V/9V/15V/20V.',
    stats: [
      { value: '5-140W', label: 'Power Range' },
      { value: '90-94%', label: 'Efficiency' },
      { value: '65-1000kHz', label: 'Switching Freq' }
    ],
    examples: ['Apple 20W USB-C charger', 'Anker Nano 65W GaN charger', 'Samsung 25W Super Fast charger', 'Apple 140W MacBook GaN charger'],
    companies: ['Apple', 'Anker', 'Samsung', 'Belkin', 'Power Integrations'],
    futureImpact: 'GaN technology is enabling chargers that are 1/3 the size of previous generations while increasing efficiency. Universal USB-C adoption means one charger for all devices. Wireless charging pads also use flyback converters internally.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F5A5}',
    title: 'ATX Computer Power Supplies',
    short: 'Powering every desktop PC',
    tagline: 'Multi-output isolated power conversion',
    description: 'Desktop computer ATX power supplies use flyback converters for standby power (5V_SB at 2A) that keeps the motherboard alive for wake-on-LAN and power button detection. The main power rails (+12V, +5V, +3.3V) use forward or LLC converters, but the always-on standby rail is a classic flyback.',
    connection: 'The multi-output flyback topology you explored explains how a single transformer with multiple secondary windings generates +5V_SB, and how cross-regulation challenges arise between outputs with different loads.',
    howItWorks: 'The standby flyback operates continuously, even when the PC is "off". It converts rectified mains to 5V at low power (<10W). The 5V_SB powers the motherboard always-on logic, the power button circuit, and USB standby charging. When you press power, this 5V_SB signal triggers the main converter to start.',
    stats: [
      { value: '10W', label: 'Standby Power' },
      { value: '<0.5W', label: 'Eco Standby' },
      { value: '24/7', label: 'Always Running' }
    ],
    examples: ['Desktop PC standby power', 'Server BMC always-on rail', 'NAS wake-on-LAN power', 'Gaming PC RGB standby'],
    companies: ['Corsair', 'EVGA', 'Seasonic', 'Delta Electronics'],
    futureImpact: 'ATX 3.0 specification demands higher efficiency standby supplies. New designs use synchronous rectification on the secondary to reduce standby power consumption below 0.1W, meeting strict energy regulations like ErP Lot 6.',
    color: '#22C55E'
  },
  {
    icon: '\u{1F3E5}',
    title: 'Medical Device Power Supplies',
    short: 'Life-critical isolated power',
    tagline: 'Where galvanic isolation saves lives',
    description: 'Medical devices that contact patients require BF (Body Floating) or CF (Cardiac Floating) rated power supplies with reinforced isolation. Flyback converters with medical-grade transformers provide the required 2xMOPP (Means of Patient Protection) isolation between mains and patient-connected circuits.',
    connection: 'The galvanic isolation concept you learned is literally a life-safety requirement here. The transformer provides a physical barrier that prevents any mains leakage current from reaching the patient, even under double-fault conditions.',
    howItWorks: 'Medical flyback converters use triple-insulated wire, 8mm+ creepage distances, and are tested to 4kV isolation. Earth leakage current must be below 300uA (BF) or 10uA (CF for cardiac applications). The optocoupler feedback also maintains isolation in the control loop.',
    stats: [
      { value: '4kV', label: 'Isolation Test' },
      { value: '<10uA', label: 'Leakage (CF)' },
      { value: '2xMOPP', label: 'Safety Level' }
    ],
    examples: ['Patient monitors', 'Infusion pumps', 'Pulse oximeters', 'Ultrasound equipment'],
    companies: ['Philips Healthcare', 'GE Healthcare', 'Mean Well (Medical)', 'CUI Inc'],
    futureImpact: 'Smaller, more efficient medical power supplies enable portable and wearable medical devices. GaN-based flyback converters for medical use are being certified, enabling smaller life-saving equipment for remote and developing areas.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F4E1}',
    title: 'PoE (Power over Ethernet)',
    short: 'Powering devices through network cables',
    tagline: 'Electricity rides alongside data',
    description: 'Power over Ethernet (PoE) injects DC power onto Ethernet cables to power cameras, access points, and IP phones. At the receiving end, a flyback converter isolates and regulates the PoE voltage (typically 48V) down to whatever the device needs (3.3V, 5V, 12V).',
    connection: 'The flyback converter at the powered device (PD) end uses the same Vout formula. The 48V PoE input is stepped down using the turns ratio, with duty cycle regulation maintaining output voltage as cable length (and resistance loss) varies.',
    howItWorks: 'PoE delivers 48V DC over Ethernet cat5/6 cable (up to 90W with PoE++). The powered device contains a flyback converter that steps 48V down to regulated local rails. Isolation protects against ground loops between networked equipment. The converter handles the variable input (36-57V) as cable voltage drops vary.',
    stats: [
      { value: '15-90W', label: 'PoE Power' },
      { value: '48V', label: 'Bus Voltage' },
      { value: '100m', label: 'Max Distance' }
    ],
    examples: ['Security cameras (IP cameras)', 'WiFi access points', 'VoIP phones', 'IoT sensors and controllers'],
    companies: ['Cisco', 'Ubiquiti', 'Texas Instruments', 'Microchip (Microsemi)'],
    futureImpact: 'PoE++ (IEEE 802.3bt) delivers up to 90W, enough to power small displays and laptops. Combined with GaN flyback converters, PoE-powered devices are becoming smaller and more capable, simplifying smart building installations.',
    color: '#A855F7'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const FlybackConverterRenderer: React.FC<FlybackConverterRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();

  // Simulation state
  const [inputVoltage, setInputVoltage] = useState(48);
  const [turnsRatioPrimary, setTurnsRatioPrimary] = useState(8);
  const [turnsRatioSecondary, setTurnsRatioSecondary] = useState(1);
  const [dutyCycle, setDutyCycle] = useState(0.40);
  const [magnetizingInductance, setMagnetizingInductance] = useState(500); // uH
  const [loadResistance, setLoadResistance] = useState(10); // ohms
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Twist phase - saturation scenario
  const [snubberEnabled, setSnubberEnabled] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.04) % (2 * Math.PI * 4));
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Derived calculations
  const turnsRatio = turnsRatioSecondary / turnsRatioPrimary;
  const vOut = inputVoltage * turnsRatio * (dutyCycle / (1 - dutyCycle));
  const switchingPeriod = 1 / 100000; // 100kHz
  const tOn = dutyCycle * switchingPeriod;
  const peakCurrent = (inputVoltage * tOn) / (magnetizingInductance * 1e-6);
  const outputPower = (vOut * vOut) / loadResistance;
  const isSaturated = peakCurrent > 3.0; // core saturates above ~3A peak
  const effectiveVout = isSaturated ? vOut * 0.6 * Math.random() * 0.3 + 0.4 : vOut;
  const efficiency = isSaturated ? Math.max(40, 85 - (peakCurrent - 3) * 15) : Math.min(92, 88 + (1 - dutyCycle) * 8);

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
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    primary: '#3b82f6',
    secondary: '#22c55e',
    purple: '#a855f7',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Saturation Effects',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const navDotLabels: Record<Phase, string> = {
    hook: 'explore introduction',
    predict: 'predict output voltage',
    play: 'experiment flyback lab',
    review: 'review understanding',
    twist_predict: 'explore twist core saturation',
    twist_play: 'experiment with saturation',
    twist_review: 'deep insight snubber design',
    transfer: 'transfer apply real world',
    test: 'quiz test knowledge',
    mastery: 'mastery complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'flyback-converter',
        gameTitle: 'Flyback Converter',
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

  // ---------------------------------------------------------------------------
  // Flyback Circuit SVG Visualization
  // ---------------------------------------------------------------------------
  const FlybackVisualization = ({ interactive, showSaturation }: { interactive: boolean; showSaturation?: boolean }) => {
    const width = isMobile ? 370 : 700;
    const height = isMobile ? 480 : 520;
    const switchOn = Math.sin(animationTime * 3) > 0;
    const cycleProgress = ((animationTime * 3) % (2 * Math.PI)) / (2 * Math.PI);
    const isOnPhase = cycleProgress < dutyCycle;
    const effectiveSaturated = showSaturation && isSaturated;

    // Magnetizing current waveform
    const wavePoints: { x: number; y: number }[] = [];
    const waveW = isMobile ? 320 : 620;
    const waveH = 70;
    const waveX = isMobile ? 25 : 40;
    const waveY = isMobile ? 350 : 380;

    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const cycle = t * 4;
      const inCycle = cycle % 1;
      let y: number;
      if (inCycle < dutyCycle) {
        // ON: ramp up
        const rampFraction = inCycle / dutyCycle;
        y = rampFraction;
        if (effectiveSaturated && rampFraction > 0.7) {
          y = 0.7 + (rampFraction - 0.7) * 3; // exponential spike
        }
      } else {
        // OFF: ramp down
        const rampFraction = (inCycle - dutyCycle) / (1 - dutyCycle);
        y = 1 - rampFraction;
        if (effectiveSaturated) {
          y = Math.max(0, (1 + 0.6) - rampFraction * (1 + 0.6)); // higher starting point
        }
      }
      wavePoints.push({
        x: waveX + (i / 200) * waveW,
        y: waveY + waveH - y * waveH * 0.9 - 5
      });
    }

    const wavePath = wavePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Circuit positions
    const cx = isMobile ? 20 : 40; // circuit left offset
    const circuitW = isMobile ? 330 : 620;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '740px', background: colors.bgCard }}
          role="img"
          aria-label="Flyback converter circuit visualization"
        >
          <defs>
            <linearGradient id="fbPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="fbSecondaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            <linearGradient id="fbEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <filter id="fbGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={width / 2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
            Flyback Converter - {isOnPhase ? 'Switch ON: Storing Energy' : 'Switch OFF: Transferring Energy'}
          </text>

          {/* ---- PRIMARY SIDE ---- */}
          {/* Input voltage source */}
          <rect x={cx} y={50} width={isMobile ? 50 : 65} height={isMobile ? 35 : 40} rx="5" fill={colors.bgSecondary} stroke={colors.primary} strokeWidth="2" />
          <text x={cx + (isMobile ? 25 : 32)} y={65} textAnchor="middle" fill={colors.primary} fontSize="10" fontWeight="bold">Vin</text>
          <text x={cx + (isMobile ? 25 : 32)} y={80} textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? '11' : '13'} fontWeight="bold">{inputVoltage}V</text>

          {/* Connection: Vin to switch */}
          <line x1={cx + (isMobile ? 50 : 65)} y1={68} x2={cx + (isMobile ? 70 : 90)} y2={68} stroke={colors.primary} strokeWidth="2" />

          {/* MOSFET Switch */}
          <rect
            x={cx + (isMobile ? 70 : 90)}
            y={48}
            width={isMobile ? 45 : 55}
            height={isMobile ? 40 : 45}
            rx="5"
            fill={isOnPhase ? `${colors.success}33` : colors.bgSecondary}
            stroke={isOnPhase ? colors.success : colors.textMuted}
            strokeWidth="2"
          />
          <text x={cx + (isMobile ? 92 : 117)} y={64} textAnchor="middle" fill={isOnPhase ? colors.success : colors.textMuted} fontSize="10" fontWeight="bold">MOSFET</text>
          <text x={cx + (isMobile ? 92 : 117)} y={80} textAnchor="middle" fill={isOnPhase ? colors.success : colors.textMuted} fontSize={isMobile ? '10' : '12'} fontWeight="bold">
            {isOnPhase ? 'ON' : 'OFF'}
          </text>

          {/* Connection: switch to transformer primary */}
          <line x1={cx + (isMobile ? 115 : 145)} y1={68} x2={cx + (isMobile ? 135 : 175)} y2={68} stroke={colors.primary} strokeWidth="2" />

          {/* Transformer */}
          <rect
            x={cx + (isMobile ? 135 : 175)}
            y={35}
            width={isMobile ? 70 : 90}
            height={isMobile ? 70 : 75}
            rx="8"
            fill={effectiveSaturated ? `${colors.error}22` : colors.bgSecondary}
            stroke={effectiveSaturated ? colors.error : colors.accent}
            strokeWidth="2"
          />

          {/* Transformer core (vertical line in center) */}
          <line
            x1={cx + (isMobile ? 170 : 220)}
            y1={42}
            x2={cx + (isMobile ? 170 : 220)}
            y2={103}
            stroke={effectiveSaturated ? colors.error : colors.accent}
            strokeWidth="3"
          />
          <line
            x1={cx + (isMobile ? 174 : 224)}
            y1={42}
            x2={cx + (isMobile ? 174 : 224)}
            y2={103}
            stroke={effectiveSaturated ? colors.error : colors.accent}
            strokeWidth="3"
          />

          {/* Primary winding (left of core) */}
          <text x={cx + (isMobile ? 152 : 195)} y={55} textAnchor="middle" fill={colors.primary} fontSize="9" fontWeight="bold">Np={turnsRatioPrimary}</text>
          {/* Dot notation - primary */}
          <circle cx={cx + (isMobile ? 142 : 182)} cy={60} r="3" fill={colors.primary} />
          {/* Coil symbol primary */}
          {[0, 1, 2].map(i => (
            <path
              key={`pri-${i}`}
              d={`M ${cx + (isMobile ? 152 : 195)} ${64 + i * 12} Q ${cx + (isMobile ? 143 : 183)} ${70 + i * 12} ${cx + (isMobile ? 152 : 195)} ${76 + i * 12}`}
              fill="none"
              stroke={isOnPhase ? colors.primary : `${colors.primary}66`}
              strokeWidth="2"
            />
          ))}

          {/* Secondary winding (right of core) */}
          <text x={cx + (isMobile ? 192 : 246)} y={55} textAnchor="middle" fill={colors.secondary} fontSize="9" fontWeight="bold">Ns={turnsRatioSecondary}</text>
          {/* Dot notation - secondary */}
          <circle cx={cx + (isMobile ? 200 : 256)} cy={60} r="3" fill={colors.secondary} />
          {/* Coil symbol secondary */}
          {[0, 1, 2].map(i => (
            <path
              key={`sec-${i}`}
              d={`M ${cx + (isMobile ? 192 : 246)} ${64 + i * 12} Q ${cx + (isMobile ? 201 : 257)} ${70 + i * 12} ${cx + (isMobile ? 192 : 246)} ${76 + i * 12}`}
              fill="none"
              stroke={!isOnPhase ? colors.secondary : `${colors.secondary}66`}
              strokeWidth="2"
            />
          ))}

          {/* Connection: transformer secondary to diode */}
          <line x1={cx + (isMobile ? 205 : 265)} y1={68} x2={cx + (isMobile ? 225 : 295)} y2={68} stroke={colors.secondary} strokeWidth="2" />

          {/* Secondary Diode */}
          <rect
            x={cx + (isMobile ? 225 : 295)}
            y={53}
            width={isMobile ? 35 : 45}
            height={isMobile ? 30 : 35}
            rx="5"
            fill={!isOnPhase ? `${colors.secondary}33` : colors.bgSecondary}
            stroke={!isOnPhase ? colors.secondary : colors.textMuted}
            strokeWidth="1.5"
          />
          <text x={cx + (isMobile ? 242 : 317)} y={68} textAnchor="middle" fill={!isOnPhase ? colors.secondary : colors.textMuted} fontSize={isMobile ? '9' : '10'} fontWeight="bold">DIODE</text>
          <text x={cx + (isMobile ? 242 : 317)} y={80} textAnchor="middle" fill={!isOnPhase ? colors.secondary : colors.textMuted} fontSize="9">
            {!isOnPhase ? 'FWD' : 'REV'}
          </text>

          {/* Connection: diode to output cap */}
          <line x1={cx + (isMobile ? 260 : 340)} y1={68} x2={cx + (isMobile ? 275 : 365)} y2={68} stroke={colors.secondary} strokeWidth="2" />

          {/* Output Capacitor */}
          <rect
            x={cx + (isMobile ? 275 : 365)}
            y={50}
            width={isMobile ? 30 : 40}
            height={isMobile ? 38 : 42}
            rx="4"
            fill={colors.bgSecondary}
            stroke={colors.accent}
            strokeWidth="1.5"
          />
          <text x={cx + (isMobile ? 290 : 385)} y={66} textAnchor="middle" fill={colors.accent} fontSize="9" fontWeight="bold">Cout</text>
          {/* Cap symbol */}
          <line x1={cx + (isMobile ? 280 : 372)} y1={78} x2={cx + (isMobile ? 300 : 398)} y2={78} stroke={colors.accent} strokeWidth="2" />
          <line x1={cx + (isMobile ? 280 : 372)} y1={82} x2={cx + (isMobile ? 300 : 398)} y2={82} stroke={colors.accent} strokeWidth="2" />

          {/* Vout label */}
          <rect
            x={cx + (isMobile ? 275 : 365)}
            y={95}
            width={isMobile ? 30 : 40}
            height={20}
            rx="4"
            fill={colors.bgSecondary}
            stroke={colors.secondary}
            strokeWidth="1.5"
          />
          <text x={cx + (isMobile ? 290 : 385)} y={109} textAnchor="middle" fill={colors.secondary} fontSize="11" fontWeight="bold">
            {effectiveSaturated ? effectiveVout.toFixed(1) : vOut.toFixed(1)}V
          </text>

          {/* Ground connections */}
          <line x1={cx + (isMobile ? 25 : 32)} y1={90} x2={cx + (isMobile ? 25 : 32)} y2={120} stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1={cx + (isMobile ? 290 : 385)} y1={115} x2={cx + (isMobile ? 290 : 385)} y2={135} stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="3,3" />

          {/* Energy flow animation arrows */}
          {isOnPhase && (
            <g opacity={0.8 + Math.sin(animationTime * 8) * 0.2}>
              {/* Primary current arrow */}
              <polygon
                points={`${cx + (isMobile ? 128 : 160)},${58} ${cx + (isMobile ? 135 : 170)},${68} ${cx + (isMobile ? 128 : 160)},${78}`}
                fill={colors.primary}
                filter="url(#fbGlow)"
              />
              <text x={cx + (isMobile ? 100 : 130)} y={130} textAnchor="middle" fill={colors.primary} fontSize="10" fontWeight="bold">
                Energy storing in core
              </text>
            </g>
          )}
          {!isOnPhase && (
            <g opacity={0.8 + Math.sin(animationTime * 8) * 0.2}>
              {/* Secondary current arrow */}
              <polygon
                points={`${cx + (isMobile ? 218 : 280)},${58} ${cx + (isMobile ? 225 : 290)},${68} ${cx + (isMobile ? 218 : 280)},${78}`}
                fill={colors.secondary}
                filter="url(#fbGlow)"
              />
              <text x={cx + (isMobile ? 240 : 330)} y={130} textAnchor="middle" fill={colors.secondary} fontSize="10" fontWeight="bold">
                Energy to output
              </text>
            </g>
          )}

          {/* Saturation warning */}
          {effectiveSaturated && (
            <g>
              <rect x={cx + (isMobile ? 80 : 130)} y={140} width={isMobile ? 180 : 260} height={28} rx="6" fill={`${colors.error}33`} stroke={colors.error} strokeWidth="1.5" />
              <text x={cx + (isMobile ? 170 : 260)} y={158} textAnchor="middle" fill={colors.error} fontSize="12" fontWeight="bold">
                CORE SATURATED - Current Spike!
              </text>
            </g>
          )}

          {/* Snubber circuit indicator */}
          {showSaturation && snubberEnabled && (
            <g>
              <rect x={cx + (isMobile ? 72 : 92)} y={95} width={isMobile ? 40 : 50} height={22} rx="4" fill={`${colors.purple}33`} stroke={colors.purple} strokeWidth="1.5" />
              <text x={cx + (isMobile ? 92 : 117)} y={110} textAnchor="middle" fill={colors.purple} fontSize="9" fontWeight="bold">RCD</text>
            </g>
          )}

          {/* ---- STATS PANEL ---- */}
          <rect x={isMobile ? 15 : 30} y={isMobile ? 175 : 180} width={isMobile ? 340 : 640} height={isMobile ? 50 : 45} rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          {[
            { label: 'Vout', value: `${(effectiveSaturated ? effectiveVout : vOut).toFixed(1)}V`, color: colors.secondary },
            { label: 'D', value: `${(dutyCycle * 100).toFixed(0)}%`, color: colors.accent },
            { label: 'I_pk', value: `${peakCurrent.toFixed(2)}A`, color: effectiveSaturated ? colors.error : colors.primary },
            { label: 'Eff', value: `${efficiency.toFixed(0)}%`, color: efficiency > 85 ? colors.success : colors.error },
          ].map((stat, i) => {
            const statX = (isMobile ? 15 : 30) + (isMobile ? 85 : 160) * i + (isMobile ? 42 : 80);
            return (
              <g key={stat.label}>
                <text x={statX} y={isMobile ? 195 : 198} textAnchor="middle" fill={colors.textMuted} fontSize="10">{stat.label}</text>
                <text x={statX} y={isMobile ? 213 : 216} textAnchor="middle" fill={stat.color} fontSize={isMobile ? '13' : '15'} fontWeight="bold">{stat.value}</text>
              </g>
            );
          })}

          {/* ---- FORMULA ---- */}
          <text x={width / 2} y={isMobile ? 245 : 248} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Vout = Vin x (Ns/Np) x D/(1-D) = {inputVoltage} x ({turnsRatioSecondary}/{turnsRatioPrimary}) x {dutyCycle.toFixed(2)}/{(1 - dutyCycle).toFixed(2)} = {vOut.toFixed(1)}V
          </text>

          {/* ---- MAGNETIZING CURRENT WAVEFORM ---- */}
          <rect x={isMobile ? 15 : 30} y={isMobile ? 260 : 270} width={isMobile ? 340 : 640} height={isMobile ? 115 : 120} rx="8" fill={colors.bgSecondary} />
          <text x={isMobile ? 25 : 45} y={isMobile ? 280 : 290} fill={colors.accent} fontSize="11" fontWeight="bold">
            Magnetizing Current (I_m)
          </text>

          {/* Axes */}
          <line x1={waveX} y1={waveY} x2={waveX} y2={waveY + waveH} stroke={colors.textMuted} strokeWidth="1" opacity="0.5" />
          <line x1={waveX} y1={waveY + waveH} x2={waveX + waveW} y2={waveY + waveH} stroke={colors.textMuted} strokeWidth="1" opacity="0.5" />
          <text x={waveX - 3} y={waveY + 8} fill={colors.textMuted} fontSize="9" textAnchor="end">I_pk</text>
          <text x={waveX - 3} y={waveY + waveH} fill={colors.textMuted} fontSize="9" textAnchor="end">0</text>

          {/* Waveform */}
          <path
            d={wavePath}
            fill="none"
            stroke={effectiveSaturated ? colors.error : 'url(#fbEnergyGrad)'}
            strokeWidth="2.5"
            filter="url(#fbGlow)"
          />

          {/* Duty cycle markers */}
          {[0, 1, 2, 3].map(i => {
            const cycleX = waveX + (i + dutyCycle) / 4 * waveW;
            return (
              <line key={`dc-${i}`} x1={cycleX} y1={waveY} x2={cycleX} y2={waveY + waveH} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
            );
          })}

          <text x={waveX + waveW / 2} y={waveY + waveH + 14} fill={colors.textMuted} fontSize="10" textAnchor="middle">
            Time (4 switching cycles shown) | ON = blue region, OFF = green region
          </text>
        </svg>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Shared UI helpers
  // ---------------------------------------------------------------------------
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{'\u26A1'}</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Flyback Converter</span>
      </div>
      <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
        {phaseLabels[phase]}
      </div>
    </div>
  );

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

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
          aria-label={navDotLabels[p]}
        />
      ))}
    </div>
  );

  const renderBottomBar = (onNext?: () => void, nextLabel = 'Next \u2192', nextDisabled = false) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          aria-label="Back"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.border,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          {'\u2190'} Back
        </button>
        <button
          onClick={onNext && !nextDisabled ? onNext : undefined}
          disabled={nextDisabled || !onNext}
          aria-label="Next"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: nextDisabled || !onNext ? colors.border : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
            color: 'white',
            cursor: nextDisabled || !onNext ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            minHeight: '44px',
            boxShadow: nextDisabled || !onNext ? 'none' : `0 4px 16px ${colors.accentGlow}`,
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  const secondaryButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Slider component helper
  const renderSlider = (label: string, value: number, min: number, max: number, step: number, unit: string, color: string, onChange: (v: number) => void, displayValue?: string) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: color, fontWeight: 600 }}>{displayValue || `${value}${unit}`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: color }}
      />
    </div>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: isMobile ? '16px' : '24px',
          paddingRight: isMobile ? '16px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F50C}\u26A1'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Flyback Converter
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '12px',
          }}>
            How does your phone charger safely convert <span style={{ color: colors.error }}>120V AC</span> from the wall outlet to <span style={{ color: colors.secondary }}>5V DC</span> for your phone?
          </p>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            The answer is the <span style={{ color: colors.accent, fontWeight: 700 }}>flyback converter</span> - the most common isolated power supply topology in the world. Every phone charger, laptop adapter, and USB power supply uses one.
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
              "The flyback converter is the workhorse of low-power isolated supplies. Its elegance lies in storing energy in the transformer's magnetizing inductance during the switch ON time and delivering it to the isolated output during OFF time."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Power Electronics: Converters, Applications and Design
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            marginBottom: '24px',
          }}>
            {[
              { label: 'Galvanic Isolation', value: 'Safety', icon: '\u{1F6E1}' },
              { label: 'Typical Power', value: '5-150W', icon: '\u26A1' },
              { label: 'Applications', value: 'Billions', icon: '\u{1F30D}' },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px 8px',
                textAlign: 'center',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>{item.label}</div>
              </div>
            ))}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('click'); nextPhase(); }, 'Explore Flyback Technology \u2192')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Vout = 2.0V (the transformer simply divides the voltage by the turns ratio)' },
      { id: 'b', text: 'Vout = 4.0V (Vin x Ns/Np x D/(1-D) = 48 x 1/8 x 0.4/0.6)', correct: true },
      { id: 'c', text: 'Vout = 6.0V (the duty cycle doubles the output)' },
      { id: 'd', text: 'Vout = 48V (the output equals the input regardless of the transformer)' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A flyback converter has Vin = 48V, turns ratio Np:Ns = 8:1, and duty cycle D = 40%. What is Vout?
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            The flyback formula is <span style={{ color: colors.accent, fontWeight: 700 }}>Vout = Vin x (Ns/Np) x D/(1-D)</span>
          </p>

          {/* Static diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '400px' }}>
              <rect x="15" y="30" width="70" height="80" rx="8" fill={`${colors.primary}22`} stroke={colors.primary} strokeWidth="2" />
              <text x="50" y="60" textAnchor="middle" fill={colors.primary} fontSize="14" fontWeight="bold">48V DC</text>
              <text x="50" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">Input</text>

              <line x1="85" y1="70" x2="120" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="120,65 130,70 120,75" fill={colors.textMuted} />

              <rect x="135" y="20" width="130" height="100" rx="10" fill={`${colors.accent}22`} stroke={colors.accent} strokeWidth="2" />
              <text x="200" y="50" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="bold">FLYBACK</text>
              <text x="200" y="70" textAnchor="middle" fill={colors.textPrimary} fontSize="12">Np:Ns = 8:1</text>
              <text x="200" y="90" textAnchor="middle" fill={colors.textPrimary} fontSize="12">D = 40%</text>
              <text x="200" y="108" textAnchor="middle" fill={colors.textMuted} fontSize="10">Isolated</text>

              <line x1="265" y1="70" x2="300" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="300,65 310,70 300,75" fill={colors.textMuted} />

              <rect x="315" y="30" width="70" height="80" rx="8" fill={`${colors.secondary}22`} stroke={colors.secondary} strokeWidth="2" />
              <text x="350" y="60" textAnchor="middle" fill={colors.secondary} fontSize="16" fontWeight="bold">?? V</text>
              <text x="350" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">Output</text>
            </svg>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'prediction_made',
                      gameType: 'flyback-converter',
                      gameTitle: 'Flyback Converter',
                      details: { prediction: opt.id, correct: !!opt.correct },
                      timestamp: Date.now()
                    });
                  }
                }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(prediction ? () => { playSound('success'); nextPhase(); } : undefined, 'See the Result \u2192', !prediction)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Flyback Converter Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust input voltage, turns ratio, duty cycle, and magnetizing inductance. Watch how energy stores and transfers through the transformer. Design for specific output voltages.
          </p>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Challenge:</strong> Can you design a flyback converter that outputs exactly 5V from a 48V input? Try adjusting the turns ratio and duty cycle!
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Circuit visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <FlybackVisualization interactive={true} />
              </div>
            </div>

            {/* Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '16px', fontWeight: 600 }}>
                  Controls
                </h4>
                {renderSlider('Input Voltage', inputVoltage, 12, 170, 1, 'V', colors.primary, setInputVoltage)}
                {renderSlider('Primary Turns (Np)', turnsRatioPrimary, 1, 20, 1, '', colors.primary, setTurnsRatioPrimary, `Np = ${turnsRatioPrimary}`)}
                {renderSlider('Secondary Turns (Ns)', turnsRatioSecondary, 1, 10, 1, '', colors.secondary, setTurnsRatioSecondary, `Ns = ${turnsRatioSecondary}`)}
                {renderSlider('Duty Cycle (D)', dutyCycle, 0.05, 0.85, 0.01, '', colors.accent, setDutyCycle, `D = ${(dutyCycle * 100).toFixed(0)}%`)}
                {renderSlider('Lm (magnetizing)', magnetizingInductance, 50, 1000, 10, 'uH', colors.purple, setMagnetizingInductance, `${magnetizingInductance} uH`)}
                {renderSlider('Load', loadResistance, 1, 100, 1, '\u03A9', colors.textSecondary, setLoadResistance)}

                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isAnimating ? `${colors.error}33` : `${colors.success}33`,
                    color: isAnimating ? colors.error : colors.success,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    marginTop: '8px',
                  }}
                >
                  {isAnimating ? 'Pause Animation' : 'Resume Animation'}
                </button>
              </div>

              {/* Design targets */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '12px', fontWeight: 600 }}>
                  Design Targets:
                </h4>
                {[
                  { target: '5.0V', desc: 'USB charger', achieved: Math.abs(vOut - 5.0) < 0.3 },
                  { target: '12.0V', desc: 'LED driver', achieved: Math.abs(vOut - 12.0) < 0.5 },
                  { target: '3.3V', desc: 'MCU supply', achieved: Math.abs(vOut - 3.3) < 0.2 },
                ].map((t, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: t.achieved ? `${colors.success}22` : 'transparent',
                  }}>
                    <span style={{ color: t.achieved ? colors.success : colors.textMuted, fontSize: '14px' }}>
                      {t.achieved ? '\u2713' : '\u25CB'}
                    </span>
                    <span style={{ ...typo.small, color: t.achieved ? colors.success : colors.textSecondary }}>
                      {t.target} ({t.desc})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Experiments */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            marginTop: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
              Experiments to Try:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Keep Np:Ns = 8:1, adjust only duty cycle to hit 5V (should be ~45%)</li>
              <li>Set D = 50%, then vary turns ratio to get 12V output</li>
              <li>Increase duty cycle above 70% - watch peak current climb dangerously</li>
              <li>Reduce magnetizing inductance - see how peak current increases</li>
            </ul>
          </div>

        </div>

        {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Understand the Physics \u2192')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';
    const predictionLabels: Record<string, string> = {
      'a': 'Vout = 2.0V (simple voltage divider)',
      'b': 'Vout = 4.0V (correct flyback formula)',
      'c': 'Vout = 6.0V (duty cycle doubles output)',
      'd': 'Vout = 48V (output equals input)',
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Your Prediction Was Correct!' : "Let's Review Your Prediction"}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              You predicted: {prediction ? predictionLabels[prediction] : 'no answer was selected'}.
            </p>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              <strong>Vout = Vin x (Ns/Np) x D/(1-D) = 48 x (1/8) x 0.4/0.6 = 4.0V</strong>. The turns ratio provides a step-down factor, and the duty cycle ratio D/(1-D) further adjusts the output.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How Flyback Converters Work
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 1: Switch ON - Energy Storage</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When the MOSFET turns ON, current flows through the <span style={{ color: colors.primary }}>primary winding</span>, building up magnetic energy in the transformer core. The magnetizing current ramps up linearly: I = V x t / L. The secondary diode is <span style={{ color: colors.error }}>reverse biased</span> (blocked) due to the dot polarity.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 2: Switch OFF - Energy Transfer</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When the switch turns OFF, the magnetic field collapses. The voltage on the windings reverses polarity (Lenz's law). Now the secondary diode <span style={{ color: colors.secondary }}>forward biases</span>, and energy transfers to the output capacitor and load. This is why it's called "flyback" - the voltage flies back in the opposite direction.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 3: Galvanic Isolation</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The transformer provides complete electrical isolation between primary (mains voltage) and secondary (output). There is <span style={{ color: colors.accent }}>no direct electrical connection</span> - energy transfers only through the magnetic field. This is critical for safety in devices that humans touch.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Output Voltage Formula</strong>
              </p>
              <p style={{ margin: 0 }}>
                <span style={{ color: colors.accent, fontWeight: 700 }}>Vout = Vin x (Ns/Np) x D/(1-D)</span> where Ns/Np is the turns ratio and D is the duty cycle. The D/(1-D) term comes from the volt-second balance: the voltage-time product during ON must equal the voltage-time product during OFF for steady-state operation.
              </p>
            </div>
          </div>

          {/* Key concepts summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {[
              { title: 'Isolation', desc: 'Transformer provides galvanic isolation for safety', color: colors.accent },
              { title: 'Turns Ratio', desc: 'Ns/Np sets the voltage transformation ratio', color: colors.primary },
              { title: 'Duty Cycle', desc: 'D/(1-D) gives continuous voltage adjustment', color: colors.secondary },
              { title: 'Feedback', desc: 'Optocoupler maintains isolation in control loop', color: colors.purple },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                borderLeft: `3px solid ${item.color}`,
              }}>
                <h4 style={{ ...typo.small, color: item.color, fontWeight: 600, marginBottom: '6px' }}>{item.title}</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Explore the Twist \u2192')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', text: 'The output voltage increases linearly without limit' },
      { id: 'b', text: 'The core saturates - inductance drops, current spikes uncontrollably, and efficiency plummets', correct: true },
      { id: 'c', text: 'The MOSFET simply stops conducting' },
      { id: 'd', text: 'The output capacitor absorbs all excess energy safely' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.error}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.error}44`,
          }}>
            <p style={{ ...typo.small, color: colors.error, margin: 0, fontWeight: 600 }}>
              The Twist: What Happens When We Push Too Hard?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            What happens if you increase the duty cycle too high, exceeding the transformer core's capacity?
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            You've learned that higher D means higher output voltage. But every ferrite core has a maximum magnetic flux density (B_sat). What happens when we exceed it?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {twistOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setTwistPrediction(opt.id);
                }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.error}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.error : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.error : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined, 'See What Happens \u2192', !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Core Saturation Explorer
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Increase the duty cycle until the transformer core saturates. Watch the current spike and efficiency drop. Then enable the snubber circuit to see its protective effect.
          </p>

          {/* Warning banner when saturated */}
          {isSaturated && (
            <div style={{
              background: `${colors.error}22`,
              border: `2px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center',
              animation: 'pulse 1s infinite',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0, fontWeight: 700 }}>
                CORE SATURATED! Peak current: {peakCurrent.toFixed(1)}A (limit: 3.0A). Efficiency: {efficiency.toFixed(0)}%
              </p>
            </div>
          )}

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
                padding: '12px',
              }}>
                <FlybackVisualization interactive={true} showSaturation={true} />
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.error, marginBottom: '16px', fontWeight: 600 }}>
                  Saturation Controls
                </h4>
                {renderSlider('Duty Cycle (D)', dutyCycle, 0.10, 0.85, 0.01, '', isSaturated ? colors.error : colors.accent, setDutyCycle, `D = ${(dutyCycle * 100).toFixed(0)}%`)}
                {renderSlider('Input Voltage', inputVoltage, 12, 170, 1, 'V', colors.primary, setInputVoltage)}
                {renderSlider('Lm (magnetizing)', magnetizingInductance, 50, 1000, 10, 'uH', colors.purple, setMagnetizingInductance, `${magnetizingInductance} uH`)}

                <div style={{ marginTop: '16px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                  <h4 style={{ ...typo.small, color: colors.purple, marginBottom: '12px', fontWeight: 600 }}>
                    Snubber Circuit
                  </h4>
                  <button
                    onClick={() => { playSound('click'); setSnubberEnabled(!snubberEnabled); }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${snubberEnabled ? colors.purple : colors.border}`,
                      background: snubberEnabled ? `${colors.purple}22` : 'transparent',
                      color: snubberEnabled ? colors.purple : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    {snubberEnabled ? 'RCD Snubber: ON' : 'RCD Snubber: OFF'}
                  </button>
                  <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', fontSize: '11px' }}>
                    The snubber absorbs energy from leakage inductance, clamping voltage spikes when the switch turns OFF.
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', fontWeight: 600 }}>Status</h4>
                {[
                  { label: 'Peak Current', value: `${peakCurrent.toFixed(2)}A`, ok: peakCurrent < 3.0 },
                  { label: 'Core Status', value: isSaturated ? 'SATURATED' : 'Normal', ok: !isSaturated },
                  { label: 'Efficiency', value: `${efficiency.toFixed(0)}%`, ok: efficiency > 80 },
                  { label: 'Snubber', value: snubberEnabled ? 'Active' : 'None', ok: snubberEnabled },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i < 3 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{s.label}</span>
                    <span style={{ ...typo.small, color: s.ok ? colors.success : colors.error, fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}22`,
            border: `1px solid ${colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            marginTop: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
              Experiments:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Increase D above 60% and watch the core saturate (I_pk &gt; 3A)</li>
              <li>Reduce magnetizing inductance to 100uH - saturation happens at lower D</li>
              <li>Enable the snubber and see how it protects the circuit</li>
              <li>High Vin + high D = fastest path to saturation</li>
            </ul>
          </div>
        </div>

        {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Deep Insight \u2192')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistWasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: twistWasCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {twistWasCorrect ? 'Exactly Right!' : "Here's What Actually Happens"}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              When duty cycle is too high, the magnetizing current ramps beyond the core's saturation point. <strong>Inductance collapses</strong>, current spikes exponentially, the MOSFET overheats, and the converter fails.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Core Saturation, Snubbers & Leakage
          </h2>

          {[
            {
              title: 'Core Saturation',
              content: 'Every ferrite core has a maximum flux density B_sat (typically 200-400mT). The flux builds as B = (V x t_on) / (N x Ae), where Ae is the core cross-section. When B exceeds B_sat, the permeability drops to near-air values, inductance drops 10-100x, and current spikes destructively. This is why flyback converters typically stay below D = 50%.',
              color: colors.error,
            },
            {
              title: 'Leakage Inductance',
              content: 'Not all magnetic flux couples between primary and secondary. The uncoupled flux is "leakage inductance" (typically 1-5% of magnetizing inductance). When the switch turns OFF, leakage energy (0.5 x L_leak x I^2) cannot transfer to the secondary and creates a dangerous voltage spike across the MOSFET.',
              color: colors.warning,
            },
            {
              title: 'RCD Snubber Design',
              content: 'An RCD snubber (Resistor-Capacitor-Diode) across the primary winding absorbs leakage energy. The diode conducts when switch voltage exceeds the clamp voltage, charging the snubber capacitor. The resistor dissipates the stored energy between cycles. Properly designed, it clamps the MOSFET voltage to a safe level (typically Vin + N x Vout + 50V margin).',
              color: colors.purple,
            },
            {
              title: 'Practical Design Rules',
              content: 'Real flyback designs keep D < 50% for voltage-mode control, use current-mode control to prevent saturation cycle-by-cycle, select cores with adequate B_sat margin (>20%), and always include a snubber circuit. Advanced designs use active clamp circuits to recycle leakage energy instead of wasting it in a resistor.',
              color: colors.secondary,
            },
          ].map((section, i) => (
            <div key={i} style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              borderLeft: `4px solid ${section.color}`,
            }}>
              <h3 style={{ ...typo.h3, color: section.color, marginBottom: '10px' }}>{section.title}</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{section.content}</p>
            </div>
          ))}

          {renderNavDots()}
        </div>
        {renderBottomBar(() => { playSound('success'); nextPhase(); }, 'Real World Applications \u2192')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Flyback Converter"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={{
          h1: typo.h1.fontSize,
          h2: typo.h2.fontSize,
          h3: typo.h3.fontSize,
          body: typo.body.fontSize,
          small: typo.small.fontSize,
          label: '12px',
        }}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;

      // Build answer key
      const answerKey = testQuestions.map((q, i) => {
        const correctOpt = q.options.find(o => o.correct);
        const userOpt = q.options.find(o => o.id === testAnswers[i]);
        return {
          question: q.question,
          scenario: q.scenario,
          userAnswer: userOpt?.label || 'No answer',
          correctAnswer: correctOpt?.label || '',
          isCorrect: testAnswers[i] === correctOpt?.id,
          explanation: q.explanation,
        };
      });

      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '80px 24px 24px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '\u{1F3C6}' : '\u{1F4D6}'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You understand flyback converter technology and isolated power supply design!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer key */}
            <div style={{ textAlign: 'left', marginBottom: '32px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
                Answer Key
              </h3>
              {answerKey.map((a, i) => (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${a.isCorrect ? colors.success : colors.error}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: a.isCorrect ? colors.success : colors.error,
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {a.isCorrect ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                      Q{i + 1}: {a.question}
                    </span>
                  </div>
                  {!a.isCorrect && (
                    <p style={{ ...typo.small, color: colors.error, marginBottom: '4px' }}>
                      Your answer: {a.userAnswer}
                    </p>
                  )}
                  <p style={{ ...typo.small, color: colors.success, marginBottom: '8px' }}>
                    Correct: {a.correctAnswer}
                  </p>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                    {a.explanation}
                  </p>
                </div>
              ))}
            </div>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
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
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Active test
    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'game_completed',
                      gameType: 'flyback-converter',
                      gameTitle: 'Flyback Converter',
                      details: { score, total: 10 },
                      timestamp: Date.now()
                    });
                  }
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
                  minHeight: '44px',
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
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '60px',
        paddingBottom: '100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          {'\u{1F3C6}'}
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Flyback Converter Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '16px' }}>
          You now understand the most common isolated power supply topology - the technology inside every phone charger, laptop adapter, and medical power supply in the world.
        </p>

        {/* Score display */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          maxWidth: '300px',
          width: '100%',
        }}>
          <div style={{ ...typo.h2, color: colors.accent, marginBottom: '4px' }}>
            {testScore} / 10
          </div>
          <div style={{ ...typo.small, color: colors.textMuted }}>
            Test Score - {testScore >= 9 ? 'Outstanding' : testScore >= 7 ? 'Excellent' : 'Good'}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: testScore >= 9 ? `${colors.success}22` : testScore >= 7 ? `${colors.accent}22` : `${colors.warning}22`,
            display: 'inline-block',
          }}>
            <span style={{
              ...typo.small,
              color: testScore >= 9 ? colors.success : testScore >= 7 ? colors.accent : colors.warning,
              fontWeight: 600,
            }}>
              {testScore >= 9 ? 'A+' : testScore >= 8 ? 'A' : testScore >= 7 ? 'B+' : 'B'}
            </span>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
          width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'How flyback converters store and transfer energy',
              'The Vout = Vin x (Ns/Np) x D/(1-D) formula',
              'Galvanic isolation for electrical safety',
              'Transformer turns ratio and duty cycle control',
              'Core saturation and its destructive effects',
              'Snubber circuits for leakage inductance protection',
              'Real-world applications: chargers, medical, PoE',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success, flexShrink: 0 }}>{'\u2713'}</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answer key summary */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Quick Answer Key
          </h3>
          {testQuestions.map((q, i) => {
            const correctOpt = q.options.find(o => o.correct);
            const isCorrect = testAnswers[i] === correctOpt?.id;
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 0',
                borderBottom: i < 9 ? `1px solid ${colors.border}` : 'none',
              }}>
                <span style={{
                  color: isCorrect ? colors.success : colors.error,
                  fontWeight: 700,
                  fontSize: '12px',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  {isCorrect ? '\u2713' : '\u2717'}
                </span>
                <div>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>
                    Q{i + 1}: {q.question.substring(0, 60)}...
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={secondaryButtonStyle}
          >
            Play Again
          </button>
        </div>

        {/* Complete Game button - fixed bottom */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.98), rgba(10, 10, 15, 0.9))',
          borderTop: `1px solid ${colors.border}`,
          zIndex: 1000,
        }}>
          <button
            onClick={() => {
              onGameEvent?.({
                eventType: 'game_completed',
                gameType: 'flyback-converter',
                gameTitle: 'Flyback Converter',
                details: { score: testScore, total: testQuestions.length, mastery_achieved: true },
                timestamp: Date.now()
              });
              window.location.href = '/games';
            }}
            style={{
              width: '100%',
              minHeight: '52px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '12px',
              color: '#f8fafc',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            Complete Game
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default FlybackConverterRenderer;
