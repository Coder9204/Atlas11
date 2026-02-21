'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ============================================================================
// GAME 261: THERMAL NOISE (JOHNSON-NYQUIST)
// Physics: Vnoise = sqrt(4 * k * T * R * BW)
// All resistors generate voltage noise due to thermal agitation of electrons.
// Temperature, resistance, and bandwidth affect the noise floor.
// ============================================================================

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

interface ThermalNoiseRendererProps {
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

// ============================================================================
// CONSTANTS
// ============================================================================
const BOLTZMANN = 1.380649e-23; // J/K

function calcVnoise(R: number, T: number, BW: number): number {
  return Math.sqrt(4 * BOLTZMANN * T * R * BW);
}

function formatSI(value: number, unit: string): string {
  if (value === 0) return `0 ${unit}`;
  const absVal = Math.abs(value);
  if (absVal >= 1e6) return `${(value / 1e6).toFixed(2)} M${unit}`;
  if (absVal >= 1e3) return `${(value / 1e3).toFixed(2)} k${unit}`;
  if (absVal >= 1) return `${value.toFixed(2)} ${unit}`;
  if (absVal >= 1e-3) return `${(value * 1e3).toFixed(2)} m${unit}`;
  if (absVal >= 1e-6) return `${(value * 1e6).toFixed(2)} \u00B5${unit}`;
  if (absVal >= 1e-9) return `${(value * 1e9).toFixed(2)} n${unit}`;
  return `${(value * 1e12).toFixed(2)} p${unit}`;
}

function logToValue(logVal: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + (logVal / 100) * (logMax - logMin));
}

function valueToLog(val: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return ((Math.log10(val) - logMin) / (logMax - logMin)) * 100;
}

// ============================================================================
// TEST QUESTIONS
// ============================================================================
const testQuestions = [
  {
    scenario: 'A precision sensor amplifier uses a 10 k\u03A9 input resistor at room temperature (300 K) with a 100 kHz bandwidth.',
    question: 'What is the approximate RMS thermal noise voltage across this resistor?',
    options: [
      { id: 'a', label: 'About 4 \u00B5V RMS', correct: true },
      { id: 'b', label: 'About 40 mV RMS' },
      { id: 'c', label: 'About 4 nV RMS' },
      { id: 'd', label: 'About 400 \u00B5V RMS' },
    ],
    explanation: 'V = sqrt(4 * 1.38e-23 * 300 * 10000 * 100000) = sqrt(1.656e-10) \u2248 4.07 \u00B5V. The Boltzmann constant is tiny, but the product of R and BW makes the noise measurable at microvolt levels.',
  },
  {
    scenario: 'An engineer has two resistors: a 1 k\u03A9 and a 100 k\u03A9, both at room temperature (300 K) with the same bandwidth.',
    question: 'How does the noise voltage of the 100 k\u03A9 compare to the 1 k\u03A9?',
    options: [
      { id: 'a', label: '100 times more noise voltage' },
      { id: 'b', label: '10 times more noise voltage', correct: true },
      { id: 'c', label: 'Same noise voltage' },
      { id: 'd', label: '10,000 times more noise voltage' },
    ],
    explanation: 'Since Vnoise \u221D sqrt(R), increasing R by 100x increases noise voltage by sqrt(100) = 10x. The square root relationship is a key design consideration.',
  },
  {
    scenario: 'A radio telescope receiver operates at 4 K (liquid helium cooling) instead of room temperature (300 K).',
    question: 'By what factor does cooling reduce the thermal noise voltage?',
    options: [
      { id: 'a', label: 'By a factor of 75 (300/4)' },
      { id: 'b', label: 'By a factor of about 8.7 (sqrt(300/4))', correct: true },
      { id: 'c', label: 'By a factor of 2' },
      { id: 'd', label: 'Cooling does not affect thermal noise' },
    ],
    explanation: 'Vnoise \u221D sqrt(T), so reducing temperature from 300 K to 4 K reduces noise by sqrt(300/4) = sqrt(75) \u2248 8.66x. This is why cryogenic cooling is used for the most sensitive receivers.',
  },
  {
    scenario: 'A designer narrows the measurement bandwidth from 10 MHz to 10 kHz by adding a filter.',
    question: 'How does the narrower bandwidth affect the measured noise voltage?',
    options: [
      { id: 'a', label: 'Noise decreases by a factor of 1000' },
      { id: 'b', label: 'Noise decreases by a factor of about 31.6', correct: true },
      { id: 'c', label: 'Noise is unchanged - bandwidth does not matter' },
      { id: 'd', label: 'Noise increases because the filter adds its own noise' },
    ],
    explanation: 'Vnoise \u221D sqrt(BW). Reducing BW by 1000x reduces noise by sqrt(1000) \u2248 31.6x. Bandwidth limiting is one of the most effective noise reduction techniques.',
  },
  {
    scenario: 'The thermal noise power spectral density of a resistor is measured across a wide frequency range at constant temperature.',
    question: 'What shape does the noise power spectral density have?',
    options: [
      { id: 'a', label: 'It increases with frequency (pink noise)' },
      { id: 'b', label: 'It is flat (white noise) up to very high frequencies', correct: true },
      { id: 'c', label: 'It decreases with frequency (1/f noise)' },
      { id: 'd', label: 'It has peaks at resonant frequencies' },
    ],
    explanation: 'Johnson-Nyquist noise has a flat (white) power spectral density: S(f) = 4kTR, independent of frequency. This holds up to THz frequencies where quantum effects become relevant.',
  },
  {
    scenario: 'An amplifier with 20 dB gain (10x voltage) amplifies the thermal noise from a 50 \u03A9 source resistor.',
    question: 'If the source resistor produces 1 \u00B5V of noise, what noise voltage appears at the amplifier output?',
    options: [
      { id: 'a', label: '1 \u00B5V - amplifiers do not amplify noise' },
      { id: 'b', label: '10 \u00B5V - the amplifier multiplies all signals including noise', correct: true },
      { id: 'c', label: '100 \u00B5V - noise is amplified more than signals' },
      { id: 'd', label: '0.1 \u00B5V - the amplifier filters out noise' },
    ],
    explanation: 'Amplifiers amplify everything at their input, including noise. The 10x gain produces 10 \u00B5V of amplified source noise at the output. The amplifier also adds its own internal noise on top.',
  },
  {
    scenario: 'A low-noise amplifier (LNA) has a noise figure of 1 dB, followed by a second stage with a noise figure of 10 dB and 20 dB gain in the first stage.',
    question: 'What determines the overall system noise figure?',
    options: [
      { id: 'a', label: 'The average of both noise figures' },
      { id: 'b', label: 'Primarily the first stage noise figure, since it dominates per the Friis formula', correct: true },
      { id: 'c', label: 'Only the second stage noise figure matters' },
      { id: 'd', label: 'The product of both noise figures' },
    ],
    explanation: 'The Friis formula: F_total = F1 + (F2-1)/G1. With G1 = 100 (20 dB), the second stage contribution is (10-1)/100 = 0.09, negligible. The first stage dominates, which is why LNA design is critical.',
  },
  {
    scenario: 'A 1 M\u03A9 feedback resistor in a transimpedance amplifier operates at 300 K with 1 MHz bandwidth.',
    question: 'What is the noise voltage contribution from this resistor?',
    options: [
      { id: 'a', label: 'About 129 \u00B5V RMS', correct: true },
      { id: 'b', label: 'About 1.29 mV RMS' },
      { id: 'c', label: 'About 12.9 \u00B5V RMS' },
      { id: 'd', label: 'About 1.29 \u00B5V RMS' },
    ],
    explanation: 'V = sqrt(4 * 1.38e-23 * 300 * 1e6 * 1e6) = sqrt(1.656e-8) \u2248 128.7 \u00B5V. High-value resistors generate significant noise, which is why transimpedance amplifiers must be carefully designed.',
  },
  {
    scenario: 'An engineer needs to measure a 10 \u00B5V signal from a sensor. The measurement system has a 50 k\u03A9 input impedance at 300 K.',
    question: 'What bandwidth should the system use to achieve at least 10:1 SNR?',
    options: [
      { id: 'a', label: 'About 36 Hz', correct: true },
      { id: 'b', label: 'About 3.6 kHz' },
      { id: 'c', label: 'About 360 kHz' },
      { id: 'd', label: 'Any bandwidth will work - the signal is large enough' },
    ],
    explanation: 'For SNR = 10, noise must be < 1 \u00B5V. V = sqrt(4kTR*BW) = 1e-6 gives BW = (1e-6)^2 / (4*1.38e-23*300*50000) \u2248 36 Hz. Very narrow bandwidth is needed for low-level measurements.',
  },
  {
    scenario: 'A noise temperature specification states that a receiver has a noise temperature of 50 K.',
    question: 'What does this noise temperature represent?',
    options: [
      { id: 'a', label: 'The physical temperature the receiver must be cooled to' },
      { id: 'b', label: 'The equivalent temperature of a resistor that would produce the same noise as the receiver internally generates', correct: true },
      { id: 'c', label: 'The maximum operating temperature' },
      { id: 'd', label: 'The temperature at which the receiver stops working' },
    ],
    explanation: 'Noise temperature is a figure of merit. A 50 K noise temperature means the receiver adds noise equivalent to a 50 K resistor at its input. Lower noise temperature = better sensitivity. It relates to noise figure by Te = T0(F-1).',
  },
];

// ============================================================================
// REAL WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '\uD83D\uDCE1',
    title: 'Radio Astronomy Receivers',
    short: 'Radio Telescopes',
    tagline: 'Detecting whispers from the cosmos',
    description: 'Radio telescopes must detect signals billions of times weaker than thermal noise from their own electronics. The cosmic microwave background was discovered partly because Penzias and Wilson could not eliminate excess noise from their antenna \u2014 it turned out to be the echo of the Big Bang.',
    connection: 'The Johnson-Nyquist formula defines the fundamental noise floor of every receiver. Radio astronomers push this limit by cryogenically cooling receivers to just a few kelvin, reducing thermal noise by factors of 10 or more.',
    howItWorks: 'Receivers use cryogenic HEMT (High Electron Mobility Transistor) amplifiers cooled to 4\u201320 K. The Friis formula ensures the first-stage LNA dominates system noise. Integration over long observation times further improves SNR by sqrt(time).',
    stats: [
      { value: '4 K', label: 'Receiver temperature' },
      { value: '< 5 K', label: 'Noise temperature' },
      { value: '10\u207B\u00B2\u2076 W', label: 'Detectable signals' },
    ],
    examples: ['ALMA (Atacama Large Millimeter Array)', 'VLA (Very Large Array)', 'SKA (Square Kilometre Array)', 'Arecibo Observatory (now collapsed)'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'Low Noise Factory'],
    futureImpact: 'Next-generation receivers for SKA will use quantum-limited amplifiers approaching the Heisenberg uncertainty noise floor.',
    color: '#6366f1',
  },
  {
    icon: '\uD83E\uDDEC',
    title: 'Biomedical Instrumentation',
    short: 'Medical Sensors',
    tagline: 'Measuring life at microvolt levels',
    description: 'ECG, EEG, and neural recording systems must resolve signals from microvolts (heart) to sub-microvolt (brain). Electrode impedance and amplifier noise combine to set the measurement floor, directly governed by Johnson-Nyquist noise.',
    connection: 'Electrode-skin impedance (typically 1\u201350 k\u03A9) generates thermal noise that competes with biological signals. Understanding the V = sqrt(4kTRBW) formula guides electrode design, bandwidth selection, and amplifier choice.',
    howItWorks: 'Low-noise instrumentation amplifiers with input-referred noise < 1 nV/sqrt(Hz) are paired with low-impedance electrodes. Bandwidth is limited to only the frequency range of interest (e.g., 0.5\u201340 Hz for EEG) to minimize integrated noise.',
    stats: [
      { value: '1 \u00B5V', label: 'EEG signal level' },
      { value: '< 1 nV/\u221AHz', label: 'Amplifier noise density' },
      { value: '0.5\u2013100 Hz', label: 'Clinical bandwidth' },
    ],
    examples: ['12-lead ECG systems', 'Brain-computer interfaces', 'Cochlear implants', 'Intracortical neural probes'],
    companies: ['Medtronic', 'Texas Instruments', 'Analog Devices', 'Neuropixels'],
    futureImpact: 'Next-generation brain-computer interfaces will need sub-microvolt noise floors across thousands of simultaneous channels.',
    color: '#10B981',
  },
  {
    icon: '\uD83D\uDE80',
    title: 'Space Infrared Detectors',
    short: 'IR Space Sensors',
    tagline: 'Seeing heat from the cold of space',
    description: 'Infrared detectors in space telescopes like JWST must detect individual photons against thermal noise backgrounds. The detector readout circuits (ROICs) generate Johnson noise from their resistance, setting fundamental sensitivity limits.',
    connection: 'JWST\'s mid-infrared detector operates at 7 K to suppress both photon noise and Johnson noise in the detector resistance. The formula 4kTR directly predicts the noise current in the readout circuit.',
    howItWorks: 'HgCdTe detector arrays are cooled to 30\u201340 K for near-IR and 7 K for mid-IR. A cryocooler maintains these temperatures. Correlated double sampling reads the signal, rejecting low-frequency noise.',
    stats: [
      { value: '7 K', label: 'MIRI detector temp' },
      { value: '10 e\u207B', label: 'Read noise (electrons)' },
      { value: '25 \u00B5m', label: 'Wavelength coverage' },
    ],
    examples: ['JWST MIRI instrument', 'Spitzer Space Telescope', 'WISE satellite', 'Euclid mission'],
    companies: ['Teledyne', 'Raytheon', 'NASA JPL', 'ESA'],
    futureImpact: 'Future missions like the Habitable Worlds Observatory will need even lower noise floors to image Earth-like exoplanets.',
    color: '#f59e0b',
  },
  {
    icon: '\u2699\uFE0F',
    title: 'Precision Measurement Systems',
    short: 'Metrology',
    tagline: 'The ultimate limits of measurement',
    description: 'High-precision instruments like lock-in amplifiers, nanovoltmeters, and gravimeters must operate at or near the thermal noise floor. Johnson noise in the measurement circuit defines the fundamental limit of voltage, current, and resistance measurements.',
    connection: 'The Johnson-Nyquist formula predicts the smallest voltage that can be measured for a given source impedance and bandwidth. This directly determines integration time, filter design, and instrument specifications.',
    howItWorks: 'Lock-in amplifiers use synchronous detection to measure signals buried deep in noise. By narrowing the effective bandwidth to < 1 Hz, thermal noise is reduced to nanovolt levels. Averaging further improves SNR as sqrt(N).',
    stats: [
      { value: '< 1 nV', label: 'Nanovoltmeter sensitivity' },
      { value: '0.01 Hz', label: 'Effective bandwidth' },
      { value: '10\u207B\u00B9\u2078 A', label: 'Current sensitivity' },
    ],
    examples: ['Keithley nanovoltmeters', 'Stanford Research lock-in amplifiers', 'Quantum Hall resistance standards', 'Gravitational wave detectors (LIGO)'],
    companies: ['Keithley/Tektronix', 'Stanford Research Systems', 'Zurich Instruments', 'National Instruments'],
    futureImpact: 'Quantum sensors may eventually surpass the classical thermal noise limit using entanglement and squeezing techniques.',
    color: '#ec4899',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ThermalNoiseRenderer: React.FC<ThermalNoiseRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();

  // Simulation state
  const [resistance, setResistance] = useState(50); // log slider 0-100 mapping to 1 - 1e6 ohms
  const [temperature, setTemperature] = useState(300); // K
  const [bandwidth, setBandwidth] = useState(50); // log slider 0-100 mapping to 1 Hz - 10 MHz
  const [ampGain, setAmpGain] = useState(20); // dB
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(testQuestions.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict steps
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => setAnimationFrame(f => f + 1), 50);
    return () => clearInterval(timer);
  }, []);

  // Derived values
  const R = useMemo(() => logToValue(resistance, 1, 1e6), [resistance]);
  const BW = useMemo(() => logToValue(bandwidth, 1, 1e7), [bandwidth]);
  const gainLinear = useMemo(() => Math.pow(10, ampGain / 20), [ampGain]);
  const noiseV = useMemo(() => calcVnoise(R, temperature, BW), [R, temperature, BW]);
  const noiseVAmplified = useMemo(() => noiseV * gainLinear, [noiseV, gainLinear]);
  const noisePSD = useMemo(() => 4 * BOLTZMANN * temperature * R, [temperature, R]); // V^2/Hz

  // ─── Colors ───
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1a1a2e',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
    primary: '#f59e0b',
    primaryDark: '#d97706',
    bgDark: '#0f172a',
    bgCard2: '#0f172a',
    bgCardLight: '#1e293b',
  };

  const typo = {
    h1: { fontSize: isMobile ? '26px' : '34px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // ─── Phase navigation ───
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Experiment', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Play', twist_review: 'Twist Review',
    transfer: 'Real World', test: 'Test', mastery: 'Mastery',
  };

  const emitPhaseChange = useCallback((p: Phase) => {
    onGameEvent?.({
      eventType: 'phase_changed',
      gameType: 'thermal_noise',
      gameTitle: 'Thermal Noise (Johnson-Nyquist)',
      details: { phase: p },
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitPhaseChange(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitPhaseChange]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ─── Noise waveform generator ───
  const getNoiseVal = useCallback((seed: number) => {
    const x = Math.sin(seed * 12.9898 + animationFrame * 0.15) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }, [animationFrame]);

  // ─── Button styles ───
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: '#ffffff',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    minHeight: '44px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  // ─── Navigation bar ───
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      background: `${colors.bgPrimary}ee`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>&#127777;&#128268;</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Thermal Noise</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        <span style={{ ...typo.small, color: colors.textMuted }}>({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})</span>
      </div>
    </nav>
  );

  // ─── Progress bar ───
  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 999 }}>
      <div style={{
        height: '100%', width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`, transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // ─── Bottom nav ───
  const renderBottomNav = () => {
    const ci = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', borderTop: `1px solid ${colors.border}`, background: colors.bgSecondary,
      }}>
        <button onClick={() => ci > 0 && prevPhase()} disabled={ci <= 0} style={{ ...secondaryButtonStyle, opacity: ci > 0 ? 1 : 0.5, cursor: ci > 0 ? 'pointer' : 'not-allowed' }}>Back</button>
        <div style={{ display: 'flex', gap: '4px' }}>
          {phaseOrder.map((p, i) => (
            <button key={p} onClick={() => goToPhase(p)} aria-label={phaseLabels[p]} title={phaseLabels[p]}
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: i <= ci ? colors.accent : colors.border, cursor: 'pointer', border: 'none', padding: 0 }} />
          ))}
        </div>
        <button onClick={() => ci < phaseOrder.length - 1 && nextPhase()} disabled={ci >= phaseOrder.length - 1}
          style={{ ...primaryButtonStyle, padding: '10px 20px', fontSize: '14px', opacity: ci < phaseOrder.length - 1 ? 1 : 0.5, cursor: ci < phaseOrder.length - 1 ? 'pointer' : 'not-allowed' }}>Next</button>
      </div>
    );
  };

  // ============================================================================
  // SVG: Resistor Circuit Diagram
  // ============================================================================
  const renderCircuitDiagram = (w: number, h: number) => {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Resistor thermal noise circuit">
        <defs>
          <filter id="noiseGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill={colors.bgCard} rx="12" />

        {/* Title */}
        <text x={w / 2} y={20} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">Resistor + Noise Source Model</text>

        {/* Wire left */}
        <line x1={30} y1={h / 2} x2={80} y2={h / 2} stroke={colors.textMuted} strokeWidth="2" />

        {/* Resistor body (zigzag) */}
        <path d={`M 80 ${h / 2} L 90 ${h / 2 - 12} L 110 ${h / 2 + 12} L 130 ${h / 2 - 12} L 150 ${h / 2 + 12} L 170 ${h / 2 - 12} L 180 ${h / 2}`}
          fill="none" stroke={colors.accent} strokeWidth="2.5" filter="url(#noiseGlow)" />

        {/* Wire middle */}
        <line x1={180} y1={h / 2} x2={210} y2={h / 2} stroke={colors.textMuted} strokeWidth="2" />

        {/* Noise voltage source (circle with ~ ) */}
        <circle cx={240} cy={h / 2} r={20} fill="none" stroke="#ef4444" strokeWidth="2" />
        <text x={240} y={h / 2 + 5} fill="#ef4444" fontSize="18" textAnchor="middle" fontWeight="700">~</text>

        {/* Wire right */}
        <line x1={260} y1={h / 2} x2={w - 30} y2={h / 2} stroke={colors.textMuted} strokeWidth="2" />

        {/* Labels */}
        <text x={130} y={h / 2 - 22} fill={colors.accent} fontSize="13" textAnchor="middle" fontWeight="600">R = {formatSI(R, '\u03A9')}</text>
        <text x={240} y={h / 2 + 42} fill="#ef4444" fontSize="11" textAnchor="middle">Vn = {formatSI(noiseV, 'V')}</text>

        {/* Terminal labels */}
        <text x={25} y={h / 2 + 4} fill={colors.textMuted} fontSize="11" textAnchor="middle">+</text>
        <text x={w - 25} y={h / 2 + 4} fill={colors.textMuted} fontSize="11" textAnchor="middle">-</text>
      </svg>
    );
  };

  // ============================================================================
  // SVG: Real-time Noise Waveform
  // ============================================================================
  const renderNoiseWaveform = (w: number, h: number, amplified: boolean) => {
    const pad = { top: 28, right: 10, bottom: 28, left: 40 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    const numPts = 120;
    const noiseScale = amplified ? noiseVAmplified : noiseV;
    // Normalize: map noise voltage to pixel amplitude (max ~50% of plot height)
    const refNoise = 1e-3; // 1 mV reference for scaling
    const amplitude = Math.min(ph * 0.48, (noiseScale / refNoise) * ph * 0.1);

    let pathD = '';
    for (let i = 0; i < numPts; i++) {
      const x = pad.left + (i / (numPts - 1)) * pw;
      const nv = getNoiseVal(i * 3.7 + (amplified ? 500 : 0));
      const y = pad.top + ph / 2 - nv * amplitude;
      pathD += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={w} height={h} fill={colors.bgCard} rx="12" />
        <text x={w / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
          {amplified ? `Amplified Noise (${ampGain} dB gain)` : 'Noise Voltage Waveform'}
        </text>

        {/* Plot area */}
        <rect x={pad.left} y={pad.top} width={pw} height={ph} fill={colors.bgPrimary} stroke={colors.border} rx="4" />

        {/* Zero line */}
        <line x1={pad.left} y1={pad.top + ph / 2} x2={pad.left + pw} y2={pad.top + ph / 2} stroke={colors.border} strokeDasharray="4,4" />

        {/* Noise waveform */}
        <path d={pathD} fill="none" stroke={amplified ? '#ef4444' : colors.accent} strokeWidth="1.5" opacity="0.9" />

        {/* Y-axis labels */}
        <text x={pad.left - 4} y={pad.top + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">+</text>
        <text x={pad.left - 4} y={pad.top + ph} fill={colors.textMuted} fontSize="9" textAnchor="end">-</text>

        {/* RMS indicator */}
        <text x={pad.left + pw - 4} y={h - 6} fill={amplified ? '#ef4444' : colors.accent} fontSize="10" textAnchor="end" fontWeight="600">
          RMS: {formatSI(amplified ? noiseVAmplified : noiseV, 'V')}
        </text>
      </svg>
    );
  };

  // ============================================================================
  // SVG: PSD Plot (flat white noise)
  // ============================================================================
  const renderPSDPlot = (w: number, h: number) => {
    const pad = { top: 28, right: 10, bottom: 32, left: 50 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    // PSD is flat: 4kTR V^2/Hz
    const psdVal = noisePSD;
    const barH = Math.min(ph * 0.7, Math.max(ph * 0.15, Math.log10(psdVal + 1e-30) / (-8) * ph * 0.1));

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={w} height={h} fill={colors.bgCard} rx="12" />
        <text x={w / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
          Power Spectral Density (White Noise)
        </text>

        {/* Plot area */}
        <rect x={pad.left} y={pad.top} width={pw} height={ph} fill={colors.bgPrimary} stroke={colors.border} rx="4" />

        {/* Flat PSD line */}
        <line x1={pad.left + 2} y1={pad.top + ph * 0.35} x2={pad.left + pw - 2} y2={pad.top + ph * 0.35}
          stroke={colors.accent} strokeWidth="2.5" />

        {/* Shaded area under PSD */}
        <rect x={pad.left + 2} y={pad.top + ph * 0.35} width={pw - 4} height={ph * 0.65 - 2}
          fill={colors.accent} opacity="0.1" />

        {/* BW marker */}
        <line x1={pad.left + pw * 0.7} y1={pad.top} x2={pad.left + pw * 0.7} y2={pad.top + ph}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" />
        <text x={pad.left + pw * 0.7} y={pad.top + ph + 14} fill="#ef4444" fontSize="9" textAnchor="middle">
          BW = {formatSI(BW, 'Hz')}
        </text>

        {/* Labels */}
        <text x={pad.left - 4} y={pad.top + ph * 0.35 + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">
          S(f)
        </text>
        <text x={pad.left + pw / 2} y={h - 4} fill={colors.textMuted} fontSize="10" textAnchor="middle">
          Frequency
        </text>
        <text x={pad.left + pw / 2} y={pad.top + ph * 0.35 - 8} fill={colors.accent} fontSize="10" textAnchor="middle" fontWeight="600">
          4kTR = {psdVal.toExponential(2)} V\u00B2/Hz
        </text>
      </svg>
    );
  };

  // ============================================================================
  // SLIDER COMPONENT
  // ============================================================================
  const SliderControl = ({ label, value, displayValue, min, max, step, onChange }: {
    label: string; value: number; displayValue: string; min: number; max: number; step: number; onChange: (v: number) => void;
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{displayValue}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        onInput={e => onChange(parseFloat((e.target as HTMLInputElement).value))}
        style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }} />
    </div>
  );

  // ============================================================================
  // Calculate test score
  // ============================================================================
  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((acc, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return acc + (ans === correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // ─── HOOK ───
  const renderHook = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '80px', textAlign: 'center', overflowY: 'auto' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'noisePulse 2s infinite' }}>&#127777;&#128268;</div>
      <style>{`@keyframes noisePulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.9; } }`}</style>

      <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
        Why Is There Static Even With Nothing Connected?
      </h1>
      <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
        Turn up the gain on any amplifier with just a resistor at the input. You will hear
        <span style={{ color: colors.accent, fontWeight: 600 }}> hissing, crackling noise </span>
        \u2014 even with no signal connected. This is <strong>thermal noise</strong>, an unavoidable consequence of electrons jostling randomly at any temperature above absolute zero.
      </p>

      <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '500px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
          "In 1926, John B. Johnson discovered that resistors generate voltage noise proportional to temperature and resistance. Harry Nyquist then derived the formula from thermodynamics. This <strong>Johnson-Nyquist noise</strong> sets the fundamental limit of every electronic measurement."
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        {renderNoiseWaveform(isMobile ? 310 : 460, 150, true)}
      </div>

      <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
        Explore Thermal Noise &rarr;
      </button>
    </div>
  );

  // ─── PREDICT ───
  const renderPredict = () => {
    const options = [
      { id: 'a', text: 'The 1 k\u03A9 resistor produces more noise (lower resistance = more current)' },
      { id: 'b', text: 'Both produce the same noise (noise depends only on temperature)' },
      { id: 'c', text: 'The 100 k\u03A9 resistor produces more noise (higher resistance = more thermal agitation)', correct: true },
    ];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '14px', marginBottom: '20px', border: `1px solid ${colors.accent}44` }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>Make Your Prediction</p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
            Two resistors at room temperature, measured over the same bandwidth: 1 k\u03A9 vs 100 k\u03A9. Which has more noise voltage?
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderCircuitDiagram(isMobile ? 310 : 400, 120)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {options.map(opt => (
              <button key={opt.id} onClick={() => { playSound('click'); setPrediction(opt.id); setPredictStep(1); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', padding: '14px 18px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px',
                }}>
                <span style={{
                  display: 'inline-block', width: '26px', height: '26px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? '#fff' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '26px', marginRight: '10px', fontWeight: 700, fontSize: '13px',
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{ marginBottom: '16px' }}>
              {prediction === 'c' ? (
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0 }}>Correct! Since V_noise is proportional to sqrt(R), the 100 k\u03A9 produces sqrt(100) = 10x more noise than the 1 k\u03A9.</p>
                </div>
              ) : (
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>Not quite. The noise voltage is proportional to sqrt(R), so higher resistance means more noise. Let's explore why!</p>
                </div>
              )}
            </div>
          )}

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Experiment With the Formula &rarr;
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── PLAY ───
  const renderPlay = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Explore Thermal Noise</h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
          Adjust resistance, temperature, and bandwidth to see how noise changes.
        </p>

        <div style={{ background: `${colors.accent}15`, border: `1px solid ${colors.accent}40`, borderRadius: '12px', padding: '14px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.accent }}>Formula:</strong> V<sub>noise</sub> = \u221A(4 \u00B7 k \u00B7 T \u00B7 R \u00B7 BW) &nbsp;|&nbsp; k = 1.381 \u00D7 10<sup>-23</sup> J/K
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: isMobile ? 'center' : 'flex-start' }}>
          {/* Left: Visualizations */}
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              {renderCircuitDiagram(isMobile ? 310 : 380, 110)}
            </div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              {renderNoiseWaveform(isMobile ? 310 : 380, 140, false)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderPSDPlot(isMobile ? 310 : 380, 140)}
            </div>
          </div>

          {/* Right: Controls + Readouts */}
          <div style={{ width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
            <div style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px', border: `1px solid ${colors.border}` }}>
              <SliderControl label="Resistance" value={resistance} displayValue={formatSI(R, '\u03A9')} min={0} max={100} step={1} onChange={setResistance} />
              <SliderControl label="Temperature" value={temperature} displayValue={`${temperature} K`} min={4} max={500} step={1} onChange={setTemperature} />
              <SliderControl label="Bandwidth" value={bandwidth} displayValue={formatSI(BW, 'Hz')} min={0} max={100} step={1} onChange={setBandwidth} />
              <SliderControl label="Amplifier Gain" value={ampGain} displayValue={`${ampGain} dB`} min={0} max={60} step={1} onChange={setAmpGain} />
            </div>

            {/* Metric readouts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
              {[
                { label: 'RMS Noise', value: formatSI(noiseV, 'V'), color: colors.accent },
                { label: 'Amplified', value: formatSI(noiseVAmplified, 'V'), color: '#ef4444' },
                { label: 'PSD', value: `${noisePSD.toExponential(2)} V\u00B2/Hz`, color: '#6366f1' },
                { label: 'Noise Power', value: formatSI(noiseV * noiseV / R, 'W'), color: colors.success },
              ].map((m, i) => (
                <div key={i} style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: m.color, wordBreak: 'break-all' }}>{m.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '2px' }}>{m.label}</div>
                </div>
              ))}
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
              Understand the Physics &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── REVIEW ───
  const renderReview = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
          The Johnson-Nyquist Formula
        </h2>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.accent}40`, textAlign: 'center' }}>
          <p style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.accent, marginBottom: '12px', fontFamily: 'Georgia, serif' }}>
            V<sub>n</sub> = \u221A(4 k T R \u0394f)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', textAlign: 'left', marginTop: '16px' }}>
            {[
              { sym: 'k', desc: 'Boltzmann constant = 1.381 \u00D7 10\u207B\u00B2\u00B3 J/K' },
              { sym: 'T', desc: 'Absolute temperature in Kelvin' },
              { sym: 'R', desc: 'Resistance in Ohms' },
              { sym: '\u0394f', desc: 'Measurement bandwidth in Hz' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '10px', borderRadius: '8px', background: `${colors.accent}10` }}>
                <span style={{ color: colors.accent, fontWeight: 700, marginRight: '8px', fontSize: '16px' }}>{item.sym}</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { title: 'Why does it exist?', body: 'At any temperature above 0 K, electrons in a resistor have thermal kinetic energy. Their random motion creates tiny fluctuating voltages across the resistor terminals. This is a fundamental thermodynamic phenomenon \u2014 it cannot be eliminated by better manufacturing.' },
            { title: 'Key relationships', body: 'Noise voltage scales with \u221AR, \u221AT, and \u221ABW. Doubling resistance increases noise by 41%, not 100%. This square-root dependence is crucial for circuit design trade-offs.' },
            { title: 'White noise property', body: 'Thermal noise has a flat (white) power spectral density: every Hz of bandwidth contributes equal noise power. This is true up to frequencies around kT/h \u2248 6 THz at room temperature, where quantum effects take over.' },
            { title: 'Boltzmann constant', body: 'k = 1.381 \u00D7 10\u207B\u00B2\u00B3 J/K bridges the microscopic world of thermal energy (per degree) to measurable electrical quantities. It appears throughout statistical mechanics and thermodynamics.' },
          ].map((item, i) => (
            <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>

        <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
          Explore the Twist: Cryogenic Cooling &rarr;
        </button>
      </div>
    </div>
  );

  // ─── TWIST PREDICT ───
  const renderTwistPredict = () => {
    const options = [
      { id: 'a', text: 'Cooling has no effect \u2014 noise is a property of the resistor material' },
      { id: 'b', text: 'Cooling to 77 K reduces noise voltage by about 2x compared to 300 K', correct: true },
      { id: 'c', text: 'Cooling completely eliminates thermal noise' },
    ];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '14px', marginBottom: '20px', border: `1px solid ${colors.accent}44` }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>Twist: Cryogenic Electronics</p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            What happens when we cool a 10 k\u03A9 resistor from room temperature (300 K) to liquid nitrogen temperature (77 K)?
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            Scientists use cryogenic cooling for the most sensitive measurements. How much does it help with thermal noise?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {options.map(opt => (
              <button key={opt.id} onClick={() => { playSound('click'); setTwistPrediction(opt.id); setTwistPredictStep(1); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', padding: '14px 18px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px',
                }}>
                <span style={{
                  display: 'inline-block', width: '26px', height: '26px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: twistPrediction === opt.id ? '#fff' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '26px', marginRight: '10px', fontWeight: 700, fontSize: '13px',
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{ marginBottom: '16px' }}>
              {twistPrediction === 'b' ? (
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                    Correct! \u221A(300/77) \u2248 1.97, so noise drops by about 2x at liquid nitrogen temperature.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                    Not quite. Since V \u221D \u221AT, cooling to 77 K reduces noise by \u221A(300/77) \u2248 2x. Let's explore!
                  </p>
                </div>
              )}
            </div>
          )}

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Cool It Down &rarr;
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── TWIST PLAY ───
  const renderTwistPlay = () => {
    const temps = [
      { label: 'Room (300 K)', T: 300, color: '#ef4444' },
      { label: 'LN\u2082 (77 K)', T: 77, color: '#3b82f6' },
      { label: 'LHe (4 K)', T: 4, color: '#8b5cf6' },
    ];
    const refR = 10000; // 10 kOhm
    const refBW = 100000; // 100 kHz

    // Friis formula demo
    const nf1_dB = 1; // First stage NF (dB)
    const nf2_dB = 10; // Second stage NF (dB)
    const gain1_dB = ampGain;
    const nf1 = Math.pow(10, nf1_dB / 10);
    const nf2 = Math.pow(10, nf2_dB / 10);
    const g1 = Math.pow(10, gain1_dB / 10);
    const nfTotal = nf1 + (nf2 - 1) / g1;
    const nfTotal_dB = 10 * Math.log10(nfTotal);

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Cryogenic Noise Reduction
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
            Compare thermal noise at different temperatures for a 10 k\u03A9 resistor, 100 kHz BW.
          </p>

          {/* Temperature comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {temps.map((t, i) => {
              const vn = calcVnoise(refR, t.T, refBW);
              return (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px', border: `1px solid ${t.color}40`, textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{t.T <= 4 ? '\u2744\uFE0F' : t.T <= 77 ? '\uD83E\uDDCA' : '\uD83C\uDF21\uFE0F'}</div>
                  <div style={{ ...typo.h3, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary, margin: '8px 0' }}>{formatSI(vn, 'V')}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    {t.T === 300 ? 'Reference' : `${(Math.sqrt(300 / t.T)).toFixed(1)}x reduction`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Noise figure chain */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Amplifier Chain Noise Figure (Friis Formula)</h3>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
              F<sub>total</sub> = F<sub>1</sub> + (F<sub>2</sub> - 1) / G<sub>1</sub>
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '10px', background: `${colors.success}15`, border: `1px solid ${colors.success}40` }}>
                <div style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>Stage 1 (LNA)</div>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>NF = {nf1_dB} dB</div>
              </div>
              <div style={{ color: colors.textMuted, fontSize: '24px' }}>&rarr;</div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '10px', background: `${colors.error}15`, border: `1px solid ${colors.error}40` }}>
                <div style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>Stage 2</div>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>NF = {nf2_dB} dB</div>
              </div>
            </div>

            <SliderControl label="First Stage Gain" value={ampGain} displayValue={`${ampGain} dB`} min={0} max={40} step={1} onChange={setAmpGain} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{nfTotal_dB.toFixed(2)} dB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Total Noise Figure</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: g1 > 10 ? colors.success : colors.error }}>{((nf2 - 1) / g1).toFixed(3)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Stage 2 Contribution</div>
              </div>
            </div>

            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px', fontStyle: 'italic' }}>
              With {ampGain} dB first-stage gain, the second stage contributes only {((nf2 - 1) / g1 * 100).toFixed(1)}% to total noise figure.
              {g1 > 10 ? ' The LNA dominates \u2014 good design!' : ' Increase first-stage gain to suppress second-stage noise.'}
            </p>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Deep Dive: Noise Temperature &rarr;
          </button>
        </div>
      </div>
    );
  };

  // ─── TWIST REVIEW ───
  const renderTwistReview = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
          Noise Figure & Noise Temperature
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            {
              title: 'Noise Figure (NF)',
              body: 'Noise Figure measures how much noise an amplifier adds relative to a perfect noiseless amplifier. NF = 1 (0 dB) means no added noise. A 3 dB NF means the amplifier doubles the noise power. NF = SNR_in / SNR_out (in linear terms).',
            },
            {
              title: 'Noise Temperature (Te)',
              body: 'Noise temperature is an equivalent way to express amplifier noise: Te = T\u2080(F - 1), where T\u2080 = 290 K (standard reference). A device with Te = 50 K adds noise equivalent to a 50 K resistor at its input. Lower is better.',
            },
            {
              title: 'Friis Cascade Formula',
              body: 'For cascaded amplifiers: F_total = F\u2081 + (F\u2082 - 1)/G\u2081 + (F\u2083 - 1)/(G\u2081G\u2082) + ... The first stage dominates! This is why low-noise amplifiers (LNAs) are placed at the antenna input in receiver chains.',
            },
            {
              title: 'Why cryogenic cooling works',
              body: 'Cooling reduces both the source noise (Johnson noise \u221D \u221AT) and the amplifier\'s internal noise. At 4 K, thermal noise is \u221A(300/4) = 8.66x lower than room temperature. Combined with cryogenic LNAs (Te < 5 K), this enables detection of incredibly weak signals.',
            },
          ].map((item, i) => (
            <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>

        <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
          Real-World Applications &rarr;
        </button>
      </div>
    </div>
  );

  // ─── TEST ───
  const renderTest = () => {
    if (testSubmitted) {
      return (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '80px' }}>
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{testScore >= 7 ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}</div>
            <h2 style={{ ...typo.h2, color: testScore >= 7 ? colors.success : colors.warning }}>{testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}</h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>{testScore} / {testQuestions.length}</p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {testScore >= 7 ? 'You\'ve mastered Thermal Noise concepts!' : 'Review the concepts and try again.'}
            </p>
            {testScore >= 7 ? (
              <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
                View Mastery Results &rarr;
              </button>
            ) : (
              <button onClick={() => { setTestSubmitted(false); setTestAnswers(Array(testQuestions.length).fill(null)); setCurrentQuestion(0); setTestScore(0); goToPhase('hook'); }}
                style={primaryButtonStyle}>
                Review & Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    const q = testQuestions[currentQuestion];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '80px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>Question {currentQuestion + 1} of {testQuestions.length}</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '14px', marginBottom: '14px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{q.scenario}</p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '18px' }}>{q.question}</h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {q.options.map(opt => (
              <button key={opt.id} onClick={() => { playSound('click'); const na = [...testAnswers]; na[currentQuestion] = opt.id; setTestAnswers(na); }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', minHeight: '44px',
                }}>
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? '#fff' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button onClick={() => setCurrentQuestion(currentQuestion - 1)} style={{ ...secondaryButtonStyle, flex: 1 }}>Previous</button>
            )}
            {currentQuestion < testQuestions.length - 1 ? (
              <button onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: '#fff', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed', fontWeight: 600, minHeight: '44px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>Next</button>
            ) : (
              <button onClick={() => {
                const score = calculateTestScore();
                setTestScore(score);
                setTestSubmitted(true);
                playSound(score >= 7 ? 'complete' : 'failure');
                onGameEvent?.({
                  eventType: 'game_completed',
                  gameType: 'thermal_noise',
                  gameTitle: 'Thermal Noise (Johnson-Nyquist)',
                  details: { score, total: testQuestions.length },
                  timestamp: Date.now(),
                });
              }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: '#fff', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', fontWeight: 600, minHeight: '44px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── MASTERY ───
  const renderMastery = () => {
    const finalScore = calculateTestScore();
    const total = testQuestions.length;
    const pct = Math.round((finalScore / total) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', paddingTop: '80px', paddingBottom: '100px', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
        <h2 style={{
          fontSize: '28px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Thermal Noise Master!
        </h2>
        <div style={{ fontSize: '40px', fontWeight: 800, color: pct >= 70 ? '#22c55e' : '#f59e0b', marginBottom: '4px' }}>
          {finalScore} / {total} ({grade})
        </div>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
          {pct >= 90 ? 'Outstanding \u2014 you truly understand thermal noise!' : pct >= 70 ? 'Great work \u2014 you\'ve mastered the fundamentals!' : 'Good effort \u2014 review the answer key to strengthen your understanding.'}
        </p>

        {/* Answer Key */}
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px', textAlign: 'left', width: '100%', maxWidth: '640px' }}>Answer Key</h3>
        <div style={{ maxWidth: '640px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '20px' }}>
          {testQuestions.map((tq, qIdx) => {
            const userAns = testAnswers[qIdx];
            const correctOpt = tq.options.find(o => o.correct);
            const isCorrect = userAns === correctOpt?.id;
            const userOpt = tq.options.find(o => o.id === userAns);
            return (
              <div key={qIdx} style={{
                marginBottom: '12px', padding: '14px', borderRadius: '10px',
                background: 'rgba(30,41,59,0.7)', borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`, textAlign: 'left',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', lineHeight: 1.4 }}>
                  <span style={{ fontSize: '16px', marginRight: '6px' }}>{isCorrect ? '\u2705' : '\u274C'}</span>
                  {qIdx + 1}. {tq.question}
                </p>
                {!isCorrect && userOpt && (
                  <p style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '6px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)' }}>
                    Your answer: {userOpt.label}
                  </p>
                )}
                <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)' }}>
                  Correct: {correctOpt?.label}
                </p>
                {tq.explanation && (
                  <p style={{ fontSize: '12px', color: '#fbbf24', padding: '8px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', lineHeight: 1.5 }}>
                    Why? {tq.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed bottom Complete Game button */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'linear-gradient(to top, #0f172a 80%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
          <button
            onClick={() => {
              onGameEvent?.({
                eventType: 'game_completed',
                gameType: 'thermal_noise',
                gameTitle: 'Thermal Noise (Johnson-Nyquist)',
                details: { score: finalScore, total, pct },
                timestamp: Date.now(),
              });
              onGameEvent?.({
                eventType: 'phase_changed',
                gameType: 'thermal_noise',
                gameTitle: 'Thermal Noise (Johnson-Nyquist)',
                details: { type: 'mastery_achieved', score: finalScore, total, pct },
                timestamp: Date.now(),
              });
              window.location.href = '/games';
            }}
            style={{
              padding: '14px 48px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
              fontWeight: 700, fontSize: '16px', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
              fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '48px',
            }}
          >
            Complete Game
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE ROUTER
  // ============================================================================
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
        <TransferPhaseView
          conceptName="Thermal Noise"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          playSound={playSound}
        />
      );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {phase !== 'transfer' && renderNavBar()}
      {phase !== 'transfer' && renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderPhaseContent()}
      </div>
      {phase !== 'transfer' && phase !== 'mastery' && renderBottomNav()}
    </div>
  );
};

export default ThermalNoiseRenderer;
