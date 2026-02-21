'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';

// ─────────────────────────────────────────────────────────────────────────────
// Strain Gauge & Load Cell - Complete 10-Phase Learning Game (#272)
// How strain gauges convert mechanical deformation into electrical signals
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

interface StrainGaugeSensorRendererProps {
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
    scenario: "A structural engineer places a strain gauge on a steel I-beam supporting a highway bridge. Under normal traffic, the gauge reads 200 microstrain. A heavy overweight truck crosses and the gauge jumps to 800 microstrain.",
    question: "What does this 4x increase in strain tell the engineer?",
    options: [
      { id: 'a', label: "The beam has permanently deformed and needs replacement" },
      { id: 'b', label: "The stress in the beam has increased by 4x, approaching the yield point and needing load restrictions", correct: true },
      { id: 'c', label: "The strain gauge is malfunctioning due to the heavy vibration" },
      { id: 'd', label: "Temperature changes from the truck exhaust affected the reading" }
    ],
    explanation: "Since stress = E x strain (Hooke's Law), a 4x increase in strain means 4x increase in stress. For steel (E = 200 GPa), 800 microstrain corresponds to 160 MPa, which is significant compared to typical yield strength of 250 MPa. This direct relationship between strain gauge reading and structural stress is why strain gauges are the gold standard for structural health monitoring."
  },
  {
    scenario: "A bathroom scale manufacturer uses four strain gauges in a Wheatstone bridge on an aluminum load cell. The scale reads 0.0 kg when empty but shows 0.3 kg after sitting in sunlight for an hour near a window.",
    question: "Why does the scale show a non-zero reading without any weight applied?",
    options: [
      { id: 'a', label: "The aluminum load cell expanded thermally, creating real strain that the gauges detect", correct: true },
      { id: 'b', label: "The strain gauge adhesive has weakened from UV exposure" },
      { id: 'c', label: "Digital electronics always drift after power-on" },
      { id: 'd', label: "The scale needs recalibration every few hours" }
    ],
    explanation: "Thermal expansion of the beam creates actual strain that strain gauges cannot distinguish from load-induced strain. Aluminum expands at 23 ppm/C, so a 20C temperature rise over a 10cm gauge length creates 46 microstrain - equivalent to roughly 0.3 kg of apparent weight. This is why precision scales use temperature-compensated bridges with dummy gauges."
  },
  {
    scenario: "An aerospace engineer must choose between a metal foil strain gauge (GF = 2.1) and a semiconductor gauge (GF = 120) for measuring vibration in a jet engine nacelle where temperatures cycle between -40C and +150C.",
    question: "Which gauge type is more appropriate and why?",
    options: [
      { id: 'a', label: "Semiconductor gauge because its 60x higher sensitivity will capture tiny vibrations" },
      { id: 'b', label: "Metal foil gauge because it has far better temperature stability despite lower sensitivity", correct: true },
      { id: 'c', label: "Either gauge would work equally well in this environment" },
      { id: 'd', label: "Neither gauge type can survive temperatures above 100C" }
    ],
    explanation: "Semiconductor gauges have gauge factors that change 10-15% per 10C, making them unreliable in wide temperature ranges. Metal foil gauges change only 0.1-0.2% per 10C. Over a 190C range, the semiconductor gauge factor could vary by 200-300%, making measurements meaningless. The lower sensitivity of metal foil is compensated by signal amplification. This tradeoff between sensitivity and stability is fundamental in sensor engineering."
  },
  {
    scenario: "A materials testing lab measures the Poisson's ratio of a new composite material. They bond one strain gauge along the tensile axis and another perpendicular to it. Under 1000 N tensile load, the axial gauge reads +500 microstrain and the transverse gauge reads -150 microstrain.",
    question: "What is the Poisson's ratio, and what does it tell us about this material?",
    options: [
      { id: 'a', label: "0.30 - typical of metals, suggesting the composite behaves like a metal", correct: true },
      { id: 'b', label: "3.33 - the material expands more transversely than axially" },
      { id: 'c', label: "-0.30 - the material is an auxetic that expands when pulled" },
      { id: 'd', label: "Cannot determine Poisson's ratio from strain gauge data alone" }
    ],
    explanation: "Poisson's ratio = -(transverse strain / axial strain) = -(-150/500) = 0.30. This is typical of metals and many fiber-reinforced composites. The negative transverse strain shows the material narrows when stretched. Strain gauges in perpendicular rosette configurations are the standard method for measuring Poisson's ratio, a critical material property for structural design."
  },
  {
    scenario: "A crane manufacturer's load cell uses a full Wheatstone bridge (4 active gauges) with 10V excitation and GF = 2.1. At maximum rated load of 50 tonnes, each gauge experiences 1500 microstrain. The amplifier has a gain of 500.",
    question: "What is the approximate bridge output voltage at full load before amplification?",
    options: [
      { id: 'a', label: "About 31.5 mV - calculated from the full bridge equation", correct: true },
      { id: 'b', label: "About 7.5 mV - only one gauge contributes to the output" },
      { id: 'c', label: "About 3.15 V - the bridge directly produces volts not millivolts" },
      { id: 'd', label: "About 150 mV - strain times excitation voltage" }
    ],
    explanation: "For a full Wheatstone bridge: Vout = V_excitation x GF x strain = 10 x 2.1 x 1500e-6 = 31.5 mV. A full bridge produces output equal to GF x strain x V_excitation (for matched gauges in tension/compression pairs). The amplifier then scales this to 31.5 mV x 500 = 15.75 V full-scale output. This tiny millivolt signal is why bridge amplifiers with high common-mode rejection are essential."
  },
  {
    scenario: "A pressure sensor for an industrial boiler uses a strain gauge bonded to a thin steel diaphragm. The sensor reads accurately at installation but drifts upward by 2% over six months. Inspection shows no mechanical damage.",
    question: "What is the most likely cause of the drift?",
    options: [
      { id: 'a', label: "The diaphragm material has work-hardened under cyclic pressure" },
      { id: 'b', label: "Creep in the strain gauge adhesive bond allows the gauge to slowly slip relative to the diaphragm surface", correct: true },
      { id: 'c', label: "Corrosion of the bridge wiring has increased resistance" },
      { id: 'd', label: "The excitation voltage supply has drifted upward" }
    ],
    explanation: "Adhesive creep is the primary long-term drift mechanism in bonded strain gauges. Under sustained loading, the adhesive layer between gauge and substrate slowly deforms, causing the gauge to read slightly higher strain than actually present. High-temperature environments accelerate this. Premium installations use ceramic cements or weldable gauges to eliminate adhesive creep for long-term monitoring applications."
  },
  {
    scenario: "A biomedical engineer designs a force plate for analyzing a runner's gait. Each corner has a load cell with strain gauges. During testing, one corner reads 15% higher than expected, and the error increases with temperature.",
    question: "What is the most likely cause, and how should it be fixed?",
    options: [
      { id: 'a', label: "The load cell at that corner is defective and should be replaced" },
      { id: 'b', label: "One gauge in the bridge is not properly bonded, causing temperature-dependent resistance change that mimics strain", correct: true },
      { id: 'c', label: "The digital signal processor has a calibration error for that channel" },
      { id: 'd', label: "The force plate surface is slightly tilted at that corner" }
    ],
    explanation: "A poorly bonded gauge creates an air gap that acts as thermal insulation. When temperature changes, this gauge responds differently than its bridge partners, creating an imbalance that appears as strain. The temperature dependence is the key diagnostic clue: pure mechanical errors would be temperature-independent. Rebonding the gauge with proper surface preparation and curing eliminates the issue."
  },
  {
    scenario: "An automotive engineer uses strain gauges on a car's suspension A-arm during track testing. The dynamic readings show clear strain signals, but there is also a slow 0.5 Hz oscillation superimposed on the data that correlates with lap times.",
    question: "What is causing the low-frequency oscillation?",
    options: [
      { id: 'a', label: "Resonance in the suspension component at 0.5 Hz" },
      { id: 'b', label: "Temperature cycling as the car alternates between braking (hot) and straight-line (cooling) sections of the track", correct: true },
      { id: 'c', label: "Electromagnetic interference from the car's alternator" },
      { id: 'd', label: "Mechanical fatigue causing progressive weakening per lap" }
    ],
    explanation: "The correlation with lap times reveals a thermal effect: heavy braking heats the A-arm, and straight sections allow cooling. This thermal cycling at lap frequency creates apparent strain through differential thermal expansion between the gauge and substrate. The solution is to use half-bridge or full-bridge configurations with dummy gauges that compensate for temperature, or to high-pass filter the data above 1 Hz to remove thermal drift."
  },
  {
    scenario: "A wind turbine blade has fiber optic strain sensors (FBG) embedded during manufacturing, and also has conventional foil strain gauges bonded on the surface. During operation, the FBG sensors read 2000 microstrain while the surface gauges read 1800 microstrain at the same location.",
    question: "Why do the embedded and surface measurements differ?",
    options: [
      { id: 'a', label: "Fiber optic sensors are inherently less accurate than foil gauges" },
      { id: 'b', label: "The embedded sensor measures internal strain which includes residual manufacturing stresses, while the surface gauge only measures operational strain", correct: true },
      { id: 'c', label: "The adhesive bond of the surface gauge absorbs some of the strain" },
      { id: 'd', label: "Wind loading is always higher on the inside of the blade" }
    ],
    explanation: "Composite manufacturing processes (curing, cooling) create residual stresses that remain locked in the material. The embedded FBG sensor captures both these residual strains (~200 microstrain in this case) plus operational strains, while the surface gauge was bonded after manufacturing and only measures strain changes from that zero point. This 200 microstrain difference represents valuable information about manufacturing quality and fatigue life."
  },
  {
    scenario: "A weighing system for a grain silo uses a strain gauge load cell rated at 50,000 kg. The load cell specifications state: rated output 2 mV/V, combined error 0.03% of rated output, and operating temperature range -30C to +70C with temperature effect on zero of 0.02% of rated output per 10C.",
    question: "If the silo temperature drops from 20C to -20C, how much apparent weight change could the temperature cause?",
    options: [
      { id: 'a', label: "About 40 kg - from the temperature effect specification over the 40C range", correct: true },
      { id: 'b', label: "About 15 kg - combined error already accounts for temperature" },
      { id: 'c', label: "About 200 kg - temperature effects dominate at this scale" },
      { id: 'd', label: "Negligible - load cells are temperature compensated" }
    ],
    explanation: "Temperature effect on zero = 0.02% of rated output per 10C. Over 40C: 0.02% x 4 = 0.08% of 50,000 kg = 40 kg apparent weight change. While the load cell has internal temperature compensation, it only reduces the effect, not eliminates it. For a grain silo holding perhaps 30,000 kg, a 40 kg error (0.13%) is acceptable for inventory management but would be catastrophic for trade-certified weighing where 0.01% accuracy is required."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏗',
    title: 'Structural Health Monitoring',
    short: 'Keeping bridges, buildings, and dams safe',
    tagline: 'How engineers know a bridge is safe to cross 50 years after construction',
    description: 'Thousands of strain gauges embedded in bridges, skyscrapers, and dams continuously monitor structural integrity. They detect fatigue cracking, overloading, foundation settlement, and seismic damage in real-time, enabling preventive maintenance before catastrophic failure.',
    connection: 'The Wheatstone bridge principle you explored is exactly how these sensors detect microstrain changes of 1 part per million in massive structures. A full bridge with temperature-compensating dummy gauges eliminates the thermal drift that would otherwise overwhelm the tiny strain signals.',
    howItWorks: 'Networks of strain gauges are bonded at critical stress points on structural members. Data acquisition systems sample hundreds of channels at rates from 1 Hz (static monitoring) to 10 kHz (dynamic/seismic). Machine learning algorithms compare real-time strain patterns against finite element models to detect anomalies. Wireless nodes with solar power enable remote monitoring of bridges in isolated areas.',
    stats: [
      { value: '600,000+', label: 'Bridges monitored in the US alone', icon: '🌉' },
      { value: '0.1 ppm', label: 'Minimum detectable strain change', icon: '📏' },
      { value: '30+ years', label: 'Continuous monitoring lifetime', icon: '⏱' }
    ],
    examples: [
      'Golden Gate Bridge has 32 accelerometers and 200+ strain gauges monitoring seismic response',
      'Millau Viaduct in France uses fiber-optic strain sensors embedded during construction',
      'Burj Khalifa has 900 sensors including strain gauges monitoring wind-induced sway',
      'Hoover Dam strain gauges have tracked concrete curing stresses since the 1930s'
    ],
    companies: ['National Instruments', 'HBM/HBK', 'Micro-Measurements', 'Kyowa', 'Campbell Scientific', 'Smartec'],
    futureImpact: 'Digital twin technology will combine strain gauge data with AI-driven structural models to predict remaining service life with 95% confidence. By 2030, autonomous drone inspection combined with embedded sensors may eliminate the need for bridge closures during safety assessments.',
    color: '#3b82f6'
  },
  {
    icon: '⚖',
    title: 'Precision Weighing & Load Cells',
    short: 'From bathroom scales to industrial hoppers',
    tagline: 'How 10 millivolts of signal becomes 0.001 kg of accuracy',
    description: 'Every electronic scale from kitchen scales to truck weigh stations uses strain gauge load cells. The same Wheatstone bridge principle measures forces from millinewtons (analytical balances) to meganewtons (rocket thrust stands), differing only in load cell geometry and gauge configuration.',
    connection: 'The relationship between applied force, beam strain, and bridge output voltage you observed is the exact operating principle of every load cell. The linearity of this relationship (strain proportional to force in the elastic region) is what makes strain gauges ideal for precision measurement.',
    howItWorks: 'A load cell is a precision-machined metal element (usually aluminum or stainless steel) designed to deform predictably under load. Four strain gauges in a Wheatstone bridge convert this deformation to a voltage signal. Temperature compensation, creep correction, and nonlinearity compensation are applied through precision resistor networks or digital signal processing.',
    stats: [
      { value: '0.01%', label: 'Accuracy of legal-for-trade scales', icon: '🎯' },
      { value: '2 mV/V', label: 'Typical load cell rated output', icon: '⚡' },
      { value: '10M+', label: 'Load cells manufactured annually worldwide', icon: '🏭' }
    ],
    examples: [
      'Mettler Toledo analytical balances resolve 0.0001 grams using semiconductor strain gauges',
      'Truck scales by Rice Lake Weighing measure 80,000 kg with 5 kg resolution',
      'SpaceX uses strain gauge load cells for Raptor engine thrust measurement at 2.2 MN',
      'Amazon fulfillment centers use load cells on every shelf for automatic inventory tracking'
    ],
    companies: ['Mettler Toledo', 'Rice Lake', 'HBM', 'Vishay', 'Flintec', 'Zemic'],
    futureImpact: 'MEMS-based strain gauge load cells will shrink precision weighing to chip-scale, enabling smart packaging that monitors its own contents. Graphene strain gauges promise 100x higher sensitivity with perfect linearity, potentially replacing semiconductor gauges in medical and aerospace applications.',
    color: '#10b981'
  },
  {
    icon: '🚗',
    title: 'Automotive Testing & Safety',
    short: 'Crash testing, durability, and performance optimization',
    tagline: 'Why your car survives a crash exactly as designed',
    description: 'Every vehicle undergoes extensive strain gauge testing during development. Crash tests use hundreds of gauges to validate crumple zone behavior. Durability testing runs instrumented cars over rough roads for thousands of hours. F1 teams use real-time strain data for aerodynamic optimization and structural monitoring.',
    connection: 'The dynamic response of strain gauges that you saw when applying and releasing force is critical for automotive impact testing. At impact rates of 20+ m/s, strain gauges must respond in microseconds to capture the deformation wavefront propagating through the vehicle structure.',
    howItWorks: 'Strain gauge rosettes (three gauges at 0/45/90 degrees) are bonded at critical locations on body panels, chassis members, and suspension components. High-speed data acquisition at 50-100 kHz captures transient impact events. Strain data is correlated with high-speed camera footage and accelerometer data to build complete deformation maps.',
    stats: [
      { value: '500+', label: 'Strain gauges on a single crash test vehicle', icon: '📊' },
      { value: '100 kHz', label: 'Sampling rate for impact testing', icon: '⚡' },
      { value: '$1M+', label: 'Cost of a fully instrumented crash test', icon: '💰' }
    ],
    examples: [
      'Tesla Model 3 crash structure was optimized using strain gauge data from 45 prototype crashes',
      'F1 cars have real-time strain monitoring on suspension to detect fatigue at 300 km/h',
      'Euro NCAP uses standardized strain gauge locations for comparing vehicle safety ratings',
      'Toyota durability tests run instrumented vehicles over Belgian pavé for 300,000 km equivalent'
    ],
    companies: ['Kistler', 'PCB Piezotronics', 'HBM', 'Micro-Measurements', 'IMC', 'Dewetron'],
    futureImpact: 'Printed strain gauge arrays integrated into vehicle body panels during manufacturing will enable lifetime structural health monitoring. AI will predict component failure 10,000 km before it occurs, enabling condition-based maintenance that eliminates both premature replacement and unexpected breakdowns.',
    color: '#f59e0b'
  },
  {
    icon: '🏥',
    title: 'Biomedical Force Measurement',
    short: 'From surgical robots to prosthetic limbs',
    tagline: 'How a surgeon feels the difference between healthy and diseased tissue through a robot',
    description: 'Strain gauge sensors provide the sense of touch in surgical robots, measure bite force in dental implants, analyze gait in rehabilitation, and enable prosthetic hands that grip with precisely controlled force. Miniaturized strain gauges on flexible substrates conform to biological surfaces.',
    connection: 'The sensitivity of the Wheatstone bridge to tiny resistance changes enables detection of forces from 0.01 N (tissue palpation) to 10,000 N (spinal loading). The temperature compensation techniques you learned are essential because the body maintains 37C but surgical instruments cycle between room temperature and body temperature.',
    howItWorks: 'MEMS strain gauges on silicon or polyimide substrates are integrated into catheter tips, surgical tool handles, and prosthetic joints. Biocompatible encapsulation protects gauges from body fluids. Wireless telemetry transmits strain data from implanted sensors through tissue. Signal processing extracts force vectors from multi-axis strain gauge rosettes.',
    stats: [
      { value: '0.01 N', label: 'Force resolution in surgical robots', icon: '🔬' },
      { value: '1 mm', label: 'Strain gauge size for catheter-tip sensors', icon: '📏' },
      { value: '10 years', label: 'Implanted sensor operational lifetime', icon: '❤' }
    ],
    examples: [
      'Intuitive Surgical da Vinci robot uses strain gauges for haptic force feedback',
      'Smart knee implants by Zimmer Biomet use embedded strain gauges to monitor loading',
      'AMTI force plates with strain gauge load cells are the gold standard for gait analysis',
      'Osseointegrated prosthetics from Integrum use strain gauges for osseoperception feedback'
    ],
    companies: ['Intuitive Surgical', 'Zimmer Biomet', 'AMTI', 'Tekscan', 'ATI Industrial', 'Kistler'],
    futureImpact: 'Biodegradable strain gauges that dissolve after healing will monitor fracture repair in real-time without removal surgery. Neural-interfaced prosthetics with strain gauge arrays will provide naturalistic touch sensation, enabling amputees to feel texture, temperature, and pain through their artificial limbs.',
    color: '#ec4899'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM
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
  strain: '#a855f7',
  voltage: '#3b82f6',
  resistance: '#ec4899',
  force: '#f97316',
  gauge: '#22c55e',
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
// BEAM MATERIAL DATA
// ─────────────────────────────────────────────────────────────────────────────
const beamMaterials: Record<string, { name: string; E: number; color: string; thermalCoeff: number }> = {
  steel: { name: 'Steel', E: 200, color: '#94a3b8', thermalCoeff: 12 },
  aluminum: { name: 'Aluminum', E: 69, color: '#cbd5e1', thermalCoeff: 23 },
  titanium: { name: 'Titanium', E: 116, color: '#a78bfa', thermalCoeff: 8.6 },
  copper: { name: 'Copper', E: 117, color: '#f97316', thermalCoeff: 17 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const StrainGaugeSensorRenderer: React.FC<StrainGaugeSensorRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  const { isMobile } = useViewport();

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
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) setPhase(gamePhase as Phase);
  }, [gamePhase]);

  // Emit game event helper
  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'strain-gauge-sensor',
        gameTitle: 'Strain Gauge & Load Cell',
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

  // ── Simulation state ──
  const [appliedForce, setAppliedForce] = useState(50); // Newtons
  const [materialKey, setMaterialKey] = useState<string>('steel');
  const [gaugeFactor, setGaugeFactor] = useState(2.1); // metal foil default
  const [excitationVoltage, setExcitationVoltage] = useState(5); // Volts
  const [temperature, setTemperature] = useState(25); // Celsius

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [useDummyGauge, setUseDummyGauge] = useState(false);

  // ── Physics calculations ──
  const material = beamMaterials[materialKey];

  const calculateValues = useCallback(() => {
    // Cantilever beam parameters
    const beamLength = 0.2; // 200mm
    const beamWidth = 0.02; // 20mm
    const beamThickness = 0.005; // 5mm
    const I = (beamWidth * Math.pow(beamThickness, 3)) / 12; // second moment of area
    const E_Pa = material.E * 1e9; // GPa to Pa

    // Bending stress at fixed end: sigma = M*y/I where M = F*L, y = t/2
    const moment = appliedForce * beamLength;
    const stress = (moment * (beamThickness / 2)) / I; // Pa

    // Strain: epsilon = sigma / E
    const strain = stress / E_Pa; // dimensionless
    const strainMicro = strain * 1e6; // microstrain

    // Deflection at free end: delta = F*L^3 / (3*E*I)
    const deflection = (appliedForce * Math.pow(beamLength, 3)) / (3 * E_Pa * I); // meters
    const deflectionMM = deflection * 1000;

    // Resistance change: dR/R = GF * epsilon
    const baseResistance = 350; // Ohms (standard gauge)
    const dRoverR = gaugeFactor * strain;
    const dR = dRoverR * baseResistance;
    const newResistance = baseResistance + dR;

    // Thermal apparent strain (without compensation)
    const tempDelta = temperature - 25; // reference 25C
    const thermalStrain = material.thermalCoeff * 1e-6 * tempDelta; // apparent strain from thermal expansion
    const thermalStrainMicro = thermalStrain * 1e6;

    // Total apparent strain without dummy gauge
    const totalStrainNoDummy = strain + thermalStrain;
    // With dummy gauge, thermal effects cancel
    const effectiveStrain = useDummyGauge ? strain : totalStrainNoDummy;

    // Wheatstone bridge output: Vout = Vex * GF * epsilon / 4 (quarter bridge)
    // Full bridge: Vout = Vex * GF * epsilon
    const bridgeOutputQuarter = excitationVoltage * gaugeFactor * effectiveStrain / 4;
    const bridgeOutputFull = excitationVoltage * gaugeFactor * effectiveStrain;
    const bridgeOutputMV = bridgeOutputQuarter * 1000; // mV

    return {
      strain, strainMicro, stress, deflectionMM,
      dR, dRoverR, newResistance, baseResistance,
      bridgeOutputQuarter, bridgeOutputFull, bridgeOutputMV,
      thermalStrainMicro, effectiveStrain,
      totalStrainNoDummy: totalStrainNoDummy * 1e6,
    };
  }, [appliedForce, material, gaugeFactor, excitationVoltage, temperature, useDummyGauge]);

  const values = calculateValues();

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
    playSound(score >= 7 ? 'success' : 'failure');
    emitGameEvent('game_completed', { score, total: 10, passed: score >= 7 });
  };

  // Predictions
  const predictions = [
    { id: 'no_change', label: 'The bridge output voltage stays at zero regardless of force' },
    { id: 'linear', label: 'Bridge output increases linearly with applied force because strain is proportional to stress', correct: true },
    { id: 'quadratic', label: 'Bridge output increases with the square of force' },
    { id: 'random', label: 'Bridge output changes unpredictably due to material imperfections' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Temperature has no effect on strain gauge readings' },
    { id: 'compensated', label: 'A dummy gauge in the bridge cancels thermal effects because both gauges experience the same temperature change', correct: true },
    { id: 'doubles', label: 'Adding a dummy gauge doubles the thermal error' },
    { id: 'only_cold', label: 'Temperature compensation is only needed below 0C' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR
  // ─────────────────────────────────────────────────────────────────────────────
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const progressPercent = ((currentIdx + 1) / phaseOrder.length) * 100;
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: colors.bgDark, borderBottom: '1px solid #334155' }} role="navigation" aria-label="Phase navigation">
        <div role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${currentIdx + 1} of ${phaseOrder.length} phases`} style={{ height: '4px', backgroundColor: '#334155', width: '100%' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(to right, #f59e0b, #f97316)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
          <button onClick={goBack} disabled={currentIdx === 0} aria-label="Go to previous phase" style={{ minHeight: '44px', minWidth: '44px', borderRadius: '8px', border: 'none', background: 'transparent', color: currentIdx === 0 ? '#475569' : '#cbd5e1', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontSize: '18px', opacity: currentIdx === 0 ? 0.3 : 1 }}>
            &#x2190;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }} role="tablist" aria-label="Phase dots">
              {phaseOrder.map((p, i) => (
                <button key={p} onClick={() => goToPhase(p)} role="tab" aria-selected={i === currentIdx} aria-label={`${phaseLabels[p]}${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`} style={{ minHeight: '44px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0, borderRadius: '9999px' }}>
                  <span style={{ display: 'block', height: '8px', borderRadius: '9999px', transition: 'all 0.3s ease', width: i === currentIdx ? '24px' : '8px', background: i === currentIdx ? '#f59e0b' : i < currentIdx ? '#10b981' : '#475569' }} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(148, 163, 184, 0.7)', marginLeft: '8px' }}>{currentIdx + 1}/{phaseOrder.length}</span>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>
            {phaseLabels[phase]}
          </div>
        </div>
      </nav>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG VISUALIZATION - Beam with strain gauge bending under load
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBeamSVG = (interactive: boolean, showTemp: boolean = false) => {
    const W = 520;
    const H = 380;
    // Beam parameters
    const beamX = 60;
    const beamY = 140;
    const beamLen = 340;
    const beamH = 20;
    // Deflection proportional to force, scaled for visual
    const maxVisualDeflection = 80;
    const deflectFrac = Math.min(values.deflectionMM / 15, 1);
    const tipDeflect = deflectFrac * maxVisualDeflection;

    // Gauge position on beam (upper surface, near fixed end)
    const gaugeX = beamX + 40;
    const gaugeLen = 60;

    // Strain color intensity
    const strainIntensity = Math.min(Math.abs(values.strainMicro) / 2000, 1);
    const gaugeColor = `rgb(${Math.floor(34 + strainIntensity * 130)}, ${Math.floor(197 - strainIntensity * 100)}, ${Math.floor(94 - strainIntensity * 50)})`;

    // Bridge output bar scale
    const maxBridgeMV = 20;
    const bridgeFrac = Math.min(Math.abs(values.bridgeOutputMV) / maxBridgeMV, 1);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', maxWidth: '520px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Strain Gauge Beam Visualization">
        <defs>
          <linearGradient id="sgBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={material.color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={material.color} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gaugeColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={gaugeColor} stopOpacity="0.6" />
          </linearGradient>
          <radialGradient id="forceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <filter id="sgGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#sgBg)" rx="12" />

        {/* Title */}
        <text x={W / 2} y="22" fill={colors.textPrimary} fontSize="13" fontWeight="bold" textAnchor="middle">Cantilever Beam with Strain Gauge</text>

        {/* Fixed wall/clamp */}
        <rect x={beamX - 15} y={beamY - 30} width="15" height={beamH + 60} rx="2" fill="#475569" stroke="#64748b" strokeWidth="1" />
        {/* Hatching lines for wall */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={`hatch-${i}`} x1={beamX - 14} y1={beamY - 25 + i * 15} x2={beamX - 3} y2={beamY - 15 + i * 15} stroke="#334155" strokeWidth="1.5" />
        ))}

        {/* Beam - bends under load using quadratic Bezier */}
        <path
          d={`M ${beamX} ${beamY} Q ${beamX + beamLen * 0.6} ${beamY + tipDeflect * 0.3} ${beamX + beamLen} ${beamY + tipDeflect} L ${beamX + beamLen} ${beamY + beamH + tipDeflect} Q ${beamX + beamLen * 0.6} ${beamY + beamH + tipDeflect * 0.3} ${beamX} ${beamY + beamH} Z`}
          fill="url(#beamGrad)"
          stroke={material.color}
          strokeWidth="1.5"
        />

        {/* Strain gauge on top surface */}
        <rect
          x={gaugeX}
          y={beamY - 6}
          width={gaugeLen + strainIntensity * 4}
          height="6"
          rx="1"
          fill="url(#gaugeGrad)"
          stroke={colors.gauge}
          strokeWidth="0.8"
        >
          {interactive && <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />}
        </rect>
        {/* Gauge zigzag pattern */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const x1g = gaugeX + 4 + i * 7;
          const x2g = gaugeX + 4 + i * 7 + 3.5;
          return (
            <line key={`zig-${i}`} x1={x1g} y1={beamY - 5} x2={x2g} y2={beamY - 1} stroke={colors.gauge} strokeWidth="0.6" opacity="0.7" />
          );
        })}
        {/* Gauge wires */}
        <line x1={gaugeX} y1={beamY - 3} x2={gaugeX - 15} y2={beamY - 20} stroke="#22c55e" strokeWidth="1" />
        <line x1={gaugeX + gaugeLen} y1={beamY - 3} x2={gaugeX + gaugeLen + 15} y2={beamY - 20} stroke="#22c55e" strokeWidth="1" />
        <text x={gaugeX + gaugeLen / 2} y={beamY - 12} fill={colors.gauge} fontSize="9" textAnchor="middle" fontWeight="bold">STRAIN GAUGE</text>

        {/* Force arrow at tip */}
        {appliedForce > 0 && (
          <g>
            <ellipse cx={beamX + beamLen} cy={beamY + tipDeflect - 20} rx={8 + appliedForce / 20} ry={6 + appliedForce / 30} fill="url(#forceGlow)" />
            <line x1={beamX + beamLen} y1={beamY + tipDeflect - 50} x2={beamX + beamLen} y2={beamY + tipDeflect - 5} stroke="#f97316" strokeWidth="3" markerEnd="" />
            <polygon points={`${beamX + beamLen},${beamY + tipDeflect - 2} ${beamX + beamLen - 6},${beamY + tipDeflect - 12} ${beamX + beamLen + 6},${beamY + tipDeflect - 12}`} fill="#f97316" />
            <text x={beamX + beamLen + 14} y={beamY + tipDeflect - 25} fill={colors.force} fontSize="12" fontWeight="bold">{appliedForce} N</text>
          </g>
        )}

        {/* Deflection annotation */}
        {tipDeflect > 2 && (
          <g>
            <line x1={beamX + beamLen + 30} y1={beamY} x2={beamX + beamLen + 30} y2={beamY + tipDeflect} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="3 2" />
            <text x={beamX + beamLen + 38} y={beamY + tipDeflect / 2 + 4} fill={colors.textMuted} fontSize="9">{values.deflectionMM.toFixed(2)} mm</text>
          </g>
        )}

        {/* Wheatstone Bridge Diagram (bottom portion) */}
        <g transform="translate(60, 210)">
          {/* Diamond shape */}
          <line x1="60" y1="0" x2="120" y2="50" stroke="#475569" strokeWidth="1.5" />
          <line x1="120" y1="50" x2="60" y2="100" stroke="#475569" strokeWidth="1.5" />
          <line x1="60" y1="100" x2="0" y2="50" stroke="#475569" strokeWidth="1.5" />
          <line x1="0" y1="50" x2="60" y2="0" stroke="#475569" strokeWidth="1.5" />

          {/* Resistor symbols on each arm */}
          {/* R1 (active gauge) - top right */}
          <rect x="80" y="16" width="30" height="12" rx="2" fill="rgba(34, 197, 94, 0.3)" stroke={colors.gauge} strokeWidth="1" />
          <text x="95" y="25" fill={colors.gauge} fontSize="8" textAnchor="middle" fontWeight="bold">R1</text>

          {/* R2 - bottom right */}
          <rect x="80" y="70" width="30" height="12" rx="2" fill="rgba(148, 163, 184, 0.2)" stroke="#94a3b8" strokeWidth="1" />
          <text x="95" y="79" fill="#94a3b8" fontSize="8" textAnchor="middle">R2</text>

          {/* R3 - bottom left */}
          <rect x="10" y="70" width="30" height="12" rx="2" fill="rgba(148, 163, 184, 0.2)" stroke="#94a3b8" strokeWidth="1" />
          <text x="25" y="79" fill="#94a3b8" fontSize="8" textAnchor="middle">R3</text>

          {/* R4 - top left */}
          <rect x="10" y="16" width="30" height="12" rx="2" fill={showTemp && useDummyGauge ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.2)'} stroke={showTemp && useDummyGauge ? colors.gauge : '#94a3b8'} strokeWidth="1" />
          <text x="25" y="25" fill={showTemp && useDummyGauge ? colors.gauge : '#94a3b8'} fontSize="8" textAnchor="middle" fontWeight={showTemp && useDummyGauge ? 'bold' : 'normal'}>{showTemp && useDummyGauge ? 'Rd' : 'R4'}</text>

          {/* Vex labels */}
          <text x="60" y="-6" fill={colors.voltage} fontSize="9" textAnchor="middle" fontWeight="bold">V_ex = {excitationVoltage}V</text>
          <text x="60" y="115" fill={colors.textMuted} fontSize="9" textAnchor="middle">GND</text>

          {/* Vout labels */}
          <text x="-18" y="53" fill={colors.accent} fontSize="9" textAnchor="end" fontWeight="bold">V-</text>
          <text x="140" y="53" fill={colors.accent} fontSize="9" fontWeight="bold">V+</text>
        </g>

        {/* Bridge output info box */}
        <rect x="250" y="220" width="250" height="130" rx="8" fill="rgba(0,0,0,0.5)" stroke="#334155" strokeWidth="1" />
        <text x="375" y="240" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="bold">Bridge Output</text>

        {/* Output voltage bar */}
        <rect x="270" y="250" width="210" height="14" rx="4" fill="rgba(0,0,0,0.4)" />
        <rect x="270" y="250" width={210 * bridgeFrac} height="14" rx="4" fill={colors.accent}>
          <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <text x="375" y="260" fill={colors.textPrimary} fontSize="9" textAnchor="middle" fontWeight="bold">{values.bridgeOutputMV.toFixed(3)} mV</text>

        {/* Data readouts */}
        <text x="270" y="285" fill={colors.strain} fontSize="10" fontWeight="bold">Strain: {values.strainMicro.toFixed(1)} ue</text>
        <text x="270" y="300" fill={colors.resistance} fontSize="10">dR: {values.dR.toFixed(4)} Ohm</text>
        <text x="270" y="315" fill={colors.voltage} fontSize="10">R: {values.newResistance.toFixed(3)} / {values.baseResistance} Ohm</text>
        <text x="270" y="330" fill={colors.force} fontSize="10">Stress: {(values.stress / 1e6).toFixed(1)} MPa</text>

        {/* Temperature indicator if showing twist */}
        {showTemp && (
          <g>
            <rect x="440" y="140" width="60" height="60" rx="6" fill="rgba(0,0,0,0.4)" stroke="#334155" strokeWidth="1" />
            <text x="470" y="157" fill={temperature < 15 ? '#38bdf8' : temperature > 35 ? '#f87171' : '#fbbf24'} fontSize="10" textAnchor="middle" fontWeight="bold">{temperature}C</text>
            {/* Thermometer visual */}
            <rect x="465" y="162" width="10" height="28" rx="5" fill="rgba(0,0,0,0.4)" stroke="#475569" strokeWidth="1" />
            <rect x="467" y={162 + 24 * (1 - (temperature + 20) / 80)} width="6" height={24 * ((temperature + 20) / 80)} rx="3" fill={temperature < 15 ? '#38bdf8' : temperature > 35 ? '#f87171' : '#fbbf24'} />
            <text x="470" y="198" fill={colors.textMuted} fontSize="8" textAnchor="middle">Temp</text>
          </g>
        )}

        {/* Formula */}
        <text x={W / 2} y={H - 15} fill={colors.textMuted} fontSize="10" textAnchor="middle">dR/R = GF x e | V_out = V_ex x GF x e / 4</text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLS PANEL
  // ─────────────────────────────────────────────────────────────────────────────
  const renderControls = (showTemp: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Applied Force: {appliedForce} N</label>
        <input type="range" min="0" max="200" step="5" value={appliedForce}
          onChange={(e) => { setAppliedForce(parseInt(e.target.value)); emitGameEvent('slider_changed', { slider: 'force', value: parseInt(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.force, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>0 N</span><span>200 N</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Beam Material: {material.name} (E = {material.E} GPa)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(beamMaterials).map(([key, mat]) => (
            <button key={key} onClick={() => { setMaterialKey(key); playSound('click'); emitGameEvent('selection_made', { material: key }); }} style={{
              padding: '8px 14px', borderRadius: '8px', border: materialKey === key ? `2px solid ${mat.color}` : '1px solid rgba(255,255,255,0.2)',
              background: materialKey === key ? `${mat.color}22` : 'transparent', color: materialKey === key ? mat.color : colors.textMuted,
              cursor: 'pointer', fontSize: '12px', fontWeight: materialKey === key ? 'bold' : 'normal', minHeight: '36px'
            }}>
              {mat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Gauge Factor (GF): {gaugeFactor.toFixed(1)}</label>
        <input type="range" min="1" max="150" step="0.5" value={gaugeFactor}
          onChange={(e) => { setGaugeFactor(parseFloat(e.target.value)); emitGameEvent('slider_changed', { slider: 'gaugeFactor', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.gauge, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>1.0 (metal)</span><span>150 (semiconductor)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Excitation Voltage: {excitationVoltage.toFixed(1)} V</label>
        <input type="range" min="1" max="15" step="0.5" value={excitationVoltage}
          onChange={(e) => { setExcitationVoltage(parseFloat(e.target.value)); emitGameEvent('slider_changed', { slider: 'excitation', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: colors.voltage, touchAction: 'pan-y' as const }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>1 V</span><span>15 V</span>
        </div>
      </div>

      {showTemp && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '13px' }}>Temperature: {temperature}C</label>
            <input type="range" min="-20" max="60" step="1" value={temperature}
              onChange={(e) => { setTemperature(parseInt(e.target.value)); emitGameEvent('slider_changed', { slider: 'temperature', value: parseInt(e.target.value) }); }}
              style={{ width: '100%', height: '28px', cursor: 'pointer', accentColor: temperature < 15 ? '#38bdf8' : temperature > 35 ? '#f87171' : '#fbbf24', touchAction: 'pan-y' as const }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
              <span>-20C (cold)</span><span>60C (hot)</span>
            </div>
          </div>
          <div>
            <button onClick={() => { setUseDummyGauge(!useDummyGauge); playSound('click'); }} style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: useDummyGauge ? `2px solid ${colors.gauge}` : '1px solid rgba(255,255,255,0.2)',
              background: useDummyGauge ? 'rgba(34, 197, 94, 0.2)' : 'transparent', color: useDummyGauge ? colors.gauge : colors.textMuted,
              cursor: 'pointer', fontSize: '13px', fontWeight: useDummyGauge ? 'bold' : 'normal', minHeight: '44px'
            }}>
              {useDummyGauge ? 'Dummy Gauge: ON (Compensated)' : 'Dummy Gauge: OFF (Uncompensated)'}
            </button>
            {!useDummyGauge && Math.abs(values.thermalStrainMicro) > 1 && (
              <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid #ef4444' }}>
                <p style={{ color: '#f87171', fontSize: '11px', margin: 0 }}>
                  Thermal apparent strain: {values.thermalStrainMicro.toFixed(1)} ue ({Math.abs(values.thermalStrainMicro / (values.strainMicro || 1) * 100).toFixed(1)}% of mechanical strain)
                </p>
              </div>
            )}
            {useDummyGauge && Math.abs(temperature - 25) > 1 && (
              <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#22c55e', fontSize: '11px', margin: 0 }}>
                  Thermal strain cancelled! Dummy gauge compensates {values.thermalStrainMicro.toFixed(1)} ue of thermal drift.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION BAR
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    let canProceed = true;
    let nextLabel = 'Continue';

    switch (phase) {
      case 'hook': nextLabel = 'Start Exploring'; break;
      case 'predict': canProceed = !!prediction; nextLabel = 'See the Experiment'; break;
      case 'play': nextLabel = 'Continue to Review'; break;
      case 'review': nextLabel = 'Next: A Twist!'; break;
      case 'twist_predict': canProceed = !!twistPrediction; nextLabel = 'See the Effect'; break;
      case 'twist_play': nextLabel = 'Continue to Explanation'; break;
      case 'twist_review': nextLabel = 'Real-World Applications'; break;
      case 'transfer': return null;
      case 'test': canProceed = testSubmitted && testScore >= 7; nextLabel = testSubmitted ? (testScore >= 7 ? 'Continue to Mastery' : 'Review & Retry') : 'Submit Test'; break;
      case 'mastery': nextLabel = 'Complete Lesson'; break;
    }

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '12px', zIndex: 1000 }}>
        <button onClick={goBack} disabled={isFirst} style={{
          padding: '10px 20px', borderRadius: '8px', border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
          background: 'transparent', color: isFirst ? colors.textMuted : colors.textPrimary, fontWeight: 'bold', cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isFirst ? 0.5 : 1, minHeight: '44px'
        }}>Back</button>
        <button onClick={phase === 'test' && !testSubmitted ? submitTest : phase === 'test' && testSubmitted && testScore < 7 ? () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); } : goNext} disabled={!canProceed && phase !== 'test'} style={{
          padding: '10px 28px', borderRadius: '8px', border: 'none',
          background: (canProceed || (phase === 'test' && !testSubmitted)) ? colors.accent : 'rgba(255,255,255,0.1)',
          color: (canProceed || (phase === 'test' && !testSubmitted)) ? 'white' : colors.textMuted, fontWeight: 'bold',
          cursor: (canProceed || (phase === 'test' && !testSubmitted)) ? 'pointer' : 'not-allowed', fontSize: '13px', flex: 1, maxWidth: '280px', minHeight: '44px'
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
              <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>Strain Gauge & Load Cell</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 400, marginBottom: '20px' }}>
                The invisible sensor that feels every force
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '20px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, margin: 0 }}>
                  <strong>How does a bathroom scale know your weight to 0.1 kg?</strong> It uses a tiny metallic pattern bonded to a metal beam.
                  When you step on, the beam bends by less than the width of a human hair, and the pattern's electrical resistance changes by
                  0.001%. A clever circuit called a Wheatstone bridge detects this microscopic change and converts it to a precise weight reading.
                </p>
              </div>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              {renderBeamSVG(true)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 400, lineHeight: 1.6 }}>
                  A <strong style={{ color: colors.gauge }}>strain gauge</strong> is a resistor that changes value when stretched or compressed.
                  The key equation is: <strong style={{ color: colors.strain }}>dR/R = GF x e</strong>, where GF is the gauge factor
                  (~2 for metal foil, ~100 for semiconductor) and e (epsilon) is the mechanical strain.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400, marginTop: '12px' }}>
                  Connected in a <strong>Wheatstone bridge</strong>, even a tiny strain of 1 microstrain (0.0001%) produces a measurable
                  voltage output. This principle is used in load cells, pressure sensors, accelerometers, and torque sensors.
                </p>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.strain}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.small, margin: 0 }}>
                  <strong>Try it now:</strong> Drag the force slider and watch the beam bend. Notice how the strain gauge reading and bridge output voltage change!
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
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What happens to the bridge output when force is applied?</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              {renderBeamSVG(false)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>Understanding the Setup</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  A strain gauge (R = 350 Ohm, GF = 2.1) is bonded to the top surface of a cantilever beam.
                  When force is applied at the free end, the beam bends and the gauge stretches.
                  The gauge is connected in a <strong style={{ color: colors.voltage }}>Wheatstone bridge</strong> with
                  excitation voltage of {excitationVoltage}V.
                </p>
                <p style={{ color: colors.textMuted, fontSize: typo.label, marginTop: '8px' }}>
                  Beam: {material.name} | E = {material.E} GPa | Length = 200 mm | Thickness = 5 mm
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>When you double the applied force, the bridge output voltage will...</p>
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
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Explore the Strain Gauge</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Apply force, change materials, adjust the gauge - see the output respond</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.voltage}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Observe carefully:</strong> Notice how strain, resistance change, and bridge output are all proportional to force. Try switching to aluminum - the same force produces more strain because aluminum has a lower Young's modulus.
                </p>
              </div>
            </div>

            {/* Side-by-side layout */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start', padding: `0 ${typo.pagePadding}` }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderBeamSVG(true)}
              </div>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, background: colors.bgCard, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {renderControls(false)}
              </div>
            </div>

            {/* Key equations */}
            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <h4 style={{ color: colors.strain, marginBottom: '8px', fontSize: typo.small }}>Key Relationships</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)' }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>Strain</p>
                    <p style={{ color: colors.strain, fontSize: typo.small, fontWeight: 'bold', margin: '2px 0 0 0' }}>e = sigma / E = {values.strainMicro.toFixed(1)} ue</p>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)' }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>Resistance Change</p>
                    <p style={{ color: colors.resistance, fontSize: typo.small, fontWeight: 'bold', margin: '2px 0 0 0' }}>dR/R = GF x e = {(values.dRoverR * 1e6).toFixed(1)} ppm</p>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)' }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>Bridge Output</p>
                    <p style={{ color: colors.accent, fontSize: typo.small, fontWeight: 'bold', margin: '2px 0 0 0' }}>V_out = {values.bridgeOutputMV.toFixed(3)} mV</p>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)' }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>Beam Deflection</p>
                    <p style={{ color: colors.force, fontSize: typo.small, fontWeight: 'bold', margin: '2px 0 0 0' }}>delta = {values.deflectionMM.toFixed(3)} mm</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'review': {
        const predictionWasCorrect = prediction === 'linear';
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Understanding Strain Gauges</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Let's connect what you observed to the physics</p>
            </div>

            <div style={{
              background: predictionWasCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${predictionWasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: predictionWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {predictionWasCorrect ? 'Excellent Prediction!' : 'Close, but let us see why...'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                <strong>The bridge output is indeed linear with force!</strong> This is because every step in the chain is linear:
                Force leads to stress (sigma = F*L*y/I), stress leads to strain (e = sigma/E), strain leads to resistance change (dR = GF*e*R),
                and resistance change leads to bridge voltage output.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: typo.heading }}>The Complete Signal Chain</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.force }}>Step 1 - Mechanics:</strong><br/>
                    Applied force creates bending moment: M = F x L<br/>
                    Bending stress at surface: sigma = M x y / I<br/>
                    For our beam: sigma = F x L x (t/2) / (b x t^3 / 12)
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.strain }}>Step 2 - Material Response:</strong><br/>
                    Strain from Hooke's Law: e = sigma / E<br/>
                    Steel (E = 200 GPa) produces less strain than aluminum (E = 69 GPa) for the same stress.
                    This is why aluminum load cells are more sensitive than steel ones.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.resistance }}>Step 3 - Gauge Response:</strong><br/>
                    Resistance change: dR/R = GF x e<br/>
                    Metal foil gauges (GF ~ 2) are stable but produce tiny changes.
                    Semiconductor gauges (GF ~ 100+) are 50x more sensitive but temperature-dependent.
                  </p>
                  <p>
                    <strong style={{ color: colors.voltage }}>Step 4 - Bridge Circuit:</strong><br/>
                    Quarter bridge output: V_out = V_ex x GF x e / 4<br/>
                    Typical output: 0.5 to 30 mV for full-scale load. This tiny signal requires
                    precision amplification with excellent noise rejection.
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${colors.voltage}` }}>
                <h4 style={{ color: colors.voltage, fontSize: typo.small, marginBottom: '6px' }}>Why Use a Wheatstone Bridge?</h4>
                <p style={{ color: colors.textSecondary, fontSize: typo.label, lineHeight: 1.6 }}>
                  A single gauge resistance change of 0.001% is impossible to measure directly. The Wheatstone bridge
                  converts this tiny change into a differential voltage that can be amplified. The bridge also inherently
                  rejects common-mode noise from power supply variations and electromagnetic interference.
                </p>
              </div>
            </div>
          </>
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // TWIST PREDICT PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.accent, fontSize: typo.heading, marginBottom: '8px' }}>The Temperature Problem</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Strain gauges have a hidden enemy: thermal expansion</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.error}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, margin: 0 }}>
                  <strong>New Challenge:</strong> A strain gauge bonded to an aluminum beam reads 500 microstrain at 25C under load.
                  The temperature changes to 45C. The aluminum expands at 23 ppm/C, creating apparent strain that the gauge
                  cannot distinguish from real mechanical strain. An engineer proposes adding a second "dummy" gauge
                  to the opposite arm of the Wheatstone bridge, bonded to an unloaded piece of the same aluminum.
                </p>
              </div>
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>What will the dummy gauge do to the temperature error?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twistPredictions.map((p) => (
                  <button key={p.id} onClick={() => { setTwistPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id, phase: 'twist' }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
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
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Temperature Compensation</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Toggle the dummy gauge and change temperature to see the effect</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.voltage}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Experiment:</strong> Set force to 100N, then sweep temperature from -20C to 60C.
                  First with dummy gauge OFF, then ON. Watch the bridge output change (or not change) with temperature.
                </p>
              </div>
            </div>

            {/* Side-by-side layout */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start', padding: `0 ${typo.pagePadding}` }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderBeamSVG(true, true)}
              </div>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, background: colors.bgCard, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {renderControls(true)}
              </div>
            </div>

            {/* Comparison readout */}
            <div style={{ padding: typo.pagePadding }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ color: colors.error, fontSize: typo.small, marginBottom: '6px' }}>Without Compensation</h4>
                  <p style={{ color: colors.textSecondary, fontSize: typo.label }}>
                    Total apparent strain: {values.totalStrainNoDummy.toFixed(1)} ue<br/>
                    Mechanical strain: {values.strainMicro.toFixed(1)} ue<br/>
                    Thermal error: {values.thermalStrainMicro.toFixed(1)} ue ({Math.abs(values.thermalStrainMicro / (values.strainMicro || 1) * 100).toFixed(1)}%)
                  </p>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <h4 style={{ color: colors.success, fontSize: typo.small, marginBottom: '6px' }}>With Dummy Gauge</h4>
                  <p style={{ color: colors.textSecondary, fontSize: typo.label }}>
                    Measured strain: {values.strainMicro.toFixed(1)} ue<br/>
                    Thermal error: 0 ue (cancelled!)<br/>
                    Accuracy: {appliedForce > 0 ? '100%' : 'N/A (no load)'}
                  </p>
                </div>
              </div>
            </div>
          </>
        );

      // ───────────────────────────────────────────────────────────────────────
      // TWIST REVIEW PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'twist_review': {
        const twistWasCorrect = twistPrediction === 'compensated';
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Temperature Compensation Explained</h2>
            </div>

            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {twistWasCorrect ? 'You Got It!' : 'Close, but...'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                <strong>The dummy gauge perfectly cancels thermal effects!</strong> Both gauges experience the same temperature change,
                so their resistance changes identically. Since they are in adjacent arms of the Wheatstone bridge,
                these identical changes cancel in the differential output, leaving only the mechanical strain signal.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: typo.heading }}>How Temperature Compensation Works</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The Problem:</strong><br/>
                    Temperature changes cause two effects: (1) the beam material expands/contracts, creating real strain that the gauge
                    measures, and (2) the gauge wire itself changes resistance with temperature. Both appear as "strain" but neither
                    represents actual structural loading. For aluminum at 23 ppm/C, a 40C temperature swing creates 920 microstrain
                    of thermal artifact - potentially larger than the mechanical signal.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The Solution - Dummy Gauge:</strong><br/>
                    A second gauge bonded to an unstressed piece of the same material experiences identical thermal effects.
                    Placed in an adjacent bridge arm, both gauges change by the same amount, and the bridge differential output
                    remains zero for temperature changes. Only mechanical strain on the active gauge produces an output signal.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Full Bridge Compensation:</strong><br/>
                    Professional load cells use four active gauges: two in tension, two in compression. This full bridge
                    configuration provides 4x the sensitivity of a single gauge while inherently canceling temperature effects.
                    The output doubles because tension and compression gauges change in opposite directions.
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Self-Temperature-Compensated Gauges:</strong><br/>
                    Modern STC gauges are manufactured with specific alloy compositions matched to the target material's
                    thermal expansion coefficient. The gauge's temperature coefficient of resistance is tuned to cancel the
                    apparent strain from substrate expansion, providing compensation without a dummy gauge.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // TRANSFER PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'transfer':
        return (
          <TransferPhaseView
            conceptName="Strain Gauge & Load Cell"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );

      // ───────────────────────────────────────────────────────────────────────
      // TEST PHASE
      // ───────────────────────────────────────────────────────────────────────
      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: typo.pagePadding }}>
              <div style={{
                background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px'
              }}>
                <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.title }}>
                  {testScore >= 7 ? 'Excellent Work!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
                  {testScore >= 9 ? 'Outstanding! You have mastered strain gauge engineering!' :
                   testScore >= 7 ? 'Great job! You understand the fundamentals of strain measurement.' :
                   'Review the material and try again. You need 7/10 to pass.'}
                </p>
                <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: typo.small }}>
                  Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'Retry'}
                </p>
                {testScore < 7 && (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }} style={{
                    marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                  }}>Try Again</button>
                )}
              </div>

              {/* Answer Key */}
              <h3 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOption = q.options.find(o => o.correct);
                const isCorrect = userAnswer === correctOption?.id;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, marginBottom: '12px', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>Question {qIndex + 1}</p>
                      <span style={{ fontSize: typo.label, fontWeight: 'bold', color: isCorrect ? colors.success : colors.error }}>{isCorrect ? 'CORRECT' : 'INCORRECT'}</span>
                    </div>
                    <p style={{ color: colors.textSecondary, fontSize: typo.label, marginBottom: '6px', fontStyle: 'italic' }}>{q.scenario.substring(0, 100)}...</p>
                    <p style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '10px' }}>{q.question}</p>
                    {q.options.map((opt) => (
                      <div key={opt.id} style={{
                        padding: '8px 10px', marginBottom: '4px', borderRadius: '6px',
                        background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === opt.id ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === opt.id ? colors.error : colors.textMuted,
                        fontSize: typo.label
                      }}>
                        <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{opt.id.toUpperCase()}.</span>
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

        // Active test
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
                You have conquered Strain Gauge & Load Cell
              </p>
              <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: '9999px', background: 'rgba(245, 158, 11, 0.2)', marginBottom: '24px' }}>
                <span style={{ color: colors.accent, fontSize: typo.heading, fontWeight: 'bold' }}>Score: {testScore}/10</span>
                <span style={{ color: colors.textMuted, fontSize: typo.small, marginLeft: '12px' }}>
                  Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : 'C'}
                </span>
              </div>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Concepts You Have Mastered</h3>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '18px', margin: 0, fontSize: typo.small }}>
                  <li><strong style={{ color: colors.textPrimary }}>Strain:</strong> e = sigma/E - mechanical deformation normalized by material stiffness</li>
                  <li><strong style={{ color: colors.textPrimary }}>Gauge Factor:</strong> dR/R = GF x e - sensitivity of resistance to strain (~2 metal, ~100 semiconductor)</li>
                  <li><strong style={{ color: colors.textPrimary }}>Wheatstone Bridge:</strong> Converts tiny resistance changes to measurable voltage (mV range)</li>
                  <li><strong style={{ color: colors.textPrimary }}>Temperature Compensation:</strong> Dummy gauges cancel thermal apparent strain</li>
                  <li><strong style={{ color: colors.textPrimary }}>Bridge Output:</strong> V_out = V_ex x GF x e / 4 (quarter bridge)</li>
                  <li><strong style={{ color: colors.textPrimary }}>Material Effects:</strong> Young's modulus determines strain for given stress</li>
                  <li><strong style={{ color: colors.textPrimary }}>Real-World Impact:</strong> Bridges, scales, crash testing, medical devices</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.accent}` }}>
                <h3 style={{ color: colors.accent, marginBottom: '10px', fontSize: typo.heading }}>Where to Go From Here</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  You now understand one of the most fundamental measurement techniques in engineering. Strain gauges
                  are the backbone of experimental stress analysis, force measurement, and structural monitoring.
                  Next, explore <strong>piezoelectric sensors</strong> for dynamic force measurement,
                  <strong> fiber-optic strain sensing</strong> for distributed monitoring over kilometers,
                  or <strong>MEMS accelerometers</strong> which use microscale strain gauges on silicon.
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.success, marginBottom: '10px', fontSize: typo.heading }}>Your Achievement</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '40px' }}>📏⚡</div>
                  <div>
                    <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '4px' }}>
                      Strain Gauge & Load Cell Master
                    </p>
                    <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
                      Completed all 10 phases with {testScore}/10 on final assessment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive visualization as celebration */}
            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '16px' }}>
              {renderBeamSVG(true, true)}
            </div>

            {/* Complete Game button */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              padding: '16px 20px',
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
              borderTop: '1px solid rgba(245, 158, 11, 0.3)',
              zIndex: 1000,
            }}>
              <button
                onClick={() => {
                  playSound('complete');
                  emitGameEvent('game_completed', { score: testScore, total: 10, mastery: true });
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'achievement_unlocked',
                      gameType: 'strain-gauge-sensor',
                      gameTitle: 'Strain Gauge & Load Cell',
                      details: { type: 'mastery_achieved' },
                      timestamp: Date.now()
                    });
                  }
                  window.location.href = '/games';
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', minHeight: '44px',
                }}
              >
                Complete Game
              </button>
            </div>
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
      {phase !== 'mastery' && phase !== 'transfer' && renderBottomBar()}
    </div>
  );
};

export default StrainGaugeSensorRenderer;
