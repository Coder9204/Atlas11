'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ThermalThrottlingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  cool: '#3b82f6',
  hot: '#ef4444',
  chip: '#6366f1',
};

const ThermalThrottlingRenderer: React.FC<ThermalThrottlingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [clockSpeed, setClockSpeed] = useState(3.5); // GHz
  const [voltage, setVoltage] = useState(1.2); // Volts
  const [coolingPower, setCoolingPower] = useState(65); // Watts TDP
  const [workload, setWorkload] = useState(50); // Percentage
  const [temperature, setTemperature] = useState(40); // Celsius
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

  // Thermal constants
  const T_AMBIENT = 25;
  const T_THROTTLE = 95;
  const T_CRITICAL = 105;

  // Power dissipation calculation
  const calculatePower = useCallback(() => {
    // P = C * V^2 * f (dynamic power)
    const C = 1; // Capacitance factor (normalized)
    const dynamicPower = C * Math.pow(voltage, 2) * clockSpeed * (workload / 100);
    // Static power increases with temperature
    const staticPower = 5 * (1 + (temperature - 25) * 0.02);
    return dynamicPower * 30 + staticPower; // Scaled to realistic wattage
  }, [voltage, clockSpeed, workload, temperature]);

  // Thermal simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);

      const power = calculatePower();
      const thermalResistance = 1 / (coolingPower / 50); // Higher cooling = lower resistance

      // Temperature change based on power and cooling
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
      // DVFS: Reduce clock and voltage to lower power
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
      description: 'High-performance laptops use aggressive cooling with multiple fans and vapor chambers. When thermals limit performance, they reduce GPU and CPU clocks.',
      icon: '🎮',
    },
    {
      title: 'Smartphones',
      description: 'Phones have no fans, only passive cooling. Sustained gaming or recording causes throttling. Some phones have thermal paste improvements or vapor chambers.',
      icon: '📱',
    },
    {
      title: 'Data Centers',
      description: 'Server farms use massive HVAC systems. Each degree of cooling reduction saves millions in electricity. Hot aisle/cold aisle designs optimize airflow.',
      icon: '🖥️',
    },
    {
      title: 'Electric Vehicles',
      description: 'EV battery packs and motors are actively liquid cooled. Thermal management determines acceleration performance and charging speed.',
      icon: '🚗',
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
        { text: 'Power is proportional to voltage squared (P ~ V²)', correct: true },
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
        { text: 'Around 50-60°C', correct: false },
        { text: 'Around 70-80°C', correct: false },
        { text: 'Around 90-100°C', correct: true },
        { text: 'Around 120-130°C', correct: false },
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
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const resetSimulation = () => {
    setTemperature(40);
    setClockSpeed(3.5);
    setVoltage(1.2);
    setIsThrottling(false);
    setIsSimulating(false);
    setAnimationTime(0);
  };

  const renderVisualization = (showCoolingEffect: boolean = false) => {
    const width = 400;
    const height = 320;

    // Temperature color interpolation
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

        {/* Title */}
        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
          Processor Thermal Simulation
        </text>

        {/* Heatsink */}
        <rect x="100" y="60" width="200" height="20" fill="#475569" rx="2" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={110 + i * 19} y="40" width="4" height="20" fill="#64748b" />
        ))}
        <text x="200" y="52" fill={colors.textMuted} fontSize="8" textAnchor="middle">Heatsink</text>

        {/* CPU Die */}
        <rect
          x="130"
          y="85"
          width="140"
          height="80"
          fill="url(#chipGrad)"
          rx="4"
          filter={temperature > T_THROTTLE ? "url(#heatGlow)" : undefined}
        />

        {/* CPU label */}
        <text x="200" y="115" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">
          CPU
        </text>
        <text x="200" y="135" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">
          {clockSpeed.toFixed(2)} GHz @ {voltage.toFixed(2)}V
        </text>
        <text x="200" y="155" fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle">
          {power.toFixed(0)}W
        </text>

        {/* Heat waves animation */}
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

        {/* Substrate */}
        <rect x="120" y="170" width="160" height="15" fill="#1e293b" rx="2" />
        <text x="200" y="180" fill={colors.textMuted} fontSize="7" textAnchor="middle">PCB</text>

        {/* Temperature gauge */}
        <g transform="translate(330, 60)">
          <rect x="0" y="0" width="50" height="130" fill="rgba(0,0,0,0.3)" rx="4" />
          <text x="25" y="15" fill={colors.textMuted} fontSize="8" textAnchor="middle">TEMP</text>

          {/* Temperature bar */}
          <rect x="10" y="25" width="30" height="80" fill="#1f2937" rx="2" />
          <rect
            x="10"
            y={25 + 80 * (1 - tempRatio)}
            width="30"
            height={80 * tempRatio}
            fill={temperature > T_THROTTLE ? colors.error : temperature > 70 ? colors.warning : colors.cool}
            rx="2"
          />

          {/* Threshold lines */}
          <line x1="5" y1={25 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} x2="45" y2={25 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} stroke={colors.warning} strokeWidth="1" strokeDasharray="2,2" />
          <text x="48" y={28 + 80 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} fill={colors.warning} fontSize="7">95°C</text>

          <text x="25" y="120" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
            {temperature.toFixed(0)}°C
          </text>
        </g>

        {/* Status indicators */}
        <g transform="translate(20, 200)">
          <rect x="0" y="0" width="100" height="50" fill={colors.bgCard} rx="6" />
          <text x="50" y="18" fill={colors.textMuted} fontSize="9" textAnchor="middle">Status</text>
          <text x="50" y="38" fill={isThrottling ? colors.error : colors.success} fontSize="12" textAnchor="middle" fontWeight="bold">
            {isThrottling ? 'THROTTLING' : 'NORMAL'}
          </text>
        </g>

        {/* Cooling indicator if showing twist */}
        {showCoolingEffect && (
          <g transform="translate(20, 60)">
            <rect x="0" y="0" width="70" height="50" fill="rgba(59, 130, 246, 0.2)" rx="6" />
            <text x="35" y="18" fill={colors.cool} fontSize="9" textAnchor="middle">Cooling</text>
            <text x="35" y="38" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
              {coolingPower}W
            </text>
          </g>
        )}

        {/* Performance bar */}
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

  const renderHook = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔥</div>
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
      <button
        onClick={() => onPhaseComplete?.()}
        style={primaryButtonStyle}
      >
        Discover Thermal Throttling
      </button>
    </div>
  );

  const renderPredict = () => (
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
      {prediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          See It In Action
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
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
            {temperature.toFixed(0)}°C
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

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
      >
        Continue to Review
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Understanding Thermal Throttling
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Dynamic Power Equation</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
          P = C × V² × f
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
          Power = Capacitance × Voltage² × Frequency
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { icon: '🌡️', title: 'Junction Temperature', desc: 'The actual silicon temperature, typically limited to 95-105°C for safety' },
          { icon: '📉', title: 'DVFS', desc: 'Dynamic Voltage & Frequency Scaling - reducing both cuts power cubically' },
          { icon: '⚡', title: 'Voltage Matters Most', desc: 'Power scales with V² - a 10% voltage drop = 19% power reduction' },
          { icon: '🔄', title: 'Thermal Feedback Loop', desc: 'Sensors monitor temp constantly, adjusting speed in real-time' },
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

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Discover the Cooling Connection
      </button>
    </div>
  );

  const renderTwistPredict = () => (
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

      {twistPrediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          Explore Cooling Effects
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
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

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Continue
      </button>
    </div>
  );

  const renderTwistReview = () => (
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
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>❄️</div>
          <div style={{ color: colors.cool, fontWeight: 'bold' }}>Good Cooling</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Sustained 100% performance</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔥</div>
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

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
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

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={transferCompleted.size < 4}
        style={{
          ...primaryButtonStyle,
          marginTop: '20px',
          width: '100%',
          opacity: transferCompleted.size < 4 ? 0.5 : 1,
          cursor: transferCompleted.size < 4 ? 'not-allowed' : 'pointer',
        }}
      >
        {transferCompleted.size < 4 ? `Explore ${4 - transferCompleted.size} more` : 'Take the Test'}
      </button>
    </div>
  );

  const renderTest = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Knowledge Check
      </h2>

      {!testSubmitted ? (
        <>
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
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {testScore >= 7 ? '🎉' : '📚'}
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

          <button
            onClick={() => onPhaseComplete?.()}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {testScore >= 7 ? 'Complete!' : 'Continue Anyway'}
          </button>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
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
          <li style={{ marginBottom: '8px' }}>P = C × V² × f - voltage reduction has the biggest impact</li>
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

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary,
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default ThermalThrottlingRenderer;
