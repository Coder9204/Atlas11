'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 181: TRANSMISSION LINE REFLECTIONS
// ============================================================================
// Physics: Signal reflections occur when impedance is mismatched
// Reflection coefficient: Gamma = (Z_L - Z_0) / (Z_L + Z_0)
// Standing waves and ringing cause signal integrity issues
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TransmissionLineRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  signal: '#3b82f6',
  reflection: '#ef4444',
  terminated: '#10b981',
  border: '#334155',
  primary: '#06b6d4',
};

const realWorldApps = [
  {
    icon: '\u{1F4E1}',
    title: 'RF Antenna Systems',
    short: 'Maximum power transfer to antennas',
    tagline: 'Every watt counts in wireless',
    description: 'Radio transmitters must match 50-ohm transmission lines to antenna impedance. Mismatches reflect power back, reducing range and potentially damaging transmitters.',
    connection: 'The reflection coefficient Gamma = (ZL-Z0)/(ZL+Z0) determines how much power reflects. Perfect matching (Gamma=0) transfers all power to the antenna.',
    howItWorks: 'Antenna tuners and matching networks transform antenna impedance to 50 ohms. SWR meters measure VSWR to verify proper matching. Ferrite beads suppress reflections.',
    stats: [
      { value: '50ohm', label: 'Standard RF impedance', icon: '\u{1F4CA}' },
      { value: '1.5:1', label: 'Acceptable VSWR', icon: '\u2705' },
      { value: '3dB', label: 'Loss at 6:1 VSWR', icon: '\u{1F4C9}' }
    ],
    examples: ['Ham radio', 'Cell towers', 'WiFi routers', 'Radar systems'],
    companies: ['Rohde & Schwarz', 'Keysight', 'CommScope', 'Qualcomm'],
    futureImpact: 'Active antenna systems with built-in matching will automatically tune to changing conditions.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F4BB}',
    title: 'High-Speed PCB Design',
    short: 'Signal integrity at gigahertz speeds',
    tagline: 'Where traces become transmission lines',
    description: 'At GHz frequencies, PCB traces behave as transmission lines. Impedance discontinuities cause reflections that corrupt data. Careful design maintains 50-ohm impedance throughout.',
    connection: 'Trace width, spacing, and dielectric thickness determine characteristic impedance. Even via transitions and connectors must be impedance-matched.',
    howItWorks: 'Controlled-impedance traces use precise geometry. Differential pairs maintain impedance while rejecting noise. Termination resistors absorb reflections at endpoints.',
    stats: [
      { value: '100ohm', label: 'Differential impedance', icon: '\u{1F4D0}' },
      { value: '10Gbps+', label: 'Modern data rates', icon: '\u26A1' },
      { value: '\u00B110%', label: 'Impedance tolerance', icon: '\u{1F3AF}' }
    ],
    examples: ['DDR5 memory', 'PCIe 5.0', 'USB4', 'Ethernet'],
    companies: ['Intel', 'Cadence', 'Altium', 'Ansys'],
    futureImpact: 'On-die equalization and advanced materials will push data rates beyond 100Gbps.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F4FA}',
    title: 'Cable TV Systems',
    short: 'Delivering signals without reflections',
    tagline: '75 ohms of entertainment',
    description: 'Coaxial cable systems use 75-ohm impedance throughout. Every splitter, connector, and terminator must match to prevent ghosting and signal loss.',
    connection: 'Unterminated outlets cause reflections that create ghost images. Proper termination absorbs signals at unused ports.',
    howItWorks: 'Coax cable maintains 75-ohm characteristic impedance. Splitters divide power while matching impedance. Amplifiers boost signals to overcome splitting losses.',
    stats: [
      { value: '75ohm', label: 'Coax impedance', icon: '\u{1F4CA}' },
      { value: '3.5dB', label: '2-way splitter loss', icon: '\u{1F4C9}' },
      { value: '1GHz', label: 'Bandwidth capacity', icon: '\u{1F4F6}' }
    ],
    examples: ['Cable TV', 'Satellite dishes', 'Security cameras', 'Cable modems'],
    companies: ['Comcast', 'Charter', 'Commscope', 'Belden'],
    futureImpact: 'DOCSIS 4.0 will push 10Gbps over existing coax through advanced equalization.',
    color: '#10B981'
  },
  {
    icon: '\u{1F52C}',
    title: 'Laboratory Instrumentation',
    short: 'Precision measurements require matching',
    tagline: 'Accuracy starts with termination',
    description: 'Oscilloscopes, signal generators, and network analyzers use 50-ohm systems. Proper termination ensures accurate measurements and prevents artifacts from reflections.',
    connection: 'A 50-ohm scope input with 50-ohm termination absorbs the entire signal. High-Z inputs cause reflections that distort waveforms.',
    howItWorks: '50-ohm BNC cables connect instruments. Scope inputs can switch between high-Z and 50-ohm modes. Network analyzers measure S-parameters including reflection.',
    stats: [
      { value: '50ohm', label: 'Lab standard impedance', icon: '\u{1F4CF}' },
      { value: '1Mohm', label: 'High-Z input', icon: '\u{1F50B}' },
      { value: '0.1dB', label: 'Measurement accuracy', icon: '\u{1F3AF}' }
    ],
    examples: ['Oscilloscopes', 'Spectrum analyzers', 'VNAs', 'Signal generators'],
    companies: ['Keysight', 'Tektronix', 'R&S', 'Keithley'],
    futureImpact: 'Real-time de-embedding will automatically compensate for fixture effects in measurements.',
    color: '#F59E0B'
  }
];

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
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

// Common slider style for cross-browser compatibility
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y' as const,
  WebkitAppearance: 'none' as const,
  accentColor: '#3b82f6',
};

const TransmissionLineRenderer: React.FC<TransmissionLineRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Simulation state
  const [characteristicImpedance, setCharacteristicImpedance] = useState(50); // Z0 in ohms
  const [loadImpedance, setLoadImpedance] = useState(50); // ZL in ohms
  const [signalFrequency, setSignalFrequency] = useState(100); // MHz
  const [lineLength, setLineLength] = useState(0.5); // meters
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
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

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Physics calculations
  const calculateReflection = useCallback(() => {
    // Reflection coefficient: Gamma = (Z_L - Z_0) / (Z_L + Z_0)
    const gamma = (loadImpedance - characteristicImpedance) / (loadImpedance + characteristicImpedance);

    // Voltage Standing Wave Ratio: VSWR = (1 + |Gamma|) / (1 - |Gamma|)
    const absGamma = Math.abs(gamma);
    const vswr = absGamma < 0.999 ? (1 + absGamma) / (1 - absGamma) : Infinity;

    // Return loss in dB: RL = -20 * log10(|Gamma|)
    const returnLoss = absGamma > 0.001 ? -20 * Math.log10(absGamma) : 60;

    // Wavelength and electrical length
    const wavelength = 300 / signalFrequency; // meters (assuming speed of light)
    const electricalLength = (lineLength / wavelength) * 360; // degrees

    // Power reflected percentage
    const powerReflected = Math.pow(absGamma, 2) * 100;

    return {
      gamma,
      absGamma,
      vswr: Math.min(vswr, 999),
      returnLoss: Math.min(returnLoss, 60),
      wavelength,
      electricalLength,
      powerReflected,
      isMatched: Math.abs(gamma) < 0.05,
      isOpenCircuit: loadImpedance > 1000,
      isShortCircuit: loadImpedance < 1,
    };
  }, [characteristicImpedance, loadImpedance, signalFrequency, lineLength]);

  const predictions = [
    { id: 'absorbed', label: 'The signal is completely absorbed at the load' },
    { id: 'reflected', label: 'Part of the signal bounces back, causing interference' },
    { id: 'amplified', label: 'The signal gets amplified at the mismatch point' },
    { id: 'unchanged', label: 'The signal passes through unchanged regardless of impedance' },
  ];

  const twistPredictions = [
    { id: 'open_worse', label: 'Open circuit causes complete reflection, the worst case' },
    { id: 'open_better', label: 'Open circuit is better because current cannot flow' },
    { id: 'short_worse', label: 'Short circuit is worst because it draws maximum current' },
    { id: 'same', label: 'Open and short circuits behave identically' },
  ];

  const transferApplications = [
    {
      title: 'High-Speed PCB Design',
      description: 'Modern processors run at GHz frequencies where trace impedance matters critically. A 6-inch trace at 10 GHz can have multiple reflections.',
      question: 'Why do high-speed PCB designers use 50-ohm impedance controlled traces?',
      answer: 'The 50-ohm standard provides a good balance between signal loss and power handling. Most RF components are designed for 50 ohms, ensuring system-wide impedance matching and minimizing reflections at every connection.',
    },
    {
      title: 'Cable Television Systems',
      description: 'Coaxial cables for TV use 75-ohm impedance. Any unterminated splitters or damaged connectors cause ghosting on analog TV or digital errors.',
      question: 'Why does coax TV use 75 ohms instead of 50 ohms?',
      answer: '75-ohm cable has lower signal loss for the long runs typical in cable TV distribution (losses minimized at ~77 ohms). The 50-ohm standard optimizes power handling for transmitters, while 75 ohms optimizes for receive-only applications.',
    },
    {
      title: 'Antenna Matching Networks',
      description: 'Radio antennas must be matched to their transmission lines. A mismatched antenna reflects power back to the transmitter, potentially causing damage.',
      question: 'What happens if you transmit into a badly mismatched antenna?',
      answer: 'Reflected power returns to the transmitter, causing heating in the output stage. High VSWR (>3:1) can damage transistors within seconds. Antenna tuners transform the antenna impedance to match the 50-ohm feedline.',
    },
    {
      title: 'Oscilloscope Probes',
      description: 'High-bandwidth oscilloscope probes are carefully impedance-matched to prevent ringing on fast edges. The probe tip, cable, and scope input form a transmission line system.',
      question: 'Why do oscilloscope probes have a small adjustment capacitor?',
      answer: 'The compensation capacitor adjusts the probe frequency response. An uncompensated probe shows overshoot or undershoot on fast edges due to impedance mismatch. Proper compensation ensures flat response across the bandwidth.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the reflection coefficient when a 50-ohm line is terminated with a 150-ohm load?',
      scenario: 'Consider an RF engineer testing a new antenna feed system. The 50-ohm coaxial cable is connected to a 150-ohm antenna element.',
      options: [
        { text: 'Gamma = 0 (no reflection)', correct: false },
        { text: 'Gamma = 0.5 (50% of voltage reflected)', correct: true },
        { text: 'Gamma = 1 (total reflection)', correct: false },
        { text: 'Gamma = -1 (inverted total reflection)', correct: false },
      ],
    },
    {
      question: 'What happens when a transmission line is terminated with an open circuit?',
      scenario: 'A technician accidentally leaves a coaxial cable disconnected at the far end during a signal integrity test.',
      options: [
        { text: 'All energy is absorbed by the air gap', correct: false },
        { text: 'Total reflection with same polarity (Gamma = +1)', correct: true },
        { text: 'Total reflection with inverted polarity (Gamma = -1)', correct: false },
        { text: 'Partial reflection depending on frequency', correct: false },
      ],
    },
    {
      question: 'A VSWR of 2:1 corresponds to what percentage of power reflected?',
      scenario: 'A ham radio operator measures the standing wave ratio on their antenna feedline and reads VSWR = 2:1 on the meter.',
      options: [
        { text: 'About 11% power reflected', correct: true },
        { text: 'About 50% power reflected', correct: false },
        { text: 'About 25% power reflected', correct: false },
        { text: 'About 2% power reflected', correct: false },
      ],
    },
    {
      question: 'Why do high-speed digital signals need impedance matching?',
      scenario: 'A PCB designer is routing a 10 Gbps SerDes link between two chips on a circuit board with 6-inch traces.',
      options: [
        { text: 'To increase the signal amplitude', correct: false },
        { text: 'To prevent reflections that cause ringing and timing errors', correct: true },
        { text: 'To reduce the power consumption', correct: false },
        { text: 'To convert between voltage standards', correct: false },
      ],
    },
    {
      question: 'What is the characteristic impedance of a typical USB cable?',
      scenario: 'An engineer is designing a USB4 host controller and needs to specify the correct PCB trace impedance for the connector interface.',
      options: [
        { text: '50 ohms', correct: false },
        { text: '75 ohms', correct: false },
        { text: '90 ohms differential', correct: true },
        { text: '300 ohms', correct: false },
      ],
    },
    {
      question: 'At what frequency does a 15cm PCB trace start behaving as a transmission line?',
      scenario: 'A junior engineer is debugging noise on a 15 cm trace carrying a clock signal and wonders if transmission line effects are relevant.',
      options: [
        { text: 'Above 1 MHz', correct: false },
        { text: 'Above 100 MHz', correct: false },
        { text: 'Above 500 MHz (wavelength comparable to trace length)', correct: true },
        { text: 'Only above 10 GHz', correct: false },
      ],
    },
    {
      question: 'What termination scheme uses a resistor at the far end of a transmission line?',
      scenario: 'A signal integrity engineer is choosing a termination strategy for a point-to-point DDR5 memory bus with 3-inch traces.',
      options: [
        { text: 'Series termination', correct: false },
        { text: 'Parallel termination', correct: true },
        { text: 'AC termination', correct: false },
        { text: 'Diode termination', correct: false },
      ],
    },
    {
      question: 'Why does signal ringing occur on unterminated transmission lines?',
      scenario: 'An oscilloscope shows damped oscillations on a rising edge of a digital signal traveling down an unterminated microstrip trace.',
      options: [
        { text: 'The line acts as an antenna and picks up noise', correct: false },
        { text: 'Reflections bounce back and forth, creating standing waves', correct: true },
        { text: 'The resistance of the line dissipates energy', correct: false },
        { text: 'Capacitive loading slows down the signal', correct: false },
      ],
    },
    {
      question: 'What return loss indicates a well-matched transmission line?',
      scenario: 'A network analyzer displays the S11 parameter of a 50-ohm coaxial connector under test.',
      options: [
        { text: '0 dB (no return loss)', correct: false },
        { text: '3 dB (half power returned)', correct: false },
        { text: '20 dB or better (less than 1% power reflected)', correct: true },
        { text: 'Return loss does not indicate matching quality', correct: false },
      ],
    },
    {
      question: 'How does a quarter-wave transformer achieve impedance matching?',
      scenario: 'An antenna designer needs to match a 100-ohm dipole to a 50-ohm feedline at 2.4 GHz using a quarter-wave section.',
      options: [
        { text: 'It absorbs the reflected energy as heat', correct: false },
        { text: 'It uses a section with Z = sqrt(Z1 x Z2) to transform impedance', correct: true },
        { text: 'It blocks reflections using a filter', correct: false },
        { text: 'It only works at very low frequencies', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div className="navigation-dots" style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                className="nav-dot"
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px',
                  border: 'none',
                  padding: 0,
                }}
                title={phaseLabels[p]}
                aria-label={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;
    const output = calculateReflection();

    // Signal animation
    const signalPhase = animationTime * 2 * Math.PI * 0.5;
    const reflectionPhase = signalPhase + Math.PI * (output.gamma < 0 ? 1 : 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={isMobile ? 300 : height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="txlnLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Transmission line conductor gradient - copper/gold metallic */}
            <linearGradient id="txlnConductorTop" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="20%" stopColor="#d97706" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            <linearGradient id="txlnConductorBottom" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="20%" stopColor="#b45309" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#b45309" />
              <stop offset="80%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Dielectric substrate gradient */}
            <linearGradient id="txlnDielectric" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="30%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Source equipment gradient - brushed metal */}
            <linearGradient id="txlnSourceMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Load equipment gradient */}
            <linearGradient id="txlnLoadMatched" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="30%" stopColor="#047857" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="70%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="txlnLoadMismatched" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="30%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#b91c1c" />
              <stop offset="70%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Signal wave radial glow */}
            <radialGradient id="txlnSignalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Reflection wave radial glow */}
            <radialGradient id="txlnReflectionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Impedance match indicator glow */}
            <radialGradient id="txlnMatchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="txlnMismatchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Oscilloscope screen gradient */}
            <linearGradient id="txlnOscScreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#022c22" />
              <stop offset="20%" stopColor="#064e3b" />
              <stop offset="50%" stopColor="#065f46" />
              <stop offset="80%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            {/* Power indicator glow */}
            <radialGradient id="txlnPowerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Glow filters */}
            <filter id="txlnSignalBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="txlnReflectionBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="txlnMatchIndicatorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="txlnWaveformGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="txlnInteractiveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for oscilloscope */}
            <pattern id="txlnOscGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#0d9488" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>

            {/* Lab equipment grid pattern */}
            <pattern id="txlnLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#txlnLabBg)" />
          <rect width={width} height={height} fill="url(#txlnLabGrid)" />

          {/* Title banner */}
          <text x={width/2} y={18} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle" letterSpacing="1">
            TRANSMISSION LINE ANALYSIS
          </text>
          <text x={width/2} y={38} fill={colors.textMuted} fontSize={12} textAnchor="middle">
            Z0 = {characteristicImpedance} Ohm
          </text>

          {/* === SOURCE EQUIPMENT === */}
          <g transform="translate(30, 60)">
            {/* Main housing */}
            <rect x="0" y="0" width="100" height="80" rx="8" fill="url(#txlnSourceMetal)" stroke="#475569" strokeWidth="1.5" />
            <rect x="5" y="5" width="90" height="70" rx="6" fill="#1e293b" opacity="0.4" />

            {/* Display panel */}
            <rect x="10" y="8" width="80" height="30" rx="4" fill="#030712" stroke="#334155" />
            <text x="50" y="26" fill="#06b6d4" fontSize="11" textAnchor="middle" fontWeight="bold">SIGNAL GEN</text>
            <text x="50" y="62" fill="#22d3ee" fontSize="12" textAnchor="middle" fontFamily="monospace">{signalFrequency} MHz</text>

            {/* Power indicator */}
            <circle cx="25" cy="65" r="6" fill="url(#txlnPowerGlow)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Output connector */}
            <rect x="75" y="45" width="20" height="24" rx="2" fill="#374151" stroke="#4b5563" />
            <circle cx="85" cy="57" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />

            {/* Label */}
            <text x="50" y="-15" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="bold">
              SOURCE
            </text>
          </g>

          {/* === TRANSMISSION LINE STRUCTURE === */}
          <g transform="translate(145, 70)">
            {/* Dielectric substrate base */}
            <rect x="0" y="25" width="360" height="30" rx="3" fill="url(#txlnDielectric)" opacity="0.8" />

            {/* Ground plane (bottom conductor) */}
            <rect x="0" y="52" width="360" height="8" rx="1" fill="url(#txlnConductorBottom)" />
            <rect x="0" y="52" width="360" height="2" fill="#fbbf24" opacity="0.3" />

            {/* Top conductor (signal trace) */}
            <rect x="0" y="20" width="360" height="8" rx="1" fill="url(#txlnConductorTop)" />
            <rect x="0" y="20" width="360" height="2" fill="#fef3c7" opacity="0.4" />

            {/* Distance markers along bottom */}
            {[0, 180, 360].map((pos, i) => (
              <g key={`marker-${i}`}>
                <line x1={pos} y1="65" x2={pos} y2="70" stroke={colors.textSecondary} strokeWidth="1" />
                <text x={pos} y="82" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
                  {(lineLength * (i / 2)).toFixed(2)}m
                </text>
              </g>
            ))}

            {/* Forward signal wave visualization */}
            <g filter="url(#txlnSignalBlur)">
              {[...Array(12)].map((_, i) => {
                const x = 15 + i * 28;
                const waveY = Math.sin(signalPhase - i * 0.6) * 12;
                const opacity = 0.95 - i * 0.05;
                return (
                  <g key={`fwd-${i}`}>
                    <circle cx={x} cy={24 + waveY} r={6} fill="url(#txlnSignalGlow)" opacity={opacity} />
                    <circle cx={x} cy={24 + waveY} r={3} fill="#60a5fa" opacity={opacity} />
                  </g>
                );
              })}
            </g>

            {/* Reflected signal wave (if mismatched) */}
            {!output.isMatched && output.absGamma > 0.05 && (
              <g filter="url(#txlnReflectionBlur)">
                {[...Array(10)].map((_, i) => {
                  const x = 345 - i * 30;
                  const waveY = Math.sin(reflectionPhase + i * 0.6) * 10 * output.absGamma;
                  const opacity = Math.max(0, (0.85 - i * 0.08) * output.absGamma);
                  if (x < 20) return null;
                  return (
                    <g key={`ref-${i}`}>
                      <circle cx={x} cy={24 + waveY} r={5} fill="url(#txlnReflectionGlow)" opacity={opacity} />
                      <circle cx={x} cy={24 + waveY} r={2.5} fill="#f87171" opacity={opacity} />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Standing wave envelope (when mismatched) */}
            {!output.isMatched && output.absGamma > 0.1 && (
              <g opacity="0.3">
                <path
                  d={[...Array(37)].map((_, i) => {
                    const x = i * 10;
                    const envelope = 1 + output.absGamma * Math.cos((x / 360) * output.electricalLength * Math.PI / 180 * 4);
                    const y = 24 - envelope * 8;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              </g>
            )}

            {/* Transmission line label */}
            <text x="180" y="-15" fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="bold">
              COAXIAL LINE
            </text>
          </g>

          {/* === LOAD EQUIPMENT === */}
          <g transform="translate(520, 60)">
            {/* Main housing */}
            <rect x="0" y="0" width="100" height="80" rx="8"
              fill={output.isMatched ? "url(#txlnLoadMatched)" : "url(#txlnLoadMismatched)"}
              stroke={output.isMatched ? "#059669" : "#dc2626"} strokeWidth="1.5" />
            <rect x="5" y="5" width="90" height="70" rx="6" fill="#1e293b" opacity="0.3" />

            {/* Display panel */}
            <rect x="10" y="8" width="80" height="30" rx="4" fill="#030712" stroke="#334155" />
            <text x="88" y="26" fill={output.isMatched ? "#10b981" : "#ef4444"} fontSize="11" textAnchor="start" fontWeight="bold">
              LOAD
            </text>
            <text x="84" y="62" fill={output.isMatched ? "#34d399" : "#fca5a5"} fontSize="12" textAnchor="start" fontFamily="monospace">
              {loadImpedance > 1000 ? 'OPEN' : loadImpedance < 1 ? 'SHORT' : `${loadImpedance} Ohm`}
            </text>

            {/* Input connector */}
            <rect x="5" y="45" width="20" height="24" rx="2" fill="#374151" stroke="#4b5563" />
            <circle cx="15" cy="57" r="5" fill={output.isMatched ? "#22c55e" : "#ef4444"} stroke={output.isMatched ? "#16a34a" : "#dc2626"} strokeWidth="1" />

            {/* Impedance match indicator with glow */}
            <g filter="url(#txlnMatchIndicatorGlow)">
              <circle cx="75" cy="65" r="12" fill={output.isMatched ? "url(#txlnMatchGlow)" : "url(#txlnMismatchGlow)"}>
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="75" cy="65" r="8" fill={output.isMatched ? "#22c55e" : "#ef4444"} />
            </g>

            {/* Label */}
            <text x="84" y="-15" fill={colors.textSecondary} fontSize="12" textAnchor="start" fontWeight="bold">
              {output.isMatched ? 'MATCHED' : 'MISMATCHED'}
            </text>
          </g>

          {/* === OSCILLOSCOPE DISPLAY === */}
          <g transform="translate(30, 180)">
            {/* Oscilloscope housing */}
            <rect x="0" y="0" width="640" height="200" rx="10" fill="#111827" stroke="#1f2937" strokeWidth="2" />

            {/* Screen bezel */}
            <rect x="10" y="10" width="540" height="160" rx="6" fill="#030712" stroke="#334155" />

            {/* Screen display area */}
            <rect x="15" y="15" width="530" height="150" rx="4" fill="url(#txlnOscScreen)" />
            <rect x="15" y="15" width="530" height="150" rx="4" fill="url(#txlnOscGrid)" />

            {/* Grid reference lines */}
            <line x1="20" y1="90" x2="540" y2="90" stroke="#0d9488" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />

            {/* Screen labels */}
            <text x="25" y="45" fill="#0d9488" fontSize="11" fontWeight="bold">VOLTAGE</text>
            <text x="520" y="45" fill="#0d9488" fontSize="11" textAnchor="end">
              {output.isMatched ? 'NO REFLECTIONS' : `VSWR ${output.vswr.toFixed(1)}:1`}
            </text>

            {/* Waveform with glow effect - uses more vertical space */}
            <g filter="url(#txlnWaveformGlow)">
              <path
                d={[...Array(260)].map((_, i) => {
                  const x = 20 + i * 2;
                  const incident = Math.sin(signalPhase - i * 0.08);
                  const reflected = Math.sin(reflectionPhase + i * 0.08) * output.gamma;
                  const combined = incident + reflected;
                  const y = 90 - combined * 65;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
              />
            </g>

            {/* Incident wave overlay (dashed) */}
            <path
              d={[...Array(260)].map((_, i) => {
                const x = 20 + i * 2;
                const incident = Math.sin(signalPhase - i * 0.08);
                const y = 90 - incident * 60;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              strokeOpacity="0.4"
              strokeDasharray="6,3"
            />

            {/* Interactive current-value marker point - position reflects gamma value */}
            <circle cx={280 + output.gamma * 60} cy={90 - output.gamma * 40} r="10" fill="#f59e0b" filter="url(#txlnInteractiveGlow)" opacity="0.9" />

            {/* Control panel */}
            <rect x="560" y="10" width="70" height="160" rx="4" fill="#1e293b" stroke="#334155" />

            {/* Metrics display - stacked label/value pairs to avoid x-overlap */}
            <text x="595" y="28" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">METRICS</text>

            <text x="571" y="44" fill={colors.textSecondary} fontSize="11">Gamma</text>
            <text x="571" y="57" fill="#22d3ee" fontSize="11" fontFamily="monospace">
              {output.gamma >= 0 ? '+' : ''}{output.gamma.toFixed(3)}
            </text>

            <text x="571" y="74" fill={colors.textSecondary} fontSize="11">VSWR</text>
            <text x="571" y="87" fill="#22d3ee" fontSize="11" fontFamily="monospace">
              {output.vswr.toFixed(1)}:1
            </text>

            <text x="571" y="104" fill={colors.textSecondary} fontSize="11">R.Loss</text>
            <text x="571" y="117" fill="#22d3ee" fontSize="11" fontFamily="monospace">
              {output.returnLoss.toFixed(1)}dB
            </text>

            <text x="571" y="134" fill={colors.textSecondary} fontSize="11">Power</text>
            <text x="571" y="147" fill={output.powerReflected > 10 ? "#f87171" : "#22d3ee"} fontSize="11" fontFamily="monospace">
              {output.powerReflected.toFixed(1)}%
            </text>

            {/* Status indicator */}
            <rect x="562" y="155" width="68" height="16" rx="3"
              fill={output.isMatched ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}
              stroke={output.isMatched ? "#10b981" : "#ef4444"} />
            <text x="596" y="167" fill={output.isMatched ? "#10b981" : "#ef4444"} fontSize="11" textAnchor="middle" fontWeight="bold">
              {output.isMatched ? 'MATCH' : 'MISMATCH'}
            </text>

            {/* Legend row at bottom */}
            <g transform="translate(25, 115)">
              <line x1="0" y1="67" x2="15" y2="67" stroke="#22d3ee" strokeWidth="2" />
              <text x="20" y="78" fill={colors.textMuted} fontSize="11">Combined</text>

              <line x1="197" y1="67" x2="212" y2="67" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2" />
              <text x="217" y="78" fill={colors.textMuted} fontSize="11">Incident</text>

              <circle cx="373" cy="67" r="4" fill="url(#txlnSignalGlow)" />
              <text x="378" y="78" fill={colors.textMuted} fontSize="11">Forward</text>

              {!output.isMatched && (
                <>
                  <circle cx="470" cy="67" r="4" fill="url(#txlnReflectionGlow)" />
                  <text x="475" y="78" fill={colors.textMuted} fontSize="11">Reflected</text>
                </>
              )}
            </g>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause' : 'Animate'}
            </button>
            <button
              onClick={() => { setLoadImpedance(characteristicImpedance); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `2px solid ${colors.success}`,
                background: 'rgba(16, 185, 129, 0.1)',
                color: colors.success,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Match Load
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    const output = calculateReflection();

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Load Impedance: {loadImpedance > 1000 ? 'Open' : loadImpedance < 1 ? 'Short' : `${loadImpedance} ohm`}
          </label>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={Math.min(loadImpedance, 200)}
            onChange={(e) => setLoadImpedance(parseInt(e.target.value))}
            style={sliderStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <button onClick={() => setLoadImpedance(0)} style={{ padding: '4px 8px', fontSize: '11px', background: colors.bgCard, border: `1px solid ${colors.textMuted}`, color: colors.textMuted, borderRadius: '4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Short</button>
            <button onClick={() => setLoadImpedance(characteristicImpedance)} style={{ padding: '4px 8px', fontSize: '11px', background: colors.bgCard, border: `1px solid ${colors.success}`, color: colors.success, borderRadius: '4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Match</button>
            <button onClick={() => setLoadImpedance(10000)} style={{ padding: '4px 8px', fontSize: '11px', background: colors.bgCard, border: `1px solid ${colors.textMuted}`, color: colors.textMuted, borderRadius: '4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Open</button>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Characteristic Impedance (Z0): {characteristicImpedance} ohm
          </label>
          <input
            type="range"
            min="25"
            max="100"
            step="5"
            value={characteristicImpedance}
            onChange={(e) => setCharacteristicImpedance(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Signal Frequency: {signalFrequency} MHz
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={signalFrequency}
            onChange={(e) => setSignalFrequency(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{
          background: output.isMatched ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${output.isMatched ? colors.success : colors.error}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            {output.isMatched ? 'Matched - No Reflections!' : 'Mismatched - Reflections Occurring'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Power Reflected: {output.powerReflected.toFixed(1)}% |
            Gamma = (Z_L - Z_0) / (Z_L + Z_0) = {output.gamma.toFixed(3)}
          </div>
        </div>
      </div>
    );
  };

  // Render wrapper with progress bar
  const renderPhaseContent = (content: React.ReactNode, bottomBar: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        {content}
      </div>
      {bottomBar}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            Transmission Line Reflections
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            Why do high-speed signals need matched impedances?
          </p>
        </div>

        {renderVisualization(true)}

        <div style={{ padding: '24px' }}>
          <div style={{
            background: colors.bgCard,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
              At high frequencies, electrical signals behave like waves traveling down a wire.
              When they encounter a change in impedance, part of the signal bounces back -
              just like sound echoing off a wall!
            </p>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
              Try changing the load impedance and watch what happens to the signal!
            </p>
          </div>
        </div>
      </>,
      renderBottomBar(false, true, 'Start Exploring')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <>
        {renderVisualization(false)}

        <div style={{ padding: '16px' }}>
          <div style={{
            background: colors.bgCard,
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
              A 50-ohm transmission line is connected to a 150-ohm load.
              What happens to the signal when it reaches the load?
            </p>
          </div>

          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            Your Prediction:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 400,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      renderBottomBar(true, !!prediction, 'Continue to Experiment')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Transmission Line Behavior</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Adjust impedances and observe reflections
          </p>
        </div>

        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.primary}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            <strong style={{ color: colors.primary }}>This is important for real-world engineering:</strong> Impedance matching is essential in every high-speed design, from PCB traces to antenna systems. Understanding reflections helps engineers design reliable communication technology used in industry worldwide.
          </p>
        </div>

        {renderVisualization(true)}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Cause and Effect:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '8px' }}>
            When you <strong style={{ color: colors.textPrimary }}>increase the load impedance</strong> above Z0, the reflection coefficient increases positively — more signal reflects back. When you decrease it below Z0, reflection goes negative (inverted phase). Higher mismatch causes more reflected power, reducing transmitted signal.
          </p>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Match the load to Z0 - watch reflections disappear</li>
            <li>Try open circuit (infinite Z) - see total reflection</li>
            <li>Try short circuit (Z=0) - see inverted reflection</li>
            <li>Notice how VSWR changes with mismatch severity</li>
          </ul>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'reflected';

    return renderPhaseContent(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
            As you observed in the experiment, when impedance changes, part of the signal reflects back.
            Your prediction {wasCorrect ? 'was right' : 'can be updated with what you saw'} - the result shows that the
            reflection coefficient Gamma = (Z_L - Z_0) / (Z_L + Z_0) governs how much signal bounces back.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Reflections</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px', fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Reflection Coefficient (Gamma):</strong> Ranges from
              -1 (short circuit) to +1 (open circuit). Gamma = 0 means perfect match.
            </p>
            <p style={{ marginBottom: '12px', fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>VSWR:</strong> Voltage Standing Wave Ratio measures
              the severity of mismatch. VSWR = 1:1 is perfect; higher ratios mean more reflection.
            </p>
            <p style={{ marginBottom: '12px', fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Return Loss:</strong> Expressed in dB, measures how
              much power is reflected. 20 dB means only 1% power reflected.
            </p>
            <p style={{ fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Signal Integrity:</strong> Reflections cause ringing,
              overshoot, and timing problems in high-speed digital circuits.
            </p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Next: A Twist!')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: Unterminated Lines</h2>
          <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
            What happens with open or short circuits?
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
            In real circuits, lines are sometimes left unterminated (open) or accidentally shorted.
            Both cases cause 100% reflection, but there is an important difference...
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            What is the difference between open and short circuit reflections?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 400,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      renderBottomBar(true, !!twistPrediction, 'Continue to Experiment')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Open vs Short Circuit</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Compare the reflection behavior
          </p>
        </div>

        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.primary}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            <strong style={{ color: colors.primary }}>Observe:</strong> Toggle between Open and Short terminations and watch how the reflection phase changes.
          </p>
        </div>

        {renderVisualization(true)}
        {renderControls()}

        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
          borderLeft: `3px solid ${colors.warning}`,
        }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
            Open circuit: Gamma = +1 (voltage doubles at the end)<br/>
            Short circuit: Gamma = -1 (voltage inverts, current doubles)<br/>
            Both cause total reflection but with opposite phase!
          </p>
        </div>
      </>,
      renderBottomBar(true, true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'same';

    return renderPhaseContent(
      <>
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${colors.warning}`,
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '8px' }}>
            The Surprising Truth!
          </h3>
          <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
            Open and short circuits both reflect 100% of the signal power, but with opposite phase.
            Open: Gamma = +1 (voltage doubles). Short: Gamma = -1 (voltage cancels, current doubles).
            {wasCorrect ? ' You correctly identified they are similar in magnitude!' : ''}
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Ringing Occurs</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px', fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Multiple Reflections:</strong> The reflected wave
              travels back to the source, where it may reflect again if the source is not matched.
            </p>
            <p style={{ marginBottom: '12px', fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Ringing:</strong> These back-and-forth reflections
              create oscillations (ringing) that can take several round-trips to settle.
            </p>
            <p style={{ fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary }}>Signal Integrity:</strong> In high-speed digital
              circuits, ringing can cause false triggers, violate timing margins, and corrupt data.
            </p>
          </div>
        </div>
      </>,
      renderBottomBar(true, true, 'Continue to Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ padding: '16px' }}>
        <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
          Complete all 4 applications to unlock the test
        </p>

        {/* Stats summary from real-world applications */}
        <div style={{
          background: colors.bgCard,
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>50 ohm</div>
            <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>RF Standard</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>75 ohm</div>
            <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>Video/Cable</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>10 Gbps</div>
            <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>PCIe 5.0 Rate</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>100 ohm</div>
            <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>Diff. Pairs</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 700 }}>1 GHz</div>
            <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>Cable BW</div>
          </div>
        </div>

        {/* Company mention */}
        <p style={{ color: colors.textSecondary, fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
          Used by Intel, Qualcomm, Keysight, Tektronix, Rohde & Schwarz, CommScope, and Belden across the industry.
        </p>

        {transferApplications.map((app, index) => (
          <div
            key={index}
            style={{
              background: colors.bgCard,
              marginBottom: '16px',
              padding: '16px',
              borderRadius: '12px',
              border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>App {index + 1} of {transferApplications.length}: {app.title}</h3>
              {transferCompleted.has(index) && <span style={{ color: colors.success }}>{'\u2705'} Done</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}
              >
                Got It - Reveal Answer
              </button>
            ) : (
              <>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', margin: 0, fontWeight: 400 }}>{app.answer}</p>
                </div>
                <button
                  onClick={() => {
                    const nextIncomplete = transferApplications.findIndex((_, i) => !transferCompleted.has(i) && i > index);
                    if (nextIncomplete >= 0) {
                      // Scroll to next incomplete
                    }
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: colors.success, color: 'white', cursor: 'pointer', fontSize: '13px', minHeight: '44px', fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
                >
                  {index < transferApplications.length - 1 ? 'Continue to Next App' : 'Got It'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>,
      renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <>
          <div style={{
            background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
              {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 400 }}>
              {testScore >= 7 ? 'You understand transmission line reflections!' : 'Review the material and try again.'}
            </p>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontWeight: 400 }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </>,
        renderBottomBar(true, testScore >= 7, testScore >= 7 ? 'Continue to Mastery' : 'Review & Retry', () => {
          if (testScore >= 7) {
            goNext();
          } else {
            setTestSubmitted(false);
            setTestAnswers(new Array(10).fill(null));
            setCurrentTestQuestion(0);
          }
        })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderPhaseContent(
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
          <span style={{ color: colors.textSecondary, fontWeight: 600 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
          ))}
        </div>
        {/* Scenario context */}
        <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${colors.primary}` }}>
          <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, fontStyle: 'italic', fontWeight: 400 }}>{currentQ.scenario}</p>
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 500 }}>{currentQ.question}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: 400, WebkitTapHighlightColor: 'transparent' }}>
              {opt.text}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
          )}
        </div>
      </div>,
      renderBottomBar(true, false, 'Submit Test')
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\u{1F3C6}'}</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>You have mastered transmission line reflections!</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
            <li>Reflection coefficient Gamma = (Z_L - Z_0) / (Z_L + Z_0)</li>
            <li>VSWR and return loss as mismatch metrics</li>
            <li>Open circuit (Gamma=+1) vs short circuit (Gamma=-1)</li>
            <li>Signal ringing from multiple reflections</li>
            <li>Termination strategies for high-speed signals</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Real-World Impact:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
            Understanding transmission line reflections is essential for designing high-speed digital
            circuits, RF systems, and any application where signal integrity matters. From USB cables
            to 5G antennas, proper impedance matching ensures reliable communication!
          </p>
        </div>
        {renderVisualization(true)}
      </>,
      renderBottomBar(true, true, 'Complete')
    );
  }

  return null;
};

export default TransmissionLineRenderer;
