'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ─────────────────────────────────────────────────────────────────────────────
// EMC COMPLIANCE - Complete 10-Phase Game (#278)
// Electromagnetic compatibility: emissions, harmonics, filtering, shielding
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

interface EMCComplianceRendererProps {
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
      complete: { freq: 900, duration: 0.4, type: 'sine' },
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
    scenario: 'A 50 MHz microcontroller clock signal produces spectral peaks at 50, 150, 250, 350 MHz, etc. The 150 MHz peak exceeds the FCC Class B limit by 8 dB.',
    question: 'Why does a 50 MHz clock produce emissions at 150 MHz?',
    options: [
      { id: 'a', label: 'The crystal oscillator has a manufacturing defect generating spurious tones' },
      { id: 'b', label: 'Digital clock signals are square waves whose Fourier series contains odd harmonics (3rd harmonic = 150 MHz)', correct: true },
      { id: 'c', label: 'Power supply noise at 150 MHz is coupling into the clock circuit' },
      { id: 'd', label: 'The PCB trace is resonating at 150 MHz due to impedance mismatch' },
    ],
    explanation: 'A digital clock is approximately a square wave. By Fourier analysis, a square wave contains only odd harmonics: f, 3f, 5f, 7f... The amplitudes fall off as 1/n. So a 50 MHz clock has harmonics at 150 MHz (3rd), 250 MHz (5th), etc. The 3rd harmonic is the strongest after the fundamental.',
  },
  {
    scenario: 'An engineer slows the rise time of a clock driver from 1 ns to 5 ns. Emissions above 200 MHz drop significantly, but the product still fails at 50 and 150 MHz.',
    question: 'Why does slowing rise time reduce high-frequency emissions but not lower harmonics?',
    options: [
      { id: 'a', label: 'The clock frequency itself did not change, so fundamental and low harmonics remain' },
      { id: 'b', label: 'The sinc-function envelope of spectral content has a knee frequency at 1/(pi*tr); slower rise time lowers this knee, attenuating only higher harmonics', correct: true },
      { id: 'c', label: 'Low-frequency emissions come from the power supply, not the clock' },
      { id: 'd', label: 'Rise time only affects conducted emissions, not radiated' },
    ],
    explanation: 'The spectral envelope of a trapezoidal waveform follows a sinc function. It is flat below f1 = 1/(pi*pulse_width) and rolls off at -20 dB/decade above f2 = 1/(pi*rise_time). Slowing rise time from 1 ns to 5 ns moves f2 from ~318 MHz to ~64 MHz, dramatically reducing harmonics above that knee while leaving lower harmonics unchanged.',
  },
  {
    scenario: 'A product passes conducted emissions testing but fails radiated emissions. A 1.5-meter USB cable is connected to the device during the radiated test.',
    question: 'Why does the USB cable cause radiated emissions failures?',
    options: [
      { id: 'a', label: 'The USB cable has too much resistance, converting energy to heat and re-radiation' },
      { id: 'b', label: 'The cable acts as an antenna; at frequencies where its length is a significant fraction of the wavelength, it radiates efficiently', correct: true },
      { id: 'c', label: 'USB protocol overhead generates additional RF noise' },
      { id: 'd', label: 'The cable picks up noise from the test environment and re-emits it' },
    ],
    explanation: 'A cable becomes an efficient radiator when its length approaches lambda/4 or lambda/2. A 1.5 m cable resonates around 50 MHz (lambda/2) and 100 MHz (lambda). Common-mode currents on the cable, driven by ground bounce or imperfect filtering, couple to the cable and radiate. This is the number one cause of radiated emissions failures.',
  },
  {
    scenario: 'Adding a ferrite common-mode choke to the USB cable reduces radiated emissions by 15 dB at 100 MHz. Differential signal quality is unaffected.',
    question: 'How does a common-mode choke suppress emissions without degrading the signal?',
    options: [
      { id: 'a', label: 'It blocks all high-frequency signals equally but the USB receiver compensates' },
      { id: 'b', label: 'Its high impedance only opposes common-mode currents (same direction on both wires); differential-mode currents (opposite direction) see minimal impedance due to flux cancellation', correct: true },
      { id: 'c', label: 'It converts radio frequency energy into heat before it reaches the antenna' },
      { id: 'd', label: 'It shortens the effective antenna length of the cable' },
    ],
    explanation: 'In a common-mode choke, both wires pass through the same magnetic core. Common-mode currents (flowing the same direction) produce additive flux, seeing high impedance. Differential-mode currents (flowing opposite directions) produce cancelling flux, seeing near-zero impedance. This selectively blocks the noise current that drives radiation while passing the wanted signal.',
  },
  {
    scenario: 'A PCB has a split ground plane. An engineer notices that a 100 MHz clock trace routed across the split generates 20 dB more emissions than an identical trace over a solid ground plane.',
    question: 'Why does a split ground plane dramatically increase emissions?',
    options: [
      { id: 'a', label: 'The split reduces copper area, increasing trace resistance and power dissipation' },
      { id: 'b', label: 'Return current cannot follow the trace path directly underneath; it detours around the split, creating a large current loop that radiates like a loop antenna', correct: true },
      { id: 'c', label: 'The gap in the ground plane creates a capacitor that resonates with the trace inductance' },
      { id: 'd', label: 'Split grounds increase the ground impedance, causing voltage drops' },
    ],
    explanation: 'High-frequency return current flows on the ground plane directly beneath the signal trace (path of least inductance). A split forces the return current to detour around the gap, creating a large loop area. Radiated emissions are proportional to loop area times frequency squared. Even a small split can increase the loop area 100x, adding 20+ dB to emissions.',
  },
  {
    scenario: 'An EMC engineer adds a pi-filter (capacitor-inductor-capacitor) on the DC power input of a product. Conducted emissions on the power line drop below the CISPR 22 limit.',
    question: 'What is the primary purpose of a pi-filter on a power input?',
    options: [
      { id: 'a', label: 'To regulate the DC voltage and prevent brownouts' },
      { id: 'b', label: 'To prevent high-frequency switching noise generated inside the product from conducting back onto the mains power line', correct: true },
      { id: 'c', label: 'To protect the product from lightning-induced surges on the power line' },
      { id: 'd', label: 'To improve power factor by correcting the phase angle' },
    ],
    explanation: 'Switch-mode power supplies generate noise from 150 kHz to 30 MHz. Without filtering, this noise propagates onto the AC mains, potentially interfering with other equipment. A pi-filter presents high series impedance (inductor) and low shunt impedance (capacitors) to noise frequencies, attenuating conducted emissions by 40-60 dB while passing 50/60 Hz power.',
  },
  {
    scenario: 'A metal enclosure has ventilation slots cut into it. EMC testing shows that the enclosure provides only 10 dB of shielding at 1 GHz despite being made of 1mm steel.',
    question: 'Why do ventilation slots compromise shielding effectiveness at high frequencies?',
    options: [
      { id: 'a', label: 'The slots let air currents carry electromagnetic energy out of the enclosure' },
      { id: 'b', label: 'Any opening larger than about lambda/20 allows significant leakage; at 1 GHz (lambda = 30 cm), a 1.5 cm slot is already electrically significant', correct: true },
      { id: 'c', label: 'Cutting slots weakens the steel, reducing its magnetic permeability' },
      { id: 'd', label: 'Paint on the enclosure insulates the slot edges, preventing current flow' },
    ],
    explanation: 'A slot in a shield acts like a slot antenna. Its radiation efficiency depends on the ratio of slot length to wavelength. At 1 GHz (lambda = 30 cm), even a 1.5 cm slot (lambda/20) begins to leak. The rule of thumb is that the longest dimension of any opening determines the highest frequency that can be shielded. Multiple small holes are far better than one long slot.',
  },
  {
    scenario: 'Two identical products are tested for EMC compliance. One has a 4-layer PCB (signal-ground-power-signal) and the other a 2-layer PCB. The 4-layer board passes; the 2-layer fails.',
    question: 'What is the primary EMC advantage of a 4-layer stackup over a 2-layer board?',
    options: [
      { id: 'a', label: 'More layers means more copper, which absorbs electromagnetic radiation' },
      { id: 'b', label: 'Dedicated ground and power planes provide tight return-current paths, minimizing loop areas and thus radiated emissions', correct: true },
      { id: 'c', label: 'Four-layer boards are thicker and the extra FR4 material attenuates radiation' },
      { id: 'd', label: 'The inner layers act as a Faraday cage around the signals' },
    ],
    explanation: 'With dedicated ground and power planes immediately adjacent to signal layers, return currents flow directly beneath each trace with minimal loop area. On a 2-layer board, return currents must find indirect paths, creating large loops. Loop area is the dominant factor in radiated emissions. A 4-layer board can reduce emissions by 20-30 dB.',
  },
  {
    scenario: 'A spread-spectrum clock generator is used instead of a fixed-frequency crystal. Peak emissions at the clock harmonics drop by 10 dB, but the broadband noise floor rises slightly.',
    question: 'How does spread-spectrum clocking reduce peak emissions?',
    options: [
      { id: 'a', label: 'It generates less total energy by running the clock slower on average' },
      { id: 'b', label: 'It modulates the clock frequency over a small range, spreading the energy of each harmonic across a wider bandwidth so the peak level drops', correct: true },
      { id: 'c', label: 'The frequency modulation causes destructive interference between harmonics' },
      { id: 'd', label: 'It increases clock jitter, which makes digital circuits draw less current' },
    ],
    explanation: 'Spread-spectrum clocking (SSC) dithers the clock frequency by typically 0.5-2% using triangular or Hershey-kiss modulation profiles. Since EMC measurements use a specific receiver bandwidth (e.g., 120 kHz for CISPR), spreading energy across a wider band reduces the measured peak. Total energy is unchanged, but the peak drops 6-15 dB depending on spread percentage.',
  },
  {
    scenario: 'An automotive ECU must meet CISPR 25 for emissions and ISO 11452 for immunity. It passes emissions but fails the 200 V/m radiated immunity test - the microcontroller resets during exposure.',
    question: 'What is the most effective approach to improve radiated immunity?',
    options: [
      { id: 'a', label: 'Increase the clock speed so the processor finishes tasks before interference arrives' },
      { id: 'b', label: 'Combine metal enclosure shielding, filtered connectors, and robust bypass/decoupling on all power pins to prevent RF energy from reaching the sensitive circuits', correct: true },
      { id: 'c', label: 'Add error correction to the firmware to detect and recover from bit flips' },
      { id: 'd', label: 'Use a lower supply voltage so the noise margin threshold is closer to zero' },
    ],
    explanation: 'Immunity requires a defense-in-depth approach. The enclosure provides first-level shielding (20-40 dB). Filtered connectors prevent RF from entering on cables. Bypass capacitors on IC power pins shunt any remaining RF to ground before it can upset the silicon. No single technique is sufficient at 200 V/m; all three layers working together are needed.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD TRANSFER APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📱',
    title: 'Consumer Electronics Certification',
    short: 'FCC/CE Mark Testing',
    tagline: 'No product ships without this stamp of approval',
    description: 'Every electronic device sold in the US must pass FCC Part 15 testing; in Europe, CE marking requires compliance with the EMC Directive. Failure at the test lab can delay product launches by months and cost hundreds of thousands of dollars in redesign.',
    connection: 'The emission spectrum you simulated is exactly what EMC test engineers see on a spectrum analyzer during pre-compliance and certification testing. The same harmonics, limit lines, and mitigation techniques apply directly.',
    howItWorks: 'Products are tested in a semi-anechoic chamber or open-area test site. A calibrated antenna scans from 30 MHz to several GHz while the device operates in worst-case configurations. Conducted emissions are measured on power lines from 150 kHz to 30 MHz using a LISN. Results are compared against class-specific limits.',
    stats: [
      { label: 'Frequency Range', value: '150 kHz - 6 GHz' },
      { label: 'FCC Class B Limit', value: '~40 dBuV/m @ 3m' },
      { label: 'Typical Lab Cost', value: '$5,000-$20,000' },
    ],
    examples: [
      'Smartphone FCC certification with SAR and EMC testing',
      'Laptop CE marking with conducted and radiated emissions scans',
      'IoT device pre-compliance testing using near-field probes',
      'Gaming console EMC qualification across multiple markets',
    ],
    companies: ['TUV Rheinland', 'UL Solutions', 'Intertek', 'Element Materials', 'SGS'],
    futureImpact: 'As 5G, Wi-Fi 7, and UWB proliferate, the RF environment grows denser. Future EMC standards will likely tighten limits and extend frequency ranges above 6 GHz, requiring new test methods and design approaches.',
    color: '#3b82f6',
  },
  {
    icon: '🚗',
    title: 'Automotive EMC (CISPR 25)',
    short: 'Vehicle Electronics',
    tagline: 'Where EMC failure means safety failure',
    description: 'Modern vehicles contain 100+ ECUs, electric motors, and radar/lidar sensors in extremely close proximity. Automotive EMC standards (CISPR 25, ISO 11452) are among the most stringent because interference can affect braking, steering, and ADAS systems.',
    connection: 'The harmonic emissions from clock signals in your simulation mirror the broadband emissions from PWM motor drives and switch-mode converters in EVs. The same filtering and shielding principles keep safety-critical CAN/LIN buses operational.',
    howItWorks: 'Automotive EMC testing includes component-level testing on a bench with artificial networks, plus vehicle-level testing in a large anechoic chamber. Tests include conducted emissions on power lines, radiated emissions from cables and enclosures, and immunity to externally applied RF fields up to 200 V/m.',
    stats: [
      { label: 'Immunity Requirement', value: 'Up to 200 V/m' },
      { label: 'Emission Band', value: '150 kHz - 2.5 GHz' },
      { label: 'Test Standard', value: 'CISPR 25 / ISO 11452' },
    ],
    examples: [
      'EV traction inverter EMC qualification with 400V bus',
      'ADAS radar module coexistence testing with 77 GHz sensors',
      'Battery management system immunity to 200 V/m fields',
      'Infotainment unit conducted emissions on 12V power bus',
    ],
    companies: ['Bosch', 'Continental', 'Tesla', 'BYD', 'Denso'],
    futureImpact: 'Autonomous driving demands unprecedented EMC performance. Sensor fusion between radar, lidar, and cameras requires guaranteed immunity. V2X communication adds new in-band interference challenges that current standards do not fully address.',
    color: '#22c55e',
  },
  {
    icon: '🏥',
    title: 'Medical Device EMC (IEC 60601)',
    short: 'Life-Critical Electronics',
    tagline: 'Interference here can endanger patients',
    description: 'Medical devices must comply with IEC 60601-1-2, which sets strict emission limits to avoid interfering with other hospital equipment and demanding immunity levels to ensure reliable operation despite nearby RF sources like electrosurgical units, MRI machines, and cell phones.',
    connection: 'The spectral analysis and limit-line comparison from your simulation is identical to how medical device EMC engineers evaluate their products. The defense-in-depth approach of filtering plus shielding is essential when failure could harm patients.',
    howItWorks: 'Medical EMC testing includes all standard radiated and conducted tests plus additional immunity tests specific to healthcare environments: electrosurgical interference, proximity fields from RFID and NFC, and immunity to defibrillator pulses. Risk management per ISO 14971 determines acceptable degradation modes.',
    stats: [
      { label: 'Immunity Level', value: '3-10 V/m (depending on environment)' },
      { label: 'Standard', value: 'IEC 60601-1-2 Ed.4' },
      { label: 'Risk Category', value: 'Life-supporting equipment' },
    ],
    examples: [
      'Pacemaker immunity to MRI fields (1.5T and 3T)',
      'Infusion pump operation near electrosurgical equipment',
      'Patient monitor EMC in ICU with multiple RF sources',
      'Surgical robot EMC qualification for operating room use',
    ],
    companies: ['Medtronic', 'Siemens Healthineers', 'GE HealthCare', 'Philips', 'Abbott'],
    futureImpact: 'Wireless medical devices and hospital IoT will increase the RF density in healthcare facilities. Future standards will need to address coexistence of dozens of wireless protocols in the same patient room.',
    color: '#ef4444',
  },
  {
    icon: '🛰️',
    title: 'Aerospace and Defense EMC',
    short: 'MIL-STD-461 Compliance',
    tagline: 'Mission-critical in the harshest environments',
    description: 'Military and aerospace electronics must meet MIL-STD-461 (US) or DEF STAN 59-411 (UK), which impose the tightest emission and immunity requirements of any industry. Equipment must function through lightning, HEMP, and intentional jamming.',
    connection: 'The emission spectrum concepts from your simulation apply directly, but with limits 20-30 dB stricter than commercial standards. Every harmonic must be below a very aggressive limit line, requiring extreme attention to filtering, grounding, and shielding.',
    howItWorks: 'Testing is conducted in a shielded room with controlled ground planes. Tests include conducted emissions on power and signal lines (CE101/CE102), radiated emissions from enclosures and cables (RE101/RE102), conducted susceptibility (CS101-CS116), and radiated susceptibility (RS103). Equipment must survive without degradation.',
    stats: [
      { label: 'Immunity Field', value: '20-200 V/m (RS103)' },
      { label: 'Emission Limits', value: '20+ dB stricter than CISPR' },
      { label: 'Standard', value: 'MIL-STD-461G' },
    ],
    examples: [
      'Fighter jet avionics surviving 200 V/m threat fields',
      'Satellite electronics hardened against HEMP and cosmic rays',
      'Shipboard radar coexistence with HF communications',
      'UAV control link immunity to intentional RF jamming',
    ],
    companies: ['Lockheed Martin', 'Raytheon', 'Northrop Grumman', 'BAE Systems', 'L3Harris'],
    futureImpact: 'Directed-energy weapons and advanced electronic warfare are driving even more extreme immunity requirements. Future systems will use AI-based adaptive EMI mitigation and novel metamaterial shields.',
    color: '#8b5cf6',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EMCComplianceRenderer: React.FC<EMCComplianceRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - conducted emissions
  const [clockFreqMHz, setClockFreqMHz] = useState(50);
  const [riseTimeNs, setRiseTimeNs] = useState(2);
  const [cableLengthM, setCableLengthM] = useState(1.0);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [shieldEnabled, setShieldEnabled] = useState(false);
  const [groundQuality, setGroundQuality] = useState(50); // 0-100: poor to excellent
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Emit game event helper
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'emc_compliance',
      gameTitle: 'EMC Compliance',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: 'rgba(226,232,240,0.7)',
    border: '#2a2a3a',
    limitLine: '#EF4444',
    passGreen: '#10B981',
    failRed: '#EF4444',
    harmonic: '#60a5fa',
    envelope: '#a78bfa',
    antenna: '#f97316',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
    label: { fontSize: isMobile ? '11px' : '12px', fontWeight: 600 as const, lineHeight: 1.3 },
    heading: isMobile ? '20px' : '24px',
    pagePadding: isMobile ? '16px' : '24px',
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Cable Radiation',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent('phase_changed', { from: phase, to: p });
    setPhase(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => {
        if (el.scrollTop > 0) el.scrollTop = 0;
      });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // ─────────────────────────────────────────────────────────────────────────
  // EMC PHYSICS CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────

  // Compute harmonic amplitudes with sinc envelope
  const computeHarmonics = useCallback((fClockMHz: number, trNs: number, filterOn: boolean, shieldOn: boolean, gndQuality: number, maxHarmonics: number = 15) => {
    const harmonics: { freqMHz: number; amplitudeDbUV: number; n: number }[] = [];
    const kneeFreqMHz = 1000 / (Math.PI * trNs); // f2 = 1/(pi * tr) in MHz
    const pulseWidthNs = (1000 / fClockMHz) * 0.5; // 50% duty cycle
    const f1MHz = 1000 / (Math.PI * pulseWidthNs);

    for (let n = 1; n <= maxHarmonics; n++) {
      const freqMHz = fClockMHz * n;
      if (freqMHz > 1200) break;

      // Base amplitude: 1/n for odd harmonics of square wave, -6 dB for even
      let ampDb = 80 - 20 * Math.log10(n); // Start at ~80 dBuV for fundamental

      // Sinc envelope roll-off above f1
      if (freqMHz > f1MHz) {
        ampDb -= 20 * Math.log10(freqMHz / f1MHz);
      }

      // Additional roll-off above f2 (rise time knee)
      if (freqMHz > kneeFreqMHz) {
        ampDb -= 20 * Math.log10(freqMHz / kneeFreqMHz);
      }

      // Even harmonics are lower (imperfect duty cycle adds some)
      if (n % 2 === 0) {
        ampDb -= 10;
      }

      // Ground quality affects common-mode current (poor ground = more emissions)
      const groundFactor = 1 - (gndQuality / 100) * 0.4; // 0.6 to 1.0
      ampDb += 10 * Math.log10(groundFactor + 0.01);

      // Filter attenuation (pi-filter ~40 dB at high freq, less at low freq)
      if (filterOn) {
        const filterCornerMHz = 20;
        if (freqMHz > filterCornerMHz) {
          ampDb -= Math.min(40, 20 * Math.log10(freqMHz / filterCornerMHz));
        } else {
          ampDb -= 3;
        }
      }

      // Shield attenuation (metal enclosure ~20-30 dB broadband)
      if (shieldOn) {
        ampDb -= 25;
      }

      harmonics.push({ freqMHz, amplitudeDbUV: Math.max(ampDb, 0), n });
    }
    return harmonics;
  }, []);

  // FCC Class B limit line (simplified)
  const getFCCLimit = (freqMHz: number): number => {
    if (freqMHz < 30) return 999; // Not regulated below 30 MHz (radiated)
    if (freqMHz < 88) return 40; // 40 dBuV/m @ 3m
    if (freqMHz < 216) return 43.5;
    if (freqMHz < 960) return 46;
    return 54; // Above 960 MHz
  };

  // Compute cable radiation factor
  const computeCableRadiation = useCallback((freqMHz: number, lengthM: number): number => {
    const wavelengthM = 300 / freqMHz;
    const electricalLength = lengthM / wavelengthM;
    // Radiation efficiency peaks at lambda/2 and lambda/4
    const efficiency = Math.pow(Math.sin(Math.PI * electricalLength), 2);
    return 10 * Math.log10(Math.max(efficiency, 0.001));
  }, []);

  // Get current harmonics
  const currentHarmonics = computeHarmonics(clockFreqMHz, riseTimeNs, filterEnabled, shieldEnabled, groundQuality);

  // Check pass/fail
  const getPassFail = useCallback(() => {
    let allPass = true;
    const results = currentHarmonics.map(h => {
      const limit = getFCCLimit(h.freqMHz);
      const pass = h.amplitudeDbUV <= limit;
      if (!pass) allPass = false;
      return { ...h, limit, pass, margin: limit - h.amplitudeDbUV };
    });
    return { results, allPass };
  }, [currentHarmonics]);

  const { results: harmonicResults, allPass } = getPassFail();

  // ─────────────────────────────────────────────────────────────────────────
  // SPECTRUM VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  const SpectrumVisualization = ({ showLimit = true, showCable = false, interactive = false }: {
    showLimit?: boolean;
    showCable?: boolean;
    interactive?: boolean;
  }) => {
    const width = isMobile ? 340 : 520;
    const height = isMobile ? 280 : 340;
    const pad = { top: 30, right: 30, bottom: 50, left: 55 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const maxFreq = 1000; // MHz
    const maxAmp = 100; // dBuV/m

    const freqToX = (f: number) => pad.left + (f / maxFreq) * plotW;
    const ampToY = (a: number) => pad.top + plotH - (a / maxAmp) * plotH;

    // Generate limit line path
    const limitPoints = [
      { f: 30, a: getFCCLimit(30) },
      { f: 87.9, a: getFCCLimit(30) },
      { f: 88, a: getFCCLimit(88) },
      { f: 215.9, a: getFCCLimit(88) },
      { f: 216, a: getFCCLimit(216) },
      { f: 959.9, a: getFCCLimit(216) },
      { f: 960, a: getFCCLimit(960) },
      { f: 1000, a: getFCCLimit(960) },
    ];
    const limitPath = limitPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${freqToX(p.f)} ${ampToY(p.a)}`)
      .join(' ');

    // Sinc envelope path
    const envelopePoints: string[] = [];
    const kneeFreqMHz = 1000 / (Math.PI * riseTimeNs);
    const pulseWidthNs = (1000 / clockFreqMHz) * 0.5;
    const f1MHz = 1000 / (Math.PI * pulseWidthNs);
    for (let f = 5; f <= 1000; f += 5) {
      let amp = 80;
      if (f > f1MHz) amp -= 20 * Math.log10(f / f1MHz);
      if (f > kneeFreqMHz) amp -= 20 * Math.log10(f / kneeFreqMHz);
      if (filterEnabled && f > 20) amp -= Math.min(40, 20 * Math.log10(f / 20));
      if (shieldEnabled) amp -= 25;
      amp = Math.max(amp, 0);
      envelopePoints.push(`${envelopePoints.length === 0 ? 'M' : 'L'} ${freqToX(f)} ${ampToY(amp)}`);
    }
    const envelopePath = envelopePoints.join(' ');

    // Animated noise floor
    const time = animationFrame * 0.05;

    const harmonics = showCable
      ? currentHarmonics.map(h => ({
          ...h,
          amplitudeDbUV: Math.max(0, h.amplitudeDbUV + computeCableRadiation(h.freqMHz, cableLengthM)),
        }))
      : currentHarmonics;

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%', border: `1px solid ${colors.border}` }}
        role="img"
        aria-label="EMC emission spectrum"
      >
        <defs>
          <linearGradient id="specBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </linearGradient>
          <filter id="specGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="plotClip">
            <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Plot background */}
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="url(#specBg)" />

        {/* Grid lines */}
        {[0, 200, 400, 600, 800, 1000].map(f => (
          <g key={`gf${f}`}>
            <line
              x1={freqToX(f)} y1={pad.top} x2={freqToX(f)} y2={pad.top + plotH}
              stroke={colors.border} strokeDasharray="2 4" opacity={0.4}
            />
            <text x={freqToX(f)} y={pad.top + plotH + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">
              {f}
            </text>
          </g>
        ))}
        {[0, 20, 40, 60, 80, 100].map(a => (
          <g key={`ga${a}`}>
            <line
              x1={pad.left} y1={ampToY(a)} x2={pad.left + plotW} y2={ampToY(a)}
              stroke={colors.border} strokeDasharray="2 4" opacity={0.3}
            />
            <text x={pad.left - 6} y={ampToY(a) + 4} fill={colors.textMuted} fontSize="10" textAnchor="end">
              {a}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={pad.left + plotW / 2} y={height - 6} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="600">
          Frequency (MHz)
        </text>
        <text
          x={12} y={pad.top + plotH / 2}
          fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="600"
          transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}
        >
          Amplitude (dBuV/m)
        </text>

        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          {showCable ? 'Radiated Emission Spectrum (with Cable)' : 'Conducted Emission Spectrum'}
        </text>

        {/* Clipped content */}
        <g clipPath="url(#plotClip)">
          {/* Noise floor animation */}
          {Array.from({ length: 60 }, (_, i) => {
            const f = (i / 60) * maxFreq;
            const noiseAmp = 5 + Math.sin(time + i * 0.3) * 2 + Math.random() * 1.5;
            return (
              <rect
                key={`noise${i}`}
                x={freqToX(f)}
                y={ampToY(noiseAmp)}
                width={Math.max(1, plotW / 60 - 1)}
                height={ampToY(0) - ampToY(noiseAmp)}
                fill={colors.accent}
                opacity={0.08}
              />
            );
          })}

          {/* Sinc envelope curve */}
          <path d={envelopePath} fill="none" stroke={colors.envelope} strokeWidth="1.5" opacity={0.4} strokeDasharray="4 4" />

          {/* FCC limit line */}
          {showLimit && (
            <g>
              <path d={limitPath} fill="none" stroke={colors.limitLine} strokeWidth="2.5" opacity={0.9} />
              <text x={freqToX(500)} y={ampToY(getFCCLimit(216)) - 6} fill={colors.limitLine} fontSize="10" fontWeight="700" textAnchor="middle">
                FCC Class B Limit
              </text>
            </g>
          )}

          {/* Harmonic peaks */}
          {harmonics.map((h, i) => {
            const x = freqToX(h.freqMHz);
            const yTop = ampToY(h.amplitudeDbUV);
            const yBottom = ampToY(0);
            const limit = getFCCLimit(h.freqMHz);
            const failing = h.amplitudeDbUV > limit && h.freqMHz >= 30;
            const peakColor = failing ? colors.failRed : colors.passGreen;

            return (
              <g key={`h${i}`}>
                {/* Peak bar */}
                <line
                  x1={x} y1={yBottom} x2={x} y2={yTop}
                  stroke={peakColor} strokeWidth={isMobile ? 3 : 4}
                  filter="url(#specGlow)"
                />
                {/* Peak cap */}
                <circle cx={x} cy={yTop} r={3} fill={peakColor} />
                {/* Harmonic label */}
                {(!isMobile || i < 8) && (
                  <text x={x} y={yTop - 8} fill={peakColor} fontSize="9" textAnchor="middle" fontWeight="600">
                    {h.n === 1 ? `f0=${h.freqMHz}` : `${h.n}f`}
                  </text>
                )}
                {/* Fail marker */}
                {failing && (
                  <text x={x} y={yTop - 20} fill={colors.failRed} fontSize="11" textAnchor="middle" fontWeight="800">
                    FAIL
                  </text>
                )}
              </g>
            );
          })}

          {/* Cable resonance indicator */}
          {showCable && (
            <>
              {[0.25, 0.5, 1.0].map((fraction, i) => {
                const resFreq = (300 * fraction) / cableLengthM;
                if (resFreq > maxFreq) return null;
                return (
                  <g key={`res${i}`}>
                    <line
                      x1={freqToX(resFreq)} y1={pad.top} x2={freqToX(resFreq)} y2={pad.top + plotH}
                      stroke={colors.antenna} strokeDasharray="6 3" strokeWidth="1" opacity={0.6}
                    />
                    <text x={freqToX(resFreq) + 4} y={pad.top + 14} fill={colors.antenna} fontSize="9" fontWeight="600">
                      {fraction === 0.25 ? 'lambda/4' : fraction === 0.5 ? 'lambda/2' : 'lambda'}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </g>

        {/* Pass/Fail badge */}
        {showLimit && (
          <g>
            <rect
              x={width - pad.right - 70} y={pad.top + 6}
              width={64} height={24} rx={6}
              fill={allPass ? colors.passGreen : colors.failRed}
              opacity={0.9}
            />
            <text
              x={width - pad.right - 38} y={pad.top + 22}
              fill="#fff" fontSize="12" fontWeight="800" textAnchor="middle"
            >
              {allPass ? 'PASS' : 'FAIL'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CONTROL PANEL
  // ─────────────────────────────────────────────────────────────────────────
  const ControlPanel = ({ showCable = false }: { showCable?: boolean }) => {
    const sliderStyle = (color: string): React.CSSProperties => ({
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      outline: 'none',
      appearance: 'auto' as const,
      accentColor: color,
      cursor: 'pointer',
    });

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: isMobile ? '16px' : '20px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Controls</h3>

        {/* Clock Frequency */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ ...typo.label, color: colors.textMuted }}>Clock Frequency</span>
            <span style={{ ...typo.label, color: colors.accent }}>{clockFreqMHz} MHz</span>
          </div>
          <input
            type="range" min={10} max={200} step={5} value={clockFreqMHz}
            onChange={e => {
              setClockFreqMHz(Number(e.target.value));
              emitEvent('slider_changed', { param: 'clockFreqMHz', value: Number(e.target.value) });
            }}
            style={sliderStyle(colors.accent)}
          />
        </div>

        {/* Rise Time */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ ...typo.label, color: colors.textMuted }}>Rise Time</span>
            <span style={{ ...typo.label, color: '#a78bfa' }}>{riseTimeNs} ns</span>
          </div>
          <input
            type="range" min={0.5} max={10} step={0.5} value={riseTimeNs}
            onChange={e => {
              setRiseTimeNs(Number(e.target.value));
              emitEvent('slider_changed', { param: 'riseTimeNs', value: Number(e.target.value) });
            }}
            style={sliderStyle('#a78bfa')}
          />
          <div style={{ ...typo.label, color: colors.textMuted, marginTop: '2px' }}>
            Knee freq: {Math.round(1000 / (Math.PI * riseTimeNs))} MHz
          </div>
        </div>

        {/* Cable Length (twist phase) */}
        {showCable && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ ...typo.label, color: colors.textMuted }}>Cable Length</span>
              <span style={{ ...typo.label, color: colors.antenna }}>{cableLengthM.toFixed(1)} m</span>
            </div>
            <input
              type="range" min={0.3} max={3.0} step={0.1} value={cableLengthM}
              onChange={e => {
                setCableLengthM(Number(e.target.value));
                emitEvent('slider_changed', { param: 'cableLengthM', value: Number(e.target.value) });
              }}
              style={sliderStyle(colors.antenna)}
            />
            <div style={{ ...typo.label, color: colors.textMuted, marginTop: '2px' }}>
              lambda/2 resonance: {Math.round(150 / cableLengthM)} MHz
            </div>
          </div>
        )}

        {/* Ground Quality */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ ...typo.label, color: colors.textMuted }}>Ground Quality</span>
            <span style={{ ...typo.label, color: groundQuality > 70 ? colors.success : groundQuality > 40 ? colors.warning : colors.error }}>
              {groundQuality < 30 ? 'Poor' : groundQuality < 60 ? 'Fair' : groundQuality < 85 ? 'Good' : 'Excellent'} ({groundQuality}%)
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={5} value={groundQuality}
            onChange={e => {
              setGroundQuality(Number(e.target.value));
              emitEvent('slider_changed', { param: 'groundQuality', value: Number(e.target.value) });
            }}
            style={sliderStyle(colors.success)}
          />
        </div>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setFilterEnabled(!filterEnabled);
              playSound('click');
              emitEvent('button_clicked', { param: 'filter', value: !filterEnabled });
            }}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${filterEnabled ? colors.success : colors.border}`,
              background: filterEnabled ? `${colors.success}20` : 'transparent',
              color: filterEnabled ? colors.success : colors.textSecondary,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.2s ease',
            }}
          >
            {filterEnabled ? 'Pi-Filter: ON' : 'Pi-Filter: OFF'}
          </button>
          <button
            onClick={() => {
              setShieldEnabled(!shieldEnabled);
              playSound('click');
              emitEvent('button_clicked', { param: 'shield', value: !shieldEnabled });
            }}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${shieldEnabled ? colors.success : colors.border}`,
              background: shieldEnabled ? `${colors.success}20` : 'transparent',
              color: shieldEnabled ? colors.success : colors.textSecondary,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.2s ease',
            }}
          >
            {shieldEnabled ? 'Shield: ON' : 'Shield: OFF'}
          </button>
        </div>

        {/* Status summary */}
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          background: allPass ? `${colors.passGreen}15` : `${colors.failRed}15`,
          border: `1px solid ${allPass ? colors.passGreen : colors.failRed}40`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>EMC Status:</span>
            <span style={{
              ...typo.label,
              color: allPass ? colors.passGreen : colors.failRed,
              fontWeight: 800,
              fontSize: '16px',
            }}>
              {allPass ? 'PASS' : 'FAIL'}
            </span>
          </div>
          {!allPass && (
            <div style={{ ...typo.label, color: colors.textMuted, marginTop: '4px' }}>
              {harmonicResults.filter(h => !h.pass && h.freqMHz >= 30).length} harmonic(s) exceed FCC limit
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION BAR
  // ─────────────────────────────────────────────────────────────────────────
  const renderNavigationBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
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
        gap: isMobile ? '8px' : '12px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIdx === 0}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgPrimary : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            fontSize: '12px',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                height: isMobile ? '8px' : '10px',
                width: i === currentIdx ? (isMobile ? '16px' : '20px') : (isMobile ? '8px' : '10px'),
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>

        <div style={{
          padding: '4px 10px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom bar
  const renderBottomBar = (canNext: boolean, label: string, onAction?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'sticky',
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
        flexShrink: 0,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIdx === 0}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgPrimary,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={() => {
            if (!canNext) return;
            if (onAction) onAction();
            else nextPhase();
          }}
          disabled={!canNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgPrimary,
            color: canNext ? '#fff' : colors.textMuted,
            border: 'none',
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.4,
            boxShadow: canNext ? `0 2px 12px ${colors.accentGlow}` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease',
          }}
        >
          {label}
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SIDE-BY-SIDE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  const SideBySide = ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '16px',
      width: '100%',
    }}>
      <div style={{ flex: isMobile ? 'none' : 1, display: 'flex', justifyContent: 'center' }}>
        {left}
      </div>
      <div style={{ flex: isMobile ? 'none' : 1 }}>
        {right}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER CONTENT BY PHASE
  // ─────────────────────────────────────────────────────────────────────────
  const renderContent = () => {
    const pageStyle: React.CSSProperties = {
      flex: 1,
      overflowY: 'auto',
      padding: typo.pagePadding,
      paddingTop: '70px',
      paddingBottom: '80px',
    };

    const cardStyle: React.CSSProperties = {
      background: colors.bgCard,
      borderRadius: '16px',
      padding: isMobile ? '20px' : '24px',
      border: `1px solid ${colors.border}`,
      marginBottom: '16px',
    };

    // ─── HOOK PHASE ───
    if (phase === 'hook') {
      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#x26A0;&#xFE0F;</div>
              <h1 style={{ ...typo.h1, color: colors.failRed, marginBottom: '12px' }}>
                Your Product Fails FCC Testing
              </h1>
              <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', margin: '0 auto 24px' }}>
                Your team spent months designing a new IoT device. At the EMC test lab, the spectrum analyzer
                shows multiple harmonic peaks exceeding the FCC Class B emission limit. The product cannot ship
                until every peak is below the regulatory line.
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>What is EMC?</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Electromagnetic Compatibility</strong> means a device:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Emissions', desc: 'Does not radiate or conduct excessive electromagnetic interference (EMI)' },
                  { label: 'Immunity', desc: 'Continues to function correctly when exposed to external EMI' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    padding: '12px', borderRadius: '8px', background: `${colors.accent}10`,
                  }}>
                    <span style={{ color: colors.accent, fontWeight: 800, fontSize: '14px', minWidth: '80px' }}>{item.label}</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Spectrum Analyzer View</h3>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>
                This is what the test engineer sees. Each vertical peak is a clock harmonic. The red line is the legal limit.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <SpectrumVisualization showLimit={true} />
              </div>
            </div>

            <div style={cardStyle}>
              <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center' }}>
                Your mission: understand where these emissions come from and learn the techniques to bring every peak
                below the FCC limit line. Ready?
              </p>
            </div>
          </div>
          {renderBottomBar(true, 'Make a Prediction')}
        </>
      );
    }

    // ─── PREDICT PHASE ───
    if (phase === 'predict') {
      const predictions = [
        { id: 'fundamental', label: 'The fundamental frequency (1st harmonic) is always the strongest peak' },
        { id: 'third', label: 'The 3rd harmonic is often the strongest violator because it is the highest odd harmonic still at high amplitude' },
        { id: 'highest', label: 'The highest frequency harmonic is always the worst because higher frequencies radiate more' },
        { id: 'random', label: 'It is random - any harmonic could be the worst depending on luck' },
      ];

      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '12px' }}>
                Predict: Which Harmonic Fails?
              </h1>
              <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '540px', margin: '0 auto' }}>
                A 50 MHz clock generates harmonics at 50, 100, 150, 200, 250... MHz. The FCC limit is around 40-46 dBuV/m.
                Which harmonic do you think is most likely to exceed the limit?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
              {predictions.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    playSound('click');
                    emitEvent('prediction_made', { prediction: p.id });
                  }}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${prediction === p.id ? colors.accent : colors.border}`,
                    background: prediction === p.id ? `${colors.accent}15` : colors.bgCard,
                    color: prediction === p.id ? colors.textPrimary : colors.textSecondary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    lineHeight: 1.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ ...cardStyle, marginTop: '20px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  Interesting choice! Let us explore the emission spectrum and see which harmonics actually fail.
                </p>
              </div>
            )}
          </div>
          {renderBottomBar(prediction !== null, 'Start Experimenting')}
        </>
      );
    }

    // ─── PLAY PHASE ───
    if (phase === 'play') {
      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ ...typo.h2, color: colors.accent, marginBottom: '8px' }}>
                Get Every Peak Below the Limit
              </h1>
              <p style={{ ...typo.small, color: colors.textMuted }}>
                Adjust rise time, toggle filters and shielding, improve grounding to pass EMC.
              </p>
            </div>

            <SideBySide
              left={<SpectrumVisualization showLimit={true} interactive={true} />}
              right={<ControlPanel />}
            />

            {/* Harmonic detail table */}
            <div style={{ ...cardStyle, marginTop: '16px', overflowX: 'auto' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Harmonic Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: colors.textMuted }}>Harmonic</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: colors.textMuted }}>Freq (MHz)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: colors.textMuted }}>Level (dBuV)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: colors.textMuted }}>Limit</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: colors.textMuted }}>Margin</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: colors.textMuted }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {harmonicResults.map((h, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                      <td style={{ padding: '6px 8px', color: colors.textPrimary }}>{h.n === 1 ? 'Fundamental' : `${h.n}${h.n === 2 ? 'nd' : h.n === 3 ? 'rd' : 'th'}`}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: colors.textSecondary }}>{h.freqMHz}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: colors.textSecondary }}>{h.amplitudeDbUV.toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: colors.textMuted }}>{h.limit === 999 ? 'N/A' : h.limit.toFixed(1)}</td>
                      <td style={{
                        padding: '6px 8px', textAlign: 'right',
                        color: h.limit === 999 ? colors.textMuted : h.pass ? colors.passGreen : colors.failRed,
                        fontWeight: 700,
                      }}>
                        {h.limit === 999 ? '-' : `${h.margin > 0 ? '+' : ''}${h.margin.toFixed(1)} dB`}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: h.limit === 999 ? colors.textMuted : h.pass ? colors.passGreen : colors.failRed, fontWeight: 800 }}>
                        {h.limit === 999 ? '-' : h.pass ? 'PASS' : 'FAIL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allPass && (
              <div style={{
                ...cardStyle,
                background: `${colors.passGreen}15`,
                border: `2px solid ${colors.passGreen}50`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>&#x2705;</div>
                <h3 style={{ ...typo.h3, color: colors.passGreen, marginBottom: '8px' }}>All Harmonics Pass!</h3>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Your device meets FCC Class B limits. Continue to learn why these techniques work.
                </p>
              </div>
            )}
          </div>
          {renderBottomBar(allPass, 'Review the Physics')}
        </>
      );
    }

    // ─── REVIEW PHASE ───
    if (phase === 'review') {
      return (
        <>
          <div style={pageStyle}>
            <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '24px', textAlign: 'center' }}>
              Why Harmonics Exist
            </h1>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Square Waves = Sum of Sinusoids</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                A perfect square wave at frequency <em>f</em> is composed of sine waves at <em>f, 3f, 5f, 7f...</em> (odd harmonics only).
                Their amplitudes decrease as <strong>1/n</strong> (or -20 dB/decade). This is the Fourier series.
              </p>
              <div style={{
                padding: '16px', borderRadius: '8px', background: `${colors.accent}10`,
                fontFamily: 'monospace', fontSize: '14px', color: colors.accent, textAlign: 'center',
              }}>
                V(t) = (4A/pi) * [sin(wt) + sin(3wt)/3 + sin(5wt)/5 + ...]
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Sinc Envelope</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                Real digital signals have finite rise times. The spectral envelope follows a <strong>sin(x)/x</strong> shape with two key frequencies:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: `${colors.envelope}15`, border: `1px solid ${colors.envelope}30` }}>
                  <span style={{ ...typo.label, color: colors.envelope }}>f1 = 1 / (pi * pulse_width)</span>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Below f1: spectrum is flat. Above f1: rolls off at -20 dB/decade.
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: `${colors.envelope}15`, border: `1px solid ${colors.envelope}30` }}>
                  <span style={{ ...typo.label, color: colors.envelope }}>f2 = 1 / (pi * rise_time)</span>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Above f2: additional -20 dB/decade roll-off (total -40 dB/decade). Slower rise time = lower f2 = less HF content.
                  </p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Mitigation Techniques</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { technique: 'Slow Rise Time', detail: 'Moves f2 lower, reducing all harmonics above the new knee frequency', icon: '&#x23F3;' },
                  { technique: 'Pi-Filter', detail: 'Series inductor + shunt capacitors block HF noise on power/signal lines', icon: '&#x26A1;' },
                  { technique: 'Metal Shield', detail: 'Faraday cage attenuates radiated emissions by 20-40 dB broadband', icon: '&#x1F6E1;' },
                  { technique: 'Proper Grounding', detail: 'Minimizes common-mode current loops that drive cable radiation', icon: '&#x23DA;' },
                  { technique: '4-Layer PCB', detail: 'Dedicated ground plane keeps return current paths tight, minimizing loop area', icon: '&#x1F4CB;' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    padding: '12px', borderRadius: '8px', background: `${colors.accent}08`,
                  }}>
                    <span style={{ fontSize: '20px' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                    <div>
                      <span style={{ ...typo.label, color: colors.accent }}>{item.technique}</span>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: '2px 0 0' }}>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SpectrumVisualization showLimit={true} />
            </div>
          </div>
          {renderBottomBar(true, 'The Twist: Cable Radiation')}
        </>
      );
    }

    // ─── TWIST PREDICT PHASE ───
    if (phase === 'twist_predict') {
      const twistPredictions = [
        { id: 'no_effect', label: 'Cables do not affect emissions - only the PCB matters' },
        { id: 'antenna', label: 'Cables act as antennas, and their length determines which frequencies radiate most efficiently' },
        { id: 'absorb', label: 'Long cables absorb emissions, acting like resistive loads' },
        { id: 'shield_only', label: 'Only unshielded cables radiate; any shielded cable is fine' },
      ];

      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ ...typo.h1, color: colors.antenna, marginBottom: '12px' }}>
                The Twist: Cable Radiation
              </h1>
              <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '540px', margin: '0 auto 16px' }}>
                Your product passed conducted emissions on the bench. But now the test lab connects a 1.5-meter USB cable
                and runs the radiated emissions test. The product fails again!
              </p>
              <p style={{ ...typo.body, color: colors.textMuted, maxWidth: '540px', margin: '0 auto' }}>
                What role do you think the cable plays in radiated emissions?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
              {twistPredictions.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                    playSound('click');
                    emitEvent('prediction_made', { prediction: p.id, phase: 'twist_predict' });
                  }}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${twistPrediction === p.id ? colors.antenna : colors.border}`,
                    background: twistPrediction === p.id ? `${colors.antenna}15` : colors.bgCard,
                    color: twistPrediction === p.id ? colors.textPrimary : colors.textSecondary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    lineHeight: 1.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ ...cardStyle, marginTop: '20px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  Let us see what happens when we add cable effects to the emission spectrum.
                </p>
              </div>
            )}
          </div>
          {renderBottomBar(twistPrediction !== null, 'Explore Cable Effects')}
        </>
      );
    }

    // ─── TWIST PLAY PHASE ───
    if (phase === 'twist_play') {
      // Compute cable-affected harmonics
      const cableHarmonics = currentHarmonics.map(h => ({
        ...h,
        amplitudeDbUV: Math.max(0, h.amplitudeDbUV + computeCableRadiation(h.freqMHz, cableLengthM)),
      }));
      const cableResults = cableHarmonics.map(h => {
        const limit = getFCCLimit(h.freqMHz);
        const pass = h.amplitudeDbUV <= limit;
        return { ...h, limit, pass, margin: limit - h.amplitudeDbUV };
      });
      const cableAllPass = cableResults.every(r => r.pass || r.freqMHz < 30);

      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ ...typo.h2, color: colors.antenna, marginBottom: '8px' }}>
                Cable as Antenna
              </h1>
              <p style={{ ...typo.small, color: colors.textMuted }}>
                Adjust cable length and observe how resonances boost emissions at specific frequencies. Orange dashed lines show cable resonance frequencies.
              </p>
            </div>

            <SideBySide
              left={<SpectrumVisualization showLimit={true} showCable={true} interactive={true} />}
              right={<ControlPanel showCable={true} />}
            />

            <div style={{ ...cardStyle, marginTop: '16px' }}>
              <h3 style={{ ...typo.h3, color: colors.antenna, marginBottom: '8px' }}>Cable Resonance Physics</h3>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                A cable of length L radiates most efficiently at frequencies where L = lambda/4, lambda/2, or lambda.
                For a {cableLengthM.toFixed(1)} m cable:
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[
                  { label: 'lambda/4', freq: Math.round(75 / cableLengthM) },
                  { label: 'lambda/2', freq: Math.round(150 / cableLengthM) },
                  { label: 'lambda', freq: Math.round(300 / cableLengthM) },
                ].map((r, i) => (
                  <div key={i} style={{
                    padding: '8px 14px', borderRadius: '8px',
                    background: `${colors.antenna}15`, border: `1px solid ${colors.antenna}30`,
                  }}>
                    <span style={{ ...typo.label, color: colors.antenna }}>{r.label}: {r.freq} MHz</span>
                  </div>
                ))}
              </div>
            </div>

            {cableAllPass && (
              <div style={{
                ...cardStyle,
                background: `${colors.passGreen}15`,
                border: `2px solid ${colors.passGreen}50`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>&#x2705;</div>
                <h3 style={{ ...typo.h3, color: colors.passGreen }}>Radiated Emissions Pass (with cable)!</h3>
              </div>
            )}
          </div>
          {renderBottomBar(cableAllPass, 'Review Cable Insights')}
        </>
      );
    }

    // ─── TWIST REVIEW PHASE ───
    if (phase === 'twist_review') {
      return (
        <>
          <div style={pageStyle}>
            <h1 style={{ ...typo.h1, color: colors.antenna, marginBottom: '24px', textAlign: 'center' }}>
              Deep Insight: Cables and Radiation
            </h1>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                The #1 Cause of Radiated Emission Failures
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                Cables are the single most common cause of radiated emissions test failures. Even if the PCB itself is clean,
                common-mode currents on attached cables turn them into efficient antennas. Just <strong>5 microamps</strong> of
                common-mode current on a 1-meter cable can exceed FCC Class B limits at VHF frequencies.
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Common-Mode vs Differential-Mode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: `${colors.success}10`, border: `1px solid ${colors.success}30` }}>
                  <span style={{ ...typo.label, color: colors.success }}>Differential-Mode Current</span>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Signal current flows out on one wire and returns on the adjacent wire. Fields cancel at a distance.
                    This is the intended signal path and does not radiate significantly.
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: `${colors.failRed}10`, border: `1px solid ${colors.failRed}30` }}>
                  <span style={{ ...typo.label, color: colors.failRed }}>Common-Mode Current</span>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Noise current flows in the same direction on all conductors and returns via ground/chassis.
                    The cable becomes a monopole antenna. Even tiny common-mode currents radiate efficiently.
                  </p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Countermeasures for Cable Radiation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'Common-Mode Choke', desc: 'Blocks common-mode current without affecting differential signal; most effective single fix' },
                  { name: 'Filtered Connectors', desc: 'Integrate capacitive/inductive filtering directly into the connector shell' },
                  { name: 'Ferrite Snap-Ons', desc: 'Add impedance to common-mode path at specific frequency ranges; easy retrofit' },
                  { name: 'Proper Grounding', desc: 'Low-impedance chassis bond at cable entry point prevents ground bounce from driving cables' },
                  { name: 'Shorter Cables', desc: 'Reduces antenna efficiency and moves resonances to higher frequencies where signals are weaker' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', padding: '10px', borderRadius: '8px',
                    background: `${colors.antenna}08`,
                  }}>
                    <span style={{ color: colors.antenna, fontWeight: 800, fontSize: '12px', minWidth: '4px' }}>&#x2022;</span>
                    <div>
                      <span style={{ ...typo.label, color: colors.accent }}>{item.name}</span>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: '2px 0 0' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, 'Real-World Applications')}
        </>
      );
    }

    // ─── TRANSFER PHASE ───
    if (phase === 'transfer') {
      return (
        <>
          <div style={pageStyle}>
            <TransferPhaseView
              conceptName="EMC Compliance"
              applications={realWorldApps}
              onComplete={() => nextPhase()}
              isMobile={isMobile}
              colors={{
                primary: colors.accent,
                primaryDark: '#d97706',
                accent: '#6366f1',
                secondary: colors.success,
                success: colors.success,
                danger: colors.error,
                bgDark: colors.bgPrimary,
                bgCard: colors.bgCard,
                bgCardLight: colors.bgSecondary,
                textPrimary: colors.textPrimary,
                textSecondary: colors.textSecondary,
                textMuted: colors.textMuted as string,
                border: colors.border,
              }}
              typo={{
                h1: String(typo.h1.fontSize),
                h2: String(typo.h2.fontSize),
                h3: String(typo.h3.fontSize),
                body: String(typo.body.fontSize),
                small: String(typo.small.fontSize),
                label: String(typo.label.fontSize),
                heading: typo.heading,
              }}
              playSound={playSound as unknown as (sound: string) => void}
            />
          </div>
        </>
      );
    }

    // ─── TEST PHASE ───
    if (phase === 'test') {
      const allAnswered = testAnswers.every(a => a !== null);

      const handleAnswer = (questionIdx: number, optionId: string) => {
        if (testSubmitted) return;
        const newAnswers = [...testAnswers];
        newAnswers[questionIdx] = optionId;
        setTestAnswers(newAnswers);
        playSound('click');
        emitEvent('answer_submitted', { question: questionIdx, answer: optionId });
      };

      const handleSubmit = () => {
        let score = 0;
        testQuestions.forEach((q, i) => {
          const correctOption = q.options.find(o => o.correct);
          if (testAnswers[i] === correctOption?.id) score++;
        });
        setTestScore(score);
        setTestSubmitted(true);
        playSound(score >= 7 ? 'success' : 'failure');
        emitEvent('game_completed', { score, total: testQuestions.length });
      };

      const q = testQuestions[currentQuestion];
      const correctOption = q.options.find(o => o.correct);

      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ ...typo.h2, color: colors.accent, marginBottom: '8px' }}>
                Knowledge Test
              </h1>
              <p style={{ ...typo.small, color: colors.textMuted }}>
                Question {currentQuestion + 1} of {testQuestions.length}
              </p>
              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                {testQuestions.map((_, i) => {
                  let dotColor = colors.border;
                  if (testSubmitted) {
                    const cOpt = testQuestions[i].options.find(o => o.correct);
                    dotColor = testAnswers[i] === cOpt?.id ? colors.success : colors.error;
                  } else if (testAnswers[i] !== null) {
                    dotColor = colors.accent;
                  }
                  return (
                    <div
                      key={i}
                      onClick={() => setCurrentQuestion(i)}
                      style={{
                        width: i === currentQuestion ? '16px' : '10px',
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: dotColor,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{
                padding: '14px', borderRadius: '8px', background: `${colors.accent}10`,
                marginBottom: '16px', borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
                  {q.scenario}
                </p>
              </div>

              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '14px' }}>
                {q.question}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map(opt => {
                  const isSelected = testAnswers[currentQuestion] === opt.id;
                  const isCorrect = opt.correct;
                  let borderColor = isSelected ? colors.accent : colors.border;
                  let bgColor = isSelected ? `${colors.accent}15` : 'transparent';

                  if (testSubmitted) {
                    if (isCorrect) {
                      borderColor = colors.success;
                      bgColor = `${colors.success}15`;
                    } else if (isSelected && !isCorrect) {
                      borderColor = colors.error;
                      bgColor = `${colors.error}15`;
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(currentQuestion, opt.id)}
                      disabled={testSubmitted}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${borderColor}`,
                        background: bgColor,
                        color: colors.textSecondary,
                        cursor: testSubmitted ? 'default' : 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{
                        fontWeight: 800,
                        color: testSubmitted && isCorrect ? colors.success : testSubmitted && isSelected && !isCorrect ? colors.error : colors.accent,
                        minWidth: '20px',
                      }}>
                        {opt.id.toUpperCase()}.
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Explanation after submit */}
              {testSubmitted && (
                <div style={{
                  marginTop: '16px', padding: '14px', borderRadius: '8px',
                  background: `${colors.success}10`, border: `1px solid ${colors.success}30`,
                }}>
                  <p style={{ ...typo.label, color: colors.success, marginBottom: '6px' }}>
                    Correct answer: {correctOption?.id.toUpperCase()}
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation between questions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent', color: colors.textSecondary,
                  cursor: currentQuestion > 0 ? 'pointer' : 'not-allowed',
                  opacity: currentQuestion > 0 ? 1 : 0.4,
                  fontSize: '13px', fontWeight: 600,
                }}
              >
                Previous
              </button>
              {currentQuestion < testQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: `1px solid ${colors.accent}`,
                    background: `${colors.accent}20`, color: colors.accent,
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  }}
                >
                  Next Question
                </button>
              ) : !testSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    border: 'none',
                    background: allAnswered ? `linear-gradient(135deg, ${colors.accent}, #d97706)` : colors.bgCard,
                    color: allAnswered ? '#fff' : colors.textMuted,
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    opacity: allAnswered ? 1 : 0.5,
                    fontSize: '14px', fontWeight: 700,
                  }}
                >
                  Submit Test
                </button>
              ) : null}
            </div>

            {/* Score display after submission */}
            {testSubmitted && (
              <div style={{
                ...cardStyle,
                marginTop: '20px',
                textAlign: 'center',
                background: testScore >= 7 ? `${colors.success}15` : `${colors.warning}15`,
                border: `2px solid ${testScore >= 7 ? colors.success : colors.warning}50`,
              }}>
                <h2 style={{ ...typo.h2, color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '8px' }}>
                  {testScore} / {testQuestions.length}
                </h2>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '4px' }}>
                  {testScore >= 9 ? 'Outstanding! You are an EMC expert.' :
                   testScore >= 7 ? 'Great job! You understand EMC fundamentals.' :
                   testScore >= 5 ? 'Good effort. Review the material and try again.' :
                   'Keep studying. EMC is a deep topic - you will get there.'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted }}>
                  Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C+' : testScore >= 5 ? 'C' : 'Needs improvement'}
                </p>
              </div>
            )}
          </div>
          {renderBottomBar(testSubmitted, 'View Mastery', () => nextPhase())}
        </>
      );
    }

    // ─── MASTERY PHASE ───
    if (phase === 'mastery') {
      const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C+' : testScore >= 5 ? 'C' : 'D';

      return (
        <>
          <div style={pageStyle}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '80px', marginBottom: '16px' }}>&#x1F3C6;</div>
              <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
                EMC Compliance Mastery!
              </h1>
              <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 20px' }}>
                You now understand how electronic devices generate electromagnetic emissions, why products fail EMC testing,
                and the engineering techniques used to achieve compliance.
              </p>
            </div>

            {/* Score summary */}
            <div style={{
              ...cardStyle, textAlign: 'center',
              background: `${colors.accent}10`,
              border: `2px solid ${colors.accent}40`,
            }}>
              <h2 style={{ ...typo.h2, color: colors.accent, marginBottom: '4px' }}>
                Test Score: {testScore}/{testQuestions.length}
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Grade: <strong style={{ color: colors.accent }}>{grade}</strong>
              </p>
            </div>

            {/* Key concepts */}
            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Key Concepts Mastered
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Digital clock signals produce harmonics following Fourier series (odd harmonics at 1/n amplitude)',
                  'The sinc spectral envelope is shaped by pulse width (f1) and rise time (f2)',
                  'Slowing rise time reduces high-frequency emissions above the knee frequency',
                  'Pi-filters attenuate conducted emissions on power and signal lines',
                  'Metal enclosures provide 20-40 dB of broadband radiated emission shielding',
                  'Cables are the #1 cause of radiated emissions failures (common-mode antenna effect)',
                  'Cable resonance at lambda/4 and lambda/2 amplifies radiation at specific frequencies',
                  'Common-mode chokes block cable radiation without affecting the differential signal',
                  'Proper PCB grounding (solid ground plane) minimizes current loop area',
                  'EMC compliance requires layered defense: filtering + shielding + grounding + layout',
                ].map((concept, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: colors.success, fontWeight: 800, minWidth: '16px' }}>&#x2713;</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{concept}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer key */}
            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Answer Key
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {testQuestions.map((q, i) => {
                  const correctOpt = q.options.find(o => o.correct);
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctOpt?.id;
                  return (
                    <div key={i} style={{
                      padding: '12px', borderRadius: '8px',
                      background: isCorrect ? `${colors.success}08` : `${colors.error}08`,
                      border: `1px solid ${isCorrect ? colors.success : colors.error}25`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ ...typo.label, color: colors.textMuted }}>Q{i + 1}</span>
                        <span style={{
                          ...typo.label,
                          color: isCorrect ? colors.success : colors.error,
                          fontWeight: 800,
                        }}>
                          {isCorrect ? 'CORRECT' : 'INCORRECT'}
                        </span>
                      </div>
                      <p style={{ ...typo.small, color: colors.textPrimary, marginBottom: '4px', fontWeight: 600 }}>
                        {q.question}
                      </p>
                      {!isCorrect && (
                        <p style={{ ...typo.label, color: colors.error, marginBottom: '4px' }}>
                          Your answer: {userAnswer?.toUpperCase()} | Correct: {correctOpt?.id.toUpperCase()}
                        </p>
                      )}
                      <p style={{ ...typo.small, color: colors.textMuted, margin: 0, fontStyle: 'italic' }}>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Beyond the basics */}
            <div style={{
              ...cardStyle,
              background: `${colors.accent}10`,
              border: `1px solid ${colors.accent}30`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Beyond the Basics</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.7 }}>
                Real EMC engineering involves pre-compliance testing with near-field probes, spectrum analyzers with
                quasi-peak and average detectors, TEM cells, and current probes. Spread-spectrum clocking can reduce
                peak emissions by 10-15 dB. Advanced techniques include intentional impedance mismatching for
                conducted emission control, absorptive filtering for military applications, and computational
                electromagnetics (FDTD, MoM) for predicting emissions before building hardware.
              </p>
            </div>

            {/* Final visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <SpectrumVisualization showLimit={true} />
            </div>
          </div>

          {/* Complete Game button */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: `linear-gradient(to top, ${colors.bgPrimary}f8, ${colors.bgPrimary}e0)`,
            borderTop: `1px solid ${colors.border}`,
            zIndex: 1000,
          }}>
            <button
              onClick={() => {
                playSound('complete');
                emitEvent('game_completed', { score: testScore, total: testQuestions.length, phase: 'mastery' });
                onGameEvent?.({
                  eventType: 'achievement_unlocked',
                  gameType: 'emc_compliance',
                  gameTitle: 'EMC Compliance',
                  details: { type: 'mastery_achieved', score: testScore, total: testQuestions.length },
                  timestamp: Date.now(),
                });
                window.location.href = '/games';
              }}
              style={{
                width: '100%',
                minHeight: '52px',
                padding: '14px 24px',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                border: 'none',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.success}40`,
                transition: 'all 0.2s ease',
              }}
            >
              Complete Game
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      overflow: 'hidden',
    }}>
      {renderNavigationBar()}
      {renderContent()}
    </div>
  );
};

export default EMCComplianceRenderer;
