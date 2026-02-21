'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// =============================================================================
// DAC Settling Time - Complete 10-Phase Game (#257)
// Understanding how DAC outputs settle after code changes, glitch energy,
// and deglitching techniques in mixed-signal design
// =============================================================================

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

interface DACSettlingTimeRendererProps {
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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: 'An engineer switches a 12-bit DAC from code 2048 to code 2049 (midscale transition). The oscilloscope shows a large negative spike on the analog output before it settles to the new value.',
    question: 'What causes this large glitch at the midscale code transition?',
    options: [
      { id: 'a', label: 'The DAC power supply is unstable at midscale' },
      { id: 'b', label: 'A major carry propagation: all lower bits toggle simultaneously, creating momentary incorrect intermediate codes', correct: true },
      { id: 'c', label: 'The reference voltage collapses at half scale' },
      { id: 'd', label: 'Thermal noise is amplified at the midpoint' },
    ],
    explanation: 'At midscale (e.g., 011...1 to 100...0), every bit toggles simultaneously. Due to slight timing mismatches between switches, the DAC momentarily outputs incorrect intermediate codes, producing a large glitch spike. This is the worst-case code transition for glitch energy.',
  },
  {
    scenario: 'A 14-bit DAC datasheet specifies a settling time of 1 microsecond to 1/2 LSB accuracy. The engineer notices the output appears settled after only 200 ns on the oscilloscope.',
    question: 'Why might the datasheet specify a much longer settling time than what appears on the scope?',
    options: [
      { id: 'a', label: 'The oscilloscope bandwidth is filtering out the remaining ringing, hiding the fine settling behavior', correct: true },
      { id: 'b', label: 'The datasheet is always conservative by 5x' },
      { id: 'c', label: 'The DAC is performing better than spec' },
      { id: 'd', label: 'Temperature in the lab is lower than spec conditions' },
    ],
    explanation: 'Settling to 1/2 LSB in a 14-bit DAC means settling to within 0.003% of full scale. Oscilloscope bandwidth limitations and noise floor often mask the fine settling tail. The last few LSBs of settling (thermal tails, dielectric absorption) take the longest and are hardest to measure.',
  },
  {
    scenario: 'A waveform generator uses an R-2R ladder DAC running at 100 MSPS. The output spectrum shows spurious tones that are not present in the intended signal.',
    question: 'What is the primary source of these spurious tones?',
    options: [
      { id: 'a', label: 'Quantization noise from insufficient bit depth' },
      { id: 'b', label: 'Code-dependent glitch energy that repeats periodically with the output waveform', correct: true },
      { id: 'c', label: 'Power supply 60 Hz hum coupling in' },
      { id: 'd', label: 'Clock feedthrough from the digital input' },
    ],
    explanation: 'Glitch energy in R-2R DACs is code-dependent -- certain transitions produce larger glitches than others. When generating a periodic waveform, these glitches repeat at predictable frequencies, creating spurious tones (spurs) in the output spectrum that degrade SFDR.',
  },
  {
    scenario: 'An audio DAC (24-bit, 192 kHz) uses a sample-and-hold deglitcher on its output. The THD+N specification improves by 20 dB compared to the raw DAC output.',
    question: 'How does the sample-and-hold deglitcher achieve this improvement?',
    options: [
      { id: 'a', label: 'It holds the previous output value during the code transition, then samples the settled new value after the glitch has passed', correct: true },
      { id: 'b', label: 'It averages the glitch with the settled value' },
      { id: 'c', label: 'It clips any voltage above full scale' },
      { id: 'd', label: 'It adds a complementary glitch to cancel the original' },
    ],
    explanation: 'A sample-and-hold deglitcher holds the previous valid output during the code transition window. After the DAC output has settled past the glitch, it samples the new settled value. This effectively removes the glitch from the output, dramatically improving distortion performance.',
  },
  {
    scenario: 'An engineer compares two 16-bit DACs for a precision measurement system. DAC-A settles in 5 us and DAC-B settles in 500 ns, but DAC-A has better DC accuracy.',
    question: 'For generating a slowly-changing calibration voltage that must be accurate to 1 LSB, which DAC is more suitable?',
    options: [
      { id: 'a', label: 'DAC-B, because faster settling always means better performance' },
      { id: 'b', label: 'DAC-A, because DC accuracy matters more than settling speed for slow signals', correct: true },
      { id: 'c', label: 'Neither -- 16-bit DACs cannot achieve 1 LSB accuracy' },
      { id: 'd', label: 'Both are equivalent since the signal changes slowly' },
    ],
    explanation: 'For slowly-changing precision voltages, the final settled accuracy (DC linearity, offset, gain error) matters far more than how quickly the DAC gets there. DAC-A with better DC accuracy will produce more precise output voltages even though it settles more slowly.',
  },
  {
    scenario: 'A sigma-delta DAC and an R-2R ladder DAC both have 16-bit resolution. The sigma-delta output appears much smoother on an oscilloscope during code transitions.',
    question: 'Why does the sigma-delta DAC show less glitch energy?',
    options: [
      { id: 'a', label: 'Sigma-delta DACs have no code transitions' },
      { id: 'b', label: 'The sigma-delta architecture uses oversampling and noise shaping, so only a 1-bit DAC switches, producing minimal glitches', correct: true },
      { id: 'c', label: 'Sigma-delta DACs have built-in low-pass filters only' },
      { id: 'd', label: 'R-2R DACs are simply an older, inferior technology' },
    ],
    explanation: 'Sigma-delta DACs convert the multi-bit code into a high-speed 1-bit (or few-bit) stream using noise shaping. The internal DAC only switches between two levels, so there are no major carry transitions. The integrated digital filter and analog reconstruction filter smooth the output.',
  },
  {
    scenario: 'A DAC drives a 50-ohm transmission line to a remote load. After a code change, the output shows a staircase-like settling pattern with steps every 10 ns.',
    question: 'What is causing the staircase settling pattern?',
    options: [
      { id: 'a', label: 'The DAC internal ladder is switching in sequence' },
      { id: 'b', label: 'Impedance mismatch reflections on the transmission line -- each step is a round-trip reflection', correct: true },
      { id: 'c', label: 'The digital input bits are arriving one at a time' },
      { id: 'd', label: 'Power supply regulation is stepping through values' },
    ],
    explanation: 'When the DAC output impedance does not match the transmission line impedance, each code change sends a wave down the line that reflects back and forth. Each round-trip creates a step in the settling waveform. The 10 ns period corresponds to the round-trip delay of the line.',
  },
  {
    scenario: 'An engineer increases the DAC update rate from 1 MSPS to 10 MSPS without changing the analog output filter. The output signal quality degrades significantly.',
    question: 'What is the most likely reason for the degraded signal quality?',
    options: [
      { id: 'a', label: 'The higher clock frequency generates more EMI' },
      { id: 'b', label: 'The DAC does not have enough time to settle between updates, so each new output starts from a partially-settled state', correct: true },
      { id: 'c', label: 'The filter was not designed for 10 MSPS' },
      { id: 'd', label: 'Higher update rates always reduce resolution' },
    ],
    explanation: 'If the update period (100 ns at 10 MSPS) is shorter than the settling time, the DAC output never fully settles to the target value before the next code change. This creates inter-symbol interference where each output value is corrupted by the residual settling from previous transitions.',
  },
  {
    scenario: 'A current-steering DAC uses thermometer coding for the upper 6 bits and binary coding for the lower 8 bits in a 14-bit design.',
    question: 'Why is thermometer coding used for the most significant bits?',
    options: [
      { id: 'a', label: 'Thermometer coding is more power efficient' },
      { id: 'b', label: 'Each code transition only changes one current source on/off, eliminating major carry glitches for MSB transitions', correct: true },
      { id: 'c', label: 'It reduces the number of current sources needed' },
      { id: 'd', label: 'Thermometer coding improves the digital input timing' },
    ],
    explanation: 'Thermometer coding ensures that each code increment only turns on one additional current source (or turns one off for decrement). Unlike binary coding where MSB transitions toggle many bits simultaneously, thermometer coding guarantees that glitch energy is uniform and minimal for MSB transitions.',
  },
  {
    scenario: 'A 12-bit DAC with 2.5V reference has a settling time of 500 ns to 1/2 LSB. An engineer needs to know the required output voltage accuracy before the next update.',
    question: 'What voltage accuracy does "settled to 1/2 LSB" represent for this DAC?',
    options: [
      { id: 'a', label: 'Within +/- 0.305 mV of the final value (2.5V / 2^12 / 2)', correct: true },
      { id: 'b', label: 'Within +/- 1.22 mV' },
      { id: 'c', label: 'Within +/- 0.610 mV' },
      { id: 'd', label: 'Within +/- 5.0 mV' },
    ],
    explanation: '1 LSB = Vref / 2^N = 2.5V / 4096 = 0.610 mV. Half an LSB = 0.305 mV. The DAC output must be within +/- 0.305 mV of the ideal target voltage for the settling time specification to be met. This represents about 0.012% of full-scale accuracy.',
  },
];

// =============================================================================
// REAL WORLD APPLICATIONS
// =============================================================================
const realWorldApps = [
  {
    icon: '\uD83C\uDFB5',
    title: 'High-Fidelity Audio DACs',
    short: 'Audiophile-grade sound',
    tagline: 'Clean settling for distortion-free audio',
    description: 'Audio DACs in hi-fi equipment, recording studios, and smartphones must produce ultra-clean analog signals. Settling time and glitch energy directly impact total harmonic distortion (THD), affecting sound quality audible to discerning listeners.',
    connection: 'When a 24-bit audio DAC updates at 384 kHz, each sample must settle accurately before the next arrives. Glitch spikes between samples create audible artifacts. Sigma-delta architectures and multi-bit noise shaping minimize these effects for THD+N below -120 dB.',
    howItWorks: 'Modern audio DACs use delta-sigma modulation to convert PCM data into a high-speed bitstream. The 1-bit output switches rapidly but only between two levels, producing minimal glitches. Analog reconstruction filters then smooth the output into a clean audio waveform.',
    stats: [
      { value: '24-bit', label: 'Resolution standard', icon: '\uD83C\uDFAF' },
      { value: '-120 dB', label: 'THD+N achievable', icon: '\uD83D\uDCC9' },
      { value: '384 kHz', label: 'Max sample rate', icon: '\u26A1' },
    ],
    examples: ['Studio monitors', 'High-end headphone amps', 'Streaming devices', 'Professional mixing consoles'],
    companies: ['ESS Technology', 'AKM', 'Texas Instruments', 'Cirrus Logic'],
    futureImpact: 'Next-generation MQA and DSD audio formats push DAC settling requirements further, demanding sub-nanosecond glitch management for native high-res playback.',
    color: '#8B5CF6',
  },
  {
    icon: '\uD83D\uDCC8',
    title: 'Arbitrary Waveform Generators',
    short: 'Precision test signals',
    tagline: 'Every sample point must be precisely placed',
    description: 'AWGs in test equipment generate complex analog waveforms by rapidly updating a DAC. Settling time limits the maximum useful update rate, while glitch energy creates spurious frequency components that corrupt the generated signal.',
    connection: 'A 14-bit AWG running at 1 GSPS has only 1 ns per sample. The DAC must settle to full accuracy within this window. Code-dependent glitches create spurs that limit SFDR (Spurious-Free Dynamic Range), reducing the instrument usable frequency range.',
    howItWorks: 'High-speed current-steering DACs with segmented architectures (thermometer + binary coding) minimize glitch energy. Careful layout ensures matched current source switching times. Post-DAC reconstruction filters remove out-of-band images and residual glitch energy.',
    stats: [
      { value: '1 GSPS', label: 'Update rate', icon: '\uD83D\uDE80' },
      { value: '14-bit', label: 'Typical resolution', icon: '\uD83D\uDCCA' },
      { value: '70 dB', label: 'SFDR target', icon: '\uD83D\uDCC8' },
    ],
    examples: ['Radar simulation', 'Communications testing', 'Quantum control', 'Lidar signal generation'],
    companies: ['Keysight', 'Tektronix', 'Rohde & Schwarz', 'National Instruments'],
    futureImpact: 'Next-gen 5G/6G testing requires AWGs with wider bandwidth and lower spurs, pushing DAC settling times below 200 ps at 16-bit resolution.',
    color: '#10B981',
  },
  {
    icon: '\uD83C\uDF10',
    title: '5G Wireless Transmitters',
    short: 'Clean RF signal generation',
    tagline: 'DAC settling defines signal purity',
    description: 'Modern wireless base stations use direct RF DACs to synthesize transmit waveforms digitally. DAC settling performance directly determines Error Vector Magnitude (EVM) and Adjacent Channel Leakage Ratio (ACLR) -- key 5G performance metrics.',
    connection: 'A 5G transmitter DAC running at 9+ GSPS generates signals up to several GHz directly. Glitch energy from code transitions appears as in-band distortion and out-of-band emissions. Fast, clean settling is essential for meeting 3GPP spectral mask requirements.',
    howItWorks: 'RF DACs use advanced current-steering architectures with return-to-zero (RTZ) modes that blank the output during transitions, eliminating glitch energy at the cost of 6 dB output power. Dynamic element matching randomizes mismatch errors, pushing them to noise rather than spurs.',
    stats: [
      { value: '9 GSPS', label: 'RF DAC speed', icon: '\u26A1' },
      { value: '-70 dBc', label: 'ACLR requirement', icon: '\uD83D\uDCF6' },
      { value: '6 GHz', label: 'Direct synthesis', icon: '\uD83C\uDF10' },
    ],
    examples: ['5G macro cells', 'Massive MIMO arrays', 'Phased array radar', 'Satellite transponders'],
    companies: ['Analog Devices', 'Texas Instruments', 'Maxim/ADI', 'Renesas'],
    futureImpact: 'Direct-to-mmWave DACs at 28+ GHz carrier frequencies will require settling times under 50 ps with sub-femtosecond jitter for next-generation phased arrays.',
    color: '#3B82F6',
  },
  {
    icon: '\u2699\uFE0F',
    title: 'Industrial Process Control',
    short: 'Precision actuator drives',
    tagline: 'Stable outputs for critical processes',
    description: 'Industrial DACs control valve positions, motor speeds, and heater power. Settling time determines how quickly a control loop can respond to setpoint changes. Monotonicity ensures the output always moves in the correct direction.',
    connection: 'When a PID controller commands a new valve position via a 16-bit DAC, the output must settle monotonically to the target without overshoot that could cause process oscillation. Non-monotonic settling can create control instability in tightly-tuned loops.',
    howItWorks: 'Precision industrial DACs use R-2R or string architectures with laser-trimmed resistors for guaranteed monotonicity. Output buffers with low-pass filtering remove switching transients. Some designs include built-in deglitchers for applications requiring glitch-free outputs.',
    stats: [
      { value: '16-20 bit', label: 'Process resolution', icon: '\uD83C\uDFAF' },
      { value: '< 10 us', label: 'Typical settling', icon: '\u23F1\uFE0F' },
      { value: '0.001%', label: 'Accuracy required', icon: '\uD83D\uDD27' },
    ],
    examples: ['Chemical plant control', 'Semiconductor fab tools', 'Power grid regulation', 'CNC machine tools'],
    companies: ['Analog Devices', 'Texas Instruments', 'Microchip', 'Maxim Integrated'],
    futureImpact: 'Industry 4.0 smart factories demand faster control loops with tighter tolerances, pushing precision DAC settling below 1 microsecond at 20-bit resolution.',
    color: '#F59E0B',
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const DACSettlingTimeRenderer: React.FC<DACSettlingTimeRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [dacBits, setDacBits] = useState(12);
  const [codeStep, setCodeStep] = useState(1);
  const [slewRate, setSlewRate] = useState(50); // V/us
  const [settlingBand, setSettlingBand] = useState(0.5); // LSBs
  const [deglitchOn, setDeglitchOn] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);
  const [dacType, setDacType] = useState<'r2r' | 'sigma_delta'>('r2r');

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(testQuestions.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict phase
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Navigation
  const isNavigating = useRef(false);

  // Animation
  useEffect(() => {
    const timer = setInterval(() => setAnimFrame(f => f + 1), 60);
    return () => clearInterval(timer);
  }, []);

  // Colors -- dark theme
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#0a0f1a',
    bgCard: '#1e293b',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
    glitch: '#ef4444',
    settled: '#22c55e',
    ideal: '#6366f1',
    actual: '#f59e0b',
    errorBand: 'rgba(34,197,94,0.15)',
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
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'dac_settling_time',
      gameTitle: 'DAC Settling Time',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitEvent('phase_changed', { phase: p });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitEvent]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  // =============================================================================
  // DAC SETTLING SIMULATION
  // =============================================================================
  const lsbVoltage = useMemo(() => 2.5 / Math.pow(2, dacBits), [dacBits]);
  const fullScale = 2.5;

  const calculateSettlingTime = useCallback(() => {
    // Model: settling time depends on bits, step size, slew rate
    const stepVoltage = codeStep * lsbVoltage;
    const slewTime = stepVoltage / (slewRate * 1e-6); // seconds
    // Ringing time depends on resolution (more bits = tighter band = longer settling)
    const ringTime = (dacBits - 6) * 0.1e-6; // extra time per bit above 6
    const bandFactor = 1 / settlingBand; // tighter band = longer
    const totalSettling = slewTime + ringTime * bandFactor;
    return totalSettling * 1e6; // return in microseconds
  }, [codeStep, lsbVoltage, slewRate, dacBits, settlingBand]);

  const settlingTimeUs = calculateSettlingTime();

  // Glitch energy calculation (pV*s)
  const calculateGlitchEnergy = useCallback(() => {
    // Major carry transitions produce worst glitches
    // Midscale transition (all bits toggle) is worst case
    const isMidscaleTransition = codeStep === 1; // simplified
    const baseBits = dacBits;
    const baseGlitch = baseBits * 2; // pV*s base
    const carryFactor = isMidscaleTransition ? baseBits : Math.log2(codeStep + 1);
    const glitch = baseGlitch * carryFactor * (deglitchOn ? 0.05 : 1);
    return Math.round(glitch);
  }, [dacBits, codeStep, deglitchOn]);

  const glitchEnergy = calculateGlitchEnergy();

  // =============================================================================
  // SVG VISUALIZATION - DAC Step Response
  // =============================================================================
  const renderDACWaveform = (showDeglitch?: boolean) => {
    const w = isMobile ? 340 : 520;
    const h = isMobile ? 240 : 280;
    const pad = { top: 35, right: 25, bottom: 45, left: 55 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    // Normalized step response parameters
    const startCode = Math.pow(2, dacBits - 1) - Math.floor(codeStep / 2);
    const endCode = startCode + codeStep;
    const startV = (startCode / Math.pow(2, dacBits)) * fullScale;
    const endV = (endCode / Math.pow(2, dacBits)) * fullScale;
    const stepSize = endV - startV;

    // Time axis: 0 to ~3x settling time
    const tMax = Math.max(settlingTimeUs * 3, 2);
    const numPoints = 200;

    // Error band in voltage
    const errorBandV = settlingBand * lsbVoltage;

    // Generate waveform points
    const transitionTime = tMax * 0.15; // transition happens at 15% of time axis
    const overlapSigma = settlingTimeUs * 0.15;
    const ringFreq = 2 * Math.PI / (settlingTimeUs * 0.25);
    const dampingFactor = 4 / settlingTimeUs;

    // Find actual settling point
    let settlingPoint = tMax;

    const getVoltage = (t: number, useDeglitch: boolean): number => {
      if (t < transitionTime) return startV;
      const dt = t - transitionTime;

      if (useDeglitch || (showDeglitch && deglitchOn)) {
        // Deglitched: smooth exponential approach, no glitch
        const tau = settlingTimeUs * 0.2;
        return startV + stepSize * (1 - Math.exp(-dt / tau));
      }

      // Raw DAC response:
      // 1. Glitch spike (narrow, code-dependent)
      const glitchWidth = tMax * 0.02;
      const glitchAmp = stepSize * 0.4 * (dacBits / 12);
      const glitchComponent = -glitchAmp * Math.exp(-0.5 * Math.pow((dt - glitchWidth) / (glitchWidth * 0.4), 2));

      // 2. Overshoot + damped ringing
      const overshoot = 0.15 + (dacBits - 8) * 0.02;
      const settled = 1 + overshoot * Math.exp(-dampingFactor * dt) * Math.cos(ringFreq * dt);
      const approach = 1 - Math.exp(-dt / overlapSigma);

      const rawV = startV + stepSize * approach * settled + glitchComponent;
      return rawV;
    };

    // Compute settling point (where signal stays within error band)
    for (let i = numPoints - 1; i >= 0; i--) {
      const t = (i / numPoints) * tMax;
      const v = getVoltage(t, false);
      if (Math.abs(v - endV) > errorBandV) {
        settlingPoint = t;
        break;
      }
    }

    // Build path
    const buildPath = (useDeglitch: boolean): string => {
      let path = '';
      for (let i = 0; i <= numPoints; i++) {
        const t = (i / numPoints) * tMax;
        const v = getVoltage(t, useDeglitch);
        const x = pad.left + (t / tMax) * pw;
        // Voltage range
        const vMin = startV - stepSize * 0.6;
        const vMax = endV + stepSize * 0.6;
        const y = pad.top + ph - ((v - vMin) / (vMax - vMin)) * ph;
        path += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return path;
    };

    const vMin = startV - stepSize * 0.6;
    const vMax = endV + stepSize * 0.6;
    const vRange = vMax - vMin;

    // Y positions for key voltages
    const yStart = pad.top + ph - ((startV - vMin) / vRange) * ph;
    const yEnd = pad.top + ph - ((endV - vMin) / vRange) * ph;
    const yErrorTop = pad.top + ph - ((endV + errorBandV - vMin) / vRange) * ph;
    const yErrorBot = pad.top + ph - ((endV - errorBandV - vMin) / vRange) * ph;

    // Transition x position
    const xTransition = pad.left + (transitionTime / tMax) * pw;
    const xSettled = pad.left + (settlingPoint / tMax) * pw;

    // Glitch region
    const glitchStart = xTransition;
    const glitchEnd = xTransition + (tMax * 0.06 / tMax) * pw;

    // Time axis labels
    const timeLabels = [0, tMax * 0.25, tMax * 0.5, tMax * 0.75, tMax];

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ background: colors.bgSecondary, borderRadius: '12px', maxWidth: '100%', border: `1px solid ${colors.border}` }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="DAC Settling Time waveform visualization"
      >
        <defs>
          <linearGradient id="dacGlitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.glitch} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.glitch} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="dacErrorBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.settled} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.settled} stopOpacity="0.08" />
          </linearGradient>
          <filter id="dacGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={w / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600" fontFamily="system-ui, sans-serif">
          DAC Step Response ({dacBits}-bit, step={codeStep} LSB{deglitchOn ? ', Deglitch ON' : ''})
        </text>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={`hg-${f}`} x1={pad.left} y1={pad.top + f * ph} x2={pad.left + pw} y2={pad.top + f * ph} stroke={colors.border} strokeDasharray="3,3" opacity={0.4} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={`vg-${f}`} x1={pad.left + f * pw} y1={pad.top} x2={pad.left + f * pw} y2={pad.top + ph} stroke={colors.border} strokeDasharray="3,3" opacity={0.3} />
        ))}

        {/* Error band (shaded region around target value) */}
        <rect
          x={xTransition}
          y={yErrorTop}
          width={pad.left + pw - xTransition}
          height={yErrorBot - yErrorTop}
          fill="url(#dacErrorBand)"
          stroke={colors.settled}
          strokeWidth="0.5"
          strokeDasharray="4,3"
          opacity={0.7}
        />
        <text x={pad.left + pw + 2} y={(yErrorTop + yErrorBot) / 2 + 3} fill={colors.settled} fontSize="8" fontFamily="system-ui, sans-serif">
          {'\u00B1'}{settlingBand} LSB
        </text>

        {/* Glitch energy region (red shading) */}
        {!deglitchOn && (
          <rect
            x={glitchStart}
            y={pad.top}
            width={glitchEnd - glitchStart}
            height={ph}
            fill="url(#dacGlitchGrad)"
            opacity={0.6}
          />
        )}

        {/* Ideal step (dashed) */}
        <path
          d={`M ${pad.left} ${yStart} L ${xTransition} ${yStart} L ${xTransition} ${yEnd} L ${pad.left + pw} ${yEnd}`}
          fill="none"
          stroke={colors.ideal}
          strokeWidth="1.5"
          strokeDasharray="6,4"
          opacity={0.7}
        />

        {/* Actual response (solid with overshoot/ringing) */}
        <path
          d={buildPath(false)}
          fill="none"
          stroke={colors.actual}
          strokeWidth="2"
          filter="url(#dacGlow)"
        />

        {/* Deglitched response (if enabled) */}
        {deglitchOn && (
          <path
            d={buildPath(true)}
            fill="none"
            stroke={colors.settled}
            strokeWidth="2"
            strokeDasharray="2,2"
          />
        )}

        {/* Settling time marker */}
        {!deglitchOn && settlingPoint < tMax * 0.95 && (
          <>
            <line x1={xSettled} y1={yErrorTop - 5} x2={xSettled} y2={yErrorBot + 5} stroke={colors.warning} strokeWidth="1.5" />
            <line x1={xTransition} y1={pad.top + ph + 8} x2={xSettled} y2={pad.top + ph + 8} stroke={colors.warning} strokeWidth="1.5" markerEnd="url(#dacArrow)" />
            <line x1={xTransition} y1={pad.top + ph + 6} x2={xTransition} y2={pad.top + ph + 10} stroke={colors.warning} strokeWidth="1" />
            <line x1={xSettled} y1={pad.top + ph + 6} x2={xSettled} y2={pad.top + ph + 10} stroke={colors.warning} strokeWidth="1" />
            <text x={(xTransition + xSettled) / 2} y={pad.top + ph + 18} fill={colors.warning} fontSize="9" textAnchor="middle" fontWeight="600" fontFamily="system-ui, sans-serif">
              t_s = {settlingTimeUs.toFixed(2)} us
            </text>
          </>
        )}

        {/* Glitch label */}
        {!deglitchOn && (
          <text x={(glitchStart + glitchEnd) / 2} y={pad.top - 2} fill={colors.glitch} fontSize="8" textAnchor="middle" fontWeight="600" fontFamily="system-ui, sans-serif">
            Glitch
          </text>
        )}

        {/* Axis labels */}
        <text x={w / 2} y={h - 4} fill={colors.textMuted} fontSize="10" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Time ({'\u00B5'}s)
        </text>
        <text x={12} y={h / 2} fill={colors.textMuted} fontSize="10" textAnchor="middle" fontFamily="system-ui, sans-serif" transform={`rotate(-90, 12, ${h / 2})`}>
          Voltage (V)
        </text>

        {/* Time tick labels */}
        {timeLabels.map((t, i) => (
          <text key={`tl-${i}`} x={pad.left + (t / tMax) * pw} y={pad.top + ph + 30} fill={colors.textMuted} fontSize="9" textAnchor="middle" fontFamily="system-ui, sans-serif">
            {t.toFixed(1)}
          </text>
        ))}

        {/* Voltage tick labels */}
        {[0, 0.5, 1].map(f => {
          const v = vMin + f * vRange;
          const y = pad.top + ph - f * ph;
          return (
            <text key={`vl-${f}`} x={pad.left - 6} y={y + 3} fill={colors.textMuted} fontSize="9" textAnchor="end" fontFamily="system-ui, sans-serif">
              {v.toFixed(3)}
            </text>
          );
        })}

        {/* Legend */}
        <line x1={pad.left + 5} y1={pad.top + 8} x2={pad.left + 20} y2={pad.top + 8} stroke={colors.ideal} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x={pad.left + 24} y={pad.top + 12} fill={colors.ideal} fontSize="9" fontFamily="system-ui, sans-serif">Ideal</text>
        <line x1={pad.left + 60} y1={pad.top + 8} x2={pad.left + 75} y2={pad.top + 8} stroke={colors.actual} strokeWidth="2" />
        <text x={pad.left + 79} y={pad.top + 12} fill={colors.actual} fontSize="9" fontFamily="system-ui, sans-serif">Actual</text>
        {deglitchOn && (
          <>
            <line x1={pad.left + 120} y1={pad.top + 8} x2={pad.left + 135} y2={pad.top + 8} stroke={colors.settled} strokeWidth="2" strokeDasharray="2,2" />
            <text x={pad.left + 139} y={pad.top + 12} fill={colors.settled} fontSize="9" fontFamily="system-ui, sans-serif">Deglitched</text>
          </>
        )}
      </svg>
    );
  };

  // =============================================================================
  // HOOK PHASE SVG - Glitchy DAC Output
  // =============================================================================
  const renderHookWaveform = () => {
    const w = isMobile ? 340 : 520;
    const h = isMobile ? 180 : 220;
    const pad = { top: 25, right: 15, bottom: 30, left: 40 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    // Generate a staircase with glitches
    const steps = 12;
    const t = (animFrame * 0.03) % (2 * Math.PI);
    let path = '';
    let glitchMarkers: { x: number; y1: number; y2: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const x1 = pad.left + (i / steps) * pw;
      const x2 = pad.left + ((i + 0.5) / steps) * pw;
      const x3 = pad.left + ((i + 1) / steps) * pw;
      const level = (0.5 + 0.4 * Math.sin(t + i * 0.5)) * ph;
      const nextLevel = (0.5 + 0.4 * Math.sin(t + (i + 1) * 0.5)) * ph;
      const yBase = pad.top + ph - level;
      const yNext = pad.top + ph - nextLevel;

      if (i === 0) path += `M ${x1.toFixed(1)} ${yBase.toFixed(1)}`;
      path += ` L ${x2.toFixed(1)} ${yBase.toFixed(1)}`;

      // Add glitch spike at each transition
      if (i < steps) {
        const glitchMag = 15 + Math.random() * 20;
        const glitchDir = Math.random() > 0.5 ? -1 : 1;
        const gy = yBase + glitchDir * glitchMag;
        path += ` L ${x2.toFixed(1)} ${gy.toFixed(1)}`;
        path += ` L ${(x2 + 3).toFixed(1)} ${(yBase + glitchDir * glitchMag * 0.3).toFixed(1)}`;
        path += ` L ${(x2 + 5).toFixed(1)} ${yNext.toFixed(1)}`;
        glitchMarkers.push({ x: x2, y1: yBase, y2: gy });
      }
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: colors.bgSecondary, borderRadius: '12px', maxWidth: '100%', border: `1px solid ${colors.border}` }} preserveAspectRatio="xMidYMid meet">
        <text x={w / 2} y={14} fill={colors.textMuted} fontSize="10" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Raw DAC Output -- Why Is It So Spikey?
        </text>
        <path d={path} fill="none" stroke={colors.actual} strokeWidth="2" />
        {glitchMarkers.slice(0, 6).map((gm, i) => (
          <circle key={i} cx={gm.x} cy={gm.y2} r="3" fill={colors.glitch} opacity={0.7}>
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
          </circle>
        ))}
        <text x={w / 2} y={h - 8} fill={colors.textMuted} fontSize="10" textAnchor="middle" fontFamily="system-ui, sans-serif">Time</text>
      </svg>
    );
  };

  // =============================================================================
  // SHARED UI COMPONENTS
  // =============================================================================
  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '48px',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '10px',
    border: `2px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textPrimary,
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '44px',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    border: `1px solid ${colors.border}`,
    marginBottom: '16px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: colors.accent,
    cursor: 'pointer',
  };

  // Navigation bar
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgPrimary}ee 70%, transparent)`,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <button onClick={() => { const idx = phaseOrder.indexOf(phase); if (idx > 0) goToPhase(phaseOrder[idx - 1]); }} disabled={phase === 'hook'} style={{ background: 'none', border: 'none', color: phase === 'hook' ? colors.textMuted : colors.textPrimary, cursor: phase === 'hook' ? 'default' : 'pointer', fontSize: '20px', padding: '8px', minHeight: '44px', minWidth: '44px' }}>
        {'\u2190'}
      </button>
      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>
        {phaseLabels[phase]}
      </span>
      <button onClick={() => nextPhase()} disabled={phase === 'mastery'} style={{ background: 'none', border: 'none', color: phase === 'mastery' ? colors.textMuted : colors.textPrimary, cursor: phase === 'mastery' ? 'default' : 'pointer', fontSize: '20px', padding: '8px', minHeight: '44px', minWidth: '44px' }}>
        {'\u2192'}
      </button>
    </div>
  );

  // Progress bar
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const progress = ((currentIdx + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: '48px', left: 0, right: 0, zIndex: 99, height: '3px', background: colors.border }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`, transition: 'width 0.4s ease', borderRadius: '0 3px 3px 0' }} />
      </div>
    );
  };

  // Phase dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px', flexWrap: 'wrap' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: phase === p ? colors.accent : i <= phaseOrder.indexOf(phase) ? colors.success : colors.border,
            transition: 'all 0.2s ease',
            padding: 0,
            minHeight: 'auto',
            minWidth: 'auto',
          }}
        />
      ))}
    </div>
  );

  // Stat badge
  const StatBadge = ({ label, value, unit, color: c }: { label: string; value: string; unit?: string; color?: string }) => (
    <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: c || colors.accent }}>{value}{unit && <span style={{ fontSize: '12px', color: colors.textMuted }}> {unit}</span>}</div>
    </div>
  );

  // =============================================================================
  // HOOK PHASE
  // =============================================================================
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '72px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: `${colors.accent}15`, border: `1px solid ${colors.accent}30`, borderRadius: '24px', marginBottom: '20px' }}>
            <span style={{ width: '8px', height: '8px', background: colors.accent, borderRadius: '50%' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: colors.accent, letterSpacing: '0.05em' }}>MIXED-SIGNAL DESIGN</span>
          </div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
            Why Does Your DAC Output Look Spikey?
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '520px', marginBottom: '24px' }}>
            Every time a DAC changes its output code, the analog signal does not jump instantly to the new value. It overshoots, rings, and takes precious time to settle. Those nasty glitch spikes? They come from bits switching at slightly different times.
          </p>

          <div style={{ marginBottom: '24px' }}>
            {renderHookWaveform()}
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, maxWidth: '400px', marginBottom: '24px' }}>
            Notice the sharp spikes at every step transition. These glitches can corrupt your signal, cause audible clicks in audio, or violate spectral masks in RF systems.
          </p>

          <button onClick={() => { playSound('click'); goToPhase('predict'); }} style={primaryButtonStyle}>
            Predict What Happens {'\u2192'}
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PREDICT PHASE
  // =============================================================================
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              Make Your Prediction
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              A 12-bit DAC makes a single LSB step (code change of 1). An identical DAC makes a step of 2048 codes (half its full range). Which DAC takes longer to settle within 1/2 LSB of its target?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { id: 'small', label: 'The 1-LSB step -- smaller steps are harder to settle precisely' },
                { id: 'large', label: 'The 2048-code step -- larger voltage swing means more overshoot and longer ringing', correct: true },
                { id: 'same', label: 'Both settle in the same time -- settling time is a fixed DAC property' },
                { id: 'neither', label: 'Neither -- DACs settle instantly because they are digital devices' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPrediction(opt.id);
                    playSound('click');
                    emitEvent('prediction_made', { prediction: opt.id });
                  }}
                  disabled={showPredictionFeedback}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${
                      showPredictionFeedback && (opt as { correct?: boolean }).correct
                        ? colors.success
                        : showPredictionFeedback && prediction === opt.id
                          ? colors.error
                          : prediction === opt.id
                            ? colors.accent
                            : colors.border
                    }`,
                    background: showPredictionFeedback && (opt as { correct?: boolean }).correct
                      ? 'rgba(34,197,94,0.15)'
                      : showPredictionFeedback && prediction === opt.id && !(opt as { correct?: boolean }).correct
                        ? 'rgba(239,68,68,0.15)'
                        : prediction === opt.id
                          ? `${colors.accent}15`
                          : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: showPredictionFeedback ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    lineHeight: 1.4,
                    fontFamily: 'system-ui, sans-serif',
                    minHeight: '44px',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {prediction && !showPredictionFeedback && (
              <button onClick={() => { setShowPredictionFeedback(true); playSound(prediction === 'large' ? 'success' : 'failure'); }} style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px' }}>
                Check My Prediction
              </button>
            )}

            {showPredictionFeedback && (
              <div style={{ ...cardStyle, borderLeft: `4px solid ${prediction === 'large' ? colors.success : colors.warning}` }}>
                <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
                  {prediction === 'large' ? 'Correct!' : 'Not quite!'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Larger code steps mean a bigger voltage swing. The DAC output must slew through a larger range and then ring/settle within the tiny error band. The 2048-code step produces much more overshoot and takes significantly longer to settle. Settling time is not a fixed property -- it depends on step size!
                </p>
                <button onClick={() => { playSound('transition'); goToPhase('play'); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
                  Explore the Simulation {'\u2192'}
                </button>
              </div>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PLAY PHASE - Interactive simulation
  // =============================================================================
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: '64px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              DAC Settling Time Experiment
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust the DAC parameters and observe how settling time and glitch energy change.
            </p>

            <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Left: SVG Waveform */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {renderDACWaveform()}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', width: '100%', marginTop: '12px' }}>
                  <StatBadge label="Settling Time" value={settlingTimeUs.toFixed(2)} unit={'\u00B5s'} color={colors.accent} />
                  <StatBadge label="Glitch Energy" value={`${glitchEnergy}`} unit="pV\u00B7s" color={colors.glitch} />
                  <StatBadge label="1 LSB" value={(lsbVoltage * 1000).toFixed(2)} unit="mV" color={colors.ideal} />
                </div>
              </div>

              {/* Right: Controls */}
              <div style={cardStyle}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Controls</h3>

                {/* DAC Resolution */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                    DAC Resolution: <span style={{ color: colors.accent, fontWeight: 700 }}>{dacBits}-bit</span> ({Math.pow(2, dacBits)} codes)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[8, 10, 12, 14].map(b => (
                      <button
                        key={b}
                        onClick={() => { setDacBits(b); playSound('click'); emitEvent('value_changed', { param: 'dacBits', value: b }); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: `2px solid ${dacBits === b ? colors.accent : colors.border}`,
                          background: dacBits === b ? `${colors.accent}20` : 'transparent',
                          color: dacBits === b ? colors.accent : colors.textSecondary,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '14px',
                          fontFamily: 'system-ui, sans-serif',
                          minHeight: '40px',
                        }}
                      >
                        {b}-bit
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Step Size */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                    Code Step Size: <span style={{ color: colors.accent, fontWeight: 700 }}>{codeStep} LSB</span> ({(codeStep * lsbVoltage * 1000).toFixed(1)} mV)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={Math.pow(2, dacBits - 1)}
                    value={codeStep}
                    onChange={e => { setCodeStep(parseInt(e.target.value)); emitEvent('slider_changed', { param: 'codeStep', value: parseInt(e.target.value) }); }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>1 LSB</span>
                    <span>Midscale</span>
                  </div>
                </div>

                {/* Slew Rate */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                    Slew Rate: <span style={{ color: colors.accent, fontWeight: 700 }}>{slewRate} V/{'\u00B5'}s</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={slewRate}
                    onChange={e => { setSlewRate(parseInt(e.target.value)); emitEvent('slider_changed', { param: 'slewRate', value: parseInt(e.target.value) }); }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>5 (slow)</span>
                    <span>200 (fast)</span>
                  </div>
                </div>

                {/* Settling Accuracy Band */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                    Settling Accuracy: <span style={{ color: colors.accent, fontWeight: 700 }}>{'\u00B1'}{settlingBand} LSB</span>
                  </label>
                  <input
                    type="range"
                    min={0.25}
                    max={2}
                    step={0.25}
                    value={settlingBand}
                    onChange={e => { setSettlingBand(parseFloat(e.target.value)); emitEvent('slider_changed', { param: 'settlingBand', value: parseFloat(e.target.value) }); }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>{'\u00B1'}0.25 (tight)</span>
                    <span>{'\u00B1'}2 (loose)</span>
                  </div>
                </div>

                {/* Deglitch Toggle */}
                <div style={{ marginBottom: '16px' }}>
                  <button
                    onClick={() => { setDeglitchOn(!deglitchOn); playSound('click'); emitEvent('button_clicked', { param: 'deglitch', value: !deglitchOn }); }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${deglitchOn ? colors.success : colors.border}`,
                      background: deglitchOn ? 'rgba(34,197,94,0.15)' : 'transparent',
                      color: deglitchOn ? colors.success : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      fontFamily: 'system-ui, sans-serif',
                      minHeight: '44px',
                    }}
                  >
                    Deglitch Filter: {deglitchOn ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Key Observations */}
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', borderLeft: `3px solid ${colors.accent}` }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: colors.accent }}>Key insight:</span>{' '}
                    {dacBits >= 14
                      ? 'At 14-bit resolution, 1 LSB is just ' + (lsbVoltage * 1000).toFixed(3) + ' mV. Settling to this precision takes much longer.'
                      : codeStep > Math.pow(2, dacBits - 2)
                        ? 'Large code steps produce the most overshoot and longest settling times.'
                        : deglitchOn
                          ? 'The deglitch filter removes glitch spikes but adds latency to the output.'
                          : 'Try increasing the code step size to see how glitch energy and settling time grow.'}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('review'); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
              Continue to Review {'\u2192'}
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // REVIEW PHASE
  // =============================================================================
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Understanding DAC Settling
            </h2>

            {[
              {
                title: 'Settling Time',
                content: 'Settling time is the interval from a code change until the output enters and stays within a specified error band (typically +/-1/2 LSB) of the final value. It includes slew time (output ramping to new voltage), ringing/overshoot (oscillation around target), and fine settling (thermal tails reaching final accuracy).',
                color: colors.accent,
              },
              {
                title: 'Glitch Energy',
                content: 'When a DAC changes codes, switches do not toggle simultaneously. During the brief interval when some bits have changed and others have not, the DAC outputs an incorrect intermediate voltage, creating a glitch spike. Glitch energy (measured in pV*s or nV*s) is the area of this spike. Major carry transitions (like midscale: 0111...1 to 1000...0) produce the worst glitches because every bit toggles.',
                color: colors.glitch,
              },
              {
                title: 'Monotonicity',
                content: 'A monotonic DAC guarantees that increasing the input code always increases (or does not decrease) the output voltage. Non-monotonic DACs can produce output reversals that cause control loops to oscillate. Guaranteed monotonicity is critical for feedback systems. Higher resolution DACs are harder to make monotonic.',
                color: colors.ideal,
              },
            ].map((topic, i) => (
              <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${topic.color}` }}>
                <h3 style={{ ...typo.h3, color: topic.color, marginBottom: '8px' }}>{topic.title}</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{topic.content}</p>
              </div>
            ))}

            {/* Key formulas */}
            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Key Formulas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  '1 LSB = V_ref / 2^N',
                  'Glitch Energy = integral of |V_glitch(t)| dt',
                  'Max Update Rate = 1 / Settling Time',
                  'SFDR limited by worst-case glitch energy',
                ].map((f, i) => (
                  <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: colors.accent }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('twist_predict'); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Explore the Twist {'\u2192'}
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // TWIST PREDICT PHASE
  // =============================================================================
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '24px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#a855f7', letterSpacing: '0.05em' }}>TWIST</span>
            </div>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
              Which Code Transition Produces the Worst Glitch?
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Consider a 12-bit R-2R ladder DAC. You can step between any two adjacent codes. Which single-LSB transition produces the largest glitch spike?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { id: 'zero', label: 'Code 0 to 1 -- turning on the first bit' },
                { id: 'midscale', label: 'Code 2047 to 2048 (midscale) -- the MSB turns on while all other bits turn off', correct: true },
                { id: 'quarter', label: 'Code 1023 to 1024 -- the quarter-scale transition' },
                { id: 'fullscale', label: 'Code 4094 to 4095 -- near full scale, all bits are on' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setTwistPrediction(opt.id); playSound('click'); emitEvent('prediction_made', { twistPrediction: opt.id }); }}
                  disabled={showTwistFeedback}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${
                      showTwistFeedback && (opt as { correct?: boolean }).correct ? colors.success
                        : showTwistFeedback && twistPrediction === opt.id ? colors.error
                          : twistPrediction === opt.id ? '#a855f7'
                            : colors.border
                    }`,
                    background: showTwistFeedback && (opt as { correct?: boolean }).correct ? 'rgba(34,197,94,0.15)'
                      : showTwistFeedback && twistPrediction === opt.id && !(opt as { correct?: boolean }).correct ? 'rgba(239,68,68,0.15)'
                        : twistPrediction === opt.id ? 'rgba(168,85,247,0.1)'
                          : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: showTwistFeedback ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    lineHeight: 1.4,
                    fontFamily: 'system-ui, sans-serif',
                    minHeight: '44px',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {twistPrediction && !showTwistFeedback && (
              <button onClick={() => { setShowTwistFeedback(true); playSound(twistPrediction === 'midscale' ? 'success' : 'failure'); }} style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px' }}>
                Check My Prediction
              </button>
            )}

            {showTwistFeedback && (
              <div style={{ ...cardStyle, borderLeft: `4px solid ${twistPrediction === 'midscale' ? colors.success : colors.warning}` }}>
                <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
                  {twistPrediction === 'midscale' ? 'Exactly right!' : 'Close, but not quite!'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  The midscale transition (2047 {'\u2192'} 2048, binary 0111...1 {'\u2192'} 1000...0) is the worst case. Every single bit toggles: the MSB turns ON while all 11 lower bits turn OFF. If the MSB switches slightly late, the output momentarily goes to code 0 before jumping to 2048 -- a massive glitch. This is why thermometer coding is used for MSBs in high-performance DACs.
                </p>
                <button onClick={() => { playSound('transition'); goToPhase('twist_play'); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
                  Explore Deglitching {'\u2192'}
                </button>
              </div>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // TWIST PLAY PHASE - Deglitching and architecture comparison
  // =============================================================================
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: '64px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Deglitching and DAC Architectures
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Compare R-2R ladder vs sigma-delta, and toggle the deglitch filter to see its effect.
            </p>

            <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Left: DAC type selector + waveform */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['r2r', 'sigma_delta'] as const).map(dt => (
                    <button
                      key={dt}
                      onClick={() => { setDacType(dt); playSound('click'); emitEvent('selection_made', { dacType: dt }); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: `2px solid ${dacType === dt ? colors.accent : colors.border}`,
                        background: dacType === dt ? `${colors.accent}20` : 'transparent',
                        color: dacType === dt ? colors.accent : colors.textSecondary,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'system-ui, sans-serif',
                        minHeight: '44px',
                      }}
                    >
                      {dt === 'r2r' ? 'R-2R Ladder' : 'Sigma-Delta'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderDACWaveform()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <StatBadge label="Glitch Energy" value={dacType === 'sigma_delta' ? `${Math.round(glitchEnergy * 0.05)}` : `${glitchEnergy}`} unit="pV*s" color={dacType === 'sigma_delta' ? colors.success : colors.glitch} />
                  <StatBadge label="Latency" value={dacType === 'sigma_delta' ? 'Higher' : 'Lower'} color={dacType === 'sigma_delta' ? colors.warning : colors.success} />
                </div>
              </div>

              {/* Right: deglitch explanation + toggle */}
              <div style={cardStyle}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Deglitch Circuit</h3>

                <button
                  onClick={() => { setDeglitchOn(!deglitchOn); playSound('click'); }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: `2px solid ${deglitchOn ? colors.success : colors.border}`,
                    background: deglitchOn ? 'rgba(34,197,94,0.15)' : 'transparent',
                    color: deglitchOn ? colors.success : colors.textSecondary,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '15px',
                    fontFamily: 'system-ui, sans-serif',
                    minHeight: '48px',
                    marginBottom: '16px',
                  }}
                >
                  {deglitchOn ? '\u2705 Sample-and-Hold Deglitcher ON' : '\u26A0\uFE0F Deglitcher OFF -- Glitches Visible'}
                </button>

                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    <strong style={{ color: colors.accent }}>How it works:</strong> A sample-and-hold circuit holds the previous output during the DAC transition window. After the glitch passes and the output settles, it samples the new value. This eliminates glitch spikes from the output.
                  </p>
                </div>

                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                  <h4 style={{ ...typo.small, color: '#a855f7', fontWeight: 700, marginBottom: '8px' }}>Architecture Comparison</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'left', padding: '6px 4px', borderBottom: `1px solid ${colors.border}` }}>Property</th>
                        <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', padding: '6px 4px', borderBottom: `1px solid ${colors.border}` }}>R-2R</th>
                        <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', padding: '6px 4px', borderBottom: `1px solid ${colors.border}` }}>{'\u03A3\u0394'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Glitch Energy', 'High (code-dep)', 'Very Low'],
                        ['Settling Speed', 'Fast (ns)', 'Slow (latency)'],
                        ['Update Rate', 'Very High', 'Moderate'],
                        ['Linearity', 'Trimming needed', 'Inherent'],
                        ['Best For', 'High-speed RF', 'Audio / precision'],
                      ].map(([prop, r2r, sd], i) => (
                        <tr key={i}>
                          <td style={{ ...typo.small, color: colors.textSecondary, padding: '6px 4px', borderBottom: `1px solid ${colors.border}20` }}>{prop}</td>
                          <td style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', padding: '6px 4px', borderBottom: `1px solid ${colors.border}20` }}>{r2r}</td>
                          <td style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', padding: '6px 4px', borderBottom: `1px solid ${colors.border}20` }}>{sd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '14px' }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    <strong style={{ color: colors.settled }}>Sigma-delta advantage:</strong> By converting multi-bit codes into a high-rate 1-bit stream, sigma-delta DACs inherently avoid major carry transitions. Only one switch changes state at a time, producing minimal and consistent glitch energy.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('twist_review'); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}>
              Review Deglitching Techniques {'\u2192'}
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // TWIST REVIEW PHASE
  // =============================================================================
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Deglitching Techniques
            </h2>

            {[
              {
                title: 'Sample-and-Hold Deglitcher',
                content: 'The most common approach. A track-and-hold amplifier captures the settled DAC output and holds it during transitions. Timing is critical: the hold command must occur after the DAC has settled but before the next update. Adds a one-clock-cycle latency.',
                color: colors.accent,
              },
              {
                title: 'Return-to-Zero (RTZ) Mode',
                content: 'The DAC output returns to zero (or mid-scale) between each valid output. This makes every transition start from the same point, equalizing glitch energy across all code transitions. Used in RF DACs. Costs 6 dB of output power because the output is zero half the time.',
                color: '#a855f7',
              },
              {
                title: 'Thermometer Coding',
                content: 'Instead of binary-weighted switches, the MSBs use "thermometer" encoding where each code increment adds one more unit current source. This guarantees only one switch toggles per LSB step in the MSB segment, eliminating major carry glitches. Used in all modern high-speed DACs.',
                color: colors.success,
              },
              {
                title: 'Dynamic Element Matching (DEM)',
                content: 'Randomizes which physical current sources are used for each code, spreading mismatch errors across frequencies rather than concentrating them at specific tones. Does not reduce total glitch energy but converts spurs into wideband noise, improving SFDR.',
                color: colors.ideal,
              },
            ].map((tech, i) => (
              <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${tech.color}` }}>
                <h3 style={{ ...typo.h3, color: tech.color, marginBottom: '8px' }}>{tech.title}</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{tech.content}</p>
              </div>
            ))}

            <div style={cardStyle}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Design Trade-offs</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Every deglitching technique has a cost. Sample-and-hold adds latency and its own settling errors. RTZ halves the output power. Thermometer coding requires 2^N-1 switches for N MSBs, dramatically increasing die area. DEM adds digital complexity. Choosing the right combination depends on whether your application prioritizes speed, spectral purity, latency, or cost.
              </p>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('transfer'); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              See Real-World Applications {'\u2192'}
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // TRANSFER PHASE
  // =============================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="DAC Settling Time"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

  // =============================================================================
  // TEST PHASE - 10 scenario-based questions
  // =============================================================================
  if (phase === 'test') {
    const q = testQuestions[currentQuestion];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: 0 }}>Knowledge Test</h2>
              <span style={{ ...typo.small, color: colors.textMuted }}>
                {currentQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            {/* Question progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] !== null ? colors.success : colors.border,
                  transition: 'background 0.3s ease',
                }} />
              ))}
            </div>

            {/* Scenario */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '6px' }}>SCENARIO</p>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '16px' }}>{q.question}</p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {q.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (testSubmitted) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                    playSound('click');
                    emitEvent('answer_submitted', { question: currentQuestion, answer: opt.id });
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}15` : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: testSubmitted ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    lineHeight: 1.4,
                    fontFamily: 'system-ui, sans-serif',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontWeight: 700, color: colors.accent, marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => { setCurrentQuestion(currentQuestion - 1); playSound('click'); }}
                  style={{ ...secondaryButtonStyle, flex: 1 }}
                >
                  Previous
                </button>
              )}
              {currentQuestion < testQuestions.length - 1 ? (
                <button
                  onClick={() => { if (testAnswers[currentQuestion]) { setCurrentQuestion(currentQuestion + 1); playSound('click'); } }}
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
                    fontSize: '15px',
                    fontFamily: 'system-ui, sans-serif',
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
                    emitEvent('game_completed', { score, total: testQuestions.length });
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
                    fontSize: '15px',
                    fontFamily: 'system-ui, sans-serif',
                    minHeight: '44px',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>

            {/* Score display after submission */}
            {testSubmitted && (
              <div style={{ ...cardStyle, marginTop: '20px', textAlign: 'center', borderLeft: `4px solid ${testScore >= 7 ? colors.success : colors.warning}` }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>{testScore >= 9 ? '\uD83C\uDFC6' : testScore >= 7 ? '\uD83C\uDF1F' : '\uD83D\uDCDA'}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '8px' }}>
                  {testScore} / {testQuestions.length}
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                  {testScore >= 9 ? 'Outstanding! You truly understand DAC settling.' : testScore >= 7 ? 'Great work! Solid understanding of DAC behavior.' : 'Keep learning! Review the concepts and try again.'}
                </p>
                <button onClick={() => { playSound('success'); goToPhase('mastery'); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  View Mastery Results {'\u2192'}
                </button>
              </div>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // MASTERY PHASE
  // =============================================================================
  if (phase === 'mastery') {
    const finalScore = testScore || testAnswers.reduce((acc, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return acc + (ans === correct ? 1 : 0);
    }, 0);
    const total = testQuestions.length;
    const pct = Math.round((finalScore / total) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '72px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            {/* Trophy */}
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>
              {pct >= 90 ? '\uD83C\uDFC6' : pct >= 70 ? '\uD83C\uDF1F' : '\uD83D\uDCDA'}
            </div>

            <h2 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px', background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              DAC Settling Time Master!
            </h2>

            {/* Score */}
            <div style={{ fontSize: '44px', fontWeight: 800, color: pct >= 70 ? colors.success : colors.warning, marginBottom: '4px' }}>
              {finalScore} / {total} ({grade})
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {pct >= 90
                ? 'Outstanding -- you truly understand DAC settling time and glitch management!'
                : pct >= 70
                  ? 'Great work -- you have mastered the fundamentals of DAC settling behavior!'
                  : 'Good effort -- review the answer key below to strengthen your understanding.'}
            </p>

            {/* What you learned */}
            <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>You Learned:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'DAC settling time and its dependence on step size and resolution',
                  'Glitch energy from code transitions and major carry effects',
                  'Midscale transitions produce worst-case glitches',
                  'Sample-and-hold deglitching and RTZ techniques',
                  'R-2R vs sigma-delta architecture trade-offs',
                  'Thermometer coding for glitch-free MSB transitions',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: colors.success, fontSize: '16px', lineHeight: '1.4' }}>{'\u2713'}</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Key */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', textAlign: 'left' }}>Answer Key</h3>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '24px' }}>
              {testQuestions.map((tq, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOpt = tq.options.find(o => o.correct);
                const isCorrect = userAnswer === correctOpt?.id;
                const userOpt = tq.options.find(o => o.id === userAnswer);
                return (
                  <div key={qIndex} style={{
                    marginBottom: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(30,41,59,0.7)',
                    borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                    textAlign: 'left',
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', lineHeight: 1.4 }}>
                      <span style={{ fontSize: '16px', marginRight: '6px' }}>{isCorrect ? '\u2705' : '\u274C'}</span>
                      {qIndex + 1}. {tq.question}
                    </p>
                    {!isCorrect && userOpt && (
                      <p style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '6px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)' }}>
                        Your answer: {userOpt.label}
                      </p>
                    )}
                    <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)' }}>
                      Correct: {correctOpt?.label}
                    </p>
                    <p style={{ fontSize: '12px', color: '#fbbf24', padding: '8px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', lineHeight: 1.5 }}>
                      Why? {tq.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fixed bottom Complete Game button */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'linear-gradient(to top, #0f172a 80%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
          <button
            onClick={() => {
              onGameEvent?.({
                eventType: 'achievement_unlocked',
                gameType: 'dac_settling_time',
                gameTitle: 'DAC Settling Time',
                details: { type: 'mastery_achieved', score: finalScore, total, pct },
                timestamp: Date.now(),
              });
              window.location.href = '/games';
            }}
            style={{
              padding: '14px 48px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colors.accentGlow}`,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minHeight: '48px',
            }}
          >
            Complete Game
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default DACSettlingTimeRenderer;
