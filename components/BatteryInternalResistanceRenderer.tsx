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
    const width = 700;
    const height = 450;

    // Color based on SOC
    const getBatteryColor = () => {
      if (stateOfCharge > 60) return colors.battery;
      if (stateOfCharge > 30) return colors.batteryMid;
      return colors.batteryLow;
    };

    // Generate electron positions for current flow animation
    const electronCount = Math.floor(loadCurrent * 3);
    const electrons = Array.from({ length: electronCount }, (_, i) => ({
      id: i,
      offset: (i * 100 / electronCount) % 100,
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENTS FOR BATTERY VISUALIZATION === */}

            {/* Lab background gradient */}
            <linearGradient id="birLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium battery casing - metallic effect */}
            <linearGradient id="birBatteryCasing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="20%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Battery terminal positive - gold/brass */}
            <linearGradient id="birTerminalPositive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Battery terminal negative - silver/nickel */}
            <linearGradient id="birTerminalNegative" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Battery electrolyte fill - dynamic based on SOC */}
            <linearGradient id="birElectrolyteFull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#16a34a" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#15803d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="birElectrolyteMid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#d97706" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#b45309" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="birElectrolyteLow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#b91c1c" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.75" />
            </linearGradient>

            {/* Internal resistance heat glow */}
            <radialGradient id="birResistanceHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
            </radialGradient>

            {/* Electron glow - cyan energy */}
            <radialGradient id="birElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Voltage source glow - blue */}
            <radialGradient id="birVoltageGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Wire conductor gradient */}
            <linearGradient id="birWireCopper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2410c" />
              <stop offset="25%" stopColor="#ea580c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Resistor component gradient */}
            <linearGradient id="birResistorBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="20%" stopColor="#92400e" />
              <stop offset="50%" stopColor="#a16207" />
              <stop offset="80%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Temperature gauge gradient - cold to hot */}
            <linearGradient id="birTempGaugeCold" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>

            <linearGradient id="birTempGaugeWarm" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            <linearGradient id="birTempGaugeHot" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* 3D battery inner shadow */}
            <radialGradient id="birBatteryInnerShadow" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Power bar gradients */}
            <linearGradient id="birPowerDelivered" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <linearGradient id="birPowerWasted" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Circuit board pattern */}
            <pattern id="birCircuitPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <path d="M0,10 L5,10 M10,0 L10,5 M15,10 L20,10 M10,15 L10,20" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
              <circle cx="10" cy="10" r="1.5" fill="#334155" fillOpacity="0.3" />
            </pattern>

            {/* === PREMIUM GLOW FILTERS === */}

            {/* Electron blur/glow effect */}
            <filter id="birElectronBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow for terminals */}
            <filter id="birTerminalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat shimmer effect */}
            <filter id="birHeatShimmer" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Voltage drop indicator glow */}
            <filter id="birVoltageDropGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow filter */}
            <filter id="birInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="black" floodOpacity="0.3" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>

            {/* Subtle outer glow */}
            <filter id="birSubtleGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width={width} height={height} fill="url(#birLabBg)" />
          <rect width={width} height={height} fill="url(#birCircuitPattern)" opacity="0.3" />

          {/* === PREMIUM 3D BATTERY CELL === */}
          <g transform="translate(30, 40)">
            {/* Battery outer casing with metallic effect */}
            <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#birBatteryCasing)" stroke="#64748b" strokeWidth="2" />

            {/* Inner shadow for depth */}
            <rect x="6" y="6" width="108" height="168" rx="8" fill="#0f172a" />
            <rect x="6" y="6" width="108" height="168" rx="8" fill="url(#birBatteryInnerShadow)" />

            {/* Positive terminal (top) */}
            <rect x="40" y="-15" width="40" height="20" rx="4" fill="url(#birTerminalPositive)" filter="url(#birTerminalGlow)" />
            <text x="60" y="-2" fill="#78350f" fontSize="10" fontWeight="bold" textAnchor="middle">+</text>

            {/* Negative terminal (bottom) */}
            <rect x="40" y="175" width="40" height="15" rx="4" fill="url(#birTerminalNegative)" />
            <text x="60" y="186" fill="#334155" fontSize="10" fontWeight="bold" textAnchor="middle">-</text>

            {/* Electrolyte fill with dynamic color based on SOC */}
            <rect
              x="12"
              y={12 + 156 * (1 - stateOfCharge / 100)}
              width="96"
              height={156 * (stateOfCharge / 100)}
              rx="6"
              fill={stateOfCharge > 60 ? 'url(#birElectrolyteFull)' : stateOfCharge > 30 ? 'url(#birElectrolyteMid)' : 'url(#birElectrolyteLow)'}
            >
              {/* Subtle animation for electrolyte */}
              <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite" />
            </rect>

            {/* Battery level markers */}
            {[25, 50, 75].map((level) => (
              <line key={level} x1="8" y1={12 + 156 * (1 - level / 100)} x2="112" y2={12 + 156 * (1 - level / 100)} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 2" />
            ))}

            {/* SOC percentage display */}
            <rect x="30" y="75" width="60" height="30" rx="6" fill="rgba(0,0,0,0.7)" />
            <text x="60" y="95" fill={getBatteryColor()} fontSize="18" fontWeight="bold" textAnchor="middle">{stateOfCharge}%</text>

            {/* Internal resistance visualization - heat glow when resistance is high */}
            {values.internalResistance > 0.08 && (
              <ellipse cx="60" cy="90" rx={30 + values.internalResistance * 200} ry={20 + values.internalResistance * 100} fill="url(#birResistanceHeat)" filter="url(#birHeatShimmer)">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* Battery label */}
            <text x="60" y="220" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">Li-ion Cell</text>
            <text x="60" y="235" fill={colors.textMuted} fontSize="9" textAnchor="middle">Nominal 3.7V</text>
          </g>

          {/* === TEMPERATURE GAUGE === */}
          <g transform="translate(170, 50)">
            {/* Gauge housing */}
            <rect x="-5" y="-10" width="45" height="130" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />

            {/* Thermometer tube */}
            <rect x="10" y="0" width="15" height="90" rx="7" fill="#0f172a" stroke="#475569" strokeWidth="1" />

            {/* Mercury/fill */}
            <rect
              x="12"
              y={2 + 76 * (1 - (temperature + 20) / 80)}
              width="11"
              height={76 * ((temperature + 20) / 80)}
              rx="5"
              fill={temperature < 10 ? 'url(#birTempGaugeCold)' : temperature > 35 ? 'url(#birTempGaugeHot)' : 'url(#birTempGaugeWarm)'}
            />

            {/* Bulb at bottom */}
            <circle cx="17.5" cy="95" r="12" fill={temperature < 10 ? '#0ea5e9' : temperature > 35 ? '#ef4444' : '#f59e0b'} filter="url(#birSubtleGlow)" />

            {/* Temperature markings */}
            <text x="32" y="8" fill={colors.textMuted} fontSize="8">50C</text>
            <text x="32" y="35" fill={colors.textMuted} fontSize="8">25C</text>
            <text x="32" y="62" fill={colors.textMuted} fontSize="8">0C</text>
            <text x="32" y="88" fill={colors.textMuted} fontSize="8">-20C</text>

            {/* Current temperature display */}
            <rect x="0" y="112" width="35" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
            <text x="17.5" y="125" fill={temperature < 10 ? '#38bdf8' : temperature > 35 ? '#f87171' : '#fbbf24'} fontSize="12" fontWeight="bold" textAnchor="middle">{temperature}C</text>
          </g>

          {/* === INTERNAL CIRCUIT DIAGRAM === */}
          <g transform="translate(240, 30)">
            <text x="0" y="0" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Internal Circuit Model</text>

            {/* OCV (Open Circuit Voltage) source */}
            <g transform="translate(30, 30)">
              <circle cx="0" cy="30" r="25" fill="none" stroke="url(#birVoltageGlow)" strokeWidth="3" filter="url(#birSubtleGlow)" />
              <circle cx="0" cy="30" r="22" fill="#1e293b" />
              <text x="0" y="25" fill={colors.voltage} fontSize="9" textAnchor="middle" fontWeight="bold">OCV</text>
              <text x="0" y="38" fill={colors.voltage} fontSize="11" textAnchor="middle" fontWeight="bold">
                {values.openCircuitVoltage.toFixed(2)}V
              </text>
              <line x1="-10" y1="15" x2="10" y2="15" stroke={colors.voltage} strokeWidth="2" />
              <line x1="0" y1="10" x2="0" y2="20" stroke={colors.voltage} strokeWidth="2" />
            </g>

            {/* Wire from OCV to resistor */}
            <line x1="55" y1="60" x2="90" y2="60" stroke="url(#birWireCopper)" strokeWidth="4" />

            {/* Current flow electrons on wire */}
            {loadCurrent > 0 && electrons.slice(0, Math.min(3, electrons.length)).map((e) => (
              <circle
                key={`wire1-${e.id}`}
                cx={55 + (35 * ((e.offset + (Date.now() / 50)) % 100) / 100)}
                cy="60"
                r="3"
                fill="url(#birElectronGlow)"
                filter="url(#birElectronBlur)"
              >
                <animate attributeName="cx" from="55" to="90" dur={`${0.5 / Math.max(0.1, loadCurrent)}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Internal Resistance (R_int) */}
            <g transform="translate(90, 45)">
              <rect x="0" y="0" width="80" height="30" rx="4" fill="url(#birResistorBody)" stroke="#92400e" strokeWidth="1" />

              {/* Zigzag resistor symbol */}
              <path d="M5,15 l8,-10 l12,20 l12,-20 l12,20 l12,-20 l12,20 l7,-10" fill="none" stroke="#fcd34d" strokeWidth="2" />

              {/* Heat glow based on power loss */}
              {values.powerWasted > 0.1 && (
                <ellipse cx="40" cy="15" rx={20 + values.powerWasted * 10} ry={10 + values.powerWasted * 5} fill="url(#birResistanceHeat)" opacity={Math.min(0.8, values.powerWasted / 2)}>
                  <animate attributeName="opacity" values={`${Math.min(0.3, values.powerWasted / 4)};${Math.min(0.6, values.powerWasted / 2)};${Math.min(0.3, values.powerWasted / 4)}`} dur="0.8s" repeatCount="indefinite" />
                </ellipse>
              )}
            </g>

            {/* R_int label and value */}
            <text x="130" y="95" fill={colors.resistance} fontSize="10" textAnchor="middle" fontWeight="bold">R_int</text>
            <text x="130" y="110" fill={colors.resistance} fontSize="12" textAnchor="middle" fontWeight="bold">
              {(values.internalResistance * 1000).toFixed(0)} mΩ
            </text>

            {/* Wire from resistor to terminal */}
            <line x1="170" y1="60" x2="210" y2="60" stroke="url(#birWireCopper)" strokeWidth="4" />

            {/* Current flow electrons */}
            {loadCurrent > 0 && electrons.slice(0, Math.min(3, electrons.length)).map((e) => (
              <circle
                key={`wire2-${e.id}`}
                cx="190"
                cy="60"
                r="3"
                fill="url(#birElectronGlow)"
                filter="url(#birElectronBlur)"
              >
                <animate attributeName="cx" from="170" to="210" dur={`${0.5 / Math.max(0.1, loadCurrent)}s`} repeatCount="indefinite" begin={`${e.offset / 100}s`} />
              </circle>
            ))}

            {/* Terminal Voltage output */}
            <g transform="translate(210, 35)">
              <rect x="0" y="0" width="80" height="50" rx="8" fill="rgba(34, 197, 94, 0.15)" stroke={colors.battery} strokeWidth="2" filter="url(#birSubtleGlow)" />
              <text x="40" y="18" fill={colors.battery} fontSize="10" textAnchor="middle" fontWeight="bold">V_terminal</text>
              <text x="40" y="38" fill={colors.battery} fontSize="16" textAnchor="middle" fontWeight="bold">
                {values.terminalVoltage.toFixed(2)}V
              </text>
            </g>

            {/* === VOLTAGE DROP VISUALIZATION === */}
            <g transform="translate(30, 130)">
              <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Voltage Drop Visualization</text>

              {/* Voltage bar background */}
              <rect x="0" y="10" width="260" height="25" rx="4" fill="rgba(0,0,0,0.4)" />

              {/* OCV section (full voltage) */}
              <rect x="0" y="10" width={260 * (values.terminalVoltage / values.openCircuitVoltage)} height="25" rx="4" fill={colors.battery} />

              {/* Voltage drop section (lost voltage) */}
              <rect x={260 * (values.terminalVoltage / values.openCircuitVoltage)} y="10" width={260 * (values.voltageDrop / values.openCircuitVoltage)} height="25" rx="0" fill={colors.error} filter="url(#birVoltageDropGlow)">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
              </rect>

              {/* Labels */}
              <text x="5" y="27" fill={colors.textPrimary} fontSize="9" fontWeight="bold">V_term: {values.terminalVoltage.toFixed(2)}V</text>
              <text x={Math.max(260 * (values.terminalVoltage / values.openCircuitVoltage) + 5, 180)} y="27" fill={colors.textPrimary} fontSize="8">
                Drop: {values.voltageDrop.toFixed(3)}V
              </text>

              {/* Percentage indicator */}
              <text x="130" y="50" fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="bold">
                {((values.voltageDrop / values.openCircuitVoltage) * 100).toFixed(1)}% voltage lost to internal resistance
              </text>
            </g>
          </g>

          {/* === CURRENT FLOW INDICATOR === */}
          <g transform="translate(240, 220)">
            <rect x="0" y="0" width="200" height="55" rx="8" fill="rgba(0,0,0,0.5)" stroke={colors.current} strokeWidth="1" />
            <text x="100" y="18" fill={colors.current} fontSize="12" textAnchor="middle" fontWeight="bold">
              Load Current
            </text>
            <text x="100" y="42" fill={colors.current} fontSize="20" textAnchor="middle" fontWeight="bold">
              {loadCurrent.toFixed(1)} A
            </text>

            {/* Animated electron flow indicator */}
            <g transform="translate(160, 28)">
              {[0, 1, 2].map((i) => (
                <circle
                  key={`indicator-${i}`}
                  cx={i * 12}
                  cy="0"
                  r="4"
                  fill="url(#birElectronGlow)"
                  filter="url(#birElectronBlur)"
                >
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>
          </g>

          {/* === POWER ANALYSIS BARS === */}
          <g transform="translate(30, 290)">
            <text x="0" y="0" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Power Analysis</text>

            {/* Power delivered bar */}
            <rect x="0" y="15" width="300" height="28" rx="6" fill="rgba(0,0,0,0.4)" />
            <rect
              x="0"
              y="15"
              width={Math.min(300, 300 * (values.powerDelivered / (values.powerDelivered + values.powerWasted + 0.01)))}
              height="28"
              rx="6"
              fill="url(#birPowerDelivered)"
            />
            <text x="10" y="34" fill={colors.textPrimary} fontSize="11" fontWeight="600">
              Delivered to Load: {values.powerDelivered.toFixed(2)}W
            </text>

            {/* Power wasted bar */}
            <rect x="0" y="50" width="300" height="28" rx="6" fill="rgba(0,0,0,0.4)" />
            <rect
              x="0"
              y="50"
              width={Math.min(300, 300 * (values.powerWasted / (values.powerDelivered + values.powerWasted + 0.01)))}
              height="28"
              rx="6"
              fill="url(#birPowerWasted)"
            >
              {values.powerWasted > 0.1 && (
                <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />
              )}
            </rect>
            <text x="10" y="69" fill={colors.textPrimary} fontSize="11" fontWeight="600">
              Lost as Heat (I²R): {values.powerWasted.toFixed(3)}W
            </text>

            {/* Efficiency display */}
            <rect x="310" y="15" width="80" height="63" rx="8" fill="rgba(245, 158, 11, 0.15)" stroke={colors.accent} strokeWidth="1" />
            <text x="350" y="38" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Efficiency</text>
            <text x="350" y="60" fill={colors.accent} fontSize="18" textAnchor="middle" fontWeight="bold">
              {values.efficiency.toFixed(1)}%
            </text>
          </g>

          {/* === VOLTAGE VS CURRENT GRAPH === */}
          <g transform="translate(420, 290)">
            <rect x="0" y="0" width="260" height="140" rx="8" fill="rgba(0,0,0,0.4)" stroke="#334155" strokeWidth="1" />
            <text x="130" y="18" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="bold">Terminal Voltage vs Load Current</text>

            {/* Graph area */}
            <g transform="translate(35, 30)">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={`hgrid-${i}`} x1="0" y1={i * 22} x2="200" y2={i * 22} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={`vgrid-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="88" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" />
              ))}

              {/* Axes */}
              <line x1="0" y1="88" x2="200" y2="88" stroke={colors.textMuted} strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="88" stroke={colors.textMuted} strokeWidth="1.5" />

              {/* Voltage line (drops with current) */}
              <path
                d={`M0,${88 - 88 * (values.openCircuitVoltage / 4.5)} L200,${88 - 88 * ((values.openCircuitVoltage - 10 * values.internalResistance) / 4.5)}`}
                fill="none"
                stroke={colors.voltage}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Current operating point */}
              <circle
                cx={200 * (loadCurrent / 10)}
                cy={88 - 88 * (values.terminalVoltage / 4.5)}
                r="8"
                fill={colors.accent}
                stroke="white"
                strokeWidth="2"
                filter="url(#birTerminalGlow)"
              >
                <animate attributeName="r" values="7;9;7" dur="1.5s" repeatCount="indefinite" />
              </circle>

              {/* Axis labels */}
              <text x="100" y="105" fill={colors.textMuted} fontSize="9" textAnchor="middle">Current (A)</text>
              <text x="-12" y="44" fill={colors.textMuted} fontSize="9" textAnchor="middle" transform="rotate(-90, -12, 44)">Voltage (V)</text>

              {/* Scale labels */}
              <text x="0" y="100" fill={colors.textMuted} fontSize="8" textAnchor="middle">0</text>
              <text x="100" y="100" fill={colors.textMuted} fontSize="8" textAnchor="middle">5</text>
              <text x="200" y="100" fill={colors.textMuted} fontSize="8" textAnchor="middle">10</text>
              <text x="-8" y="88" fill={colors.textMuted} fontSize="8" textAnchor="end">0</text>
              <text x="-8" y="44" fill={colors.textMuted} fontSize="8" textAnchor="end">2.25</text>
              <text x="-8" y="4" fill={colors.textMuted} fontSize="8" textAnchor="end">4.5</text>
            </g>
          </g>

          {/* Formula reference */}
          <g transform="translate(450, 230)">
            <rect x="0" y="0" width="230" height="50" rx="6" fill="rgba(168, 85, 247, 0.1)" stroke={colors.current} strokeWidth="1" />
            <text x="115" y="18" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Key Equations:</text>
            <text x="115" y="35" fill={colors.current} fontSize="11" textAnchor="middle" fontWeight="bold">
              V_term = OCV - (I × R_int)  |  P_loss = I²R
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239,68,68,0.3)' : '0 4px 15px rgba(34,197,94,0.3)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Current Sweep' : 'Sweep Current (0-10A)'}
            </button>
            <button
              onClick={() => { setStateOfCharge(100); setTemperature(25); setLoadCurrent(1); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset All
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
