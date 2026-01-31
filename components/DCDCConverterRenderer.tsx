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
    const width = 400;
    const height = 340;
    const D = dutyCycle / 100;
    const switchOn = (animationPhase / 360) < D;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="inductorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.inductor} />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
            {converterType === 'buck' ? 'Buck Converter (Step-Down)' : 'Boost Converter (Step-Up)'}
          </text>

          {converterType === 'buck' ? (
            // Buck Converter Circuit
            <g transform="translate(20, 40)">
              {/* Input Source */}
              <rect x="10" y="60" width="50" height="80" fill="rgba(59, 130, 246, 0.2)" stroke={colors.input} strokeWidth="2" rx="4" />
              <text x="35" y="85" fill={colors.input} fontSize="11" textAnchor="middle">Input</text>
              <text x="35" y="105" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">{inputVoltage}V</text>
              <text x="35" y="125" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{output.inputCurrent.toFixed(2)}A</text>

              {/* Switch (MOSFET) */}
              <g transform="translate(80, 60)">
                <rect x="0" y="0" width="40" height="30" fill={switchOn ? colors.switch : '#374151'} rx="4" opacity={0.8} />
                <text x="20" y="20" fill="white" fontSize="10" textAnchor="middle">{switchOn ? 'ON' : 'OFF'}</text>
                <text x="20" y="45" fill={colors.textMuted} fontSize="9" textAnchor="middle">Switch</text>
              </g>

              {/* Inductor */}
              <g transform="translate(140, 55)">
                <path d="M0,15 Q15,0 30,15 Q45,30 60,15 Q75,0 90,15" fill="none" stroke="url(#inductorGrad)" strokeWidth="4" />
                <text x="45" y="45" fill={colors.inductor} fontSize="10" textAnchor="middle">{inductance}uH</text>
              </g>

              {/* Diode */}
              <g transform="translate(100, 100)">
                <polygon points="0,0 20,15 0,30" fill={!switchOn ? colors.diode : '#374151'} />
                <line x1="20" y1="0" x2="20" y2="30" stroke={!switchOn ? colors.diode : '#374151'} strokeWidth="3" />
                <text x="10" y="50" fill={colors.textMuted} fontSize="9" textAnchor="middle">Diode</text>
              </g>

              {/* Output Capacitor */}
              <g transform="translate(250, 70)">
                <line x1="0" y1="0" x2="0" y2="60" stroke={colors.textMuted} strokeWidth="3" />
                <line x1="10" y1="0" x2="10" y2="60" stroke={colors.textMuted} strokeWidth="3" />
                <text x="5" y="80" fill={colors.textMuted} fontSize="9" textAnchor="middle">Cap</text>
              </g>

              {/* Output/Load */}
              <rect x="280" y="60" width="60" height="80" fill="rgba(34, 197, 94, 0.2)" stroke={colors.output} strokeWidth="2" rx="4" />
              <text x="310" y="85" fill={colors.output} fontSize="11" textAnchor="middle">Output</text>
              <text x="310" y="105" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">{output.outputVoltage.toFixed(1)}V</text>
              <text x="310" y="125" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{loadCurrent.toFixed(1)}A</text>

              {/* Current flow animation */}
              {isAnimating && (
                <g>
                  {switchOn ? (
                    // Current path when switch ON
                    <circle cx={80 + (animationPhase % 180) * 1.2} cy="75" r="4" fill={colors.switch}>
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  ) : (
                    // Current path through diode when switch OFF
                    <circle cx={250 - (animationPhase % 180) * 0.8} cy="115" r="4" fill={colors.diode}>
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )}

              {/* Connection lines */}
              <line x1="60" y1="75" x2="80" y2="75" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="120" y1="75" x2="140" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="230" y1="70" x2="280" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="120" y1="115" x2="120" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="35" y1="140" x2="35" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="35" y1="160" x2="310" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="310" y1="140" x2="310" y2="160" stroke={colors.textMuted} strokeWidth="2" />
            </g>
          ) : (
            // Boost Converter Circuit
            <g transform="translate(20, 40)">
              {/* Input Source */}
              <rect x="10" y="60" width="50" height="80" fill="rgba(59, 130, 246, 0.2)" stroke={colors.input} strokeWidth="2" rx="4" />
              <text x="35" y="85" fill={colors.input} fontSize="11" textAnchor="middle">Input</text>
              <text x="35" y="105" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">{inputVoltage}V</text>
              <text x="35" y="125" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{output.inputCurrent.toFixed(2)}A</text>

              {/* Inductor (before switch in boost) */}
              <g transform="translate(80, 55)">
                <path d="M0,15 Q15,0 30,15 Q45,30 60,15 Q75,0 90,15" fill="none" stroke="url(#inductorGrad)" strokeWidth="4" />
                <text x="45" y="45" fill={colors.inductor} fontSize="10" textAnchor="middle">{inductance}uH</text>
              </g>

              {/* Switch (MOSFET) - to ground in boost */}
              <g transform="translate(180, 100)">
                <rect x="0" y="0" width="40" height="30" fill={switchOn ? colors.switch : '#374151'} rx="4" opacity={0.8} />
                <text x="20" y="20" fill="white" fontSize="10" textAnchor="middle">{switchOn ? 'ON' : 'OFF'}</text>
                <text x="20" y="45" fill={colors.textMuted} fontSize="9" textAnchor="middle">Switch</text>
              </g>

              {/* Diode */}
              <g transform="translate(200, 55)">
                <polygon points="0,15 20,0 20,30" fill={!switchOn ? colors.diode : '#374151'} />
                <line x1="0" y1="0" x2="0" y2="30" stroke={!switchOn ? colors.diode : '#374151'} strokeWidth="3" />
                <text x="10" y="50" fill={colors.textMuted} fontSize="9" textAnchor="middle">Diode</text>
              </g>

              {/* Output Capacitor */}
              <g transform="translate(250, 70)">
                <line x1="0" y1="0" x2="0" y2="60" stroke={colors.textMuted} strokeWidth="3" />
                <line x1="10" y1="0" x2="10" y2="60" stroke={colors.textMuted} strokeWidth="3" />
                <text x="5" y="80" fill={colors.textMuted} fontSize="9" textAnchor="middle">Cap</text>
              </g>

              {/* Output/Load */}
              <rect x="280" y="60" width="60" height="80" fill="rgba(34, 197, 94, 0.2)" stroke={colors.output} strokeWidth="2" rx="4" />
              <text x="310" y="85" fill={colors.output} fontSize="11" textAnchor="middle">Output</text>
              <text x="310" y="105" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">{output.outputVoltage.toFixed(1)}V</text>
              <text x="310" y="125" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{loadCurrent.toFixed(1)}A</text>

              {/* Connection lines */}
              <line x1="60" y1="75" x2="80" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="170" y1="70" x2="200" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="220" y1="70" x2="280" y2="70" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="200" y1="100" x2="200" y2="80" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="200" y1="130" x2="200" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="35" y1="140" x2="35" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="35" y1="160" x2="310" y2="160" stroke={colors.textMuted} strokeWidth="2" />
              <line x1="310" y1="140" x2="310" y2="160" stroke={colors.textMuted} strokeWidth="2" />
            </g>
          )}

          {/* Duty Cycle Waveform */}
          <g transform="translate(30, 220)">
            <rect x="0" y="0" width="160" height="60" fill="rgba(0,0,0,0.3)" rx="6" />
            <text x="80" y="15" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Switch Signal (Duty Cycle: {dutyCycle}%)</text>

            {/* PWM waveform */}
            <line x1="10" y1="50" x2="150" y2="50" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="10" y1="25" x2="150" y2="25" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="2,2" />

            {/* Draw PWM pulses */}
            {[0, 1, 2].map(i => {
              const pulseWidth = 40 * D;
              const x = 15 + i * 45;
              return (
                <g key={i}>
                  <line x1={x} y1="50" x2={x} y2="25" stroke={colors.switch} strokeWidth="2" />
                  <line x1={x} y1="25" x2={x + pulseWidth} y2="25" stroke={colors.switch} strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="25" x2={x + pulseWidth} y2="50" stroke={colors.switch} strokeWidth="2" />
                  <line x1={x + pulseWidth} y1="50" x2={x + 40} y2="50" stroke={colors.textMuted} strokeWidth="2" />
                </g>
              );
            })}
          </g>

          {/* Output Stats */}
          <g transform="translate(210, 220)">
            <rect x="0" y="0" width="170" height="60" fill="rgba(0,0,0,0.3)" rx="6" stroke={colors.accent} strokeWidth="1" />
            <text x="85" y="15" fill={colors.accent} fontSize="10" textAnchor="middle" fontWeight="bold">Performance</text>
            <text x="10" y="32" fill={colors.textSecondary} fontSize="10">Power: {output.outputPower.toFixed(1)}W</text>
            <text x="10" y="48" fill={colors.success} fontSize="10">Efficiency: ~{output.efficiency.toFixed(0)}%</text>
            <text x="100" y="32" fill={colors.textSecondary} fontSize="10">Ripple: {(output.rippleCurrent * 1000).toFixed(0)}mA</text>
          </g>

          {/* Formula */}
          <g transform="translate(30, 295)">
            <rect x="0" y="0" width="340" height="35" fill="rgba(168, 85, 247, 0.15)" rx="6" />
            <text x="170" y="22" fill={colors.inductor} fontSize="12" textAnchor="middle" fontWeight="bold">
              {converterType === 'buck'
                ? `Buck: Vout = D x Vin = ${D.toFixed(2)} x ${inputVoltage}V = ${output.outputVoltage.toFixed(1)}V`
                : `Boost: Vout = Vin/(1-D) = ${inputVoltage}V/(1-${D.toFixed(2)}) = ${output.outputVoltage.toFixed(1)}V`
              }
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
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
                background: colors.inductor,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
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
                fontSize: '13px',
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
