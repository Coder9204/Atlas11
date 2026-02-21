'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// GAME 275: IMPEDANCE MATCHING
// RF/Communications: Maximum power transfer when source impedance equals load
// impedance (conjugate match). Mismatched impedances cause reflections (VSWR > 1).
// L-networks, pi-networks, and Smith chart concepts for matching.
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

interface ImpedanceMatchingRendererProps {
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

// =============================================================================
// RF PHYSICS HELPERS
// =============================================================================

/** Compute reflection coefficient magnitude from Zs and Zl (complex) */
function reflectionCoefficient(
  zsR: number, zsX: number, zlR: number, zlX: number
): number {
  // Gamma = (Zl - Zs*) / (Zl + Zs)
  // For conjugate match convention: Gamma = (Zl - Zs) / (Zl + Zs)
  const numR = zlR - zsR;
  const numX = zlX - zsX;
  const denR = zlR + zsR;
  const denX = zlX + zsX;
  const numMag = Math.sqrt(numR * numR + numX * numX);
  const denMag = Math.sqrt(denR * denR + denX * denX);
  if (denMag < 0.001) return 1;
  return Math.min(numMag / denMag, 1);
}

/** VSWR from reflection coefficient */
function vswr(gamma: number): number {
  if (gamma >= 0.999) return 999;
  return (1 + gamma) / (1 - gamma);
}

/** Return loss in dB from reflection coefficient */
function returnLoss(gamma: number): number {
  if (gamma < 0.001) return 60;
  return Math.min(-20 * Math.log10(gamma), 60);
}

/** Reflected power percentage */
function reflectedPower(gamma: number): number {
  return gamma * gamma * 100;
}

/** Mismatch loss in dB */
function mismatchLoss(gamma: number): number {
  const ml = -10 * Math.log10(1 - gamma * gamma);
  return Math.min(ml, 30);
}

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "A ham radio operator connects a 50-ohm transceiver to a 200-ohm antenna. The SWR meter reads high, and the amplifier's protection circuit reduces output power.",
    question: "Why does the impedance mismatch cause the amplifier to reduce power?",
    options: [
      { id: 'a', label: "The antenna absorbs too much current" },
      { id: 'b', label: "Reflected power travels back to the amplifier, increasing voltage stress on output transistors", correct: true },
      { id: 'c', label: "The coaxial cable overheats from friction" },
      { id: 'd', label: "Higher impedance antennas always draw more power" }
    ],
    explanation: "When impedances are mismatched, a portion of transmitted power reflects back toward the source. This reflected power creates standing waves on the transmission line, producing voltage peaks that can exceed the transistor ratings. The protection circuit folds back power to prevent damage. At VSWR = 4:1 (50 vs 200 ohms), 36% of power reflects back."
  },
  {
    scenario: "An RF engineer measures VSWR = 1.5:1 on a cellular base station antenna feed. Management asks if this is acceptable or needs fixing.",
    question: "What percentage of transmitted power is being reflected at VSWR 1.5:1?",
    options: [
      { id: 'a', label: "About 50% -- half the power is reflected" },
      { id: 'b', label: "About 4% -- a small but measurable amount", correct: true },
      { id: 'c', label: "About 25% -- a quarter of the power" },
      { id: 'd', label: "0% -- VSWR 1.5 means perfect match" }
    ],
    explanation: "VSWR 1.5:1 gives reflection coefficient = (1.5-1)/(1.5+1) = 0.2. Reflected power = 0.2^2 = 0.04 = 4%. This is generally acceptable for most RF systems. VSWR < 1.5 (return loss > 14 dB) is a common specification threshold. Only 0.18 dB of mismatch loss occurs."
  },
  {
    scenario: "A Wi-Fi router manufacturer tests their antenna at 2.4 GHz and achieves VSWR = 1.2:1. However, at 5.8 GHz, the same antenna shows VSWR = 3:1.",
    question: "Why does the matching degrade at the higher frequency?",
    options: [
      { id: 'a', label: "Higher frequencies carry more energy, causing heating" },
      { id: 'b', label: "The matching network components have frequency-dependent reactances, so the match only works perfectly at the design frequency", correct: true },
      { id: 'c', label: "Wi-Fi signals interfere with themselves at 5.8 GHz" },
      { id: 'd', label: "The antenna physically shrinks at higher frequencies" }
    ],
    explanation: "Matching networks use inductors and capacitors whose reactances change with frequency (XL = 2*pi*f*L increases, XC = 1/(2*pi*f*C) decreases). A network designed for 2.4 GHz provides the correct conjugate impedance only near that frequency. At 5.8 GHz, the reactances are completely different, breaking the match. This is why wideband matching is fundamentally challenging."
  },
  {
    scenario: "A satellite communication system uses a 50-ohm transmission line. The antenna has impedance 50 + j25 ohms at the operating frequency.",
    question: "What type of matching element would most simply cancel the +j25 ohm reactive component?",
    options: [
      { id: 'a', label: "A resistor in series to absorb the reactive power" },
      { id: 'b', label: "A series capacitor providing -j25 ohms of reactance to cancel the inductive component", correct: true },
      { id: 'c', label: "A longer transmission line to increase impedance" },
      { id: 'd', label: "A power amplifier to overcome the mismatch" }
    ],
    explanation: "The +j25 ohm component is inductive reactance. Adding a series capacitor with reactance XC = -j25 ohms cancels it, leaving only the 50-ohm resistive part. This is the principle of conjugate matching: the matching network provides the complex conjugate of the load's reactive component. XC = 1/(2*pi*f*C) determines the required capacitor value."
  },
  {
    scenario: "An RF engineer is choosing between an L-network (2 components) and a pi-network (3 components) for an impedance matching circuit in a power amplifier.",
    question: "What is the key advantage of the pi-network over the simpler L-network?",
    options: [
      { id: 'a', label: "Pi-networks use less board space" },
      { id: 'b', label: "Pi-networks allow independent control of Q factor (bandwidth), while L-networks have fixed Q determined by the impedance ratio", correct: true },
      { id: 'c', label: "Pi-networks eliminate all reflections across all frequencies" },
      { id: 'd', label: "Pi-networks work without capacitors" }
    ],
    explanation: "An L-network has exactly two components and provides one solution -- the Q factor is fixed by the impedance transformation ratio. A pi-network adds a third component, giving an extra degree of freedom to independently set bandwidth (Q). Higher Q means narrower bandwidth but better harmonic suppression. This tradeoff is critical in amplifier design."
  },
  {
    scenario: "A transmission line has a characteristic impedance of 50 ohms and is terminated with a 50-ohm load. An engineer measures the voltage along the line and finds it constant everywhere.",
    question: "Why is the voltage constant along a perfectly matched line?",
    options: [
      { id: 'a', label: "The cable has zero resistance" },
      { id: 'b', label: "With no reflections, only the forward-traveling wave exists, so the voltage envelope is flat", correct: true },
      { id: 'c', label: "The source provides constant voltage regulation" },
      { id: 'd', label: "All cables maintain constant voltage by design" }
    ],
    explanation: "When the load impedance exactly equals the characteristic impedance, the reflection coefficient is zero (no reflected wave). Only the forward-traveling wave exists. Since there is no interference between forward and reflected waves, the voltage magnitude is constant everywhere along the line. This is the definition of a flat line -- VSWR = 1:1."
  },
  {
    scenario: "An antenna engineer places a Smith chart impedance measurement at 0.4 + j0.3 (normalized to 50 ohms). The actual impedance is therefore 20 + j15 ohms.",
    question: "On the Smith chart, where does a perfect 50-ohm match appear?",
    options: [
      { id: 'a', label: "At the outer edge of the chart (|Gamma| = 1)" },
      { id: 'b', label: "At the exact center of the chart (normalized impedance = 1 + j0)", correct: true },
      { id: 'c', label: "At the top of the chart (maximum reactance)" },
      { id: 'd', label: "Anywhere on the real axis" }
    ],
    explanation: "The Smith chart maps impedance to reflection coefficient. The center represents Gamma = 0 (perfect match), where normalized impedance is 1 + j0, meaning Z = Z0. The outer edge represents |Gamma| = 1 (total reflection). Moving from the edge toward the center represents improving the match. This makes the Smith chart an intuitive visual tool for matching design."
  },
  {
    scenario: "A 75-ohm cable TV distribution system must connect to a 50-ohm measurement instrument. An engineer inserts a minimum-loss matching pad.",
    question: "Why does a resistive matching pad always introduce insertion loss?",
    options: [
      { id: 'a', label: "Resistors slow down the signal" },
      { id: 'b', label: "The resistors must dissipate real power to present the correct impedance to both ports", correct: true },
      { id: 'c', label: "The pad reflects power to achieve matching" },
      { id: 'd', label: "Resistive pads only work at DC" }
    ],
    explanation: "A resistive pad achieves matching by absorbing power in resistors. For 75-to-50 ohm matching, the minimum loss pad introduces about 5.7 dB of loss. This is acceptable for measurement but never used in transmit paths where power efficiency matters. Reactive matching networks (L, pi, T) achieve matching with theoretically zero loss because ideal inductors and capacitors do not dissipate power."
  },
  {
    scenario: "A radar system operates at 10 GHz. The waveguide-to-antenna transition shows return loss of 20 dB at 10 GHz but only 10 dB at 9.5 GHz and 10.5 GHz.",
    question: "What does the 20 dB return loss bandwidth tell us about the matching network?",
    options: [
      { id: 'a', label: "The system can handle 20 dB of signal" },
      { id: 'b', label: "The matching network has limited bandwidth; it provides excellent match at center frequency but degrades as frequency moves away", correct: true },
      { id: 'c', label: "The radar should only operate at 10 GHz forever" },
      { id: 'd', label: "20 dB return loss means 20% of power is reflected" }
    ],
    explanation: "Return loss of 20 dB means only 1% reflected power at 10 GHz (excellent). At 10 +/- 0.5 GHz, return loss drops to 10 dB (10% reflected). This bandwidth limitation is inherent in reactive matching: the network provides conjugate match at one frequency, and the match degrades as frequency departs. Wider bandwidth requires lower Q designs or multi-section matching networks."
  },
  {
    scenario: "Two identical 50-ohm antennas are connected together through a short coaxial cable. An engineer is surprised that maximum power transfer occurs with zero reflections.",
    question: "Why does connecting two identical impedances result in maximum power transfer?",
    options: [
      { id: 'a', label: "Identical antennas always resonate together" },
      { id: 'b', label: "When source and load impedances are equal (or conjugate), the maximum power transfer theorem is satisfied, and no reflections occur", correct: true },
      { id: 'c', label: "Short cables eliminate all losses" },
      { id: 'd', label: "Antennas produce more power when paired" }
    ],
    explanation: "The maximum power transfer theorem states that maximum power is delivered to a load when ZL = ZS* (complex conjugate of source impedance). For purely resistive impedances, this simplifies to ZL = ZS. When both are 50 ohms, reflection coefficient = (50-50)/(50+50) = 0, meaning zero reflected power and maximum transfer. This fundamental principle underpins all impedance matching."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS
// =============================================================================
const realWorldApps = [
  {
    icon: '📻',
    title: 'Amateur Radio & HF Communications',
    short: 'Ham Radio Matching',
    tagline: 'Antenna tuners that make any wire work',
    description: 'Ham radio operators routinely match their 50-ohm transceivers to antennas with widely varying impedances. Manual and automatic antenna tuners use L, T, and pi-networks to achieve low VSWR across multiple frequency bands, protecting expensive amplifiers from reflected power damage.',
    connection: 'The antenna tuner is a real-time impedance matching network. Operators adjust capacitors and inductors while watching the SWR meter drop toward 1:1, directly applying the conjugate match principle.',
    howItWorks: 'An automatic tuner measures forward and reflected power, then steps through relay-switched L and C values to minimize VSWR. Modern tuners match in under 100 milliseconds using binary search algorithms across component banks.',
    stats: [
      { value: '< 100 ms', label: 'Auto-tune match time' },
      { value: '1.8-54 MHz', label: 'Typical frequency range' },
      { value: '10:1', label: 'Impedance matching range' }
    ],
    examples: ['MFJ automatic tuners', 'Elecraft KAT500', 'iCOM AH-4 remote tuner', 'LDG AT-600ProII'],
    companies: ['Elecraft', 'MFJ', 'ICOM', 'LDG Electronics'],
    futureImpact: 'Software-defined tuners with AI-based algorithms will predict optimal matching solutions from antenna modeling, achieving sub-second matching across wider impedance ranges.',
    color: '#F59E0B'
  },
  {
    icon: '📱',
    title: '5G & Cellular RF Front Ends',
    short: '5G Antenna Matching',
    tagline: 'Billions of matched circuits in every phone',
    description: 'Every cellular phone contains multiple impedance matching networks between the power amplifier, filters, and antenna. These networks must operate across dozens of frequency bands while maintaining VSWR < 2:1 under varying conditions like hand proximity and head placement.',
    connection: 'Phone antenna impedance changes when you hold it -- the matching network must adapt. Aperture tuning uses MEMS switches and tunable capacitors to re-match the antenna in real time, maintaining call quality.',
    howItWorks: 'Tunable matching networks use BST (barium strontium titanate) varactors or RF MEMS switches to adjust capacitance. A closed-loop system monitors reflected power and adjusts matching components in microseconds as hand position changes.',
    stats: [
      { value: '30+', label: 'Frequency bands in modern phones' },
      { value: '< 1 dB', label: 'Insertion loss budget' },
      { value: '3:1', label: 'VSWR improvement ratio' }
    ],
    examples: ['iPhone antenna aperture tuning', 'Samsung Galaxy RF matching', 'Qualcomm QAT series tuners', 'mmWave phased array matching'],
    companies: ['Qualcomm', 'Qorvo', 'Skyworks', 'Murata'],
    futureImpact: 'Reconfigurable intelligent surfaces and holographic antennas will dynamically match impedance across the environment, not just at the device.',
    color: '#3B82F6'
  },
  {
    icon: '🛰',
    title: 'Satellite & Deep Space Links',
    short: 'Space RF Systems',
    tagline: 'Every milliwatt counts across millions of miles',
    description: 'Satellite communication systems demand extremely low-loss impedance matching because power is severely limited. A 0.5 dB mismatch loss means 10% less radiated power -- catastrophic for a deep space probe where signals are already impossibly faint.',
    connection: 'The waveguide-to-horn transition, diplexer matching, and feed network all require precise impedance matching. At Ka-band (26.5-40 GHz), dimensional tolerances of micrometers determine match quality.',
    howItWorks: 'Multi-section quarter-wave transformers provide broadband matching between waveguide and free space. Each section steps impedance gradually, achieving wideband performance impossible with single-section matching. Chebyshev and binomial transformer designs trade ripple for bandwidth.',
    stats: [
      { value: '> 30 dB', label: 'Return loss requirement' },
      { value: '0.1 dB', label: 'Maximum mismatch loss' },
      { value: '20%', label: 'Typical operating bandwidth' }
    ],
    examples: ['NASA Deep Space Network', 'Starlink phased arrays', 'GOES weather satellite feeds', 'James Webb Space Telescope communications'],
    companies: ['NASA JPL', 'Lockheed Martin', 'Northrop Grumman', 'SpaceX'],
    futureImpact: 'Metamaterial-based matching structures will achieve perfect matching across octave bandwidths, enabling multi-mission frequency flexibility.',
    color: '#8B5CF6'
  },
  {
    icon: '🏥',
    title: 'Medical RF & MRI Systems',
    short: 'Medical Impedance Matching',
    tagline: 'Delivering precise RF energy into tissue',
    description: 'MRI scanners use RF coils that must be impedance-matched to 50 ohms at the Larmor frequency. The coil impedance changes with patient size and position, requiring automatic tuning and matching. RF ablation systems similarly match to tissue impedance for controlled heating.',
    connection: 'In MRI, poor matching means inefficient excitation pulses and reduced signal-to-noise ratio. Each patient changes the coil loading, so adaptive matching networks re-tune before every scan sequence.',
    howItWorks: 'Varactor-based automatic matching networks adjust in milliseconds. PIN diode switches select between pre-tuned matching states. Advanced systems use real-time impedance monitoring during pulse sequences to maintain match as tissue heats.',
    stats: [
      { value: '64 MHz', label: 'MRI frequency (1.5T)' },
      { value: '< 1.3:1', label: 'Required VSWR' },
      { value: '-30 dB', label: 'Isolation between channels' }
    ],
    examples: ['Siemens MRI RF coils', 'GE Healthcare body coils', 'RF ablation catheters', 'Hyperthermia treatment systems'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Medtronic'],
    futureImpact: 'AI-driven patient-specific matching will pre-compute optimal tuning from body scans, reducing setup time and improving image quality.',
    color: '#10B981'
  }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ImpedanceMatchingRenderer: React.FC<ImpedanceMatchingRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - source and load impedance
  const [sourceR, setSourceR] = useState(50);    // Source resistance
  const [sourceX, setSourceX] = useState(0);     // Source reactance
  const [loadR, setLoadR] = useState(150);       // Load resistance
  const [loadX, setLoadX] = useState(75);        // Load reactance
  const [matchType, setMatchType] = useState<'none' | 'L' | 'pi' | 'T'>('none');
  const [matchC1, setMatchC1] = useState(50);    // pF - first matching component
  const [matchL, setMatchL] = useState(100);     // nH - inductor
  const [matchC2, setMatchC2] = useState(50);    // pF - second matching component (pi/T only)
  const [animationFrame, setAnimationFrame] = useState(0);
  const [frequency, setFrequency] = useState(100); // MHz for play phase
  const [twistFreq, setTwistFreq] = useState(100); // MHz for twist phase
  const [designFreq] = useState(100); // Design center frequency

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium dark theme colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#2a2a3a',
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
    play: 'Match Impedances',
    review: 'Understanding',
    twist_predict: 'Frequency Twist',
    twist_play: 'Explore Bandwidth',
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
    onGameEvent?.({
      eventType: 'phase_changed',
      gameType: 'impedance_matching',
      gameTitle: 'Impedance Matching',
      details: { phase: p },
      timestamp: Date.now()
    });
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ==========================================================================
  // RF CALCULATIONS
  // ==========================================================================

  // Calculate effective load impedance after matching network
  const getMatchedImpedance = useCallback((freq: number) => {
    if (matchType === 'none') return { r: loadR, x: loadX };

    const omega = 2 * Math.PI * freq * 1e6;
    const xC1 = matchC1 > 0 ? -1 / (omega * matchC1 * 1e-12) : -1e9;
    const xL = omega * matchL * 1e-9;
    const xC2 = matchC2 > 0 ? -1 / (omega * matchC2 * 1e-12) : -1e9;

    if (matchType === 'L') {
      // L-network: series L then shunt C to ground
      // Shunt C in parallel with load, then series L
      const parDen = 1 / (loadR * loadR + (loadX + xC1) * (loadX + xC1));
      const parR = loadR * parDen * (loadR * loadR + (loadX + xC1) * (loadX + xC1) - xC1 * (loadX + xC1));
      // Simplified: parallel combination of C1 with load, then series L
      const zParR = loadR / (1 + (loadR * omega * matchC1 * 1e-12) * (loadR * omega * matchC1 * 1e-12));
      const zParX = loadX - loadR * loadR * omega * matchC1 * 1e-12 / (1 + (loadR * omega * matchC1 * 1e-12) * (loadR * omega * matchC1 * 1e-12));
      return { r: Math.max(0.1, zParR), x: zParX + xL };
    }

    if (matchType === 'pi') {
      // Pi-network: shunt C1, series L, shunt C2
      // Shunt C2 in parallel with load
      const yLoadG = loadR / (loadR * loadR + loadX * loadX);
      const yLoadB = -loadX / (loadR * loadR + loadX * loadX);
      const yC2B = omega * matchC2 * 1e-12;
      const yTotalG = yLoadG;
      const yTotalB = yLoadB + yC2B;
      const zAfterC2R = yTotalG / (yTotalG * yTotalG + yTotalB * yTotalB);
      const zAfterC2X = -yTotalB / (yTotalG * yTotalG + yTotalB * yTotalB);
      // Add series L
      const zAfterLR = zAfterC2R;
      const zAfterLX = zAfterC2X + xL;
      // Shunt C1
      const yG2 = zAfterLR / (zAfterLR * zAfterLR + zAfterLX * zAfterLX);
      const yB2 = -zAfterLX / (zAfterLR * zAfterLR + zAfterLX * zAfterLX);
      const yC1B = omega * matchC1 * 1e-12;
      const yFinalG = yG2;
      const yFinalB = yB2 + yC1B;
      const zFinalR = yFinalG / (yFinalG * yFinalG + yFinalB * yFinalB);
      const zFinalX = -yFinalB / (yFinalG * yFinalG + yFinalB * yFinalB);
      return { r: Math.max(0.1, zFinalR), x: zFinalX };
    }

    if (matchType === 'T') {
      // T-network: series C1, shunt L, series C2
      // Series C2 with load
      const zAfterC2R = loadR;
      const zAfterC2X = loadX + xC2;
      // Shunt L (admittance)
      const yG = zAfterC2R / (zAfterC2R * zAfterC2R + zAfterC2X * zAfterC2X);
      const yB = -zAfterC2X / (zAfterC2R * zAfterC2R + zAfterC2X * zAfterC2X);
      const yLB = -1 / xL;
      const yTotG = yG;
      const yTotB = yB + yLB;
      const zShuntR = yTotG / (yTotG * yTotG + yTotB * yTotB);
      const zShuntX = -yTotB / (yTotG * yTotG + yTotB * yTotB);
      // Series C1
      return { r: Math.max(0.1, zShuntR), x: zShuntX + xC1 };
    }

    return { r: loadR, x: loadX };
  }, [matchType, loadR, loadX, matchC1, matchL, matchC2]);

  // Current RF metrics for play phase
  const matchedZ = getMatchedImpedance(frequency);
  const gamma = reflectionCoefficient(sourceR, sourceX, matchedZ.r, matchedZ.x);
  const currentVSWR = vswr(gamma);
  const currentRL = returnLoss(gamma);
  const currentReflPower = reflectedPower(gamma);
  const currentMismatchLoss = mismatchLoss(gamma);

  // Unmatched metrics (no network)
  const gammaUnmatched = reflectionCoefficient(sourceR, sourceX, loadR, loadX);
  const unmatchedVSWR = vswr(gammaUnmatched);

  // Hook phase demo metrics (50 to 200 ohm mismatch)
  const hookGamma = reflectionCoefficient(50, 0, 200, 0);
  const hookVSWR = vswr(hookGamma);
  const hookReflPower = reflectedPower(hookGamma);
  const hookMismatchLoss = mismatchLoss(hookGamma);

  // ==========================================================================
  // STANDING WAVE VISUALIZATION
  // ==========================================================================
  const renderTransmissionLine = (
    gammaVal: number,
    vswrVal: number,
    svgWidth: number,
    svgHeight: number,
    animated: boolean,
    showLabels: boolean
  ) => {
    const pad = 40;
    const lineY = svgHeight / 2;
    const lineStartX = pad + 60;
    const lineEndX = svgWidth - pad - 60;
    const lineLen = lineEndX - lineStartX;
    const t = animated ? animationFrame * 0.08 : 0;

    // Generate standing wave envelope points
    const topPoints: string[] = [];
    const botPoints: string[] = [];
    const wavePoints: string[] = [];
    const numPts = 120;
    for (let i = 0; i <= numPts; i++) {
      const frac = i / numPts;
      const x = lineStartX + frac * lineLen;
      const pos = frac * 4 * Math.PI; // 4 half-wavelengths along the line
      // Standing wave: envelope varies between (1+gamma) and (1-gamma)
      const envelope = Math.sqrt(1 + gammaVal * gammaVal + 2 * gammaVal * Math.cos(2 * pos));
      const maxAmplitude = (svgHeight / 2 - pad - 20);
      const ampScale = 0.6;
      const envAmp = envelope * maxAmplitude * ampScale / (1 + gammaVal);
      topPoints.push(`${x.toFixed(1)},${(lineY - envAmp).toFixed(1)}`);
      botPoints.push(`${x.toFixed(1)},${(lineY + envAmp).toFixed(1)}`);
      // Traveling wave for animation
      const wave = envelope * Math.sin(pos - t) * maxAmplitude * ampScale / (1 + gammaVal);
      wavePoints.push(`${x.toFixed(1)},${(lineY - wave).toFixed(1)}`);
    }
    const topPath = 'M ' + topPoints.join(' L ');
    const botPath = 'M ' + botPoints.join(' L ');
    const wavePath = 'M ' + wavePoints.join(' L ');

    // Color based on match quality
    const matchColor = vswrVal < 1.5 ? colors.success : vswrVal < 3 ? colors.accent : colors.error;

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ background: colors.bgCard, borderRadius: '12px' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Transmission line standing wave visualization"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.warning} stopOpacity="0.8" />
            <stop offset="100%" stopColor={matchColor} stopOpacity="0.8" />
          </linearGradient>
          <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.15">
          {Array.from({ length: 9 }, (_, i) => {
            const gx = lineStartX + (i + 1) * lineLen / 10;
            return <line key={`gv${i}`} x1={gx} y1={pad} x2={gx} y2={svgHeight - pad} stroke={colors.border} strokeDasharray="2,4" />;
          })}
          {[-2, -1, 0, 1, 2].map(m => {
            const gy = lineY + m * (svgHeight - 2 * pad) / 5;
            return <line key={`gh${m}`} x1={lineStartX} y1={gy} x2={lineEndX} y2={gy} stroke={colors.border} strokeDasharray="2,4" />;
          })}
        </g>

        {/* Source block */}
        <rect x={pad - 10} y={lineY - 30} width={70} height={60} rx={8} fill={colors.warning + '30'} stroke={colors.warning} strokeWidth="1.5" />
        <text x={pad + 25} y={lineY - 8} fill={colors.warning} fontSize="11" fontWeight="600" textAnchor="middle">Source</text>
        <text x={pad + 25} y={lineY + 10} fill={colors.textSecondary} fontSize="9" textAnchor="middle">Zs</text>

        {/* Load block */}
        <rect x={svgWidth - pad - 60} y={lineY - 30} width={70} height={60} rx={8} fill={matchColor + '30'} stroke={matchColor} strokeWidth="1.5" />
        <text x={svgWidth - pad - 25} y={lineY - 8} fill={matchColor} fontSize="11" fontWeight="600" textAnchor="middle">Load</text>
        <text x={svgWidth - pad - 25} y={lineY + 10} fill={colors.textSecondary} fontSize="9" textAnchor="middle">Zl</text>

        {/* Transmission line (center conductor) */}
        <line x1={lineStartX} y1={lineY} x2={lineEndX} y2={lineY} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4,4" />

        {/* Standing wave envelope */}
        <path d={topPath} fill="none" stroke={matchColor} strokeWidth="1.5" opacity="0.4" strokeDasharray="4,2" />
        <path d={botPath} fill="none" stroke={matchColor} strokeWidth="1.5" opacity="0.4" strokeDasharray="4,2" />

        {/* Animated wave */}
        {animated && (
          <path d={wavePath} fill="none" stroke={matchColor} strokeWidth="2" filter="url(#waveGlow)" />
        )}

        {/* Labels */}
        {showLabels && (
          <g>
            <text x={svgWidth / 2} y={pad - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
              Voltage Standing Wave Pattern
            </text>
            <text x={svgWidth / 2} y={svgHeight - pad + 18} fill={matchColor} fontSize="12" fontWeight="600" textAnchor="middle">
              VSWR = {vswrVal < 100 ? vswrVal.toFixed(2) : '>100'}:1
            </text>
          </g>
        )}

        {/* VSWR indicator bar at bottom */}
        {showLabels && (
          <g>
            <rect x={lineStartX} y={svgHeight - 18} width={lineLen} height={6} rx={3} fill={colors.border} />
            <rect x={lineStartX} y={svgHeight - 18} width={Math.min(lineLen, lineLen * Math.min(vswrVal / 10, 1))} height={6} rx={3} fill={matchColor} />
          </g>
        )}
      </svg>
    );
  };

  // ==========================================================================
  // NAVIGATION BAR
  // ==========================================================================
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1000,
        padding: '8px 16px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {canGoBack && (
              <button
                onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Back"
              >
                Back
              </button>
            )}
            <span style={{ ...typo.small, color: '#e2e8f0' }}>
              {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{
                  width: '12px',
                  height: '12px',
                  minWidth: '12px',
                  minHeight: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                  cursor: 'pointer',
                }}
                aria-label={phaseLabels[p]}
              />
            ))}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: colors.bgPrimary,
        }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  };

  const renderNavDots = () => (
    <div style={{ height: '80px' }} />
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '52px',
  };

  // ==========================================================================
  // HOOK PHASE
  // ==========================================================================
  if (phase === 'hook') {
    const svgW = isMobile ? 340 : 500;
    const svgH = isMobile ? 180 : 220;
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          &#128225;&#9889;
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Why does your antenna only radiate half the power?
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '24px' }}>
          Your transmitter outputs 100 watts, but only 64 watts reach the antenna.
          <span style={{ color: colors.error }}> 36 watts bounce back</span> as reflections.
          The culprit: <span style={{ color: colors.accent }}>impedance mismatch</span>.
        </p>

        {/* Mismatch demonstration SVG */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          maxWidth: svgW + 32 + 'px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderTransmissionLine(hookGamma, hookVSWR, svgW, svgH, true, true)}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '12px',
          }}>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.error }}>{hookReflPower.toFixed(0)}%</div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>Power Reflected</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.accent }}>{hookVSWR.toFixed(1)}:1</div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>VSWR</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.warning }}>{hookMismatchLoss.toFixed(1)} dB</div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>Mismatch Loss</div>
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "When a 50-ohm transmitter meets a 200-ohm antenna, the impedance mismatch creates standing waves. The solution is an impedance matching network -- the unsung hero of every RF system."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            -- RF Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Begin Learning
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // PREDICT PHASE
  // ==========================================================================
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'VSWR would be 1:1 (perfect match) since both sides have impedance' },
      { id: 'b', text: 'VSWR would be 3:1 because the ratio of impedances is 150/50 = 3' },
      { id: 'c', text: 'VSWR depends on the reflection coefficient which is (Zl-Zs)/(Zl+Zs)' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              Prediction 1 of 2 -- Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px' }}>
            A 50-ohm source drives a 150-ohm load through a transmission line. What VSWR do you expect?
          </h2>

          {/* Static SVG showing the mismatch */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', marginBottom: '12px' }}>
              Source: 50 ohm | Load: 150 ohm -- Observe the standing wave
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderTransmissionLine(
                reflectionCoefficient(50, 0, 150, 0),
                vswr(reflectionCoefficient(50, 0, 150, 0)),
                isMobile ? 320 : 460,
                isMobile ? 160 : 200,
                true,
                true
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  onGameEvent?.({
                    eventType: 'prediction_made',
                    gameType: 'impedance_matching',
                    gameTitle: 'Impedance Matching',
                    details: { prediction: opt.id, phase: 'predict' },
                    timestamp: Date.now()
                  });
                }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue to Experiment
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // PLAY PHASE -- Interactive Impedance Matching
  // ==========================================================================
  if (phase === 'play') {
    const svgW = isMobile ? 340 : 440;
    const svgH = isMobile ? 180 : 220;
    const matched = currentVSWR < 1.5;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>

          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
              Match the Impedances
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust the matching network to reduce VSWR below 1.5:1
            </p>

            {/* Target indicator */}
            <div style={{
              background: matched ? `${colors.success}22` : `${colors.accent}22`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: `1px solid ${matched ? colors.success : colors.accent}44`,
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
                {matched
                  ? 'Excellent! VSWR < 1.5 achieved -- impedance matched!'
                  : `Target: VSWR < 1.5:1 | Current: ${currentVSWR < 100 ? currentVSWR.toFixed(2) : '>100'}:1`
                }
              </p>
            </div>

            {/* Side-by-side: SVG left, controls right */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '16px',
            }}>
              {/* Left: SVG */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderTransmissionLine(gamma, currentVSWR, svgW, svgH, true, true)}
                  </div>
                  {/* Metrics row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    marginTop: '12px',
                  }}>
                    {[
                      { label: 'VSWR', value: currentVSWR < 100 ? currentVSWR.toFixed(2) + ':1' : '>100:1', color: matched ? colors.success : colors.error },
                      { label: 'Return Loss', value: currentRL.toFixed(1) + ' dB', color: currentRL > 14 ? colors.success : colors.accent },
                      { label: 'Reflected', value: currentReflPower.toFixed(1) + '%', color: currentReflPower < 5 ? colors.success : colors.error },
                      { label: 'Mismatch Loss', value: currentMismatchLoss.toFixed(2) + ' dB', color: currentMismatchLoss < 0.5 ? colors.success : colors.accent },
                    ].map((m, i) => (
                      <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: '9px', color: colors.textMuted }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Controls */}
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Source/Load impedance display */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>Source: {sourceR} + j{sourceX} ohm</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>Load: {loadR} + j{loadX} ohm</span>
                    </div>
                  </div>

                  {/* Load R slider */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Load R</span>
                      <span style={{ fontSize: '12px', color: colors.accent, fontWeight: 600 }}>{loadR} ohm</span>
                    </div>
                    <input type="range" min="10" max="500" step="5" value={loadR}
                      onChange={(e) => setLoadR(parseInt(e.target.value))}
                      aria-label="Load Resistance"
                      style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                    />
                  </div>

                  {/* Load X slider */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Load X</span>
                      <span style={{ fontSize: '12px', color: colors.accent, fontWeight: 600 }}>{loadX > 0 ? '+' : ''}{loadX} ohm</span>
                    </div>
                    <input type="range" min="-200" max="200" step="5" value={loadX}
                      onChange={(e) => setLoadX(parseInt(e.target.value))}
                      aria-label="Load Reactance"
                      style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                    />
                  </div>

                  {/* Matching network selector */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>Matching Network</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['none', 'L', 'pi', 'T'] as const).map(mt => (
                        <button
                          key={mt}
                          onClick={() => { playSound('click'); setMatchType(mt); }}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: `2px solid ${matchType === mt ? colors.accent : colors.border}`,
                            background: matchType === mt ? `${colors.accent}22` : 'transparent',
                            color: matchType === mt ? colors.accent : '#e2e8f0',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px',
                            minHeight: '36px',
                          }}
                        >
                          {mt === 'none' ? 'None' : mt === 'L' ? 'L-net' : mt === 'pi' ? 'Pi' : 'T-net'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Matching component sliders */}
                  {matchType !== 'none' && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#e2e8f0' }}>C1</span>
                          <span style={{ fontSize: '12px', color: colors.success, fontWeight: 600 }}>{matchC1} pF</span>
                        </div>
                        <input type="range" min="1" max="200" step="1" value={matchC1}
                          onChange={(e) => setMatchC1(parseInt(e.target.value))}
                          aria-label="Capacitor C1"
                          style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                        />
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#e2e8f0' }}>L</span>
                          <span style={{ fontSize: '12px', color: colors.success, fontWeight: 600 }}>{matchL} nH</span>
                        </div>
                        <input type="range" min="1" max="500" step="1" value={matchL}
                          onChange={(e) => setMatchL(parseInt(e.target.value))}
                          aria-label="Inductor L"
                          style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                        />
                      </div>

                      {(matchType === 'pi' || matchType === 'T') && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#e2e8f0' }}>C2</span>
                            <span style={{ fontSize: '12px', color: colors.success, fontWeight: 600 }}>{matchC2} pF</span>
                          </div>
                          <input type="range" min="1" max="200" step="1" value={matchC2}
                            onChange={(e) => setMatchC2(parseInt(e.target.value))}
                            aria-label="Capacitor C2"
                            style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Effective impedance display */}
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    marginTop: '8px',
                  }}>
                    <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Effective Load (after matching)</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: matched ? colors.success : '#e2e8f0' }}>
                      {matchedZ.r.toFixed(1)} {matchedZ.x >= 0 ? '+' : ''} j{matchedZ.x.toFixed(1)} ohm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Educational content */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: `1px solid ${colors.border}`,
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '10px', fontWeight: 600 }}>
                Key Physics
              </h4>
              <ul style={{ ...typo.small, color: '#e2e8f0', margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: colors.accent }}>Reflection Coefficient (Gamma)</strong> = (Zl - Zs) / (Zl + Zs). Ranges from 0 (perfect match) to 1 (total reflection).</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: colors.accent }}>VSWR</strong> = (1 + |Gamma|) / (1 - |Gamma|). A ratio of max/min voltage on the transmission line.</li>
                <li><strong style={{ color: colors.accent }}>Return Loss</strong> = -20 * log10(|Gamma|). Higher is better: 20 dB means only 1% reflected.</li>
              </ul>
            </div>

            {matched && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
                  Matched! The standing wave is nearly flat. Over 96% of power reaches the load.
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Continue to Review
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // REVIEW PHASE
  // ==========================================================================
  if (phase === 'review') {
    const correctPrediction = prediction === 'c';
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Impedance Matching
          </h2>

          <div style={{
            background: correctPrediction ? `${colors.success}22` : `${colors.accent}22`,
            border: `1px solid ${correctPrediction ? colors.success : colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              {correctPrediction ? (
                <>Correct! VSWR is determined by the reflection coefficient Gamma = (Zl - Zs) / (Zl + Zs). For 150/50 ohms, Gamma = 100/200 = 0.5, giving VSWR = 3:1.</>
              ) : (
                <>The key insight: VSWR comes from the reflection coefficient Gamma = (Zl - Zs) / (Zl + Zs). For pure resistances where Zl {'>'} Zs, VSWR simplifies to Zl/Zs, so 150/50 = 3:1. But in general, you must use the full complex formula.</>
              )}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: '#e2e8f0' }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#e2e8f0' }}>Impedance Matching = Maximum Power Transfer</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When <span style={{ color: colors.accent }}>Zload = Zsource*</span> (complex conjugate), all forward-traveling power is absorbed by the load. Zero power reflects back.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.accent }}>Reflection coefficient Gamma</span> = (Zl - Zs) / (Zl + Zs). When Zl = Zs, Gamma = 0 and VSWR = 1:1.
              </p>
              <p style={{ marginBottom: '16px' }}>
                The <span style={{ color: colors.success }}>standing wave</span> is the interference pattern between forward and reflected waves. Its envelope varies between Vmax = Vf(1 + |Gamma|) and Vmin = Vf(1 - |Gamma|).
              </p>
              <p>
                Key equation: <span style={{ color: colors.success, fontWeight: 600 }}>VSWR = Vmax/Vmin = (1 + |Gamma|)/(1 - |Gamma|)</span>
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Insight</h3>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              Return loss and VSWR are different ways to express the same thing. Return loss of <span style={{ color: colors.success }}>20 dB</span> means only 1% power reflected (VSWR = 1.22). Return loss of <span style={{ color: colors.error }}>6 dB</span> means 25% reflected (VSWR = 3.0). Higher return loss is better.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Next Concept
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // TWIST PREDICT PHASE
  // ==========================================================================
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The match stays perfect at all frequencies -- once matched, always matched' },
      { id: 'b', text: 'The match degrades because inductor and capacitor reactances change with frequency' },
      { id: 'c', text: 'The match improves at higher frequencies because signals travel faster' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              Prediction 2 of 2 -- New Variable: Frequency
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px' }}>
            You achieved a perfect match at 100 MHz. What happens when you change the operating frequency?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', marginBottom: '12px' }}>
              Remember: XL = 2*pi*f*L and XC = 1/(2*pi*f*C)
            </p>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              Both reactances are frequency-dependent
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setTwistPrediction(opt.id);
                  onGameEvent?.({
                    eventType: 'prediction_made',
                    gameType: 'impedance_matching',
                    gameTitle: 'Impedance Matching',
                    details: { prediction: opt.id, phase: 'twist_predict' },
                    timestamp: Date.now()
                  });
                }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue to Experiment
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // TWIST PLAY PHASE -- Frequency Dependence & Q/Bandwidth
  // ==========================================================================
  if (phase === 'twist_play') {
    // Compute VSWR across frequency sweep to show bandwidth
    const freqSweep = useMemo(() => {
      const points: { freq: number; vswrVal: number }[] = [];
      for (let f = 20; f <= 300; f += 2) {
        const mZ = (() => {
          if (matchType === 'none') return { r: loadR, x: loadX };
          const omega = 2 * Math.PI * f * 1e6;
          const xC1 = matchC1 > 0 ? -1 / (omega * matchC1 * 1e-12) : -1e9;
          const xLv = omega * matchL * 1e-9;
          const xC2v = matchC2 > 0 ? -1 / (omega * matchC2 * 1e-12) : -1e9;

          if (matchType === 'L') {
            const zParR = loadR / (1 + (loadR * omega * matchC1 * 1e-12) * (loadR * omega * matchC1 * 1e-12));
            const zParX = loadX - loadR * loadR * omega * matchC1 * 1e-12 / (1 + (loadR * omega * matchC1 * 1e-12) * (loadR * omega * matchC1 * 1e-12));
            return { r: Math.max(0.1, zParR), x: zParX + xLv };
          }
          if (matchType === 'pi') {
            const yLoadG = loadR / (loadR * loadR + loadX * loadX);
            const yLoadB = -loadX / (loadR * loadR + loadX * loadX);
            const yC2B = omega * matchC2 * 1e-12;
            const yTotalG = yLoadG;
            const yTotalB = yLoadB + yC2B;
            const zAfterC2R = yTotalG / (yTotalG * yTotalG + yTotalB * yTotalB);
            const zAfterC2X = -yTotalB / (yTotalG * yTotalG + yTotalB * yTotalB);
            const zAfterLR = zAfterC2R;
            const zAfterLX = zAfterC2X + xLv;
            const yG2 = zAfterLR / (zAfterLR * zAfterLR + zAfterLX * zAfterLX);
            const yB2 = -zAfterLX / (zAfterLR * zAfterLR + zAfterLX * zAfterLX);
            const yC1B = omega * matchC1 * 1e-12;
            const yFinalG = yG2;
            const yFinalB = yB2 + yC1B;
            const zFinalR = yFinalG / (yFinalG * yFinalG + yFinalB * yFinalB);
            const zFinalX = -yFinalB / (yFinalG * yFinalG + yFinalB * yFinalB);
            return { r: Math.max(0.1, zFinalR), x: zFinalX };
          }
          if (matchType === 'T') {
            const zAfterC2R = loadR;
            const zAfterC2X = loadX + xC2v;
            const yG = zAfterC2R / (zAfterC2R * zAfterC2R + zAfterC2X * zAfterC2X);
            const yB = -zAfterC2X / (zAfterC2R * zAfterC2R + zAfterC2X * zAfterC2X);
            const yLB = -1 / xLv;
            const yTotG = yG;
            const yTotB = yB + yLB;
            const zShuntR = yTotG / (yTotG * yTotG + yTotB * yTotB);
            const zShuntX = -yTotB / (yTotG * yTotG + yTotB * yTotB);
            return { r: Math.max(0.1, zShuntR), x: zShuntX + xC1 };
          }
          return { r: loadR, x: loadX };
        })();
        const g = reflectionCoefficient(sourceR, sourceX, mZ.r, mZ.x);
        points.push({ freq: f, vswrVal: Math.min(vswr(g), 20) });
      }
      return points;
    }, [matchType, loadR, loadX, sourceR, sourceX, matchC1, matchL, matchC2]);

    // Render frequency response plot
    const plotW = isMobile ? 340 : 500;
    const plotH = isMobile ? 200 : 240;
    const plotPad = 50;
    const plotAreaW = plotW - 2 * plotPad;
    const plotAreaH = plotH - 2 * plotPad;

    const freqToX = (f: number) => plotPad + ((f - 20) / 280) * plotAreaW;
    const vswrToY = (v: number) => plotPad + (1 - Math.min(v / 20, 1)) * plotAreaH;

    const sweepPath = freqSweep.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${freqToX(p.freq).toFixed(1)} ${vswrToY(p.vswrVal).toFixed(1)}`
    ).join(' ');

    // VSWR at twist frequency
    const twistMatchedZ = getMatchedImpedance(twistFreq);
    const twistGamma = reflectionCoefficient(sourceR, sourceX, twistMatchedZ.r, twistMatchedZ.x);
    const twistVSWR = vswr(twistGamma);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
            Frequency Dependence of Matching
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            See how the match degrades away from the design frequency
          </p>

          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              Sweep the frequency slider and watch VSWR change. Higher Q matching networks have narrower usable bandwidth.
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '16px',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '16px',
          }}>
            {/* Frequency response plot */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                <svg width={plotW} height={plotH} viewBox={`0 0 ${plotW} ${plotH}`}
                  style={{ background: colors.bgSecondary, borderRadius: '8px' }}>
                  {/* Grid */}
                  <g opacity="0.2">
                    {[1, 2, 5, 10, 15, 20].map(v => (
                      <g key={v}>
                        <line x1={plotPad} y1={vswrToY(v)} x2={plotW - plotPad} y2={vswrToY(v)} stroke={colors.border} strokeDasharray="2,4" />
                        <text x={plotPad - 6} y={vswrToY(v) + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">{v}</text>
                      </g>
                    ))}
                    {[50, 100, 150, 200, 250].map(f => (
                      <g key={f}>
                        <line x1={freqToX(f)} y1={plotPad} x2={freqToX(f)} y2={plotH - plotPad} stroke={colors.border} strokeDasharray="2,4" />
                        <text x={freqToX(f)} y={plotH - plotPad + 14} fill={colors.textMuted} fontSize="9" textAnchor="middle">{f}</text>
                      </g>
                    ))}
                  </g>

                  {/* VSWR = 1.5 threshold */}
                  <line x1={plotPad} y1={vswrToY(1.5)} x2={plotW - plotPad} y2={vswrToY(1.5)}
                    stroke={colors.success} strokeWidth="1" strokeDasharray="6,3" opacity="0.6" />
                  <text x={plotW - plotPad + 4} y={vswrToY(1.5) + 3} fill={colors.success} fontSize="8">1.5</text>

                  {/* VSWR curve */}
                  <path d={sweepPath} fill="none" stroke={colors.accent} strokeWidth="2" />

                  {/* Current frequency marker */}
                  <circle cx={freqToX(twistFreq)} cy={vswrToY(Math.min(twistVSWR, 20))} r={5} fill={colors.accent} stroke="white" strokeWidth="1.5" />
                  <line x1={freqToX(twistFreq)} y1={plotPad} x2={freqToX(twistFreq)} y2={plotH - plotPad}
                    stroke={colors.accent} strokeWidth="1" opacity="0.5" />

                  {/* Axis labels */}
                  <text x={plotW / 2} y={plotH - 4} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Frequency (MHz)</text>
                  <g transform={`translate(12, ${plotH / 2}) rotate(-90)`}>
                    <text fill={colors.textSecondary} fontSize="10" textAnchor="middle">VSWR</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Controls */}
            <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Frequency</span>
                    <span style={{ fontSize: '12px', color: colors.accent, fontWeight: 600 }}>{twistFreq} MHz</span>
                  </div>
                  <input type="range" min="20" max="300" step="2" value={twistFreq}
                    onChange={(e) => setTwistFreq(parseInt(e.target.value))}
                    aria-label="Operating Frequency"
                    style={{ width: '100%', height: '20px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>20 MHz</span>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>300 MHz</span>
                  </div>
                </div>

                {/* Current VSWR at freq */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: twistVSWR < 1.5 ? colors.success : twistVSWR < 3 ? colors.accent : colors.error }}>
                    {twistVSWR < 100 ? twistVSWR.toFixed(2) : '>100'}:1
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>VSWR at {twistFreq} MHz</div>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: colors.warning }}>
                    {returnLoss(twistGamma).toFixed(1)} dB
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>Return Loss</div>
                </div>

                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: `${colors.accent}11`,
                  border: `1px solid ${colors.accent}22`,
                }}>
                  <p style={{ fontSize: '11px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                    The matching network was designed for ~{designFreq} MHz. As frequency moves away, reactances change (XL increases, XC decreases), breaking the conjugate match.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Review
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // TWIST REVIEW PHASE
  // ==========================================================================
  if (phase === 'twist_review') {
    const correctTwist = twistPrediction === 'b';
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px', textAlign: 'center' }}>
            Bandwidth and Q Factor
          </h2>

          <div style={{
            background: correctTwist ? `${colors.success}22` : `${colors.accent}22`,
            border: `1px solid ${correctTwist ? colors.success : colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              {correctTwist ? (
                <>Exactly right! Matching networks use reactive components (L and C) whose impedances are frequency-dependent. XL = 2*pi*f*L increases with frequency while XC = 1/(2*pi*f*C) decreases. The conjugate match condition is satisfied at only one frequency.</>
              ) : (
                <>The key insight: inductors and capacitors have frequency-dependent reactances. The matching network provides the exact conjugate impedance at one frequency only. Away from that frequency, the match degrades -- this is why bandwidth specifications exist for every RF system.</>
              )}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: '#e2e8f0' }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#e2e8f0' }}>Q Factor = Center Frequency / Bandwidth</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The <span style={{ color: colors.accent }}>quality factor Q</span> determines how sharply tuned the matching network is. Higher Q means better match at center frequency but narrower usable bandwidth.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.success }}>L-networks</span> have fixed Q determined by the impedance ratio. <span style={{ color: colors.warning }}>Pi and T networks</span> allow independent Q selection because they have an extra degree of freedom.
              </p>
              <p>
                The fundamental tradeoff: <span style={{ color: colors.accent, fontWeight: 600 }}>narrowband perfect match vs. wideband acceptable match</span>. Multi-section networks achieve wider bandwidth by cascading gentle transformations.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>Deep Insight</h3>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              This is why the <span style={{ color: colors.accent }}>Smith chart</span> is invaluable: it visually shows how impedance moves with frequency. A matched point at the center drifts along constant-R or constant-G circles as frequency changes. The trajectory reveals the bandwidth and suggests the optimal matching topology.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Real World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // ==========================================================================
  // TRANSFER PHASE
  // ==========================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Impedance Matching"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={{
          primary: colors.accent,
          primaryDark: '#d97706',
          accent: colors.warning,
          secondary: colors.success,
          success: colors.success,
          danger: colors.error,
          bgDark: colors.bgPrimary,
          bgCard: colors.bgCard,
          bgCardLight: colors.bgSecondary,
          textPrimary: colors.textPrimary,
          textSecondary: colors.textSecondary,
          textMuted: colors.textMuted,
          border: colors.border,
        }}
        playSound={playSound}
      />
    );
  }

  // ==========================================================================
  // TEST PHASE
  // ==========================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '80px 24px 100px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.accent }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: '#e2e8f0', margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: testScore >= 9 ? colors.success : testScore >= 7 ? colors.success : colors.accent, marginBottom: '16px' }}>
              Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'B' : testScore >= 7 ? 'C' : testScore >= 6 ? 'D' : 'F'}
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You\'ve mastered Impedance Matching!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Rich Answer Key */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px', textAlign: 'left', width: '100%' }}>Answer Key</h3>
            <div style={{ maxWidth: '600px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '20px' }}>
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
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
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
                    <p style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5, margin: 0, padding: '6px 10px', borderRadius: '6px', background: `${colors.warning}10` }}>
                      {tq.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Continue to Mastery
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
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.h3, color: '#e2e8f0' }}>
              Q{currentQuestion + 1}: Question {currentQuestion + 1} of 10
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
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: '#e2e8f0', marginBottom: '20px' }}>{question.question}</h3>

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
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.small }}>{opt.label}</span>
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
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  minHeight: '52px',
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
                  minHeight: '52px',
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
                  onGameEvent?.({
                    eventType: 'answer_submitted',
                    gameType: 'impedance_matching',
                    gameTitle: 'Impedance Matching',
                    details: { phase: 'test', score, maxScore: 10 },
                    timestamp: Date.now()
                  });
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
                  minHeight: '52px',
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

  // ==========================================================================
  // MASTERY PHASE
  // ==========================================================================
  if (phase === 'mastery') {
    const pct = Math.round((testScore / 10) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '80px 24px 100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          &#128225;
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
          Impedance Matching Master!
        </h1>

        <div style={{ fontSize: '40px', fontWeight: 800, color: pct >= 70 ? colors.success : colors.accent, marginBottom: '4px' }}>
          {testScore} / 10 ({grade})
        </div>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '24px' }}>
          {pct >= 90 ? 'Outstanding -- you truly understand RF impedance matching!'
            : pct >= 70 ? 'Great work -- you\'ve mastered the fundamentals of impedance matching!'
            : 'Good effort -- review the answer key to strengthen your understanding.'}
        </p>

        {/* Answer Key in Mastery */}
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px', textAlign: 'left', width: '100%', maxWidth: '600px' }}>Answer Key</h3>
        <div style={{ maxWidth: '600px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '20px' }}>
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
                borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
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
                <p style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5, margin: 0, padding: '6px 10px', borderRadius: '6px', background: `${colors.warning}10` }}>
                  {tq.explanation}
                </p>
              </div>
            );
          })}
        </div>

        {/* You Learned summary */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          maxWidth: '500px',
          width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: '#e2e8f0', marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Reflection coefficient Gamma = (Zl-Zs)/(Zl+Zs)',
              'VSWR = (1+|Gamma|)/(1-|Gamma|) measures standing wave severity',
              'Return loss quantifies match quality in dB',
              'L, pi, and T matching networks trade complexity for bandwidth control',
              'Matching is frequency-dependent due to reactive components',
              'Q factor determines bandwidth vs. match quality tradeoff',
              'Applications: ham radio, 5G, satellites, medical RF',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>+</span>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#e2e8f0',
              cursor: 'pointer',
              minHeight: '52px',
            }}
          >
            Play Again
          </button>
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
                eventType: 'game_completed',
                gameType: 'impedance_matching',
                gameTitle: 'Impedance Matching',
                details: { phase: 'mastery', score: testScore, maxScore: 10 },
                timestamp: Date.now()
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
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Complete Game \u2192
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ImpedanceMatchingRenderer;
