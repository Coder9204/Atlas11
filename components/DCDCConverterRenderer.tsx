import React, { useState, useEffect, useCallback, useRef } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface DCDCConverterRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional, only for resume
}

// Simple audio feedback
const playSound = (type: 'click' | 'success' | 'error' | 'transition') => {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number> = { click: 600, success: 800, error: 300, transition: 500 };
    oscillator.frequency.value = frequencies[type] || 440;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) { /* Audio not available */ }
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  input: '#3b82f6',
  output: '#22c55e',
  inductor: '#a855f7',
  switch: '#ec4899',
  diode: '#06b6d4',
};

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const DCDCConverterRenderer: React.FC<DCDCConverterRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  // Phase order and labels
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Play',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Explore',
    twist_review: 'Explain',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  // Get initial phase from gamePhase prop or default to 'hook'
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Mobile detection
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

  // Emit game event helper
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, phase, data, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  // Navigation functions with debouncing
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_change', {
      from: phase,
      to: p,
      label: phaseLabels[p],
      index: phaseOrder.indexOf(p)
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phase, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  // Simulation state
  const [converterType, setConverterType] = useState<'buck' | 'boost'>('buck');
  const [inputVoltage, setInputVoltage] = useState(24);
  const [dutyCycle, setDutyCycle] = useState(50);
  const [loadCurrent, setLoadCurrent] = useState(2);
  const [switchingFrequency, setwitchingFrequency] = useState(100); // kHz
  const [inductance, setInductance] = useState(100); // uH
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const D = dutyCycle / 100;

    let outputVoltage: number;
    let inputCurrent: number;
    const efficiency = 0.90; // Typical efficiency

    if (converterType === 'buck') {
      // Buck: Vout = D * Vin
      outputVoltage = D * inputVoltage;
      // Power conservation: Pin = Pout / efficiency
      inputCurrent = (outputVoltage * loadCurrent) / (inputVoltage * efficiency);
    } else {
      // Boost: Vout = Vin / (1 - D)
      outputVoltage = inputVoltage / (1 - D);
      inputCurrent = (outputVoltage * loadCurrent) / (inputVoltage * efficiency);
    }

    // Ripple current calculation
    const period = 1 / (switchingFrequency * 1000); // seconds
    const inductanceH = inductance / 1e6; // Henries
    let rippleCurrent: number;

    if (converterType === 'buck') {
      rippleCurrent = (inputVoltage - outputVoltage) * D * period / inductanceH;
    } else {
      rippleCurrent = inputVoltage * D * period / inductanceH;
    }

    const outputPower = outputVoltage * loadCurrent;
    const inputPower = inputVoltage * inputCurrent;

    return {
      outputVoltage: Math.max(0, outputVoltage),
      inputCurrent: Math.max(0, inputCurrent),
      outputPower,
      inputPower,
      efficiency: efficiency * 100,
      rippleCurrent: Math.abs(rippleCurrent),
    };
  }, [converterType, inputVoltage, dutyCycle, loadCurrent, switchingFrequency, inductance]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Set boost mode for twist_play phase
  useEffect(() => {
    if (phase === 'twist_play') {
      setConverterType('boost');
    }
  }, [phase]);

  const output = calculateOutput();

  const predictions = [
    { id: 'switch_time', label: 'Output voltage depends on how long the switch is ON vs OFF' },
    { id: 'resistance', label: 'Output voltage is set by resistor ratios like a voltage divider' },
    { id: 'transformer', label: 'It works like a transformer with coil turns ratio' },
    { id: 'capacitor', label: 'Output voltage is set by capacitor charge/discharge rates' },
  ];

  const twistPredictions = [
    { id: 'boost_unlimited', label: 'A boost converter can step up voltage indefinitely' },
    { id: 'boost_limited', label: 'Real boost converters have practical limits around 4-5x input voltage' },
    { id: 'boost_same', label: 'Boost converters work the same as buck converters in reverse' },
    { id: 'boost_double', label: 'Boost converters can only double the voltage at most' },
  ];

  const transferApplications = [
    {
      title: 'MPPT Solar Controllers',
      description: 'MPPT controllers use DC-DC converters to match the solar panel MPP voltage to the battery charging voltage, regardless of battery state.',
      question: 'Why can an MPPT controller charge a 12V battery from a 40V solar panel more efficiently than direct connection?',
      answer: 'A buck converter steps down the 40V panel voltage to the 14.4V charging voltage while stepping UP the current proportionally. Instead of wasting the excess 25V as heat, the converter trades voltage for current, capturing power that would otherwise be lost.',
    },
    {
      title: 'USB Power Delivery',
      description: 'USB-PD uses buck and boost converters to negotiate and deliver anywhere from 5V to 48V at up to 240W over a single USB-C cable.',
      question: 'How does a laptop charger efficiently deliver both 5V for phones and 20V for laptops from the same adapter?',
      answer: 'The charger contains a multi-mode DC-DC converter that can produce different output voltages based on negotiation with the device. It efficiently converts the internal high voltage to whatever the device requests, maintaining high efficiency across the range.',
    },
    {
      title: 'Electric Vehicle Battery Management',
      description: 'EVs use multiple voltage levels: 400V+ for the main pack, 48V for auxiliaries, and 12V for legacy systems. DC-DC converters bridge these.',
      question: 'Why do modern EVs need isolated DC-DC converters between the high-voltage battery and 12V system?',
      answer: 'Safety isolation prevents the 400V+ pack from connecting directly to chassis-ground 12V systems. The converter must also handle the huge voltage ratio (35:1 or more) efficiently while providing enough power for headlights, infotainment, and other 12V accessories.',
    },
    {
      title: 'Data Center Power Distribution',
      description: 'Data centers convert 480V AC to 48V DC, then use point-of-load converters to generate 12V, 5V, 3.3V, and even lower voltages for processors.',
      question: 'Why do data centers increasingly use 48V distribution instead of 12V?',
      answer: 'Higher voltage means lower current for the same power, reducing I^2R losses in cables and bus bars. 48V is still safe for touch (below 60V hazard threshold) while delivering 4x the power at the same current as 12V. Final conversion happens at each server.',
    },
  ];

  const testQuestions = [
    {
      question: 'In a buck converter, if the duty cycle is 50% and input voltage is 24V, what is the output voltage?',
      options: [
        { text: '48V', correct: false },
        { text: '24V', correct: false },
        { text: '12V', correct: true },
        { text: '6V', correct: false },
      ],
    },
    {
      question: 'In a boost converter, if the duty cycle is 50% and input voltage is 12V, what is the output voltage?',
      options: [
        { text: '6V', correct: false },
        { text: '12V', correct: false },
        { text: '24V', correct: true },
        { text: '48V', correct: false },
      ],
    },
    {
      question: 'What is the primary function of the inductor in a DC-DC converter?',
      options: [
        { text: 'To filter out noise', correct: false },
        { text: 'To store energy during switch ON time and release it during OFF time', correct: true },
        { text: 'To provide isolation from input to output', correct: false },
        { text: 'To limit the maximum current', correct: false },
      ],
    },
    {
      question: 'Why do DC-DC converters use high switching frequencies (100kHz+)?',
      options: [
        { text: 'Higher frequency makes more noise which is desirable', correct: false },
        { text: 'Smaller inductors and capacitors can be used for the same ripple', correct: true },
        { text: 'Efficiency is always better at higher frequencies', correct: false },
        { text: 'It is required by electrical codes', correct: false },
      ],
    },
    {
      question: 'In a buck converter, what happens when the switch opens (OFF state)?',
      options: [
        { text: 'Current stops instantly', correct: false },
        { text: 'The inductor drives current through the diode to maintain flow', correct: true },
        { text: 'The output voltage becomes zero', correct: false },
        { text: 'The capacitor fully discharges', correct: false },
      ],
    },
    {
      question: 'Why is efficiency typically lower in a boost converter at high duty cycles?',
      options: [
        { text: 'The switch has less time to cool down', correct: false },
        { text: 'Higher voltage ratio means more switch and diode losses', correct: true },
        { text: 'The capacitor cannot hold enough charge', correct: false },
        { text: 'High duty cycles are actually more efficient', correct: false },
      ],
    },
    {
      question: 'What is "Continuous Conduction Mode" (CCM) in a DC-DC converter?',
      options: [
        { text: 'The converter runs continuously without rest', correct: false },
        { text: 'Inductor current never drops to zero during a switching cycle', correct: true },
        { text: 'The output voltage is perfectly constant', correct: false },
        { text: 'The input current is continuous', correct: false },
      ],
    },
    {
      question: 'An MPPT solar controller uses DC-DC conversion to:',
      options: [
        { text: 'Increase the panel voltage to dangerous levels', correct: false },
        { text: 'Operate the panel at its maximum power point regardless of battery voltage', correct: true },
        { text: 'Convert AC to DC for the battery', correct: false },
        { text: 'Eliminate the need for a battery', correct: false },
      ],
    },
    {
      question: 'What limits how high a boost converter can step up voltage in practice?',
      options: [
        { text: 'The color of the inductor', correct: false },
        { text: 'Parasitic resistances, switch losses, and required duty cycle approaching 100%', correct: true },
        { text: 'Government regulations on voltage', correct: false },
        { text: 'The size of the input capacitor only', correct: false },
      ],
    },
    {
      question: 'In power conservation terms, if a buck converter steps down voltage by half:',
      options: [
        { text: 'Output current is also halved', correct: false },
        { text: 'Output current approximately doubles (minus losses)', correct: true },
        { text: 'Output current stays the same', correct: false },
        { text: 'Output power is halved', correct: false },
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
    if (score >= 8) {
      playSound('success');
      emitGameEvent('completion', { score, total: 10, passed: true });
    }
  };

  const renderVisualization = (interactive: boolean, showBoost: boolean = false) => {
    const width = 440;
    const height = 380;
    const D = dutyCycle / 100;
    const switchOn = (animationPhase / 360) < D;
    const efficiencyPercent = output.efficiency;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Title outside SVG using typo system */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <span style={{
            fontSize: typo.heading,
            fontWeight: 700,
            color: colors.textPrimary,
            letterSpacing: '-0.02em'
          }}>
            {converterType === 'buck' ? 'Buck Converter ' : 'Boost Converter '}
          </span>
          <span style={{
            fontSize: typo.body,
            color: colors.textMuted
          }}>
            {converterType === 'buck' ? '(Step-Down)' : '(Step-Up)'}
          </span>
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '540px' }}
        >
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="dcdcBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1a1a2e" />
              <stop offset="50%" stopColor="#0f0f1a" />
              <stop offset="75%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Inductor coil gradient with metallic sheen */}
            <linearGradient id="dcdcInductorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="20%" stopColor="#a855f7" />
              <stop offset="40%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="80%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            {/* Input source gradient - blue power */}
            <linearGradient id="dcdcInputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Output source gradient - green power */}
            <linearGradient id="dcdcOutputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="30%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>

            {/* Switch ON gradient - hot pink/magenta */}
            <linearGradient id="dcdcSwitchOnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#be185d" />
              <stop offset="25%" stopColor="#db2777" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="75%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Switch OFF gradient - cool gray */}
            <linearGradient id="dcdcSwitchOffGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Diode active gradient - cyan */}
            <linearGradient id="dcdcDiodeOnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* Capacitor metallic gradient */}
            <linearGradient id="dcdcCapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Wire gradient for connections */}
            <linearGradient id="dcdcWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* PWM waveform gradient */}
            <linearGradient id="dcdcPwmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>

            {/* Efficiency meter gradient */}
            <linearGradient id="dcdcEfficiencyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Stats panel gradient */}
            <linearGradient id="dcdcStatsPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(245,158,11,0.15)" />
              <stop offset="50%" stopColor="rgba(245,158,11,0.08)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.15)" />
            </linearGradient>

            {/* Formula panel gradient */}
            <linearGradient id="dcdcFormulaPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(168,85,247,0.2)" />
              <stop offset="50%" stopColor="rgba(168,85,247,0.1)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.2)" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="dcdcSwitchGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="dcdcDiodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="dcdcCurrentGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="dcdcInductorGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial glow for energy storage */}
            <radialGradient id="dcdcEnergyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>

            {/* Current particle gradient */}
            <radialGradient id="dcdcCurrentParticle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Grid pattern for background */}
            <pattern id="dcdcGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height} fill="url(#dcdcBgGrad)" rx="12" />
          <rect width={width} height={height} fill="url(#dcdcGrid)" rx="12" />

          {converterType === 'buck' ? (
            // Buck Converter Circuit - Premium Version
            <g transform="translate(30, 25)">
              {/* Input Source - Premium */}
              <rect x="10" y="60" width="55" height="85" fill="url(#dcdcInputGrad)" stroke="#60a5fa" strokeWidth="2" rx="6" filter="url(#dcdcSwitchGlow)" />
              <rect x="15" y="65" width="45" height="75" fill="rgba(0,0,0,0.3)" rx="4" />
              {/* + and - terminals */}
              <text x="37" y="78" fill="#93c5fd" fontSize="16" textAnchor="middle" fontWeight="bold">+</text>
              <text x="37" y="138" fill="#93c5fd" fontSize="16" textAnchor="middle" fontWeight="bold">-</text>

              {/* Switch (MOSFET) - Premium with glow */}
              <g transform="translate(85, 55)" filter={switchOn ? 'url(#dcdcSwitchGlow)' : undefined}>
                <rect x="0" y="0" width="45" height="35" fill={switchOn ? 'url(#dcdcSwitchOnGrad)' : 'url(#dcdcSwitchOffGrad)'} rx="6" stroke={switchOn ? '#f472b6' : '#4b5563'} strokeWidth="1.5" />
                {/* MOSFET symbol inside */}
                <line x1="10" y1="8" x2="10" y2="27" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="10" y1="17" x2="20" y2="17" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="20" y1="10" x2="20" y2="25" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="20" y1="17" x2="35" y2="17" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                {/* Gate */}
                <line x1="10" y1="5" x2="10" y2="0" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="1.5" />
                <circle cx="10" cy="0" r="2" fill={switchOn ? '#fce7f3' : '#9ca3af'} />
              </g>

              {/* Inductor - Premium with coil effect and glow */}
              <g transform="translate(150, 50)" filter="url(#dcdcInductorGlow)">
                {/* Core glow when storing energy */}
                {isAnimating && switchOn && (
                  <ellipse cx="45" cy="22" rx="50" ry="25" fill="url(#dcdcEnergyGlow)" />
                )}
                {/* Coil windings - multiple turns for realism */}
                <path d="M0,22 Q10,5 20,22 Q30,39 40,22 Q50,5 60,22 Q70,39 80,22 Q90,5 100,22" fill="none" stroke="url(#dcdcInductorGrad)" strokeWidth="6" strokeLinecap="round" />
                {/* Core line */}
                <line x1="5" y1="35" x2="95" y2="35" stroke="#475569" strokeWidth="2" strokeDasharray="4,3" />
              </g>

              {/* Diode - Premium with glow when active */}
              <g transform="translate(105, 100)" filter={!switchOn ? 'url(#dcdcDiodeGlow)' : undefined}>
                <polygon points="0,5 25,20 0,35" fill={!switchOn ? 'url(#dcdcDiodeOnGrad)' : 'url(#dcdcSwitchOffGrad)'} stroke={!switchOn ? '#22d3ee' : '#4b5563'} strokeWidth="1.5" />
                <line x1="25" y1="5" x2="25" y2="35" stroke={!switchOn ? '#22d3ee' : '#4b5563'} strokeWidth="3" />
                {/* Cathode band */}
                <rect x="25" y="5" width="5" height="30" fill={!switchOn ? '#67e8f9' : '#6b7280'} />
              </g>

              {/* Output Capacitor - Premium cylindrical look */}
              <g transform="translate(265, 65)">
                <rect x="0" y="0" width="15" height="65" fill="url(#dcdcCapGrad)" rx="3" stroke="#64748b" strokeWidth="1" />
                <rect x="2" y="2" width="11" height="61" fill="rgba(0,0,0,0.2)" rx="2" />
                {/* Polarity marking */}
                <text x="7" y="15" fill="#94a3b8" fontSize="10" textAnchor="middle">+</text>
                {/* Capacitor stripe */}
                <rect x="0" y="50" width="15" height="10" fill="#334155" rx="2" />
              </g>

              {/* Output/Load - Premium */}
              <rect x="295" y="55" width="65" height="90" fill="url(#dcdcOutputGrad)" stroke="#4ade80" strokeWidth="2" rx="6" filter="url(#dcdcSwitchGlow)" />
              <rect x="300" y="60" width="55" height="80" fill="rgba(0,0,0,0.3)" rx="4" />
              {/* Load resistor symbol */}
              <path d="M327,75 L327,80 L320,85 L334,90 L320,95 L334,100 L320,105 L334,110 L320,115 L327,120 L327,125" fill="none" stroke="#86efac" strokeWidth="2" />

              {/* Current flow animation - Premium particles */}
              {isAnimating && (
                <g filter="url(#dcdcCurrentGlow)">
                  {switchOn ? (
                    // Current path when switch ON - through switch and inductor
                    <>
                      <circle cx={85 + (animationPhase % 180) * 1.3} cy="72" r="6" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="1;0.6;1" dur="0.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={85 + ((animationPhase + 60) % 180) * 1.3} cy="72" r="4" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.25s" repeatCount="indefinite" />
                      </circle>
                    </>
                  ) : (
                    // Current path through diode when switch OFF - freewheeling
                    <>
                      <circle cx={265 - (animationPhase % 180) * 0.9} cy="120" r="6" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="1;0.6;1" dur="0.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={265 - ((animationPhase + 60) % 180) * 0.9} cy="120" r="4" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.25s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </g>
              )}

              {/* Connection lines - Premium with gradient */}
              <line x1="65" y1="72" x2="85" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="130" y1="72" x2="150" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="250" y1="72" x2="295" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="130" y1="120" x2="130" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="37" y1="145" x2="37" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="37" y1="165" x2="327" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="327" y1="145" x2="327" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              {/* Node dots */}
              <circle cx="130" cy="72" r="4" fill="#64748b" />
              <circle cx="130" cy="120" r="4" fill="#64748b" />
            </g>
          ) : (
            // Boost Converter Circuit - Premium Version
            <g transform="translate(30, 25)">
              {/* Input Source - Premium */}
              <rect x="10" y="60" width="55" height="85" fill="url(#dcdcInputGrad)" stroke="#60a5fa" strokeWidth="2" rx="6" filter="url(#dcdcSwitchGlow)" />
              <rect x="15" y="65" width="45" height="75" fill="rgba(0,0,0,0.3)" rx="4" />
              <text x="37" y="78" fill="#93c5fd" fontSize="16" textAnchor="middle" fontWeight="bold">+</text>
              <text x="37" y="138" fill="#93c5fd" fontSize="16" textAnchor="middle" fontWeight="bold">-</text>

              {/* Inductor (before switch in boost) - Premium */}
              <g transform="translate(85, 50)" filter="url(#dcdcInductorGlow)">
                {isAnimating && switchOn && (
                  <ellipse cx="45" cy="22" rx="50" ry="25" fill="url(#dcdcEnergyGlow)" />
                )}
                <path d="M0,22 Q10,5 20,22 Q30,39 40,22 Q50,5 60,22 Q70,39 80,22 Q90,5 100,22" fill="none" stroke="url(#dcdcInductorGrad)" strokeWidth="6" strokeLinecap="round" />
                <line x1="5" y1="35" x2="95" y2="35" stroke="#475569" strokeWidth="2" strokeDasharray="4,3" />
              </g>

              {/* Switch (MOSFET) - to ground in boost - Premium */}
              <g transform="translate(185, 100)" filter={switchOn ? 'url(#dcdcSwitchGlow)' : undefined}>
                <rect x="0" y="0" width="45" height="35" fill={switchOn ? 'url(#dcdcSwitchOnGrad)' : 'url(#dcdcSwitchOffGrad)'} rx="6" stroke={switchOn ? '#f472b6' : '#4b5563'} strokeWidth="1.5" />
                <line x1="10" y1="8" x2="10" y2="27" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="10" y1="17" x2="20" y2="17" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="20" y1="10" x2="20" y2="25" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="20" y1="17" x2="35" y2="17" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="2" />
                <line x1="10" y1="5" x2="10" y2="0" stroke={switchOn ? '#fce7f3' : '#9ca3af'} strokeWidth="1.5" />
                <circle cx="10" cy="0" r="2" fill={switchOn ? '#fce7f3' : '#9ca3af'} />
              </g>

              {/* Diode - Premium */}
              <g transform="translate(205, 50)" filter={!switchOn ? 'url(#dcdcDiodeGlow)' : undefined}>
                <polygon points="0,22 25,7 25,37" fill={!switchOn ? 'url(#dcdcDiodeOnGrad)' : 'url(#dcdcSwitchOffGrad)'} stroke={!switchOn ? '#22d3ee' : '#4b5563'} strokeWidth="1.5" />
                <line x1="0" y1="7" x2="0" y2="37" stroke={!switchOn ? '#22d3ee' : '#4b5563'} strokeWidth="3" />
                <rect x="-5" y="7" width="5" height="30" fill={!switchOn ? '#67e8f9' : '#6b7280'} />
              </g>

              {/* Output Capacitor - Premium */}
              <g transform="translate(265, 65)">
                <rect x="0" y="0" width="15" height="65" fill="url(#dcdcCapGrad)" rx="3" stroke="#64748b" strokeWidth="1" />
                <rect x="2" y="2" width="11" height="61" fill="rgba(0,0,0,0.2)" rx="2" />
                <text x="7" y="15" fill="#94a3b8" fontSize="10" textAnchor="middle">+</text>
                <rect x="0" y="50" width="15" height="10" fill="#334155" rx="2" />
              </g>

              {/* Output/Load - Premium */}
              <rect x="295" y="55" width="65" height="90" fill="url(#dcdcOutputGrad)" stroke="#4ade80" strokeWidth="2" rx="6" filter="url(#dcdcSwitchGlow)" />
              <rect x="300" y="60" width="55" height="80" fill="rgba(0,0,0,0.3)" rx="4" />
              <path d="M327,75 L327,80 L320,85 L334,90 L320,95 L334,100 L320,105 L334,110 L320,115 L327,120 L327,125" fill="none" stroke="#86efac" strokeWidth="2" />

              {/* Connection lines - Premium */}
              <line x1="65" y1="72" x2="85" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="185" y1="72" x2="205" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="230" y1="72" x2="295" y2="72" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="207" y1="100" x2="207" y2="85" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="207" y1="135" x2="207" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="37" y1="145" x2="37" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="37" y1="165" x2="327" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              <line x1="327" y1="145" x2="327" y2="165" stroke="url(#dcdcWireGrad)" strokeWidth="3" />
              {/* Node dots */}
              <circle cx="207" cy="72" r="4" fill="#64748b" />
              <circle cx="207" cy="100" r="4" fill="#64748b" />

              {/* Current flow animation */}
              {isAnimating && (
                <g filter="url(#dcdcCurrentGlow)">
                  {switchOn ? (
                    // Current charging inductor through switch to ground
                    <>
                      <circle cx={120 + (animationPhase % 120) * 0.75} cy="72" r="6" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="1;0.6;1" dur="0.2s" repeatCount="indefinite" />
                      </circle>
                    </>
                  ) : (
                    // Current through diode to output
                    <>
                      <circle cx={180 + (animationPhase % 120) * 0.9} cy="72" r="6" fill="url(#dcdcCurrentParticle)">
                        <animate attributeName="opacity" values="1;0.6;1" dur="0.2s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {/* Voltage Waveform Display - Premium */}
          <g transform="translate(25, 220)">
            <rect x="0" y="0" width="175" height="70" fill="rgba(0,0,0,0.4)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* PWM waveform with gradient */}
            <line x1="10" y1="55" x2="165" y2="55" stroke="#475569" strokeWidth="1" />
            <line x1="10" y1="30" x2="165" y2="30" stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />

            {/* Draw PWM pulses with premium gradient */}
            {[0, 1, 2].map(i => {
              const pulseWidth = 45 * D;
              const x = 15 + i * 50;
              return (
                <g key={i}>
                  <line x1={x} y1="55" x2={x} y2="30" stroke="url(#dcdcPwmGrad)" strokeWidth="2" />
                  <line x1={x} y1="30" x2={x + pulseWidth} y2="30" stroke="url(#dcdcPwmGrad)" strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="30" x2={x + pulseWidth} y2="55" stroke="url(#dcdcPwmGrad)" strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="55" x2={x + 45} y2="55" stroke="#475569" strokeWidth="2" />
                </g>
              );
            })}
          </g>

          {/* Efficiency Indicator - Premium gauge */}
          <g transform="translate(220, 220)">
            <rect x="0" y="0" width="195" height="70" fill="url(#dcdcStatsPanelGrad)" rx="8" stroke={colors.accent} strokeWidth="1" />

            {/* Efficiency bar background */}
            <rect x="10" y="35" width="175" height="12" fill="rgba(0,0,0,0.4)" rx="6" />
            {/* Efficiency bar fill with gradient */}
            <rect x="10" y="35" width={175 * (efficiencyPercent / 100)} height="12" fill="url(#dcdcEfficiencyGrad)" rx="6" />
            {/* Efficiency marker */}
            <rect x={10 + 175 * (efficiencyPercent / 100) - 2} y="33" width="4" height="16" fill="#fff" rx="2" />

            {/* Stats below */}
            <g transform="translate(10, 58)">
              <circle cx="5" cy="5" r="3" fill={colors.success} />
            </g>
            <g transform="translate(70, 58)">
              <circle cx="5" cy="5" r="3" fill={colors.accent} />
            </g>
            <g transform="translate(135, 58)">
              <circle cx="5" cy="5" r="3" fill={colors.warning} />
            </g>
          </g>

          {/* Formula Panel - Premium */}
          <g transform="translate(25, 305)">
            <rect x="0" y="0" width="390" height="45" fill="url(#dcdcFormulaPanelGrad)" rx="8" stroke={colors.inductor} strokeWidth="1" />
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '540px', padding: '0 20px', marginTop: '-75px' }}>
          {/* Input label */}
          <div style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ fontSize: typo.small, color: colors.input, fontWeight: 600 }}>Input</div>
            <div style={{ fontSize: typo.bodyLarge, color: colors.textPrimary, fontWeight: 700 }}>{inputVoltage}V</div>
            <div style={{ fontSize: typo.label, color: colors.textSecondary }}>{output.inputCurrent.toFixed(2)}A</div>
          </div>
          {/* Inductor label */}
          <div style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ fontSize: typo.small, color: colors.inductor, fontWeight: 600 }}>Inductor</div>
            <div style={{ fontSize: typo.bodyLarge, color: colors.textPrimary, fontWeight: 700 }}>{inductance}uH</div>
          </div>
          {/* Output label */}
          <div style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ fontSize: typo.small, color: colors.output, fontWeight: 600 }}>Output</div>
            <div style={{ fontSize: typo.bodyLarge, color: colors.textPrimary, fontWeight: 700 }}>{output.outputVoltage.toFixed(1)}V</div>
            <div style={{ fontSize: typo.label, color: colors.textSecondary }}>{loadCurrent.toFixed(1)}A</div>
          </div>
        </div>

        {/* Waveform and Stats labels outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '540px', padding: '0 20px', marginTop: '8px' }}>
          {/* PWM label */}
          <div style={{ textAlign: 'center', minWidth: '175px' }}>
            <div style={{ fontSize: typo.small, color: colors.switch, fontWeight: 600 }}>PWM Signal</div>
            <div style={{ fontSize: typo.body, color: colors.textSecondary }}>Duty Cycle: {dutyCycle}%</div>
          </div>
          {/* Stats labels */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: typo.label, color: colors.success }}>Efficiency</div>
              <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 600 }}>{output.efficiency.toFixed(0)}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: typo.label, color: colors.accent }}>Power</div>
              <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 600 }}>{output.outputPower.toFixed(1)}W</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: typo.label, color: colors.warning }}>Ripple</div>
              <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 600 }}>{(output.rippleCurrent * 1000).toFixed(0)}mA</div>
            </div>
          </div>
        </div>

        {/* Formula outside SVG */}
        <div style={{
          background: 'rgba(168, 85, 247, 0.15)',
          padding: '12px 20px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.inductor}`,
          maxWidth: '520px',
          width: '100%',
          marginTop: '8px'
        }}>
          <span style={{ fontSize: typo.body, color: colors.inductor, fontWeight: 700 }}>
            {converterType === 'buck'
              ? `Buck: Vout = D x Vin = ${D.toFixed(2)} x ${inputVoltage}V = ${output.outputVoltage.toFixed(1)}V`
              : `Boost: Vout = Vin/(1-D) = ${inputVoltage}V/(1-${D.toFixed(2)}) = ${output.outputVoltage.toFixed(1)}V`
            }
          </span>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.small,
                boxShadow: isAnimating ? `0 4px 15px ${colors.error}40` : `0 4px 15px ${colors.success}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Current'}
            </button>
            <button
              onClick={() => setConverterType(converterType === 'buck' ? 'boost' : 'buck')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.inductor} 0%, #7c3aed 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.small,
                boxShadow: `0 4px 15px ${colors.inductor}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Switch to {converterType === 'buck' ? 'Boost' : 'Buck'}
            </button>
            <button
              onClick={() => { setDutyCycle(50); setInputVoltage(24); setLoadCurrent(2); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.small,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showAdvanced: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Duty Cycle: {dutyCycle}% (Switch ON time)
        </label>
        <input
          type="range"
          min="5"
          max="95"
          step="1"
          value={dutyCycle}
          onInput={(e) => setDutyCycle(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setDutyCycle(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>5% (Low Output)</span>
          <span>95% (High Output)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Input Voltage: {inputVoltage}V
        </label>
        <input
          type="range"
          min="5"
          max="48"
          step="1"
          value={inputVoltage}
          onInput={(e) => setInputVoltage(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setInputVoltage(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Load Current: {loadCurrent.toFixed(1)}A
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          value={loadCurrent}
          onInput={(e) => setLoadCurrent(parseFloat((e.target as HTMLInputElement).value))}
          onChange={(e) => setLoadCurrent(parseFloat(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
      </div>

      {showAdvanced && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Switching Frequency: {switchingFrequency} kHz
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={switchingFrequency}
              onInput={(e) => setwitchingFrequency(parseInt((e.target as HTMLInputElement).value))}
              onChange={(e) => setwitchingFrequency(parseInt(e.target.value))}
              style={{ width: '100%', height: '32px', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Inductance: {inductance} uH
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={inductance}
              onInput={(e) => setInductance(parseInt((e.target as HTMLInputElement).value))}
              onChange={(e) => setInductance(parseInt(e.target.value))}
              style={{ width: '100%', height: '32px', cursor: 'pointer' }}
            />
          </div>
        </>
      )}

      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.inductor}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          How It Works
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          {converterType === 'buck'
            ? 'The inductor stores energy when the switch is ON, then releases it to the load when OFF. Higher duty cycle = more time ON = higher output voltage.'
            : 'The inductor charges from input when switch is ON (shorted to ground). When OFF, inductor voltage ADDS to input, boosting output voltage.'
          }
        </div>
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button
              onClick={() => index <= currentIndex && goToPhase(p)}
              disabled={index > currentIndex}
              style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                borderRadius: '50%',
                border: 'none',
                background: index === currentIndex
                  ? colors.accent
                  : index < currentIndex
                    ? colors.success
                    : 'rgba(255,255,255,0.2)',
                color: index <= currentIndex ? 'white' : colors.textMuted,
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: 'bold',
                cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              title={phaseLabels[p]}
            >
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{
                width: isMobile ? '12px' : '20px',
                height: '2px',
                background: index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const getBottomBarConfig = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    let canProceed = true;
    let nextLabel = 'Next';

    switch (phase) {
      case 'hook':
        nextLabel = 'Make a Prediction';
        break;
      case 'predict':
        canProceed = !!prediction;
        nextLabel = 'Test My Prediction';
        break;
      case 'play':
        nextLabel = 'Continue to Review';
        break;
      case 'review':
        nextLabel = 'Next: A Twist!';
        break;
      case 'twist_predict':
        canProceed = !!twistPrediction;
        nextLabel = 'Test My Prediction';
        break;
      case 'twist_play':
        nextLabel = 'See the Explanation';
        break;
      case 'twist_review':
        nextLabel = 'Apply This Knowledge';
        break;
      case 'transfer':
        canProceed = transferCompleted.size >= 4;
        nextLabel = 'Take the Test';
        break;
      case 'test':
        canProceed = testSubmitted && testScore >= 8;
        nextLabel = testSubmitted ? (testScore >= 8 ? 'Complete Mastery' : 'Review & Retry') : 'Submit Test';
        break;
      case 'mastery':
        nextLabel = 'Complete Game';
        break;
    }

    return { isFirst, isLast, canProceed, nextLabel };
  };

  const renderBottomBar = () => {
    const { isFirst, isLast, canProceed, nextLabel } = getBottomBarConfig();

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 'bold',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            flex: 1,
            maxWidth: '300px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Render phase content
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              DC-DC Converters: Voltage Transformation
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How do electronics change voltage levels efficiently?
            </p>

            {renderVisualization(true)}

            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                background: colors.bgCard,
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                  Your phone charger takes 120V AC, converts to DC, then a <strong style={{ color: colors.inductor }}>DC-DC converter</strong> steps
                  it down to exactly 5V (or up to 20V for fast charging). Solar systems use them to match panel voltage to battery voltage.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                  Unlike resistive voltage dividers, DC-DC converters are over 90% efficient!
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Adjust the duty cycle to control output voltage. Watch the formula update in real-time!
                </p>
              </div>
            </div>
          </div>
        );

      case 'predict':
        return (
          <>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A DC-DC converter with a switch that rapidly turns ON and OFF (switching at 100kHz+),
                an inductor that stores energy, and a diode that provides a path for current when the switch is OFF.
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                What determines the output voltage of a DC-DC converter?
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
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore DC-DC Conversion</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust duty cycle and see how output voltage changes
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
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Sweep duty cycle from 5% to 95% - watch output voltage track the formula</li>
                <li>Switch between Buck and Boost modes - note the different formulas</li>
                <li>With Boost mode, see what happens as duty cycle approaches 100%</li>
                <li>Notice: Power out is always less than power in (conservation + losses)</li>
              </ul>
            </div>
          </>
        );

      case 'review':
        const wasCorrect = prediction === 'switch_time';
        return (
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
              <p style={{ color: colors.textPrimary }}>
                The <strong>duty cycle</strong> (percentage of time the switch is ON) directly controls the output voltage.
                This is called Pulse Width Modulation (PWM). By averaging the switched voltage through the inductor and capacitor,
                we get a smooth DC output.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>How DC-DC Converters Work</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Inductor is Key:</strong> Inductors resist
                  changes in current. When the switch turns ON, current builds up in the inductor. When OFF,
                  the inductor maintains current flow through the diode, releasing stored energy.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Buck (Step-Down):</strong> Vout = D x Vin. The
                  switch chops the input, and the LC filter averages it. 50% duty cycle = half the input voltage.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Boost (Step-Up):</strong> Vout = Vin / (1-D). When
                  the switch is ON, the inductor charges. When OFF, inductor voltage ADDS to input voltage.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Efficiency:</strong> Unlike resistors that waste
                  excess voltage as heat, inductors store and release energy. Real converters achieve 85-95% efficiency!
                </p>
              </div>
            </div>
          </>
        );

      case 'twist_predict':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                What are the limits of boost converters?
              </p>
            </div>

            {renderVisualization(false, true)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                The boost formula Vout = Vin/(1-D) suggests that as D approaches 100%, output voltage
                approaches infinity! But real converters cannot boost indefinitely. What limits them?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                What limits how high a boost converter can go?
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
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'twist_play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Boost Converter Limits</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Try high duty cycles and observe efficiency
              </p>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                At very high duty cycles (above 80-90%), the switch has very little OFF time to transfer
                energy to the output. Parasitic resistances cause more and more loss as current increases.
                Practical boost ratios are limited to about 4-5x before efficiency drops unacceptably.
              </p>
            </div>
          </>
        );

      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'boost_limited';
        return (
          <>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistWasCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Real boost converters are practically limited to about <strong>4-5x voltage gain</strong>.
                At higher ratios, efficiency drops dramatically due to parasitic losses and the duty cycle
                approaching 100% leaves no time for energy transfer.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Practical Limitations</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Parasitic Resistance:</strong> Every component
                  has resistance. At high currents (needed for high boost ratios), I^2R losses become significant.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Switch and Diode Losses:</strong> MOSFETs have
                  on-resistance and switching losses. Diodes have forward voltage drop. These add up!
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>The Solution:</strong> For higher voltage ratios,
                  use cascaded converters, transformer-based topologies (flyback, forward), or charge pumps.
                  These trade complexity for better high-ratio performance.
                </p>
              </div>
            </div>
          </>
        );

      case 'transfer':
        return (
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              DC-DC converters are everywhere in modern electronics
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  margin: '16px 0',
                  padding: '16px',
                  borderRadius: '12px',
                  border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
                </div>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                margin: '16px',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 8 ? 'You understand DC-DC conversion!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                        {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
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
          </div>
        );

      case 'mastery':
        return (
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
              <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered DC-DC converter principles</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Buck converter: Vout = D x Vin (step-down)</li>
                <li>Boost converter: Vout = Vin / (1-D) (step-up)</li>
                <li>Role of inductor in energy storage and transfer</li>
                <li>Duty cycle controls output voltage</li>
                <li>High efficiency through energy storage vs. dissipation</li>
                <li>Practical limits of boost converters</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Advanced topologies include buck-boost (bidirectional), SEPIC, Cuk, flyback (isolated),
                and full/half-bridge converters for high power. Synchronous rectification replaces diodes
                with MOSFETs for even higher efficiency. Digital control enables adaptive algorithms
                for maximum efficiency across varying loads.
              </p>
            </div>
            {renderVisualization(true, true)}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default DCDCConverterRenderer;
