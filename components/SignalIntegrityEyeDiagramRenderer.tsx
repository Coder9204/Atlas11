'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Signal Integrity Eye Diagram - Complete 10-Phase Game (#260)
// Understanding eye diagrams for high-speed serial link quality evaluation
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

interface SignalIntegrityEyeDiagramRendererProps {
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
// Seeded pseudo-random number generator for deterministic eye traces
// ─────────────────────────────────────────────────────────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function gaussianRandom(seed: number): number {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 0.5);
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.001))) * Math.cos(2 * Math.PI * u2);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A signal integrity engineer is evaluating a 10 Gbps serial link. The oscilloscope displays an eye diagram with the vertical opening measured at 350 mV out of a 1000 mV swing.",
    question: "What does the eye height of 350 mV indicate about the link?",
    options: [
      { id: 'a', label: "The link is operating at maximum performance" },
      { id: 'b', label: "The vertical noise margin is 350 mV - the receiver must distinguish 1s from 0s within this voltage window", correct: true },
      { id: 'c', label: "The transmitter amplitude should be reduced to 350 mV" },
      { id: 'd', label: "The cable impedance is exactly 350 ohms" }
    ],
    explanation: "Eye height represents the vertical opening of the eye, which is the voltage margin available for the receiver to distinguish between logic 1 and logic 0. A 350 mV eye height out of 1000 mV means 65% of the original signal amplitude has been consumed by noise, ISI, and crosstalk."
  },
  {
    scenario: "An engineer notices that increasing the PCB trace length from 10 cm to 25 cm causes the eye diagram to close significantly at 5 Gbps, even though the same trace works fine at 1 Gbps.",
    question: "Why does the longer trace close the eye at higher data rates?",
    options: [
      { id: 'a', label: "The copper resistance increases with frequency" },
      { id: 'b', label: "Inter-symbol interference (ISI) increases because high-frequency components of the signal are attenuated more, causing previous bits to smear into current bits", correct: true },
      { id: 'c', label: "The connectors at each end create more noise at higher frequencies" },
      { id: 'd', label: "The oscilloscope bandwidth is insufficient" }
    ],
    explanation: "PCB traces act as low-pass filters - dielectric loss and skin effect attenuate higher frequency components more. At 5 Gbps, the signal's high-frequency content spans well beyond the channel bandwidth, causing severe ISI where energy from previous bit transitions bleeds into the current bit period, closing the eye."
  },
  {
    scenario: "A mask test on a 25 Gbps NRZ link shows that 15 out of 10,000 waveform samples violate the inner hexagonal mask region.",
    question: "What do these mask violations mean for the link?",
    options: [
      { id: 'a', label: "The link is performing perfectly within specification" },
      { id: 'b', label: "Some waveform trajectories pass through the keep-out region, indicating potential bit errors at the receiver", correct: true },
      { id: 'c', label: "The mask template needs to be resized" },
      { id: 'd', label: "The transmitter is outputting too much power" }
    ],
    explanation: "Eye diagram mask testing defines a keep-out region in the center of the eye. Any waveform trace that crosses into this region represents a signal condition that could cause a bit error. 15 violations out of 10,000 samples indicates a marginal link that may not meet BER requirements."
  },
  {
    scenario: "Two identical 10 Gbps links are measured. Link A has an eye width of 80 ps with RMS jitter of 5 ps. Link B has an eye width of 40 ps with RMS jitter of 12 ps.",
    question: "Which link will have a lower bit error rate (BER), and why?",
    options: [
      { id: 'a', label: "Link B, because it has more jitter to average out errors" },
      { id: 'b', label: "Link A, because wider eye width and lower jitter give the receiver more time to sample valid data", correct: true },
      { id: 'c', label: "Both links will have identical BER" },
      { id: 'd', label: "Neither - BER depends only on signal amplitude" }
    ],
    explanation: "Eye width represents the horizontal timing margin for the receiver's clock recovery circuit. Link A's 80 ps eye width with only 5 ps jitter means the sampling point has much more margin. Link B's narrow 40 ps eye with 12 ps jitter leaves very little margin, meaning even small additional perturbations could cause errors."
  },
  {
    scenario: "An engineer adds a series termination resistor (matching the trace impedance) at the transmitter output of a high-speed signal. The eye diagram immediately shows improvement.",
    question: "How does proper termination improve the eye diagram?",
    options: [
      { id: 'a', label: "It increases the signal amplitude by reflecting more energy" },
      { id: 'b', label: "It absorbs reflections from impedance discontinuities, preventing reflected energy from interfering with subsequent bits", correct: true },
      { id: 'c', label: "It filters out high-frequency noise components" },
      { id: 'd', label: "It increases the data rate automatically" }
    ],
    explanation: "Impedance mismatches cause signal reflections that travel back along the trace and re-reflect, creating ghost images in the eye diagram. Proper termination (matching the characteristic impedance) absorbs these reflections, preventing them from corrupting subsequent bit transitions and opening the eye."
  },
  {
    scenario: "A high-speed PCB design has two differential pairs running parallel for 15 cm with only 0.2 mm separation. The aggressor pair switches at 10 Gbps while the victim pair is being measured.",
    question: "How will crosstalk from the aggressor affect the victim's eye diagram?",
    options: [
      { id: 'a', label: "It will only affect the victim's DC offset" },
      { id: 'b', label: "It will add random-looking noise that reduces both eye height and eye width, as the coupling depends on the aggressor's data pattern", correct: true },
      { id: 'c', label: "It will double the victim's data rate" },
      { id: 'd', label: "It will have no effect since they are different signals" }
    ],
    explanation: "Crosstalk from a nearby aggressor couples data-dependent noise into the victim signal. Since the aggressor's data pattern is uncorrelated with the victim, the crosstalk appears as noise that reduces eye height (voltage margin) and can cause horizontal smearing that reduces eye width (timing margin)."
  },
  {
    scenario: "A receiver's clock and data recovery (CDR) circuit locks to the incoming data stream. The eye diagram shows a 100 ps unit interval with crossing points spread over 20 ps horizontally.",
    question: "What does the 20 ps horizontal spread at the crossing points represent?",
    options: [
      { id: 'a', label: "The signal's rise time" },
      { id: 'b', label: "Total jitter - the combination of random and deterministic timing variations in the signal transitions", correct: true },
      { id: 'c', label: "The CDR's tracking bandwidth" },
      { id: 'd', label: "The oscilloscope's measurement error" }
    ],
    explanation: "The horizontal spread of crossing points in an eye diagram directly shows the total jitter of the signal. This 20 ps spread includes both random jitter (RJ, from thermal noise) and deterministic jitter (DJ, from ISI, crosstalk, duty-cycle distortion). With a 100 ps UI, 20 ps jitter consumes 20% of the timing budget."
  },
  {
    scenario: "An engineer uses pre-emphasis (boosting high-frequency signal components at the transmitter) on a 28 Gbps link. The eye diagram, which was nearly closed, opens up significantly.",
    question: "Why does pre-emphasis open the eye?",
    options: [
      { id: 'a', label: "It increases the total signal power" },
      { id: 'b', label: "It compensates for frequency-dependent channel loss by boosting the frequencies that the channel attenuates most, reducing ISI", correct: true },
      { id: 'c', label: "It removes all noise from the signal" },
      { id: 'd', label: "It slows down the data rate to give more time per bit" }
    ],
    explanation: "PCB traces and cables attenuate high frequencies more than low frequencies. Pre-emphasis boosts the high-frequency content of the transmitted signal so that after channel attenuation, the received signal has a more uniform frequency response. This reduces ISI and opens the eye, enabling higher data rates over lossy channels."
  },
  {
    scenario: "A 56 Gbps PAM4 signal shows three eye openings stacked vertically, compared to a single eye for NRZ. The middle eye appears smaller than the top and bottom eyes.",
    question: "Why is the middle eye of a PAM4 signal typically smaller?",
    options: [
      { id: 'a', label: "The middle eye carries less important data" },
      { id: 'b', label: "Non-linear effects and compression in the transmitter/channel affect the middle levels more, and the voltage spacing between middle levels is inherently tighter", correct: true },
      { id: 'c', label: "The oscilloscope has less resolution in the middle of the screen" },
      { id: 'd', label: "PAM4 signals always have equal eye openings" }
    ],
    explanation: "PAM4 uses four voltage levels (00, 01, 10, 11), creating three eye openings. The middle eye is bounded by the two inner levels, which are more susceptible to non-linear distortion and have the same noise margin as outer eyes but with tighter spacing. This makes PAM4 more challenging than NRZ for signal integrity."
  },
  {
    scenario: "During production testing, a batch of PCBs shows a bimodal distribution in eye diagram measurements - some boards have 300 mV eye height while others show only 150 mV.",
    question: "What is the most likely manufacturing-related cause?",
    options: [
      { id: 'a', label: "The oscilloscopes are miscalibrated between test stations" },
      { id: 'b', label: "PCB manufacturing variations (trace width, dielectric thickness, impedance control) are causing inconsistent channel characteristics", correct: true },
      { id: 'c', label: "The solder paste volume varies randomly" },
      { id: 'd', label: "Temperature differences between boards" }
    ],
    explanation: "PCB manufacturing tolerances affect trace impedance (via trace width and dielectric thickness), which impacts reflections and loss. A bimodal distribution suggests a systematic process variation - perhaps two different material lots or an etching process shift that creates two populations of boards with different impedance characteristics."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🔗',
    title: 'PCIe & High-Speed SerDes',
    short: 'Multi-gigabit serial links',
    tagline: 'Every generation doubles the speed, halves the margin',
    description: 'PCIe 5.0 runs at 32 GT/s and PCIe 6.0 at 64 GT/s. Eye diagrams are the primary tool for validating that these links meet BER requirements of 10^-12. Equalization (CTLE, DFE) and pre-emphasis are tuned by examining eye diagram openings.',
    connection: 'Eye diagrams reveal exactly how much voltage and timing margin remains after the signal traverses the channel. Engineers use them to tune equalization taps - adjusting pre-emphasis to compensate for channel loss and open the eye.',
    howItWorks: 'Real-time or equivalent-time oscilloscopes capture millions of bit transitions, overlaying them to form the eye. Mask testing automates pass/fail determination. JTOL (jitter tolerance) testing sweeps jitter to find the limit.',
    stats: [
      { value: '64 GT/s', label: 'PCIe 6.0 data rate', icon: '🚀' },
      { value: '10^-12', label: 'Required BER', icon: '🎯' },
      { value: '15.6 ps', label: 'Unit interval at 64 GT/s', icon: '⏱' },
    ],
    examples: ['GPU interconnects', 'NVMe storage', 'AI accelerator links', 'Data center switches'],
    companies: ['Intel', 'AMD', 'Broadcom', 'Synopsys'],
    futureImpact: 'PCIe 7.0 will target 128 GT/s using PAM4 modulation, requiring even more sophisticated eye diagram analysis with three stacked eyes.',
    color: '#3B82F6'
  },
  {
    icon: '🌐',
    title: 'Ethernet & Data Center',
    short: '400G/800G networking',
    tagline: 'Keeping the cloud connected at lightspeed',
    description: '400 Gigabit Ethernet uses 8 lanes of 56 Gbps PAM4 signaling. Eye diagram compliance testing ensures interoperability between switches, NICs, and cables from different vendors, following IEEE 802.3 standards.',
    connection: 'Ethernet standards define specific eye mask shapes and sizes. A compliant transmitter must produce an eye that passes the mask at a specified BER. Eye diagram parameters (height, width, jitter) directly map to link reach and reliability.',
    howItWorks: 'IEEE 802.3 defines TDECQ (Transmitter and Dispersion Eye Closure Quaternary) for PAM4 signals, measuring how much the eye has degraded. Reference equalizers are applied before measurement to simulate a real receiver.',
    stats: [
      { value: '800 Gbps', label: 'Next-gen Ethernet', icon: '🌐' },
      { value: '112 Gbps', label: 'Per-lane rate', icon: '📶' },
      { value: '<2 dB', label: 'TDECQ target', icon: '📊' },
    ],
    examples: ['Cloud data centers', 'AI training clusters', 'Telecom backbone', '5G fronthaul'],
    companies: ['Cisco', 'Arista', 'Juniper', 'Mellanox/NVIDIA'],
    futureImpact: '1.6 TbE and beyond will use 200G per lane, pushing PAM4 and potentially PAM6 modulation to the limits of copper and optical channels.',
    color: '#10B981'
  },
  {
    icon: '💾',
    title: 'DDR5 & HBM Memory',
    short: 'High-bandwidth memory interfaces',
    tagline: 'Picosecond margins at thousands of megatransfers',
    description: 'DDR5 at 6400 MT/s has a unit interval of just 156 ps. Eye diagram analysis helps memory controller designers validate read/write timing margins. Training algorithms use eye-scanning to find the optimal sampling point.',
    connection: 'Memory controllers perform internal eye scanning during initialization - sweeping voltage and timing offsets to map the eye opening. The center of the eye is chosen as the sampling point, maximizing margin against noise and jitter.',
    howItWorks: 'Built-in self-test (BIST) circuits in memory controllers generate known patterns and measure received data while sweeping delay and voltage thresholds. This creates a 2D eye map that shows the contour of the eye opening.',
    stats: [
      { value: '6400 MT/s', label: 'DDR5 speed', icon: '⚡' },
      { value: '156 ps', label: 'Unit interval', icon: '⏱' },
      { value: '1.1V', label: 'Signal swing', icon: '📐' },
    ],
    examples: ['Gaming PCs', 'AI servers', 'HPC systems', 'Mobile devices'],
    companies: ['Samsung', 'SK Hynix', 'Micron', 'Intel'],
    futureImpact: 'DDR6 and HBM4 will push to 12800+ MT/s, requiring advanced equalization and potentially PAM4 modulation in memory interfaces.',
    color: '#8B5CF6'
  },
  {
    icon: '📡',
    title: 'Optical Transceivers',
    short: 'Fiber optic communications',
    tagline: 'From electrons to photons and back',
    description: 'Optical transceivers (QSFP-DD, OSFP) convert electrical signals to optical and back. Eye diagram testing validates both the electrical and optical domains, ensuring the complete link meets BER requirements.',
    connection: 'The electrical eye at the transmitter input and the optical eye at the fiber output both must pass compliance masks. Optical eye diagrams additionally show effects of laser extinction ratio, chirp, and fiber dispersion.',
    howItWorks: 'Optical sampling oscilloscopes with calibrated photodetectors capture the optical eye. OMA (Optical Modulation Amplitude), extinction ratio, and TDECQ are measured. Stressed receiver sensitivity testing applies worst-case impairments.',
    stats: [
      { value: '100G/λ', label: 'Per-wavelength rate', icon: '💡' },
      { value: '10 km', label: 'Single-mode reach', icon: '📏' },
      { value: '-5 dBm', label: 'Receiver sensitivity', icon: '📡' },
    ],
    examples: ['Subsea cables', 'Metro networks', 'Data center interconnect', 'FTTH'],
    companies: ['Coherent', 'Lumentum', 'Broadcom', 'Intel'],
    futureImpact: 'Co-packaged optics and silicon photonics will bring optical links directly into switch ASICs, requiring new eye diagram test methodologies.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SignalIntegrityEyeDiagramRenderer: React.FC<SignalIntegrityEyeDiagramRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - play phase
  const [dataRate, setDataRate] = useState(5); // Gbps
  const [traceLength, setTraceLength] = useState(10); // cm
  const [termination, setTermination] = useState<'matched' | 'open' | 'short'>('matched');
  const [riseTime, setRiseTime] = useState(50); // ps
  const [noiseLevel, setNoiseLevel] = useState(10); // mV RMS
  const [crosstalkCoupling, setCrosstalkCoupling] = useState(0); // percentage 0-30

  // Twist phase - impedance mismatch
  const [impedanceMismatch, setImpedanceMismatch] = useState(0); // percentage deviation from 50 ohm
  const [showMask, setShowMask] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const animRef = useRef<number>(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Phase labels and order
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'The Eye',
    predict: 'Predict',
    play: 'Explore',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  // Colors - dark theme with signal-integrity cyan/green accent
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#00E5FF',
    accentGlow: 'rgba(0, 229, 255, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    eyeOpen: '#22c55e',
    eyeClosed: '#ef4444',
    traceColor: '#00E5FF',
    maskColor: 'rgba(239, 68, 68, 0.25)',
    maskBorder: '#ef4444',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
    label: { fontSize: '12px', fontWeight: 600 as const, letterSpacing: '0.5px', textTransform: 'uppercase' as const },
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    onGameEvent?.({
      eventType: 'phase_changed',
      gameType: 'signal_integrity_eye_diagram',
      gameTitle: 'Signal Integrity Eye Diagram',
      details: { phase: p, phaseName: phaseLabels[p] },
      timestamp: Date.now(),
    });
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // EYE DIAGRAM PHYSICS CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const calculateEyeMetrics = useCallback((params?: {
    dr?: number; tl?: number; term?: 'matched' | 'open' | 'short';
    rt?: number; nl?: number; xt?: number; mismatch?: number;
  }) => {
    const dr = params?.dr ?? dataRate;
    const tl = params?.tl ?? traceLength;
    const term = params?.term ?? termination;
    const rt = params?.rt ?? riseTime;
    const nl = params?.nl ?? noiseLevel;
    const xt = params?.xt ?? crosstalkCoupling;
    const mismatch = params?.mismatch ?? impedanceMismatch;

    const unitInterval = 1000 / dr; // ps (1 UI at Gbps data rate)
    const signalAmplitude = 800; // mV peak-to-peak nominal

    // ISI from trace loss (frequency-dependent loss model)
    const lossDb = tl * 0.5 * Math.sqrt(dr); // simplified dB loss
    const lossFactor = Math.pow(10, -lossDb / 20);
    const isiReduction = (1 - lossFactor) * signalAmplitude * 0.5;

    // Rise time degradation reduces eye width
    const riseTimeFraction = rt / unitInterval;
    const riseTimePenalty = Math.min(riseTimeFraction * 0.4, 0.9);

    // Termination effects on reflections
    let reflectionFactor = 0;
    if (term === 'open') reflectionFactor = 0.8;
    else if (term === 'short') reflectionFactor = 0.7;
    else reflectionFactor = 0.05; // matched - small residual

    // Impedance mismatch causes reflections
    const mismatchReflection = Math.abs(mismatch) / 100 * 0.6;
    const totalReflection = Math.min(reflectionFactor + mismatchReflection, 0.95);

    // Noise contributions
    const noiseReduction = nl * 2; // mV reduction in eye height
    const crosstalkReduction = (xt / 100) * signalAmplitude * 0.3;

    // Calculate eye height (mV)
    const eyeHeight = Math.max(0, signalAmplitude * lossFactor - isiReduction - noiseReduction - crosstalkReduction - totalReflection * signalAmplitude * 0.3);

    // Calculate eye width (ps)
    const eyeWidth = Math.max(0, unitInterval * (1 - riseTimePenalty) * (1 - totalReflection * 0.5) * (1 - xt / 200));

    // Jitter (ps RMS) - combination of random and deterministic
    const randomJitter = nl * 0.3 + 1; // ps RMS baseline
    const deterministicJitter = totalReflection * unitInterval * 0.15 + xt / 100 * unitInterval * 0.1;
    const totalJitter = Math.sqrt(randomJitter * randomJitter + deterministicJitter * deterministicJitter);

    // Eye open ratio (0 to 1) for visualization
    const heightRatio = Math.max(0, Math.min(1, eyeHeight / signalAmplitude));
    const widthRatio = Math.max(0, Math.min(1, eyeWidth / unitInterval));

    // Mask pass/fail - eye must be at least 30% open in both dimensions
    const maskPass = heightRatio > 0.25 && widthRatio > 0.3;

    return {
      unitInterval,
      signalAmplitude,
      eyeHeight: Math.round(eyeHeight),
      eyeWidth: Math.round(eyeWidth),
      totalJitter: Math.round(totalJitter * 10) / 10,
      heightRatio,
      widthRatio,
      maskPass,
      lossFactor,
      totalReflection,
    };
  }, [dataRate, traceLength, termination, riseTime, noiseLevel, crosstalkCoupling, impedanceMismatch]);

  const metrics = calculateEyeMetrics();

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG EYE DIAGRAM RENDERER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderEyeDiagram = useCallback((
    width: number,
    height: number,
    overrideMetrics?: ReturnType<typeof calculateEyeMetrics>,
    options?: { showMaskOverlay?: boolean; showMeasurementAnnotations?: boolean; traceCount?: number; label?: string }
  ) => {
    const m = overrideMetrics || metrics;
    const showMaskOv = options?.showMaskOverlay ?? showMask;
    const showMeasAnnot = options?.showMeasurementAnnotations ?? showMeasurements;
    const numTraces = options?.traceCount ?? (isMobile ? 40 : 70);
    const padding = { top: 30, right: 20, bottom: 30, left: 20 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const cx = padding.left + plotW / 2;
    const cy = padding.top + plotH / 2;

    // Generate eye diagram traces
    const traces: string[] = [];
    const heatmap: number[][] = []; // for density coloring
    const gridW = 40;
    const gridH = 30;
    for (let gi = 0; gi < gridW; gi++) {
      heatmap[gi] = [];
      for (let gj = 0; gj < gridH; gj++) {
        heatmap[gi][gj] = 0;
      }
    }

    for (let t = 0; t < numTraces; t++) {
      const seed = t * 7.31 + animationFrame * 0.02;

      // Random bit pattern: previous bit, current bit, next bit
      const prevBit = seededRandom(seed + 1) > 0.5 ? 1 : 0;
      const currBit = seededRandom(seed + 2) > 0.5 ? 1 : 0;
      const nextBit = seededRandom(seed + 3) > 0.5 ? 1 : 0;

      // Jitter offsets (horizontal timing perturbation)
      const jitterH = gaussianRandom(seed + 4) * m.totalJitter / m.unitInterval * plotW * 0.08;
      // Noise offset (vertical perturbation)
      const noiseV = gaussianRandom(seed + 5) * (1 - m.heightRatio) * plotH * 0.12;
      // ISI effect - previous bit pulls current level
      const isiPull = (prevBit === currBit ? 0 : (prevBit ? 1 : -1)) * (1 - m.lossFactor) * plotH * 0.08;
      // Reflection ghost
      const reflGhost = m.totalReflection * gaussianRandom(seed + 6) * plotH * 0.06;

      // Build trace path across 2 UI (one full eye opening)
      const points: { x: number; y: number }[] = [];
      const steps = 50;
      for (let s = 0; s <= steps; s++) {
        const frac = s / steps; // 0 to 1 across 2 UIs
        const x = padding.left + frac * plotW + jitterH;

        // Determine the signal level at this point in the eye
        let level: number;
        if (frac < 0.15) {
          // Entering from previous bit
          const prevLevel = prevBit ? -1 : 1; // inverted for y-axis
          const currLevel = currBit ? -1 : 1;
          const blend = frac / 0.15;
          const smoothBlend = blend * blend * (3 - 2 * blend); // smooth-step
          level = prevLevel + (currLevel - prevLevel) * smoothBlend;
        } else if (frac < 0.5) {
          // Settled at current bit level
          level = currBit ? -1 : 1;
        } else if (frac < 0.65) {
          // Transitioning to next bit
          const currLevel = currBit ? -1 : 1;
          const nxtLevel = nextBit ? -1 : 1;
          const blend = (frac - 0.5) / 0.15;
          const smoothBlend = blend * blend * (3 - 2 * blend);
          level = currLevel + (nxtLevel - currLevel) * smoothBlend;
        } else {
          // Settled at next bit
          level = nextBit ? -1 : 1;
        }

        // Apply eye closure effects
        const closureFactor = m.heightRatio;
        level = level * closureFactor;

        // Add noise and ISI
        const noiseHere = gaussianRandom(seed + s * 0.37) * (1 - m.heightRatio) * 0.15;
        level += noiseHere + isiPull / plotH * 2 + reflGhost / plotH * 2;

        const y = cy + level * plotH * 0.35 + noiseV;

        points.push({ x: Math.max(padding.left, Math.min(padding.left + plotW, x)), y: Math.max(padding.top, Math.min(padding.top + plotH, y)) });

        // Update heatmap
        const gx = Math.floor(((x - padding.left) / plotW) * (gridW - 1));
        const gy = Math.floor(((y - padding.top) / plotH) * (gridH - 1));
        if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
          heatmap[gx][gy]++;
        }
      }

      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      traces.push(pathD);
    }

    // Find max heatmap value for normalization
    let maxHeat = 1;
    for (let gi = 0; gi < gridW; gi++) {
      for (let gj = 0; gj < gridH; gj++) {
        if (heatmap[gi][gj] > maxHeat) maxHeat = heatmap[gi][gj];
      }
    }

    // Mask hexagon centered on eye opening
    const maskW = plotW * 0.25 * 0.7;
    const maskH = plotH * 0.25 * 0.7;
    const maskPoints = [
      `${cx - maskW},${cy}`,
      `${cx - maskW * 0.5},${cy - maskH}`,
      `${cx + maskW * 0.5},${cy - maskH}`,
      `${cx + maskW},${cy}`,
      `${cx + maskW * 0.5},${cy + maskH}`,
      `${cx - maskW * 0.5},${cy + maskH}`,
    ].join(' ');

    // Eye height and width measurement lines
    const eyeTopY = cy - m.heightRatio * plotH * 0.35;
    const eyeBotY = cy + m.heightRatio * plotH * 0.35;
    const eyeLeftX = cx - m.widthRatio * plotW * 0.2;
    const eyeRightX = cx + m.widthRatio * plotW * 0.2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#050508', borderRadius: '12px', border: '1px solid #1a1a2e' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <React.Fragment key={`grid-${f}`}>
            <line x1={padding.left + f * plotW} y1={padding.top} x2={padding.left + f * plotW} y2={padding.top + plotH}
              stroke="#1a1a2e" strokeWidth="0.5" />
            <line x1={padding.left} y1={padding.top + f * plotH} x2={padding.left + plotW} y2={padding.top + f * plotH}
              stroke="#1a1a2e" strokeWidth="0.5" />
          </React.Fragment>
        ))}

        {/* Center lines */}
        <line x1={cx} y1={padding.top} x2={cx} y2={padding.top + plotH}
          stroke="#2a2a3e" strokeWidth="1" strokeDasharray="4,4" />
        <line x1={padding.left} y1={cy} x2={padding.left + plotW} y2={cy}
          stroke="#2a2a3e" strokeWidth="1" strokeDasharray="4,4" />

        {/* Heatmap density overlay */}
        {heatmap.map((col, gi) =>
          col.map((val, gj) => {
            if (val < 2) return null;
            const intensity = Math.min(val / maxHeat, 1);
            const x = padding.left + (gi / gridW) * plotW;
            const y = padding.top + (gj / gridH) * plotH;
            const cellW = plotW / gridW;
            const cellH = plotH / gridH;
            return (
              <rect key={`heat-${gi}-${gj}`} x={x} y={y} width={cellW} height={cellH}
                fill={`rgba(0, 229, 255, ${intensity * 0.15})`} />
            );
          })
        )}

        {/* Eye diagram traces */}
        {traces.map((d, i) => (
          <path key={`trace-${i}`} d={d} fill="none"
            stroke={colors.traceColor}
            strokeWidth="0.8"
            strokeOpacity={0.3 + (0.15 * seededRandom(i * 3.7))}
          />
        ))}

        {/* Mask overlay */}
        {showMaskOv && (
          <polygon points={maskPoints}
            fill={m.maskPass ? 'rgba(34, 197, 94, 0.08)' : colors.maskColor}
            stroke={m.maskPass ? colors.eyeOpen : colors.maskBorder}
            strokeWidth="1.5"
            strokeDasharray={m.maskPass ? 'none' : '6,3'}
          />
        )}

        {/* Eye opening highlight */}
        {m.heightRatio > 0.05 && (
          <ellipse cx={cx} cy={cy}
            rx={m.widthRatio * plotW * 0.15}
            ry={m.heightRatio * plotH * 0.25}
            fill="none"
            stroke={m.maskPass ? colors.eyeOpen : colors.eyeClosed}
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeDasharray="3,3"
          />
        )}

        {/* Measurement annotations */}
        {showMeasAnnot && m.heightRatio > 0.05 && (
          <>
            {/* Eye height arrow */}
            <line x1={cx + plotW * 0.28} y1={eyeTopY} x2={cx + plotW * 0.28} y2={eyeBotY}
              stroke={colors.eyeOpen} strokeWidth="1" markerStart="url(#arrowUp)" markerEnd="url(#arrowDown)" />
            <text x={cx + plotW * 0.31} y={cy} fill={colors.eyeOpen} fontSize="10" fontFamily="monospace" dominantBaseline="middle">
              {m.eyeHeight} mV
            </text>

            {/* Eye width arrow */}
            <line x1={eyeLeftX} y1={cy + plotH * 0.38} x2={eyeRightX} y2={cy + plotH * 0.38}
              stroke="#F59E0B" strokeWidth="1" />
            <text x={cx} y={cy + plotH * 0.44} fill="#F59E0B" fontSize="10" fontFamily="monospace" textAnchor="middle">
              {m.eyeWidth} ps
            </text>

            {/* Jitter annotation */}
            <text x={padding.left + 4} y={padding.top + 14} fill="#a78bfa" fontSize="9" fontFamily="monospace">
              Jitter: {m.totalJitter} ps RMS
            </text>
          </>
        )}

        {/* Arrow markers */}
        <defs>
          <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
            <path d="M0,6 L3,0 L6,6" fill="none" stroke={colors.eyeOpen} strokeWidth="1" />
          </marker>
          <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
            <path d="M0,0 L3,6 L6,0" fill="none" stroke={colors.eyeOpen} strokeWidth="1" />
          </marker>
        </defs>

        {/* Axis labels */}
        <text x={cx} y={height - 4} fill={colors.textMuted} fontSize="9" fontFamily="monospace" textAnchor="middle">
          Time (2 UI = {Math.round(2 * m.unitInterval)} ps)
        </text>
        <text x={6} y={cy} fill={colors.textMuted} fontSize="9" fontFamily="monospace" textAnchor="start" transform={`rotate(-90,8,${cy})`}>
          Voltage
        </text>

        {/* Status badge */}
        <rect x={width - 80} y={4} width={72} height={20} rx="6"
          fill={m.maskPass ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}
          stroke={m.maskPass ? colors.eyeOpen : colors.eyeClosed} strokeWidth="1" />
        <text x={width - 44} y={17} fill={m.maskPass ? colors.eyeOpen : colors.eyeClosed}
          fontSize="10" fontWeight="700" fontFamily="monospace" textAnchor="middle">
          {m.maskPass ? 'PASS' : 'FAIL'}
        </text>

        {/* Optional label */}
        {options?.label && (
          <text x={padding.left + 4} y={height - 6} fill={colors.textMuted} fontSize="9" fontFamily="monospace">
            {options.label}
          </text>
        )}
      </svg>
    );
  }, [metrics, showMask, showMeasurements, animationFrame, isMobile, colors]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED UI COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>👁</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Eye Diagram</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 999,
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
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
          }} />
        </button>
      ))}
    </div>
  );

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: '#000',
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

  // Slider component
  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit: string, accentColor?: string) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: accentColor || colors.accent, fontWeight: 600, fontFamily: 'monospace' }}>{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => {
          onChange(Number(e.target.value));
          onGameEvent?.({
            eventType: 'slider_changed',
            gameType: 'signal_integrity_eye_diagram',
            gameTitle: 'Signal Integrity Eye Diagram',
            details: { slider: label, value: Number(e.target.value) },
            timestamp: Date.now(),
          });
        }}
        style={{ width: '100%', accentColor: accentColor || colors.accent, cursor: 'pointer', height: '6px' }}
      />
    </div>
  );

  // Page shell
  const renderPageShell = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {renderNavBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        paddingTop: '84px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {content}
        </div>
      </div>
      {renderNavDots()}
    </div>
  );

  // Side-by-side layout
  const renderSideBySide = (svgContent: React.ReactNode, controlsContent: React.ReactNode) => (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      alignItems: 'flex-start',
    }}>
      <div style={{ flex: isMobile ? 'none' : '1 1 55%', width: isMobile ? '100%' : 'auto' }}>
        {svgContent}
      </div>
      <div style={{ flex: isMobile ? 'none' : '1 1 45%', width: isMobile ? '100%' : 'auto' }}>
        {controlsContent}
      </div>
    </div>
  );

  // Metric badge
  const renderMetricBadge = (label: string, value: string, color: string) => (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      padding: '8px 12px',
      textAlign: 'center',
      minWidth: '80px',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>{label}</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    const hookMetrics = calculateEyeMetrics({ dr: 5, tl: 10, term: 'matched', rt: 50, nl: 10, xt: 0, mismatch: 0 });
    return renderPageShell(
      <>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>👁</div>
          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
            What Does This &quot;Eye&quot; Tell You?
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', margin: '0 auto 24px' }}>
            Every high-speed digital signal has a story written in its eye diagram. A wide-open eye means clean, reliable data. A closed eye means bit errors and system failure.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {renderEyeDiagram(
            isMobile ? 340 : 520,
            isMobile ? 200 : 280,
            hookMetrics,
            { showMaskOverlay: true, showMeasurementAnnotations: true, traceCount: isMobile ? 50 : 80, label: 'Clean 5 Gbps Link' }
          )}
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          borderLeft: `4px solid ${colors.accent}`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
            The Eye Diagram
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
            An eye diagram overlays thousands of bit transitions on top of each other, triggered on the bit clock. The resulting pattern looks like an eye:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Eye Height', desc: 'Vertical opening - voltage margin for the receiver (mV)', color: colors.eyeOpen },
              { label: 'Eye Width', desc: 'Horizontal opening - timing margin for sampling (ps)', color: '#F59E0B' },
              { label: 'Jitter', desc: 'Horizontal spreading of transitions - timing uncertainty (ps)', color: '#a78bfa' },
              { label: 'Mask', desc: 'Keep-out region - traces entering this area cause bit errors', color: colors.eyeClosed },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color, marginTop: '4px', flexShrink: 0 }} />
                <div>
                  <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{item.label}: </span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Start Learning
          </button>
        </div>
      </>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
          Make Your Prediction
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          A 10 Gbps signal travels through a 30 cm FR4 PCB trace with no termination (open end). What will the eye diagram look like?
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {renderEyeDiagram(
            isMobile ? 300 : 400,
            isMobile ? 180 : 220,
            calculateEyeMetrics({ dr: 5, tl: 10, term: 'matched', rt: 50, nl: 5, xt: 0, mismatch: 0 }),
            { showMaskOverlay: false, showMeasurementAnnotations: false, traceCount: 40, label: 'Reference: 5 Gbps, 10 cm, matched' }
          )}
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
            Above is a reference eye at 5 Gbps on a short, properly-terminated trace. Now imagine doubling the data rate to 10 Gbps, tripling the trace length to 30 cm, and removing termination (open end).
          </p>
        </div>

        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
          What will happen to the eye?
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            { id: 'open', label: 'The eye will remain wide open - higher speed doesn\'t matter' },
            { id: 'closed', label: 'The eye will be mostly closed - longer trace + no termination + higher speed will severely degrade the signal', correct: true },
            { id: 'wider', label: 'The eye will be even wider because more data means more averaging' },
            { id: 'same', label: 'The eye will look exactly the same as the reference' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                playSound('click');
                setPrediction(opt.id);
                onGameEvent?.({
                  eventType: 'prediction_made',
                  gameType: 'signal_integrity_eye_diagram',
                  gameTitle: 'Signal Integrity Eye Diagram',
                  details: { prediction: opt.id, correct: opt.id === 'closed' },
                  timestamp: Date.now(),
                });
              }}
              style={{
                background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                borderRadius: '10px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '44px',
                color: colors.textPrimary,
                ...typo.small,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{
            background: prediction === 'closed' ? `${colors.success}15` : `${colors.warning}15`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `4px solid ${prediction === 'closed' ? colors.success : colors.warning}`,
          }}>
            <p style={{ ...typo.body, color: prediction === 'closed' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
              {prediction === 'closed' ? 'Correct!' : 'Not quite!'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Doubling the data rate means the signal must toggle twice as fast, requiring higher bandwidth. Tripling trace length triples the loss. Open termination causes full reflections that create ghost images. All three effects combine to severely close the eye.
            </p>
          </div>
        )}

        {prediction && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              See It In Action
            </button>
          </div>
        )}
      </>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const svgW = isMobile ? 340 : 440;
    const svgH = isMobile ? 220 : 280;

    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '4px' }}>
          Open the Eye
        </h2>
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
          Adjust parameters to keep the eye open and passing the mask test. Watch how each factor affects signal quality.
        </p>

        {renderSideBySide(
          <div>
            {renderEyeDiagram(svgW, svgH, undefined, {
              showMaskOverlay: showMask,
              showMeasurementAnnotations: showMeasurements,
              traceCount: isMobile ? 40 : 70,
            })}

            {/* Metrics bar */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {renderMetricBadge('Eye Height', `${metrics.eyeHeight} mV`, metrics.eyeHeight > 200 ? colors.eyeOpen : metrics.eyeHeight > 100 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Eye Width', `${metrics.eyeWidth} ps`, metrics.eyeWidth > 50 ? colors.eyeOpen : metrics.eyeWidth > 20 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Jitter', `${metrics.totalJitter} ps`, metrics.totalJitter < 15 ? colors.eyeOpen : metrics.totalJitter < 30 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Status', metrics.maskPass ? 'PASS' : 'FAIL', metrics.maskPass ? colors.eyeOpen : colors.eyeClosed)}
            </div>
          </div>,

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Channel Parameters</h3>

            {renderSlider('Data Rate', dataRate, 1, 28, 0.5, setDataRate, 'Gbps', colors.accent)}
            {renderSlider('Trace Length', traceLength, 2, 50, 1, setTraceLength, 'cm', '#F59E0B')}
            {renderSlider('Rise Time', riseTime, 10, 200, 5, setRiseTime, 'ps', '#a78bfa')}
            {renderSlider('Noise Level', noiseLevel, 0, 50, 1, setNoiseLevel, 'mV RMS', '#f472b6')}
            {renderSlider('Crosstalk', crosstalkCoupling, 0, 30, 1, setCrosstalkCoupling, '%', '#fb923c')}

            {/* Termination selector */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>Termination</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['matched', 'open', 'short'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setTermination(t);
                      playSound('click');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `2px solid ${termination === t ? colors.accent : colors.border}`,
                      background: termination === t ? `${colors.accent}22` : 'transparent',
                      color: termination === t ? colors.accent : colors.textMuted,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      minHeight: '44px',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {t === 'matched' ? 'Matched (50\u03A9)' : t === 'open' ? 'Open' : 'Short'}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle controls */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => setShowMask(!showMask)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${showMask ? colors.eyeClosed : colors.border}`,
                  background: showMask ? `${colors.eyeClosed}22` : 'transparent',
                  color: showMask ? colors.eyeClosed : colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '11px',
                  minHeight: '44px',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {showMask ? 'Hide Mask' : 'Show Mask'}
              </button>
              <button
                onClick={() => setShowMeasurements(!showMeasurements)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${showMeasurements ? colors.accent : colors.border}`,
                  background: showMeasurements ? `${colors.accent}22` : 'transparent',
                  color: showMeasurements ? colors.accent : colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '11px',
                  minHeight: '44px',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {showMeasurements ? 'Hide Meas.' : 'Show Meas.'}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Understand the Measurements
          </button>
        </div>
      </>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
          Understanding Eye Diagram Measurements
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {renderEyeDiagram(
            isMobile ? 340 : 480,
            isMobile ? 200 : 260,
            calculateEyeMetrics({ dr: 5, tl: 10, term: 'matched', rt: 50, nl: 10, xt: 5, mismatch: 0 }),
            { showMaskOverlay: true, showMeasurementAnnotations: true, traceCount: 60, label: 'Annotated Eye Diagram' }
          )}
        </div>

        {[
          {
            title: 'Eye Height (Voltage Margin)',
            content: 'The vertical opening of the eye, measured in millivolts. It represents the voltage difference between the worst-case logic-1 level and the worst-case logic-0 level. A receiver needs sufficient eye height to reliably distinguish between 1s and 0s. ISI, noise, and crosstalk all reduce eye height.',
            color: colors.eyeOpen,
          },
          {
            title: 'Eye Width (Timing Margin)',
            content: 'The horizontal opening of the eye, measured in picoseconds. It represents the time window during which the receiver can sample the data and get the correct result. Jitter, ISI, and reflections reduce eye width. The receiver\'s clock recovery circuit must sample within this window.',
            color: '#F59E0B',
          },
          {
            title: 'Jitter (Timing Uncertainty)',
            content: 'The horizontal spread of the crossing points where traces transition between high and low. Total jitter has two components: Random Jitter (RJ) from thermal noise follows a Gaussian distribution, while Deterministic Jitter (DJ) from ISI, crosstalk, and duty-cycle distortion is bounded. Total jitter = DJ + 14 x RJ for BER = 10^-12.',
            color: '#a78bfa',
          },
          {
            title: 'Mask Testing',
            content: 'Standards define a hexagonal keep-out region in the center of the eye. If any waveform trace enters this region, it represents a potential bit error. The mask shape and size are defined by the standard (PCIe, Ethernet, USB). A compliant transmitter must have zero mask violations over a specified number of samples.',
            color: colors.eyeClosed,
          },
        ].map((section, i) => (
          <div key={i} style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            borderLeft: `4px solid ${section.color}`,
          }}>
            <h3 style={{ ...typo.h3, color: section.color, marginBottom: '8px' }}>{section.title}</h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>{section.content}</p>
          </div>
        ))}

        <div style={{
          background: `${colors.accent}10`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}30`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Key Insight</h3>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            An eye diagram is a composite view of thousands of bit transitions. It simultaneously shows <strong style={{ color: colors.textPrimary }}>voltage margin</strong>, <strong style={{ color: colors.textPrimary }}>timing margin</strong>, and <strong style={{ color: colors.textPrimary }}>noise statistics</strong> in one elegant visualization. That is why it is the universal tool for high-speed link validation.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            What About Reflections?
          </button>
        </div>
      </>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
          The Plot Twist: Impedance Mismatch
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          A connector in the middle of a 10 Gbps trace has a different impedance than the 50-ohm trace. The mismatch is 30% (65 ohms instead of 50 ohms).
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {renderEyeDiagram(
            isMobile ? 300 : 400,
            isMobile ? 180 : 220,
            calculateEyeMetrics({ dr: 10, tl: 15, term: 'matched', rt: 30, nl: 10, xt: 0, mismatch: 0 }),
            { showMaskOverlay: true, showMeasurementAnnotations: true, traceCount: 50, label: 'Before mismatch (Z0 = 50\u03A9)' }
          )}
        </div>

        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
          What will the impedance discontinuity do to the eye?
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            { id: 'nothing', label: 'Nothing - impedance mismatches don\'t affect digital signals' },
            { id: 'reflections', label: 'Create reflections that produce ghost images in the eye, closing it with double-transition artifacts', correct: true },
            { id: 'amplify', label: 'Amplify the signal, making the eye wider' },
            { id: 'filter', label: 'Act as a low-pass filter only, slightly rounding the edges' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                playSound('click');
                setTwistPrediction(opt.id);
                onGameEvent?.({
                  eventType: 'prediction_made',
                  gameType: 'signal_integrity_eye_diagram',
                  gameTitle: 'Signal Integrity Eye Diagram',
                  details: { twist_prediction: opt.id, correct: opt.id === 'reflections' },
                  timestamp: Date.now(),
                });
              }}
              style={{
                background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                borderRadius: '10px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '44px',
                color: colors.textPrimary,
                ...typo.small,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <>
            <div style={{
              background: twistPrediction === 'reflections' ? `${colors.success}15` : `${colors.warning}15`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `4px solid ${twistPrediction === 'reflections' ? colors.success : colors.warning}`,
            }}>
              <p style={{ ...typo.body, color: twistPrediction === 'reflections' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
                {twistPrediction === 'reflections' ? 'Exactly right!' : 'Not quite!'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                When a signal hits an impedance discontinuity, part of the energy reflects back. This reflected signal bounces between discontinuities, arriving at the receiver delayed by the round-trip time. The result: ghost transitions in the eye diagram that reduce both eye height and width.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
                Explore Reflections
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const svgW = isMobile ? 340 : 440;
    const svgH = isMobile ? 220 : 280;

    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '4px' }}>
          Fix the Reflections
        </h2>
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
          Use impedance matching and termination to eliminate reflections and open the eye. Try to get the mask to PASS.
        </p>

        {renderSideBySide(
          <div>
            {renderEyeDiagram(svgW, svgH, undefined, {
              showMaskOverlay: true,
              showMeasurementAnnotations: true,
              traceCount: isMobile ? 40 : 70,
            })}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {renderMetricBadge('Eye Height', `${metrics.eyeHeight} mV`, metrics.eyeHeight > 200 ? colors.eyeOpen : metrics.eyeHeight > 100 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Eye Width', `${metrics.eyeWidth} ps`, metrics.eyeWidth > 50 ? colors.eyeOpen : metrics.eyeWidth > 20 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Jitter', `${metrics.totalJitter} ps`, metrics.totalJitter < 15 ? colors.eyeOpen : metrics.totalJitter < 30 ? colors.warning : colors.eyeClosed)}
              {renderMetricBadge('Reflections', `${Math.round(metrics.totalReflection * 100)}%`, metrics.totalReflection < 0.1 ? colors.eyeOpen : metrics.totalReflection < 0.3 ? colors.warning : colors.eyeClosed)}
            </div>
          </div>,

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Impedance & Termination</h3>

            {renderSlider('Impedance Mismatch', impedanceMismatch, 0, 50, 1, setImpedanceMismatch, '%', colors.eyeClosed)}
            {renderSlider('Data Rate', dataRate, 1, 28, 0.5, setDataRate, 'Gbps', colors.accent)}
            {renderSlider('Trace Length', traceLength, 2, 50, 1, setTraceLength, 'cm', '#F59E0B')}
            {renderSlider('Noise Level', noiseLevel, 0, 50, 1, setNoiseLevel, 'mV RMS', '#f472b6')}
            {renderSlider('Crosstalk', crosstalkCoupling, 0, 30, 1, setCrosstalkCoupling, '%', '#fb923c')}

            <div style={{ marginBottom: '14px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>Termination</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['matched', 'open', 'short'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTermination(t); playSound('click'); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `2px solid ${termination === t ? colors.accent : colors.border}`,
                      background: termination === t ? `${colors.accent}22` : 'transparent',
                      color: termination === t ? colors.accent : colors.textMuted,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      minHeight: '44px',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {t === 'matched' ? 'Matched' : t === 'open' ? 'Open' : 'Short'}
                  </button>
                ))}
              </div>
            </div>

            {/* Hint */}
            <div style={{
              background: `${colors.accent}10`,
              borderRadius: '8px',
              padding: '10px',
              marginTop: '12px',
              border: `1px solid ${colors.accent}30`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Hint: Set impedance mismatch to 0% and use matched termination to minimize reflections. Then try increasing data rate - you will need shorter traces and lower noise.
              </p>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Deep Dive into Solutions
          </button>
        </div>
      </>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return renderPageShell(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
          Impedance Matching & Equalization
        </h2>

        {/* Before/After comparison */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          marginBottom: '24px',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...typo.small, color: colors.eyeClosed, fontWeight: 600, marginBottom: '6px' }}>With Mismatch (30%)</p>
            {renderEyeDiagram(
              isMobile ? 320 : 240,
              isMobile ? 180 : 180,
              calculateEyeMetrics({ dr: 10, tl: 20, term: 'open', rt: 30, nl: 15, xt: 10, mismatch: 30 }),
              { showMaskOverlay: true, showMeasurementAnnotations: false, traceCount: 40, label: 'Mismatched' }
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...typo.small, color: colors.eyeOpen, fontWeight: 600, marginBottom: '6px' }}>Properly Matched</p>
            {renderEyeDiagram(
              isMobile ? 320 : 240,
              isMobile ? 180 : 180,
              calculateEyeMetrics({ dr: 10, tl: 20, term: 'matched', rt: 30, nl: 15, xt: 10, mismatch: 0 }),
              { showMaskOverlay: true, showMeasurementAnnotations: false, traceCount: 40, label: 'Matched 50\u03A9' }
            )}
          </div>
        </div>

        {[
          {
            title: 'Impedance Matching',
            content: 'Maintaining consistent 50-ohm (or 100-ohm differential) impedance along the entire signal path is critical. Every connector, via, and trace width change is a potential impedance discontinuity. Controlled-impedance PCB manufacturing ensures trace width and dielectric thickness produce the target impedance.',
            color: colors.accent,
          },
          {
            title: 'Termination Strategies',
            content: 'Series termination places a resistor at the source to absorb reflections from the far end. Parallel termination places a resistor at the receiver to absorb the incoming signal and prevent re-reflection. AC termination uses a capacitor in series with the termination resistor to block DC current and save power.',
            color: '#F59E0B',
          },
          {
            title: 'Pre-emphasis & De-emphasis',
            content: 'The transmitter can boost the amplitude of transitions (pre-emphasis) or reduce the amplitude of sustained levels (de-emphasis). This pre-compensates for channel loss, effectively flattening the frequency response. Modern SerDes use multi-tap FIR filters with programmable tap weights.',
            color: '#a78bfa',
          },
          {
            title: 'Receiver Equalization',
            content: 'CTLE (Continuous Time Linear Equalizer) boosts high frequencies at the receiver. DFE (Decision Feedback Equalizer) uses previous bit decisions to subtract ISI from the current sample. Together, they can open eyes that appear completely closed on an oscilloscope.',
            color: colors.success,
          },
        ].map((section, i) => (
          <div key={i} style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            borderLeft: `4px solid ${section.color}`,
          }}>
            <h3 style={{ ...typo.h3, color: section.color, marginBottom: '8px' }}>{section.title}</h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Real-World Applications
          </button>
        </div>
      </>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Signal Integrity Eye Diagram"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return renderPageShell(
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>
            {passed ? '🏆' : '📚'}
          </div>
          <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
            {passed ? 'Excellent!' : 'Keep Learning!'}
          </h2>
          <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
            {testScore} / 10
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
            {passed
              ? 'You\'ve mastered Signal Integrity Eye Diagram concepts!'
              : 'Review the concepts and try again.'}
          </p>

          {passed ? (
            <button
              onClick={() => {
                playSound('complete');
                onGameEvent?.({
                  eventType: 'game_completed',
                  gameType: 'signal_integrity_eye_diagram',
                  gameTitle: 'Signal Integrity Eye Diagram',
                  details: { score: testScore, total: 10 },
                  timestamp: Date.now(),
                });
                nextPhase();
              }}
              style={primaryButtonStyle}
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
              style={primaryButtonStyle}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return renderPageShell(
      <>
        {/* Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
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
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
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
                color: testAnswers[currentQuestion] === opt.id ? '#000' : colors.textSecondary,
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
              style={{ ...secondaryButtonStyle, flex: 1 }}
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
                color: testAnswers[currentQuestion] ? '#000' : '#666',
                cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                minHeight: '44px',
                fontFamily: 'system-ui, sans-serif',
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
              }}
              disabled={testAnswers.some(a => a === null)}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                color: testAnswers.every(a => a !== null) ? '#fff' : '#666',
                cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                minHeight: '44px',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const finalScore = testScore;
    const total = testQuestions.length;
    const pct = Math.round((finalScore / total) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          paddingTop: '84px',
          paddingBottom: '80px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
          <style>{`@keyframes eyeBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h2 style={{
            ...typo.h1,
            marginBottom: '8px',
            lineHeight: 1.2,
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Signal Integrity Master!
          </h2>

          <div style={{ fontSize: '40px', fontWeight: 800, color: pct >= 70 ? colors.success : colors.warning, marginBottom: '4px' }}>
            {finalScore} / {total} ({grade})
          </div>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px' }}>
            {pct >= 90 ? 'Outstanding - you truly understand eye diagrams and signal integrity!' : pct >= 70 ? 'Great work - you\'ve mastered the fundamentals of eye diagram analysis!' : 'Good effort - review the answer key to strengthen your understanding.'}
          </p>

          {/* What You Learned */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'left',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>You Learned:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'How to read eye diagrams - eye height, width, and jitter',
                'How ISI, noise, and crosstalk close the eye',
                'The importance of impedance matching and termination',
                'Mask testing for compliance validation',
                'Pre-emphasis and equalization techniques',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success, flexShrink: 0 }}>&#10003;</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Key */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', textAlign: 'left', width: '100%', maxWidth: '600px' }}>Answer Key</h3>
          <div style={{ maxWidth: '600px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const, marginBottom: '20px' }}>
            {testQuestions.map((tq, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const correctOption = tq.options.find(o => o.correct);
              const isCorrect = userAnswer === correctOption?.id;
              const userOption = tq.options.find(o => o.id === userAnswer);
              return (
                <div key={qIndex} style={{
                  marginBottom: '12px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(30,41,59,0.7)',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textSecondary, marginBottom: '8px', lineHeight: 1.4 }}>
                    <span style={{ fontSize: '16px', marginRight: '6px' }}>{isCorrect ? '\u2705' : '\u274C'}</span>
                    {qIndex + 1}. {tq.question}
                  </p>
                  {!isCorrect && userOption && (
                    <p style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '6px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)' }}>
                      Your answer: {userOption.label}
                    </p>
                  )}
                  <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)' }}>
                    Correct: {correctOption?.label}
                  </p>
                  <p style={{ fontSize: '12px', color: '#fbbf24', padding: '8px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', lineHeight: 1.5 }}>
                    Why? {tq.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Fixed bottom Complete Game button */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 24px',
            background: 'linear-gradient(to top, #0f172a 80%, transparent)',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <button
              onClick={() => {
                onGameEvent?.({
                  eventType: 'game_completed',
                  gameType: 'signal_integrity_eye_diagram',
                  gameTitle: 'Signal Integrity Eye Diagram',
                  details: { score: finalScore, total, pct, type: 'mastery_achieved' },
                  timestamp: Date.now(),
                });
                window.location.href = '/games';
              }}
              style={{
                padding: '14px 48px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
                color: '#000',
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default SignalIntegrityEyeDiagramRenderer;
