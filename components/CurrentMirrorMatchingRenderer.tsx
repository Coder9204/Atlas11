'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ============================================================================
// GAME 254: CURRENT MIRROR MATCHING
// Learn how current mirrors replicate reference currents in analog IC design.
// Explores transistor matching, W/L ratios, channel length modulation,
// cascode topologies, and temperature effects on mirror accuracy.
// ============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'mastery_achieved';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface CurrentMirrorMatchingRendererProps {
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
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions: {
  id: number;
  scenario: string;
  question: string;
  options: { id: string; text: string; correct?: boolean }[];
  explanation: string;
}[] = [
  {
    id: 1,
    scenario: 'An analog designer builds a simple two-transistor NMOS current mirror. The reference transistor has W/L = 10/1 and carries 100 uA. The output transistor also has W/L = 10/1.',
    question: 'What output current do you expect in the ideal case?',
    options: [
      { id: 'a', text: '50 uA - half the reference current' },
      { id: 'b', text: '100 uA - the same as the reference current', correct: true },
      { id: 'c', text: '200 uA - twice the reference current' },
      { id: 'd', text: '0 uA - no current flows without a separate gate bias' },
    ],
    explanation: 'In an ideal current mirror with matched W/L ratios, Iout = Iref * (W/L)out / (W/L)ref. With equal ratios, Iout = Iref = 100 uA. The diode-connected reference transistor sets the gate voltage for both devices.',
  },
  {
    id: 2,
    scenario: 'A designer needs a 1:4 current mirror. The reference transistor has W/L = 5/2 and Iref = 50 uA.',
    question: 'What W/L ratio should the output transistor have?',
    options: [
      { id: 'a', text: 'W/L = 5/2 (same as reference)' },
      { id: 'b', text: 'W/L = 10/1 (four times larger)' },
      { id: 'c', text: 'W/L = 20/2 (four times larger)', correct: true },
      { id: 'd', text: 'W/L = 5/8 (one quarter)' },
    ],
    explanation: 'For a 1:4 ratio, the output W/L must be 4x the reference W/L. Reference W/L = 5/2 = 2.5. Output needs W/L = 10, e.g., 20/2. This yields Iout = 50 * (20/2)/(5/2) = 50 * 4 = 200 uA.',
  },
  {
    id: 3,
    scenario: 'A current mirror has Iref = 100 uA. VDS on the reference side is 0.6V (it is diode-connected). VDS on the output side is 2.0V. Lambda (channel length modulation) = 0.05 /V.',
    question: 'What is the approximate output current accounting for channel length modulation?',
    options: [
      { id: 'a', text: '100 uA exactly - channel length modulation has no effect' },
      { id: 'b', text: '107 uA - about 7% higher than ideal', correct: true },
      { id: 'c', text: '93 uA - about 7% lower than ideal' },
      { id: 'd', text: '150 uA - 50% higher due to Early effect' },
    ],
    explanation: 'With channel length modulation: Iout/Iref = (1 + lambda*VDSout)/(1 + lambda*VDSref) = (1 + 0.05*2.0)/(1 + 0.05*0.6) = 1.10/1.03 = 1.068. So Iout is approximately 106.8 uA, about 7% higher.',
  },
  {
    id: 4,
    scenario: 'Two current mirror designs are compared: Design A uses L = 0.5 um, Design B uses L = 2 um. Both have the same W/L ratio and therefore the same ideal current.',
    question: 'Which design will have better current matching accuracy and why?',
    options: [
      { id: 'a', text: 'Design A - shorter channels are faster and more accurate' },
      { id: 'b', text: 'Design B - longer channels reduce channel length modulation effects', correct: true },
      { id: 'c', text: 'Both are equal since W/L ratio is the same' },
      { id: 'd', text: 'Design A - shorter channels have less threshold voltage mismatch' },
    ],
    explanation: 'Longer channel lengths reduce lambda (channel length modulation parameter), making the output current less sensitive to VDS differences. Lambda is roughly proportional to 1/L. Longer channels also improve matching by averaging out random process variations.',
  },
  {
    id: 5,
    scenario: 'A designer adds cascode transistors to a current mirror. The basic mirror had 5% current error due to VDS mismatch.',
    question: 'What is the primary benefit of the cascode configuration?',
    options: [
      { id: 'a', text: 'It doubles the output current' },
      { id: 'b', text: 'It dramatically increases the output impedance, reducing VDS sensitivity', correct: true },
      { id: 'c', text: 'It eliminates the need for a reference current' },
      { id: 'd', text: 'It reduces the minimum supply voltage required' },
    ],
    explanation: 'A cascode current mirror increases the output impedance by a factor of approximately gm*ro. This shields the mirror transistor from VDS variations, reducing the current error from channel length modulation to well below 1%. The tradeoff is increased minimum output voltage.',
  },
  {
    id: 6,
    scenario: 'A PMOS current mirror biases an amplifier stage. The temperature increases from 25 C to 85 C. The threshold voltage decreases by 1.5 mV/C and mobility decreases by about 0.3%/C.',
    question: 'What happens to the mirrored current as temperature rises?',
    options: [
      { id: 'a', text: 'Current increases dramatically because threshold voltage drops' },
      { id: 'b', text: 'Current stays nearly constant because the mirror ratio depends on geometry ratios, not absolute values', correct: true },
      { id: 'c', text: 'Current drops to zero at high temperatures' },
      { id: 'd', text: 'Current oscillates due to thermal noise' },
    ],
    explanation: 'Current mirrors are ratiometric - the mirror ratio depends on (W/L)out/(W/L)ref. Both transistors experience the same temperature changes, so Vth and mobility shifts largely cancel in the ratio. The absolute current changes, but the ratio stays stable.',
  },
  {
    id: 7,
    scenario: 'An IC layout engineer places the two mirror transistors 500 um apart on the die. Testing reveals a 3% systematic current mismatch.',
    question: 'What is the most likely cause and how should the layout be improved?',
    options: [
      { id: 'a', text: 'The transistors are too close; move them further apart' },
      { id: 'b', text: 'Process gradients across the die cause mismatch; use interdigitated or common-centroid layout', correct: true },
      { id: 'c', text: 'The metal connections are too thick' },
      { id: 'd', text: 'The substrate bias is incorrect' },
    ],
    explanation: 'Process parameters (oxide thickness, doping) vary across a die with spatial gradients. Placing transistors far apart exposes them to different local conditions. Interdigitated (ABBA) or common-centroid layouts minimize gradient-induced mismatch by ensuring both transistors see the same average process conditions.',
  },
  {
    id: 8,
    scenario: 'A Wilson current mirror is used instead of a simple mirror. It adds a third transistor in a feedback arrangement.',
    question: 'What advantage does the Wilson mirror provide over a simple two-transistor mirror?',
    options: [
      { id: 'a', text: 'It uses less silicon area' },
      { id: 'b', text: 'It provides higher output impedance and better current accuracy through negative feedback', correct: true },
      { id: 'c', text: 'It works at lower supply voltages' },
      { id: 'd', text: 'It eliminates the need for matched transistors' },
    ],
    explanation: 'The Wilson mirror uses feedback to equalize VDS across the mirror pair and boost output impedance. The feedback transistor senses output current deviations and corrects them. Output impedance is approximately (gm*ro)*ro, giving excellent current source behavior.',
  },
  {
    id: 9,
    scenario: 'A bandgap reference circuit uses a current mirror to force equal currents through two bipolar transistors operating at different current densities.',
    question: 'Why is current mirror accuracy critical in a bandgap reference?',
    options: [
      { id: 'a', text: 'It determines the output voltage amplitude' },
      { id: 'b', text: 'Equal currents ensure that the delta-VBE depends only on the area ratio, enabling precise temperature compensation', correct: true },
      { id: 'c', text: 'It prevents thermal runaway in the BJTs' },
      { id: 'd', text: 'It sets the oscillation frequency of the reference' },
    ],
    explanation: 'In a bandgap reference, the difference in VBE between two BJTs at different current densities produces a PTAT voltage: delta_VBE = (kT/q)*ln(N). This only works if the currents are truly equal. Mirror inaccuracy introduces errors directly into the reference voltage.',
  },
  {
    id: 10,
    scenario: 'A DAC uses a current-steering architecture with 256 unit current sources. Each unit source must match to within 0.1% for 8-bit accuracy.',
    question: 'What design technique is most important for achieving this matching?',
    options: [
      { id: 'a', text: 'Using the smallest possible transistors to save area' },
      { id: 'b', text: 'Using large-area transistors with careful common-centroid layout and dummy devices', correct: true },
      { id: 'c', text: 'Operating transistors in the subthreshold region' },
      { id: 'd', text: 'Using different W/L ratios for each current source' },
    ],
    explanation: 'Random mismatch in Vth and beta is inversely proportional to sqrt(W*L). Large-area devices reduce random mismatch. Common-centroid layout cancels systematic gradients. Dummy devices at array edges prevent etch-rate variations. These combined techniques achieve sub-0.1% matching.',
  },
];

// ============================================================================
// REAL WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Power Management',
    short: 'Bias currents for billions of transistors',
    tagline: 'Every analog block starts with a current mirror',
    description: 'Modern smartphone SoCs contain hundreds of analog blocks: ADCs, DACs, PLLs, LDOs, and amplifiers. Each requires precise bias currents. Current mirrors distribute a single reference current to all these blocks with high accuracy.',
    connection: 'When you make a phone call, the RF transceiver uses current mirrors to bias low-noise amplifiers. The audio codec uses them for DAC reference currents. Even the display driver uses mirrored currents. A single golden reference current gets mirrored thousands of times.',
    howItWorks: 'A bandgap reference generates a temperature-stable voltage, which is converted to a reference current through a precision resistor. Cascode current mirrors then distribute this current across the chip. Each mirror output is sized for its specific block requirements.',
    stats: [
      { value: '1000+', label: 'Current mirrors per SoC', icon: '🔄' },
      { value: '<0.5%', label: 'Matching accuracy needed', icon: '🎯' },
      { value: '5nm', label: 'Process node', icon: '🔬' },
    ],
    examples: ['Apple A-series', 'Qualcomm Snapdragon', 'Samsung Exynos', 'MediaTek Dimensity'],
    companies: ['Apple', 'Qualcomm', 'Samsung', 'TSMC'],
    futureImpact: 'At 2nm nodes, quantum effects and increased variability will demand new mirror architectures with digital calibration.',
    color: '#3B82F6',
  },
  {
    icon: '🏥',
    title: 'Medical Instrumentation',
    short: 'Precision amplifiers for life-critical signals',
    tagline: 'Microvolts matter when measuring heartbeats',
    description: 'ECG, EEG, and neural recording systems use instrumentation amplifiers that require exquisitely matched bias currents. Current mirror accuracy directly determines the amplifier offset and CMRR, which affect diagnostic accuracy.',
    connection: 'A heart monitor amplifies signals of 1 mV amplitude in the presence of 1V common-mode interference. The instrumentation amplifier input stage uses current mirrors to bias differential pairs. Even 0.1% mirror mismatch creates offset voltages that can mask cardiac events.',
    howItWorks: 'Chopper-stabilized amplifiers use current mirrors with dynamic element matching - the mirror transistors are periodically swapped to average out mismatch. This achieves effective matching below 0.01%, enabling microvolt-level precision.',
    stats: [
      { value: '<1 uV', label: 'Offset requirement', icon: '📏' },
      { value: '120 dB', label: 'CMRR needed', icon: '📊' },
      { value: '0.01%', label: 'Mirror matching', icon: '🎯' },
    ],
    examples: ['ECG monitors', 'EEG systems', 'Neural implants', 'Blood glucose sensors'],
    companies: ['Medtronic', 'Texas Instruments', 'Analog Devices', 'Neuralink'],
    futureImpact: 'Brain-computer interfaces demand thousands of parallel recording channels, each with precisely mirrored bias currents on a single chip.',
    color: '#10B981',
  },
  {
    icon: '📡',
    title: '5G RF Transceivers',
    short: 'Broadband bias for millimeter-wave circuits',
    tagline: 'Current mirrors that work at 28 GHz',
    description: 'Millimeter-wave 5G transceivers use current mirrors to bias power amplifiers, mixers, and LNAs operating at 28-39 GHz. At these frequencies, parasitic capacitances of mirror transistors affect circuit bandwidth and stability.',
    connection: 'The power amplifier in a 5G phone must output precise power levels to meet regulatory limits. Current mirrors set the bias point of each amplifier stage. Temperature-induced bias drift would cause the phone to violate FCC emission limits or drop calls.',
    howItWorks: 'Wide-swing cascode mirrors provide high output impedance while minimizing voltage headroom. Degeneration resistors improve matching at the cost of voltage compliance. On-chip calibration DACs trim mirror ratios after manufacturing to compensate for process variation.',
    stats: [
      { value: '39 GHz', label: 'Maximum frequency', icon: '📶' },
      { value: '-40 to 85 C', label: 'Operating range', icon: '🌡' },
      { value: '<1 dB', label: 'Gain accuracy', icon: '🔊' },
    ],
    examples: ['5G base stations', 'Phased array antennas', 'Satellite links', 'Automotive radar'],
    companies: ['Qualcomm', 'Broadcom', 'NXP', 'Analog Devices'],
    futureImpact: '6G at sub-THz frequencies will push mirror design to its limits, requiring new topologies that maintain accuracy above 100 GHz.',
    color: '#8B5CF6',
  },
  {
    icon: '🎵',
    title: 'High-Fidelity Audio DACs',
    short: 'Current-steering conversion for audiophile quality',
    tagline: 'Matching 65,536 current levels for 16-bit audio',
    description: 'Premium audio DACs use current-steering architectures where hundreds of matched unit current sources are selectively switched to create analog output. Each current source is a mirror of a precision reference, and matching determines audio fidelity.',
    connection: 'When you listen to music on a high-end DAC, every sample is reconstructed by turning on a precise combination of current sources. A 16-bit DAC needs 65,536 distinct levels. DNL and INL specifications directly depend on current mirror matching across the entire array.',
    howItWorks: 'The current source array uses large-area transistors in common-centroid layout with dummy devices. Dynamic element matching (DEM) algorithms continuously rotate which physical current sources map to which digital codes, converting static mismatch into high-frequency noise that is easily filtered.',
    stats: [
      { value: '24-bit', label: 'Resolution achieved', icon: '🎶' },
      { value: '-120 dB', label: 'THD+N performance', icon: '📉' },
      { value: '0.05%', label: 'Unit current matching', icon: '🎯' },
    ],
    examples: ['ESS Sabre DACs', 'AKM Velvet Sound', 'Cirrus Logic CS43xxx', 'TI PCM series'],
    companies: ['ESS Technology', 'AKM', 'Cirrus Logic', 'Texas Instruments'],
    futureImpact: 'Sigma-delta DACs are replacing current-steering in many applications, but precision current mirrors remain essential for the internal integrator bias currents.',
    color: '#F59E0B',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CurrentMirrorMatchingRenderer: React.FC<CurrentMirrorMatchingRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Mismatch',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();

  // Simulation state
  const [irefValue, setIrefValue] = useState(100);         // uA
  const [wlRef, setWlRef] = useState(4);                    // W/L ratio of reference
  const [wlOut, setWlOut] = useState(4);                     // W/L ratio of output
  const [vdsMismatch, setVdsMismatch] = useState(0);         // VDS difference in V
  const [lambda, setLambda] = useState(0.05);                // channel length modulation /V
  const [temperature, setTemperature] = useState(25);        // degrees C
  const [cascodeEnabled, setCascodeEnabled] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);
  const [targetRatio, setTargetRatio] = useState<number | null>(null); // for play challenges

  // Prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Navigation
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
        gameType: 'current-mirror-matching',
        gameTitle: 'Current Mirror Matching',
        details: { phase, ...details },
        timestamp: Date.now(),
      });
    }
  }, [onGameEvent, phase]);

  // Animation loop
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play' && phase !== 'hook') return;
    const timer = setInterval(() => setAnimFrame(f => f + 1), 60);
    return () => clearInterval(timer);
  }, [phase]);

  // Colors
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1a1a2e',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
  };

  const typo = {
    h1: { fontSize: isMobile ? '26px' : '34px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '21px' : '26px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '17px' : '21px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.7 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
    label: { fontSize: isMobile ? '12px' : '13px', fontWeight: 600 as const, lineHeight: 1.3, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  };

  // Phase navigation
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200 || isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    emitGameEvent('phase_changed', { from: phase, to: p });
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

  // ============================================================================
  // PHYSICS CALCULATIONS
  // ============================================================================
  const calculateMirrorCurrent = useCallback(() => {
    const ratio = wlOut / wlRef;
    const idealCurrent = irefValue * ratio;

    // VDS for diode-connected reference: approximately Vov ~ 0.2V, so VDS_ref ~ 0.5V
    const vdsRef = 0.5;
    const vdsOut = vdsRef + vdsMismatch;

    // Channel length modulation
    let clmFactor = (1 + lambda * vdsOut) / (1 + lambda * vdsRef);

    // Cascode greatly reduces CLM effect
    if (cascodeEnabled) {
      clmFactor = 1 + (clmFactor - 1) * 0.05; // ~20x improvement
    }

    // Temperature effect (small systematic shift, largely ratiometric cancellation)
    const tempOffset = (temperature - 25) * 0.0003; // 0.03% per degree residual
    const tempFactor = 1 + tempOffset;

    const actualCurrent = idealCurrent * clmFactor * tempFactor;
    const accuracy = idealCurrent > 0 ? (1 - Math.abs(actualCurrent - idealCurrent) / idealCurrent) * 100 : 100;

    return {
      idealCurrent,
      actualCurrent: Math.max(0, actualCurrent),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      ratio,
      clmFactor,
      tempFactor,
    };
  }, [irefValue, wlRef, wlOut, vdsMismatch, lambda, cascodeEnabled, temperature]);

  const mirror = calculateMirrorCurrent();

  // ============================================================================
  // REUSABLE UI COMPONENTS
  // ============================================================================

  // Progress bar
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const progress = ((currentIdx + 1) / phaseOrder.length) * 100;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001,
        background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
        }}>
          <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>
            {phaseLabels[phase]}
          </span>
          <span style={{ ...typo.small, color: colors.textMuted }}>
            {currentIdx + 1}/{phaseOrder.length}
          </span>
        </div>
        <div style={{ height: '3px', background: colors.border }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  };

  // Phase navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: '6px',
      padding: '16px', flexWrap: 'wrap',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={`Go to ${phaseLabels[p]}`}
          style={{
            width: '10px', height: '10px', borderRadius: '50%', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s',
            background: p === phase ? colors.accent : i <= phaseOrder.indexOf(phase) ? colors.success : colors.border,
            transform: p === phase ? 'scale(1.4)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );

  // Slider component
  const SliderControl = ({ label, value, min, max, step, unit, onChange, color: sliderColor }: {
    label: string; value: number; min: number; max: number; step: number;
    unit: string; onChange: (v: number) => void; color?: string;
  }) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: sliderColor || colors.accent, fontWeight: 700 }}>
          {typeof value === 'number' && step < 1 ? value.toFixed(2) : value} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => { onChange(parseFloat(e.target.value)); emitGameEvent('slider_changed', { label, value: parseFloat(e.target.value) }); }}
        style={{ width: '100%', accentColor: sliderColor || colors.accent, cursor: 'pointer' }}
      />
    </div>
  );

  // Primary button style
  const primaryBtn: React.CSSProperties = {
    padding: '14px 28px', minHeight: '44px', borderRadius: '10px', border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
    transition: 'all 0.2s', boxShadow: `0 4px 16px ${colors.accentGlow}`,
  };

  const secondaryBtn: React.CSSProperties = {
    padding: '12px 24px', minHeight: '44px', borderRadius: '10px',
    border: `1px solid ${colors.border}`, background: 'transparent',
    color: colors.textSecondary, fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  };

  // ============================================================================
  // CURRENT MIRROR SVG VISUALIZATION
  // ============================================================================
  const CircuitSVG = ({ showCascode = false, interactive = false }: { showCascode?: boolean; interactive?: boolean }) => {
    const w = isMobile ? 340 : 440;
    const h = isMobile ? 300 : 340;

    // Current flow animation
    const flowOffset = animFrame * 2;
    const refArrowScale = Math.min(1, irefValue / 200);
    const outArrowScale = Math.min(1, mirror.actualCurrent / 200);

    // Accuracy-based coloring
    const accColor = mirror.accuracy >= 98 ? colors.success : mirror.accuracy >= 90 ? colors.warning : colors.error;

    return (
      <svg
        width="100%" height={h} viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: `${w}px`, background: colors.bgCard, borderRadius: '12px' }}
        role="img" aria-label="Current Mirror Circuit Diagram"
      >
        <title>Current Mirror Circuit with Reference and Output Transistors</title>
        <defs>
          <linearGradient id="vddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="gndGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M1,1 L4,7 L7,1" fill={colors.accent} />
          </marker>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* VDD rail */}
        <line x1="40" y1="30" x2={w - 40} y2="30" stroke="#ef4444" strokeWidth="3" />
        <text x={w / 2} y="22" fill="#ef4444" fontSize="13" fontWeight="700" textAnchor="middle">VDD</text>

        {/* GND rail */}
        <line x1="40" y1={h - 30} x2={w - 40} y2={h - 30} stroke="#64748b" strokeWidth="3" />
        <text x={w / 2} y={h - 16} fill="#64748b" fontSize="13" fontWeight="700" textAnchor="middle">GND</text>

        {/* === REFERENCE SIDE (left) === */}
        {(() => {
          const cx = w * 0.3;
          const mosfetY = h * 0.5;

          return (
            <g>
              {/* Iref source arrow */}
              <line x1={cx} y1="30" x2={cx} y2={mosfetY - 30} stroke={colors.accent} strokeWidth="2" strokeDasharray="6 3" strokeDashoffset={-flowOffset} />
              <text x={cx + 12} y={mosfetY - 45} fill={colors.accent} fontSize="11" fontWeight="600">Iref</text>
              <text x={cx + 12} y={mosfetY - 32} fill={colors.accent} fontSize="11">{irefValue} uA</text>

              {/* Reference current arrow (proportional) */}
              <line x1={cx - 8} y1="50" x2={cx - 8} y2={50 + 40 * refArrowScale} stroke={colors.accent} strokeWidth={2 + 2 * refArrowScale} opacity="0.8" />
              <polygon points={`${cx - 12},${50 + 38 * refArrowScale} ${cx - 8},${62 + 38 * refArrowScale} ${cx - 4},${50 + 38 * refArrowScale}`} fill={colors.accent} opacity="0.8" />

              {/* MOSFET symbol - reference (diode-connected) */}
              {/* Drain */}
              <line x1={cx} y1={mosfetY - 30} x2={cx} y2={mosfetY - 12} stroke={colors.textSecondary} strokeWidth="2" />
              {/* Source */}
              <line x1={cx} y1={mosfetY + 12} x2={cx} y2={mosfetY + 30} stroke={colors.textSecondary} strokeWidth="2" />
              {/* Gate bar */}
              <line x1={cx - 15} y1={mosfetY - 10} x2={cx - 15} y2={mosfetY + 10} stroke={colors.textPrimary} strokeWidth="2" />
              {/* Channel lines */}
              <line x1={cx - 10} y1={mosfetY - 10} x2={cx} y2={mosfetY - 10} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 10} y1={mosfetY} x2={cx} y2={mosfetY} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 10} y1={mosfetY + 10} x2={cx} y2={mosfetY + 10} stroke={colors.textPrimary} strokeWidth="2" />
              {/* Oxide gap */}
              <line x1={cx - 12} y1={mosfetY - 12} x2={cx - 12} y2={mosfetY + 12} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="2 2" />

              {/* Diode connection (gate tied to drain) */}
              <line x1={cx - 15} y1={mosfetY} x2={cx - 30} y2={mosfetY} stroke={colors.info} strokeWidth="2" />
              <line x1={cx - 30} y1={mosfetY} x2={cx - 30} y2={mosfetY - 25} stroke={colors.info} strokeWidth="2" />
              <line x1={cx - 30} y1={mosfetY - 25} x2={cx} y2={mosfetY - 25} stroke={colors.info} strokeWidth="2" />

              {/* Source to GND */}
              <line x1={cx} y1={mosfetY + 30} x2={cx} y2={h - 30} stroke={colors.textSecondary} strokeWidth="2" />

              {/* Label */}
              <text x={cx} y={mosfetY + 48} fill={colors.textMuted} fontSize="11" textAnchor="middle">M_ref</text>
              <text x={cx} y={mosfetY + 60} fill={colors.info} fontSize="10" textAnchor="middle">W/L = {wlRef}</text>

              {/* Gate wire to output */}
              <line x1={cx - 15} y1={mosfetY} x2={cx - 30} y2={mosfetY} stroke={colors.info} strokeWidth="2" />
              <line x1={cx - 30} y1={mosfetY} x2={cx - 30} y2={mosfetY + 70} stroke={colors.info} strokeWidth="1.5" />
              <line x1={cx - 30} y1={mosfetY + 70} x2={w * 0.7 - 30} y2={mosfetY + 70} stroke={colors.info} strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1={w * 0.7 - 30} y1={mosfetY + 70} x2={w * 0.7 - 30} y2={mosfetY} stroke={colors.info} strokeWidth="1.5" />
              <line x1={w * 0.7 - 30} y1={mosfetY} x2={w * 0.7 - 15} y2={mosfetY} stroke={colors.info} strokeWidth="2" />
              <text x={w * 0.5} y={mosfetY + 82} fill={colors.info} fontSize="10" textAnchor="middle">Vgs (shared gate)</text>
            </g>
          );
        })()}

        {/* === OUTPUT SIDE (right) === */}
        {(() => {
          const cx = w * 0.7;
          const mosfetY = h * 0.5;

          return (
            <g>
              {/* Iout load */}
              <line x1={cx} y1="30" x2={cx} y2={mosfetY - (showCascode ? 65 : 30)} stroke={accColor} strokeWidth="2" strokeDasharray="6 3" strokeDashoffset={-flowOffset} />
              <text x={cx + 12} y={mosfetY - (showCascode ? 80 : 45)} fill={accColor} fontSize="11" fontWeight="600">Iout</text>
              <text x={cx + 12} y={mosfetY - (showCascode ? 67 : 32)} fill={accColor} fontSize="11">{mirror.actualCurrent.toFixed(1)} uA</text>

              {/* Output current arrow (proportional) */}
              <line x1={cx + 10} y1="50" x2={cx + 10} y2={50 + 40 * outArrowScale} stroke={accColor} strokeWidth={2 + 2 * outArrowScale} opacity="0.8" />
              <polygon points={`${cx + 6},${50 + 38 * outArrowScale} ${cx + 10},${62 + 38 * outArrowScale} ${cx + 14},${50 + 38 * outArrowScale}`} fill={accColor} opacity="0.8" />

              {/* Cascode transistor (if enabled) */}
              {showCascode && cascodeEnabled && (
                <g>
                  <line x1={cx} y1={mosfetY - 65} x2={cx} y2={mosfetY - 50} stroke={colors.textSecondary} strokeWidth="2" />
                  <line x1={cx - 15} y1={mosfetY - 48} x2={cx - 15} y2={mosfetY - 30} stroke="#22d3ee" strokeWidth="2" />
                  <line x1={cx - 10} y1={mosfetY - 48} x2={cx} y2={mosfetY - 48} stroke="#22d3ee" strokeWidth="2" />
                  <line x1={cx - 10} y1={mosfetY - 39} x2={cx} y2={mosfetY - 39} stroke="#22d3ee" strokeWidth="2" />
                  <line x1={cx - 10} y1={mosfetY - 30} x2={cx} y2={mosfetY - 30} stroke="#22d3ee" strokeWidth="2" />
                  <line x1={cx - 12} y1={mosfetY - 50} x2={cx - 12} y2={mosfetY - 28} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="2 2" />
                  <line x1={cx} y1={mosfetY - 30} x2={cx} y2={mosfetY - 12} stroke={colors.textSecondary} strokeWidth="2" />
                  <text x={cx - 28} y={mosfetY - 35} fill="#22d3ee" fontSize="9" textAnchor="end">Vcasc</text>
                  <text x={cx + 14} y={mosfetY - 36} fill="#22d3ee" fontSize="9">Cascode</text>
                  {/* Cascode shield indicator */}
                  <rect x={cx - 20} y={mosfetY - 55} width="40" height="30" rx="4" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
                </g>
              )}

              {/* MOSFET symbol - output */}
              <line x1={cx} y1={mosfetY - (showCascode && cascodeEnabled ? 12 : 30)} x2={cx} y2={mosfetY - 12} stroke={colors.textSecondary} strokeWidth="2" />
              <line x1={cx} y1={mosfetY + 12} x2={cx} y2={mosfetY + 30} stroke={colors.textSecondary} strokeWidth="2" />
              <line x1={cx - 15} y1={mosfetY - 10} x2={cx - 15} y2={mosfetY + 10} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 10} y1={mosfetY - 10} x2={cx} y2={mosfetY - 10} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 10} y1={mosfetY} x2={cx} y2={mosfetY} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 10} y1={mosfetY + 10} x2={cx} y2={mosfetY + 10} stroke={colors.textPrimary} strokeWidth="2" />
              <line x1={cx - 12} y1={mosfetY - 12} x2={cx - 12} y2={mosfetY + 12} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="2 2" />

              {/* Source to GND */}
              <line x1={cx} y1={mosfetY + 30} x2={cx} y2={h - 30} stroke={colors.textSecondary} strokeWidth="2" />

              {/* Label */}
              <text x={cx} y={mosfetY + 48} fill={colors.textMuted} fontSize="11" textAnchor="middle">M_out</text>
              <text x={cx} y={mosfetY + 60} fill={accColor} fontSize="10" textAnchor="middle">W/L = {wlOut}</text>
            </g>
          );
        })()}

        {/* Accuracy indicator */}
        <rect x={w / 2 - 50} y={h - 70} width="100" height="28" rx="14" fill={`${accColor}22`} stroke={accColor} strokeWidth="1.5" />
        <text x={w / 2} y={h - 51} fill={accColor} fontSize="13" fontWeight="700" textAnchor="middle">
          {mirror.accuracy.toFixed(1)}% match
        </text>

        {/* Formula */}
        <text x={w - 15} y={h - 52} fill={colors.textMuted} fontSize="10" textAnchor="end">
          Iout = Iref x (W/L)out / (W/L)ref
        </text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // --- HOOK PHASE ---
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {String.fromCodePoint(0x1F50C)}
            </div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
              How Do You Copy a Current?
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              In analog IC design, one of the most fundamental building blocks is the
              <strong style={{ color: colors.accent }}> current mirror</strong>. It takes a precise
              reference current and replicates it to other parts of the circuit. Every amplifier,
              DAC, ADC, and voltage reference on your phone relies on current mirrors.
            </p>

            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '20px',
              marginBottom: '24px', border: `1px solid ${colors.border}`,
            }}>
              <CircuitSVG />
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Two matched transistors share the same gate voltage. The reference transistor is
              diode-connected (gate tied to drain), establishing a gate-source voltage that sets
              the current. The output transistor, driven by the same Vgs, mirrors that current.
            </p>

            <div style={{
              background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`,
              borderRadius: '12px', padding: '16px', marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.accent, fontWeight: 600, margin: 0 }}>
                The key insight: identical transistors with identical Vgs carry identical currents.
                Change the W/L ratio and you can scale the current to any ratio you need.
              </p>
            </div>

            <button onClick={() => { playSound('click'); goNext(); }} style={primaryBtn}>
              Make a Prediction
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- PREDICT PHASE ---
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
              Predict the Output Current
            </h2>
            <div style={{
              background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
              marginBottom: '20px', borderLeft: `3px solid ${colors.info}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A current mirror has Iref = <strong style={{ color: colors.accent }}>100 uA</strong>.
                The reference transistor has W/L = <strong style={{ color: colors.info }}>4</strong>.
                The output transistor has W/L = <strong style={{ color: colors.info }}>8</strong>.
                Both transistors have the same VDS (no mismatch).
              </p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              What is the output current?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'a', label: '50 uA (half of reference)' },
                { id: 'b', label: '100 uA (same as reference)' },
                { id: 'c', label: '200 uA (double the reference)' },
                { id: 'd', label: '400 uA (quadruple the reference)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); emitGameEvent('prediction_made', { prediction: opt.id }); }}
                  style={{
                    padding: '14px 16px', minHeight: '44px', borderRadius: '10px',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? '#fff' : colors.textMuted,
                    textAlign: 'center', lineHeight: '28px', marginRight: '12px',
                    fontSize: '13px', fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ ...typo.body, color: colors.textPrimary }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{
                background: prediction === 'c' ? `${colors.success}15` : `${colors.warning}15`,
                border: `1px solid ${prediction === 'c' ? colors.success : colors.warning}`,
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
              }}>
                <p style={{ ...typo.body, color: prediction === 'c' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
                  {prediction === 'c' ? 'Correct!' : 'Not quite.'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Iout = Iref x (W/L)out / (W/L)ref = 100 x 8/4 = <strong>200 uA</strong>.
                  The output transistor is twice as wide, so it carries twice the current.
                </p>
              </div>
            )}

            {prediction && (
              <button onClick={() => { playSound('click'); goNext(); }} style={primaryBtn}>
                Explore the Mirror
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- PLAY PHASE ---
  if (phase === 'play') {
    const challenges = [
      { label: '1:1 mirror', targetRatio: 1 },
      { label: '1:2 mirror', targetRatio: 2 },
      { label: '1:4 mirror', targetRatio: 4 },
    ];
    const currentChallengeMet = targetRatio !== null && Math.abs(mirror.ratio - targetRatio) < 0.05;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              Design Current Mirrors
            </h2>

            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: '20px', marginBottom: '20px',
            }}>
              {/* SVG on left */}
              <div style={{ flex: isMobile ? 'none' : '1 1 55%' }}>
                <CircuitSVG />

                {/* Readout */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                  marginTop: '12px',
                }}>
                  {[
                    { label: 'Iref', value: `${irefValue} uA`, color: colors.accent },
                    { label: 'Iout', value: `${mirror.actualCurrent.toFixed(1)} uA`, color: mirror.accuracy >= 98 ? colors.success : colors.warning },
                    { label: 'Ratio', value: `1:${mirror.ratio.toFixed(2)}`, color: colors.info },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: colors.bgSecondary, borderRadius: '8px', padding: '10px',
                      textAlign: 'center', border: `1px solid ${colors.border}`,
                    }}>
                      <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ ...typo.h3, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls on right */}
              <div style={{ flex: isMobile ? 'none' : '1 1 45%' }}>
                <div style={{
                  background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '14px' }}>Controls</h3>
                  <SliderControl label="Reference Current (Iref)" value={irefValue} min={10} max={500} step={10} unit="uA" onChange={setIrefValue} />
                  <SliderControl label="Reference W/L" value={wlRef} min={1} max={16} step={1} unit="" onChange={setWlRef} color={colors.info} />
                  <SliderControl label="Output W/L" value={wlOut} min={1} max={16} step={1} unit="" onChange={setWlOut} color={colors.info} />
                </div>

                {/* Challenges */}
                <div style={{
                  background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                  border: `1px solid ${colors.border}`, marginTop: '14px',
                }}>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '10px' }}>
                    Design Challenges
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {challenges.map((ch, i) => {
                      const met = Math.abs(mirror.ratio - ch.targetRatio) < 0.05;
                      return (
                        <button
                          key={i}
                          onClick={() => { playSound('click'); setTargetRatio(ch.targetRatio); }}
                          style={{
                            padding: '10px 14px', minHeight: '44px', borderRadius: '8px',
                            textAlign: 'left', cursor: 'pointer',
                            background: targetRatio === ch.targetRatio ? `${colors.accent}22` : colors.bgCard,
                            border: `1px solid ${met ? colors.success : targetRatio === ch.targetRatio ? colors.accent : colors.border}`,
                          }}
                        >
                          <span style={{ ...typo.small, color: met ? colors.success : colors.textPrimary }}>
                            {met ? '  ' : ''} Design a {ch.label}
                          </span>
                          {met && <span style={{ ...typo.small, color: colors.success, float: 'right' }}>Complete!</span>}
                        </button>
                      );
                    })}
                  </div>
                  {targetRatio !== null && currentChallengeMet && (
                    <div style={{
                      background: `${colors.success}15`, borderRadius: '8px', padding: '10px',
                      marginTop: '10px', border: `1px solid ${colors.success}33`,
                    }}>
                      <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                        You built a 1:{targetRatio} mirror! Iout = {mirror.actualCurrent.toFixed(1)} uA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              background: `${colors.info}11`, borderRadius: '12px', padding: '14px',
              border: `1px solid ${colors.info}33`, marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.info }}>Key formula:</strong> Iout = Iref x (W/L)_out / (W/L)_ref.
                Adjust the W/L ratios to hit each target. The mirror ratio is purely a geometry ratio.
              </p>
            </div>

            <button onClick={() => { playSound('click'); goNext(); }} style={primaryBtn}>
              Understand the Theory
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              How Current Mirrors Work
            </h2>

            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '20px',
              marginBottom: '20px', border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                The Fundamental Equation
              </h3>
              <div style={{
                background: colors.bgPrimary, borderRadius: '10px', padding: '16px',
                textAlign: 'center', marginBottom: '12px', fontFamily: 'monospace',
              }}>
                <span style={{ ...typo.h2, color: colors.textPrimary }}>
                  I<sub>out</sub> = I<sub>ref</sub> x (W/L)<sub>out</sub> / (W/L)<sub>ref</sub>
                </span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The output current is the reference current scaled by the ratio of transistor widths
                to lengths. This works because both transistors share the same Vgs and (ideally) the
                same Vth, so the current depends only on geometry.
              </p>
            </div>

            {[
              {
                title: 'Why It Works',
                content: 'In saturation, a MOSFET current is I = (1/2) * mu_n * Cox * (W/L) * (Vgs - Vth)^2. If two transistors share the same Vgs and Vth, the ratio of their currents equals the ratio of their W/L values. The diode-connected reference transistor forces Vgs to the value that produces Iref.',
                color: colors.info,
              },
              {
                title: 'Matching Requirements',
                content: 'For accurate mirroring, both transistors must have identical Vth and mobility. This requires them to be the same type (NMOS or PMOS), same oxide thickness, and placed close together on the IC with the same orientation. Layout is critical.',
                color: colors.success,
              },
              {
                title: 'Mirror Ratio Flexibility',
                content: 'By choosing different W/L ratios, you can create any current ratio: 1:1, 1:2, 1:10, or even fractional ratios like 3:7. Multiple output transistors can each have different ratios, distributing one reference to many loads.',
                color: colors.accent,
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                marginBottom: '12px', borderLeft: `3px solid ${item.color}`,
              }}>
                <h3 style={{ ...typo.h3, color: item.color, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{item.content}</p>
              </div>
            ))}

            <button onClick={() => { playSound('click'); goNext(); }} style={{ ...primaryBtn, marginTop: '16px' }}>
              Explore Non-Idealities
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- TWIST PREDICT PHASE ---
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
              The Plot Twist: VDS Mismatch
            </h2>
            <div style={{
              background: `${colors.error}11`, border: `1px solid ${colors.error}33`,
              borderRadius: '12px', padding: '16px', marginBottom: '20px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In reality, the reference transistor (diode-connected) has VDS = Vgs (about 0.5V).
                But the output transistor VDS depends on the load circuit and can be very different.
                This <strong style={{ color: colors.error }}>VDS mismatch</strong> causes a current
                error through <strong style={{ color: colors.error }}>channel length modulation</strong> (the Early effect).
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
              marginBottom: '20px', borderLeft: `3px solid ${colors.warning}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A 1:1 mirror has Iref = 100 uA. The reference VDS = 0.5V but the output VDS = 2.0V.
                Lambda (channel length modulation) = 0.05 /V. What happens to the output current?
              </p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Your prediction:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'a', label: 'Still exactly 100 uA - transistors are matched' },
                { id: 'b', label: 'About 107 uA - higher VDS increases current' },
                { id: 'c', label: 'About 93 uA - higher VDS decreases current' },
                { id: 'd', label: 'About 150 uA - the error is very large' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); emitGameEvent('prediction_made', { twist: true, prediction: opt.id }); }}
                  style={{
                    padding: '14px 16px', minHeight: '44px', borderRadius: '10px',
                    textAlign: 'left', cursor: 'pointer',
                    background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: twistPrediction === opt.id ? '#fff' : colors.textMuted,
                    textAlign: 'center', lineHeight: '28px', marginRight: '12px',
                    fontSize: '13px', fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ ...typo.small, color: colors.textPrimary }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{
                background: twistPrediction === 'b' ? `${colors.success}15` : `${colors.warning}15`,
                border: `1px solid ${twistPrediction === 'b' ? colors.success : colors.warning}`,
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
              }}>
                <p style={{ ...typo.body, color: twistPrediction === 'b' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
                  {twistPrediction === 'b' ? 'Exactly right!' : 'Close, but the answer is B.'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Iout/Iref = (1 + 0.05*2.0)/(1 + 0.05*0.5) = 1.10/1.025 = 1.073. The output
                  current is about 107.3 uA. Higher VDS increases current because the channel
                  effectively shortens, increasing conductance. This is a ~7% error.
                </p>
              </div>
            )}

            {twistPrediction && (
              <button onClick={() => { playSound('click'); goNext(); }} style={primaryBtn}>
                Explore the Fix
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- TWIST PLAY PHASE ---
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              VDS Mismatch and Cascode Fix
            </h2>

            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: '20px', marginBottom: '20px',
            }}>
              {/* SVG */}
              <div style={{ flex: isMobile ? 'none' : '1 1 55%' }}>
                <CircuitSVG showCascode interactive />

                {/* Comparison readout */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>Ideal Iout</div>
                    <div style={{ ...typo.h3, color: colors.info }}>{mirror.idealCurrent.toFixed(1)} uA</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>Actual Iout</div>
                    <div style={{ ...typo.h3, color: mirror.accuracy >= 98 ? colors.success : mirror.accuracy >= 90 ? colors.warning : colors.error }}>
                      {mirror.actualCurrent.toFixed(1)} uA
                    </div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>Accuracy</div>
                    <div style={{ ...typo.h3, color: mirror.accuracy >= 98 ? colors.success : mirror.accuracy >= 90 ? colors.warning : colors.error }}>
                      {mirror.accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>CLM Factor</div>
                    <div style={{ ...typo.h3, color: colors.textPrimary }}>{mirror.clmFactor.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ flex: isMobile ? 'none' : '1 1 45%' }}>
                <div style={{
                  background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '14px' }}>Non-Ideal Controls</h3>
                  <SliderControl label="Reference Current" value={irefValue} min={10} max={500} step={10} unit="uA" onChange={setIrefValue} />
                  <SliderControl label="VDS Mismatch" value={vdsMismatch} min={0} max={3} step={0.1} unit="V" onChange={setVdsMismatch} color={colors.error} />
                  <SliderControl label="Lambda (CLM)" value={lambda} min={0.01} max={0.15} step={0.01} unit="/V" onChange={setLambda} color={colors.warning} />
                  <SliderControl label="Temperature" value={temperature} min={-40} max={125} step={5} unit="C" onChange={setTemperature} color="#22d3ee" />

                  <div style={{ marginTop: '14px' }}>
                    <button
                      onClick={() => { playSound('click'); setCascodeEnabled(!cascodeEnabled); emitGameEvent('button_clicked', { cascode: !cascodeEnabled }); }}
                      style={{
                        width: '100%', padding: '12px', minHeight: '44px', borderRadius: '10px',
                        border: `2px solid ${cascodeEnabled ? colors.success : colors.border}`,
                        background: cascodeEnabled ? `${colors.success}22` : colors.bgCard,
                        color: cascodeEnabled ? colors.success : colors.textSecondary,
                        fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      {cascodeEnabled ? 'Cascode ON - High Output Impedance' : 'Enable Cascode Transistor'}
                    </button>
                  </div>
                </div>

                {/* Insight */}
                <div style={{
                  background: `${colors.accent}11`, borderRadius: '12px', padding: '14px',
                  border: `1px solid ${colors.accent}33`, marginTop: '14px',
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {cascodeEnabled
                      ? 'The cascode transistor shields M_out from VDS changes, reducing current error by ~20x. Output impedance is now gm*ro^2.'
                      : 'Try increasing VDS mismatch to see current error grow. Then enable the cascode to see the dramatic improvement.'}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('click'); goNext(); }} style={primaryBtn}>
              Understand the Theory
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- TWIST REVIEW PHASE ---
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              Output Impedance and Cascode Benefits
            </h2>

            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '20px',
              marginBottom: '20px', border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
                The Problem: Channel Length Modulation
              </h3>
              <div style={{
                background: colors.bgPrimary, borderRadius: '10px', padding: '14px',
                fontFamily: 'monospace', textAlign: 'center', marginBottom: '12px',
              }}>
                <span style={{ ...typo.body, color: colors.textPrimary }}>
                  I<sub>D</sub> = (1/2) K (W/L) (V<sub>gs</sub> - V<sub>th</sub>)<sup>2</sup> (1 + lambda * V<sub>DS</sub>)
                </span>
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                The (1 + lambda * VDS) term means current depends on VDS. Since VDS differs between
                reference and output transistors, the mirror ratio is no longer purely geometric.
                This gives the mirror a finite output impedance: r_out = 1 / (lambda * I_D).
              </p>
            </div>

            {[
              {
                title: 'Simple Mirror Output Impedance',
                content: 'r_out = 1 / (lambda * ID). For ID = 100 uA and lambda = 0.05 /V: r_out = 200 kOhm. Any VDS change of 1V causes a 5% current change. Not great for precision circuits.',
                color: colors.warning,
              },
              {
                title: 'Cascode Mirror: The Solution',
                content: 'A cascode transistor stacked above the mirror transistor multiplies the output impedance by (gm * ro), typically 50-200x. Output impedance becomes 10-40 MOhm. VDS variations at the output barely affect the mirror transistor\'s VDS.',
                color: colors.success,
              },
              {
                title: 'Tradeoff: Voltage Headroom',
                content: 'The cascode transistor needs its own VDS_sat (~0.2V), plus the mirror transistor needs VDS_sat. Together that is ~0.4V minimum. Wide-swing (or low-voltage) cascode techniques reduce this to about 2*VDS_sat while maintaining high output impedance.',
                color: colors.info,
              },
              {
                title: 'Temperature Tracking',
                content: 'Because both mirror transistors experience the same temperature, Vth and mobility changes cancel in the ratio. The absolute current changes with temperature, but the mirror ratio is remarkably stable. This ratiometric property is why current mirrors are so powerful.',
                color: '#22d3ee',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                marginBottom: '12px', borderLeft: `3px solid ${item.color}`,
              }}>
                <h3 style={{ ...typo.h3, color: item.color, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{item.content}</p>
              </div>
            ))}

            <button onClick={() => { playSound('click'); goNext(); }} style={{ ...primaryBtn, marginTop: '16px' }}>
              See Real-World Applications
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // --- TRANSFER PHASE ---
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Current Mirror Matching"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={{
          h1: isMobile ? '26px' : '34px',
          h2: isMobile ? '21px' : '26px',
          h3: isMobile ? '17px' : '21px',
          body: isMobile ? '15px' : '17px',
          small: isMobile ? '13px' : '14px',
          label: isMobile ? '12px' : '13px',
          heading: isMobile ? '21px' : '26px',
        }}
      />
    );
  }

  // --- TEST PHASE ---
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '100px' }}>
            <div style={{ padding: '24px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>
                {score >= 70 ? String.fromCodePoint(0x1F389) : String.fromCodePoint(0x1F4DA)}
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Test Complete</p>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
                {correctCount}/10 Correct
              </h2>
              <p style={{ ...typo.body, color: score >= 70 ? colors.success : colors.warning }}>
                {score}% - {score >= 90 ? 'Outstanding!' : score >= 70 ? 'Great work!' : 'Review and try again.'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setTestAnswers({}); setTestSubmitted(false); setCurrentQuestion(0); }}
                  style={secondaryBtn}
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => { playSound('success'); goNext(); }}
                  style={primaryBtn}
                >
                  {score >= 70 ? 'Complete Lesson' : 'Continue Anyway'}
                </button>
              </div>
            </div>

            {/* Rich Answer Key */}
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, idx) => {
                const correctOption = q.options.find(o => o.correct);
                const userAnswer = testAnswers[q.id];
                const isCorrect = userAnswer === correctOption?.id;
                const userOption = q.options.find(o => o.id === userAnswer);

                return (
                  <div
                    key={q.id}
                    style={{
                      background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      marginBottom: '12px',
                      padding: '14px',
                      borderRadius: '10px',
                    }}
                  >
                    <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700, marginBottom: '8px' }}>
                      {idx + 1}. {q.question}
                    </p>
                    {!isCorrect && userOption && (
                      <div style={{
                        padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.2)', color: colors.error, fontSize: '13px',
                      }}>
                        Your answer: {userOption.text}
                      </div>
                    )}
                    <div style={{
                      padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.2)', color: colors.success, fontSize: '13px',
                    }}>
                      Correct: {correctOption?.text}
                    </div>
                    <div style={{
                      padding: '6px 10px', marginTop: '6px', borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '12px', lineHeight: 1.5,
                    }}>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Active test - paginated
    const currentQ = testQuestions[currentQuestion];
    const currentAnswered = !!testAnswers[currentQ.id];
    const isLastQuestion = currentQuestion === testQuestions.length - 1;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
            }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[testQuestions[i].id] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgSecondary, borderRadius: '12px', padding: '14px',
              marginBottom: '16px', borderLeft: `3px solid ${colors.info}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              {currentQ.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {currentQ.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    playSound('click');
                    setTestAnswers(prev => ({ ...prev, [currentQ.id]: option.id }));
                    emitGameEvent('answer_submitted', { questionId: currentQ.id, answer: option.id });
                  }}
                  style={{
                    padding: '14px 16px', minHeight: '44px', borderRadius: '10px',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    background: testAnswers[currentQ.id] === option.id ? `${colors.accent}30` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQ.id] === option.id ? colors.accent : colors.border}`,
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '26px', height: '26px', borderRadius: '50%',
                    background: testAnswers[currentQ.id] === option.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQ.id] === option.id ? '#fff' : colors.textMuted,
                    textAlign: 'center', lineHeight: '26px', marginRight: '10px',
                    fontSize: '12px', fontWeight: 700, verticalAlign: 'middle',
                  }}>
                    {option.id.toUpperCase()}
                  </span>
                  <span style={{ ...typo.small, color: colors.textPrimary }}>{option.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom navigation bar */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 1000,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)', gap: '12px',
        }}>
          <button
            onClick={() => currentQuestion > 0 ? setCurrentQuestion(currentQuestion - 1) : goBack()}
            style={secondaryBtn}
          >
            Back
          </button>
          <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>
            {answeredCount}/{testQuestions.length} answered
          </span>
          {isLastQuestion && allAnswered ? (
            <button
              onClick={() => {
                setTestSubmitted(true);
                const s = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
                playSound(s >= 7 ? 'complete' : 'failure');
                emitGameEvent('game_completed', { score: s, total: testQuestions.length });
              }}
              style={primaryBtn}
            >
              Submit
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, testQuestions.length - 1))}
              disabled={!currentAnswered}
              style={{
                ...primaryBtn,
                opacity: currentAnswered ? 1 : 0.4,
                cursor: currentAnswered ? 'pointer' : 'not-allowed',
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- MASTERY PHASE ---
  if (phase === 'mastery') {
    const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
    const score = Math.round((correctCount / testQuestions.length) * 100);
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>
              {String.fromCodePoint(0x1F3C6)}
            </div>
            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
              Current Mirror Master!
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              You have mastered the fundamentals of current mirror design in analog ICs.
            </p>

            {/* Score card */}
            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '24px',
              marginBottom: '24px', border: `1px solid ${colors.border}`,
              display: 'inline-block', minWidth: isMobile ? '100%' : '300px',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '16px',
              }}>
                <div>
                  <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>Score</div>
                  <div style={{ ...typo.h1, color: colors.accent }}>{correctCount}/10</div>
                </div>
                <div>
                  <div style={{ ...typo.label, color: colors.textMuted, marginBottom: '4px' }}>Grade</div>
                  <div style={{ ...typo.h1, color: score >= 70 ? colors.success : colors.warning }}>{grade}</div>
                </div>
              </div>
              <div style={{
                height: '8px', background: colors.border, borderRadius: '4px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${score}%`,
                  background: score >= 70 ? `linear-gradient(90deg, ${colors.success}, #059669)` : `linear-gradient(90deg, ${colors.warning}, #d97706)`,
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                {score}% correct
              </p>
            </div>

            {/* What you learned */}
            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '20px',
              marginBottom: '24px', textAlign: 'left', border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                What You Learned:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Current mirrors replicate reference currents using matched transistors',
                  'Mirror ratio is set by W/L geometry: Iout = Iref * (W/L)out / (W/L)ref',
                  'Channel length modulation causes VDS-dependent errors',
                  'Cascode transistors dramatically boost output impedance',
                  'Temperature tracking makes mirrors inherently ratiometric',
                  'Layout techniques (common-centroid, interdigitation) are critical for matching',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: colors.success, fontWeight: 700, flexShrink: 0 }}>
                      {String.fromCharCode(10003)}
                    </span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Key Summary */}
            <div style={{
              background: colors.bgSecondary, borderRadius: '16px', padding: '20px',
              marginBottom: '24px', textAlign: 'left', border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Answer Key
              </h3>
              {testQuestions.map((q, idx) => {
                const correctOption = q.options.find(o => o.correct);
                const userAnswer = testAnswers[q.id];
                const isCorrect = userAnswer === correctOption?.id;

                return (
                  <div
                    key={q.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 0',
                      borderBottom: idx < testQuestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: isCorrect ? colors.success : userAnswer ? colors.error : 'rgba(245, 158, 11, 0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '13px', fontWeight: 700,
                    }}>
                      {isCorrect ? String.fromCharCode(10003) : userAnswer ? String.fromCharCode(10007) : '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...typo.small, color: colors.textPrimary }}>
                        Q{idx + 1}: {q.question.slice(0, 60)}{q.question.length > 60 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Complete Game button */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: `1px solid ${colors.border}`, zIndex: 1000,
        }}>
          <button
            onClick={() => {
              playSound('complete');
              emitGameEvent('mastery_achieved', { score: correctCount, total: testQuestions.length });
              window.location.href = '/games';
            }}
            style={{
              width: '100%', minHeight: '52px', padding: '14px 24px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '12px',
              color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            Complete Game
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center', background: colors.bgPrimary, minHeight: '100dvh' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default CurrentMirrorMatchingRenderer;
