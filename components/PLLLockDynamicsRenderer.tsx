'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ---------------------------------------------------------------------------
// PLL Lock Dynamics - Complete 10-Phase Game (#258)
// Understanding Phase-Locked Loop lock-in behavior, bandwidth-jitter tradeoff,
// and frequency synthesis for modern electronics
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

interface PLLLockDynamicsRendererProps {
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
// TEST QUESTIONS - 10 scenario-based multiple-choice questions
// ---------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A mobile phone needs to transmit at exactly 1.8 GHz, but the only stable frequency source is a 26 MHz crystal oscillator.",
    question: "How does the phone generate the precise 1.8 GHz carrier?",
    options: [
      { id: 'a', label: "It uses multiple crystals in series to add up to 1.8 GHz" },
      { id: 'b', label: "A PLL multiplies the 26 MHz reference by ~69 to synthesize 1.8 GHz", correct: true },
      { id: 'c', label: "The crystal is heated until its natural frequency reaches 1.8 GHz" },
      { id: 'd', label: "A digital counter directly converts 26 MHz to 1.8 GHz" }
    ],
    explanation: "A PLL uses a feedback divider (N ~ 69) so the VCO output at ~1.8 GHz, divided by N, matches the 26 MHz reference. The loop locks when Fout = N x Fref = 69 x 26 MHz = 1.794 GHz."
  },
  {
    scenario: "An engineer configures a PLL with Fref = 10 MHz and division ratio N = 100. The VCO is tunable from 800 MHz to 1.2 GHz.",
    question: "What output frequency will the PLL lock to?",
    options: [
      { id: 'a', label: "800 MHz - the lowest VCO frequency" },
      { id: 'b', label: "1.0 GHz - because Fout = N x Fref = 100 x 10 MHz", correct: true },
      { id: 'c', label: "1.2 GHz - the highest VCO frequency" },
      { id: 'd', label: "10 MHz - matching the reference directly" }
    ],
    explanation: "The PLL feedback forces Fout/N = Fref, so Fout = N x Fref = 100 x 10 MHz = 1.0 GHz. Since 1.0 GHz is within the VCO range (800 MHz - 1.2 GHz), the loop will lock successfully."
  },
  {
    scenario: "A PLL's VCO is running at 950 MHz while the target lock frequency is 1.0 GHz. The phase detector output shows a positive average voltage.",
    question: "What does the positive phase detector output cause?",
    options: [
      { id: 'a', label: "The VCO frequency decreases to match the reference" },
      { id: 'b', label: "The charge pump injects current, raising VCO control voltage to increase frequency toward lock", correct: true },
      { id: 'c', label: "The divider ratio N is automatically adjusted" },
      { id: 'd', label: "The reference frequency is shifted upward" }
    ],
    explanation: "When the VCO frequency is below target, the phase/frequency detector (PFD) outputs UP pulses. The charge pump converts these to current that charges the loop filter capacitor, raising the VCO control voltage and increasing VCO frequency toward the lock point."
  },
  {
    scenario: "Two PLLs have identical designs except PLL-A has 100 kHz loop bandwidth while PLL-B has 10 kHz loop bandwidth.",
    question: "Which PLL locks faster, and why?",
    options: [
      { id: 'a', label: "PLL-B locks faster because narrow bandwidth filters noise better" },
      { id: 'b', label: "They lock at the same speed since they have the same VCO" },
      { id: 'c', label: "PLL-A locks faster because wider bandwidth allows quicker frequency correction", correct: true },
      { id: 'd', label: "Neither can lock - the bandwidths are too different" }
    ],
    explanation: "Wider loop bandwidth means the PLL can correct frequency errors more quickly. PLL-A (100 kHz BW) responds 10x faster to phase/frequency errors than PLL-B (10 kHz BW), resulting in significantly shorter lock time."
  },
  {
    scenario: "An engineer increases the PLL loop bandwidth from 50 kHz to 500 kHz to achieve faster lock time. Output jitter measurements increase from 2 ps to 8 ps RMS.",
    question: "Why did the jitter increase with wider bandwidth?",
    options: [
      { id: 'a', label: "Wider bandwidth passes more reference clock noise and spurs to the output", correct: true },
      { id: 'b', label: "The VCO cannot oscillate at higher bandwidth settings" },
      { id: 'c', label: "Wider bandwidth reduces the divider accuracy" },
      { id: 'd', label: "Jitter always increases proportionally with any parameter change" }
    ],
    explanation: "The PLL loop bandwidth determines what noise passes through. Wider bandwidth passes more reference noise, charge pump noise, and reference spurs to the output. This is the fundamental lock-time vs. jitter tradeoff in PLL design."
  },
  {
    scenario: "A PLL's charge pump current is doubled from 100 uA to 200 uA while keeping the loop filter unchanged.",
    question: "How does doubling the charge pump current affect PLL behavior?",
    options: [
      { id: 'a', label: "The VCO output frequency doubles" },
      { id: 'b', label: "Loop bandwidth increases, giving faster lock but potentially less stability", correct: true },
      { id: 'c', label: "The reference frequency must also be doubled" },
      { id: 'd', label: "There is no effect - charge pump current does not affect loop dynamics" }
    ],
    explanation: "Charge pump current directly scales the loop gain. Doubling it increases the loop bandwidth (BW proportional to sqrt(Icp) for a type-II PLL), producing faster corrections but increasing the risk of instability if phase margin is reduced."
  },
  {
    scenario: "A VCO has Kvco = 100 MHz/V. The loop filter output changes by 0.5V.",
    question: "How much does the VCO frequency change?",
    options: [
      { id: 'a', label: "0.5 MHz" },
      { id: 'b', label: "50 MHz - because deltaF = Kvco x deltaV", correct: true },
      { id: 'c', label: "100 MHz" },
      { id: 'd', label: "200 MHz" }
    ],
    explanation: "VCO gain (Kvco) converts control voltage changes to frequency changes: deltaF = Kvco x deltaV = 100 MHz/V x 0.5 V = 50 MHz. Higher Kvco means more frequency sensitivity to voltage noise, which can increase jitter."
  },
  {
    scenario: "A PLL output spectrum shows large spurs (spurious tones) at offsets of exactly Fref from the carrier.",
    question: "What is the most likely cause of these reference spurs?",
    options: [
      { id: 'a', label: "The VCO is oscillating at multiple harmonics" },
      { id: 'b', label: "Charge pump current mismatch leaks reference-frequency ripple through the loop filter to the VCO", correct: true },
      { id: 'c', label: "The crystal oscillator is defective" },
      { id: 'd', label: "The divider is introducing frequency errors" }
    ],
    explanation: "Reference spurs at Fref offsets are caused by charge pump UP/DOWN current mismatch or leakage. The PFD produces pulses at Fref, and any mismatch creates a periodic ripple on the VCO control voltage, modulating the output frequency at Fref intervals."
  },
  {
    scenario: "During lock acquisition, the VCO frequency overshoots the target by 15 MHz, then undershoots by 5 MHz, before settling within 100 Hz of the target.",
    question: "What does this oscillatory settling behavior indicate about the loop dynamics?",
    options: [
      { id: 'a', label: "The PLL is broken and will never achieve stable lock" },
      { id: 'b', label: "The loop is underdamped - it has sufficient bandwidth but less than optimal damping", correct: true },
      { id: 'c', label: "The VCO tuning range is too narrow" },
      { id: 'd', label: "The reference crystal has excessive jitter" }
    ],
    explanation: "Decaying oscillation during lock acquisition indicates an underdamped second-order response. The loop eventually locks but the ringing wastes time. Increasing the damping factor (typically by adjusting the loop filter resistor) would reduce overshoot and speed settling."
  },
  {
    scenario: "A fractional-N PLL synthesizes 1.8432 GHz from a 10 MHz reference using N = 184.32. The output shows elevated noise at offsets below 100 kHz.",
    question: "What is the primary source of the elevated close-in noise?",
    options: [
      { id: 'a', label: "The crystal reference is degraded" },
      { id: 'b', label: "Quantization noise from the sigma-delta modulator used for fractional division", correct: true },
      { id: 'c', label: "VCO phase noise at close-in offsets" },
      { id: 'd', label: "Thermal noise from the loop filter resistor" }
    ],
    explanation: "Fractional-N PLLs use sigma-delta modulators to dither the divider ratio, producing fractional averages. This introduces quantization noise that appears as elevated phase noise at close-in offsets. The loop filter must be designed to attenuate this noise."
  }
];

// ---------------------------------------------------------------------------
// REAL-WORLD APPLICATIONS
// ---------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '📱',
    title: '5G/LTE Frequency Synthesis',
    short: 'Cellular radio PLLs',
    tagline: 'Generating precise carrier frequencies for wireless communication',
    description: 'Every 5G and LTE smartphone contains multiple PLLs that synthesize exact carrier frequencies (600 MHz to 6 GHz) from a single 26 or 38.4 MHz crystal. The PLL must lock within microseconds during channel switching.',
    connection: 'Fast PLL lock time enables rapid channel hopping in 5G NR carrier aggregation. The bandwidth-jitter tradeoff directly determines whether the phone can meet 3GPP EVM (Error Vector Magnitude) requirements for 256-QAM modulation.',
    howItWorks: 'Fractional-N PLLs with sigma-delta modulators allow fine frequency resolution. Loop bandwidth is optimized for each band: wider for fast lock during handover, narrower for lowest phase noise during data transmission.',
    stats: [
      { value: '< 20 us', label: 'Lock time requirement', icon: '⏱' },
      { value: '100+ channels', label: 'Frequency synthesizer range', icon: '📊' },
      { value: '-40 dBc', label: 'Typical spur specification', icon: '📈' }
    ],
    examples: ['5G NR channel switching', 'LTE carrier aggregation', 'Wi-Fi 6E/7 band selection', 'Bluetooth frequency hopping'],
    companies: ['Qualcomm', 'MediaTek', 'Analog Devices', 'Texas Instruments'],
    futureImpact: 'Sub-THz 6G systems will require PLLs operating above 100 GHz with sub-picosecond jitter, pushing semiconductor technology to its limits.',
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'High-Speed SerDes Clocking',
    short: 'PCIe/USB/Ethernet PLLs',
    tagline: 'Clock synthesis and recovery for multi-gigabit links',
    description: 'PCIe 6.0 (64 GT/s), USB4 (40 Gbps), and 800G Ethernet all rely on PLLs to synthesize precise transmit clocks and recover embedded clocks from received data. Jitter budgets are measured in femtoseconds.',
    connection: 'The PLL loop bandwidth determines how much VCO phase noise versus reference noise appears at the output. For SerDes, the jitter transfer function must meet strict compliance masks to ensure interoperability.',
    howItWorks: 'LC-VCO PLLs provide lowest phase noise for multi-GHz clocks. CDR (clock-data recovery) PLLs in receivers track incoming data timing. Both use carefully optimized loop bandwidths to meet jitter specifications.',
    stats: [
      { value: '64 GT/s', label: 'PCIe 6.0 data rate', icon: '🚀' },
      { value: '< 100 fs', label: 'RMS jitter target', icon: '🎯' },
      { value: '200 fJ/bit', label: 'CDR PLL energy', icon: '⚡' }
    ],
    examples: ['Data center switches', 'GPU interconnects', 'NVMe storage', 'AI accelerator fabrics'],
    companies: ['Broadcom', 'Marvell', 'Synopsys', 'Cadence'],
    futureImpact: '224 Gbps SerDes will require PAM4 signaling with sub-50 fs jitter PLLs, driving innovations in digital PLL architectures.',
    color: '#8B5CF6'
  },
  {
    icon: '📡',
    title: 'Radar and Satellite Systems',
    short: 'Ultra-low phase noise synthesis',
    tagline: 'Clean frequency sources for detection and ranging',
    description: 'Radar systems use PLLs to generate chirp waveforms and local oscillator signals. Phase noise directly limits detection sensitivity - a noisy LO smears targets and reduces the ability to detect small objects near large ones.',
    connection: 'PLL loop bandwidth controls the crossover between reference noise and VCO noise. For radar, extremely narrow bandwidth (< 1 kHz) minimizes close-in phase noise, even though lock time may be milliseconds.',
    howItWorks: 'Multi-loop PLL architectures use a clean reference PLL feeding a fine-resolution synthesizer. The outer loop has very narrow bandwidth for low phase noise, while an inner acquisition aid provides fast initial lock.',
    stats: [
      { value: '-115 dBc/Hz', label: 'Phase noise at 10 kHz offset', icon: '📡' },
      { value: '77 GHz', label: 'Automotive radar frequency', icon: '🚗' },
      { value: '0.1 Hz', label: 'Frequency resolution', icon: '🔬' }
    ],
    examples: ['Automotive FMCW radar', 'Air traffic control', 'Weather radar', 'Satellite transponders'],
    companies: ['Analog Devices', 'Renesas', 'Skyworks', 'MACOM'],
    futureImpact: 'Autonomous vehicles will need radar PLLs with both fast chirp rates and ultra-low phase noise for simultaneous range and velocity measurement.',
    color: '#10B981'
  },
  {
    icon: '🎵',
    title: 'Audio and Precision Clocking',
    short: 'Low-jitter sample clocks',
    tagline: 'Precise timing for analog-to-digital conversion',
    description: 'Professional audio equipment, software-defined radios, and scientific instruments use PLLs to generate ultra-low-jitter sample clocks. Even 1 ps of jitter at 192 kHz audio sampling degrades SNR.',
    connection: 'The PLL bandwidth-jitter tradeoff is critical: the loop must be narrow enough to clean VCO noise but wide enough to track reference frequency changes. Clock jitter is the dominant limit on ADC dynamic range.',
    howItWorks: 'Crystal-based VCXOs or MEMS oscillators are locked to stable references via very narrow bandwidth PLLs (10-100 Hz). The resulting clock has the long-term accuracy of the reference and the short-term stability of the VCO.',
    stats: [
      { value: '< 1 ps', label: 'RMS jitter target', icon: '🎯' },
      { value: '120 dB', label: 'Target dynamic range', icon: '📊' },
      { value: '768 kHz', label: 'Max sample rate', icon: '🎵' }
    ],
    examples: ['Studio recording interfaces', 'Medical ultrasound', 'Test and measurement', 'Radio astronomy'],
    companies: ['SiTime', 'Skyworks (Si Labs)', 'Renesas', 'Microchip'],
    futureImpact: 'Next-generation ADCs targeting 20+ effective bits will require femtosecond-class clock jitter, driving PLL innovation in noise shaping and filtering.',
    color: '#F59E0B'
  }
];

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
const PLLLockDynamicsRenderer: React.FC<PLLLockDynamicsRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [refFrequency, setRefFrequency] = useState(10); // MHz
  const [dividerN, setDividerN] = useState(100); // Division ratio
  const [loopBandwidth, setLoopBandwidth] = useState(50); // kHz
  const [chargePumpCurrent, setChargePumpCurrent] = useState(100); // uA
  const [kvco, setKvco] = useState(100); // MHz/V
  const [animationFrame, setAnimationFrame] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);

  // Twist play state
  const [twistBandwidth, setTwistBandwidth] = useState(50);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict phase step tracking
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
      if (simRunning) {
        setSimTime(t => Math.min(t + 0.02, 1.0));
      }
    }, 50);
    return () => clearInterval(timer);
  }, [simRunning]);

  // Colors - dark theme
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#6366f1', // Indigo for PLL/frequency theme
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    vcoColor: '#06B6D4',
    refColor: '#F59E0B',
    lockColor: '#10B981',
    errorColor: '#EF4444',
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
    twist_play: 'Bandwidth Tradeoff',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'pll_lock_dynamics',
      gameTitle: 'PLL Lock Dynamics',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent('phase_changed', { phase: p });
    setPhase(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitEvent]);

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

  // ---------------------------------------------------------------------------
  // PLL SIMULATION CALCULATIONS
  // ---------------------------------------------------------------------------
  const calculatePLL = useCallback(() => {
    const fTarget = refFrequency * dividerN; // Target VCO frequency in MHz
    const bwNorm = loopBandwidth / 1000; // Normalized bandwidth
    const dampingFactor = 0.707 + (chargePumpCurrent / 500); // Damping
    const naturalFreq = bwNorm * 2 * Math.PI; // Natural frequency (simplified)

    // Lock time estimation (simplified second-order model)
    // Lock time ~ 2*pi*N / (bandwidth * damping)
    const lockCycles = (2 * Math.PI * 5) / (bwNorm * dampingFactor);
    const lockTimeUs = lockCycles / refFrequency; // microseconds

    // Jitter estimation (simplified)
    // Wider bandwidth => more reference noise passed => higher jitter
    const baseJitter = 0.5; // ps baseline
    const bwJitter = baseJitter * Math.sqrt(loopBandwidth / 10); // Scales with sqrt(BW)
    const vcoJitter = 2.0 / Math.sqrt(loopBandwidth / 10); // VCO noise filtered by BW
    const totalJitter = Math.sqrt(bwJitter * bwJitter + vcoJitter * vcoJitter);

    // Phase error during lock (decaying sinusoid)
    const getPhaseError = (t: number) => {
      const decay = Math.exp(-dampingFactor * naturalFreq * t * 50);
      const oscillation = Math.cos(naturalFreq * t * 50 * Math.sqrt(1 - dampingFactor * dampingFactor));
      return decay * oscillation * 100; // degrees
    };

    // VCO frequency during lock
    const getVcoFreq = (t: number) => {
      const fInitial = fTarget * 0.85; // Start 15% low
      const decay = Math.exp(-dampingFactor * naturalFreq * t * 50);
      const dampedFreq = 1 - decay * Math.cos(naturalFreq * t * 50 * Math.sqrt(Math.max(0, 1 - dampingFactor * dampingFactor)));
      return fInitial + (fTarget - fInitial) * dampedFreq;
    };

    // Lock status based on time
    const getLockStatus = (t: number) => {
      const error = Math.abs(getPhaseError(t));
      if (error < 1) return 'locked';
      if (error < 10) return 'acquiring';
      return 'unlocked';
    };

    return {
      fTarget,
      lockTimeUs,
      totalJitter,
      bwJitter,
      vcoJitter,
      dampingFactor,
      getPhaseError,
      getVcoFreq,
      getLockStatus,
    };
  }, [refFrequency, dividerN, loopBandwidth, chargePumpCurrent, kvco]);

  const pllMetrics = calculatePLL();

  // ---------------------------------------------------------------------------
  // SVG COMPONENTS
  // ---------------------------------------------------------------------------

  // PLL Block Diagram
  const renderPLLBlockDiagram = (compact = false) => {
    const width = isMobile ? 340 : 520;
    const height = compact ? (isMobile ? 160 : 200) : (isMobile ? 200 : 240);
    const lockStatus = pllMetrics.getLockStatus(simTime);

    const lockIndicatorColor = lockStatus === 'locked' ? colors.lockColor
      : lockStatus === 'acquiring' ? colors.warning : colors.errorColor;

    const blockW = isMobile ? 56 : 72;
    const blockH = isMobile ? 28 : 34;
    const startX = isMobile ? 20 : 30;
    const startY = isMobile ? 50 : 60;
    const gapX = isMobile ? 12 : 20;

    const blocks = [
      { label: 'PFD', x: startX, y: startY, color: '#6366f1' },
      { label: 'CP', x: startX + (blockW + gapX), y: startY, color: '#8B5CF6' },
      { label: 'LPF', x: startX + 2 * (blockW + gapX), y: startY, color: '#A78BFA' },
      { label: 'VCO', x: startX + 3 * (blockW + gapX), y: startY, color: colors.vcoColor },
    ];

    const dividerX = startX + 2 * (blockW + gapX);
    const dividerY = startY + blockH + (isMobile ? 40 : 55);
    const outX = blocks[3].x + blockW;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="PLL Block Diagram">
        <defs>
          <marker id="arrowPLL" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={colors.textMuted} />
          </marker>
          <filter id="glowPLL" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={18} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Phase-Locked Loop Block Diagram
        </text>

        {/* Lock indicator */}
        <circle cx={width - 20} cy={18} r={6} fill={lockIndicatorColor} filter="url(#glowPLL)">
          <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <text x={width - 32} y={22} fill={lockIndicatorColor} fontSize="9" textAnchor="end" fontWeight="600">
          {lockStatus === 'locked' ? 'LOCKED' : lockStatus === 'acquiring' ? 'ACQNG' : 'UNLOCKED'}
        </text>

        {/* Reference input */}
        <text x={startX - 4} y={startY - 8} fill={colors.refColor} fontSize={isMobile ? '9' : '10'} textAnchor="start" fontWeight="600">
          Fref = {refFrequency} MHz
        </text>
        <line x1={startX - 10} y1={startY + blockH / 2} x2={startX} y2={startY + blockH / 2}
          stroke={colors.refColor} strokeWidth="2" markerEnd="url(#arrowPLL)" />

        {/* Blocks */}
        {blocks.map((block, i) => (
          <g key={block.label}>
            <rect x={block.x} y={block.y} width={blockW} height={blockH} rx="6"
              fill={`${block.color}22`} stroke={block.color} strokeWidth="1.5" />
            <text x={block.x + blockW / 2} y={block.y + blockH / 2 + 4}
              fill={block.color} fontSize={isMobile ? '10' : '12'} textAnchor="middle" fontWeight="700">
              {block.label}
            </text>
            {/* Arrows between blocks */}
            {i < blocks.length - 1 && (
              <line x1={block.x + blockW} y1={block.y + blockH / 2}
                x2={blocks[i + 1].x} y2={blocks[i + 1].y + blockH / 2}
                stroke={colors.textMuted} strokeWidth="1.5" markerEnd="url(#arrowPLL)" />
            )}
          </g>
        ))}

        {/* Output arrow and label */}
        <line x1={outX} y1={startY + blockH / 2} x2={outX + 20} y2={startY + blockH / 2}
          stroke={colors.vcoColor} strokeWidth="2" markerEnd="url(#arrowPLL)" />
        <text x={outX + 24} y={startY + blockH / 2 - 6} fill={colors.vcoColor} fontSize={isMobile ? '9' : '10'} fontWeight="600">
          Fout = {(refFrequency * dividerN).toFixed(0)} MHz
        </text>

        {/* Feedback path - down from VCO output, left along bottom, up to PFD */}
        <line x1={outX + 10} y1={startY + blockH / 2} x2={outX + 10} y2={dividerY + blockH / 2}
          stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="4,2" />
        <line x1={outX + 10} y1={dividerY + blockH / 2} x2={dividerX + blockW} y2={dividerY + blockH / 2}
          stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="4,2" />

        {/* Divider block */}
        <rect x={dividerX} y={dividerY} width={blockW} height={blockH} rx="6"
          fill="rgba(245,158,11,0.15)" stroke={colors.refColor} strokeWidth="1.5" />
        <text x={dividerX + blockW / 2} y={dividerY + blockH / 2 + 4}
          fill={colors.refColor} fontSize={isMobile ? '10' : '12'} textAnchor="middle" fontWeight="700">
          / N
        </text>
        <text x={dividerX + blockW / 2} y={dividerY + blockH + 14}
          fill={colors.textMuted} fontSize={isMobile ? '8' : '9'} textAnchor="middle">
          N = {dividerN}
        </text>

        {/* Feedback line from divider to PFD */}
        <line x1={dividerX} y1={dividerY + blockH / 2} x2={startX + blockW / 2} y2={dividerY + blockH / 2}
          stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="4,2" />
        <line x1={startX + blockW / 2} y1={dividerY + blockH / 2} x2={startX + blockW / 2} y2={startY + blockH}
          stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#arrowPLL)" />

        {/* Feedback label */}
        <text x={startX + blockW / 2 - 8} y={dividerY + blockH / 2 - 6}
          fill={colors.textMuted} fontSize={isMobile ? '8' : '9'} textAnchor="end">
          Fout/N = Fref
        </text>
      </svg>
    );
  };

  // VCO Frequency vs Time Plot
  const renderVcoFreqPlot = (showPhaseError = false) => {
    const width = isMobile ? 340 : 520;
    const height = isMobile ? 180 : 220;
    const pad = { top: 30, right: 20, bottom: 35, left: 55 };
    const pw = width - pad.left - pad.right;
    const ph = height - pad.top - pad.bottom;

    const fTarget = pllMetrics.fTarget;
    const points = 80;

    // Generate VCO frequency trace
    const vcoPath: string[] = [];
    const phaseErrorPath: string[] = [];

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * simTime;
      const freq = pllMetrics.getVcoFreq(t);
      const x = pad.left + (i / points) * pw;

      // Normalize to plot range (fTarget * 0.8 to fTarget * 1.15)
      const fMin = fTarget * 0.8;
      const fMax = fTarget * 1.15;
      const yFreq = pad.top + ph - ((freq - fMin) / (fMax - fMin)) * ph;

      if (i === 0) vcoPath.push(`M ${x} ${yFreq}`);
      else vcoPath.push(`L ${x} ${yFreq}`);

      if (showPhaseError) {
        const phaseErr = pllMetrics.getPhaseError(t);
        const yErr = pad.top + ph / 2 - (phaseErr / 100) * (ph / 2);
        if (i === 0) phaseErrorPath.push(`M ${x} ${yErr}`);
        else phaseErrorPath.push(`L ${x} ${yErr}`);
      }
    }

    // Target frequency line Y position
    const fMin = fTarget * 0.8;
    const fMax = fTarget * 1.15;
    const targetY = pad.top + ph - ((fTarget - fMin) / (fMax - fMin)) * ph;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="VCO Frequency vs Time">
        <defs>
          <linearGradient id="vcoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.vcoColor} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
          {showPhaseError ? 'Phase Error vs Time' : 'VCO Frequency vs Time'}
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line key={`h-${frac}`} x1={pad.left} y1={pad.top + frac * ph}
            x2={pad.left + pw} y2={pad.top + frac * ph}
            stroke={colors.border} strokeDasharray="3,3" opacity={0.4} />
        ))}

        {/* Target frequency line */}
        {!showPhaseError && (
          <g>
            <line x1={pad.left} y1={targetY} x2={pad.left + pw} y2={targetY}
              stroke={colors.lockColor} strokeWidth="1.5" strokeDasharray="6,3" opacity={0.7} />
            <text x={pad.left + pw + 4} y={targetY + 4} fill={colors.lockColor} fontSize="9" fontWeight="600">
              Target
            </text>
          </g>
        )}

        {/* Zero line for phase error */}
        {showPhaseError && (
          <line x1={pad.left} y1={pad.top + ph / 2} x2={pad.left + pw} y2={pad.top + ph / 2}
            stroke={colors.lockColor} strokeWidth="1" strokeDasharray="4,2" opacity={0.5} />
        )}

        {/* VCO frequency or phase error trace */}
        {!showPhaseError && vcoPath.length > 0 && (
          <path d={vcoPath.join(' ')} fill="none" stroke="url(#vcoGrad)" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {showPhaseError && phaseErrorPath.length > 0 && (
          <path d={phaseErrorPath.join(' ')} fill="none" stroke={colors.errorColor} strokeWidth="2" strokeLinecap="round" />
        )}

        {/* X-axis label */}
        <text x={pad.left + pw / 2} y={height - 6} fill={colors.textMuted} fontSize="10" textAnchor="middle">
          Time
        </text>

        {/* Y-axis label */}
        <text x={12} y={pad.top + ph / 2} fill={colors.textMuted} fontSize="10"
          textAnchor="middle" transform={`rotate(-90, 12, ${pad.top + ph / 2})`}>
          {showPhaseError ? 'Phase Error (deg)' : 'Frequency (MHz)'}
        </text>

        {/* Y-axis values */}
        {!showPhaseError && (
          <>
            <text x={pad.left - 4} y={pad.top + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">
              {(fMax).toFixed(0)}
            </text>
            <text x={pad.left - 4} y={pad.top + ph + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">
              {(fMin).toFixed(0)}
            </text>
          </>
        )}
      </svg>
    );
  };

  // Jitter Spectrum Visualization (for twist play)
  const renderJitterSpectrum = (bw: number) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 140 : 170;
    const pad = { top: 28, right: 15, bottom: 30, left: 45 };
    const pw = width - pad.left - pad.right;
    const ph = height - pad.top - pad.bottom;

    // Generate noise spectrum: reference noise passes below BW, VCO noise above BW
    const points = 100;
    const path: string[] = [];
    for (let i = 0; i <= points; i++) {
      const freqLog = (i / points) * 4; // 1 Hz to 10000 Hz (log scale)
      const freq = Math.pow(10, freqLog);
      const bwHz = bw * 1000;

      // Reference noise (flat, passed below BW)
      const refNoise = -100 + 20 * Math.log10(Math.max(0.01, 1 / (1 + Math.pow(freq / bwHz, 2))));
      // VCO noise (1/f^2, passed above BW)
      const vcoNoise = -80 + 20 * Math.log10(Math.max(0.01, Math.pow(freq / bwHz, 2) / (1 + Math.pow(freq / bwHz, 2)))) - 20 * Math.log10(Math.max(1, freq / 1000));
      // Total noise
      const totalNoise = 10 * Math.log10(Math.pow(10, refNoise / 10) + Math.pow(10, vcoNoise / 10));

      const x = pad.left + (i / points) * pw;
      const yNorm = Math.max(0, Math.min(1, (totalNoise + 140) / 80));
      const y = pad.top + ph - yNorm * ph;

      if (i === 0) path.push(`M ${x} ${y}`);
      else path.push(`L ${x} ${y}`);
    }

    // BW marker position
    const bwLogPos = Math.log10(bw * 1000) / 4;
    const bwX = pad.left + bwLogPos * pw;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="Jitter Spectrum">
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
          Output Phase Noise (BW = {bw} kHz)
        </text>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line key={`g-${frac}`} x1={pad.left} y1={pad.top + frac * ph}
            x2={pad.left + pw} y2={pad.top + frac * ph}
            stroke={colors.border} strokeDasharray="2,2" opacity={0.3} />
        ))}

        {/* BW marker */}
        <line x1={bwX} y1={pad.top} x2={bwX} y2={pad.top + ph}
          stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4,2" opacity={0.8} />
        <text x={bwX} y={pad.top - 4} fill={colors.accent} fontSize="9" textAnchor="middle" fontWeight="600">
          BW
        </text>

        {/* Labels: Ref noise region, VCO noise region */}
        <text x={pad.left + bwLogPos * pw * 0.3} y={pad.top + 14} fill={colors.refColor} fontSize="8" textAnchor="middle" opacity={0.7}>
          Ref noise
        </text>
        <text x={bwX + (pad.left + pw - bwX) * 0.5} y={pad.top + 14} fill={colors.vcoColor} fontSize="8" textAnchor="middle" opacity={0.7}>
          VCO noise
        </text>

        {/* Noise trace */}
        <path d={path.join(' ')} fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />

        {/* Axes */}
        <text x={pad.left + pw / 2} y={height - 6} fill={colors.textMuted} fontSize="9" textAnchor="middle">
          Offset Frequency (log)
        </text>
        <text x={10} y={pad.top + ph / 2} fill={colors.textMuted} fontSize="9"
          textAnchor="middle" transform={`rotate(-90, 10, ${pad.top + ph / 2})`}>
          dBc/Hz
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // SHARED UI COMPONENTS
  // ---------------------------------------------------------------------------

  const renderNavBar = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${colors.border}`,
      padding: '12px 20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <button onClick={prevPhase} disabled={phaseOrder.indexOf(phase) === 0}
        style={{ background: 'none', border: 'none', color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textSecondary, cursor: 'pointer', fontSize: '14px', padding: '4px 8px', minHeight: '32px' }}>
        Back
      </button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: colors.accent }}>PLL Lock Dynamics</div>
        <div style={{ fontSize: '11px', color: colors.textMuted }}>{phaseLabels[phase]}</div>
      </div>
      <div style={{ fontSize: '12px', color: colors.textMuted, minWidth: '40px', textAlign: 'right' }}>
        {phaseOrder.indexOf(phase) + 1}/{phaseOrder.length}
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const progress = ((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 99, height: '3px', background: colors.border }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${colors.accent}, ${colors.vcoColor})`, transition: 'width 0.4s ease' }} />
      </div>
    );
  };

  const renderNavDots = () => (
    <div style={{
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '6px', zIndex: 100,
      background: 'rgba(10, 10, 15, 0.8)', padding: '8px 16px', borderRadius: '20px',
    }}>
      {phaseOrder.map((p, i) => (
        <button key={p} onClick={() => goToPhase(p)}
          style={{
            border: 'none', padding: 0, cursor: 'pointer', background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '16px', minHeight: '16px',
          }}
          aria-label={phaseLabels[p]}>
          <span style={{
            width: phase === p ? '24px' : '8px', height: '8px', borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            transition: 'all 0.3s',
          }} />
        </button>
      ))}
    </div>
  );

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
    color: 'white', border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px', fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease', minHeight: '44px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px', borderRadius: '10px',
    border: `1px solid ${colors.border}`, background: 'transparent',
    color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%', height: '20px', touchAction: 'pan-y',
    WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard, borderRadius: '12px', padding: '20px',
    border: `1px solid ${colors.border}`,
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '84px', textAlign: 'center', overflowY: 'auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pllPulse 2s infinite' }}>
            📡🔄
          </div>
          <style>{`@keyframes pllPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            PLL Lock Dynamics
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
            "How does your phone generate a precise <span style={{ color: colors.vcoColor }}>1.8 GHz signal</span> from a tiny 26 MHz crystal? The answer is a Phase-Locked Loop -- one of the most important circuits in all of electronics."
          </p>

          <div style={{ ...cardStyle, marginBottom: '32px', maxWidth: '520px' }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Every phone, Wi-Fi router, and USB port uses a PLL to synthesize precise frequencies.
              The PLL's <span style={{ color: colors.accent }}>voltage-controlled oscillator (VCO)</span> hunts
              for the right frequency, guided by a feedback loop that compares the output to a
              crystal reference. Watch it lock on -- or fail trying.
            </p>
          </div>

          <div style={{ ...cardStyle, marginBottom: '32px', maxWidth: '520px', borderLeft: `3px solid ${colors.refColor}` }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
              "The PLL is the Swiss Army knife of electronics -- frequency synthesis, clock recovery,
              demodulation -- it does it all with one elegant feedback loop."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
              -- Analog Circuit Design Principle
            </p>
          </div>

          <button onClick={() => { playSound('click'); emitEvent('game_started'); nextPhase(); }} style={primaryButtonStyle}>
            Explore PLL Lock-in →
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The VCO jumps instantly to the target frequency with no delay' },
      { id: 'b', text: 'The VCO frequency oscillates around the target and gradually settles -- wider bandwidth means faster settling' },
      { id: 'c', text: 'The VCO stays at its free-running frequency and the reference adapts instead' },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Step {predictStep + 1} of 2</span>
            </div>

            <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.accent}44` }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              A PLL has Fref = 10 MHz, N = 100 (target = 1 GHz), and loop bandwidth of 50 kHz.
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              When powered on, the VCO starts at 850 MHz. What happens as the PLL tries to lock?
            </p>

            {/* Static diagram */}
            <div style={{ ...cardStyle, marginBottom: '24px', textAlign: 'center' }}>
              {renderPLLBlockDiagram(true)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); setPredictStep(1); emitEvent('prediction_made', { prediction: opt.id }); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s', minHeight: '44px',
                  }}>
                  <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ background: `${colors.success}15`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.success}33` }}>
                <p style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>Prediction recorded!</p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Let's find out by experimenting with the PLL. You will adjust parameters and watch the VCO frequency converge (or not!).
                </p>
              </div>
            )}

            <button onClick={() => { playSound('success'); nextPhase(); }}
              disabled={!prediction}
              style={{ ...primaryButtonStyle, width: '100%', opacity: prediction ? 1 : 0.5, cursor: prediction ? 'pointer' : 'not-allowed' }}>
              Test Your Prediction →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const lockStatus = pllMetrics.getLockStatus(simTime);
    const lockColor = lockStatus === 'locked' ? colors.lockColor : lockStatus === 'acquiring' ? colors.warning : colors.errorColor;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              PLL Lock-In Experiment
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Adjust parameters and watch the VCO lock onto the target frequency
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
              {/* LEFT: Visualizations */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Block diagram */}
                <div style={{ textAlign: 'center' }}>
                  {renderPLLBlockDiagram()}
                </div>
                {/* VCO freq plot */}
                <div style={{ textAlign: 'center' }}>
                  {renderVcoFreqPlot()}
                </div>
                {/* Phase error plot */}
                <div style={{ textAlign: 'center' }}>
                  {renderVcoFreqPlot(true)}
                </div>
              </div>

              {/* RIGHT: Controls */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Lock status indicator */}
                <div style={{ ...cardStyle, marginBottom: '16px', textAlign: 'center', borderLeft: `3px solid ${lockColor}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: lockColor, marginBottom: '4px' }}>
                    {lockStatus === 'locked' ? 'LOCKED' : lockStatus === 'acquiring' ? 'ACQUIRING...' : 'UNLOCKED'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    Fout = {pllMetrics.getVcoFreq(simTime).toFixed(1)} MHz
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    Target = {pllMetrics.fTarget.toFixed(0)} MHz
                  </div>
                </div>

                {/* Start/Reset */}
                <button
                  onClick={() => {
                    if (simRunning) {
                      setSimRunning(false);
                      setSimTime(0);
                    } else {
                      setSimTime(0);
                      setSimRunning(true);
                    }
                    playSound('click');
                    emitEvent('button_clicked', { action: simRunning ? 'reset' : 'start' });
                  }}
                  style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px', fontSize: '14px', padding: '12px' }}>
                  {simRunning ? 'Reset Simulation' : 'Start PLL Lock'}
                </button>

                {/* Reference Frequency */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Fref</span>
                    <span style={{ ...typo.small, color: colors.refColor, fontWeight: 600 }}>{refFrequency} MHz</span>
                  </div>
                  <input type="range" min="1" max="50" step="1" value={refFrequency}
                    onChange={e => { setRefFrequency(parseInt(e.target.value)); setSimTime(0); setSimRunning(false); }}
                    style={sliderStyle} />
                </div>

                {/* Division Ratio */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Divider N</span>
                    <span style={{ ...typo.small, color: colors.refColor, fontWeight: 600 }}>{dividerN}</span>
                  </div>
                  <input type="range" min="10" max="200" step="5" value={dividerN}
                    onChange={e => { setDividerN(parseInt(e.target.value)); setSimTime(0); setSimRunning(false); }}
                    style={sliderStyle} />
                </div>

                {/* Loop Bandwidth */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Loop BW</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{loopBandwidth} kHz</span>
                  </div>
                  <input type="range" min="1" max="500" step="5" value={loopBandwidth}
                    onChange={e => { setLoopBandwidth(parseInt(e.target.value)); setSimTime(0); setSimRunning(false); emitEvent('slider_changed', { param: 'loopBandwidth', value: parseInt(e.target.value) }); }}
                    style={sliderStyle} />
                </div>

                {/* Charge Pump Current */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Charge Pump</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{chargePumpCurrent} uA</span>
                  </div>
                  <input type="range" min="10" max="500" step="10" value={chargePumpCurrent}
                    onChange={e => { setChargePumpCurrent(parseInt(e.target.value)); setSimTime(0); setSimRunning(false); }}
                    style={sliderStyle} />
                </div>

                {/* VCO Gain */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Kvco</span>
                    <span style={{ ...typo.small, color: colors.vcoColor, fontWeight: 600 }}>{kvco} MHz/V</span>
                  </div>
                  <input type="range" min="10" max="500" step="10" value={kvco}
                    onChange={e => { setKvco(parseInt(e.target.value)); setSimTime(0); setSimRunning(false); }}
                    style={sliderStyle} />
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.accent, fontSize: '16px' }}>{pllMetrics.lockTimeUs.toFixed(1)} us</div>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Lock Time</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: pllMetrics.totalJitter < 3 ? colors.success : pllMetrics.totalJitter < 8 ? colors.warning : colors.error, fontSize: '16px' }}>
                      {pllMetrics.totalJitter.toFixed(1)} ps
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>RMS Jitter</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.vcoColor, fontSize: '16px' }}>{pllMetrics.fTarget.toFixed(0)}</div>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Target MHz</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.refColor, fontSize: '16px' }}>{pllMetrics.dampingFactor.toFixed(2)}</div>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Damping</div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}>
              Understand the PLL Feedback Loop →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              How the PLL Feedback Loop Works
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔄</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Core Equation: Fout = N x Fref</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The PLL divides its output by N and compares it to Fref. The loop adjusts until
                  Fout/N = Fref, giving <span style={{ color: colors.accent }}>Fout = N x Fref</span>.
                  Change N to change the output frequency -- this is frequency synthesis!
                </p>
              </div>

              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Phase/Frequency Detector (PFD)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The PFD compares the reference edge to the divided VCO edge. If VCO is too slow,
                  it outputs <span style={{ color: colors.lockColor }}>UP pulses</span>. If too fast,
                  <span style={{ color: colors.errorColor }}> DOWN pulses</span>. The pulse width encodes the phase error.
                </p>
              </div>

              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💧</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Charge Pump + Loop Filter</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The charge pump converts PFD pulses to current that charges or discharges the loop
                  filter capacitor. This creates the <span style={{ color: colors.vcoColor }}>VCO control voltage</span> --
                  a smoothed DC voltage that tells the VCO what frequency to produce.
                </p>
              </div>

              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎛</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Voltage-Controlled Oscillator (VCO)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The VCO converts control voltage to frequency: <span style={{ color: colors.vcoColor }}>deltaF = Kvco x deltaV</span>.
                  Higher Kvco means more frequency change per volt -- faster response but also more
                  sensitivity to noise on the control voltage.
                </p>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Lock Acquisition</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When powered on, the VCO is at the wrong frequency. The PFD detects large phase errors,
                  the charge pump drives the control voltage, and the VCO frequency hunts toward the target.
                  The loop behaves like a <span style={{ color: colors.accent }}>second-order control system</span> --
                  it can overshoot, ring, and eventually settle.
                </p>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Explore the Bandwidth Tradeoff →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Very wide bandwidth: fastest lock, lowest jitter -- best of both worlds' },
      { id: 'b', text: 'Very wide bandwidth: fastest lock but highest jitter; very narrow: slowest lock but lowest jitter' },
      { id: 'c', text: 'Loop bandwidth has no effect on jitter, only on lock time' },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Step {twistPredictStep + 1} of 2</span>
            </div>

            <div style={{ background: `${colors.warning}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.warning}44` }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>New Variable: Loop Bandwidth Tradeoff</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              What happens when you make the PLL loop bandwidth very wide (500 kHz) vs. very narrow (1 kHz)?
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Consider both lock time and output jitter.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); setTwistPredictStep(1); emitEvent('prediction_made', { twist: opt.id }); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s', minHeight: '44px',
                  }}>
                  <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ background: `${colors.success}15`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.success}33` }}>
                <p style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>Prediction recorded!</p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Let's explore the bandwidth-jitter tradeoff by sweeping bandwidth and measuring both lock time and jitter.
                </p>
              </div>
            )}

            <button onClick={() => { playSound('success'); nextPhase(); }}
              disabled={!twistPrediction}
              style={{ ...primaryButtonStyle, width: '100%', opacity: twistPrediction ? 1 : 0.5 }}>
              Explore the Tradeoff →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate metrics for twist bandwidth
    const twistBwNorm = twistBandwidth / 1000;
    const twistDamping = 0.707 + (chargePumpCurrent / 500);
    const twistLockCycles = (2 * Math.PI * 5) / (twistBwNorm * twistDamping);
    const twistLockTime = twistLockCycles / refFrequency;
    const twistBwJitter = 0.5 * Math.sqrt(twistBandwidth / 10);
    const twistVcoJitter = 2.0 / Math.sqrt(twistBandwidth / 10);
    const twistTotalJitter = Math.sqrt(twistBwJitter * twistBwJitter + twistVcoJitter * twistVcoJitter);

    const jitterColor = twistTotalJitter < 3 ? colors.success : twistTotalJitter < 8 ? colors.warning : colors.error;
    const lockTimeColor = twistLockTime < 5 ? colors.success : twistLockTime < 20 ? colors.warning : colors.error;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Bandwidth vs. Jitter Tradeoff
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Sweep the loop bandwidth and observe how lock time and jitter change
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
              {/* LEFT: Visualizations */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Jitter spectrum */}
                <div style={{ textAlign: 'center' }}>
                  {renderJitterSpectrum(twistBandwidth)}
                </div>

                {/* Comparison bar chart */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px', fontWeight: 600 }}>
                    Lock Time vs Jitter -- Find the Sweet Spot
                  </h3>

                  {/* Lock time bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Lock Time</span>
                      <span style={{ ...typo.small, color: lockTimeColor, fontWeight: 600 }}>{twistLockTime.toFixed(1)} us</span>
                    </div>
                    <div style={{ height: '12px', background: colors.bgSecondary, borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (twistLockTime / 50) * 100)}%`, background: lockTimeColor, borderRadius: '6px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Jitter bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>RMS Jitter</span>
                      <span style={{ ...typo.small, color: jitterColor, fontWeight: 600 }}>{twistTotalJitter.toFixed(1)} ps</span>
                    </div>
                    <div style={{ height: '12px', background: colors.bgSecondary, borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (twistTotalJitter / 15) * 100)}%`, background: jitterColor, borderRadius: '6px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Ref noise vs VCO noise breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.refColor }}>{twistBwJitter.toFixed(1)} ps</div>
                      <div style={{ fontSize: '10px', color: colors.textMuted }}>Ref Noise (passed)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.vcoColor }}>{twistVcoJitter.toFixed(1)} ps</div>
                      <div style={{ fontSize: '10px', color: colors.textMuted }}>VCO Noise (leaked)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Bandwidth slider and explanation */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Bandwidth slider */}
                <div style={{ ...cardStyle, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Loop Bandwidth</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>{twistBandwidth} kHz</span>
                  </div>
                  <input type="range" min="1" max="500" step="1" value={twistBandwidth}
                    onChange={e => { setTwistBandwidth(parseInt(e.target.value)); emitEvent('slider_changed', { param: 'twistBandwidth', value: parseInt(e.target.value) }); }}
                    style={sliderStyle} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>1 kHz (narrow)</span>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>500 kHz (wide)</span>
                  </div>
                </div>

                {/* Insight cards */}
                <div style={{ ...cardStyle, marginBottom: '12px', borderLeft: `3px solid ${colors.warning}` }}>
                  <p style={{ ...typo.small, color: colors.warning, fontWeight: 600, marginBottom: '6px' }}>Wide BW (&gt; 200 kHz)</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    Fast lock but passes reference noise and spurs. Output jitter increases.
                  </p>
                </div>

                <div style={{ ...cardStyle, marginBottom: '12px', borderLeft: `3px solid ${colors.vcoColor}` }}>
                  <p style={{ ...typo.small, color: colors.vcoColor, fontWeight: 600, marginBottom: '6px' }}>Narrow BW (&lt; 10 kHz)</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    Slow lock but excellent filtering. However, more VCO noise leaks through at high offsets.
                  </p>
                </div>

                <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '6px' }}>Optimal BW (~30-80 kHz)</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    Balances reference noise suppression with VCO noise filtering. The minimum total jitter point.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}>
              Understand the Tradeoff →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Bandwidth-Jitter Tradeoff
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎚</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Bandwidth as a Noise Crossover</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The loop bandwidth defines a <span style={{ color: colors.accent }}>crossover frequency</span>:
                  below the BW, reference noise dominates the output; above the BW, VCO noise dominates.
                  Total jitter is minimized where the two noise contributions are equal -- the optimal BW.
                </p>
              </div>

              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⏱</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Lock Time vs. BW</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Lock time is inversely proportional to bandwidth: <span style={{ color: colors.warning }}>T_lock ~ 2*pi*5 / BW</span>.
                  Doubling bandwidth roughly halves lock time. Applications like frequency-hopping radios need
                  wide bandwidth for fast channel switching, even at the cost of higher jitter.
                </p>
              </div>

              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Reference Spurs</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Wider bandwidth also passes more <span style={{ color: colors.errorColor }}>reference spurs</span> --
                  spectral lines at Fref offsets caused by charge pump mismatch. These appear as deterministic
                  jitter and can cause problems in RF and data converter applications.
                </p>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Design Strategy</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The optimal BW sits at the intersection of reference noise and VCO noise curves.
                  For a high-quality VCO (low noise), use <span style={{ color: colors.accent }}>narrow BW</span> to
                  maximize filtering. For a noisy VCO, use <span style={{ color: colors.accent }}>wider BW</span> to
                  let the clean reference dominate. Multi-loop architectures can achieve both fast lock and low jitter.
                </p>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              See Real-World Applications →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="PLL Lock Dynamics"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;

      // Build answer key
      const answerKey = testQuestions.map((q, i) => {
        const correctId = q.options.find(o => o.correct)?.id;
        const userAnswer = testAnswers[i];
        const isCorrect = userAnswer === correctId;
        return { ...q, correctId, userAnswer, isCorrect };
      });

      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px', paddingBottom: '80px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              {/* Score header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>
                <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>{passed ? 'Excellent!' : 'Keep Learning!'}</h2>
                <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>{testScore} / 10</p>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  {passed ? "You've mastered PLL Lock Dynamics!" : "Review the concepts and try again."}
                </p>
              </div>

              {/* Answer Key */}
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Key</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {answerKey.map((q, i) => {
                  const borderColor = q.isCorrect ? colors.success : (q.userAnswer === null ? colors.warning : colors.error);
                  const bgColor = q.isCorrect ? `${colors.success}11` : (q.userAnswer === null ? `${colors.warning}11` : `${colors.error}11`);
                  return (
                    <div key={i} style={{ background: bgColor, borderRadius: '12px', padding: '16px', border: `1px solid ${borderColor}33`, borderLeft: `4px solid ${borderColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Q{i + 1}: {q.question}</span>
                        <span style={{ fontSize: '16px' }}>{q.isCorrect ? '✓' : '✗'}</span>
                      </div>
                      <p style={{ ...typo.small, color: colors.textMuted, margin: 0, marginBottom: '4px' }}>
                        Your answer: {q.userAnswer ? q.options.find(o => o.id === q.userAnswer)?.label : 'No answer'}
                      </p>
                      {!q.isCorrect && (
                        <p style={{ ...typo.small, color: colors.success, margin: 0, marginBottom: '4px' }}>
                          Correct: {q.options.find(o => o.id === q.correctId)?.label}
                        </p>
                      )}
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              {passed ? (
                <button onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, width: '100%' }}>
                  Complete Lesson →
                </button>
              ) : (
                <button onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Review & Try Again
                </button>
              )}
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Test question view
    const question = testQuestions[currentQuestion];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>{question.question}</h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                    emitEvent('answer_submitted', { question: currentQuestion, answer: opt.id });
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', minHeight: '44px',
                  }}>
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{ ...secondaryButtonStyle, flex: 1 }}>
                  Previous
                </button>
              )}
              {currentQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                  disabled={!testAnswers[currentQuestion]}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
                  }}>
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
                    emitEvent('game_completed', { score, total: 10 });
                  }}
                  disabled={testAnswers.some(a => a === null)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
                  }}>
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', paddingTop: '84px', textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'pllBounce 1s infinite' }}>
              🏆
            </div>
            <style>{`@keyframes pllBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              PLL Lock Dynamics Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px' }}>
              You now understand how Phase-Locked Loops lock onto frequencies and the critical
              bandwidth-jitter tradeoff that governs all PLL design.
            </p>

            <div style={{
              ...cardStyle, maxWidth: '500px', margin: '0 auto 24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Score: {testScore} / 10 -- Grade: {testScore >= 9 ? 'A+' : testScore >= 8 ? 'A' : testScore >= 7 ? 'B' : 'C'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'PLL feedback: Fout = N x Fref',
                  'PFD, charge pump, loop filter, VCO roles',
                  'Lock acquisition dynamics (underdamped settling)',
                  'Loop bandwidth controls lock time',
                  'Bandwidth-jitter tradeoff: wide BW = fast lock + high jitter',
                  'Reference spurs from charge pump mismatch',
                  'VCO gain (Kvco) sensitivity',
                  'Fractional-N synthesis and quantization noise',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success, fontWeight: 700 }}>✓</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer key summary */}
            <div style={{ ...cardStyle, maxWidth: '500px', margin: '0 auto 24px', textAlign: 'left' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const isCorrect = testAnswers[i] === correctId;
                  const dotColor = isCorrect ? colors.success : (testAnswers[i] === null ? colors.warning : colors.error);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ ...typo.small, color: colors.textMuted }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : `Incorrect (correct: ${correctId?.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Game button - fixed bottom */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.98), rgba(10, 10, 15, 0.9))',
          borderTop: `1px solid ${colors.border}`, zIndex: 1000,
        }}>
          <button onClick={() => {
            emitEvent('game_completed', { score: testScore, total: 10 });
            onGameEvent?.({
              eventType: 'game_completed',
              gameType: 'pll_lock_dynamics',
              gameTitle: 'PLL Lock Dynamics',
              details: { type: 'mastery_achieved', score: testScore, total: 10 },
              timestamp: Date.now(),
            } as GameEvent);
            window.location.href = '/games';
          }}
            style={{
              width: '100%', minHeight: '52px', padding: '14px 24px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '12px',
              color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
            }}>
            Complete Game →
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PLLLockDynamicsRenderer;
