'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ---------------------------------------------------------------------------
// Op-Amp Stability - Complete 10-Phase Game (#255)
// Why feedback amplifiers oscillate and how to stabilize them
// ---------------------------------------------------------------------------

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

interface OpAmpStabilityRendererProps {
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

// ---------------------------------------------------------------------------
// COLORS & TYPOGRAPHY (dark theme, inline)
// ---------------------------------------------------------------------------
const colors = {
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  accent: '#a78bfa',
  secondary: '#34d399',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  danger: '#ef4444',
  bgPrimary: '#0a0f1a',
  bgSecondary: '#111827',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: 'rgba(148,163,184,0.85)',
  textMuted: 'rgba(100,116,139,0.7)',
  border: 'rgba(71,85,105,0.4)',
  gainCurve: '#60a5fa',
  betaLine: '#f87171',
  phaseCurve: '#a78bfa',
  marginGood: '#10b981',
  marginBad: '#ef4444',
  marginWarn: '#f59e0b',
};

const typo = {
  h1: { fontSize: '28px', fontWeight: 800 as const, lineHeight: '1.2', fontFamily: 'system-ui, -apple-system, sans-serif' },
  h2: { fontSize: '22px', fontWeight: 700 as const, lineHeight: '1.3', fontFamily: 'system-ui, -apple-system, sans-serif' },
  h3: { fontSize: '17px', fontWeight: 600 as const, lineHeight: '1.4', fontFamily: 'system-ui, -apple-system, sans-serif' },
  body: { fontSize: '15px', fontWeight: 400 as const, lineHeight: '1.6', fontFamily: 'system-ui, -apple-system, sans-serif' },
  small: { fontSize: '13px', fontWeight: 400 as const, lineHeight: '1.5', fontFamily: 'system-ui, -apple-system, sans-serif' },
  label: { fontSize: '11px', fontWeight: 600 as const, lineHeight: '1.3', fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
};

// ---------------------------------------------------------------------------
// PHYSICS ENGINE
// ---------------------------------------------------------------------------
// Computes open-loop gain and phase for a 3-pole system:
//   A(s) = Adc / ((1+s/wp1)(1+s/wp2)(1+s/wp3))
// Feedback factor beta. Loop gain T = A * beta.
// Gain margin: |T| at phase = -180deg
// Phase margin: 180 + phase(T) at |T| = 0dB

function computeOpenLoopGain(
  freq: number,
  adcDb: number,
  fp1: number,
  fp2: number,
  fp3: number
): { magDb: number; phaseDeg: number } {
  const adc = Math.pow(10, adcDb / 20);
  const w = 2 * Math.PI * freq;
  const wp1 = 2 * Math.PI * fp1;
  const wp2 = 2 * Math.PI * fp2;
  const wp3 = 2 * Math.PI * fp3;

  // Magnitude of each pole
  const m1 = Math.sqrt(1 + (w / wp1) ** 2);
  const m2 = Math.sqrt(1 + (w / wp2) ** 2);
  const m3 = Math.sqrt(1 + (w / wp3) ** 2);
  const mag = adc / (m1 * m2 * m3);
  const magDb = 20 * Math.log10(Math.max(mag, 1e-12));

  // Phase contribution from each pole
  const p1 = -Math.atan(w / wp1) * (180 / Math.PI);
  const p2 = -Math.atan(w / wp2) * (180 / Math.PI);
  const p3 = -Math.atan(w / wp3) * (180 / Math.PI);
  const phaseDeg = p1 + p2 + p3;

  return { magDb, phaseDeg };
}

function computeLoopGain(
  freq: number,
  adcDb: number,
  fp1: number,
  fp2: number,
  fp3: number,
  betaDb: number
): { magDb: number; phaseDeg: number } {
  const ol = computeOpenLoopGain(freq, adcDb, fp1, fp2, fp3);
  return {
    magDb: ol.magDb + betaDb,
    phaseDeg: ol.phaseDeg,
  };
}

function findCrossoverFreq(
  adcDb: number,
  fp1: number,
  fp2: number,
  fp3: number,
  betaDb: number,
  targetDb: number
): number {
  // Binary search for frequency where loop gain = targetDb
  let lo = 0.1;
  let hi = 1e10;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    const { magDb } = computeLoopGain(mid, adcDb, fp1, fp2, fp3, betaDb);
    if (magDb > targetDb) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.sqrt(lo * hi);
}

function findPhaseCrossoverFreq(
  adcDb: number,
  fp1: number,
  fp2: number,
  fp3: number,
  targetPhaseDeg: number
): number {
  let lo = 0.1;
  let hi = 1e10;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    const { phaseDeg } = computeOpenLoopGain(mid, adcDb, fp1, fp2, fp3);
    if (phaseDeg > targetPhaseDeg) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.sqrt(lo * hi);
}

function getMargins(
  adcDb: number,
  fp1: number,
  fp2: number,
  fp3: number,
  betaDb: number
): { phaseMarginDeg: number; gainMarginDb: number; fGainCross: number; fPhaseCross: number } {
  // Gain crossover: where |T| = 0 dB
  const fGainCross = findCrossoverFreq(adcDb, fp1, fp2, fp3, betaDb, 0);
  const atGainCross = computeLoopGain(fGainCross, adcDb, fp1, fp2, fp3, betaDb);
  const phaseMarginDeg = 180 + atGainCross.phaseDeg;

  // Phase crossover: where phase = -180
  const fPhaseCross = findPhaseCrossoverFreq(adcDb, fp1, fp2, fp3, -180);
  const atPhaseCross = computeLoopGain(fPhaseCross, adcDb, fp1, fp2, fp3, betaDb);
  const gainMarginDb = -atPhaseCross.magDb;

  return { phaseMarginDeg, gainMarginDb, fGainCross, fPhaseCross };
}

// Step response approximation based on phase margin
function computeStepResponse(phaseMarginDeg: number, t: number): number {
  if (phaseMarginDeg >= 65) {
    // Critically damped - clean step
    const tau = 0.5;
    return 1 - Math.exp(-t / tau);
  } else if (phaseMarginDeg >= 45) {
    // Slightly underdamped
    const zeta = phaseMarginDeg / 100;
    const wn = 4;
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    return 1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta)) *
      Math.sin(wd * t + Math.acos(zeta));
  } else if (phaseMarginDeg > 0) {
    // Underdamped with ringing
    const zeta = Math.max(0.05, phaseMarginDeg / 140);
    const wn = 6;
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    return 1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta)) *
      Math.sin(wd * t + Math.acos(zeta));
  } else {
    // Unstable oscillation
    const growthRate = Math.min(0.8, Math.abs(phaseMarginDeg) / 60);
    const wOsc = 8;
    return 1 + Math.exp(growthRate * t) * Math.sin(wOsc * t) * 0.5;
  }
}

// ---------------------------------------------------------------------------
// TEST QUESTIONS
// ---------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: 'An op-amp circuit with 80 dB open-loop gain and three poles (10 Hz, 1 MHz, 10 MHz) is configured with unity-gain feedback. The output shows persistent ringing after every input step.',
    question: 'What is the most likely cause of the ringing?',
    options: [
      { id: 'a', label: 'The op-amp has too much open-loop gain' },
      { id: 'b', label: 'Insufficient phase margin due to multiple poles reducing the phase before the gain crossover frequency', correct: true },
      { id: 'c', label: 'The feedback resistors are too noisy' },
      { id: 'd', label: 'The power supply voltage is insufficient' },
    ],
    explanation: 'Ringing in a feedback amplifier is caused by insufficient phase margin. Multiple poles each contribute up to -90 degrees of phase shift. If the total phase shift approaches -180 degrees while the loop gain is still above 0 dB, the system rings or oscillates.',
  },
  {
    scenario: 'A Bode plot shows that the loop gain crosses 0 dB at 5 MHz. At this frequency, the phase is -135 degrees.',
    question: 'What is the phase margin of this system?',
    options: [
      { id: 'a', label: '135 degrees' },
      { id: 'b', label: '45 degrees', correct: true },
      { id: 'c', label: '-135 degrees' },
      { id: 'd', label: '90 degrees' },
    ],
    explanation: 'Phase margin = 180 degrees + phase at the gain crossover frequency = 180 + (-135) = 45 degrees. This is the minimum recommended phase margin for a well-damped system.',
  },
  {
    scenario: 'An engineer adds a 100 pF capacitive load to an op-amp output. The previously stable circuit now oscillates.',
    question: 'Why does capacitive loading cause instability?',
    options: [
      { id: 'a', label: 'The capacitor increases the DC gain beyond the maximum' },
      { id: 'b', label: 'The capacitor with the output resistance creates an additional pole that reduces phase margin', correct: true },
      { id: 'c', label: 'Capacitors always cause oscillation in any circuit' },
      { id: 'd', label: 'The capacitor shorts the output to ground' },
    ],
    explanation: 'The output resistance of the op-amp and the load capacitor form an additional RC pole: fp = 1/(2*pi*Rout*CL). This extra pole adds phase lag at frequencies below the original gain crossover, reducing the phase margin and potentially causing instability.',
  },
  {
    scenario: 'A voltage follower (unity gain buffer) is often the hardest configuration to stabilize, even though it has the least closed-loop gain.',
    question: 'Why is unity gain the worst case for stability?',
    options: [
      { id: 'a', label: 'Unity gain has the highest noise' },
      { id: 'b', label: 'The feedback factor is maximum (beta=1), pushing the gain crossover to the highest frequency where phase shift is greatest', correct: true },
      { id: 'c', label: 'The output impedance is highest at unity gain' },
      { id: 'd', label: 'Unity gain requires the most power' },
    ],
    explanation: 'At unity gain, beta = 1 (0 dB), so the loop gain equals the full open-loop gain. The 0 dB crossover occurs at the highest possible frequency (the unity-gain bandwidth), where all poles contribute maximum phase shift. Higher closed-loop gains have lower crossover frequencies and more phase margin.',
  },
  {
    scenario: 'An engineer measures 12 dB of gain margin and 55 degrees of phase margin on a feedback amplifier.',
    question: 'Is this circuit considered stable for production use?',
    options: [
      { id: 'a', label: 'No, both margins are too low' },
      { id: 'b', label: 'Yes, both margins exceed typical minimums (>6 dB gain margin, >45 degrees phase margin)', correct: true },
      { id: 'c', label: 'No, gain margin should be at least 20 dB' },
      { id: 'd', label: 'Phase margin is acceptable but gain margin is too high' },
    ],
    explanation: 'Standard design rules require at least 6 dB gain margin and 45 degrees phase margin for production circuits. With 12 dB and 55 degrees, this design has comfortable margins that account for component tolerances and temperature variations.',
  },
  {
    scenario: 'The Barkhausen stability criterion states that a linear system with feedback will oscillate at a frequency where two conditions are simultaneously met.',
    question: 'What are these two conditions?',
    options: [
      { id: 'a', label: 'Loop gain >= 1 and loop phase = 0 degrees' },
      { id: 'b', label: 'Loop gain >= 1 (0 dB) and total loop phase shift = -360 degrees (equivalent to 0 degrees)', correct: true },
      { id: 'c', label: 'Open-loop gain = closed-loop gain and phase = -90 degrees' },
      { id: 'd', label: 'Input voltage = output voltage and current gain >= 1' },
    ],
    explanation: 'The Barkhausen criterion requires that the loop gain magnitude is at least 1 (0 dB) and the total phase around the loop is a multiple of 360 degrees. For inverting feedback, this means the forward path phase reaches -180 degrees (plus the -180 from the inverting summing junction = -360 total).',
  },
  {
    scenario: 'A designer adds a small resistor (10-50 ohms) in series with the op-amp output before a capacitive load.',
    question: 'How does this series resistor improve stability?',
    options: [
      { id: 'a', label: 'It reduces the DC output voltage' },
      { id: 'b', label: 'It isolates the capacitive load and converts the additional pole into a pole-zero pair, reducing its destabilizing effect', correct: true },
      { id: 'c', label: 'It increases the op-amp bandwidth' },
      { id: 'd', label: 'It eliminates all high-frequency noise' },
    ],
    explanation: 'The series resistor (Riso) with the load capacitance creates a zero at f = 1/(2*pi*Riso*CL) in addition to the pole. This zero provides phase lead that partially cancels the pole\'s phase lag, restoring phase margin. This is a classic compensation technique.',
  },
  {
    scenario: 'An op-amp datasheet specifies "unity-gain stable." A different op-amp is listed as "stable for gains >= 10."',
    question: 'What does "stable for gains >= 10" mean practically?',
    options: [
      { id: 'a', label: 'The op-amp only works with gain of exactly 10' },
      { id: 'b', label: 'The op-amp is internally compensated only for closed-loop gains of 10 or higher; unity gain would be unstable without external compensation', correct: true },
      { id: 'c', label: 'The output can only drive loads requiring gain of 10' },
      { id: 'd', label: 'The power supply needs to be at least 10V' },
    ],
    explanation: 'Decompensated op-amps sacrifice stability at low gains for higher bandwidth. They have less internal compensation, allowing a higher gain-bandwidth product. When used at gains below the rated minimum, external compensation must be added to ensure adequate phase margin.',
  },
  {
    scenario: 'A compensation capacitor (Cc) is added from the output to the inverting input of an op-amp (Miller compensation). This creates a dominant pole that rolls off the gain early.',
    question: 'How does dominant pole compensation stabilize the amplifier?',
    options: [
      { id: 'a', label: 'It increases the total gain of the amplifier' },
      { id: 'b', label: 'It reduces the gain crossover frequency to a point where the non-dominant poles have not yet contributed significant phase shift', correct: true },
      { id: 'c', label: 'It adds phase lead at high frequencies' },
      { id: 'd', label: 'It eliminates all poles above the dominant pole frequency' },
    ],
    explanation: 'By adding a very low-frequency dominant pole, the gain drops below 0 dB before reaching the frequencies where the second and third poles add their phase shift. The loop crosses 0 dB with only one pole active (at most -90 degrees of phase), ensuring at least 90 degrees of phase margin.',
  },
  {
    scenario: 'A transimpedance amplifier (TIA) with a photodiode has a large parasitic capacitance (50 pF) at the inverting input. Without a feedback capacitor, the output oscillates.',
    question: 'How does adding a feedback capacitor (Cf) in parallel with the feedback resistor fix this?',
    options: [
      { id: 'a', label: 'The feedback capacitor blocks DC current' },
      { id: 'b', label: 'Cf creates a zero in the noise gain that compensates for the pole created by the input capacitance, restoring phase margin', correct: true },
      { id: 'c', label: 'Cf reduces the output voltage swing' },
      { id: 'd', label: 'Cf increases the transimpedance gain' },
    ],
    explanation: 'The input capacitance (Cin) causes the noise gain (1/beta) to rise at high frequencies, effectively pushing the gain crossover higher where phase margin is worse. Adding Cf creates a zero in the noise gain curve that flattens it, keeping the crossover at a safe frequency. The optimal Cf satisfies Cf = sqrt(Cin / (2*pi*Rf*GBW)).',
  },
];

// ---------------------------------------------------------------------------
// REAL-WORLD APPLICATIONS
// ---------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔊',
    title: 'Audio Amplifiers',
    short: 'Preventing oscillation in high-fidelity audio',
    tagline: 'Clean sound from stable feedback',
    description: 'Audio power amplifiers use deep negative feedback to reduce distortion. Without careful stability design, they oscillate at ultrasonic frequencies, destroying speakers and creating audible artifacts.',
    connection: 'Phase margin determines whether an amplifier produces clean music or destructive oscillation. Professional amplifiers target >60 degrees of phase margin even under capacitive speaker cable loads.',
    howItWorks: 'Zobel networks (series RC across the output) compensate for inductive speaker loads. Input compensation capacitors roll off gain before instability. Some designs use current-mode feedback for inherently better stability with reactive loads.',
    stats: [
      { value: '>60 deg', label: 'Typical phase margin', icon: '📐' },
      { value: '20Hz-20kHz', label: 'Audio bandwidth', icon: '🎵' },
      { value: '<0.01%', label: 'THD target', icon: '📊' },
    ],
    examples: ['Class AB power amps', 'Headphone amplifiers', 'Studio monitor amps', 'Guitar amplifiers'],
    companies: ['Texas Instruments', 'Analog Devices', 'Crown Audio', 'QSC'],
    futureImpact: 'Class D amplifiers with digital feedback loops present new stability challenges requiring advanced compensation.',
    color: '#60a5fa',
  },
  {
    icon: '🏭',
    title: 'Industrial Control Systems',
    short: 'PID loops must be stable under all conditions',
    tagline: 'Stability in the feedback loop keeps processes safe',
    description: 'Industrial PID controllers use the same feedback principles as op-amps. An unstable process control loop can cause temperature overshoot, pressure oscillation, or mechanical damage.',
    connection: 'The Bode plot analysis used for op-amps applies directly to PID tuning. Gain and phase margins predict whether a process will settle cleanly or oscillate dangerously.',
    howItWorks: 'Engineers measure the open-loop frequency response of the plant, then design the PID gains to achieve adequate phase margin (typically >45 degrees). Lead-lag compensators add phase exactly where needed.',
    stats: [
      { value: '>45 deg', label: 'Minimum phase margin', icon: '📐' },
      { value: '>6 dB', label: 'Minimum gain margin', icon: '📏' },
      { value: 'ms to hours', label: 'Loop time constants', icon: '⏱' },
    ],
    examples: ['Temperature control', 'Flow rate regulation', 'Motor speed control', 'Chemical reactors'],
    companies: ['Siemens', 'ABB', 'Honeywell', 'Rockwell Automation'],
    futureImpact: 'Model-predictive control and AI-tuned controllers still rely on fundamental stability analysis for safe operation.',
    color: '#a78bfa',
  },
  {
    icon: '📡',
    title: 'RF and Communication Circuits',
    short: 'Wideband amplifiers on the edge of stability',
    tagline: 'Maximum bandwidth without oscillation',
    description: 'RF amplifiers in receivers and transmitters must achieve wide bandwidth with flat gain. Multiple stages compound stability problems as each stage contributes phase shift.',
    connection: 'Op-amp stability principles scale directly to RF design. The gain-bandwidth tradeoff, pole placement, and compensation techniques are identical concepts applied at GHz frequencies.',
    howItWorks: 'RF designers use S-parameter analysis (the RF equivalent of Bode plots) to check stability. Rollett stability factor (K > 1) and mu-factor ensure unconditional stability across all frequencies and load impedances.',
    stats: [
      { value: 'K > 1', label: 'Stability criterion', icon: '📐' },
      { value: 'DC-40 GHz', label: 'Frequency range', icon: '📻' },
      { value: '-10 to +40 dBm', label: 'Power levels', icon: '⚡' },
    ],
    examples: ['5G base station amplifiers', 'Satellite transponders', 'Radar receivers', 'Optical transceivers'],
    companies: ['Analog Devices', 'Qorvo', 'Skyworks', 'Broadcom'],
    futureImpact: 'Millimeter-wave 6G systems push stability analysis to 100+ GHz where parasitic effects dominate.',
    color: '#34d399',
  },
  {
    icon: '⚡',
    title: 'Power Supply Feedback Loops',
    short: 'Voltage regulators rely on stable feedback',
    tagline: 'Every power supply is a feedback amplifier',
    description: 'Switch-mode power supplies use error amplifiers with feedback to regulate output voltage. Instability causes output voltage oscillation, excessive ripple, and potential component damage.',
    connection: 'The error amplifier in a voltage regulator is an op-amp in a feedback loop. The power stage adds its own poles and zeros. Compensation networks must account for load changes, input variations, and component tolerances.',
    howItWorks: 'Type II and Type III compensation networks add poles and zeros to the error amplifier to shape the loop gain. The crossover frequency is typically set at 1/5 to 1/10 of the switching frequency with >45 degrees phase margin.',
    stats: [
      { value: '>50 deg', label: 'Phase margin target', icon: '📐' },
      { value: '>10 dB', label: 'Gain margin target', icon: '📏' },
      { value: '100kHz-5MHz', label: 'Switching frequencies', icon: '⚡' },
    ],
    examples: ['Buck converters', 'Boost converters', 'LDO regulators', 'LLC resonant converters'],
    companies: ['Texas Instruments', 'Analog Devices', 'Infineon', 'ON Semiconductor'],
    futureImpact: 'Digital power control with adaptive compensation will automatically tune feedback loops for optimal stability under changing conditions.',
    color: '#f59e0b',
  },
];

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
const OpAmpStabilityRenderer: React.FC<OpAmpStabilityRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Play phase state
  const [adcDb, setAdcDb] = useState(100);       // Open-loop DC gain (dB)
  const [fp1, setFp1] = useState(10);             // Dominant pole (Hz)
  const [fp2, setFp2] = useState(1e6);            // Second pole (Hz)
  const [fp3, setFp3] = useState(10e6);           // Third pole (Hz)
  const [betaDb, setBetaDb] = useState(0);        // Feedback factor (dB), 0 = unity gain
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase state
  const [capLoad, setCapLoad] = useState(100);    // pF capacitive load
  const [rIso, setRIso] = useState(0);            // Isolation resistor (ohms)
  const [compCap, setCompCap] = useState(0);      // Compensation capacitor (pF)

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation
  const isNavigating = useRef(false);

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameType: 'op_amp_stability',
      gameTitle: 'Op-Amp Stability',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent('phase_changed', { from: phase, to: p });
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]);
  }, [phase, goToPhase]);

  // Animation for play phases
  useEffect(() => {
    if (phase !== 'hook' && phase !== 'play' && phase !== 'twist_play') return;
    const timer = setInterval(() => setAnimFrame(f => f + 1), 50);
    return () => clearInterval(timer);
  }, [phase]);

  // Effective poles for twist (capacitive load adds an extra pole)
  const rOut = 50; // op-amp output impedance (ohms)
  const extraPoleFp = capLoad > 0 ? 1 / (2 * Math.PI * (rOut + rIso) * capLoad * 1e-12) : 1e12;
  // Compensation zero from Riso + CL
  const compZeroFp = rIso > 0 && capLoad > 0 ? 1 / (2 * Math.PI * rIso * capLoad * 1e-12) : 1e12;

  const getEffectiveFp3 = (isTwist: boolean) => {
    if (!isTwist) return fp3;
    // Extra pole from capacitive load lowers the effective third pole
    return Math.min(fp3, extraPoleFp);
  };

  // Compute margins for current settings
  const currentMargins = getMargins(adcDb, fp1, fp2, getEffectiveFp3(false), betaDb);
  const twistMargins = getMargins(adcDb, fp1, fp2, getEffectiveFp3(true), betaDb);

  // Styles
  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    minHeight: '44px',
    borderRadius: '10px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.accent})`,
    color: 'white',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: `1px solid ${colors.border}`,
  };

  const sliderStyle: React.CSSProperties = {
    touchAction: 'pan-y',
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    WebkitAppearance: 'none' as const,
    accentColor: colors.accent,
    cursor: 'pointer',
  };

  // Progress bar
  const renderProgressBar = () => {
    const idx = validPhases.indexOf(phase);
    const pct = ((idx + 1) / validPhases.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '4px', background: colors.bgSecondary }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${colors.primaryDark}, ${colors.accent})`, transition: 'width 0.4s ease' }} />
      </div>
    );
  };

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            background: p === phase ? colors.accent : i < validPhases.indexOf(phase) ? colors.success : colors.border,
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.2s',
          }}
          title={p}
        />
      ))}
    </div>
  );

  // Log-scale frequency helpers
  const freqToX = (freq: number, x0: number, x1: number, fMin: number, fMax: number) => {
    const logMin = Math.log10(fMin);
    const logMax = Math.log10(fMax);
    const logF = Math.log10(Math.max(freq, fMin));
    return x0 + (logF - logMin) / (logMax - logMin) * (x1 - x0);
  };

  // ---------------------------------------------------------------------------
  // SVG: BODE PLOT
  // ---------------------------------------------------------------------------
  const renderBodePlot = (isTwist: boolean, width: number, height: number) => {
    const fMin = 1;
    const fMax = 1e9;
    const marginL = 55;
    const marginR = 15;
    const marginT = 20;
    const marginB = 35;
    const midGap = 15;
    const plotW = width - marginL - marginR;
    const halfH = (height - marginT - marginB - midGap) / 2;

    // Magnitude plot area
    const magY0 = marginT;
    const magY1 = magY0 + halfH;
    const magDbMin = -40;
    const magDbMax = 120;

    // Phase plot area
    const phY0 = magY1 + midGap;
    const phY1 = phY0 + halfH;
    const phMin = -270;
    const phMax = 0;

    const dbToY = (db: number) => magY0 + (1 - (db - magDbMin) / (magDbMax - magDbMin)) * halfH;
    const phToY = (ph: number) => phY0 + (1 - (ph - phMin) / (phMax - phMin)) * halfH;
    const fToX = (f: number) => freqToX(f, marginL, marginL + plotW, fMin, fMax);

    // Generate frequency points (log spaced)
    const freqs: number[] = [];
    for (let logF = 0; logF <= 9; logF += 0.05) {
      freqs.push(Math.pow(10, logF));
    }

    const effFp3 = getEffectiveFp3(isTwist);
    const margins = isTwist ? twistMargins : currentMargins;

    // Open-loop gain curve
    const olPoints = freqs.map(f => {
      const { magDb, phaseDeg } = computeOpenLoopGain(f, adcDb, fp1, fp2, effFp3);
      return { f, magDb, phaseDeg };
    });

    // 1/beta line (horizontal at -betaDb)
    const betaLineDb = -betaDb;

    // Loop gain curve
    const loopPoints = freqs.map(f => {
      const { magDb, phaseDeg } = computeLoopGain(f, adcDb, fp1, fp2, effFp3, betaDb);
      return { f, magDb, phaseDeg };
    });

    // Build SVG path for magnitude
    const olMagPath = olPoints
      .filter(p => p.magDb >= magDbMin - 5 && p.magDb <= magDbMax + 5)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${fToX(p.f).toFixed(1)} ${dbToY(Math.max(magDbMin, Math.min(magDbMax, p.magDb))).toFixed(1)}`)
      .join(' ');

    // Phase path
    const olPhasePath = olPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${fToX(p.f).toFixed(1)} ${phToY(Math.max(phMin, Math.min(phMax, p.phaseDeg))).toFixed(1)}`)
      .join(' ');

    // Grid lines
    const magGridDbs = [-20, 0, 20, 40, 60, 80, 100];
    const phGridDegs = [-270, -180, -90, 0];
    const freqGridDecades = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];

    const formatFreq = (f: number) => {
      if (f >= 1e9) return `${f / 1e9}G`;
      if (f >= 1e6) return `${f / 1e6}M`;
      if (f >= 1e3) return `${f / 1e3}k`;
      return `${f}`;
    };

    // Margin color
    const pmColor = margins.phaseMarginDeg >= 45 ? colors.marginGood : margins.phaseMarginDeg >= 20 ? colors.marginWarn : colors.marginBad;
    const gmColor = margins.gainMarginDb >= 6 ? colors.marginGood : margins.gainMarginDb >= 3 ? colors.marginWarn : colors.marginBad;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width={width} height={height} fill={colors.bgSecondary} rx="8" />

        {/* Magnitude plot background */}
        <rect x={marginL} y={magY0} width={plotW} height={halfH} fill="rgba(0,0,0,0.3)" rx="4" />
        {/* Phase plot background */}
        <rect x={marginL} y={phY0} width={plotW} height={halfH} fill="rgba(0,0,0,0.3)" rx="4" />

        {/* Grid lines - magnitude */}
        {magGridDbs.map(db => (
          <g key={`mg${db}`}>
            <line x1={marginL} y1={dbToY(db)} x2={marginL + plotW} y2={dbToY(db)}
              stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
            <text x={marginL - 4} y={dbToY(db) + 3} fill={colors.textMuted} fontSize="8"
              textAnchor="end" fontFamily="system-ui">{db}</text>
          </g>
        ))}

        {/* Grid lines - phase */}
        {phGridDegs.map(deg => (
          <g key={`pg${deg}`}>
            <line x1={marginL} y1={phToY(deg)} x2={marginL + plotW} y2={phToY(deg)}
              stroke={deg === -180 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'} strokeWidth={deg === -180 ? 1 : 0.5}
              strokeDasharray={deg === -180 ? '4,2' : 'none'} />
            <text x={marginL - 4} y={phToY(deg) + 3} fill={deg === -180 ? colors.error : colors.textMuted}
              fontSize="8" textAnchor="end" fontFamily="system-ui">{deg}°</text>
          </g>
        ))}

        {/* Frequency grid */}
        {freqGridDecades.map(f => (
          <g key={`fg${f}`}>
            <line x1={fToX(f)} y1={magY0} x2={fToX(f)} y2={magY1} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <line x1={fToX(f)} y1={phY0} x2={fToX(f)} y2={phY1} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <text x={fToX(f)} y={phY1 + 12} fill={colors.textMuted} fontSize="7" textAnchor="middle"
              fontFamily="system-ui">{formatFreq(f)}</text>
          </g>
        ))}

        {/* 0 dB line in magnitude plot */}
        <line x1={marginL} y1={dbToY(0)} x2={marginL + plotW} y2={dbToY(0)}
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" strokeDasharray="3,2" />

        {/* -180 degree label */}
        <text x={marginL + plotW + 2} y={phToY(-180) + 3} fill={colors.error} fontSize="7" fontFamily="system-ui">-180°</text>

        {/* Labels */}
        <text x={marginL - 8} y={magY0 - 5} fill={colors.textSecondary} fontSize="8" textAnchor="end"
          fontFamily="system-ui" fontWeight="600">dB</text>
        <text x={marginL - 8} y={phY0 - 5} fill={colors.textSecondary} fontSize="8" textAnchor="end"
          fontFamily="system-ui" fontWeight="600">Phase</text>
        <text x={marginL + plotW / 2} y={height - 2} fill={colors.textSecondary} fontSize="8"
          textAnchor="middle" fontFamily="system-ui">Frequency (Hz)</text>

        {/* Open-loop gain curve */}
        <path d={olMagPath} fill="none" stroke={colors.gainCurve} strokeWidth="2" />

        {/* 1/beta line */}
        <line x1={marginL} y1={dbToY(betaLineDb)} x2={marginL + plotW} y2={dbToY(betaLineDb)}
          stroke={colors.betaLine} strokeWidth="1.5" strokeDasharray="6,3" />
        <text x={marginL + plotW - 2} y={dbToY(betaLineDb) - 4} fill={colors.betaLine}
          fontSize="8" textAnchor="end" fontFamily="system-ui">1/β ({(-betaDb).toFixed(0)} dB)</text>

        {/* Phase curve */}
        <path d={olPhasePath} fill="none" stroke={colors.phaseCurve} strokeWidth="2" />

        {/* Phase margin arrow */}
        {margins.fGainCross > fMin && margins.fGainCross < fMax && (
          <g>
            {/* Vertical line at gain crossover in phase plot */}
            <line x1={fToX(margins.fGainCross)} y1={phToY(-180)} x2={fToX(margins.fGainCross)}
              y2={phToY(Math.max(phMin, -180 + margins.phaseMarginDeg))}
              stroke={pmColor} strokeWidth="2" markerEnd="url(#arrowPM)" />
            <circle cx={fToX(margins.fGainCross)} cy={dbToY(betaLineDb)} r="3" fill={colors.gainCurve} />
            <text x={fToX(margins.fGainCross) + 5} y={phToY(-180 + Math.max(0, margins.phaseMarginDeg) / 2) + 3}
              fill={pmColor} fontSize="8" fontWeight="600" fontFamily="system-ui">
              PM={margins.phaseMarginDeg.toFixed(0)}°
            </text>
          </g>
        )}

        {/* Gain margin arrow */}
        {margins.fPhaseCross > fMin && margins.fPhaseCross < fMax && (
          <g>
            {/* Vertical line at phase crossover in magnitude plot */}
            <line x1={fToX(margins.fPhaseCross)} y1={dbToY(0)} x2={fToX(margins.fPhaseCross)}
              y2={dbToY(Math.min(magDbMax, -margins.gainMarginDb + betaLineDb))}
              stroke={gmColor} strokeWidth="2" />
            <circle cx={fToX(margins.fPhaseCross)} cy={phToY(-180)} r="3" fill={colors.phaseCurve} />
            <text x={fToX(margins.fPhaseCross) + 5}
              y={dbToY(Math.max(magDbMin, -margins.gainMarginDb / 2)) + 3}
              fill={gmColor} fontSize="8" fontWeight="600" fontFamily="system-ui">
              GM={margins.gainMarginDb.toFixed(0)} dB
            </text>
          </g>
        )}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowPM" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={pmColor} />
          </marker>
        </defs>

        {/* Legend */}
        <g transform={`translate(${marginL + 8}, ${magY0 + 12})`}>
          <line x1="0" y1="0" x2="14" y2="0" stroke={colors.gainCurve} strokeWidth="2" />
          <text x="18" y="3" fill={colors.textSecondary} fontSize="7" fontFamily="system-ui">Open-loop gain A(f)</text>
          <line x1="0" y1="12" x2="14" y2="12" stroke={colors.betaLine} strokeWidth="1.5" strokeDasharray="4,2" />
          <text x="18" y="15" fill={colors.textSecondary} fontSize="7" fontFamily="system-ui">1/β (feedback)</text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // SVG: STEP RESPONSE INSET
  // ---------------------------------------------------------------------------
  const renderStepResponse = (phaseMarginDeg: number, width: number, height: number) => {
    const marginL = 30;
    const marginR = 10;
    const marginT = 15;
    const marginB = 20;
    const plotW = width - marginL - marginR;
    const plotH = height - marginT - marginB;
    const tMax = 4;
    const yMin = -0.5;
    const yMax = 2.5;

    const tToX = (t: number) => marginL + (t / tMax) * plotW;
    const vToY = (v: number) => marginT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    const points: string[] = [];
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * tMax;
      const v = computeStepResponse(phaseMarginDeg, t);
      const clamped = Math.max(yMin, Math.min(yMax, v));
      points.push(`${i === 0 ? 'M' : 'L'} ${tToX(t).toFixed(1)} ${vToY(clamped).toFixed(1)}`);
    }

    const isStable = phaseMarginDeg > 0;
    const responseColor = phaseMarginDeg >= 45 ? colors.success : phaseMarginDeg > 0 ? colors.warning : colors.error;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width={width} height={height} fill={colors.bgSecondary} rx="6" />
        <rect x={marginL} y={marginT} width={plotW} height={plotH} fill="rgba(0,0,0,0.25)" rx="3" />

        {/* Target line at y=1 */}
        <line x1={marginL} y1={vToY(1)} x2={marginL + plotW} y2={vToY(1)}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x={marginL - 3} y={vToY(1) + 3} fill={colors.textMuted} fontSize="7" textAnchor="end" fontFamily="system-ui">1</text>
        <text x={marginL - 3} y={vToY(0) + 3} fill={colors.textMuted} fontSize="7" textAnchor="end" fontFamily="system-ui">0</text>

        {/* Step response curve */}
        <path d={points.join(' ')} fill="none" stroke={responseColor} strokeWidth="2" />

        {/* Label */}
        <text x={marginL + plotW / 2} y={height - 3} fill={colors.textSecondary} fontSize="7"
          textAnchor="middle" fontFamily="system-ui">Time</text>
        <text x={marginL + plotW / 2} y={marginT - 4} fill={responseColor} fontSize="8"
          textAnchor="middle" fontWeight="600" fontFamily="system-ui">
          {isStable
            ? (phaseMarginDeg >= 45 ? 'Stable' : 'Ringing')
            : 'OSCILLATING'}
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // SVG: HOOK ANIMATION - oscillating circuit
  // ---------------------------------------------------------------------------
  const renderHookCircuit = () => {
    const w = 360;
    const h = 200;
    const t = animFrame * 0.05;
    // Oscillating output
    const points: string[] = [];
    for (let i = 0; i <= 180; i++) {
      const x = 180 + i;
      const tLocal = t + i * 0.06;
      const envelope = Math.exp(0.15 * tLocal * 0.3) * Math.sin(6 * tLocal);
      const y = 100 - envelope * 35;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${Math.max(20, Math.min(180, y))}`);
    }

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: '400px' }}>
        <rect width={w} height={h} fill={colors.bgSecondary} rx="8" />

        {/* Op-amp triangle */}
        <polygon points="40,60 40,140 110,100" fill="none" stroke={colors.gainCurve} strokeWidth="2" />
        <text x="55" y="95" fill={colors.textMuted} fontSize="10" fontFamily="system-ui">+</text>
        <text x="55" y="115" fill={colors.textMuted} fontSize="10" fontFamily="system-ui">-</text>

        {/* Input */}
        <line x1="10" y1="80" x2="40" y2="80" stroke={colors.textSecondary} strokeWidth="1.5" />
        {/* Feedback path */}
        <line x1="110" y1="100" x2="140" y2="100" stroke={colors.textSecondary} strokeWidth="1.5" />
        <line x1="140" y1="100" x2="140" y2="150" stroke={colors.textSecondary} strokeWidth="1.5" />
        <line x1="40" y1="120" x2="40" y2="150" stroke={colors.textSecondary} strokeWidth="1.5" />
        <line x1="40" y1="150" x2="140" y2="150" stroke={colors.textSecondary} strokeWidth="1.5" />

        {/* Feedback resistor */}
        <rect x="70" y="145" width="40" height="10" fill="none" stroke={colors.betaLine} strokeWidth="1.5" rx="2" />
        <text x="90" y="167" fill={colors.betaLine} fontSize="7" textAnchor="middle" fontFamily="system-ui">Rf</text>

        {/* Output line */}
        <line x1="140" y1="100" x2="180" y2="100" stroke={colors.textSecondary} strokeWidth="1.5" />

        {/* Oscillating output waveform */}
        <path d={points.join(' ')} fill="none" stroke={colors.error} strokeWidth="2" />

        {/* Warning indicator */}
        <circle cx="300" cy="30" r="12" fill={colors.error} opacity={0.5 + 0.5 * Math.sin(t * 4)} />
        <text x="300" y="35" fill="white" fontSize="14" textAnchor="middle" fontWeight="bold" fontFamily="system-ui">!</text>

        <text x="300" y="55" fill={colors.error} fontSize="9" textAnchor="middle" fontFamily="system-ui">Unstable!</text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE: HOOK
  // ---------------------------------------------------------------------------
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>~</div>
          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
            Why Does Your Amplifier Oscillate?
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '28px' }}>
            You designed a perfect amplifier. Clean gain, tight feedback. But the output looks like this...
          </p>

          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center' }}>
            {renderHookCircuit()}
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
            Instead of a clean amplified signal, the output <span style={{ color: colors.error, fontWeight: 600 }}>oscillates uncontrollably</span>.
          </p>
          <p style={{ ...typo.body, color: colors.textMuted, marginBottom: '32px' }}>
            The culprit? <strong style={{ color: colors.accent }}>Insufficient phase margin</strong> in the feedback loop.
            The very feedback meant to stabilize is now causing instability.
          </p>

          <button onClick={() => { playSound('click'); emitEvent('game_started', {}); nextPhase(); }} style={primaryButtonStyle}>
            Investigate Stability
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: PREDICT
  // ---------------------------------------------------------------------------
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Make Your Prediction
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
            An op-amp has 100 dB open-loop gain with three poles: at 10 Hz, 1 MHz, and 10 MHz.
            It is connected as a unity-gain buffer (feedback factor = 1).
          </p>

          <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '12px' }}>
              What happens to the output when you apply a step input?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              { id: 'a', label: 'Clean step response -- negative feedback always stabilizes the output' },
              { id: 'b', label: 'Oscillation or heavy ringing -- the three poles cause too much phase shift at high frequencies' },
              { id: 'c', label: 'No output at all -- the feedback cancels the signal completely' },
              { id: 'd', label: 'The output is delayed but otherwise clean' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); emitEvent('prediction_made', { choice: opt.id }); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgCardLight,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                  fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (prediction) { playSound('success'); nextPhase(); } }}
            disabled={!prediction}
            style={{ ...primaryButtonStyle, width: '100%', opacity: prediction ? 1 : 0.5, cursor: prediction ? 'pointer' : 'not-allowed' }}
          >
            See What Happens
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: PLAY
  // ---------------------------------------------------------------------------
  if (phase === 'play') {
    const bodeW = isMobile ? 340 : 480;
    const bodeH = isMobile ? 280 : 320;
    const stepW = isMobile ? 340 : 220;
    const stepH = isMobile ? 150 : 160;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '4px', textAlign: 'center' }}>
            Explore Op-Amp Stability
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
            Adjust the amplifier parameters. Watch gain margin and phase margin change on the Bode plot.
          </p>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
            {/* LEFT: Bode plot + step response */}
            <div style={{ flex: '1 1 60%', minWidth: 0 }}>
              <div style={{ ...cardStyle, padding: '12px' }}>
                {renderBodePlot(false, bodeW, bodeH)}
              </div>
              <div style={{ ...cardStyle, padding: '10px' }}>
                {renderStepResponse(currentMargins.phaseMarginDeg, stepW, stepH)}
              </div>
            </div>

            {/* RIGHT: Controls */}
            <div style={{ flex: '1 1 40%', minWidth: 0 }}>
              <div style={cardStyle}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Controls</h3>

                {/* Open-loop DC gain */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Open-Loop DC Gain</span>
                    <span style={{ ...typo.small, color: colors.gainCurve, fontWeight: 600 }}>{adcDb} dB</span>
                  </div>
                  <input type="range" min="40" max="120" step="5" value={adcDb}
                    onChange={e => { setAdcDb(Number(e.target.value)); emitEvent('slider_changed', { param: 'adcDb', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Dominant pole */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Dominant Pole (fp1)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{fp1} Hz</span>
                  </div>
                  <input type="range" min="1" max="1000" step="1" value={fp1}
                    onChange={e => { setFp1(Number(e.target.value)); emitEvent('slider_changed', { param: 'fp1', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Second pole */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Second Pole (fp2)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{(fp2 / 1e6).toFixed(1)} MHz</span>
                  </div>
                  <input type="range" min="100000" max="10000000" step="100000" value={fp2}
                    onChange={e => { setFp2(Number(e.target.value)); emitEvent('slider_changed', { param: 'fp2', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Third pole */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Third Pole (fp3)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{(fp3 / 1e6).toFixed(0)} MHz</span>
                  </div>
                  <input type="range" min="1000000" max="100000000" step="1000000" value={fp3}
                    onChange={e => { setFp3(Number(e.target.value)); emitEvent('slider_changed', { param: 'fp3', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Feedback factor */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Feedback Factor (1/beta)</span>
                    <span style={{ ...typo.small, color: colors.betaLine, fontWeight: 600 }}>{(-betaDb).toFixed(0)} dB</span>
                  </div>
                  <input type="range" min="-40" max="0" step="1" value={betaDb}
                    onChange={e => { setBetaDb(Number(e.target.value)); emitEvent('slider_changed', { param: 'betaDb', value: e.target.value }); }}
                    style={sliderStyle} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.label, color: colors.textMuted }}>Gain = 100</span>
                    <span style={{ ...typo.label, color: colors.textMuted }}>Unity</span>
                  </div>
                </div>
              </div>

              {/* Margins display */}
              <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: currentMargins.phaseMarginDeg >= 45 ? colors.success : currentMargins.phaseMarginDeg > 0 ? colors.warning : colors.error }}>
                    {currentMargins.phaseMarginDeg.toFixed(0)}°
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Phase Margin</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: currentMargins.gainMarginDb >= 6 ? colors.success : currentMargins.gainMarginDb > 0 ? colors.warning : colors.error }}>
                    {currentMargins.gainMarginDb.toFixed(0)} dB
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Gain Margin</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary, fontSize: '14px' }}>
                    {currentMargins.fGainCross >= 1e6 ? `${(currentMargins.fGainCross / 1e6).toFixed(1)} MHz` : `${(currentMargins.fGainCross / 1e3).toFixed(0)} kHz`}
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Gain Crossover</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: currentMargins.phaseMarginDeg >= 45 ? colors.success : colors.error, fontSize: '14px' }}>
                    {currentMargins.phaseMarginDeg >= 45 ? 'STABLE' : currentMargins.phaseMarginDeg > 0 ? 'MARGINAL' : 'UNSTABLE'}
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Status</div>
                </div>
              </div>

              {/* Hint */}
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.accent }}>Try:</strong> Set unity gain (0 dB feedback), then slowly increase fp1 or decrease fp2. Watch the phase margin shrink. Find the boundary where stability is lost.
                </p>
              </div>

              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                Understand the Physics
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: REVIEW
  // ---------------------------------------------------------------------------
  if (phase === 'review') {
    const predCorrect = prediction === 'b';
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
            Phase Margin and Gain Margin
          </h2>

          <div style={{
            background: predCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${predCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <p style={{ ...typo.body, color: predCorrect ? colors.success : colors.warning, margin: 0 }}>
              {prediction
                ? (predCorrect
                  ? 'Your prediction was correct! Three poles cause excessive phase shift at the gain crossover, leading to oscillation.'
                  : 'Actually, the circuit oscillates because three poles contribute up to -270 degrees of phase shift, easily exceeding -180 degrees at the gain crossover.')
                : 'The experiment shows that multiple poles erode phase margin and cause instability.'}
            </p>
          </div>

          {/* Barkhausen Criterion */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>The Barkhausen Criterion</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              A feedback system oscillates when the loop gain <strong style={{ color: colors.textPrimary }}>T(f) = A(f) x beta</strong> satisfies:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.error, marginBottom: '4px' }}>{`|T(f)| >= 1`} &nbsp;&nbsp;AND&nbsp;&nbsp; {`∠T(f) = -180°`}</div>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>If both conditions are met at any frequency, the circuit oscillates</p>
            </div>
          </div>

          {/* Phase Margin */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Phase Margin</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Phase margin is how far the phase is from -180° at the frequency where |T| = 0 dB (the <strong style={{ color: colors.textPrimary }}>gain crossover frequency</strong>).
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong style={{ color: colors.textPrimary }}>PM = 180° + angle T(f_gc)</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
              <div style={{ background: `${colors.success}22`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.success }}>&gt; 45°</div>
                <div style={{ ...typo.label, color: colors.textMuted }}>Stable</div>
              </div>
              <div style={{ background: `${colors.warning}22`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.warning }}>20-45°</div>
                <div style={{ ...typo.label, color: colors.textMuted }}>Ringing</div>
              </div>
              <div style={{ background: `${colors.error}22`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.error }}>&lt; 0°</div>
                <div style={{ ...typo.label, color: colors.textMuted }}>Oscillating</div>
              </div>
            </div>
          </div>

          {/* Gain Margin */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.primaryDark, marginBottom: '12px' }}>Gain Margin</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Gain margin is how far |T| is below 0 dB at the frequency where the phase reaches -180° (the <strong style={{ color: colors.textPrimary }}>phase crossover frequency</strong>).
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>GM = -|T(f_pc)| in dB</strong>. Typical minimum: <span style={{ color: colors.success }}>6 dB</span>.
            </p>
          </div>

          {/* Why poles matter */}
          <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.accent}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>Why Poles Erode Phase Margin</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Each pole contributes up to <strong style={{ color: colors.accent }}>-90°</strong> of phase shift.
              With one pole, maximum phase shift is -90° (always stable).
              With two poles, it can reach -180° (marginally stable).
              With three or more poles, phase easily exceeds -180° before the gain drops to 0 dB, causing instability.
            </p>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Now Add a Twist
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: TWIST PREDICT
  // ---------------------------------------------------------------------------
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Twist: Capacitive Loading
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
            You have a stable amplifier (phase margin &gt; 60°). Now a long cable or a capacitive load of 200 pF is connected to the output. The op-amp has 50 ohm output impedance.
          </p>

          <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.warning}` }}>
            <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '12px' }}>
              What happens to stability when you add the capacitive load?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              { id: 'a', label: 'Nothing changes -- feedback compensates for any load' },
              { id: 'b', label: 'Stability gets worse -- the load capacitance and output resistance create an extra pole that reduces phase margin', },
              { id: 'c', label: 'The amplifier gain decreases but stability is unaffected' },
              { id: 'd', label: 'The capacitor acts as a filter that improves signal quality' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); emitEvent('prediction_made', { choice: opt.id, phase: 'twist_predict' }); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.accent : colors.bgCardLight,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                  fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (twistPrediction) { playSound('success'); nextPhase(); } }}
            disabled={!twistPrediction}
            style={{ ...primaryButtonStyle, width: '100%', opacity: twistPrediction ? 1 : 0.5, cursor: twistPrediction ? 'pointer' : 'not-allowed' }}
          >
            Test Your Prediction
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: TWIST PLAY
  // ---------------------------------------------------------------------------
  if (phase === 'twist_play') {
    const bodeW = isMobile ? 340 : 480;
    const bodeH = isMobile ? 280 : 320;
    const stepW = isMobile ? 340 : 220;
    const stepH = isMobile ? 150 : 160;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '4px', textAlign: 'center' }}>
            Compensate for Capacitive Load
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
            The capacitive load has destabilized the amplifier. Use a series isolation resistor and/or compensation capacitor to restore stability.
          </p>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
            {/* LEFT: Bode + step */}
            <div style={{ flex: '1 1 60%', minWidth: 0 }}>
              <div style={{ ...cardStyle, padding: '12px' }}>
                {renderBodePlot(true, bodeW, bodeH)}
              </div>
              <div style={{ ...cardStyle, padding: '10px' }}>
                {renderStepResponse(twistMargins.phaseMarginDeg, stepW, stepH)}
              </div>
            </div>

            {/* RIGHT: Controls */}
            <div style={{ flex: '1 1 40%', minWidth: 0 }}>
              <div style={cardStyle}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>Load & Compensation</h3>

                {/* Capacitive load */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Capacitive Load (CL)</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{capLoad} pF</span>
                  </div>
                  <input type="range" min="0" max="1000" step="10" value={capLoad}
                    onChange={e => { setCapLoad(Number(e.target.value)); emitEvent('slider_changed', { param: 'capLoad', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Isolation resistor */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Isolation Resistor (Riso)</span>
                    <span style={{ ...typo.small, color: colors.secondary, fontWeight: 600 }}>{rIso} ohms</span>
                  </div>
                  <input type="range" min="0" max="200" step="5" value={rIso}
                    onChange={e => { setRIso(Number(e.target.value)); emitEvent('slider_changed', { param: 'rIso', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Compensation capacitor */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Compensation Cap (Cc)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{compCap} pF</span>
                  </div>
                  <input type="range" min="0" max="500" step="5" value={compCap}
                    onChange={e => { setCompCap(Number(e.target.value)); emitEvent('slider_changed', { param: 'compCap', value: e.target.value }); }}
                    style={sliderStyle} />
                </div>

                {/* Extra pole frequency display */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Extra pole from CL + Rout:</div>
                  <div style={{ ...typo.h3, color: colors.warning }}>
                    {extraPoleFp >= 1e6 ? `${(extraPoleFp / 1e6).toFixed(1)} MHz` : `${(extraPoleFp / 1e3).toFixed(0)} kHz`}
                  </div>
                  {rIso > 0 && capLoad > 0 && (
                    <>
                      <div style={{ ...typo.small, color: colors.textMuted, marginTop: '6px', marginBottom: '2px' }}>Compensation zero from Riso:</div>
                      <div style={{ ...typo.h3, color: colors.secondary }}>
                        {compZeroFp >= 1e6 ? `${(compZeroFp / 1e6).toFixed(1)} MHz` : `${(compZeroFp / 1e3).toFixed(0)} kHz`}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Margins */}
              <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: twistMargins.phaseMarginDeg >= 45 ? colors.success : twistMargins.phaseMarginDeg > 0 ? colors.warning : colors.error }}>
                    {twistMargins.phaseMarginDeg.toFixed(0)}°
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Phase Margin</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ ...typo.h3, color: twistMargins.gainMarginDb >= 6 ? colors.success : twistMargins.gainMarginDb > 0 ? colors.warning : colors.error }}>
                    {twistMargins.gainMarginDb.toFixed(0)} dB
                  </div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>Gain Margin</div>
                </div>
              </div>

              {twistMargins.phaseMarginDeg >= 45 && (
                <div style={{ background: `${colors.success}22`, border: `1px solid ${colors.success}`, borderRadius: '10px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0, fontWeight: 600 }}>
                    Circuit stabilized! Phase margin &gt; 45 degrees.
                  </p>
                </div>
              )}

              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.accent }}>Hint:</strong> Increase the isolation resistor. It moves the extra pole while creating a compensating zero. Try 20-50 ohms with 200-500 pF load.
                </p>
              </div>

              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                Review Compensation Techniques
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: TWIST REVIEW
  // ---------------------------------------------------------------------------
  if (phase === 'twist_review') {
    const twistCorrect = twistPrediction === 'b';
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
            Compensation Techniques
          </h2>

          <div style={{
            background: twistCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${twistCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <p style={{ ...typo.body, color: twistCorrect ? colors.success : colors.warning, margin: 0 }}>
              {twistPrediction
                ? (twistCorrect
                  ? 'Correct! Capacitive loading creates an extra pole (Rout x CL) that erodes phase margin.'
                  : 'The correct answer is B. The output impedance and load capacitance form a new pole fp = 1/(2*pi*Rout*CL) that steals phase margin.')
                : 'As you saw, capacitive loading adds an extra pole that can destabilize a previously stable amplifier.'}
            </p>
          </div>

          {/* Technique 1: Series resistor */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.secondary, marginBottom: '10px' }}>1. Series Isolation Resistor</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              A small resistor (10-100 ohms) in series with the output isolates the op-amp from the capacitive load.
              It converts the problematic pole into a <strong style={{ color: colors.textPrimary }}>pole-zero pair</strong>.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0, fontFamily: 'monospace' }}>
                Pole: fp = 1 / (2*pi*(Rout + Riso)*CL)<br />
                Zero: fz = 1 / (2*pi*Riso*CL)
              </p>
            </div>
          </div>

          {/* Technique 2: Dominant pole */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '10px' }}>2. Dominant Pole Compensation</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Adding a capacitor (Miller compensation) that creates a very low-frequency dominant pole.
              This forces the gain to cross 0 dB while only one pole is active, guaranteeing near 90° of phase margin.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              Tradeoff: reduced bandwidth. Used internally in most general-purpose op-amps (e.g., LM741).
            </p>
          </div>

          {/* Technique 3: Lead compensation */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.primaryDark, marginBottom: '10px' }}>3. Lead Compensation (Feedforward Capacitor)</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              A capacitor in the feedback path (parallel to Rf) adds a zero that boosts the phase at the crossover frequency.
              Critical for transimpedance amplifiers with large input capacitance.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0, fontFamily: 'monospace' }}>
                Cf = sqrt(Cin / (2*pi*Rf*GBW))
              </p>
            </div>
          </div>

          {/* Technique 4: Gain reduction */}
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '10px' }}>4. Increased Closed-Loop Gain</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Higher closed-loop gain means the gain crossover occurs at a lower frequency where there is more phase margin.
              Unity gain is the <strong style={{ color: colors.textPrimary }}>worst case</strong> for stability.
              Some op-amps are specified as {'"'}stable for gain {'>='} 5{'"'} or {'"'}gain {'>='} 10.{'"'}
            </p>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Real-World Applications
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: TRANSFER
  // ---------------------------------------------------------------------------
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
          <TransferPhaseView
            conceptName="Op-Amp Stability"
            applications={realWorldApps}
            onComplete={() => { playSound('complete'); nextPhase(); }}
            isMobile={isMobile}
            colors={colors}
            playSound={(s: string) => playSound(s as 'click' | 'success')}
          />
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE: TEST
  // ---------------------------------------------------------------------------
  if (phase === 'test') {
    // Results view
    if (testSubmitted) {
      const getGrade = (s: number) => {
        if (s >= 9) return { letter: 'A+', color: colors.success };
        if (s >= 8) return { letter: 'A', color: colors.success };
        if (s >= 7) return { letter: 'B', color: colors.secondary };
        if (s >= 6) return { letter: 'C', color: colors.warning };
        return { letter: 'F', color: colors.error };
      };
      const grade = getGrade(testScore);

      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
          {renderProgressBar()}
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Test Results
            </h2>

            {/* Score card */}
            <div style={{ ...cardStyle, textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: grade.color, marginBottom: '4px', fontFamily: 'system-ui' }}>
                {grade.letter}
              </div>
              <div style={{ ...typo.h2, color: colors.textPrimary }}>{testScore}/10</div>
              <div style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px' }}>
                {testScore >= 7 ? 'Great understanding of stability concepts!' : 'Review the material and try again.'}
              </div>
            </div>

            {/* Answer key */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key</h3>
            {testQuestions.map((q, i) => {
              const correctId = q.options.find(o => o.correct)?.id;
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer === correctId;
              return (
                <div key={i} style={{
                  ...cardStyle,
                  borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Q{i + 1}</span>
                    <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 600 }}>
                      {isCorrect ? 'Correct' : `Wrong (you: ${userAnswer?.toUpperCase()}, correct: ${correctId?.toUpperCase()})`}
                    </span>
                  </div>
                  <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px' }}>{q.question}</p>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: 0, fontStyle: 'italic' }}>{q.explanation}</p>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {testScore < 7 && (
                <button
                  onClick={() => { setTestSubmitted(false); setTestAnswers(Array(10).fill(null)); setCurrentQuestion(0); }}
                  style={{ ...primaryButtonStyle, flex: 1 }}
                >
                  Retry Test
                </button>
              )}
              <button
                onClick={() => { playSound('complete'); emitEvent('game_completed', { score: testScore, total: 10 }); nextPhase(); }}
                style={{ ...primaryButtonStyle, flex: 1 }}
              >
                {testScore >= 7 ? 'Complete Game' : 'Continue Anyway'}
              </button>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Question view
    const question = testQuestions[currentQuestion];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px' }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Question {currentQuestion + 1} of 10</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.accent}`, marginBottom: '16px' }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>{question.question}</h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAns = [...testAnswers];
                  newAns[currentQuestion] = opt.id;
                  setTestAnswers(newAns);
                  emitEvent('answer_submitted', { question: currentQuestion, answer: opt.id });
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgCardLight,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                  fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{ flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer' }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}
              >
                Next Question
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
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', fontWeight: 600,
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

  // ---------------------------------------------------------------------------
  // PHASE: MASTERY
  // ---------------------------------------------------------------------------
  if (phase === 'mastery') {
    const grade = testScore >= 9 ? 'A+' : testScore >= 8 ? 'A' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'F';
    const gradeColor = testScore >= 7 ? colors.success : testScore >= 6 ? colors.warning : colors.error;

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', paddingBottom: '16px', textAlign: 'center', overflowY: 'auto', flex: 1, paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
          {testScore >= 7 ? '🏆' : '📚'}
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: gradeColor, marginBottom: '8px' }}>
          {testScore >= 7 ? 'Stability Master!' : 'Keep Practicing!'}
        </h1>

        <div style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Score: {testScore}/10 &mdash; Grade: {grade}
        </div>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '24px' }}>
          {testScore >= 7
            ? 'You understand op-amp stability, Bode plot analysis, and compensation techniques. These skills are essential for analog circuit design.'
            : 'Op-amp stability is a challenging topic. Review the phase margin and compensation concepts and try again.'}
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px',
          marginBottom: '24px', maxWidth: '420px', textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>You Learned:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Phase margin and gain margin from Bode plots',
              'The Barkhausen criterion for oscillation',
              'How poles erode phase margin',
              'Capacitive loading creates extra poles',
              'Series resistor isolation for compensation',
              'Dominant pole and lead compensation',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answer key summary */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '20px',
          marginBottom: '24px', maxWidth: '420px', textAlign: 'left', width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key</h3>
          {testQuestions.map((q, i) => {
            const correctId = q.options.find(o => o.correct)?.id;
            const isCorrect = testAnswers[i] === correctId;
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 700, minWidth: '20px' }}>
                  {isCorrect ? '✓' : '✗'}
                </span>
                <span style={{ ...typo.small, color: colors.textMuted }}>
                  Q{i + 1}: {correctId?.toUpperCase()}
                  {!isCorrect && ` (yours: ${testAnswers[i]?.toUpperCase()})`}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.textSecondary, cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <button
            onClick={() => {
              playSound('complete');
              emitEvent('game_completed', { score: testScore, total: 10, phase: 'mastery' });
              onGameEvent?.({
                eventType: 'game_completed',
                gameType: 'op_amp_stability',
                gameTitle: 'Op-Amp Stability',
                details: { mastery_achieved: true, score: testScore, total: 10 },
                timestamp: Date.now(),
              });
              if (typeof window !== 'undefined') {
                window.location.href = '/games';
              }
            }}
            style={{ ...primaryButtonStyle, textDecoration: 'none' }}
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

export default OpAmpStabilityRenderer;
