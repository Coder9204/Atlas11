'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';

// ============================================================================
// GAME 273: THERMOCOUPLE NONLINEARITY
// Physics: Seebeck effect, thermocouple calibration curves, cold junction
// compensation, linearization of nonlinear voltage-temperature relationships
// Types K, J, T, E have different ranges, sensitivities, and nonlinearities
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ThermocoupleNonlinearityRendererProps {
  phase?: Phase;
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  [key: string]: unknown;
  onGameEvent?: (event: any) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  typeK: '#ef4444',
  typeJ: '#3b82f6',
  typeT: '#10b981',
  typeE: '#a855f7',
};

// ============================================================================
// THERMOCOUPLE PHYSICS
// Seebeck coefficients (uV/C) - simplified polynomial models
// Real thermocouples follow NIST polynomial tables; we use 3rd-order approx.
// ============================================================================

type ThermocoupleType = 'K' | 'J' | 'T' | 'E';

interface TCCoeffs {
  name: string;
  metals: string;
  rangeMin: number;
  rangeMax: number;
  color: string;
  // Polynomial: V(uV) = a1*T + a2*T^2 + a3*T^3 (T in C, relative to 0C ref)
  a1: number;
  a2: number;
  a3: number;
  sensitivity: number; // nominal uV/C at 25C
}

const tcData: Record<ThermocoupleType, TCCoeffs> = {
  K: {
    name: 'Type K',
    metals: 'Chromel / Alumel',
    rangeMin: -200,
    rangeMax: 1260,
    color: colors.typeK,
    a1: 39.45,
    a2: 0.0122,
    a3: -0.0000035,
    sensitivity: 40.6,
  },
  J: {
    name: 'Type J',
    metals: 'Iron / Constantan',
    rangeMin: -40,
    rangeMax: 750,
    color: colors.typeJ,
    a1: 50.38,
    a2: 0.0257,
    a3: -0.0000085,
    sensitivity: 51.7,
  },
  T: {
    name: 'Type T',
    metals: 'Copper / Constantan',
    rangeMin: -200,
    rangeMax: 350,
    color: colors.typeT,
    a1: 38.75,
    a2: 0.0442,
    a3: -0.0000120,
    sensitivity: 40.9,
  },
  E: {
    name: 'Type E',
    metals: 'Chromel / Constantan',
    rangeMin: -200,
    rangeMax: 900,
    color: colors.typeE,
    a1: 58.67,
    a2: 0.0455,
    a3: -0.0000098,
    sensitivity: 60.9,
  },
};

// Compute Seebeck voltage (uV) for a given TC type and temperature (C)
function seebeckVoltage(type: ThermocoupleType, tempC: number): number {
  const c = tcData[type];
  return c.a1 * tempC + c.a2 * tempC * tempC + c.a3 * tempC * tempC * tempC;
}

// Linear approximation: V = sensitivity * T
function linearVoltage(type: ThermocoupleType, tempC: number): number {
  const c = tcData[type];
  return c.sensitivity * tempC;
}

// Nonlinearity error in uV
function nonlinearityError(type: ThermocoupleType, tempC: number): number {
  return seebeckVoltage(type, tempC) - linearVoltage(type, tempC);
}

// Cold junction compensation: net voltage = V(Thot) - V(Tcold)
function compensatedVoltage(type: ThermocoupleType, hotTemp: number, coldTemp: number): number {
  return seebeckVoltage(type, hotTemp) - seebeckVoltage(type, coldTemp);
}

// ============================================================================
// REAL WORLD APPLICATIONS (for TransferPhaseView)
// ============================================================================

const realWorldApps = [
  {
    icon: 'Thermometer',
    title: 'Industrial Furnace Control',
    short: 'Manufacturing',
    tagline: 'Precision temperature control at extreme temperatures',
    description: 'Steel mills, glass factories, and ceramic kilns rely on Type K and Type S thermocouples to measure and control temperatures from 500C to over 1500C. The nonlinear voltage-temperature relationship must be compensated in the control system to maintain the +/-2C accuracy needed for consistent product quality.',
    connection: 'The same Seebeck nonlinearity you explored applies directly here. At 1200C, a Type K thermocouple is 8% nonlinear. Without polynomial correction, furnace temperature could be off by 30-40C, ruining an entire batch of specialty steel.',
    howItWorks: 'Industrial PLCs (Programmable Logic Controllers) use stored NIST polynomial lookup tables to convert raw thermocouple millivolts to accurate temperature readings. Cold junction compensation is performed electronically using a thermistor at the terminal block.',
    stats: [
      { value: '1260C', label: 'Max range for Type K' },
      { value: '+/-1.1C', label: 'Standard accuracy at 300C' },
      { value: '8%', label: 'Nonlinearity error at 1200C' }
    ],
    examples: [
      'Steel smelting temperature monitoring with Type S (Pt/Pt-Rh)',
      'Glass tempering ovens with Type K probes in protective sheaths',
      'Cement kiln process control using multiple thermocouple zones',
      'Aerospace turbine blade casting with Type B for ultra-high temps'
    ],
    companies: ['Omega Engineering', 'Watlow', 'Honeywell', 'Siemens', 'Yokogawa'],
    futureImpact: 'Digital thermocouples with integrated ADCs and NIST linearization will eliminate external compensation circuitry, improving accuracy while reducing installation complexity in smart factories.',
    color: '#ef4444'
  },
  {
    icon: 'Cpu',
    title: 'Data Acquisition Systems',
    short: 'Instrumentation',
    tagline: 'Multi-channel temperature measurement with software linearization',
    description: 'Modern data acquisition systems can read hundreds of thermocouples simultaneously, using high-resolution ADCs and digital signal processing to linearize the nonlinear Seebeck voltage. Software-based NIST polynomial evaluation replaces expensive analog conditioning hardware.',
    connection: 'Your exploration of the polynomial curve shape and linearization toggle directly mirrors what DAQ software does: store the raw voltage, then apply mathematical correction to recover the true temperature.',
    howItWorks: 'A precision ADC digitizes the thermocouple millivolt signal (typically 0-50mV). Software applies the inverse NIST polynomial (10th-14th order) to convert voltage to temperature. Cold junction temperature from an RTD sensor is added to the result.',
    stats: [
      { value: '0.01C', label: 'Resolution achievable' },
      { value: '100+', label: 'Channels per system' },
      { value: '24-bit', label: 'ADC resolution for TC signals' }
    ],
    examples: [
      'Thermal mapping of printed circuit boards during testing',
      'Engine dyno testing with 64-channel thermocouple arrays',
      'Battery pack thermal monitoring in EV development',
      'Climate chamber control with distributed TC networks'
    ],
    companies: ['National Instruments', 'Keysight', 'Fluke', 'Delphin', 'HBK'],
    futureImpact: 'Edge computing will bring real-time linearization and anomaly detection to each sensor node, enabling predictive maintenance through subtle drift detection in thermocouple readings.',
    color: '#3b82f6'
  },
  {
    icon: 'Flame',
    title: 'Gas Appliance Safety',
    short: 'Safety Systems',
    tagline: 'Thermocouples as flame detection safety devices',
    description: 'Every gas furnace, water heater, and stove uses a thermocouple to verify the pilot flame is lit. If the flame goes out, the thermocouple cools, its voltage drops below the threshold, and a solenoid valve cuts the gas supply within seconds, preventing dangerous gas buildup.',
    connection: 'The sensitivity curve you studied determines how quickly the thermocouple voltage drops as it cools. Near room temperature, the Seebeck coefficient is about 40 uV/C for Type K, so detecting a 500C to 25C change produces a clear signal that triggers the safety shutoff.',
    howItWorks: 'The thermocouple tip sits in the pilot flame (~600C), generating roughly 25-30 mV. This voltage holds open a gas solenoid through an electromagnetic coil. When flame loss drops the voltage below ~10 mV, the solenoid spring closes the valve in 15-60 seconds.',
    stats: [
      { value: '30mV', label: 'Typical pilot flame voltage' },
      { value: '<60s', label: 'Shutoff time after flame loss' },
      { value: '10M+', label: 'Gas appliances with TC safety' }
    ],
    examples: [
      'Residential gas furnace pilot light monitoring',
      'Commercial kitchen range safety interlocks',
      'Industrial boiler flame detection systems',
      'RV and marine propane heater safety valves'
    ],
    companies: ['Honeywell', 'White-Rodgers', 'Johnson Controls', 'Robertshaw'],
    futureImpact: 'While electronic ignition systems are replacing standing pilots, thermocouples remain the most reliable fail-safe flame sensor because they require no external power, operating purely on the Seebeck effect.',
    color: '#f59e0b'
  },
  {
    icon: 'Activity',
    title: 'Medical & Cryogenic Applications',
    short: 'Biomedical',
    tagline: 'Precision temperature measurement from -200C to body temperature',
    description: 'Type T thermocouples (Copper/Constantan) excel at low-temperature measurement for cryogenic storage of biological samples, vaccine cold chains, and cryosurgery. Their high sensitivity and linearity below 0C make them ideal for the -200C to +100C range.',
    connection: 'The type comparison you explored shows Type T has excellent linearity in the cryogenic range. Its polynomial coefficients produce less than 0.5% error from -200C to 0C, making it the preferred choice for biomedical cold chain monitoring.',
    howItWorks: 'In cryogenic applications, the thermocouple reference junction is at room temperature while the measurement junction is immersed in liquid nitrogen (-196C) or dry ice (-78.5C). The large temperature difference produces a robust signal of several millivolts.',
    stats: [
      { value: '-200C', label: 'Minimum for Type T' },
      { value: '0.5%', label: 'Linearity error below 0C' },
      { value: '7.6mV', label: 'Signal at liquid N2 temp' }
    ],
    examples: [
      'Cryogenic biobank temperature monitoring at -196C',
      'Vaccine cold chain verification (2-8C range)',
      'Cryosurgery probe temperature control',
      'Superconductor material testing in liquid helium'
    ],
    companies: ['Lake Shore Cryotronics', 'Cryomech', 'Oxford Instruments', 'Thermo Fisher'],
    futureImpact: 'Miniaturized thermocouple arrays embedded in cryogenic containers will enable real-time 3D temperature mapping, ensuring every sample in a biobank maintains the exact required temperature.',
    color: '#10b981'
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ThermocoupleNonlinearityRenderer: React.FC<ThermocoupleNonlinearityRendererProps> = ({
  phase: initialPhase,
  gamePhase: gamePhaseRaw,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}) => {
  const { isMobile } = useViewport();

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

  // Phase management
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Compensation',
    twist_review: 'Deep Insight',
    transfer: 'Transfer & Apply',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    const rawPhase = (initialPhase || gamePhaseRaw) as Phase | undefined;
    if (rawPhase && phaseOrder.includes(rawPhase)) return rawPhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  useEffect(() => {
    const rawPhase = (initialPhase || gamePhaseRaw) as Phase | undefined;
    if (rawPhase && phaseOrder.includes(rawPhase) && rawPhase !== phase) {
      setPhase(rawPhase);
    }
  }, [initialPhase, gamePhaseRaw]);

  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click' | 'beep') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      const configs: Record<string, () => void> = {
        transition: () => { oscillator.frequency.setValueAtTime(440, ctx.currentTime); gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.15); },
        correct: () => { oscillator.frequency.setValueAtTime(523, ctx.currentTime); gainNode.gain.setValueAtTime(0.15, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.2); },
        incorrect: () => { oscillator.frequency.setValueAtTime(200, ctx.currentTime); gainNode.gain.setValueAtTime(0.12, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.25); },
        complete: () => { oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(392, ctx.currentTime); gainNode.gain.setValueAtTime(0.15, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.3); },
        click: () => { oscillator.frequency.setValueAtTime(600, ctx.currentTime); gainNode.gain.setValueAtTime(0.08, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.05); },
        beep: () => { oscillator.frequency.setValueAtTime(1000, ctx.currentTime); gainNode.gain.setValueAtTime(0.05, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.03); },
      };
      configs[soundType]?.();
    } catch {
      // Audio not available
    }
  }, []);

  // Navigation
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    onGameEvent?.({ type: 'phase_changed', data: { phase: p, phaseName: phaseLabels[p] } });
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================

  const [selectedType, setSelectedType] = useState<ThermocoupleType>('K');
  const [hotTemp, setHotTemp] = useState(400);
  const [coldTemp, setColdTemp] = useState(25);
  const [showLinear, setShowLinear] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentVoltage = useMemo(() => compensatedVoltage(selectedType, hotTemp, coldTemp), [selectedType, hotTemp, coldTemp]);
  const currentLinearV = useMemo(() => linearVoltage(selectedType, hotTemp) - linearVoltage(selectedType, coldTemp), [selectedType, hotTemp, coldTemp]);
  const currentError = useMemo(() => currentVoltage - currentLinearV, [currentVoltage, currentLinearV]);
  const errorPercent = useMemo(() => currentLinearV !== 0 ? ((currentError / currentLinearV) * 100) : 0, [currentError, currentLinearV]);

  // ============================================================================
  // PREDICTIONS
  // ============================================================================

  const predictions = [
    { id: 'type_k', label: 'Type K (Chromel/Alumel) -- the most common general-purpose thermocouple' },
    { id: 'type_j', label: 'Type J (Iron/Constantan) -- popular for lower temperature ranges' },
    { id: 'type_t', label: 'Type T (Copper/Constantan) -- known for cryogenic accuracy' },
    { id: 'type_e', label: 'Type E (Chromel/Constantan) -- highest output of standard types' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Ambient temperature has no effect -- the thermocouple only measures the hot junction' },
    { id: 'offset', label: 'It adds a fixed offset error that is easy to subtract out' },
    { id: 'nonlinear_shift', label: 'It shifts the entire calibration curve nonlinearly, requiring its own compensation' },
    { id: 'destroys', label: 'It destroys the measurement entirely -- thermocouples only work at 0C reference' },
  ];

  // ============================================================================
  // TEST QUESTIONS
  // ============================================================================

  const testQuestions = [
    {
      question: 'What physical effect produces voltage in a thermocouple?',
      options: [
        { text: 'Piezoelectric effect -- mechanical stress generates voltage', correct: false },
        { text: 'Seebeck effect -- temperature difference between two dissimilar metals generates voltage', correct: true },
        { text: 'Hall effect -- magnetic field deflects charge carriers', correct: false },
        { text: 'Peltier effect -- current flow creates a temperature difference', correct: false },
      ],
      explanation: 'The Seebeck effect occurs when two different metals are joined and exposed to a temperature gradient. The difference in electron energy levels between the metals creates a measurable voltage proportional to the temperature difference.',
    },
    {
      question: 'Why is the thermocouple voltage-temperature relationship nonlinear?',
      options: [
        { text: 'Manufacturing defects make each thermocouple slightly different', correct: false },
        { text: 'The Seebeck coefficient itself varies with temperature due to changes in electron transport properties', correct: true },
        { text: 'Wire resistance increases linearly, masking the true signal', correct: false },
        { text: 'The metals expand at different rates, changing the junction area', correct: false },
      ],
      explanation: 'The Seebeck coefficient (uV/C) is temperature-dependent because the electronic band structure and phonon scattering in each metal change with temperature. This makes the overall V-T curve a polynomial rather than a straight line.',
    },
    {
      question: 'Which thermocouple type has the highest sensitivity (uV/C) near room temperature?',
      options: [
        { text: 'Type K -- Chromel/Alumel at about 41 uV/C', correct: false },
        { text: 'Type J -- Iron/Constantan at about 52 uV/C', correct: false },
        { text: 'Type T -- Copper/Constantan at about 41 uV/C', correct: false },
        { text: 'Type E -- Chromel/Constantan at about 61 uV/C', correct: true },
      ],
      explanation: 'Type E produces the highest voltage output per degree of all standard thermocouple types, approximately 61 uV/C near room temperature. This makes it excellent for detecting small temperature changes, though its maximum range (900C) is less than Type K.',
    },
    {
      question: 'What is cold junction compensation?',
      options: [
        { text: 'Cooling the reference junction to exactly 0C using an ice bath', correct: false },
        { text: 'Measuring the reference junction temperature and mathematically correcting for it', correct: true },
        { text: 'Using a third metal at the cold junction to cancel errors', correct: false },
        { text: 'Insulating the cold junction so it stays at a constant temperature', correct: false },
      ],
      explanation: 'A thermocouple measures the temperature DIFFERENCE between its two junctions. Since the cold (reference) junction is rarely at 0C, its actual temperature must be measured (usually with a thermistor or RTD) and the equivalent thermocouple voltage added to the reading.',
    },
    {
      question: 'If the cold junction temperature rises from 20C to 40C (hot junction at 500C), what happens to the measured voltage?',
      options: [
        { text: 'Voltage increases because both junctions are warmer', correct: false },
        { text: 'Voltage decreases because the temperature difference is smaller', correct: true },
        { text: 'Voltage stays the same because only the hot junction matters', correct: false },
        { text: 'Voltage doubles because there are now two heat sources', correct: false },
      ],
      explanation: 'Thermocouple voltage is proportional to the temperature DIFFERENCE between junctions. If the cold junction warms from 20C to 40C while the hot junction stays at 500C, the difference decreases from 480C to 460C, producing less voltage.',
    },
    {
      question: 'How do modern instruments linearize the thermocouple response?',
      options: [
        { text: 'They use special wire alloys that are inherently linear', correct: false },
        { text: 'They apply NIST polynomial lookup tables to convert voltage to temperature', correct: true },
        { text: 'They heat the junction to a reference point and measure the deviation', correct: false },
        { text: 'They use op-amps to reshape the analog signal into a linear curve', correct: false },
      ],
      explanation: 'NIST publishes standard polynomial coefficients (typically 10th to 14th order) for each thermocouple type. Modern instruments digitize the raw millivolt signal and apply these polynomials in software to compute accurate temperature with sub-degree precision.',
    },
    {
      question: 'At what temperature range does Type K thermocouple nonlinearity become most significant?',
      options: [
        { text: 'Near 0C where the Seebeck coefficient is lowest', correct: false },
        { text: 'Above 800C where the calibration curve deviates most from a straight line', correct: true },
        { text: 'At exactly 25C room temperature', correct: false },
        { text: 'Below -100C in cryogenic conditions', correct: false },
      ],
      explanation: 'Type K nonlinearity grows with temperature. The cubic and quadratic terms in the polynomial become dominant above 800C, causing errors of 5-10% relative to a linear approximation. This is why linearization is essential for high-temperature measurements.',
    },
    {
      question: 'Why does a thermocouple require two different metals?',
      options: [
        { text: 'One metal acts as a heater and the other as a sensor', correct: false },
        { text: 'Using the same metal would produce equal and opposite voltages that cancel out', correct: true },
        { text: 'Two metals provide twice the voltage of a single metal', correct: false },
        { text: 'The second metal acts as a ground reference for the circuit', correct: false },
      ],
      explanation: 'If both wires were the same metal, each junction would produce the same Seebeck voltage but with opposite polarity, yielding zero net voltage. Different metals have different Seebeck coefficients, so their voltages do not cancel, producing a measurable net signal.',
    },
    {
      question: 'What is the primary advantage of Type T thermocouples in cryogenic applications?',
      options: [
        { text: 'They produce the highest voltage at any temperature', correct: false },
        { text: 'They can measure temperatures above 2000C', correct: false },
        { text: 'They have excellent linearity and repeatability below 0C', correct: true },
        { text: 'Their copper wire acts as a built-in heater', correct: false },
      ],
      explanation: 'Type T (Copper/Constantan) has one of the most linear and repeatable calibration curves in the -200C to 0C range. Its polynomial coefficients produce less than 0.5% deviation from linear below 0C, making it the standard choice for cryogenics and cold chain monitoring.',
    },
    {
      question: 'What error is introduced by ignoring cold junction compensation in a system with 30C ambient temperature?',
      options: [
        { text: 'No error -- modern thermocouples self-compensate', correct: false },
        { text: 'About 30C error because the reference is assumed to be 0C', correct: true },
        { text: 'About 0.3C error -- negligible in most applications', correct: false },
        { text: 'The error depends only on the hot junction temperature', correct: false },
      ],
      explanation: 'Without cold junction compensation, the instrument assumes the reference junction is at 0C. If it is actually at 30C, the measured voltage corresponds to a temperature difference that is 30C less than the true hot junction temperature, yielding roughly a 30C reading error.',
    },
  ];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    const isCorrect = testQuestions[questionIndex].options[optionIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, optionIndex, isCorrect } });
  }, [testAnswers, playSound, onGameEvent]);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound('complete');
    onGameEvent?.({ type: 'game_completed', details: { score, total: testQuestions.length } });
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  }, [testAnswers, playSound, onGameEvent, onCorrectAnswer]);

  // ============================================================================
  // SVG VISUALIZATION: Thermocouple junction + calibration curve
  // ============================================================================

  const renderThermocoupleSVG = useCallback((interactive: boolean, showColdJunction?: boolean) => {
    const tc = tcData[selectedType];
    const svgW = isMobile ? 340 : 440;
    const svgH = isMobile ? 300 : 340;
    const plotL = 55;
    const plotR = svgW - 20;
    const plotT = 30;
    const plotB = svgH - 45;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Determine axis scales based on selected type
    const tMin = Math.max(tc.rangeMin, -200);
    const tMax = tc.rangeMax;
    const tRange = tMax - tMin;

    // Generate curve points
    const typesToDraw: ThermocoupleType[] = showAllTypes ? (['K', 'J', 'T', 'E'] as ThermocoupleType[]) : [selectedType];

    // Find max voltage for Y scale
    let maxV = 0;
    typesToDraw.forEach(t => {
      const v = Math.abs(seebeckVoltage(t, tcData[t].rangeMax));
      if (v > maxV) maxV = v;
    });
    maxV = maxV * 1.1; // 10% margin

    const tempToX = (t: number) => plotL + ((t - tMin) / tRange) * plotW;
    const voltToY = (v: number) => plotB - (v / maxV) * plotH;

    // Build curve paths
    const curvePaths: { type: ThermocoupleType; path: string; color: string }[] = [];
    typesToDraw.forEach(tcType => {
      const data = tcData[tcType];
      const steps = 80;
      const lo = Math.max(data.rangeMin, tMin);
      const hi = Math.min(data.rangeMax, tMax);
      let pathStr = '';
      for (let i = 0; i <= steps; i++) {
        const t = lo + (hi - lo) * (i / steps);
        const v = seebeckVoltage(tcType, t);
        const x = tempToX(t);
        const y = voltToY(v);
        pathStr += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
      }
      curvePaths.push({ type: tcType, path: pathStr, color: data.color });
    });

    // Linear approximation for selected type
    let linearPath = '';
    if (showLinear) {
      const steps = 40;
      const lo = Math.max(tc.rangeMin, tMin);
      const hi = tc.rangeMax;
      for (let i = 0; i <= steps; i++) {
        const t = lo + (hi - lo) * (i / steps);
        const v = linearVoltage(selectedType, t);
        const x = tempToX(t);
        const y = voltToY(v);
        linearPath += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
      }
    }

    // Current operating point marker
    const opX = tempToX(hotTemp);
    const opY = voltToY(seebeckVoltage(selectedType, hotTemp));
    const coldX = tempToX(coldTemp);
    const coldY = voltToY(seebeckVoltage(selectedType, coldTemp));

    // Error region (difference between actual and linear at operating point)
    const linOpY = showLinear ? voltToY(linearVoltage(selectedType, hotTemp)) : opY;

    // Temperature axis labels
    const numXTicks = isMobile ? 4 : 6;
    const xTicks: number[] = [];
    for (let i = 0; i <= numXTicks; i++) {
      xTicks.push(Math.round(tMin + (tRange * i) / numXTicks));
    }

    // Voltage axis labels
    const numYTicks = 4;
    const yTicks: number[] = [];
    for (let i = 0; i <= numYTicks; i++) {
      yTicks.push(Math.round((maxV * i) / numYTicks));
    }

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ maxWidth: svgW, display: 'block', margin: '0 auto' }}>
        {/* Background */}
        <rect x="0" y="0" width={svgW} height={svgH} fill={colors.bgPrimary} rx="8" />

        {/* Grid lines */}
        {xTicks.map((t, i) => (
          <line key={`xg${i}`} x1={tempToX(t)} y1={plotT} x2={tempToX(t)} y2={plotB} stroke="rgba(148,163,184,0.15)" strokeWidth="0.5" />
        ))}
        {yTicks.map((v, i) => (
          <line key={`yg${i}`} x1={plotL} y1={voltToY(v)} x2={plotR} y2={voltToY(v)} stroke="rgba(148,163,184,0.15)" strokeWidth="0.5" />
        ))}

        {/* Axes */}
        <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
        <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke="rgba(148,163,184,0.5)" strokeWidth="1" />

        {/* Axis labels */}
        {xTicks.map((t, i) => (
          <text key={`xl${i}`} x={tempToX(t)} y={plotB + 14} fill={colors.textMuted} fontSize="9" textAnchor="middle">{t}C</text>
        ))}
        {yTicks.map((v, i) => (
          <text key={`yl${i}`} x={plotL - 6} y={voltToY(v) + 3} fill={colors.textMuted} fontSize="9" textAnchor="end">{(v / 1000).toFixed(1)}</text>
        ))}

        {/* Axis titles */}
        <text x={(plotL + plotR) / 2} y={svgH - 4} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Temperature (C)</text>
        <text x="12" y={(plotT + plotB) / 2} fill={colors.textSecondary} fontSize="10" textAnchor="middle" transform={`rotate(-90, 12, ${(plotT + plotB) / 2})`}>Voltage (mV)</text>

        {/* Title */}
        <text x={svgW / 2} y="16" fill={colors.accent} fontSize="12" fontWeight="bold" textAnchor="middle">
          {showAllTypes ? 'All Types Comparison' : `${tc.name} (${tc.metals})`}
        </text>

        {/* Error shading between actual and linear */}
        {showLinear && hotTemp > 50 && (
          <>
            <line x1={opX} y1={opY} x2={opX} y2={linOpY} stroke={colors.error} strokeWidth="2" strokeDasharray="3,2" opacity="0.7" />
            <text x={opX + 6} y={(opY + linOpY) / 2} fill={colors.error} fontSize="8" fontWeight="bold">
              {Math.abs(currentError / 1000).toFixed(2)} mV err
            </text>
          </>
        )}

        {/* Linear approximation line */}
        {showLinear && linearPath && (
          <path d={linearPath} stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" fill="none" strokeDasharray="6,3" />
        )}

        {/* Actual thermocouple curves */}
        {curvePaths.map(cp => (
          <path key={cp.type} d={cp.path} stroke={cp.color} strokeWidth={cp.type === selectedType ? 2.5 : 1.5} fill="none" opacity={cp.type === selectedType ? 1 : 0.5} />
        ))}

        {/* Legend for multi-type view */}
        {showAllTypes && (
          <>
            {(['K', 'J', 'T', 'E'] as ThermocoupleType[]).map((t, i) => (
              <g key={t}>
                <line x1={plotR - 90} y1={plotT + 10 + i * 14} x2={plotR - 72} y2={plotT + 10 + i * 14} stroke={tcData[t].color} strokeWidth="2" />
                <text x={plotR - 68} y={plotT + 13 + i * 14} fill={tcData[t].color} fontSize="9" fontWeight={t === selectedType ? 'bold' : 'normal'}>{tcData[t].name}</text>
              </g>
            ))}
          </>
        )}

        {/* Operating point markers */}
        <circle cx={opX} cy={opY} r="5" fill={tc.color} stroke="white" strokeWidth="1.5" />
        <text x={opX} y={opY - 10} fill={colors.textPrimary} fontSize="9" textAnchor="middle" fontWeight="bold">
          {hotTemp}C
        </text>

        {/* Cold junction marker */}
        {showColdJunction && (
          <>
            <circle cx={coldX} cy={coldY} r="4" fill={colors.typeT} stroke="white" strokeWidth="1" />
            <text x={coldX} y={coldY - 9} fill={colors.typeT} fontSize="8" textAnchor="middle">
              CJ: {coldTemp}C
            </text>
            {/* Dashed line showing the net measurement */}
            <line x1={coldX} y1={coldY} x2={opX} y2={opY} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4,3" />
          </>
        )}

        {/* Linear approximation legend */}
        {showLinear && (
          <g>
            <line x1={plotL + 8} y1={plotT + 10} x2={plotL + 26} y2={plotT + 10} stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x={plotL + 30} y={plotT + 13} fill={colors.warning} fontSize="9">Linear approx.</text>
          </g>
        )}

        {/* Thermocouple junction schematic (bottom-right corner) */}
        <g transform={`translate(${plotR - 85}, ${plotB - 55})`}>
          {/* Wire A */}
          <line x1="0" y1="0" x2="30" y2="15" stroke={tc.color} strokeWidth="2.5" />
          {/* Wire B */}
          <line x1="0" y1="30" x2="30" y2="15" stroke={colors.textSecondary} strokeWidth="2.5" />
          {/* Junction dot */}
          <circle cx="30" cy="15" r="4" fill={colors.accent} stroke="white" strokeWidth="1" />
          {/* Labels */}
          <text x="-2" y="-3" fill={tc.color} fontSize="7" textAnchor="end">Metal A</text>
          <text x="-2" y="36" fill={colors.textSecondary} fontSize="7" textAnchor="end">Metal B</text>
          <text x="36" y="18" fill={colors.accent} fontSize="7">Junction</text>
          {/* Voltage symbol */}
          <text x="-6" y="17" fill={colors.textPrimary} fontSize="9" fontWeight="bold">V</text>
        </g>
      </svg>
    );
  }, [selectedType, hotTemp, coldTemp, showLinear, showAllTypes, isMobile]);

  // ============================================================================
  // CONTROLS PANEL
  // ============================================================================

  const renderControls = useCallback((showColdControl?: boolean) => (
    <div style={{
      background: colors.bgCard,
      padding: isMobile ? '12px' : '16px',
      borderRadius: '12px',
      margin: isMobile ? '0 16px' : '0',
    }}>
      {/* Thermocouple Type Selector */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
          Thermocouple Type
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['K', 'J', 'T', 'E'] as ThermocoupleType[]).map(t => (
            <button
              key={t}
              onClick={() => { setSelectedType(t); playSound('click'); }}
              style={{
                flex: 1,
                minWidth: '55px',
                padding: '8px 4px',
                borderRadius: '6px',
                border: selectedType === t ? `2px solid ${tcData[t].color}` : '1px solid rgba(255,255,255,0.2)',
                background: selectedType === t ? `${tcData[t].color}20` : 'transparent',
                color: selectedType === t ? tcData[t].color : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: selectedType === t ? 700 : 400,
                textAlign: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {tcData[t].name}
            </button>
          ))}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '4px' }}>
          {tcData[selectedType].metals} | Range: {tcData[selectedType].rangeMin}C to {tcData[selectedType].rangeMax}C
        </div>
      </div>

      {/* Hot Junction Temperature */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          <span>Hot Junction Temp</span>
          <span style={{ color: colors.typeK }}>{hotTemp}C</span>
        </label>
        <input
          type="range"
          min={Math.max(tcData[selectedType].rangeMin, -200)}
          max={tcData[selectedType].rangeMax}
          value={hotTemp}
          onChange={e => setHotTemp(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.typeK }}
        />
      </div>

      {/* Cold Junction Temperature */}
      {showColdControl && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>Cold Junction (Ambient)</span>
            <span style={{ color: colors.typeT }}>{coldTemp}C</span>
          </label>
          <input
            type="range"
            min={-20}
            max={80}
            value={coldTemp}
            onChange={e => setColdTemp(Number(e.target.value))}
            style={{ width: '100%', accentColor: colors.typeT }}
          />
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
          <input type="checkbox" checked={showLinear} onChange={e => setShowLinear(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Show Linear Approximation
        </label>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
          <input type="checkbox" checked={showAllTypes} onChange={e => setShowAllTypes(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Compare All Types
        </label>
      </div>

      {/* Readout Panel */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        padding: '10px',
        borderRadius: '8px',
        borderLeft: `3px solid ${tcData[selectedType].color}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '4px' }}>
          Seebeck Voltage: <span style={{ color: colors.textPrimary, fontWeight: 700 }}>{(currentVoltage / 1000).toFixed(3)} mV</span>
        </div>
        {showLinear && (
          <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '4px' }}>
            Linear Approx: <span style={{ color: colors.warning }}>{(currentLinearV / 1000).toFixed(3)} mV</span>
          </div>
        )}
        {showLinear && (
          <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '4px' }}>
            Nonlinearity Error: <span style={{ color: colors.error, fontWeight: 700 }}>{(currentError / 1000).toFixed(3)} mV ({errorPercent.toFixed(1)}%)</span>
          </div>
        )}
        <div style={{ color: colors.textSecondary, fontSize: '11px' }}>
          Sensitivity at {hotTemp}C: <span style={{ color: colors.textPrimary }}>{(tcData[selectedType].a1 + 2 * tcData[selectedType].a2 * hotTemp + 3 * tcData[selectedType].a3 * hotTemp * hotTemp).toFixed(1)} uV/C</span>
        </div>
      </div>
    </div>
  ), [selectedType, hotTemp, coldTemp, showLinear, showAllTypes, currentVoltage, currentLinearV, currentError, errorPercent, isMobile, playSound]);

  // ============================================================================
  // PROGRESS BAR & BOTTOM BAR (shared UI)
  // ============================================================================

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgCard,
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                aria-label={phaseLabels[p]}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  padding: 0,
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
          fontWeight: 700,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) { onNext(); } else { goNext(); }
    };

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: '500',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.25s ease',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
          style={{
            padding: '12px 32px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.25s ease',
            boxShadow: canProceed ? '0 4px 15px rgba(245,158,11,0.4)' : 'none',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // ---- HOOK PHASE ----
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '44px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
              Why Does Your Thermocouple Read 5C Wrong?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
              The hidden nonlinearity in temperature measurement
            </p>
          </div>

          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6 }}>
                A thermocouple is beautifully simple: join two different metals, heat the junction,
                and a voltage appears. Thomas Seebeck discovered this in 1821, and two centuries later,
                thermocouples remain the most widely used temperature sensors in industry. But there is
                a catch -- the relationship between voltage and temperature is not a straight line.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '12px' }}>
                At high temperatures, this nonlinearity can cause errors of 5-10C or more if not corrected.
              </p>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.error}`,
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.small }}>
                Imagine a furnace controller that assumes a linear sensor. At 1200C, the reading could
                be off by 40C -- enough to ruin an entire batch of precision-cast turbine blades.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.accent, fontSize: typo.heading, marginBottom: '12px' }}>
                The Seebeck Effect
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.small, lineHeight: 1.6 }}>
                When two dissimilar metals are joined at a point and that junction is heated, electrons
                in each metal respond differently to the temperature gradient. The mismatch in electron
                energy levels produces a small but measurable voltage -- typically 10 to 60 microvolts
                per degree Celsius, depending on the metal pair.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, fontSize: typo.heading, marginBottom: '12px' }}>
                Why It Matters
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.small, lineHeight: 1.6 }}>
                Different thermocouple types (K, J, T, E) use different metal pairs, each with unique
                sensitivity curves and operating ranges. Understanding their nonlinear behavior is
                essential for accurate measurement in everything from cryogenics to jet engines.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: Predict')}
      </div>
    );
  }

  // ---- PREDICT PHASE ----
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            {renderThermocoupleSVG(false)}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
              Four standard thermocouple types are commonly used in industry. Each joins two different
              metals, producing a different voltage per degree. Before you explore the curves,
              predict: which type has the highest sensitivity (microvolts per degree C) near room temperature?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.body }}>
              Which thermocouple type produces the most voltage per degree at 25C?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPrediction(p.id); playSound('click'); }}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.small,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Next: Experiment')}
      </div>
    );
  }

  // ---- PLAY PHASE ----
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>Explore Thermocouple Curves</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Change type, temperature, and toggle linearization to see nonlinearity
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, fontStyle: 'italic', marginTop: '8px' }}>
              Watch how the error grows at extreme temperatures and varies between types.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: isMobile ? '0 8px' : '0 24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderThermocoupleSVG(true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
              {renderControls(false)}
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Enable "Show Linear Approximation" and slide temperature to 1000C+ -- watch the error grow</li>
              <li>Toggle "Compare All Types" to see which has the steepest curve</li>
              <li>Switch between K, J, T, E and note their different ranges and sensitivities</li>
              <li>Find the temperature where nonlinearity error exceeds 5%</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // ---- REVIEW PHASE ----
  if (phase === 'review') {
    const wasCorrect = prediction === 'type_e';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '8px' }}>
              You predicted: {predictions.find(p => p.id === prediction)?.label || 'No selection'}
            </p>
            <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
              Type E (Chromel/Constantan) has the highest sensitivity of all standard thermocouple types
              at approximately 61 uV/C near room temperature. Its Chromel-Constantan pairing produces
              the largest Seebeck voltage per degree.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>The Physics of Thermocouple Nonlinearity</h3>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Seebeck Coefficient Variation:</strong> The voltage
                per degree (Seebeck coefficient) is NOT constant. It depends on temperature because the
                electronic band structure and phonon interactions in each metal change with thermal energy.
                This makes the V-T curve a polynomial, not a line.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Type Characteristics:</strong> Type K (Chromel/Alumel)
                is the workhorse for general use up to 1260C. Type J (Iron/Constantan) has higher output but
                oxidizes above 750C. Type T (Copper/Constantan) excels at cryogenic temperatures. Type E
                has the highest sensitivity but is limited to 900C.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Linearization:</strong> NIST publishes 10th to 14th order
                polynomial coefficients for each type. Modern instruments store these tables and apply
                software correction to convert raw millivolts to accurate temperature.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Error Growth:</strong> The nonlinearity error grows
                with the square and cube of temperature. At 200C, a linear approximation might be off by 1%.
                At 1200C, the error can reach 8-10%, corresponding to 30-40C of measurement error.
              </p>
            </div>
          </div>

          {/* Summary table */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Type Comparison Summary</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typo.small }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', color: colors.textPrimary, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Type</th>
                    <th style={{ padding: '8px', color: colors.textPrimary, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Metals</th>
                    <th style={{ padding: '8px', color: colors.textPrimary, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Range</th>
                    <th style={{ padding: '8px', color: colors.textPrimary, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Sens. (uV/C)</th>
                  </tr>
                </thead>
                <tbody>
                  {(['K', 'J', 'T', 'E'] as ThermocoupleType[]).map(t => (
                    <tr key={t}>
                      <td style={{ padding: '6px 8px', color: tcData[t].color, fontWeight: 700 }}>{tcData[t].name}</td>
                      <td style={{ padding: '6px 8px', color: colors.textSecondary }}>{tcData[t].metals}</td>
                      <td style={{ padding: '6px 8px', color: colors.textSecondary, textAlign: 'center' }}>{tcData[t].rangeMin} to {tcData[t].rangeMax}C</td>
                      <td style={{ padding: '6px 8px', color: colors.textSecondary, textAlign: 'center' }}>{tcData[t].sensitivity.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // ---- TWIST PREDICT PHASE ----
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>The Twist: Cold Junction Compensation</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              What happens when the ambient temperature changes?
            </p>
          </div>

          <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            {renderThermocoupleSVG(false, true)}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.body }}>The Hidden Variable:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
              A thermocouple does not measure absolute temperature -- it measures the temperature
              DIFFERENCE between two junctions. The hot junction sits in the process you are measuring.
              The cold (reference) junction sits at the instrument terminals, which are at ambient
              temperature. If the ambient temperature changes (summer vs. winter, air conditioning
              failure), what happens to the reading?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.body }}>
              When the cold junction temperature changes from 20C to 40C, what happens?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setTwistPrediction(p.id); playSound('click'); }}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.small,
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

  // ---- TWIST PLAY PHASE ----
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>Explore Cold Junction Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Adjust the cold junction temperature and observe the voltage change
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, fontStyle: 'italic', marginTop: '8px' }}>
              Notice how the cold junction marker moves along the nonlinear curve, not linearly.
            </p>
          </div>

          {/* Side-by-side layout with cold junction control */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: isMobile ? '0 8px' : '0 24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderThermocoupleSVG(true, true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
              {renderControls(true)}
            </div>
          </div>

          {/* Cold junction compensation explanation */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.body }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              The net thermocouple voltage is V(T_hot) - V(T_cold). As the cold junction warms up,
              V(T_cold) increases, so the net voltage DECREASES. Because V(T) is nonlinear, the
              error from ignoring cold junction compensation is ALSO nonlinear -- it is not just a
              simple offset! The compensation must account for the shape of the Seebeck curve at the
              cold junction temperature.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set hot junction to 500C and sweep cold junction from 0C to 80C</li>
              <li>Compare Type K vs Type E at the same hot/cold junction temperatures</li>
              <li>Notice the voltage readout decreasing as cold junction warms</li>
              <li>Think about what happens on a hot summer day in a factory with no AC</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // ---- TWIST REVIEW PHASE ----
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'nonlinear_shift';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Excellent!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
              The cold junction introduces a nonlinear shift, not a simple offset.
              Because the Seebeck curve itself is nonlinear, the correction needed at the cold
              junction depends on its temperature in a polynomial way.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: typo.heading }}>Cold Junction Compensation in Practice</h3>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ice Bath Reference:</strong> Historically,
                the cold junction was kept at exactly 0C using an ice-water bath. This eliminated the
                compensation problem but was impractical for field use.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Electronic Compensation:</strong> Modern instruments
                measure the cold junction temperature with a separate sensor (thermistor or RTD) at the
                terminal block. They then compute V(T_cold) using the NIST polynomial and add it to the
                measured voltage before applying the inverse polynomial to get T_hot.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Isothermal Block:</strong> All thermocouple connections
                at the instrument terminals must be at the same temperature. A copper isothermal block ensures
                that the reference junction temperature is uniform, even if multiple thermocouples are connected.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Error Budget:</strong> In high-accuracy systems,
                cold junction compensation is the dominant error source. A 0.5C error in the reference junction
                temperature directly becomes a 0.5C error in the final measurement.
              </p>
            </div>
          </div>

          {/* Compensation algorithm box */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.typeE}`,
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.typeE, marginBottom: '8px', fontSize: typo.body }}>The Compensation Algorithm</h4>
            <div style={{ fontFamily: 'monospace', color: colors.textPrimary, fontSize: '12px', lineHeight: 1.8 }}>
              <div>1. Measure raw TC voltage: V_measured</div>
              <div>2. Measure cold junction temp: T_cj (via thermistor)</div>
              <div>3. Compute cold junction voltage: V_cj = polynomial(T_cj)</div>
              <div>4. Add compensation: V_total = V_measured + V_cj</div>
              <div>5. Invert polynomial: T_hot = inverse_polynomial(V_total)</div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // ---- TRANSFER PHASE ----
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Thermocouple Nonlinearity"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // ---- TEST PHASE ----
  if (phase === 'test') {
    if (testSubmitted) {
      const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'Retry';
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : testScore >= 6 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '800px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : testScore >= 6 ? colors.warning : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent Work!' : testScore >= 6 ? 'Good Effort!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginTop: '4px' }}>
                Grade: <span style={{ color: colors.accent, fontWeight: 700 }}>{grade}</span>
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.small }}>
                {testScore >= 8 ? 'You understand thermocouple nonlinearity and compensation!' : 'Review the material and try again.'}
              </p>
            </div>

            {/* Answer Key with rich color coding */}
            <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '16px' }}>Answer Key:</h3>
              {testQuestions.map((q, idx) => {
                const userAnswer = testAnswers[idx];
                const correctIndex = q.options.findIndex(o => o.correct);
                const isCorrect = userAnswer === correctIndex;
                const wasSkipped = userAnswer === null;
                const borderColor = isCorrect ? colors.success : wasSkipped ? colors.warning : colors.error;
                return (
                  <div key={idx} style={{
                    background: colors.bgCard,
                    margin: '12px 0',
                    padding: '16px',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${borderColor}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: borderColor, fontSize: '18px', flexShrink: 0 }}>
                        {isCorrect ? '\u2713' : wasSkipped ? '?' : '\u2717'}
                      </span>
                      <span style={{ color: colors.textPrimary, fontSize: typo.small, fontWeight: 600 }}>
                        Q{idx + 1}. {q.question}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                        <span style={{ color: colors.error, fontSize: '13px' }}>Your answer: </span>
                        <span style={{ color: 'rgba(100,116,139,1)', fontSize: '13px' }}>
                          {userAnswer !== null ? q.options[userAnswer]?.text : 'No answer'}
                        </span>
                      </div>
                    )}
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                      <span style={{ color: colors.success, fontSize: '13px' }}>Correct answer: </span>
                      <span style={{ color: 'rgba(148,163,184,1)', fontSize: '13px' }}>
                        {q.options[correctIndex]?.text}
                      </span>
                    </div>
                    <div style={{
                      marginLeft: '26px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                    }}>
                      <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>Why? </span>
                      <span style={{ color: 'rgba(148,163,184,1)', fontSize: '12px', lineHeight: '1.5' }}>
                        {q.explanation}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {renderBottomBar(
            testScore >= 8,
            testScore >= 8 ? 'Complete Mastery' : 'Review & Retry',
            testScore >= 8 ? goNext : () => {
              setTestSubmitted(false);
              setCurrentTestQuestion(0);
              setTestAnswers(new Array(10).fill(null));
            }
          )}
        </div>
      );
    }

    // Test question view
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>

            {/* Question progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Context bar */}
            <div style={{
              background: 'rgba(245,158,11,0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '12px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Apply your understanding of Seebeck effect, thermocouple types, calibration curves,
                cold junction compensation, and linearization to answer the following.
              </p>
            </div>

            {/* Question */}
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.small,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          {/* Test navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: typo.small,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: typo.small,
                  fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
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
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: typo.small,
                  fontWeight: 700,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- MASTERY PHASE ----
  if (phase === 'mastery') {
    const grade = testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'D';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.title }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: typo.bodyLarge }}>
              You understand thermocouple nonlinearity and compensation
            </p>
            <div style={{
              display: 'inline-block',
              padding: '8px 24px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${colors.success}`,
              marginBottom: '24px',
            }}>
              <span style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700 }}>
                Score: {testScore}/10 | Grade: {grade}
              </span>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: typo.small }}>
              <li>The Seebeck effect: two dissimilar metals joined at a point produce a voltage proportional to temperature difference</li>
              <li>Thermocouple types K, J, T, E have different metal pairs, ranges, and sensitivity curves</li>
              <li>The voltage-temperature relationship is nonlinear due to temperature-dependent Seebeck coefficients</li>
              <li>Type E has the highest sensitivity (~61 uV/C) while Type K has the widest range (up to 1260C)</li>
              <li>NIST polynomial tables (10th-14th order) are used for software linearization</li>
              <li>Cold junction compensation is essential: the thermocouple measures temperature difference, not absolute temperature</li>
              <li>Electronic CJC uses a separate sensor (thermistor/RTD) at the terminal block to correct the reading</li>
              <li>Ignoring CJC at 30C ambient introduces roughly 30C of measurement error</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.error, marginBottom: '12px', fontSize: typo.heading }}>Engineering Insight:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
              Thermocouple nonlinearity is not just an academic curiosity. In industrial furnace control,
              a 40C measurement error at 1200C could mean the difference between a perfectly tempered
              turbine blade and a catastrophic failure. In cryogenic storage, a few degrees of error
              could compromise biological samples worth millions. Understanding and compensating for
              this nonlinearity is what separates a hobbyist temperature reading from a precision
              industrial measurement.
            </p>
          </div>

          {/* Final interactive visualization */}
          <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            {renderThermocoupleSVG(true, true)}
          </div>

          {/* Full answer key recap */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.heading }}>Test Results - Full Answer Key</h3>
            {testQuestions.map((q, idx) => {
              const userAnswer = testAnswers[idx];
              const correctIndex = q.options.findIndex(o => o.correct);
              const isCorrect = userAnswer === correctIndex;
              const wasSkipped = userAnswer === null;
              const borderColor = isCorrect ? colors.success : wasSkipped ? colors.warning : colors.error;
              return (
                <div key={idx} style={{
                  marginBottom: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${borderColor}`,
                  background: 'rgba(15, 23, 42, 0.5)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: borderColor, fontWeight: 700, fontSize: '14px' }}>
                      {isCorrect ? '\u2713' : wasSkipped ? '?' : '\u2717'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>Q{idx + 1}</span>
                    <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                      {isCorrect ? 'Correct' : wasSkipped ? 'Skipped' : 'Incorrect'}
                    </span>
                  </div>
                  <p style={{ color: colors.textMuted, fontSize: '11px', margin: 0 }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Game button */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          zIndex: 1000,
        }}>
          <button
            onClick={() => {
              onGameEvent?.({
                type: 'mastery_achieved',
                details: {
                  score: testScore,
                  total: testQuestions.length,
                  grade,
                },
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
              color: colors.textPrimary,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Complete Game
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ThermocoupleNonlinearityRenderer;
