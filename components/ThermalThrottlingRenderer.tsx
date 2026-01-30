'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type TTPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ThermalThrottlingRendererProps {
  gamePhase?: string; // Optional for resume functionality
  onGameEvent?: (event: GameEvent) => void;
}

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  border: '#334155',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  cool: '#3b82f6',
  hot: '#ef4444',
  chip: '#6366f1',
  primary: '#06b6d4',
};

const ThermalThrottlingRenderer: React.FC<ThermalThrottlingRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: TTPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<TTPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Cooling Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): TTPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as TTPhase)) {
      return gamePhase as TTPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<TTPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as TTPhase) && gamePhase !== phase) {
      setPhase(gamePhase as TTPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [clockSpeed, setClockSpeed] = useState(3.5);
  const [voltage, setVoltage] = useState(1.2);
  const [coolingPower, setCoolingPower] = useState(65);
  const [workload, setWorkload] = useState(50);
  const [temperature, setTemperature] = useState(40);
  const [isThrottling, setIsThrottling] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Emit game events
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'thermal_throttling',
        gameTitle: 'Thermal Throttling',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Navigation function
  const goToPhase = useCallback((p: TTPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `Navigated to ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Thermal constants
  const T_AMBIENT = 25;
  const T_THROTTLE = 95;
  const T_CRITICAL = 105;

  // Power dissipation calculation
  const calculatePower = useCallback(() => {
    const C = 1;
    const dynamicPower = C * Math.pow(voltage, 2) * clockSpeed * (workload / 100);
    const staticPower = 5 * (1 + (temperature - 25) * 0.02);
    return dynamicPower * 30 + staticPower;
  }, [voltage, clockSpeed, workload, temperature]);

  // Thermal simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);

      const power = calculatePower();
      const thermalResistance = 1 / (coolingPower / 50);

      const targetTemp = T_AMBIENT + power * thermalResistance;
      setTemperature(prev => {
        const newTemp = prev + (targetTemp - prev) * 0.05;
        return Math.min(newTemp, T_CRITICAL);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, calculatePower, coolingPower]);

  // Throttling logic
  useEffect(() => {
    if (temperature >= T_THROTTLE) {
      setIsThrottling(true);
      setClockSpeed(prev => Math.max(prev * 0.95, 1.5));
      setVoltage(prev => Math.max(prev * 0.98, 0.8));
    } else if (temperature < T_THROTTLE - 10 && isThrottling) {
      setIsThrottling(false);
    }
  }, [temperature, isThrottling]);

  const power = calculatePower();

  const predictions = [
    { id: 'damage', label: 'The chip would be permanently damaged by overheating' },
    { id: 'throttle', label: 'The chip automatically slows down to reduce heat generation' },
    { id: 'shutdown', label: 'The phone immediately shuts off to protect itself' },
    { id: 'battery', label: 'The battery stops charging to cool down' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Cooling has no effect on maximum performance' },
    { id: 'better_cooling', label: 'Better cooling directly enables higher sustained performance' },
    { id: 'software', label: 'Performance is purely software limited, not thermal' },
    { id: 'random', label: 'Performance varies randomly regardless of cooling' },
  ];

  const transferApplications = [
    {
      title: 'Gaming Laptops',
      description: 'High-performance laptops use aggressive cooling with multiple fans and vapor chambers.',
      icon: 'Gamepad',
    },
    {
      title: 'Smartphones',
      description: 'Phones have no fans, only passive cooling. Sustained gaming causes throttling.',
      icon: 'Smartphone',
    },
    {
      title: 'Data Centers',
      description: 'Server farms use massive HVAC systems. Each degree of cooling saves millions.',
      icon: 'Server',
    },
    {
      title: 'Electric Vehicles',
      description: 'EV battery packs and motors are actively liquid cooled for performance.',
      icon: 'Car',
    },
  ];

  const testQuestions = [
    {
      question: 'What is thermal throttling?',
      options: [
        { text: 'Automatic reduction of processor speed to prevent overheating', correct: true },
        { text: 'Manual speed control by the user', correct: false },
        { text: 'A cooling fan speed adjustment', correct: false },
        { text: 'Battery power limiting', correct: false },
      ],
    },
    {
      question: 'What does DVFS stand for?',
      options: [
        { text: 'Direct Voltage Frequency Scaling', correct: false },
        { text: 'Dynamic Voltage and Frequency Scaling', correct: true },
        { text: 'Digital Variable Fan Speed', correct: false },
        { text: 'Dual Voltage Frequency System', correct: false },
      ],
    },
    {
      question: 'How does dynamic power consumption relate to voltage?',
      options: [
        { text: 'Power is proportional to voltage (P ~ V)', correct: false },
        { text: 'Power is proportional to voltage squared (P ~ V^2)', correct: true },
        { text: 'Power is inversely proportional to voltage', correct: false },
        { text: 'Power is independent of voltage', correct: false },
      ],
    },
    {
      question: 'What happens when junction temperature exceeds the throttle threshold?',
      options: [
        { text: 'Nothing, the chip continues normally', correct: false },
        { text: 'Clock speed and voltage are reduced to lower power dissipation', correct: true },
        { text: 'The chip immediately shuts down', correct: false },
        { text: 'Only the GPU is affected', correct: false },
      ],
    },
    {
      question: 'What is the typical throttle threshold for modern processors?',
      options: [
        { text: 'Around 50-60C', correct: false },
        { text: 'Around 70-80C', correct: false },
        { text: 'Around 90-100C', correct: true },
        { text: 'Around 120-130C', correct: false },
      ],
    },
    {
      question: 'Why does better cooling enable higher performance?',
      options: [
        { text: 'It allows higher sustained clock speeds without hitting thermal limits', correct: true },
        { text: 'It makes the electrons flow faster', correct: false },
        { text: 'It reduces electrical resistance to zero', correct: false },
        { text: 'It increases the battery capacity', correct: false },
      ],
    },
    {
      question: 'What is thermal runaway in the context of processors?',
      options: [
        { text: 'When heat causes increased power which causes more heat', correct: true },
        { text: 'When the cooling fan runs too fast', correct: false },
        { text: 'When the CPU runs faster than rated', correct: false },
        { text: 'When the thermal paste dries out', correct: false },
      ],
    },
    {
      question: 'Why do smartphones throttle more than desktop computers?',
      options: [
        { text: 'They have weaker processors', correct: false },
        { text: 'They rely on passive cooling with no fans', correct: true },
        { text: 'They use different operating systems', correct: false },
        { text: 'They have smaller batteries', correct: false },
      ],
    },
    {
      question: 'What is TDP (Thermal Design Power)?',
      options: [
        { text: 'The amount of heat the cooling system must dissipate', correct: true },
        { text: 'The total battery consumption', correct: false },
        { text: 'The display power usage', correct: false },
        { text: 'The network transmission power', correct: false },
      ],
    },
    {
      question: 'How does workload affect processor temperature?',
      options: [
        { text: 'No effect - temperature is constant', correct: false },
        { text: 'Higher workload means more switching activity and heat', correct: true },
        { text: 'Lower workload increases temperature', correct: false },
        { text: 'Only GPU workload affects temperature', correct: false },
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
  };

  const resetSimulation = () => {
    setTemperature(40);
    setClockSpeed(3.5);
    setVoltage(1.2);
    setIsThrottling(false);
    setIsSimulating(false);
    setAnimationTime(0);
  };

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '8px' : '16px'
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </div>
      </div>
    );
  };

  // Bottom bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string) => {
    const currentIdx = phaseOrder.indexOf(phase);

    const handleNext = () => {
      if (!canGoNext) return;
      if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.3,
            minHeight: '44px'
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
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (showCoolingEffect: boolean = false) => {
    const width = 400;
    const height = 320;

    const tempRatio = Math.min((temperature - T_AMBIENT) / (T_CRITICAL - T_AMBIENT), 1);
    const tempColor = `rgb(${Math.floor(59 + tempRatio * 180)}, ${Math.floor(130 - tempRatio * 100)}, ${Math.floor(246 - tempRatio * 200)})`;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tempColor} />
            <stop offset="100%" stopColor={isThrottling ? colors.error : colors.chip} />
          </linearGradient>
          <filter id="heatGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
          Processor Thermal Simulation
        </text>

        <rect x="100" y="60" width="200" height="20" fill="#475569" rx="2" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={110 + i * 19} y="40" width="4" height="20" fill="#64748b" />
        ))}
        <text x="200" y="52" fill={colors.textMuted} fontSize="8" textAnchor="middle">Heatsink</text>

        <rect
          x="130"
          y="85"
          width="140"
          height="80"
          fill="url(#chipGrad)"
          rx="4"
          filter={temperature > T_THROTTLE ? "url(#heatGlow)" : undefined}
        />

        <text x="200" y="115" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">
          CPU
        </text>
        <text x="200" y="135" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">
          {clockSpeed.toFixed(2)} GHz @ {voltage.toFixed(2)}V
        </text>
        <text x="200" y="155" fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle">
          {power.toFixed(0)}W
        </text>

        {isSimulating && temperature > 60 && (
          <g>
            {Array.from({ length: 5 }, (_, i) => {
              const offset = ((animationTime * 2 + i * 30) % 60);
              const opacity = Math.max(0, 1 - offset / 60) * Math.min((temperature - 60) / 40, 1);
              return (
                <path
                  key={i}
                  d={`M ${140 + i * 30} ${80 - offset} Q ${145 + i * 30} ${70 - offset} ${150 + i * 30} ${80 - offset}`}
                  fill="none"
                  stroke={colors.hot}
                  strokeWidth="2"
                  opacity={opacity * 0.5}
                />
              );
            })}
          </g>
        )}

        <rect x="120" y="170" width="160" height="15" fill="#1e293b" rx="2" />
        <text x="200" y="180" fill={colors.textMuted} fontSize="7" textAnchor="middle">PCB</text>

        <g transform="translate(330, 60)">
          <rect x="0" y="0" width="50" height="130" fill="rgba(0,0,0,0.3)" rx="4" />
          <text x="25" y="15" fill={colors.textMuted} fontSize="8" textAnchor="middle">TEMP</text>

          <rect x="10" y="25" width="30" height="80" fill="#1f2937" rx="2" />
          <rect
            x="10"
            y={25 + 80 * (1 - tempRatio)}
            width="30"
            height={80 * tempRatio}
            fill={temperature > T_THROTTLE ? colors.error : temperature > 70 ? colors.warning : colors.cool}
            rx="2"
          />

          <line x1="5" y1={25 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} x2="45" y2={25 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} stroke={colors.warning} strokeWidth="1" strokeDasharray="2,2" />
          <text x="48" y={28 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} fill={colors.warning} fontSize="7">95C</text>

          <text x="25" y="120" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
            {temperature.toFixed(0)}C
          </text>
        </g>

        <g transform="translate(20, 200)">
          <rect x="0" y="0" width="100" height="50" fill={colors.bgCard} rx="6" />
          <text x="50" y="18" fill={colors.textMuted} fontSize="9" textAnchor="middle">Status</text>
          <text x="50" y="38" fill={isThrottling ? colors.error : colors.success} fontSize="12" textAnchor="middle" fontWeight="bold">
            {isThrottling ? 'THROTTLING' : 'NORMAL'}
          </text>
        </g>

        {showCoolingEffect && (
          <g transform="translate(20, 60)">
            <rect x="0" y="0" width="70" height="50" fill="rgba(59, 130, 246, 0.2)" rx="6" />
            <text x="35" y="18" fill={colors.cool} fontSize="9" textAnchor="middle">Cooling</text>
            <text x="35" y="38" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
              {coolingPower}W
            </text>
          </g>
        )}

        <g transform="translate(20, 260)">
          <text x="0" y="0" fill={colors.textMuted} fontSize="10">Performance</text>
          <rect x="0" y="8" width="200" height="12" fill="#1f2937" rx="2" />
          <rect
            x="0"
            y="8"
            width={200 * (clockSpeed / 4.5)}
            height="12"
            fill={isThrottling ? colors.warning : colors.success}
            rx="2"
          />
          <text x="205" y="18" fill={colors.textPrimary} fontSize="10">
            {((clockSpeed / 4.5) * 100).toFixed(0)}%
          </text>
        </g>
      </svg>
    );
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(51, 65, 85, 0.8)',
    color: colors.textPrimary,
    border: `1px solid ${colors.accent}`,
  };

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>Fire</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Why Does Your Phone Slow Down When Hot?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              Ever noticed your phone getting sluggish during a long gaming session or on a hot summer day? There's a clever reason for that...
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Hidden Guardian</h3>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>
                Every processor has a built-in protector that prevents self-destruction. When things get too hot, it makes a calculated sacrifice...
              </p>
            </div>
            {renderVisualization()}
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Make Your Prediction
            </h2>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                When a processor approaches dangerous temperatures, what happens?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: prediction === p.id
                      ? (p.id === 'throttle' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: prediction === p.id ? (p.id === 'throttle' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {prediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'throttle' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: prediction === 'throttle' ? colors.success : colors.warning }}>
                  {prediction === 'throttle'
                    ? 'Correct! Thermal throttling reduces clock speed to lower power and heat - trading performance for survival.'
                    : 'Not quite. While shutdown is a last resort, the first response is throttling - automatically slowing down to reduce heat.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Thermal Throttling Simulator
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Increase workload and watch the CPU respond to heat
            </p>

            {renderVisualization()}

            <div style={{ marginTop: '20px' }}>
              <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Workload: {workload}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={workload}
                onChange={(e) => setWorkload(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={isSimulating ? secondaryButtonStyle : primaryButtonStyle}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button onClick={resetSimulation} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Clock</div>
                <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
                  {clockSpeed.toFixed(2)} GHz
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Power</div>
                <div style={{ color: colors.warning, fontSize: '18px', fontWeight: 'bold' }}>
                  {power.toFixed(0)}W
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Temp</div>
                <div style={{ color: temperature > T_THROTTLE ? colors.error : colors.success, fontSize: '18px', fontWeight: 'bold' }}>
                  {temperature.toFixed(0)}C
                </div>
              </div>
            </div>

            {isThrottling && (
              <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.error, margin: 0 }}>
                  DVFS Active: Reducing clock and voltage to prevent overheating
                </p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Understanding Thermal Throttling
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Dynamic Power Equation</div>
              <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                P = C x V^2 x f
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
                Power = Capacitance x Voltage^2 x Frequency
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: 'Thermometer', title: 'Junction Temperature', desc: 'The actual silicon temperature, typically limited to 95-105C for safety' },
                { icon: 'TrendingDown', title: 'DVFS', desc: 'Dynamic Voltage & Frequency Scaling - reducing both cuts power cubically' },
                { icon: 'Zap', title: 'Voltage Matters Most', desc: 'Power scales with V^2 - a 10% voltage drop = 19% power reduction' },
                { icon: 'RefreshCw', title: 'Thermal Feedback Loop', desc: 'Sensors monitor temp constantly, adjusting speed in real-time' },
              ].map((item, i) => (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '24px' }}>{item.icon}</div>
                  <div>
                    <h3 style={{ color: colors.textPrimary, margin: '0 0 4px' }}>{item.title}</h3>
                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
              The Cooling Twist
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              How does better cooling affect actual performance?
            </p>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                If you add a better heatsink or cooling fan to a processor, what happens to performance?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: twistPrediction === p.id
                      ? (p.id === 'better_cooling' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: twistPrediction === p.id ? (p.id === 'better_cooling' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'better_cooling' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: twistPrediction === 'better_cooling' ? colors.success : colors.warning }}>
                  {twistPrediction === 'better_cooling'
                    ? 'Correct! Better cooling means the chip can run faster for longer without hitting thermal limits - cooling = performance!'
                    : 'Actually, cooling directly affects sustained performance. Better cooling lets the processor maintain higher speeds!'}
                </p>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Cooling vs Performance
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Adjust cooling capacity and see the impact on sustained performance
            </p>

            {renderVisualization(true)}

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Workload: {workload}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={workload}
                  onChange={(e) => setWorkload(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.cool, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Cooling: {coolingPower}W TDP
                </label>
                <input
                  type="range"
                  min="35"
                  max="150"
                  value={coolingPower}
                  onChange={(e) => setCoolingPower(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={isSimulating ? secondaryButtonStyle : primaryButtonStyle}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button onClick={resetSimulation} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
                <strong style={{ color: colors.cool }}>Key insight:</strong> With 150W cooling, you can sustain max performance. With 35W, throttling kicks in quickly!
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Cooling Enables Performance
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                Better Cooling = Higher Sustained Clocks
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
                The thermal limit is the new performance ceiling
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Snowflake</div>
                <div style={{ color: colors.cool, fontWeight: 'bold' }}>Good Cooling</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Sustained 100% performance</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Fire</div>
                <div style={{ color: colors.error, fontWeight: 'bold' }}>Poor Cooling</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Throttled to 50-70%</div>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Real-World Examples</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li>Gaming laptops with better coolers outperform identical specs with weak cooling</li>
                <li>Desktop CPUs can boost higher due to tower coolers</li>
                <li>Undervolting can reduce thermals, enabling higher sustained clocks</li>
                <li>Thermal paste quality directly affects maximum performance</li>
              </ul>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              Explore all 4 applications to continue
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {transferApplications.map((app, i) => (
                <div
                  key={i}
                  onClick={() => setTransferCompleted(prev => new Set([...prev, i]))}
                  style={{
                    background: transferCompleted.has(i) ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '2px solid transparent',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{app.icon}</div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '14px', textAlign: 'center', margin: '0 0 8px' }}>
                    {app.title}
                  </h3>
                  <p style={{ color: colors.textMuted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
                    {app.description}
                  </p>
                  {transferCompleted.has(i) && (
                    <div style={{ color: colors.success, textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
                      Explored
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted }}>
                Progress: {transferCompleted.size}/4 applications
              </p>
            </div>
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {testScore >= 7 ? 'Trophy' : 'Book'}
              </div>
              <h3 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
                Score: {testScore}/10
              </h3>
              <p style={{ color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '24px' }}>
                {testScore >= 7 ? 'Excellent! You understand thermal throttling!' : 'Review the concepts and try again.'}
              </p>

              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: testAnswers[i] !== null && q.options[testAnswers[i]!].correct
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }}>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', margin: '0 0 4px' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Knowledge Check
            </h2>

            <div style={{ marginBottom: '20px' }}>
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} style={{ marginBottom: '24px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '12px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{
                          ...secondaryButtonStyle,
                          background: testAnswers[qIndex] === oIndex ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                          borderColor: testAnswers[qIndex] === oIndex ? colors.accent : 'transparent',
                          textAlign: 'left',
                          fontSize: '14px',
                          padding: '10px 16px',
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: testAnswers.includes(null) ? 0.5 : 1,
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Thermal Throttling Master!
            </h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You now understand how processors balance performance and temperature.
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Thermal throttling protects chips by reducing clock speed</li>
                <li style={{ marginBottom: '8px' }}>P = C x V^2 x f - voltage reduction has the biggest impact</li>
                <li style={{ marginBottom: '8px' }}>DVFS dynamically balances power and performance</li>
                <li style={{ marginBottom: '8px' }}>Better cooling directly enables higher sustained performance</li>
                <li>Modern chips are thermally limited, not electrically limited</li>
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
                Score: {testScore}/10
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Determine navigation state for bottom bar
  const getNavigationState = () => {
    switch (phase) {
      case 'hook':
        return { canGoNext: true, nextLabel: 'Discover Thermal Throttling' };
      case 'predict':
        return { canGoNext: !!prediction, nextLabel: 'See It In Action' };
      case 'play':
        return { canGoNext: true, nextLabel: 'Continue to Review' };
      case 'review':
        return { canGoNext: true, nextLabel: 'Discover the Cooling Connection' };
      case 'twist_predict':
        return { canGoNext: !!twistPrediction, nextLabel: 'Explore Cooling Effects' };
      case 'twist_play':
        return { canGoNext: true, nextLabel: 'Continue' };
      case 'twist_review':
        return { canGoNext: true, nextLabel: 'See Real Applications' };
      case 'transfer':
        return { canGoNext: transferCompleted.size >= 4, nextLabel: transferCompleted.size >= 4 ? 'Take the Test' : `Explore ${4 - transferCompleted.size} more` };
      case 'test':
        if (testSubmitted) {
          return { canGoNext: testScore >= 7, nextLabel: testScore >= 7 ? 'Complete!' : 'Continue Anyway' };
        }
        return { canGoNext: false, nextLabel: 'Answer All Questions' };
      case 'mastery':
        return { canGoNext: true, nextLabel: 'Complete Game' };
      default:
        return { canGoNext: true, nextLabel: 'Continue' };
    }
  };

  const navState = getNavigationState();

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {renderContent()}
        </div>
      </div>
      {renderBottomBar(navState.canGoNext, navState.nextLabel)}
    </div>
  );
};

export default ThermalThrottlingRenderer;
