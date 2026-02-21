import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// Game event interface for AI coach integration
interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface LeakagePowerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
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
  textPrimary: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148, 163, 184, 0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dynamic: '#3b82f6',
  static: '#ef4444',
  clock: '#8b5cf6',
  memory: '#06b6d4',
  temperature: '#f97316',
};

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const LeakagePowerRenderer: React.FC<LeakagePowerRendererProps> = ({
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
    twist_review: 'Deep Insight',
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
  const { isMobile } = useViewport();
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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
  const [voltage, setVoltage] = useState(1.0); // Supply voltage in V
  const [frequency, setFrequency] = useState(2.0); // Clock frequency in GHz
  const [temperature, setTemperature] = useState(45); // Temperature in Celsius
  const [processNode, setProcessNode] = useState(7); // Process node in nm
  const [loadPercent, setLoadPercent] = useState(0); // CPU load 0-100%
  const [clockGating, setClockGating] = useState(false);
  const [powerGating, setPowerGating] = useState(false);
  const [dvfs, setDvfs] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculatePower = useCallback(() => {
    // Dynamic power: P_dynamic = alpha * C * V^2 * f
    // alpha = activity factor (proportional to load)
    const activityFactor = 0.1 + (loadPercent / 100) * 0.4; // 0.1 at idle, 0.5 at full load
    const capacitance = 10e-9; // Base capacitance in F (normalized)
    const dynamicPower = activityFactor * capacitance * Math.pow(voltage, 2) * frequency * 1e9;

    // Static/Leakage power: P_leakage = I_leak * V
    // Leakage current increases exponentially with temperature and decreases with process node
    const baseLeakage = 0.001; // Base leakage in A
    const tempFactor = Math.exp((temperature - 25) / 20); // Doubles every ~20C
    const nodeFactor = Math.pow(7 / processNode, 1.5); // Smaller nodes = more leakage
    const leakageCurrent = baseLeakage * tempFactor * nodeFactor;
    let leakagePower = leakageCurrent * voltage;

    // Apply power saving modes
    let clockPower = 0;
    let memoryRefreshPower = 0;
    let effectiveDynamicPower = dynamicPower;

    // Clock tree power (always active unless clock gating)
    clockPower = 0.5 * capacitance * Math.pow(voltage, 2) * frequency * 1e9;

    // Memory refresh (always needed)
    memoryRefreshPower = 0.3 * voltage; // Constant memory refresh

    // Apply clock gating - reduces dynamic power when idle
    if (clockGating && loadPercent < 50) {
      effectiveDynamicPower *= 0.3;
      clockPower *= 0.2;
    }

    // Apply power gating - reduces leakage by turning off unused blocks
    if (powerGating && loadPercent < 30) {
      leakagePower *= 0.1;
    }

    // Apply DVFS - reduces voltage and frequency at low loads
    let effectiveVoltage = voltage;
    let effectiveFrequency = frequency;
    if (dvfs && loadPercent < 60) {
      const scaleFactor = 0.6 + (loadPercent / 100) * 0.4;
      effectiveVoltage = voltage * scaleFactor;
      effectiveFrequency = frequency * scaleFactor;
      effectiveDynamicPower = activityFactor * capacitance * Math.pow(effectiveVoltage, 2) * effectiveFrequency * 1e9;
      clockPower = 0.5 * capacitance * Math.pow(effectiveVoltage, 2) * effectiveFrequency * 1e9;
      leakagePower *= scaleFactor; // Lower voltage also reduces leakage slightly
    }

    const totalPower = effectiveDynamicPower + leakagePower + clockPower + memoryRefreshPower;

    // Calculate temperature rise from power
    const thermalResistance = 0.5; // C/W
    const ambientTemp = 25;
    const junctionTemp = ambientTemp + totalPower * thermalResistance * 1000;

    // Battery drain calculation (assuming 50Wh battery)
    const batteryCapacity = 50; // Wh
    const batteryLife = batteryCapacity / totalPower;

    return {
      dynamicPower: effectiveDynamicPower * 1000, // Convert to mW
      leakagePower: leakagePower * 1000,
      clockPower: clockPower * 1000,
      memoryPower: memoryRefreshPower * 1000,
      totalPower: totalPower * 1000,
      junctionTemp: Math.min(100, junctionTemp),
      batteryLife: Math.min(48, batteryLife),
      leakagePercent: (leakagePower / totalPower) * 100,
      effectiveVoltage,
      effectiveFrequency,
    };
  }, [voltage, frequency, temperature, processNode, loadPercent, clockGating, powerGating, dvfs]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Auto-start animation in play phases
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      setIsAnimating(true);
    }
  }, [phase]);

  const power = calculatePower();

  const predictions = [
    { id: 'zero', label: 'Power should drop to nearly zero when idle - nothing is computing' },
    { id: 'low', label: 'Power drops significantly but some is needed for memory and I/O' },
    { id: 'substantial', label: 'Substantial power is always consumed due to leakage currents' },
    { id: 'same', label: 'Power stays the same - the chip is always ready to compute' },
  ];

  const twistPredictions = [
    { id: 'clock_gating', label: 'Clock gating is most effective - it stops all unnecessary switching' },
    { id: 'power_gating', label: 'Power gating is most effective - it cuts off power to unused blocks' },
    { id: 'dvfs', label: 'DVFS is most effective - voltage reduction has quadratic effect on power' },
    { id: 'all_equal', label: 'All techniques are equally effective' },
  ];

  const transferApplications = [
    {
      title: 'Smartphone Standby',
      description: 'Your phone lasts days on standby but only hours during active use. The SoC must balance responsiveness with power savings.',
      question: 'Why does your phone still get warm in your pocket even when you are not using it?',
      answer: 'Leakage currents flow continuously through billions of transistors, even when idle. Background tasks, push notifications, memory refresh, and cellular modem also consume power. Power gating helps by completely disconnecting unused blocks.',
    },
    {
      title: 'Data Center Efficiency',
      description: 'Data centers spend nearly as much on cooling as on computing. Server idle power is a major cost factor.',
      question: 'Why do data centers care so much about idle power when servers are supposedly always busy?',
      answer: 'Even "busy" servers rarely hit 100% utilization. Average utilization is often 20-40%. At 30% load, idle power (leakage + memory refresh + fans) can be 50%+ of total power. This is why PUE (Power Usage Effectiveness) targets are so important.',
    },
    {
      title: 'Laptop Battery Life',
      description: 'Modern laptops can last 10+ hours on battery, but running intensive tasks drains the battery in 2-3 hours.',
      question: 'How does Intel/AMD achieve such long battery life despite having high-performance CPUs?',
      answer: 'Aggressive power management combines clock gating, power gating, and DVFS. At idle, the CPU runs at low voltage (0.5V) and frequency (400MHz). Unused cores are completely power gated. The "turbo" capability only activates briefly when needed.',
    },
    {
      title: 'Wearable Devices',
      description: 'Smartwatches and fitness trackers must run for days on tiny batteries, yet still respond instantly to user input.',
      question: 'How can a smartwatch with a 300mAh battery last multiple days?',
      answer: 'Ultra-low-power processors use aggressive power gating - most of the chip is OFF most of the time. Only essential functions (RTC, accelerometer, touch controller) stay powered. The main processor wakes only briefly to handle events, spending 99%+ of time in deep sleep.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes leakage power in modern transistors?',
      options: [
        { text: 'Resistance in the wires connecting transistors', correct: false },
        { text: 'Current flowing through transistors even when they are "off"', correct: true },
        { text: 'Heat generated by the switching action', correct: false },
        { text: 'Electromagnetic interference between adjacent transistors', correct: false },
      ],
    },
    {
      question: 'Dynamic power consumption is proportional to:',
      options: [
        { text: 'Voltage (V)', correct: false },
        { text: 'Voltage squared (V^2)', correct: true },
        { text: 'Voltage cubed (V^3)', correct: false },
        { text: 'The square root of voltage', correct: false },
      ],
    },
    {
      question: 'What happens to leakage power as temperature increases?',
      options: [
        { text: 'It decreases linearly', correct: false },
        { text: 'It stays constant', correct: false },
        { text: 'It increases exponentially', correct: true },
        { text: 'It first increases then decreases', correct: false },
      ],
    },
    {
      question: 'Clock gating primarily reduces which type of power?',
      options: [
        { text: 'Leakage power in the logic gates', correct: false },
        { text: 'Dynamic power from clock distribution and idle circuits', correct: true },
        { text: 'Memory refresh power', correct: false },
        { text: 'I/O power consumption', correct: false },
      ],
    },
    {
      question: 'Power gating is effective because:',
      options: [
        { text: 'It reduces clock frequency', correct: false },
        { text: 'It lowers the supply voltage', correct: false },
        { text: 'It completely disconnects power to unused circuit blocks', correct: true },
        { text: 'It increases transistor threshold voltage', correct: false },
      ],
    },
    {
      question: 'Why is DVFS (Dynamic Voltage and Frequency Scaling) so effective?',
      options: [
        { text: 'Frequency reduction alone dramatically cuts power', correct: false },
        { text: 'Lower voltage allows faster switching', correct: false },
        { text: 'Power has quadratic dependence on voltage, so small reductions help a lot', correct: true },
        { text: 'It eliminates leakage current entirely', correct: false },
      ],
    },
    {
      question: 'At smaller process nodes (e.g., 5nm vs 28nm), leakage power:',
      options: [
        { text: 'Decreases due to smaller transistors', correct: false },
        { text: 'Stays roughly the same', correct: false },
        { text: 'Increases because transistors are harder to turn fully off', correct: true },
        { text: 'Becomes negligible compared to dynamic power', correct: false },
      ],
    },
    {
      question: 'What is a "dark silicon" problem?',
      options: [
        { text: 'Transistors that absorb light and generate noise', correct: false },
        { text: 'Having to keep parts of a chip powered off because total power would be too high', correct: true },
        { text: 'Manufacturing defects that leave transistors non-functional', correct: false },
        { text: 'Interference between adjacent dark-colored components', correct: false },
      ],
    },
    {
      question: 'Memory refresh consumes idle power because:',
      options: [
        { text: 'DRAM capacitors leak charge and must be periodically refreshed', correct: true },
        { text: 'Memory controllers constantly check for errors', correct: false },
        { text: 'Cache lines are continuously being written back', correct: false },
        { text: 'Memory bus is always active for DMA operations', correct: false },
      ],
    },
    {
      question: 'A chip at 50% load typically uses what fraction of its max power?',
      options: [
        { text: 'About 25% (linear relationship)', correct: false },
        { text: 'About 50% (linear relationship)', correct: false },
        { text: 'About 60-70% (due to idle power overhead)', correct: true },
        { text: 'About 90% (power is mostly constant)', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    playSound('click');
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
    emitGameEvent('game_completed', { score: score, total: testQuestions.length });
    playSound(score >= 7 ? 'success' : 'error');
    emitGameEvent('completion', { score, total: 10 });
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
        padding: '12px 16px',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        backgroundColor: colors.bgDark,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
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

  // Navigation dots component
  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
      }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={phaseLabels[p]}
            style={{
              width: '44px',
              height: '44px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <span style={{
              width: i === currentIdx ? '24px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              display: 'block',
              transition: 'all 0.3s ease',
            }} />
          </button>
        ))}
      </div>
    );
  };

  // Bottom bar with navigation
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.2s ease',
          }}
          disabled={!canBack}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 400 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canProceed ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.4,
            boxShadow: canProceed ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Wrapper for phase content
  const wrapPhaseContent = (content: React.ReactNode, bottomBarContent?: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: colors.bgPrimary, color: colors.textPrimary, display: 'flex', flexDirection: 'column', fontWeight: 400 }}>
      <div style={{ flexShrink: 0 }}>{renderProgressBar()}</div>
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: '56px', paddingBottom: '16px' }}>
        {content}
      </div>
      {bottomBarContent && <div style={{ flexShrink: 0 }}>{bottomBarContent}</div>}
    </div>
  );

  // Power breakdown visualization
  const renderPowerVisualization = () => {
    const maxBarWidth = 260;
    const normalizedDynamic = (power.dynamicPower / power.totalPower) * maxBarWidth;
    const normalizedLeakage = (power.leakagePower / power.totalPower) * maxBarWidth;
    const normalizedClock = (power.clockPower / power.totalPower) * maxBarWidth;
    const normalizedMemory = (power.memoryPower / power.totalPower) * maxBarWidth;

    // Animated transistor leakage visualization
    const leakageParticles = Array.from({ length: 8 }, (_, i) => ({
      x: 55 + Math.sin((animationTime + i * 45) * Math.PI / 180) * 20,
      y: 60 + (animationTime + i * 20) % 60 - 30,
      opacity: 0.3 + Math.sin((animationTime + i * 30) * Math.PI / 180) * 0.3,
    }));

    return (
      <svg width="100%" height={isMobile ? '380' : '420'} viewBox="0 0 500 420" style={{ maxWidth: '600px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Leakage Power visualization">
        <defs>
          <linearGradient id="lp-dynamicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.dynamic} />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="lp-staticGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.static} />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="lp-tempGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="lp-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lp-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="420" fill="#0f172a" rx="12" />

        {/* Grid lines layer */}
        <g id="lp-grid">
          <line x1="20" y1="210" x2="480" y2="210" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
          <line x1="20" y1="285" x2="480" y2="285" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
          <line x1="140" y1="40" x2="140" y2="290" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
          <line x1="420" y1="40" x2="420" y2="290" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
        </g>

        {/* Title */}
        <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
          Power Breakdown at {loadPercent}% Load
        </text>

        {/* Chip visualization with leakage */}
        <g id="lp-chip">
          <rect x="20" y="40" width="110" height="95" fill="#1e293b" rx="8" stroke="#475569" strokeWidth="2" />
          <text x="75" y="57" fill="#e2e8f0" fontSize="11" textAnchor="middle">CPU Die</text>
          <rect x="35" y="63" width="80" height="36" fill="#334155" rx="4" />
          <text x="75" y="86" fill="#f8fafc" fontSize="11" textAnchor="middle">Transistors</text>
          {leakageParticles.map((p, i) => (
            <circle key={i} cx={20 + p.x} cy={40 + p.y} r="3" fill={colors.static} opacity={p.opacity} filter="url(#lp-glow)" />
          ))}
          <path d="M 75 100 L 75 125" stroke={colors.static} strokeWidth="2" strokeDasharray="4,2" />
          <text x="75" y="141" fill={colors.static} fontSize="11" textAnchor="middle" fontWeight="bold">Leakage</text>
        </g>

        {/* Power bars section label */}
        <text x="145" y="55" fill="#e2e8f0" fontSize="12" fontWeight="bold">Power Components (mW)</text>

        {/* Dynamic Power bar */}
        <rect x="145" y="62" width={maxBarWidth} height="22" fill="#1e293b" rx="4" />
        <rect x="145" y="62" width={normalizedDynamic} height="22" fill="url(#lp-dynamicGrad)" rx="4" filter="url(#lp-glow)" />
        <text x="151" y="78" fill="#f8fafc" fontSize="11">Dynamic</text>
        <text x={145 + maxBarWidth + 8} y="78" fill={colors.dynamic} fontSize="11" fontWeight="bold">{power.dynamicPower.toFixed(1)}</text>

        {/* Leakage Power bar */}
        <rect x="145" y="92" width={maxBarWidth} height="22" fill="#1e293b" rx="4" />
        <rect x="145" y="92" width={normalizedLeakage} height="22" fill="url(#lp-staticGrad)" rx="4" filter="url(#lp-glow)" />
        <text x="151" y="108" fill="#f8fafc" fontSize="11">Leakage</text>
        <text x={145 + maxBarWidth + 8} y="108" fill={colors.static} fontSize="11" fontWeight="bold">{power.leakagePower.toFixed(1)}</text>

        {/* Clock Power bar */}
        <rect x="145" y="122" width={maxBarWidth} height="22" fill="#1e293b" rx="4" />
        <rect x="145" y="122" width={normalizedClock} height="22" fill={colors.clock} rx="4" />
        <text x="151" y="138" fill="#f8fafc" fontSize="11">Clock Tree</text>
        <text x={145 + maxBarWidth + 8} y="138" fill={colors.clock} fontSize="11" fontWeight="bold">{power.clockPower.toFixed(1)}</text>

        {/* Memory Refresh bar */}
        <rect x="145" y="152" width={maxBarWidth} height="22" fill="#1e293b" rx="4" />
        <rect x="145" y="152" width={normalizedMemory} height="22" fill={colors.memory} rx="4" />
        <text x="151" y="168" fill="#f8fafc" fontSize="11">Memory</text>
        <text x={145 + maxBarWidth + 8} y="168" fill={colors.memory} fontSize="11" fontWeight="bold">{power.memoryPower.toFixed(1)}</text>

        {/* Temperature Gauge */}
        <text x="72" y="165" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">Temperature</text>
        <rect x="54" y="176" width="36" height="70" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
        <rect
          x="54"
          y={176 + 70 - (power.junctionTemp / 100) * 70}
          width="36"
          height={(power.junctionTemp / 100) * 70}
          fill="url(#lp-tempGrad)"
          rx="4"
        />
        <text x="72" y="262" fill={colors.temperature} fontSize="13" fontWeight="bold" textAnchor="middle">
          {power.junctionTemp.toFixed(0)}°C
        </text>

        {/* Summary Stats - highlighted with glow */}
        <rect x="145" y="193" width="340" height="78" fill="rgba(30, 41, 59, 0.9)" rx="8" stroke={colors.accent} strokeWidth="1" filter="url(#lp-shadow)" />
        <text x="161" y="212" fill="#e2e8f0" fontSize="11">Total Power</text>
        <text x="161" y="234" fill="#f8fafc" fontSize="16" fontWeight="bold" filter="url(#lp-glow)">{power.totalPower.toFixed(1)} mW</text>
        <text x="291" y="212" fill="#e2e8f0" fontSize="11">Leakage %</text>
        <text x="291" y="234" fill={colors.static} fontSize="16" fontWeight="bold">{power.leakagePercent.toFixed(1)}%</text>
        <text x="401" y="212" fill="#e2e8f0" fontSize="11">Battery</text>
        <text x="401" y="234" fill={colors.success} fontSize="16" fontWeight="bold">{power.batteryLife.toFixed(1)}h</text>

        {/* Power Equation */}
        <rect x="20" y="290" width="460" height="52" fill="rgba(59, 130, 246, 0.1)" rx="8" />
        <text x="250" y="312" fill={colors.dynamic} fontSize="11" textAnchor="middle" fontWeight="bold">
          Dynamic: P = alpha × C × V² × f
        </text>
        <text x="250" y="332" fill={colors.static} fontSize="11" textAnchor="middle" fontWeight="bold">
          Static: P = I_leak × V (temperature-dependent)
        </text>

        {/* Power Saving Mode Indicators */}
        <rect x="20" y="355" width="140" height="32" fill={clockGating ? 'rgba(16, 185, 129, 0.2)' : 'rgba(71, 85, 105, 0.3)'} rx="6" stroke={clockGating ? colors.success : '#475569'} strokeWidth="1" />
        <text x="90" y="375" fill={clockGating ? colors.success : '#e2e8f0'} fontSize="11" textAnchor="middle">
          Clock: {clockGating ? 'ON' : 'OFF'}
        </text>
        <rect x="170" y="355" width="140" height="32" fill={powerGating ? 'rgba(16, 185, 129, 0.2)' : 'rgba(71, 85, 105, 0.3)'} rx="6" stroke={powerGating ? colors.success : '#475569'} strokeWidth="1" />
        <text x="240" y="375" fill={powerGating ? colors.success : '#e2e8f0'} fontSize="11" textAnchor="middle">
          Power Gate: {powerGating ? 'ON' : 'OFF'}
        </text>
        <rect x="320" y="355" width="140" height="32" fill={dvfs ? 'rgba(16, 185, 129, 0.2)' : 'rgba(71, 85, 105, 0.3)'} rx="6" stroke={dvfs ? colors.success : '#475569'} strokeWidth="1" />
        <text x="390" y="375" fill={dvfs ? colors.success : '#e2e8f0'} fontSize="11" textAnchor="middle">
          DVFS: {dvfs ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  // Controls for simulation
  const renderControls = () => (
    <div style={{ padding: isMobile ? typo.pagePadding : '0', display: 'flex', flexDirection: 'column', gap: isMobile ? typo.sectionGap : '12px', maxWidth: isMobile ? '500px' : 'none', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          CPU Load: {loadPercent}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={loadPercent}
          onChange={(e) => setLoadPercent(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Supply Voltage: {voltage.toFixed(2)}V
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value={voltage}
          onChange={(e) => setVoltage(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.dynamic, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Clock Frequency: {frequency.toFixed(1)} GHz
        </label>
        <input
          type="range"
          min="0.5"
          max="5.0"
          step="0.1"
          value={frequency}
          onChange={(e) => setFrequency(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.clock, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Ambient Temperature: {temperature}C
        </label>
        <input
          type="range"
          min="20"
          max="80"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.temperature, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Process Node: {processNode}nm
        </label>
        <input
          type="range"
          min="3"
          max="28"
          step="1"
          value={processNode}
          onChange={(e) => setProcessNode(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>
    </div>
  );

  // Power saving mode controls
  const renderPowerSavingControls = () => (
    <div style={{ padding: isMobile ? typo.pagePadding : '0', display: 'flex', flexDirection: 'column', gap: isMobile ? typo.elementGap : '8px', maxWidth: isMobile ? '500px' : 'none', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '12px' : '6px' }}>
        <button
          onClick={() => { setClockGating(!clockGating); playSound('click'); }}
          style={{
            padding: '16px 12px',
            borderRadius: '12px',
            border: `2px solid ${clockGating ? colors.success : '#475569'}`,
            background: clockGating ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            color: clockGating ? colors.success : colors.textSecondary,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: typo.small,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Clock Gating
          <br />
          <span style={{ fontSize: typo.label }}>{clockGating ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => { setPowerGating(!powerGating); playSound('click'); }}
          style={{
            padding: '16px 12px',
            borderRadius: '12px',
            border: `2px solid ${powerGating ? colors.success : '#475569'}`,
            background: powerGating ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            color: powerGating ? colors.success : colors.textSecondary,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: typo.small,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Power Gating
          <br />
          <span style={{ fontSize: typo.label }}>{powerGating ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => { setDvfs(!dvfs); playSound('click'); }}
          style={{
            padding: '16px 12px',
            borderRadius: '12px',
            border: `2px solid ${dvfs ? colors.success : '#475569'}`,
            background: dvfs ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            color: dvfs ? colors.success : colors.textSecondary,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: typo.small,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          DVFS
          <br />
          <span style={{ fontSize: typo.label }}>{dvfs ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          CPU Load: {loadPercent}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={loadPercent}
          onChange={(e) => setLoadPercent(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, touchAction: 'pan-y', WebkitAppearance: 'none', height: '20px' }}
        />
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
        <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
          <strong style={{ color: colors.accent }}>Experiment:</strong> Set load to 10% (idle), then toggle each power-saving mode to see its effect on total power and battery life.
        </p>
      </div>
    </div>
  );

  // Real-world applications data
  const realWorldApps = [
    {
      icon: '📱',
      title: 'Mobile SoC Design',
      short: 'Smartphones',
      tagline: 'Days of Standby',
      description: 'Modern smartphone SoCs use sophisticated power management to achieve multi-day standby while maintaining instant responsiveness.',
      connection: 'Leakage power determines standby current, while dynamic power governs active use battery life.',
      howItWorks: 'ARM big.LITTLE architectures use efficient cores for idle and high-power cores for demanding tasks. Power gating disables unused blocks entirely.',
      stats: [
        { value: '<5mW', label: 'Deep sleep power', icon: '💤' },
        { value: '99%+', label: 'Time in low power', icon: '⏱️' },
        { value: '10x', label: 'Active vs idle ratio', icon: '📊' }
      ],
      examples: ['Apple A-series bionic chips', 'Qualcomm Snapdragon', 'Samsung Exynos', 'MediaTek Dimensity'],
      companies: ['Apple', 'Qualcomm', 'Samsung', 'MediaTek'],
      futureImpact: 'Sub-threshold computing may enable always-on AI with negligible power consumption.',
      color: '#3B82F6'
    },
    {
      icon: '💻',
      title: 'Laptop Power Management',
      short: 'Notebooks',
      tagline: 'All-Day Battery',
      description: 'Modern laptops achieve 15+ hour battery life through aggressive power management while still offering high performance when needed.',
      connection: 'DVFS allows the CPU to run at low voltage during light tasks, dramatically reducing both dynamic and leakage power.',
      howItWorks: 'Intel Speed Shift and AMD PowerNow dynamically adjust voltage and frequency in microseconds based on workload demands.',
      stats: [
        { value: '3-5W', label: 'Idle power draw', icon: '🔋' },
        { value: '45W+', label: 'Peak performance', icon: '⚡' },
        { value: '15hrs', label: 'Video playback', icon: '🎬' }
      ],
      examples: ['MacBook Pro efficiency cores', 'Intel P/E core architecture', 'AMD Zen power states', 'Qualcomm Snapdragon laptops'],
      companies: ['Apple', 'Intel', 'AMD', 'Qualcomm'],
      futureImpact: 'Heterogeneous computing will enable week-long battery for typical usage patterns.',
      color: '#10B981'
    },
    {
      icon: '🖥️',
      title: 'Data Center Efficiency',
      short: 'Servers',
      tagline: 'Billions in Savings',
      description: 'Data centers spend billions on electricity. Even small improvements in idle efficiency save enormous amounts of money and energy.',
      connection: 'Servers often run at 20-40% average utilization, making idle power a dominant factor in total energy consumption.',
      howItWorks: 'Server processors use C-states for idle power reduction, with deeper states trading wake latency for lower power.',
      stats: [
        { value: '40%', label: 'Typical utilization', icon: '📈' },
        { value: '60%', label: 'Power at idle load', icon: '⚡' },
        { value: '$10B+', label: 'Annual power costs', icon: '💰' }
      ],
      examples: ['AMD EPYC efficiency', 'Intel Xeon power states', 'ARM Neoverse servers', 'Custom Google TPU power'],
      companies: ['Google', 'Microsoft', 'Amazon', 'Meta'],
      futureImpact: 'Workload-aware power management may halve data center energy consumption.',
      color: '#8B5CF6'
    },
    {
      icon: '⌚',
      title: 'Wearable Electronics',
      short: 'Smartwatches',
      tagline: 'Week-Long Battery',
      description: 'Smartwatches must run complex software on tiny batteries, making aggressive leakage reduction absolutely critical.',
      connection: 'With batteries under 500mAh, every microamp of leakage current directly impacts battery life by hours or days.',
      howItWorks: 'Ultra-low-power processors spend 99%+ of time completely power-gated, waking only for specific events.',
      stats: [
        { value: '<1mW', label: 'Always-on display', icon: '👁️' },
        { value: '7 days', label: 'Typical battery life', icon: '📅' },
        { value: '300mAh', label: 'Typical battery', icon: '🔋' }
      ],
      examples: ['Apple Watch S-series', 'Qualcomm Snapdragon Wear', 'Samsung Exynos W', 'Nordic nRF series'],
      companies: ['Apple', 'Samsung', 'Garmin', 'Fitbit'],
      futureImpact: 'Energy harvesting combined with ultra-low leakage may eliminate charging entirely.',
      color: '#F59E0B'
    }
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: colors.accent, fontSize: typo.small, textTransform: 'uppercase', letterSpacing: '2px' }}>Chip Physics</span>
            <h1 style={{ fontSize: typo.title, marginTop: '8px', background: 'linear-gradient(90deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Leakage vs Switching Power
            </h1>
            <p style={{ color: colors.textMuted, fontSize: typo.bodyLarge, marginTop: '8px' }}>
              Why Chips Run Hot Even When "Idle"
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderPowerVisualization()}
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: `4px solid ${colors.static}`, textAlign: 'left' }}>
            <p style={{ fontSize: typo.bodyLarge, lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.accent }}>If a chip is "doing nothing," should power be near zero?</strong>
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Your laptop at idle still drains battery. Your phone gets warm in your pocket. Data centers spend billions cooling servers that are "waiting." The physics of modern transistors reveals why true zero-power is impossible.
            </p>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
              <div style={{ color: colors.dynamic, fontWeight: 'bold', fontSize: typo.body }}>Dynamic Power</div>
              <div style={{ color: colors.textMuted, fontSize: typo.small }}>P = C * V^2 * f</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
              <div style={{ color: colors.static, fontWeight: 'bold', fontSize: typo.body }}>Leakage Power</div>
              <div style={{ color: colors.textMuted, fontSize: typo.small }}>Always flowing</div>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Explore the Mystery')
    );
  }

  // Static SVG for predict phase - shows idle phone concept
  const renderPredictVisualization = () => (
    <svg width="100%" height="200" viewBox="0 0 400 200" style={{ display: 'block', margin: '0 auto 24px' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="200" fill="#0f172a" rx="12" />

      {/* Phone shape */}
      <rect x="160" y="20" width="80" height="160" rx="12" fill="url(#phoneGrad)" stroke="#475569" strokeWidth="2" />

      {/* Screen (dark/off) */}
      <rect x="168" y="35" width="64" height="115" rx="4" fill="#0f172a" />

      {/* Status text */}
      <text x="200" y="90" fill="#e2e8f0" fontSize="11" textAnchor="middle">IDLE</text>
      <text x="200" y="108" fill="#e2e8f0" fontSize="11" textAnchor="middle">Screen Off</text>

      {/* Power question marks */}
      <text x="80" y="100" fill={colors.accent} fontSize="28" textAnchor="middle" fontWeight="bold">?</text>
      <text x="320" y="100" fill={colors.accent} fontSize="28" textAnchor="middle" fontWeight="bold">?</text>

      {/* Labels */}
      <text x="80" y="132" fill="#e2e8f0" fontSize="11" textAnchor="middle">Power</text>
      <text x="80" y="148" fill="#e2e8f0" fontSize="11" textAnchor="middle">Usage</text>
      <text x="320" y="130" fill="#e2e8f0" fontSize="11" textAnchor="middle">Battery</text>
      <text x="320" y="145" fill="#e2e8f0" fontSize="11" textAnchor="middle">Drain</text>
    </svg>
  );

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: typo.heading }}>Make Your Prediction</h2>

          {renderPredictVisualization()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: typo.body, marginBottom: '8px', lineHeight: 1.6 }}>
              A modern smartphone SoC has billions of transistors. When you lock your phone and put it in your pocket (screen off, no apps running), what happens to power consumption?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: typo.heading }}>Explore Power Breakdown</h2>
          <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: '24px', fontSize: typo.body }}>
            Adjust parameters and observe how power is consumed
          </p>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPowerVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}

              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginTop: '12px', marginLeft: isMobile ? undefined : '0', marginRight: isMobile ? undefined : '0' }}>
                <h3 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.small }}>Experiments to Try:</h3>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.7, paddingLeft: '16px', fontSize: typo.label }}>
                  <li>Set load to 0% - notice power is NOT zero</li>
                  <li>Increase temperature - watch leakage power explode</li>
                  <li>Decrease process node - smaller = more leakage</li>
                  <li>Reduce voltage - see V^2 effect on dynamic power</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Before vs After comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${colors.dynamic}` }}>
              <div style={{ color: colors.dynamic, fontWeight: 700, fontSize: typo.small, marginBottom: '6px' }}>Before: Full Load</div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>Dynamic power dominates. Leakage is small relative fraction.</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', padding: '14px', borderRadius: '10px', borderLeft: `3px solid ${colors.static}` }}>
              <div style={{ color: colors.static, fontWeight: 700, fontSize: typo.small, marginBottom: '6px' }}>After: 0% Load</div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>Leakage becomes dominant. Power is NOT zero &mdash; never will be!</div>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '16px', borderLeft: `4px solid ${colors.accent}` }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Why This Matters in the Real World</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Understanding leakage power is crucial for engineers designing mobile devices, laptops, and data centers.
              This is why your phone gets warm in your pocket and why data centers spend billions on cooling -
              practical applications that affect technology we use every day.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Physics')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'substantial';
    const predictionLabel = predictions.find(p => p.id === prediction)?.label || 'your prediction';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, fontSize: typo.heading }}>
              {wasCorrect ? 'Your prediction was correct!' : 'Your prediction needs revision!'}
            </h3>
            <p style={{ fontSize: typo.small, color: colors.textMuted, marginBottom: '8px' }}>
              You predicted: "{predictionLabel}"
            </p>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>
              As you observed in the simulation, substantial power IS consumed even at idle due to leakage currents. Modern chips can never truly be "off" while powered - electrons tunnel through transistor gates even when they should be blocking current.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.dynamic, marginBottom: '16px', fontSize: typo.body }}>Dynamic Power: P = alpha * C * V^2 * f</h3>
            <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
              <li><strong>alpha</strong> - Activity factor (what fraction of transistors switch)</li>
              <li><strong>C</strong> - Capacitance being switched</li>
              <li><strong>V^2</strong> - Voltage SQUARED (reducing voltage is very effective!)</li>
              <li><strong>f</strong> - Clock frequency</li>
            </ul>
            <p style={{ marginTop: '12px', color: colors.textMuted, fontSize: typo.small }}>
              This is the power you can control - it goes to near zero when nothing is computing.
            </p>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.static, marginBottom: '16px', fontSize: typo.body }}>Static/Leakage Power: P = I_leak * V</h3>
            <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
              <li>Current flows through "off" transistors via quantum tunneling</li>
              <li>Increases EXPONENTIALLY with temperature</li>
              <li>Worse at smaller process nodes (thinner gate oxide)</li>
              <li>Cannot be eliminated while chip is powered</li>
            </ul>
            <p style={{ marginTop: '12px', color: colors.textMuted, fontSize: typo.small }}>
              This is the unavoidable "tax" - it flows continuously even when idle.
            </p>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.clock, marginBottom: '12px', fontSize: typo.body }}>Other Idle Power Sources</h3>
            <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
              <li><strong>Clock distribution</strong> - The clock tree toggles even when CPU is idle</li>
              <li><strong>Memory refresh</strong> - DRAM must be constantly refreshed</li>
              <li><strong>I/O circuits</strong> - Interfaces stay powered for responsiveness</li>
              <li><strong>Always-on domains</strong> - RTC, interrupt controllers, power management</li>
            </ul>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover the Twist')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px', fontSize: typo.heading }}>The Power-Saving Twist</h2>

          {/* Static SVG showing power-saving techniques comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="100%" height="200" viewBox="0 0 460 200" style={{ maxWidth: '460px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="tp-glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="460" height="200" fill="#0f172a" rx="12" />
              {/* Grid lines */}
              <line x1="40" y1="20" x2="40" y2="160" stroke="#1e293b" strokeWidth="1" />
              <line x1="40" y1="160" x2="440" y2="160" stroke="#1e293b" strokeWidth="1" />
              {[0.25, 0.5, 0.75].map((t, i) => (
                <line key={i} x1="40" y1={160 - t * 130} x2="440" y2={160 - t * 130} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
              ))}
              {/* Before bars */}
              <rect x="55" y="30" width="30" height="130" fill={colors.static} rx="3" opacity="0.8" filter="url(#tp-glow)" />
              <text x="70" y="175" fill="#e2e8f0" fontSize="11" textAnchor="middle">Before</text>
              {/* Clock Gating */}
              <rect x="155" y="78" width="30" height="82" fill={colors.clock} rx="3" opacity="0.8" />
              <text x="170" y="175" fill="#e2e8f0" fontSize="11" textAnchor="middle">Clock</text>
              <text x="170" y="187" fill="#e2e8f0" fontSize="11" textAnchor="middle">Gating</text>
              {/* Power Gating */}
              <rect x="255" y="117" width="30" height="43" fill={colors.success} rx="3" opacity="0.8" filter="url(#tp-glow)" />
              <text x="270" y="175" fill="#e2e8f0" fontSize="11" textAnchor="middle">Power</text>
              <text x="270" y="187" fill="#e2e8f0" fontSize="11" textAnchor="middle">Gating</text>
              {/* DVFS */}
              <rect x="355" y="90" width="30" height="70" fill={colors.dynamic} rx="3" opacity="0.8" />
              <text x="370" y="175" fill="#e2e8f0" fontSize="11" textAnchor="middle">DVFS</text>
              {/* Y axis labels */}
              <text x="35" y="163" fill="#94a3b8" fontSize="11" textAnchor="end">0</text>
              <text x="35" y="32" fill="#94a3b8" fontSize="11" textAnchor="end">100%</text>
              <text x="230" y="16" fill="#f8fafc" fontSize="13" textAnchor="middle" fontWeight="bold">Power at Idle Load</text>
            </svg>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: typo.body, marginBottom: '12px', lineHeight: 1.6 }}>
              Engineers have developed clever techniques to combat idle power: <strong>clock gating</strong>, <strong>power gating</strong>, and <strong>DVFS</strong> (Dynamic Voltage and Frequency Scaling).
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold', fontSize: typo.body }}>
              Which technique is most effective at reducing idle power?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setTwistPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!twistPrediction, 'Experiment')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '8px', fontSize: typo.heading }}>Power-Saving Modes</h2>
          <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: '24px', fontSize: typo.body }}>
            Toggle each mode and observe the effect on power consumption
          </p>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPowerVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderPowerSavingControls()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: colors.clock, marginBottom: '8px', fontSize: typo.small }}>Clock Gating</h4>
              <p style={{ color: colors.textMuted, fontSize: typo.label, lineHeight: 1.5 }}>
                Stops clock to idle blocks. Saves dynamic power from clock tree switching.
              </p>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: colors.static, marginBottom: '8px', fontSize: typo.small }}>Power Gating</h4>
              <p style={{ color: colors.textMuted, fontSize: typo.label, lineHeight: 1.5 }}>
                Disconnects power entirely. Eliminates leakage but requires state save/restore.
              </p>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: colors.dynamic, marginBottom: '8px', fontSize: typo.small }}>DVFS</h4>
              <p style={{ color: colors.textMuted, fontSize: typo.label, lineHeight: 1.5 }}>
                Lowers voltage and frequency. V^2 gives huge savings at reduced performance.
              </p>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review Discovery')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'power_gating';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, fontSize: typo.heading }}>
              {wasCorrect ? 'Excellent insight!' : 'The answer might surprise you!'}
            </h3>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>
              <strong>Power gating</strong> is most effective for idle power because it completely eliminates leakage current in unused blocks. However, it has the highest overhead (wake-up latency and area cost), so real systems use ALL techniques together!
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.success, marginBottom: '16px', fontSize: typo.body }}>The Tradeoff Space</h3>
            <div style={{ lineHeight: 1.8, fontSize: typo.body }}>
              <p><strong style={{ color: colors.clock }}>Clock Gating:</strong></p>
              <ul style={{ paddingLeft: '20px', color: colors.textSecondary, marginBottom: '12px' }}>
                <li>Fast to enable/disable (nanoseconds)</li>
                <li>No state loss</li>
                <li>Only stops dynamic power, NOT leakage</li>
              </ul>

              <p><strong style={{ color: colors.static }}>Power Gating:</strong></p>
              <ul style={{ paddingLeft: '20px', color: colors.textSecondary, marginBottom: '12px' }}>
                <li>Slow to enable/disable (microseconds to milliseconds)</li>
                <li>State is lost - must save/restore registers</li>
                <li>Eliminates BOTH dynamic AND leakage power</li>
              </ul>

              <p><strong style={{ color: colors.dynamic }}>DVFS:</strong></p>
              <ul style={{ paddingLeft: '20px', color: colors.textSecondary }}>
                <li>Moderate transition time (microseconds)</li>
                <li>Reduced performance at lower settings</li>
                <li>V^2 effect makes voltage reduction very effective</li>
              </ul>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Real-World Power States</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Modern chips have many power states (C-states, P-states) that combine these techniques. Deeper sleep states save more power but take longer to wake. The OS and hardware work together to predict idle periods and choose the optimal state.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Leakage Power"
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
    const totalApps = realWorldApps.length;
    const app = realWorldApps[currentTransferApp];
    const isCompleted = transferCompleted.has(currentTransferApp);
    const allCompleted = transferCompleted.size >= totalApps;

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: typo.heading }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: '8px', fontSize: typo.body }}>
            App {currentTransferApp + 1} of {totalApps} &mdash; {transferCompleted.size}/{totalApps} completed
          </p>

          {/* App navigation dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {realWorldApps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTransferApp(i)}
                aria-label={`App ${i + 1}`}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                  background: transferCompleted.has(i) ? colors.success : i === currentTransferApp ? app.color : 'rgba(71,85,105,0.5)',
                  color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Current App Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: isCompleted ? `2px solid ${colors.success}` : `1px solid ${app.color}40`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '32px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, marginBottom: '2px', fontSize: typo.body }}>{app.title}</h3>
                <span style={{ color: app.color, fontSize: typo.small, fontWeight: 600 }}>{app.tagline}</span>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px', fontWeight: 400, lineHeight: 1.6 }}>
              {app.description}
            </p>

            {/* Stats grid - before/after comparison data */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {app.stats.map((stat, si) => (
                <div key={si} style={{ background: `${app.color}15`, padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: app.color, fontWeight: 700, fontSize: typo.small }}>{stat.value}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Connection to leakage power */}
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px', borderRadius: '8px', marginBottom: '10px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', lineHeight: 1.5, fontWeight: 400 }}><strong style={{ color: colors.accent }}>Leakage Connection:</strong> {app.connection}</p>
            </div>

            {/* How it works */}
            <div style={{ background: `${app.color}10`, padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${app.color}` }}>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6, fontWeight: 400 }}><strong>How It Works:</strong> {app.howItWorks}</p>
            </div>

            {/* Examples */}
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}>Real Products:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {app.examples.map((ex, ei) => (
                  <span key={ei} style={{ background: `${app.color}20`, color: app.color, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{ex}</span>
                ))}
              </div>
            </div>

            {/* Future impact */}
            <p style={{ color: colors.textMuted, fontSize: '11px', lineHeight: 1.5, marginBottom: '12px', fontStyle: 'italic' }}>
              Future: {app.futureImpact}
            </p>

            {/* Companies */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {app.companies.map((c, ci) => (
                <span key={ci} style={{ background: 'rgba(30,41,59,0.9)', color: colors.textSecondary, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #334155' }}>
                  {c}
                </span>
              ))}
            </div>

            {!isCompleted ? (
              <button
                onClick={() => {
                  const next = new Set(transferCompleted);
                  next.add(currentTransferApp);
                  setTransferCompleted(next);
                  playSound('success');
                  if (currentTransferApp < totalApps - 1) setCurrentTransferApp(currentTransferApp + 1);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: app.color,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: typo.small,
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease',
                  fontWeight: 700,
                  width: '100%',
                }}
              >
                Got It &mdash; {currentTransferApp < totalApps - 1 ? 'Next App' : 'Complete'}
              </button>
            ) : (
              <button
                onClick={() => { if (currentTransferApp < totalApps - 1) setCurrentTransferApp(currentTransferApp + 1); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: typo.small,
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease',
                  fontWeight: 700,
                  width: '100%',
                }}
              >
                {currentTransferApp < totalApps - 1 ? 'Got It ✓ Next App' : 'Got It ✓ All Done!'}
              </button>
            )}
          </div>

          {allCompleted && (
            <button
              onClick={goNext}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)`,
                color: 'white',
                cursor: 'pointer',
                fontSize: typo.body,
                minHeight: '44px',
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
            >
              Take the Test
            </button>
          )}
        </div>
      </div>,
      renderBottomBar(allCompleted, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
              <p style={{ color: colors.textMuted, fontSize: typo.body }}>
                {testScore >= 7 ? 'You understand chip power consumption!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {testScore >= 7 && (
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Key Takeaways</h3>
                <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
                  <li>Leakage power flows continuously through "off" transistors</li>
                  <li>Dynamic power scales with V^2 and frequency</li>
                  <li>Temperature dramatically increases leakage</li>
                  <li>Power gating eliminates leakage but has wake-up cost</li>
                  <li>Modern chips use all power-saving techniques together</li>
                </ul>
              </div>
            )}
          </div>
        </div>,
        renderBottomBar(true, testScore >= 7 ? 'Claim Mastery' : 'Try Again', testScore >= 7 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: typo.heading }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Question {currentTestQuestion + 1} of 10</span>
          </div>

          {/* Before/After comparison showing leakage impact */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.dynamic}` }}>
              <div style={{ color: colors.dynamic, fontSize: typo.small, fontWeight: 700, marginBottom: '4px' }}>Dynamic Power</div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400 }}>Scales with: C × V² × f. Drops to near zero when idle. Can be controlled by clock gating and DVFS.</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.static}` }}>
              <div style={{ color: colors.static, fontSize: typo.small, fontWeight: 700, marginBottom: '4px' }}>Leakage Power</div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, fontWeight: 400 }}>Always flows: P = I_leak × V. Exponential with temperature. Requires power gating to reduce. Never truly zero.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleTestAnswer(currentTestQuestion, i)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === i ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === i ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: typo.small,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>

            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#475569' : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>,
      null
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'pulse 2s infinite',
          }}>
            <span role="img" aria-label="trophy">MASTERY</span>
          </div>
          <h1 style={{
            color: colors.success,
            marginBottom: '8px',
            fontSize: typo.title,
            background: 'linear-gradient(90deg, #10b981, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Power Management Expert!
          </h1>
          <p style={{ color: colors.textMuted, marginBottom: '32px', fontSize: typo.body }}>
            You now understand why chips can never truly be "off" and how engineers fight idle power
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.body }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px', fontSize: typo.body }}>
              <li><strong style={{ color: colors.dynamic }}>Dynamic power</strong> - Proportional to C * V^2 * f</li>
              <li><strong style={{ color: colors.static }}>Leakage power</strong> - Quantum tunneling through "off" transistors</li>
              <li><strong style={{ color: colors.temperature }}>Temperature effects</strong> - Exponential leakage increase</li>
              <li><strong style={{ color: colors.clock }}>Clock gating</strong> - Stops unnecessary switching</li>
              <li><strong style={{ color: colors.success }}>Power gating</strong> - Eliminates all power to unused blocks</li>
              <li><strong style={{ color: colors.dynamic }}>DVFS</strong> - Voltage reduction has quadratic benefit</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: colors.static, marginBottom: '8px', fontSize: typo.body }}>The Core Insight</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              As transistors shrink, leakage becomes an ever-larger fraction of total power. This is why mobile devices need sophisticated power management and why "dark silicon" - keeping parts of a chip permanently off - is a real design constraint in modern processors.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {realWorldApps.slice(0, 4).map((app, i) => (
              <div key={i} style={{ background: `${app.color}15`, padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{app.icon}</div>
                <div style={{ color: app.color, fontWeight: 'bold', fontSize: typo.small }}>{app.short}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Complete')
    );
  }

  return null;
};

export default LeakagePowerRenderer;
