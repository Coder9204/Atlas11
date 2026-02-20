'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Clock Jitter - Complete 10-Phase Game
// Understanding timing variations and their impact on digital system performance
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

interface ClockJitterRendererProps {
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
    scenario: "A high-speed ADC samples at exactly 100 MHz, but the oscilloscope shows the clock edges vary by +/- 5 picoseconds from their ideal positions.",
    question: "What type of timing variation is the engineer observing?",
    options: [
      { id: 'a', label: "Frequency drift from temperature changes" },
      { id: 'b', label: "Clock jitter - random timing uncertainty in clock edges", correct: true },
      { id: 'c', label: "Harmonic distortion in the clock waveform" },
      { id: 'd', label: "Ground bounce from switching noise" }
    ],
    explanation: "Clock jitter is the deviation of clock signal edges from their ideal positions in time. This random timing uncertainty affects when data is sampled, potentially causing errors in high-speed digital systems."
  },
  {
    scenario: "An engineer measures the time between consecutive rising clock edges. Most measurements show 10ns (100 MHz), but values range from 9.95ns to 10.05ns.",
    question: "What specific type of jitter is being measured?",
    options: [
      { id: 'a', label: "Period jitter - variation in individual clock periods", correct: true },
      { id: 'b', label: "Phase noise - frequency domain jitter" },
      { id: 'c', label: "Deterministic jitter from EMI" },
      { id: 'd', label: "Total integrated jitter" }
    ],
    explanation: "Period jitter measures the deviation of each clock period from the ideal period. Cycle-to-cycle jitter measures the difference between adjacent periods. Both are critical specifications for high-speed clocks."
  },
  {
    scenario: "A 14-bit ADC's datasheet specifies it can achieve 80 dB SNR at 100 MSPS. When tested with a 50 MHz input signal, SNR measures only 65 dB.",
    question: "What is the most likely cause of the 15 dB SNR degradation?",
    options: [
      { id: 'a', label: "The input signal frequency is too high" },
      { id: 'b', label: "Excessive clock jitter is causing aperture error", correct: true },
      { id: 'c', label: "The ADC's internal reference is unstable" },
      { id: 'd', label: "Power supply ripple is coupling into the signal" }
    ],
    explanation: "Clock jitter causes aperture error in ADCs - the sampling instant varies randomly, capturing slightly wrong voltage values. For high-frequency input signals, even picoseconds of jitter translate to significant voltage errors, degrading SNR."
  },
  {
    scenario: "A PLL generates a 1 GHz clock from a 10 MHz reference. The reference has 1ps RMS jitter, but the 1 GHz output shows 5ps RMS jitter.",
    question: "Why does the PLL output have more jitter than the input?",
    options: [
      { id: 'a', label: "The PLL is broken and needs replacement" },
      { id: 'b', label: "The VCO and other PLL components add their own jitter", correct: true },
      { id: 'c', label: "Higher frequencies always have more jitter" },
      { id: 'd', label: "The multiplication factor directly multiplies jitter" }
    ],
    explanation: "PLLs add jitter from their internal components - the VCO (Voltage Controlled Oscillator), charge pump, and loop filter all contribute noise. The PLL bandwidth determines how much reference jitter passes through versus how much VCO jitter appears at the output."
  },
  {
    scenario: "An FPGA design meets timing at room temperature but fails after thermal stress testing. Setup time violations occur on paths that had 500ps margin.",
    question: "How might clock jitter contribute to this temperature-dependent failure?",
    options: [
      { id: 'a', label: "Jitter physically damages the clock distribution network" },
      { id: 'b', label: "Higher temperatures increase jitter, consuming the timing margin", correct: true },
      { id: 'c', label: "Clock jitter only affects ADCs, not FPGAs" },
      { id: 'd', label: "The FPGA's internal delay is independent of temperature" }
    ],
    explanation: "Clock jitter typically increases with temperature as thermal noise in oscillators and buffers rises. This consumes timing margin, turning borderline-passing paths into failures. Good designs account for worst-case jitter at maximum operating temperature."
  },
  {
    scenario: "An eye diagram of a 10 Gbps serial link shows the 'eye' nearly closed - the open area where valid data can be sampled is very small.",
    question: "What does a nearly-closed eye indicate about jitter in this system?",
    options: [
      { id: 'a', label: "The receiver's clock is perfectly aligned" },
      { id: 'b', label: "High jitter is causing significant timing uncertainty, reducing valid sampling window", correct: true },
      { id: 'c', label: "The data rate is too slow for the channel" },
      { id: 'd', label: "The eye diagram equipment is miscalibrated" }
    ],
    explanation: "The eye diagram overlays many data transitions. Jitter causes edges to spread horizontally, while noise causes vertical spreading. A closed eye means jitter and/or noise have consumed the timing margin - there's no reliable point to sample the data."
  },
  {
    scenario: "A DDR4 memory interface runs at 3200 MT/s. The timing budget allocates 156ps for setup, 156ps for hold, and the remaining window for jitter.",
    question: "With a 312.5ps bit period, approximately how much total jitter can the system tolerate?",
    options: [
      { id: 'a', label: "312.5ps - all the bit period is available for jitter" },
      { id: 'b', label: "0ps - there's no room for jitter in DDR4" },
      { id: 'c', label: "Essentially 0ps after setup/hold - jitter directly consumes margin", correct: true },
      { id: 'd', label: "156ps - half the bit period" }
    ],
    explanation: "At 3200 MT/s, the bit period is just 312.5ps. After setup (156ps) and hold (156ps) requirements, there's essentially no margin left. Every picosecond of jitter directly threatens timing closure, which is why DDR4 requires extremely low-jitter clocks."
  },
  {
    scenario: "A system uses a crystal oscillator feeding multiple clock buffers. The furthest buffer from the oscillator shows 3x the jitter of the nearest buffer.",
    question: "What phenomenon is causing the increased jitter at distant buffers?",
    options: [
      { id: 'a', label: "The clock frequency is attenuating with distance" },
      { id: 'b', label: "Each buffer in the chain adds its own jitter contribution", correct: true },
      { id: 'c', label: "EMI is coupling into the longer traces" },
      { id: 'd', label: "The crystal's quality factor decreases with load" }
    ],
    explanation: "Clock buffers add jitter (additive jitter) - their internal noise creates timing uncertainty. In a chain of buffers, jitter accumulates (roughly as root-sum-square for random jitter). This is why clock tree design carefully minimizes buffer stages."
  },
  {
    scenario: "A spectrum analyzer shows the 100 MHz clock signal with 'skirts' of energy spreading several kHz around the carrier, rather than a clean spike.",
    question: "What does this frequency-domain view reveal about the clock?",
    options: [
      { id: 'a', label: "The clock has harmonic distortion" },
      { id: 'b', label: "Phase noise - the frequency domain representation of jitter", correct: true },
      { id: 'c', label: "The clock is being amplitude modulated" },
      { id: 'd', label: "Ground plane resonance at the clock frequency" }
    ],
    explanation: "Phase noise and jitter are two views of the same phenomenon. Time-domain jitter appears as phase noise in the frequency domain - energy spread around the carrier frequency. Low phase noise oscillators are essential for RF systems and high-speed data converters."
  },
  {
    scenario: "A SerDes link achieves a bit error rate (BER) of 10^-12 in the lab, but the same design shows 10^-9 BER in a noisy industrial environment.",
    question: "How might environmental factors be affecting jitter and BER?",
    options: [
      { id: 'a', label: "Industrial environments have different physics laws" },
      { id: 'b', label: "EMI couples into clock and data paths, adding deterministic jitter that closes the eye", correct: true },
      { id: 'c', label: "Higher humidity increases data corruption" },
      { id: 'd', label: "BER naturally varies by 1000x due to cosmic rays" }
    ],
    explanation: "Deterministic jitter (DJ) from EMI, crosstalk, and power supply noise adds to random jitter. In noisy environments, this DJ can be significant, consuming timing margin and increasing BER. Proper shielding, filtering, and layout techniques mitigate these effects."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📡',
    title: 'High-Speed Data Converters',
    short: 'ADC/DAC precision timing',
    tagline: 'Every picosecond counts for signal fidelity',
    description: 'High-resolution ADCs and DACs require ultra-low jitter clocks to achieve their specified performance. Jitter directly degrades signal-to-noise ratio through aperture error, where timing uncertainty causes voltage sampling errors.',
    connection: 'When an ADC samples a fast-changing signal, clock jitter means the sampling instant is uncertain. This timing error translates to voltage error - the steeper the signal slope, the larger the error. SNR degrades as 20*log10(1/(2*pi*fin*tj)).',
    howItWorks: 'Low-jitter oscillators (OCXOs, crystal oscillators) feed clock buffers with minimal additive jitter. For the highest performance, clocks are often cleaned by narrow-bandwidth PLLs that filter high-frequency jitter components.',
    stats: [
      { value: '100 MHz', label: 'Ultra-low jitter clocks', icon: '🎯' },
      { value: '24 billion', label: 'ADC samples per second', icon: '📊' },
      { value: '90 GHz', label: 'Achievable bandwidth', icon: '📈' }
    ],
    examples: ['5G base station receivers', 'Software-defined radio', 'Medical imaging (MRI, CT)', 'Radar systems'],
    companies: ['Analog Devices', 'Texas Instruments', 'Renesas', 'SiTime'],
    futureImpact: 'Next-generation 6G and terahertz systems will require femtosecond-class jitter performance, pushing oscillator technology to new limits.',
    color: '#10B981'
  },
  {
    icon: '💾',
    title: 'High-Speed Memory Interfaces',
    short: 'DDR5 and beyond',
    tagline: 'Nanosecond windows at gigahertz speeds',
    description: 'DDR5 memory runs at 4800-8400 MT/s, giving bit periods of just 119-208 picoseconds. Clock jitter directly consumes timing margin, threatening setup and hold requirements for reliable data capture.',
    connection: 'Memory controllers and DRAM chips must sample data within tight timing windows. Clock jitter reduces the effective window - if jitter exceeds the margin, bits are corrupted. Training algorithms partially compensate, but fundamental jitter limits remain.',
    howItWorks: 'Memory systems use on-die PLLs, DLLs (delay-locked loops), and calibration circuits to align clocks with data. Write leveling and read training find the optimal sampling point, but these assume deterministic skew - random jitter still causes errors.',
    stats: [
      { value: '8400 MHz', label: 'DDR5 peak speed', icon: '⚡' },
      { value: '5 GB', label: 'Memory bandwidth', icon: '⏱️' },
      { value: '119 million', label: 'Cycles per second', icon: '📐' }
    ],
    examples: ['Gaming PCs', 'Data center servers', 'AI accelerators', 'Smartphones'],
    companies: ['Samsung', 'SK Hynix', 'Micron', 'Intel'],
    futureImpact: 'DDR6 and HBM4 will push data rates to 12+ Gbps per pin, requiring even tighter jitter control through advanced clocking architectures.',
    color: '#3B82F6'
  },
  {
    icon: '🔗',
    title: 'SerDes and High-Speed Links',
    short: 'Multi-gigabit serial interfaces',
    tagline: 'Clean clocks for clear communication',
    description: 'PCIe 6.0, USB4, and Ethernet 400G/800G use multi-gigabit serial links with embedded clocks. The receiver must recover timing from the data stream - jitter in the transmitter clock directly affects the recovered clock and data integrity.',
    connection: 'SerDes receivers use clock-data recovery (CDR) circuits to extract timing from incoming data. Transmitter jitter transfers to the link, and the CDR must track it. If jitter exceeds the CDR bandwidth or total jitter budget, bit errors occur.',
    howItWorks: 'Low-jitter reference clocks feed fractional-N PLLs that synthesize the exact line rate. Equalization (CTLE, DFE) compensates for channel loss, while CDR tracks frequency and phase. Eye diagram analysis validates jitter margin.',
    stats: [
      { value: '64 GHz', label: 'PCIe 6.0 speed', icon: '🚀' },
      { value: '12 GB', label: 'Data throughput', icon: '✅' },
      { value: '1 million', label: 'Transfers per second', icon: '⏰' }
    ],
    examples: ['Data center interconnects', 'AI training clusters', 'Storage (NVMe)', 'Automotive networking'],
    companies: ['Marvell', 'Broadcom', 'Cadence', 'Synopsys'],
    futureImpact: 'Future 224 Gbps links will require PAM4 modulation and ultra-low jitter, with margins measured in single-digit picoseconds.',
    color: '#8B5CF6'
  },
  {
    icon: '📻',
    title: 'RF and Wireless Systems',
    short: 'Phase noise in radio systems',
    tagline: 'Clean spectrums for clear signals',
    description: 'In RF systems, clock jitter manifests as phase noise - unwanted energy spread around the carrier frequency. This degrades receiver sensitivity, causes adjacent channel interference, and limits modulation accuracy in 5G and WiFi systems.',
    connection: 'Local oscillators (LOs) in mixers convert signals between frequencies. Phase noise on the LO spreads to the converted signal, potentially corrupting closely-spaced channels. High-order modulation (256-QAM) is extremely sensitive to phase noise.',
    howItWorks: 'RF synthesizers use low-noise VCOs locked to crystal references via PLLs. The PLL loop bandwidth trades off reference noise suppression versus VCO noise passthrough. Careful design achieves <-110 dBc/Hz phase noise at typical offsets.',
    stats: [
      { value: '110 MHz', label: 'Typical carrier frequency', icon: '📡' },
      { value: '4096 MB', label: 'Data per second', icon: '📶' },
      { value: '6 GHz', label: '5G bands upper limit', icon: '🌐' }
    ],
    examples: ['5G smartphones', 'WiFi 7 routers', 'Satellite communications', 'Test equipment'],
    companies: ['Qualcomm', 'Qorvo', 'Skyworks', 'MACOM'],
    futureImpact: '6G systems in the terahertz band will require order-of-magnitude improvements in phase noise to enable new spectrum usage.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ClockJitterRenderer: React.FC<ClockJitterRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [jitterAmount, setJitterAmount] = useState(50); // picoseconds RMS
  const [clockFrequency, setClockFrequency] = useState(100); // MHz
  const [dataRate, setDataRate] = useState(1); // Gbps
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentTransferStep, setCurrentTransferStep] = useState(0);

  // Predict phase step tracking
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors - updated for better contrast (brightness >= 180)
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for clock/timing theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Bright gray for secondary text (brightness ~231)
    textMuted: '#9CA3AF', // Muted gray for hints/less important text (brightness ~163)
    border: '#2a2a3a',
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
    twist_play: 'Twist Explore',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate timing metrics
  const calculateMetrics = useCallback(() => {
    const periodNs = 1000 / clockFrequency; // ns
    const periodPs = periodNs * 1000; // ps
    const jitterRatio = (jitterAmount / periodPs) * 100; // percentage of period

    // Simplified SNR degradation model for ADC
    // SNR = -20 * log10(2 * pi * fin * tj)
    const inputFreqHz = clockFrequency * 1e6 * 0.4; // Nyquist-ish
    const jitterSeconds = jitterAmount * 1e-12;
    const snrLoss = 20 * Math.log10(2 * Math.PI * inputFreqHz * jitterSeconds);
    const idealSnr = 74; // ~12-bit ADC
    const actualSnr = Math.max(20, idealSnr + snrLoss);

    // Timing margin calculation
    const bitPeriodPs = 1000000 / dataRate; // ps for Gbps
    const timingMargin = Math.max(0, (bitPeriodPs / 2) - (3 * jitterAmount)); // 3-sigma
    const marginPercent = (timingMargin / (bitPeriodPs / 2)) * 100;

    return {
      periodPs,
      jitterRatio,
      actualSnr,
      snrLoss: Math.abs(snrLoss),
      timingMargin,
      marginPercent,
      bitPeriodPs
    };
  }, [jitterAmount, clockFrequency, dataRate]);

  const metrics = calculateMetrics();

  // Generate random jitter values for visualization
  const getJitter = useCallback((seed: number) => {
    // Simple seeded random for consistent animation
    const x = Math.sin(seed * 12.9898 + animationFrame * 0.1) * 43758.5453;
    return ((x - Math.floor(x)) - 0.5) * 2 * (jitterAmount / 100);
  }, [jitterAmount, animationFrame]);

  // Clock Signal Visualization
  const renderClockSignalVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 180 : 220;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const numPeriods = 6;
    const idealPeriodPx = plotWidth / numPeriods;

    // Generate ideal and jittered clock edges
    const idealEdges: number[] = [];
    const jitteredEdges: number[] = [];

    for (let i = 0; i <= numPeriods * 2; i++) {
      const idealX = padding.left + (i * idealPeriodPx / 2);
      idealEdges.push(idealX);
      jitteredEdges.push(idealX + getJitter(i) * idealPeriodPx * 0.3);
    }

    // Build clock waveform paths
    const buildClockPath = (edges: number[], yHigh: number, yLow: number) => {
      let path = `M ${edges[0]} ${yLow}`;
      for (let i = 0; i < edges.length - 1; i++) {
        const isHigh = i % 2 === 0;
        const currentY = isHigh ? yHigh : yLow;
        const nextY = isHigh ? yLow : yHigh;
        path += ` L ${edges[i]} ${currentY}`;
        path += ` L ${edges[i + 1]} ${currentY}`;
        if (i < edges.length - 2) {
          path += ` L ${edges[i + 1]} ${nextY}`;
        }
      }
      return path;
    };

    const yHigh = padding.top + 20;
    const yLow = padding.top + plotHeight - 20;
    const yMid = (yHigh + yLow) / 2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* Gradient and filter definitions for premium quality */}
        <defs>
          <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="1" />
            <stop offset="50%" stopColor="#0891B2" stopOpacity="1" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.bgSecondary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.bgPrimary} stopOpacity="0.9" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={colors.accent} floodOpacity="0.3" />
          </filter>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={colors.warning} />
          </marker>
        </defs>

        {/* Background with gradient */}
        <rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" rx="12" />

        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Clock Signal with Jitter
        </text>

        {/* Grid lines */}
        {[0, 0.5, 1].map(frac => (
          <line
            key={`hgrid-${frac}`}
            x1={padding.left}
            y1={padding.top + frac * plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + frac * plotHeight}
            stroke={colors.border}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        ))}

        {/* Ideal clock (dimmed) */}
        <path
          d={buildClockPath(idealEdges, yHigh, yLow)}
          fill="none"
          stroke={colors.textMuted}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.4"
        />

        {/* Jittered clock with gradient and glow */}
        <path
          d={buildClockPath(jitteredEdges, yHigh, yLow)}
          fill="none"
          stroke="url(#clockGradient)"
          strokeWidth="2.5"
          filter="url(#glowFilter)"
        />

        {/* Jitter indicators */}
        {jitteredEdges.slice(0, -1).map((edge, i) => {
          if (i % 2 !== 0) return null;
          const idealEdge = idealEdges[i];
          const diff = edge - idealEdge;
          if (Math.abs(diff) < 2) return null;
          return (
            <g key={`jitter-${i}`}>
              <line
                x1={idealEdge}
                y1={yMid - 5}
                x2={edge}
                y2={yMid - 5}
                stroke={Math.abs(diff) > idealPeriodPx * 0.15 ? colors.error : colors.warning}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Time
        </text>
        <text x={12} y={yHigh} fill={colors.textSecondary} fontSize="11" dominantBaseline="middle">
          HIGH
        </text>
        <text x={12} y={yLow} fill={colors.textSecondary} fontSize="11" dominantBaseline="middle">
          LOW
        </text>

        {/* Legend */}
        <line x1={padding.left + 10} y1={height - 32} x2={padding.left + 30} y2={height - 32} stroke={colors.textMuted} strokeDasharray="4,4" strokeWidth="1" />
        <text x={padding.left + 36} y={height - 28} fill={colors.textMuted} fontSize="11">Ideal</text>
        <line x1={padding.left + 80} y1={height - 32} x2={padding.left + 100} y2={height - 32} stroke="url(#clockGradient)" strokeWidth="2" />
        <text x={padding.left + 106} y={height - 28} fill={colors.textSecondary} fontSize="11">Actual</text>
      </svg>
    );
  };

  // Eye Diagram Visualization
  const renderEyeDiagramVisualization = () => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 200 : 260;
    const padding = { top: 30, right: 20, bottom: 40, left: 40 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate multiple overlaid eye traces
    const numTraces = 40;
    const traces: string[] = [];

    for (let t = 0; t < numTraces; t++) {
      const jitterOffset = getJitter(t * 7) * plotWidth * 0.2;
      const noiseOffset = getJitter(t * 13 + 1000) * 10;

      // Deterministic bit pattern ensuring at least one transition per trace
      const bitPatterns = [[0,1,0],[1,0,1],[0,0,1],[1,1,0],[0,1,1],[1,0,0]];
      const bits = bitPatterns[t % bitPatterns.length];

      const yHigh = padding.top + 20 + noiseOffset;
      const yLow = padding.top + plotHeight - 20 + noiseOffset;

      let path = '';
      const segmentWidth = plotWidth / 2;

      // Build path for 2 UI (unit intervals)
      for (let i = 0; i < 2; i++) {
        const startX = padding.left + i * segmentWidth + jitterOffset;
        const endX = startX + segmentWidth;
        const startY = bits[i] ? yHigh : yLow;
        const endY = bits[i + 1] ? yHigh : yLow;

        if (i === 0) {
          path = `M ${startX} ${startY}`;
        }

        // Transition with some slew rate
        const transitionWidth = segmentWidth * 0.15;
        path += ` L ${endX - transitionWidth} ${startY}`;
        path += ` L ${endX + transitionWidth} ${endY}`;
      }
      path += ` L ${padding.left + plotWidth + jitterOffset} ${bits[2] ? yHigh : yLow}`;

      traces.push(path);
    }

    // Calculate eye opening
    const eyeOpeningH = Math.max(0, plotWidth * 0.4 - jitterAmount * 2);
    const eyeOpeningV = Math.max(0, plotHeight * 0.4 - jitterAmount * 0.5);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Eye Diagram - Data at {dataRate} Gbps
        </text>

        {/* Background grid */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill={colors.bgSecondary}
          stroke={colors.border}
        />

        {/* Center crosshair */}
        <line
          x1={padding.left + plotWidth / 2}
          y1={padding.top}
          x2={padding.left + plotWidth / 2}
          y2={padding.top + plotHeight}
          stroke={colors.border}
          strokeDasharray="4,4"
        />
        <line
          x1={padding.left}
          y1={padding.top + plotHeight / 2}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight / 2}
          stroke={colors.border}
          strokeDasharray="4,4"
        />

        {/* Eye traces */}
        {traces.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={colors.accent}
            strokeWidth="1"
            opacity={0.15}
          />
        ))}

        {/* Eye opening indicator */}
        <ellipse
          cx={padding.left + plotWidth / 2}
          cy={padding.top + plotHeight / 2}
          rx={eyeOpeningH / 2}
          ry={eyeOpeningV / 2}
          fill="none"
          stroke={eyeOpeningH > plotWidth * 0.2 ? colors.success : colors.error}
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.8"
        />

        {/* Labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          1 UI (Unit Interval) = {(1000 / dataRate).toFixed(0)} ps
        </text>

        {/* Eye quality indicator */}
        <text
          x={padding.left + plotWidth / 2}
          y={padding.top + plotHeight / 2 + 4}
          fill={eyeOpeningH > plotWidth * 0.2 ? colors.success : colors.error}
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
        >
          {eyeOpeningH > plotWidth * 0.3 ? 'OPEN' : eyeOpeningH > plotWidth * 0.15 ? 'MARGINAL' : 'CLOSED'}
        </text>
      </svg>
    );
  };

  // Static Clock Signal for Predict Phase
  const renderStaticClockVisualization = () => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 180 : 220;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const numPeriods = 6;
    const idealPeriodPx = plotWidth / numPeriods;

    // Generate ideal edges only for static display
    const idealEdges: number[] = [];
    for (let i = 0; i <= numPeriods * 2; i++) {
      const idealX = padding.left + (i * idealPeriodPx / 2);
      idealEdges.push(idealX);
    }

    // Build clock waveform path
    const buildClockPath = (edges: number[], yHigh: number, yLow: number) => {
      let path = `M ${edges[0]} ${yLow}`;
      for (let i = 0; i < edges.length - 1; i++) {
        const isHigh = i % 2 === 0;
        const currentY = isHigh ? yHigh : yLow;
        const nextY = isHigh ? yLow : yHigh;
        path += ` L ${edges[i]} ${currentY}`;
        path += ` L ${edges[i + 1]} ${currentY}`;
        if (i < edges.length - 2) {
          path += ` L ${edges[i + 1]} ${nextY}`;
        }
      }
      return path;
    };

    const yHigh = padding.top + 20;
    const yLow = padding.top + plotHeight - 20;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          1 GHz Clock with +/- 10ps Jitter
        </text>

        {/* Grid lines */}
        {[0, 0.5, 1].map(frac => (
          <line
            key={`hgrid-${frac}`}
            x1={padding.left}
            y1={padding.top + frac * plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + frac * plotHeight}
            stroke={colors.border}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        ))}

        {/* Ideal clock */}
        <path
          d={buildClockPath(idealEdges, yHigh, yLow)}
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.5"
        />

        {/* Labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Time (1ns period)
        </text>
        <text x={12} y={yHigh} fill={colors.textSecondary} fontSize="11" dominantBaseline="middle">
          HIGH
        </text>
        <text x={12} y={yLow} fill={colors.textSecondary} fontSize="11" dominantBaseline="middle">
          LOW
        </text>
      </svg>
    );
  };

  // Navigation bar component - fixed at top with z-index
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
        <span style={{ fontSize: '24px' }}>⏱️</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Clock Jitter</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  // Bottom navigation bar with Back and Next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < phaseOrder.length - 1;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.bgSecondary,
      }}>
        <button
          onClick={() => canGoBack && prevPhase()}
          disabled={!canGoBack}
          style={{
            ...secondaryButtonStyle,
            opacity: canGoBack ? 1 : 0.5,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', gap: '4px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              className="nav-dot"
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i <= currentIndex ? colors.accent : colors.border,
                cursor: 'pointer',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => canGoForward && nextPhase()}
          disabled={!canGoForward}
          style={{
            ...primaryButtonStyle,
            opacity: canGoForward ? 1 : 0.5,
            cursor: canGoForward ? 'pointer' : 'not-allowed',
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // Progress bar component
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

  // Primary button style with minHeight for touch targets
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
    minHeight: '44px',
  };

  // Secondary button style with minHeight for touch targets
  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    minHeight: '44px',
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
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '84px',
          textAlign: 'center',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            ⏱️📊
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Clock Jitter
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "A perfect clock ticks exactly on time, every time. But real clocks <span style={{ color: colors.accent }}>wander by picoseconds</span>—and that tiny uncertainty can crash a gigabit link or corrupt an ADC sample."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "In the world of high-speed digital design, timing is everything. A picosecond of uncertainty can mean the difference between perfect data and complete failure."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — High-Speed Digital Design Principle
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Timing Uncertainty →
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing - modern circuits are too fast to notice picosecond variations' },
      { id: 'b', text: 'The timing uncertainty accumulates, reducing the window for valid data capture' },
      { id: 'c', text: 'The clock frequency drifts until it matches the data rate' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step {predictStep + 1} of 2
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
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A 1 GHz clock has 10ps of jitter. Each edge arrives +/- 10ps from its ideal time. What happens to data sampling?
            </h2>

            {/* Static diagram - no sliders, no start button */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              {renderStaticClockVisualization()}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); setPredictStep(1); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
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
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                See the Jitter Effect →
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Clock Jitter
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Observe Clock Jitter in Action
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust the jitter amount and see how it affects the clock signal
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}40`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Watch how the clock edges shift as you increase jitter. Notice how higher frequencies are more sensitive to the same jitter amount.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderClockSignalVisualization()}
              </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {/* Jitter amount slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Jitter Amount (RMS)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{jitterAmount} ps</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={jitterAmount}
                  onChange={(e) => setJitterAmount(parseInt(e.target.value))}
                  onInput={(e) => setJitterAmount(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>0 ps (Ideal)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>200 ps (High)</span>
                </div>
              </div>

              {/* Clock frequency slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Clock Frequency</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{clockFrequency} MHz</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={clockFrequency}
                  onChange={(e) => setClockFrequency(parseInt(e.target.value))}
                  onInput={(e) => setClockFrequency(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Metrics display */}
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{metrics.periodPs.toFixed(0)} ps</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Clock Period</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: metrics.jitterRatio > 10 ? colors.error : metrics.jitterRatio > 5 ? colors.warning : colors.success
                  }}>
                    {metrics.jitterRatio.toFixed(1)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Jitter / Period</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: metrics.actualSnr > 60 ? colors.success : metrics.actualSnr > 40 ? colors.warning : colors.error
                  }}>
                    {metrics.actualSnr.toFixed(0)} dB
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>ADC SNR Impact</div>
                </div>
              </div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {jitterAmount > 100 && (
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  Notice how the clock edges are now visibly unstable - this uncertainty affects every data sample!
                </p>
              </div>
            )}

            {/* Key term definitions */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>Key Terms:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Jitter:</strong> Random timing variation in clock edge positions from their ideal timing.
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>RMS (Root Mean Square):</strong> Statistical measure of jitter magnitude in picoseconds.
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>SNR (Signal-to-Noise Ratio):</strong> Ratio of signal power to noise power, measured in dB.
                </p>
              </div>
            </div>

            {/* Formula */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                ADC SNR degradation from jitter:
              </p>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}>
                <span style={{ color: colors.textPrimary, fontSize: '16px' }}>
                  SNR = -20 × log10(2 × π × f_in × t_jitter)
                </span>
              </div>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Real-World Relevance:</strong> In 5G base stations, DDR5 memory, and high-speed SerDes links, clock jitter directly limits data rates and system reliability. Engineers at companies like Qualcomm and Intel spend millions optimizing jitter to achieve 10^-12 bit error rates at multi-gigabit speeds.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Why Jitter Matters →
            </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Types of Clock Jitter
            </h2>

            {/* Reference to user's prediction */}
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                {prediction === 'b'
                  ? "As you predicted, timing uncertainty does accumulate and reduce the valid data capture window. Let's explore the different types of jitter that cause this."
                  : "As you observed in the simulation, clock jitter causes timing uncertainty that reduces the window for valid data capture. Here's why this happens."}
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Period Jitter</h3>
                  <p style={{ margin: 0 }}>
                    The deviation of each clock period from the ideal period. If the ideal period is 10ns, actual periods might be 9.95ns, 10.02ns, 10.01ns, etc.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Cycle-to-Cycle Jitter</h3>
                  <p style={{ margin: 0 }}>
                    The difference between adjacent clock periods. If period N is 10.02ns and period N+1 is 9.98ns, the cycle-to-cycle jitter is 40ps.
                  </p>
                </div>

                <div>
                  <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Long-Term (Accumulated) Jitter</h3>
                  <p style={{ margin: 0 }}>
                    The timing error accumulated over many cycles. Important for systems that track phase over long intervals, like SerDes receivers.
                  </p>
                </div>
              </div>
            </div>

            {/* Mathematical relationship / formula */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Formula: ADC SNR vs Jitter
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                The relationship between jitter and ADC performance is given by:
              </p>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}>
                <span style={{ ...typo.h3, color: colors.textPrimary }}>
                  SNR = -20 × log10(2 × pi × f_in × t_jitter)
                </span>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px', margin: 0 }}>
                Where f_in is input frequency and t_jitter is RMS jitter in seconds. This shows SNR is proportional to the inverse of jitter.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Insight
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Jitter directly consumes <strong style={{ color: colors.textPrimary }}>timing margin</strong>. In a system with 100ps of setup time margin, 50ps of jitter leaves only 50ps for all other timing uncertainties. As data rates increase, timing budgets shrink, making jitter control increasingly critical.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Eye Diagrams →
            </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The eye stays open - jitter only affects phase, not amplitude' },
      { id: 'b', text: 'The eye closes horizontally as timing uncertainty increases' },
      { id: 'c', text: 'The eye inverts, showing data corruption' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step {twistPredictStep + 1} of 2
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
                New Tool: The Eye Diagram
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              An eye diagram overlays many data bit transitions. As jitter increases, what happens to the "eye opening"?
            </h2>

            {/* Static eye diagram for predict */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 320 : 450} height={isMobile ? 150 : 180} viewBox={`0 0 ${isMobile ? 320 : 450} ${isMobile ? 150 : 180}`} style={{ background: colors.bgSecondary, borderRadius: '8px', maxWidth: '100%' }}>
                <text x="50%" y="20" fill={colors.textSecondary} fontSize="12" textAnchor="middle">
                  Eye Diagram Concept
                </text>
                {/* Simple eye shape */}
                <ellipse cx="50%" cy="50%" rx="80" ry="40" fill="none" stroke={colors.accent} strokeWidth="2" />
                <text x="50%" y={isMobile ? 130 : 160} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                  The "eye opening" shows timing margin
                </text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); setTwistPredictStep(1); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
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
                See the Eye Diagram →
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Eye Diagram Analysis
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust jitter and data rate to see how the eye opens or closes
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}40`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Watch the eye "close" as jitter increases. The dashed ellipse shows where valid data can be sampled - when it shrinks too much, errors occur.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderEyeDiagramVisualization()}
              </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {/* Jitter slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Jitter (RMS)</span>
                  <span style={{
                    ...typo.small,
                    color: jitterAmount > 100 ? colors.error : jitterAmount > 50 ? colors.warning : colors.success,
                    fontWeight: 600
                  }}>
                    {jitterAmount} ps
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={jitterAmount}
                  onChange={(e) => setJitterAmount(parseInt(e.target.value))}
                  onInput={(e) => setJitterAmount(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Data rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Data Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dataRate} Gbps</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={dataRate}
                  onChange={(e) => setDataRate(parseFloat(e.target.value))}
                  onInput={(e) => setDataRate(parseFloat((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>0.5 Gbps</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>10 Gbps</span>
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{(1000 / dataRate).toFixed(0)} ps</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Bit Period (UI)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: metrics.marginPercent > 30 ? colors.success : metrics.marginPercent > 10 ? colors.warning : colors.error
                  }}>
                    {metrics.marginPercent.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Timing Margin</div>
                </div>
              </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Jitter Sources →
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
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Sources and Mitigation of Jitter
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔌</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>PLL Jitter Contribution</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Phase-Locked Loops multiply reference clocks but add jitter from the <span style={{ color: colors.accent }}>VCO, charge pump, and loop filter</span>. Lower loop bandwidth reduces reference jitter transfer but increases VCO jitter passthrough.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔋</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Power Supply Noise</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Power supply ripple and noise modulate oscillator frequency, creating <span style={{ color: colors.warning }}>deterministic jitter</span> at the noise frequency. Clean, low-impedance power with proper filtering is essential.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📡</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Clock Buffer Additive Jitter</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Each buffer in the clock distribution tree adds its own jitter. Jitter accumulates as <span style={{ color: colors.success }}>root-sum-square</span> for random components. Minimize buffer stages and use low-jitter buffer ICs.
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
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>ADC Aperture Error</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  For ADCs, jitter causes aperture error: <strong>SNR = -20log(2*pi*fin*tj)</strong>. At 100 MHz input frequency, just 1ps of jitter limits SNR to 64 dB. High-speed ADCs require femtosecond-class clocks.
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Clock Jitter"
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} — {completedCount} of {realWorldApps.length} explored
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
                    setCurrentTransferStep(0);
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    minHeight: '44px',
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
                  How Jitter Control Matters:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
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
            </div>

            {/* Got It / Continue button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);

                // Find next uncompleted app or advance to next phase
                const nextUncompletedIndex = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                const prevUncompletedIndex = newCompleted.findIndex((c) => !c);

                if (nextUncompletedIndex !== -1) {
                  setSelectedApp(nextUncompletedIndex);
                } else if (prevUncompletedIndex !== -1) {
                  setSelectedApp(prevUncompletedIndex);
                } else if (newCompleted.every(c => c)) {
                  // All completed, can advance
                }
              }}
              style={{ ...secondaryButtonStyle, width: '100%', marginBottom: '16px' }}
            >
              Got It
            </button>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              {allAppsCompleted ? 'Take the Knowledge Test →' : 'Continue to Test →'}
            </button>
          </div>
        </div>

        {renderNavDots()}
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            paddingTop: '84px',
          }}>
            <div style={{ maxWidth: '600px', textAlign: 'center' }}>
              <div style={{
                fontSize: '80px',
                marginBottom: '24px',
              }}>
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
                  ? 'You\'ve mastered Clock Jitter concepts!'
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
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
                    ...secondaryButtonStyle,
                    flex: 1,
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
                    minHeight: '44px',
                  }}
                >
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
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '84px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Clock Jitter Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how clock jitter affects digital systems and why precise timing is essential for high-speed designs.
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
                'Period, cycle-to-cycle, and long-term jitter',
                'How jitter reduces timing margin',
                'ADC/DAC aperture error and SNR degradation',
                'Eye diagram interpretation',
                'PLL and buffer jitter contributions',
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
              style={secondaryButtonStyle}
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ClockJitterRenderer;
