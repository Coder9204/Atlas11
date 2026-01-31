import React, { useState, useEffect, useCallback, useRef } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface BatteryInternalResistanceRendererProps {
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
  battery: '#22c55e',
  batteryLow: '#ef4444',
  batteryMid: '#f59e0b',
  voltage: '#3b82f6',
  current: '#a855f7',
  resistance: '#ec4899',
  power: '#f97316',
};

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const BatteryInternalResistanceRenderer: React.FC<BatteryInternalResistanceRendererProps> = ({
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
  const [stateOfCharge, setStateOfCharge] = useState(100); // 0-100%
  const [temperature, setTemperature] = useState(25); // Celsius
  const [loadCurrent, setLoadCurrent] = useState(1); // Amps
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateBatteryValues = useCallback(() => {
    // Base internal resistance at 100% SOC and 25C (typical Li-ion: 20-100 milliohms)
    const baseResistance = 0.05; // 50 milliohms

    // SOC effect: internal resistance increases exponentially as battery depletes
    // At 10% SOC, resistance can be 2-3x higher
    const socFactor = 1 + 2 * Math.pow(1 - stateOfCharge / 100, 2);

    // Temperature effect: resistance increases significantly in cold
    // At 0C, resistance can be 2-3x higher than at 25C
    // At -20C, can be 5-10x higher
    let tempFactor = 1;
    if (temperature < 25) {
      tempFactor = 1 + 0.05 * Math.pow(25 - temperature, 1.3);
    } else if (temperature > 25) {
      // Slight decrease at higher temps (but limited)
      tempFactor = 1 - 0.01 * Math.min(temperature - 25, 20);
    }

    const internalResistance = baseResistance * socFactor * tempFactor;

    // Open circuit voltage varies with SOC (3.0V empty to 4.2V full for Li-ion)
    const openCircuitVoltage = 3.0 + 1.2 * (stateOfCharge / 100);

    // Voltage drop = I * R_internal
    const voltageDrop = loadCurrent * internalResistance;

    // Terminal voltage = OCV - voltage drop
    const terminalVoltage = Math.max(0, openCircuitVoltage - voltageDrop);

    // Power delivered to load
    const powerDelivered = terminalVoltage * loadCurrent;

    // Power wasted in internal resistance
    const powerWasted = voltageDrop * loadCurrent;

    // Efficiency
    const efficiency = terminalVoltage / openCircuitVoltage * 100;

    return {
      internalResistance,
      openCircuitVoltage,
      terminalVoltage,
      voltageDrop,
      powerDelivered,
      powerWasted,
      efficiency,
    };
  }, [stateOfCharge, temperature, loadCurrent]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLoadCurrent(prev => {
        let newVal = prev + animationDirection * 0.2;
        if (newVal >= 10) {
          setAnimationDirection(-1);
          newVal = 10;
        } else if (newVal <= 0.1) {
          setAnimationDirection(1);
          newVal = 0.1;
        }
        return Math.round(newVal * 10) / 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, animationDirection]);

  const values = calculateBatteryValues();

  const predictions = [
    { id: 'voltage_same', label: 'Battery voltage stays the same regardless of current draw' },
    { id: 'voltage_drops', label: 'Battery voltage drops when current increases due to internal resistance' },
    { id: 'voltage_increases', label: 'Battery voltage increases when you draw more current' },
    { id: 'only_empty', label: 'Internal resistance only matters when the battery is empty' },
  ];

  const twistPredictions = [
    { id: 'low_current_better', label: 'Low-current devices show the weakness more clearly' },
    { id: 'high_current_better', label: 'High-current devices reveal internal resistance more dramatically' },
    { id: 'same_effect', label: 'All devices show the same percentage voltage drop' },
    { id: 'no_effect', label: 'Current draw does not affect how internal resistance manifests' },
  ];

  const transferApplications = [
    {
      title: 'Smartphone Battery Life',
      description: 'When your phone is at 20% battery and you try to use the camera flash or GPS navigation, it might shut off unexpectedly.',
      question: 'Why does a phone at 20% sometimes die instantly under heavy use?',
      answer: 'At low SOC, internal resistance is higher. When the processor demands high current (camera, GPS), the voltage drops below the minimum operating threshold even though there is charge left. The BMS triggers shutdown to protect the battery from over-discharge.',
    },
    {
      title: 'Electric Vehicle Cold Weather Range',
      description: 'EV owners notice significantly reduced range in winter, even beyond just heating needs.',
      question: 'Why do EVs lose range in cold weather beyond just cabin heating?',
      answer: 'Cold batteries have much higher internal resistance (2-5x at 0C). This means more energy is wasted as heat inside the battery, acceleration feels sluggish, and regenerative braking is limited. Modern EVs preheat batteries to optimize performance.',
    },
    {
      title: 'Jump Starting Cars',
      description: 'A battery that can run headlights for hours cannot crank the starter motor when cold.',
      question: 'Why can a seemingly good battery fail to start a car in cold weather?',
      answer: 'Starter motors draw 100-400A. At -20C, internal resistance can be 5x normal. A 12V battery with 100mOhm internal resistance drops to only 2V under 100A load! The headlights (2A) barely notice the same resistance (0.2V drop).',
    },
    {
      title: 'Grid-Scale Energy Storage',
      description: 'Large battery installations must carefully manage charge/discharge rates to maintain efficiency.',
      question: 'Why do grid batteries have rated power limits separate from capacity?',
      answer: 'At high currents, internal resistance causes significant efficiency losses and heating. A 100MWh battery might only be rated for 25MW continuous discharge to keep losses under 5% and prevent thermal runaway. Fast response comes at an efficiency cost.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is battery internal resistance?',
      options: [
        { text: 'The resistance of the wires connecting to the battery', correct: false },
        { text: 'The resistance within the battery itself that causes voltage drop under load', correct: true },
        { text: 'The resistance that prevents overcharging', correct: false },
        { text: 'A measure of how much the battery resists being charged', correct: false },
      ],
    },
    {
      question: 'How does internal resistance change as a battery discharges?',
      options: [
        { text: 'It stays constant regardless of state of charge', correct: false },
        { text: 'It decreases as the battery empties', correct: false },
        { text: 'It increases as the battery empties', correct: true },
        { text: 'It only changes at exactly 50% charge', correct: false },
      ],
    },
    {
      question: 'What happens to battery internal resistance in cold temperatures?',
      options: [
        { text: 'It decreases significantly', correct: false },
        { text: 'It increases significantly', correct: true },
        { text: 'It stays exactly the same', correct: false },
        { text: 'It fluctuates randomly', correct: false },
      ],
    },
    {
      question: 'If a 4V battery has 0.1 ohm internal resistance and supplies 2A, what is the terminal voltage?',
      options: [
        { text: '4.0V (no change)', correct: false },
        { text: '3.8V (V = 4 - 2 x 0.1)', correct: true },
        { text: '4.2V (voltage increases)', correct: false },
        { text: '2.0V (half the current)', correct: false },
      ],
    },
    {
      question: 'Why does a phone battery sometimes die at 15-20% when using demanding apps?',
      options: [
        { text: 'The battery percentage display is always inaccurate', correct: false },
        { text: 'High current demand causes voltage drop below minimum operating threshold', correct: true },
        { text: 'The apps are draining the battery faster than the display updates', correct: false },
        { text: 'The phone is protecting itself from app malware', correct: false },
      ],
    },
    {
      question: 'What is the power loss formula due to internal resistance?',
      options: [
        { text: 'P = V x R', correct: false },
        { text: 'P = I^2 x R (current squared times resistance)', correct: true },
        { text: 'P = V^2 / I', correct: false },
        { text: 'P = R / I^2', correct: false },
      ],
    },
    {
      question: 'A car battery works fine for headlights but cannot start the engine in winter. Why?',
      options: [
        { text: 'The headlights use less voltage', correct: false },
        { text: 'The starter motor draws much higher current, making resistance losses dramatic', correct: true },
        { text: 'The engine is frozen solid', correct: false },
        { text: 'Headlights are more efficient in cold weather', correct: false },
      ],
    },
    {
      question: 'How can you measure a battery internal resistance?',
      options: [
        { text: 'Measure voltage at two different load currents and calculate R = dV/dI', correct: true },
        { text: 'Connect an ohmmeter directly to the terminals', correct: false },
        { text: 'Measure the battery weight', correct: false },
        { text: 'Check the battery label - it is always printed there', correct: false },
      ],
    },
    {
      question: 'Why do lithium batteries need a Battery Management System (BMS)?',
      options: [
        { text: 'Only to display the charge percentage', correct: false },
        { text: 'To monitor voltage, current, and temperature to prevent damage from internal resistance effects', correct: true },
        { text: 'To make the battery look more professional', correct: false },
        { text: 'BMS is optional for lithium batteries', correct: false },
      ],
    },
    {
      question: 'Which scenario would show the LEAST effect from internal resistance?',
      options: [
        { text: 'Cold battery, low charge, high current', correct: false },
        { text: 'Warm battery, full charge, low current', correct: true },
        { text: 'Cold battery, full charge, high current', correct: false },
        { text: 'Warm battery, low charge, high current', correct: false },
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

  const renderVisualization = (interactive: boolean, showTempControl: boolean = false) => {
    const width = 400;
    const height = 400;

    // Battery visual
    const batteryX = 50;
    const batteryY = 30;
    const batteryWidth = 80;
    const batteryHeight = 120;

    // Color based on SOC
    const getBatteryColor = () => {
      if (stateOfCharge > 60) return colors.battery;
      if (stateOfCharge > 30) return colors.batteryMid;
      return colors.batteryLow;
    };

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
            <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getBatteryColor()} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getBatteryColor()} stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Battery Cell */}
          <g transform={`translate(${batteryX}, ${batteryY})`}>
            <rect x="25" y="-8" width="30" height="8" fill="#475569" rx="2" />
            <rect x="0" y="0" width={batteryWidth} height={batteryHeight} fill="#1e293b" rx="6" stroke="#475569" strokeWidth="3" />
            <rect
              x="4"
              y={4 + batteryHeight * (1 - stateOfCharge / 100) * 0.92}
              width={batteryWidth - 8}
              height={(batteryHeight - 8) * (stateOfCharge / 100) * 0.92}
              fill="url(#batteryGrad)"
              rx="3"
            />
            <text x={batteryWidth / 2} y={batteryHeight / 2} fill={colors.textPrimary} fontSize="16" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
              {stateOfCharge}%
            </text>
            <text x={batteryWidth / 2} y={batteryHeight + 15} fill={colors.textSecondary} fontSize="10" textAnchor="middle">
              State of Charge
            </text>
          </g>

          {/* Temperature indicator */}
          <g transform="translate(160, 30)">
            <rect x="0" y="0" width="30" height="80" fill="#1e293b" rx="15" stroke="#475569" strokeWidth="2" />
            <rect
              x="5"
              y={5 + 60 * (1 - (temperature + 20) / 80)}
              width="20"
              height={60 * ((temperature + 20) / 80)}
              fill={temperature < 10 ? colors.voltage : temperature > 35 ? colors.error : colors.warning}
              rx="10"
            />
            <circle cx="15" cy="70" r="10" fill={temperature < 10 ? colors.voltage : temperature > 35 ? colors.error : colors.warning} />
            <text x="15" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle">
              {temperature}C
            </text>
          </g>

          {/* Circuit representation */}
          <g transform="translate(200, 40)">
            {/* Internal resistance symbol */}
            <text x="0" y="0" fill={colors.textMuted} fontSize="10">Internal Circuit:</text>

            {/* OCV source */}
            <circle cx="30" cy="35" r="15" fill="none" stroke={colors.voltage} strokeWidth="2" />
            <text x="30" y="39" fill={colors.voltage} fontSize="10" textAnchor="middle">OCV</text>
            <text x="30" y="60" fill={colors.textSecondary} fontSize="9" textAnchor="middle">
              {values.openCircuitVoltage.toFixed(2)}V
            </text>

            {/* Wire */}
            <line x1="45" y1="35" x2="60" y2="35" stroke={colors.textMuted} strokeWidth="2" />

            {/* Resistor symbol */}
            <path d="M60,35 l5,-8 l10,16 l10,-16 l10,16 l10,-16 l5,8" fill="none" stroke={colors.resistance} strokeWidth="2" />
            <text x="85" y="60" fill={colors.resistance} fontSize="9" textAnchor="middle">
              R_int: {(values.internalResistance * 1000).toFixed(0)}mOhm
            </text>

            {/* Wire to terminal */}
            <line x1="110" y1="35" x2="140" y2="35" stroke={colors.textMuted} strokeWidth="2" />

            {/* Terminal voltage */}
            <rect x="140" y="20" width="50" height="30" fill="rgba(34, 197, 94, 0.2)" rx="4" stroke={colors.battery} strokeWidth="2" />
            <text x="165" y="39" fill={colors.battery} fontSize="10" textAnchor="middle">V_term</text>
            <text x="165" y="65" fill={colors.battery} fontSize="11" textAnchor="middle" fontWeight="bold">
              {values.terminalVoltage.toFixed(2)}V
            </text>
          </g>

          {/* Load current display */}
          <g transform="translate(200, 120)">
            <rect x="0" y="0" width="190" height="50" fill="rgba(0,0,0,0.4)" rx="6" />
            <text x="95" y="18" fill={colors.current} fontSize="12" textAnchor="middle" fontWeight="bold">
              Load Current: {loadCurrent.toFixed(1)} A
            </text>
            <text x="95" y="38" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
              Voltage Drop: {values.voltageDrop.toFixed(3)}V ({((values.voltageDrop / values.openCircuitVoltage) * 100).toFixed(1)}%)
            </text>
          </g>

          {/* Power bars */}
          <g transform="translate(30, 200)">
            <text x="0" y="0" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Power Analysis:</text>

            {/* Power delivered bar */}
            <rect x="0" y="15" width="340" height="25" fill="rgba(0,0,0,0.3)" rx="4" />
            <rect
              x="0"
              y="15"
              width={Math.min(340, 340 * (values.powerDelivered / (values.powerDelivered + values.powerWasted + 0.01)))}
              height="25"
              fill={colors.success}
              rx="4"
            />
            <text x="10" y="32" fill={colors.textPrimary} fontSize="10">
              Delivered: {values.powerDelivered.toFixed(2)}W
            </text>

            {/* Power wasted bar */}
            <rect x="0" y="50" width="340" height="25" fill="rgba(0,0,0,0.3)" rx="4" />
            <rect
              x="0"
              y="50"
              width={Math.min(340, 340 * (values.powerWasted / (values.powerDelivered + values.powerWasted + 0.01)))}
              height="25"
              fill={colors.error}
              rx="4"
            />
            <text x="10" y="67" fill={colors.textPrimary} fontSize="10">
              Lost in R_int: {values.powerWasted.toFixed(3)}W (I^2R heat)
            </text>

            {/* Efficiency */}
            <text x="170" y="95" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="bold">
              Efficiency: {values.efficiency.toFixed(1)}%
            </text>
          </g>

          {/* Voltage vs Current graph */}
          <g transform="translate(30, 310)">
            <rect x="0" y="0" width="340" height="80" fill="rgba(0,0,0,0.3)" rx="6" />
            <text x="170" y="15" fill={colors.textPrimary} fontSize="10" textAnchor="middle">Terminal Voltage vs Load Current</text>

            {/* Axes */}
            <line x1="30" y1="70" x2="320" y2="70" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="30" y1="25" x2="30" y2="70" stroke={colors.textMuted} strokeWidth="1" />

            {/* Voltage line (drops with current) */}
            <path
              d={`M30,${25 + 45 * (1 - values.openCircuitVoltage / 4.5)} L320,${25 + 45 * (1 - (values.openCircuitVoltage - 10 * values.internalResistance) / 4.5)}`}
              fill="none"
              stroke={colors.voltage}
              strokeWidth="2"
            />

            {/* Current operating point */}
            <circle
              cx={30 + 290 * (loadCurrent / 10)}
              cy={25 + 45 * (1 - values.terminalVoltage / 4.5)}
              r="6"
              fill={colors.accent}
              stroke="white"
              strokeWidth="2"
              filter="url(#glow)"
            />

            <text x="30" y="78" fill={colors.textMuted} fontSize="8">0A</text>
            <text x="320" y="78" fill={colors.textMuted} fontSize="8">10A</text>
            <text x="20" y="30" fill={colors.textMuted} fontSize="8">V</text>
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
              {isAnimating ? 'Stop Sweep' : 'Sweep Current'}
            </button>
            <button
              onClick={() => { setStateOfCharge(100); setTemperature(25); setLoadCurrent(1); }}
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

  const renderControls = (showTempControl: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Load Current: {loadCurrent.toFixed(1)} A
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={loadCurrent}
          onInput={(e) => setLoadCurrent(parseFloat((e.target as HTMLInputElement).value))}
          onChange={(e) => setLoadCurrent(parseFloat(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Low Load (0.1A)</span>
          <span>High Load (10A)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          State of Charge: {stateOfCharge}%
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={stateOfCharge}
          onInput={(e) => setStateOfCharge(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setStateOfCharge(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Nearly Empty (5%)</span>
          <span>Fully Charged (100%)</span>
        </div>
      </div>

      {showTempControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Battery Temperature: {temperature}C
          </label>
          <input
            type="range"
            min="-20"
            max="50"
            step="5"
            value={temperature}
            onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', height: '32px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
            <span>Freezing (-20C)</span>
            <span>Hot (50C)</span>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.current}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Key Insight
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          Voltage drop = Current x Internal Resistance (V = IR). Higher current or higher resistance means more voltage loss and wasted power as heat inside the battery.
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
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
                Battery Internal Resistance
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                Why do batteries feel weak when cold or nearly empty?
              </p>
            </div>

            {renderVisualization(true)}

            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                background: colors.bgCard,
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                  Every battery has a hidden enemy inside: <strong style={{ color: colors.resistance }}>internal resistance</strong>.
                  This resistance steals voltage and wastes energy as heat, especially when the battery is cold,
                  nearly empty, or under heavy load.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                  Understanding internal resistance explains why your phone dies at 15%, why cars struggle to start in winter,
                  and why fast charging generates so much heat.
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Use the sliders to change load current and state of charge - watch the voltage drop!
                </p>
              </div>
            </div>
          </>
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
                The battery has an internal resistance (R_int) that causes voltage to drop when current flows.
                Open Circuit Voltage (OCV) is the voltage with no load. Terminal voltage is what the device actually sees.
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                What happens when you increase the current draw from a battery?
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
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Internal Resistance</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                See how current and state of charge affect voltage
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
                <li>Set current to 10A and watch the voltage drop dramatically</li>
                <li>Reduce SOC to 10% and notice resistance increases</li>
                <li>Compare efficiency at 1A vs 10A load</li>
                <li>Click "Sweep Current" to see the full range of behavior</li>
              </ul>
            </div>
          </>
        );

      case 'review':
        const wasCorrect = prediction === 'voltage_drops';
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
                Battery voltage <strong>drops when current increases</strong> because of internal resistance.
                The voltage you get at the terminals equals OCV minus the voltage lost across R_internal.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Internal Resistance</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Ohm's Law Inside the Battery:</strong> V_terminal = V_OCV - (I x R_internal).
                  The higher the current, the more voltage is "lost" inside the battery.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Power Loss:</strong> P = I^2R. Power loss scales with the
                  square of current! Double the current = 4x the heat generated inside the battery.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>SOC Effect:</strong> As the battery depletes, chemical
                  reactions slow down, increasing resistance. A nearly empty battery has 2-3x higher resistance.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Why It Matters:</strong> This is why fast charging
                  generates heat (high current), why phones die at 15% under load, and why cold batteries
                  cannot deliver high power.
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
                High-current vs low-current loads
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
                A battery has increased internal resistance due to cold or low charge. You connect
                two different devices: a flashlight (0.5A) and a power drill (5A). Which device
                will reveal the battery's weakness more dramatically?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                Which device reveals internal resistance problems more?
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
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Temperature & Current Effects</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Try cold temperatures with high current draw
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
                Set temperature to -20C and SOC to 20%. Compare voltage at 0.5A (flashlight) vs 5A (power tool).
                The high-current device sees a MUCH larger voltage drop - it might not even work!
              </p>
            </div>
          </>
        );

      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'high_current_better';
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
                <strong>High-current devices reveal internal resistance more dramatically!</strong> The voltage
                drop is proportional to current (V = IR), so a 10x higher current means 10x more voltage drop.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why High Current Exposes Weak Batteries</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Math:</strong> With 200mOhm internal resistance:
                  <br/>- At 0.5A: Voltage drop = 0.1V (barely noticeable)
                  <br/>- At 5A: Voltage drop = 1V (device may not work!)
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Real Example - Car Battery:</strong> A 12V car battery
                  with 100mOhm resistance can light headlights (2A, 0.2V drop) all night, but cannot crank a
                  starter motor (300A, 30V drop!) when cold.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Practical Impact:</strong> This is why battery
                  testing uses high-current "load tests" rather than just measuring voltage. A battery can
                  show 12V at rest but fail completely under load.
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
              Internal resistance affects every battery-powered device
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
                  {testScore >= 8 ? 'You understand battery internal resistance!' : 'Review the material and try again.'}
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
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered battery internal resistance</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Internal resistance causes voltage drop under load (V = IR)</li>
                <li>Power loss scales with current squared (P = I^2R)</li>
                <li>Resistance increases at low state of charge</li>
                <li>Cold temperatures dramatically increase resistance</li>
                <li>High-current loads reveal weak batteries</li>
                <li>Battery Management Systems protect against damage</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Advanced batteries use multiple cells in parallel to reduce effective internal resistance.
                Solid-state batteries promise lower resistance and better cold performance. Understanding
                internal resistance is crucial for designing everything from smartphones to electric aircraft!
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

export default BatteryInternalResistanceRenderer;
