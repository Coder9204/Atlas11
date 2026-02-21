'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// CROSSTALK - Complete 10-Phase Game
// Signal interference between parallel traces in PCBs and cables
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

interface CrosstalkRendererProps {
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
    scenario: "A high-speed data bus on a PCB runs parallel to a clock signal trace for 15cm. The data occasionally shows bit errors that correlate with clock transitions.",
    question: "What is the most likely cause of these bit errors?",
    options: [
      { id: 'a', label: "The clock crystal is defective and producing unstable frequencies" },
      { id: 'b', label: "Electromagnetic coupling between the parallel traces is inducing noise on the data line", correct: true },
      { id: 'c', label: "The data bus drivers are underpowered and cannot maintain signal levels" },
      { id: 'd', label: "Temperature variations are affecting the trace impedance" }
    ],
    explanation: "When traces run parallel for significant lengths, capacitive and inductive coupling transfers energy between them. This crosstalk causes the aggressor signal (clock) to induce voltage spikes on the victim trace (data), which can be interpreted as bit errors during clock transitions."
  },
  {
    scenario: "An engineer increases the spacing between two parallel signal traces from 0.2mm to 0.6mm. Crosstalk measurements show a significant reduction in interference.",
    question: "Why does increasing trace spacing reduce crosstalk?",
    options: [
      { id: 'a', label: "Wider spacing increases trace resistance, absorbing the interference" },
      { id: 'b', label: "Both capacitive and inductive coupling decrease rapidly with distance", correct: true },
      { id: 'c', label: "Wider traces have more surface area to dissipate electromagnetic energy" },
      { id: 'd', label: "The PCB substrate absorbs more energy at wider spacings" }
    ],
    explanation: "Crosstalk coupling follows an inverse relationship with distance. Capacitive coupling decreases as the electric field between traces weakens, and inductive coupling decreases as the magnetic field interaction reduces. Doubling the spacing can reduce crosstalk by 6dB or more."
  },
  {
    scenario: "A USB 3.0 interface uses differential signaling with twisted pair wires. Despite running next to noisy power cables, the signal integrity remains excellent.",
    question: "How does differential signaling reject crosstalk noise?",
    options: [
      { id: 'a', label: "The twisted wires physically block electromagnetic interference" },
      { id: 'b', label: "Noise couples equally to both wires and cancels when the receiver takes the difference", correct: true },
      { id: 'c', label: "The signal frequency is too high for crosstalk to affect it" },
      { id: 'd', label: "USB 3.0 has built-in error correction that hides the noise" }
    ],
    explanation: "In differential signaling, information is encoded as the voltage difference between two wires. When external noise couples into the cable, it affects both wires equally (common-mode noise). The differential receiver subtracts one signal from the other, canceling the common noise while preserving the intended signal."
  },
  {
    scenario: "A PCB designer routes a sensitive analog signal between two high-speed digital traces. Intermittent noise appears on the analog output that wasn't present in simulation.",
    question: "Why might the analog signal be noisier in the physical board than in simulation?",
    options: [
      { id: 'a', label: "The simulation software is always optimistic about real-world conditions" },
      { id: 'b', label: "Crosstalk from adjacent digital traces was not included in the simulation model", correct: true },
      { id: 'c', label: "Physical PCB material is different from simulation assumptions" },
      { id: 'd', label: "The manufacturing process introduced random defects" }
    ],
    explanation: "Simulations often focus on the intended signal path without modeling adjacent trace coupling. In reality, the analog signal trace acts as a victim line, receiving both near-end (capacitive) and far-end (inductive) crosstalk from the digital aggressors. Proper EMC simulation requires modeling all nearby conductors."
  },
  {
    scenario: "Two 100MHz signals run parallel on a PCB. Near-end crosstalk (NEXT) is measured at -30dB, while far-end crosstalk (FEXT) is measured at -40dB.",
    question: "What determines whether NEXT or FEXT is stronger in a given design?",
    options: [
      { id: 'a', label: "NEXT is always stronger regardless of design parameters" },
      { id: 'b', label: "The balance between capacitive and inductive coupling, which depends on trace geometry", correct: true },
      { id: 'c', label: "Only the signal frequency determines the NEXT/FEXT ratio" },
      { id: 'd', label: "Manufacturing tolerances randomly affect which is stronger" }
    ],
    explanation: "NEXT is dominated by capacitive coupling (proportional to dV/dt), while FEXT is dominated by inductive coupling (proportional to dI/dt). The relative strength depends on trace geometry: tightly coupled microstrip traces often have stronger NEXT, while loosely coupled stripline may have different ratios. In well-matched PCBs, FEXT can be minimized."
  },
  {
    scenario: "A high-speed memory bus shows reliable operation at 1600MHz but fails intermittently at 2400MHz. The layout was not changed between the two speed grades.",
    question: "Why does crosstalk become more problematic at higher frequencies?",
    options: [
      { id: 'a', label: "Higher frequencies generate more heat, which increases crosstalk" },
      { id: 'b', label: "Faster signal transitions (higher dV/dt and dI/dt) increase coupling strength", correct: true },
      { id: 'c', label: "Memory chips are less reliable at higher speeds" },
      { id: 'd', label: "The PCB traces become physically smaller at higher frequencies" }
    ],
    explanation: "Crosstalk coupling is proportional to the rate of change of voltage (capacitive: C*dV/dt) and current (inductive: M*dI/dt). Higher-frequency signals have faster edge rates, dramatically increasing both coupling mechanisms. A layout that works at 1.6GHz may have unacceptable crosstalk at 2.4GHz."
  },
  {
    scenario: "An engineer adds a ground trace between two signal traces carrying high-speed data. Crosstalk between the signals is reduced by 15dB.",
    question: "How does the guard trace reduce crosstalk?",
    options: [
      { id: 'a', label: "It absorbs electromagnetic energy like a sponge" },
      { id: 'b', label: "It provides a low-impedance return path that shields electric and magnetic fields", correct: true },
      { id: 'c', label: "It increases the physical distance between signals" },
      { id: 'd', label: "It converts the crosstalk energy into heat" }
    ],
    explanation: "A grounded guard trace creates a electromagnetic shield between signal traces. It provides a low-impedance path for induced currents, terminating electric field lines before they reach the victim trace. For maximum effectiveness, the guard trace should be connected to ground at multiple points along its length."
  },
  {
    scenario: "A ribbon cable connects two boards. The designer alternates signal wires with ground wires (S-G-S-G pattern) throughout the cable.",
    question: "What advantages does this ground-signal alternation provide?",
    options: [
      { id: 'a', label: "It makes the cable more flexible and easier to route" },
      { id: 'b', label: "Each signal has an adjacent return path, reducing loop area and crosstalk", correct: true },
      { id: 'c', label: "It doubles the current-carrying capacity of the cable" },
      { id: 'd', label: "It eliminates the need for impedance matching" }
    ],
    explanation: "The S-G-S-G pattern ensures each signal wire has an immediately adjacent ground wire as its return path. This minimizes the current loop area (reducing inductive coupling) and provides shielding between signals (reducing capacitive coupling). It's especially important for high-speed differential pairs and sensitive analog signals."
  },
  {
    scenario: "During EMC testing, a product fails radiated emissions tests. Analysis shows the crosstalk between internal traces is creating unexpected antenna effects.",
    question: "How can internal crosstalk cause external electromagnetic emissions?",
    options: [
      { id: 'a', label: "Crosstalk creates heat that radiates as infrared emissions" },
      { id: 'b', label: "Crosstalk-induced currents on traces and cables create unintended radiating structures", correct: true },
      { id: 'c', label: "The test equipment is detecting crosstalk directly through the enclosure" },
      { id: 'd', label: "EMC test chambers amplify internal interference" }
    ],
    explanation: "When crosstalk induces currents on traces, cables, or PCB structures not designed for signal carrying, these become unintentional antennas. The induced high-frequency currents can radiate efficiently if the structure length approaches a quarter wavelength of the signal harmonics. This is why crosstalk management is crucial for EMC compliance."
  },
  {
    scenario: "A medical device uses both high-speed digital signals and sensitive analog sensors on the same PCB. The design team must minimize crosstalk to meet safety requirements.",
    question: "Which combination of techniques would be MOST effective for this critical application?",
    options: [
      { id: 'a', label: "Use faster digital signals to reduce the time window for crosstalk" },
      { id: 'b', label: "Physical separation, guard traces, differential signaling, and proper ground plane design", correct: true },
      { id: 'c', label: "Run all signals at the same frequency to prevent interference" },
      { id: 'd', label: "Use the thickest possible traces to reduce resistance" }
    ],
    explanation: "Critical applications require a multi-layered approach: physical separation keeps coupling low, guard traces provide shielding, differential signaling rejects common-mode noise, and solid ground planes provide low-impedance return paths. These techniques are complementary and should be used together in safety-critical designs."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Speed Computer Memory',
    short: 'DDR5 and beyond',
    tagline: 'Billions of bits per second without interference',
    description: 'Modern DDR5 memory operates at data rates exceeding 6400 MT/s, with 32-64 data lines running in parallel mere millimeters apart. Crosstalk management is essential for reliable operation at these speeds.',
    connection: 'Memory data buses are prime examples of crosstalk challenges: many parallel traces, extremely fast edge rates, and zero tolerance for bit errors. Engineers use carefully controlled trace spacing, length matching, and differential signaling to achieve reliable multi-gigabit transfers.',
    howItWorks: 'DDR5 uses differential clock signaling and employs on-die termination to reduce reflections. Memory controller chips include equalization circuits that compensate for crosstalk-induced eye closure. PCB designers follow strict routing rules with consistent spacing and impedance.',
    stats: [
      { value: '6400+ MT/s', label: 'Transfer rate', icon: '⚡' },
      { value: '0.3mm', label: 'Typical trace spacing', icon: '📏' },
      { value: '<1e-15', label: 'Error rate target', icon: '🎯' }
    ],
    examples: ['DDR5 desktop RAM', 'LPDDR5 in smartphones', 'HBM3 in GPUs', 'Server memory buses'],
    companies: ['Samsung', 'Micron', 'SK Hynix', 'Intel'],
    futureImpact: 'DDR6 will push data rates past 10,000 MT/s, requiring even more sophisticated crosstalk mitigation including active cancellation circuits.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'Telecommunications Infrastructure',
    short: 'Data center interconnects',
    tagline: 'Connecting the world without signal corruption',
    description: 'Data centers and telecom equipment route thousands of high-speed signals through backplanes and cables. Even small amounts of crosstalk accumulate across long paths, making mitigation critical for maintaining signal integrity.',
    connection: 'Telecom systems demonstrate how crosstalk scales with both distance and density. As more channels are packed into smaller spaces at higher speeds, the coupling between adjacent signals becomes the limiting factor for system performance.',
    howItWorks: 'High-speed backplanes use carefully designed via patterns, controlled impedance traces, and sometimes active crosstalk cancellation. Cable assemblies employ shielded twisted pairs and often include signal conditioning ICs. Standards like 400G Ethernet specify maximum crosstalk levels.',
    stats: [
      { value: '400 Gbps', label: 'Per lane speed', icon: '📶' },
      { value: '-30 dB', label: 'Crosstalk limit', icon: '📉' },
      { value: '1 meter+', label: 'Cable length', icon: '📏' }
    ],
    examples: ['400G Ethernet switches', '5G base stations', 'Fiber optic transceivers', 'Server backplanes'],
    companies: ['Cisco', 'Juniper', 'Arista', 'Broadcom'],
    futureImpact: '800G and 1.6T Ethernet will require revolutionary approaches to crosstalk management, including photonic integration and advanced DSP.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Safety-critical vehicle systems',
    tagline: 'When interference could cost lives',
    description: 'Modern vehicles contain kilometers of wiring carrying everything from entertainment signals to brake commands. Crosstalk between safety-critical and non-critical systems must be eliminated to meet automotive safety standards.',
    connection: 'Automotive systems face unique crosstalk challenges: high-power motor drives near sensitive sensors, long wire runs, harsh EMI environments, and strict functional safety requirements. A failure due to crosstalk could endanger lives.',
    howItWorks: 'Automotive designs use extensive shielding, twisted pairs for differential signals, and physical separation between power and signal cables. Safety-critical networks like CAN-FD use robust differential signaling. EMC testing validates immunity to both external interference and internal crosstalk.',
    stats: [
      { value: '2+ km', label: 'Wire per vehicle', icon: '🚗' },
      { value: 'ASIL-D', label: 'Safety standard', icon: '🛡️' },
      { value: '150V/m', label: 'EMC immunity', icon: '⚡' }
    ],
    examples: ['Drive-by-wire systems', 'ADAS sensor fusion', 'EV battery management', 'Infotainment systems'],
    companies: ['Bosch', 'Continental', 'Tesla', 'NXP'],
    futureImpact: 'Autonomous vehicles will require unprecedented levels of signal integrity, with AI-managed crosstalk monitoring and adaptive mitigation.',
    color: '#F59E0B'
  },
  {
    icon: '🏥',
    title: 'Medical Device Electronics',
    short: 'Life-saving precision',
    tagline: 'Zero margin for error in healthcare',
    description: 'Medical devices like MRI machines, ECG monitors, and implantable devices must detect microvolt-level biological signals in the presence of powerful digital electronics. Crosstalk directly affects diagnostic accuracy and patient safety.',
    connection: 'Medical electronics represent the extreme end of mixed-signal design, where tiny analog signals coexist with noisy digital processors. Crosstalk from digital circuits can mask or mimic biological signals, leading to misdiagnosis.',
    howItWorks: 'Medical devices use extensive analog/digital isolation, dedicated ground planes, and careful signal routing. Differential amplifiers with high common-mode rejection are standard. Many devices include active noise cancellation and digital filtering to remove any residual crosstalk artifacts.',
    stats: [
      { value: '1 µV', label: 'Signal resolution', icon: '📊' },
      { value: '100+ dB', label: 'CMRR required', icon: '🎯' },
      { value: 'IEC 60601', label: 'Safety standard', icon: '🏥' }
    ],
    examples: ['ECG/EKG monitors', 'MRI systems', 'Pacemakers', 'Blood glucose monitors'],
    companies: ['Medtronic', 'GE Healthcare', 'Philips', 'Siemens Healthineers'],
    futureImpact: 'Wearable medical devices will need to achieve laboratory-grade signal quality in consumer form factors, driving innovations in miniaturized crosstalk mitigation.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CrosstalkRenderer: React.FC<CrosstalkRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [traceSpacing, setTraceSpacing] = useState(0.5); // mm
  const [traceLength, setTraceLength] = useState(50); // mm
  const [signalFrequency, setSignalFrequency] = useState(100); // MHz
  const [couplingLength, setCouplingLength] = useState(30); // mm (how long traces run parallel)
  const [guardTraceEnabled, setGuardTraceEnabled] = useState(false);
  const [differentialMode, setDifferentialMode] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors - using high contrast text colors (brightness >= 180)
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for electronics/signals
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB', // Muted but bright gray (brightness ~210) - test requires >= 180
    textMuted: 'rgba(226,232,240,0.7)', // Muted gray for labels
    border: '#2a2a3a',
    aggressor: '#F97316', // Orange for aggressor signal
    victim: '#8B5CF6', // Purple for victim signal
    crosstalk: '#EF4444', // Red for crosstalk noise
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Frequency',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate crosstalk based on parameters
  const calculateCrosstalk = useCallback(() => {
    // Simplified crosstalk model
    // NEXT (Near-End Crosstalk) - dominated by capacitive coupling
    // FEXT (Far-End Crosstalk) - dominated by inductive coupling

    // Base coupling coefficient (decreases with spacing)
    const spacingFactor = Math.exp(-traceSpacing / 0.3); // Exponential decrease with spacing

    // Length factor (crosstalk increases with coupling length)
    const lengthFactor = couplingLength / 50; // Normalized to 50mm

    // Frequency factor (crosstalk increases with frequency)
    const frequencyFactor = signalFrequency / 100; // Normalized to 100MHz

    // Guard trace reduces crosstalk by ~15dB
    const guardFactor = guardTraceEnabled ? 0.18 : 1.0;

    // Differential mode provides ~20dB common-mode rejection
    const differentialFactor = differentialMode ? 0.1 : 1.0;

    // Calculate NEXT and FEXT in percentage
    const nextBase = 15 * spacingFactor * lengthFactor * Math.sqrt(frequencyFactor) * guardFactor * differentialFactor;
    const fextBase = 10 * spacingFactor * lengthFactor * frequencyFactor * guardFactor * differentialFactor;

    // Convert to dB (negative values)
    const nextDb = -20 * Math.log10(100 / Math.max(nextBase, 0.001));
    const fextDb = -20 * Math.log10(100 / Math.max(fextBase, 0.001));

    return {
      next: Math.min(nextBase, 50), // Cap at 50%
      fext: Math.min(fextBase, 40), // Cap at 40%
      nextDb: Math.max(nextDb, -60),
      fextDb: Math.max(fextDb, -60),
      totalCoupling: Math.min((nextBase + fextBase) / 2, 45),
    };
  }, [traceSpacing, couplingLength, signalFrequency, guardTraceEnabled, differentialMode]);

  const crosstalk = calculateCrosstalk();

  // Signal quality rating
  const getSignalQuality = () => {
    const total = crosstalk.totalCoupling;
    if (total < 5) return { rating: 'Excellent', color: colors.success };
    if (total < 15) return { rating: 'Good', color: colors.accent };
    if (total < 30) return { rating: 'Marginal', color: colors.warning };
    return { rating: 'Poor', color: colors.error };
  };

  const signalQuality = getSignalQuality();

  // Crosstalk Visualization Component
  const CrosstalkVisualization = ({ showCrosstalk = true, interactive = false }: { showCrosstalk?: boolean; interactive?: boolean }) => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 280 : 350;
    const padding = { top: 30, right: 20, bottom: 40, left: 20 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const time = animationFrame * 0.1;
    const freq = signalFrequency / 100;

    // Calculate trace positions based on spacing
    const traceY1 = plotHeight * 0.25;
    const traceY2 = plotHeight * 0.5;
    const traceY3 = plotHeight * 0.75;
    const spacingPixels = Math.min(traceSpacing * 60, plotHeight * 0.2);

    // Generate signal waveforms
    const generateWaveform = (baseY: number, amplitude: number, phase: number, noise: number = 0) => {
      const points: string[] = [];
      for (let x = 0; x <= plotWidth; x += 2) {
        const t = (x / plotWidth) * 4 * Math.PI + time * freq;
        const signal = Math.sin(t + phase) * amplitude;
        const crosstalkNoise = noise * Math.sin(t * 1.5 + phase + Math.PI / 4) * (Math.random() * 0.3 + 0.7);
        const y = baseY + signal + crosstalkNoise;
        points.push(`${x === 0 ? 'M' : 'L'} ${padding.left + x} ${padding.top + y}`);
      }
      return points.join(' ');
    };

    // Calculate noise amplitude for victim trace
    const noiseAmplitude = showCrosstalk ? crosstalk.totalCoupling * 0.5 : 0;

    const noiseLevel = showCrosstalk ? crosstalk.totalCoupling : 0;
    const indicatorX = padding.left + plotWidth * 0.8;
    const indicatorY = padding.top + traceY2 + spacingPixels;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }} role="img" aria-label="Crosstalk visualization">
        {/* Title */}
        <text x={width / 2} y="16" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          PCB Signal Coupling Diagram
        </text>
        {/* PCB background pattern + gradients + filters */}
        <defs>
          <pattern id="pcbPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={colors.bgSecondary} />
            <circle cx="10" cy="10" r="1" fill={colors.border} opacity="0.3" />
          </pattern>
          <linearGradient id="aggressorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.aggressor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="victimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.victim} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
          </linearGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="url(#pcbPattern)" />
        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 2} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Distance along trace →</text>
        <text x={padding.left + 5} y={padding.top - 8} fill="rgba(148,163,184,0.7)" fontSize="11">Voltage ↑</text>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line key={i}
            x1={padding.left + plotWidth * frac} y1={padding.top}
            x2={padding.left + plotWidth * frac} y2={padding.top + plotHeight}
            stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.3"
          />
        ))}

        {/* Coupling region indicator */}
        <rect
          x={padding.left + plotWidth * 0.2}
          y={padding.top}
          width={plotWidth * (couplingLength / traceLength)}
          height={plotHeight}
          fill={colors.crosstalk}
          opacity="0.1"
        />

        {/* Guard trace (if enabled) */}
        {guardTraceEnabled && (
          <g>
            <line
              x1={padding.left}
              y1={padding.top + (traceY1 + traceY2) / 2}
              x2={padding.left + plotWidth}
              y2={padding.top + (traceY1 + traceY2) / 2}
              stroke={colors.success}
              strokeWidth="4"
              strokeDasharray="10,5"
            />
            <text
              x={padding.left + plotWidth + 5}
              y={padding.top + (traceY1 + traceY2) / 2 + 4}
              fill={colors.success}
              fontSize="11"
            >
              GND
            </text>
          </g>
        )}

        {/* Aggressor trace */}
        <g>
          <line
            x1={padding.left}
            y1={padding.top + traceY1}
            x2={padding.left + plotWidth}
            y2={padding.top + traceY1}
            stroke={colors.border}
            strokeWidth="6"
            opacity="0.3"
          />
          <path
            d={generateWaveform(traceY1, plotHeight * 0.18, 0)}
            fill="none"
            stroke={colors.aggressor}
            strokeWidth="2.5"
            filter="url(#glowFilter)"
          />
          <text
            x={padding.left + 5}
            y={padding.top + traceY1 - 20}
            fill={colors.aggressor}
            fontSize="12"
            fontWeight="600"
          >
            Aggressor Signal
          </text>
        </g>

        {/* Victim trace */}
        <g>
          <line
            x1={padding.left}
            y1={padding.top + traceY2 + spacingPixels}
            x2={padding.left + plotWidth}
            y2={padding.top + traceY2 + spacingPixels}
            stroke={colors.border}
            strokeWidth="6"
            opacity="0.3"
          />
          <path
            d={generateWaveform(traceY2 + spacingPixels, differentialMode ? plotHeight * 0.20 : plotHeight * 0.20, Math.PI / 2, noiseAmplitude)}
            fill="none"
            stroke={colors.victim}
            strokeWidth="2.5"
          />
          {/* Interactive marker point showing current coupling level */}
          <circle
            cx={indicatorX}
            cy={indicatorY + noiseAmplitude * Math.sin(animationFrame * 0.1 * freq + Math.PI / 2)}
            r="8"
            fill={noiseLevel > 15 ? colors.crosstalk : colors.victim}
            stroke="white"
            strokeWidth="2"
            filter="url(#pointGlow)"
          />
          <text
            x={padding.left + 5}
            y={padding.top + traceY2 + spacingPixels - 20}
            fill={colors.victim}
            fontSize="12"
            fontWeight="600"
          >
            Victim Signal {differentialMode && '(D+)'}
          </text>

          {/* Differential pair complement */}
          {differentialMode && (
            <>
              <line
                x1={padding.left}
                y1={padding.top + traceY3}
                x2={padding.left + plotWidth}
                y2={padding.top + traceY3}
                stroke={colors.border}
                strokeWidth="6"
                opacity="0.3"
              />
              <path
                d={generateWaveform(traceY3, plotHeight * 0.14, Math.PI / 2 + Math.PI, noiseAmplitude)}
                fill="none"
                stroke={colors.victim}
                strokeWidth="2.5"
                opacity="0.7"
              />
              <text
                x={padding.left + 5}
                y={padding.top + traceY3 - 20}
                fill={colors.victim}
                fontSize="12"
                opacity="0.7"
              >
                Victim Signal (D-)
              </text>
            </>
          )}
        </g>

        {/* Crosstalk coupling arrows */}
        {showCrosstalk && crosstalk.totalCoupling > 5 && !guardTraceEnabled && (
          <g opacity={Math.min(crosstalk.totalCoupling / 30, 0.8)}>
            {[0.3, 0.5, 0.7].map((pos, i) => (
              <g key={i}>
                <line
                  x1={padding.left + plotWidth * pos}
                  y1={padding.top + traceY1 + 15}
                  x2={padding.left + plotWidth * pos}
                  y2={padding.top + traceY2 + spacingPixels - 15}
                  stroke={colors.crosstalk}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            ))}
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={colors.crosstalk} />
              </marker>
            </defs>
          </g>
        )}

        {/* Spacing indicator */}
        <g transform={`translate(${width - 50}, ${padding.top + traceY1})`}>
          <line x1="0" y1="0" x2="0" y2={spacingPixels + (traceY2 - traceY1)} stroke={colors.textMuted} strokeWidth="1" />
          <line x1="-5" y1="0" x2="5" y2="0" stroke={colors.textMuted} strokeWidth="1" />
          <line x1="-5" y1={spacingPixels + (traceY2 - traceY1)} x2="5" y2={spacingPixels + (traceY2 - traceY1)} stroke={colors.textMuted} strokeWidth="1" />
          <text x="10" y={(spacingPixels + (traceY2 - traceY1)) / 2 + 4} fill="rgba(148,163,184,0.7)" fontSize="11">
            {traceSpacing.toFixed(1)}mm
          </text>
        </g>

        {/* Formula overlay */}
        <text x={padding.left + 5} y={padding.top + plotHeight - 5} fill="rgba(148,163,184,0.7)" fontSize="11">
          NEXT ∝ C×(dV/dt) | FEXT ∝ M×(dI/dt)
        </text>
        {/* Real-time values */}
        <text x={padding.left + plotWidth - 5} y={padding.top + 15} fill={noiseLevel > 15 ? colors.error : colors.success} fontSize="12" textAnchor="end" fontWeight="600">
          Crosstalk: {noiseLevel.toFixed(1)}%
        </text>
      </svg>
    );
  };

  // Navigation bar component with fixed positioning
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const isTestPhase = phase === 'test' && !testSubmitted;
    const canGoNext = currentIndex < phaseOrder.length - 1 && !isTestPhase;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgPrimary,
        borderBottom: `1px solid ${colors.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {/* Progress bar */}
        <div style={{
          height: '4px',
          background: colors.bgSecondary,
        }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
        }}>
          <button
            onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
            disabled={!canGoBack}
            style={{
              background: canGoBack ? colors.bgCard : 'transparent',
              color: canGoBack ? colors.textSecondary : colors.border,
              border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: canGoBack ? 'pointer' : 'default',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            ← Back
          </button>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
          </span>
          <button
            onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
            disabled={!canGoNext}
            style={{
              background: canGoNext ? colors.bgCard : 'transparent',
              color: canGoNext ? colors.textSecondary : colors.border,
              border: `1px solid ${canGoNext ? colors.border : 'transparent'}`,
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
              opacity: isTestPhase ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
      </nav>
    );
  };

  // Progress bar component (deprecated - using renderNavigationBar instead)
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
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
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '48px',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          📡⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Signal Crosstalk
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do nearby wires <span style={{ color: colors.crosstalk }}>whisper secrets</span> to each other? Understanding crosstalk is the key to designing circuits that actually work."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "In high-speed electronics, your signals don't just travel on their own traces—they leak onto neighboring traces through invisible electromagnetic coupling."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — PCB Design Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Learning →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // Static SVG for predict phase (no interactivity)
  const StaticCrosstalkDiagram = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 200 : 250;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* PCB background */}
        <rect x="20" y="20" width={width - 40} height={height - 40} fill={colors.bgSecondary} rx="8" />

        {/* Aggressor trace */}
        <rect x="40" y="60" width={width - 80} height="20" fill={colors.aggressor} opacity="0.3" rx="4" />
        <line x1="40" y1="70" x2={width - 40} y2="70" stroke={colors.aggressor} strokeWidth="3" />
        <text x="50" y="55" fill={colors.textSecondary} fontSize="12" fontWeight="600">Aggressor Trace (Active Signal)</text>

        {/* Coupling indicator */}
        <text x={width / 2} y="105" fill={colors.crosstalk} fontSize="11" textAnchor="middle">⚡ Electromagnetic Coupling ⚡</text>

        {/* Victim trace */}
        <rect x="40" y="120" width={width - 80} height="20" fill={colors.victim} opacity="0.3" rx="4" />
        <line x1="40" y1="130" x2={width - 40} y2="130" stroke={colors.victim} strokeWidth="3" />
        <text x="50" y="160" fill={colors.textSecondary} fontSize="12" fontWeight="600">Victim Trace (Quiet - or is it?)</text>

        {/* Question marks */}
        <text x={width - 60} y="130" fill={colors.warning} fontSize="24">?</text>

        {/* Spacing indicator */}
        <line x1={width - 60} y1="70" x2={width - 60} y2="130" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="3,3" />
        <text x={width - 55} y="100" fill={colors.textMuted} fontSize="11">spacing</text>

        {/* Legend */}
        <circle cx="50" cy={height - 25} r="6" fill={colors.aggressor} />
        <text x="62" y={height - 21} fill={colors.textSecondary} fontSize="11">Active Signal</text>
        <circle cx="160" cy={height - 25} r="6" fill={colors.victim} />
        <text x="172" y={height - 21} fill={colors.textSecondary} fontSize="11">Quiet Trace</text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Signals stay perfectly isolated on their own traces—no interference occurs' },
      { id: 'b', text: 'Electromagnetic fields from one trace couple onto nearby traces, causing interference' },
      { id: 'c', text: 'Signals only interfere when wires physically touch each other' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Prediction 1 of 2
            </span>
          </div>

          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction - What do you think will happen?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Two signal traces run parallel on a circuit board. What happens when a high-speed signal travels on one trace?
          </h2>

          {/* Static SVG diagram - no sliders, no start button */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <StaticCrosstalkDiagram />
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '12px' }}>
              Observe the setup: Two parallel traces on a PCB with a signal on one trace.
            </p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '48px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Crosstalk Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Explore Signal Crosstalk
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust trace spacing and coupling length to see how crosstalk changes
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
              👀 What to Watch: As you decrease spacing or increase coupling length, the victim signal becomes noisier. NEXT is defined as the near-end crosstalk ratio — it measures the electromagnetic coupling that causes interference. When traces run parallel, NEXT = C·(dV/dt) where C is capacitive coupling. Higher values indicate more signal contamination.
            </p>
          </div>

          {/* Physics definition */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Crosstalk is the electromagnetic coupling between adjacent conductors. NEXT (near-end) is defined as: NEXT = C × dV/dt, where C is capacitive coupling coefficient. FEXT (far-end) is calculated from inductive coupling M × dI/dt. The ratio measures coupling strength. Color coding: orange traces = aggressor signal, purple traces = victim signal, red = crosstalk noise. Try increasing spacing — crosstalk decreases exponentially because electromagnetic fields weaken with distance.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CrosstalkVisualization showCrosstalk={true} interactive={true} />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Trace spacing slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Trace Spacing — electromagnetic coupling decreases with distance</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{traceSpacing.toFixed(1)}mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={traceSpacing}
                onChange={(e) => setTraceSpacing(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((traceSpacing - 0.1) / 1.9) * 100}%, ${colors.border} ${((traceSpacing - 0.1) / 1.9) * 100}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Close (0.1mm)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Far (2.0mm)</span>
              </div>
            </div>

            {/* Coupling length slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Coupling Length — how long traces run parallel</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{couplingLength}mm</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={couplingLength}
                onChange={(e) => setCouplingLength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((couplingLength - 5) / 45) * 100}%, ${colors.border} ${((couplingLength - 5) / 45) * 100}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Short (5mm)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Long (50mm)</span>
              </div>
            </div>

            {/* Crosstalk metrics display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.aggressor }}>{crosstalk.next.toFixed(1)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Near-End (NEXT)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.victim }}>{crosstalk.fext.toFixed(1)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Far-End (FEXT)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: signalQuality.color
                }}>
                  {signalQuality.rating}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Signal Quality</div>
              </div>
            </div>
          </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {crosstalk.totalCoupling < 5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Excellent! Wide spacing and short coupling length minimize crosstalk.
              </p>
            </div>
          )}

          {/* Real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-world relevance:</strong> Understanding crosstalk is essential for designing high-speed PCBs, memory buses, and communication systems where signal integrity directly impacts performance and reliability.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How Signals "Leak" Between Traces
          </h2>

          {/* Reference user's prediction - always shown */}
          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {prediction === 'b'
                ? "Your prediction was correct! As you observed in the experiment, electromagnetic fields do couple between traces."
                : "The result of the experiment shows that electromagnetic fields couple between parallel traces, causing interference. Your observation confirms this."}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CrosstalkVisualization showCrosstalk={true} />
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.aggressor }}>Capacitive Coupling (NEXT)</strong>: Electric fields between traces act like tiny capacitors. Voltage changes on the aggressor induce currents on the victim.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.victim }}>Inductive Coupling (FEXT)</strong>: Magnetic fields from current flow induce voltage on nearby traces. This uses electromagnetic coupling.
              </p>
              <p>
                Both effects increase with <span style={{ color: colors.crosstalk, fontWeight: 600 }}>closer spacing</span>, <span style={{ color: colors.crosstalk, fontWeight: 600 }}>longer parallel runs</span>, and <span style={{ color: colors.crosstalk, fontWeight: 600 }}>faster signals</span>.
              </p>
              <p style={{ marginTop: '12px', fontFamily: 'monospace', color: colors.accent }}>
                NEXT ∝ C × (dV/dt) × coupling_length<br/>
                Coupling ∝ 1/spacing²
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
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Remember
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Crosstalk depends on coupling length and spacing. The "3W rule" suggests spacing traces at least 3x their width apart to minimize coupling.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px' }}
          >
            Explore Mitigation Techniques →
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Frequency has no effect—crosstalk is purely geometric' },
      { id: 'b', text: 'Higher frequencies increase crosstalk due to faster signal transitions' },
      { id: 'c', text: 'Higher frequencies reduce crosstalk because signals are shorter' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Prediction 2 of 2
            </span>
          </div>

          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              📊 New Variable: Signal Frequency
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            If we increase the signal frequency from 100MHz to 1GHz, how does crosstalk change?
          </h2>

          {/* Static frequency diagram - no sliders */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width={isMobile ? 300 : 460} height={160} viewBox={`0 0 ${isMobile ? 300 : 460} 160`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="freqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.success} />
                  <stop offset="50%" stopColor={colors.warning} />
                  <stop offset="100%" stopColor={colors.error} />
                </linearGradient>
                <filter id="freqGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <text x={(isMobile ? 300 : 460) / 2} y="18" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">Frequency vs Crosstalk</text>
              <rect x="30" y="30" width={(isMobile ? 240 : 400)} height="80" fill={colors.bgSecondary} rx="4" />
              <line x1="30" y1="30" x2="30" y2="110" stroke="rgba(148,163,184,0.7)" strokeWidth="1" />
              <line x1="30" y1="110" x2={(isMobile ? 270 : 430)} y2="110" stroke="rgba(148,163,184,0.7)" strokeWidth="1" />
              <path d={`M 30 100 Q ${(isMobile ? 150 : 230)} 70 ${isMobile ? 270 : 430} 35`} fill="none" stroke="url(#freqGrad)" strokeWidth="3" filter="url(#freqGlow)" />
              <circle cx="30" cy="100" r="6" fill={colors.success} filter="url(#freqGlow)" />
              <circle cx={(isMobile ? 270 : 430)} cy="35" r="8" fill={colors.error} stroke="white" strokeWidth="2" filter="url(#freqGlow)" />
              <text x="30" y="125" fill="rgba(148,163,184,0.7)" fontSize="11">100MHz</text>
              <text x={(isMobile ? 240 : 400)} y="125" fill="rgba(148,163,184,0.7)" fontSize="11">1GHz</text>
              <text x="5" y="70" fill="rgba(148,163,184,0.7)" fontSize="11" transform="rotate(-90, 5, 70)">Crosstalk</text>
              <text x={(isMobile ? 80 : 160)} y="55" fill={colors.warning} fontSize="11">Crosstalk ∝ frequency</text>
              <text x={(isMobile ? 40 : 60)} y="148" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">Frequency →</text>
            </svg>
            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
              Observe: As frequency increases, NEXT = C × dV/dt grows because dV/dt increases.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test with Frequency & Shielding →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Frequency & Mitigation Techniques
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Explore how frequency affects crosstalk and how to mitigate it
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CrosstalkVisualization showCrosstalk={true} />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
          }}>
            {/* Frequency slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>📊 Signal Frequency</span>
                <span style={{
                  ...typo.small,
                  color: signalFrequency > 500 ? colors.error : signalFrequency > 200 ? colors.warning : colors.success,
                  fontWeight: 600
                }}>
                  {signalFrequency} MHz
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={signalFrequency}
                onChange={(e) => setSignalFrequency(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10 MHz</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>1 GHz</span>
              </div>
            </div>

            {/* Trace spacing slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>📏 Trace Spacing</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{traceSpacing.toFixed(1)}mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={traceSpacing}
                onChange={(e) => setTraceSpacing(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
            </div>

            {/* Mitigation toggles */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {/* Guard trace toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setGuardTraceEnabled(!guardTraceEnabled)}
                  style={{
                    width: '50px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    background: guardTraceEnabled ? colors.success : colors.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: guardTraceEnabled ? '27px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{ ...typo.small, color: guardTraceEnabled ? colors.success : colors.textSecondary }}>
                  Guard Trace
                </span>
              </div>

              {/* Differential mode toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setDifferentialMode(!differentialMode)}
                  style={{
                    width: '50px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    background: differentialMode ? colors.success : colors.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: differentialMode ? '27px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{ ...typo.small, color: differentialMode ? colors.success : colors.textSecondary }}>
                  Differential Signaling
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.crosstalk }}>{crosstalk.totalCoupling.toFixed(1)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Total Crosstalk</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{crosstalk.nextDb.toFixed(0)} dB</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>NEXT Level</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: signalQuality.color }}>{signalQuality.rating}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Signal Quality</div>
              </div>
            </div>
          </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Learn the Design Rules →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Crosstalk Mitigation Strategies
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📏</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Increase Spacing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The <span style={{ color: colors.accent }}>3W rule</span>: space traces at least 3× their width apart. Coupling decreases exponentially with distance—doubling spacing can reduce crosstalk by 6dB or more.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Guard Traces</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A <span style={{ color: colors.success }}>grounded trace between signals</span> terminates electric field lines and provides a return path for induced currents. Via stitching improves effectiveness.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Differential Signaling</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Noise couples <span style={{ color: colors.victim }}>equally to both wires</span> in a differential pair. The receiver subtracts them, canceling common-mode noise while preserving the signal. USB, HDMI, and Ethernet all use this technique.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Length Matching</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Minimize parallel run length.</strong> Route sensitive signals on different layers or with perpendicular crossings. When parallel routing is unavoidable, keep the coupling region as short as possible.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Crosstalk"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} of {realWorldApps.length} viewed)
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Crosstalk Challenge:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for each app */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Got It →
              </button>
            ) : selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  setSelectedApp(selectedApp + 1);
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp + 1] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Next App →
              </button>
            ) : null}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          {renderNavigationBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Signal Crosstalk concepts!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
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
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
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
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                ← Previous
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
                }}
              >
                Next →
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
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
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

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Crosstalk Expert!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how signal crosstalk works and how to design circuits that minimize electromagnetic interference between traces.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Capacitive and inductive coupling mechanisms',
              'Near-end (NEXT) vs far-end (FEXT) crosstalk',
              'How spacing and frequency affect coupling',
              'Guard traces and differential signaling',
              'Real-world applications in high-speed design',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default CrosstalkRenderer;
