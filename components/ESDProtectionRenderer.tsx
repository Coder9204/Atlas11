'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ESDProtectionRendererProps {
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
  spark: '#fde047',
  diode: '#22c55e',
  circuit: '#60a5fa',
  human: '#f97316',
};

const ESDProtectionRenderer: React.FC<ESDProtectionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [esdVoltage, setEsdVoltage] = useState(2000); // Volts
  const [hasProtection, setHasProtection] = useState(true);
  const [dischargePath, setDischargePath] = useState<'chip' | 'diode' | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isDischarging, setIsDischarging] = useState(false);
  const [chipDamage, setChipDamage] = useState(0);
  const [responseTime, setResponseTime] = useState(1); // nanoseconds

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isDischarging) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => {
        const next = prev + 1;
        if (next > 30) {
          setIsDischarging(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isDischarging]);

  const triggerDischarge = useCallback(() => {
    setIsDischarging(true);
    setAnimationTime(0);

    if (hasProtection) {
      setDischargePath('diode');
      // Protection clamps voltage, minimal damage
      setChipDamage(prev => Math.min(prev + 1, 100));
    } else {
      setDischargePath('chip');
      // Direct ESD hit causes significant damage
      const damage = Math.min((esdVoltage / 100), 50);
      setChipDamage(prev => Math.min(prev + damage, 100));
    }
  }, [hasProtection, esdVoltage]);

  const resetSimulation = () => {
    setChipDamage(0);
    setDischargePath(null);
    setAnimationTime(0);
    setIsDischarging(false);
  };

  const predictions = [
    { id: 'nothing', label: 'Nothing - chips are immune to static electricity' },
    { id: 'damage', label: 'The static shock instantly destroys internal circuits' },
    { id: 'protection', label: 'Special protection circuits safely divert the energy' },
    { id: 'reset', label: 'The chip just resets and continues working' },
  ];

  const twistPredictions = [
    { id: 'slow', label: 'ESD protection can be slow since static is rare' },
    { id: 'fast', label: 'ESD circuits must activate in nanoseconds to be effective' },
    { id: 'manual', label: 'Protection requires manual activation by the user' },
    { id: 'always', label: 'Protection circuits are always conducting' },
  ];

  const transferApplications = [
    {
      title: 'USB Port Protection',
      description: 'Every USB port has ESD diodes to handle static from cable insertion. They must protect data lines while allowing high-speed signals.',
      icon: '🔌',
    },
    {
      title: 'Touchscreen Controllers',
      description: 'Your finger touching the screen can discharge thousands of volts. The touch IC has robust ESD protection on every input line.',
      icon: '📱',
    },
    {
      title: 'Automotive ECUs',
      description: 'Car electronics face harsh ESD from door handles, ignition, and dry air. ISO 10605 requires survival of 15kV+ discharges.',
      icon: '🚗',
    },
    {
      title: 'Industrial Sensors',
      description: 'Factory sensors near motors and welding face extreme ESD. Multi-stage protection with TVS diodes and spark gaps is common.',
      icon: '🏭',
    },
  ];

  const testQuestions = [
    {
      question: 'What is ESD (Electrostatic Discharge)?',
      options: [
        { text: 'A slow buildup of electrical charge over time', correct: false },
        { text: 'A sudden flow of electricity between charged objects', correct: true },
        { text: 'A type of battery discharge', correct: false },
        { text: 'Electromagnetic interference', correct: false },
      ],
    },
    {
      question: 'What voltage can a typical human body discharge?',
      options: [
        { text: '10-50 volts', correct: false },
        { text: '100-500 volts', correct: false },
        { text: '2,000-15,000+ volts', correct: true },
        { text: 'Less than 5 volts', correct: false },
      ],
    },
    {
      question: 'What is the Human Body Model (HBM) in ESD testing?',
      options: [
        { text: 'A model of how humans interact with devices', correct: false },
        { text: 'A standardized ESD test simulating human discharge', correct: true },
        { text: 'A thermal model of body temperature effects', correct: false },
        { text: 'A mechanical stress model', correct: false },
      ],
    },
    {
      question: 'How do clamping diodes protect circuits?',
      options: [
        { text: 'They block all current from entering', correct: false },
        { text: 'They provide a low-resistance path to ground when voltage exceeds threshold', correct: true },
        { text: 'They store the ESD energy in a capacitor', correct: false },
        { text: 'They reflect the ESD back to the source', correct: false },
      ],
    },
    {
      question: 'Why must ESD protection circuits respond in nanoseconds?',
      options: [
        { text: 'For user interface responsiveness', correct: false },
        { text: 'ESD events have extremely fast rise times (< 1ns)', correct: true },
        { text: 'To save battery power', correct: false },
        { text: 'To meet USB speed requirements', correct: false },
      ],
    },
    {
      question: 'What is a TVS (Transient Voltage Suppressor) diode?',
      options: [
        { text: 'A standard signal diode', correct: false },
        { text: 'A specialized diode designed to absorb voltage transients', correct: true },
        { text: 'A type of LED', correct: false },
        { text: 'A power supply regulator', correct: false },
      ],
    },
    {
      question: 'Why is ESD protection challenging for high-speed interfaces?',
      options: [
        { text: 'High-speed signals are too fast to protect', correct: false },
        { text: 'Protection capacitance can distort fast signals', correct: true },
        { text: 'High-speed interfaces are immune to ESD', correct: false },
        { text: 'The wires are too thin', correct: false },
      ],
    },
    {
      question: 'What happens to a chip without ESD protection during discharge?',
      options: [
        { text: 'It safely absorbs the energy', correct: false },
        { text: 'Gate oxide breakdown and junction damage can occur', correct: true },
        { text: 'It converts the energy to light', correct: false },
        { text: 'Nothing, modern chips are inherently protected', correct: false },
      ],
    },
    {
      question: 'Where are ESD protection structures typically located on a chip?',
      options: [
        { text: 'In the center of the die', correct: false },
        { text: 'At every I/O pad around the chip perimeter', correct: true },
        { text: 'Only on power pins', correct: false },
        { text: 'In a separate protection chip', correct: false },
      ],
    },
    {
      question: 'What is the typical clamping voltage of on-chip ESD protection?',
      options: [
        { text: 'Equal to the ESD voltage (thousands of volts)', correct: false },
        { text: 'Just above the supply voltage (a few volts)', correct: true },
        { text: 'Zero volts', correct: false },
        { text: 'Negative voltage', correct: false },
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

  const renderVisualization = (showTiming: boolean = false) => {
    const width = 400;
    const height = 340;

    // Spark animation
    const sparkIntensity = isDischarging ? Math.max(0, 1 - animationTime / 15) : 0;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.spark} />
            <stop offset="100%" stopColor={colors.human} />
          </linearGradient>
          <filter id="sparkGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="chipGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
          ESD Protection Circuit
        </text>

        {/* Human hand/finger */}
        <g transform="translate(50, 80)">
          <ellipse cx="30" cy="40" rx="20" ry="35" fill={colors.human} opacity="0.8" />
          <text x="30" y="100" fill={colors.textMuted} fontSize="10" textAnchor="middle">Human</text>
          <text x="30" y="112" fill={colors.human} fontSize="9" textAnchor="middle">{esdVoltage}V</text>
        </g>

        {/* ESD discharge path */}
        {sparkIntensity > 0 && (
          <g filter="url(#sparkGlow)">
            <path
              d={`M 100 120 L 130 115 L 120 125 L 160 120 L 150 130 L ${hasProtection ? '200 160' : '220 180'}`}
              fill="none"
              stroke="url(#sparkGrad)"
              strokeWidth={3 + sparkIntensity * 4}
              opacity={sparkIntensity}
            />
            {/* Spark particles */}
            {Array.from({ length: 8 }, (_, i) => {
              const t = (animationTime + i * 3) % 20;
              const x = 100 + t * 6 + Math.sin(i) * 10;
              const y = 120 + Math.cos(t + i) * 20;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2 + Math.random() * 2}
                  fill={colors.spark}
                  opacity={sparkIntensity * 0.8}
                />
              );
            })}
          </g>
        )}

        {/* Input pin */}
        <rect x="180" y="140" width="40" height="10" fill={colors.circuit} />
        <text x="200" y="160" fill={colors.textMuted} fontSize="8" textAnchor="middle">I/O Pin</text>

        {/* ESD Protection diodes (if enabled) */}
        {hasProtection && (
          <g>
            {/* Upper diode to VDD */}
            <polygon points="200,130 210,115 190,115" fill={colors.diode} />
            <line x1="190" y1="115" x2="210" y2="115" stroke={colors.diode} strokeWidth="2" />
            <line x1="200" y1="115" x2="200" y2="95" stroke={colors.diode} strokeWidth="2" />
            <text x="200" y="88" fill={colors.diode} fontSize="8" textAnchor="middle">VDD</text>

            {/* Lower diode to GND */}
            <polygon points="200,175 190,190 210,190" fill={colors.diode} />
            <line x1="190" y1="190" x2="210" y2="190" stroke={colors.diode} strokeWidth="2" />
            <line x1="200" y1="190" x2="200" y2="210" stroke={colors.diode} strokeWidth="2" />
            <line x1="185" y1="210" x2="215" y2="210" stroke={colors.diode} strokeWidth="3" />
            <text x="200" y="225" fill={colors.textMuted} fontSize="8" textAnchor="middle">GND</text>

            {/* Current flow indicator when discharging */}
            {isDischarging && dischargePath === 'diode' && (
              <g>
                <circle cx="200" cy={130 - (animationTime % 10) * 3} r="3" fill={colors.spark} opacity={0.8} />
                <circle cx="200" cy={175 + (animationTime % 10) * 3} r="3" fill={colors.spark} opacity={0.8} />
              </g>
            )}
          </g>
        )}

        {/* Internal chip circuitry */}
        <rect x="240" y="120" width="100" height="80" fill="rgba(99, 102, 241, 0.3)" rx="4" stroke={colors.circuit} strokeWidth="2" />
        <text x="290" y="155" fill={colors.textPrimary} fontSize="10" textAnchor="middle">Internal</text>
        <text x="290" y="170" fill={colors.textPrimary} fontSize="10" textAnchor="middle">Circuits</text>

        {/* Damage indicator */}
        {chipDamage > 0 && (
          <g>
            <rect
              x="240"
              y="120"
              width="100"
              height="80"
              fill={colors.error}
              rx="4"
              opacity={chipDamage / 200}
            />
            {chipDamage > 30 && (
              <text x="290" y="190" fill={colors.error} fontSize="8" textAnchor="middle">
                Damage: {chipDamage.toFixed(0)}%
              </text>
            )}
          </g>
        )}

        {/* Wire to chip */}
        <line x1="220" y1="145" x2="240" y2="160" stroke={colors.circuit} strokeWidth="2" />

        {/* Status indicator */}
        <g transform="translate(20, 240)">
          <rect x="0" y="0" width="120" height="60" fill={colors.bgCard} rx="8" />
          <text x="60" y="20" fill={colors.textMuted} fontSize="10" textAnchor="middle">Protection</text>
          <text x="60" y="45" fill={hasProtection ? colors.success : colors.error} fontSize="14" textAnchor="middle" fontWeight="bold">
            {hasProtection ? 'ENABLED' : 'DISABLED'}
          </text>
        </g>

        {/* Timing indicator for twist */}
        {showTiming && (
          <g transform="translate(280, 240)">
            <rect x="0" y="0" width="100" height="60" fill={colors.bgCard} rx="8" />
            <text x="50" y="20" fill={colors.textMuted} fontSize="10" textAnchor="middle">Response</text>
            <text x="50" y="45" fill={colors.warning} fontSize="14" textAnchor="middle" fontWeight="bold">
              {responseTime}ns
            </text>
          </g>
        )}

        {/* Voltage display */}
        <g transform="translate(150, 240)">
          <rect x="0" y="0" width="120" height="60" fill={colors.bgCard} rx="8" />
          <text x="60" y="20" fill={colors.textMuted} fontSize="10" textAnchor="middle">ESD Voltage</text>
          <text x="60" y="45" fill={colors.spark} fontSize="14" textAnchor="middle" fontWeight="bold">
            {esdVoltage}V
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        How Does a Chip Survive a Static Shock?
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
        You can build up 15,000 volts just walking across carpet. Yet your phone survives your touch every time. How?
      </p>
      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Invisible Shield</h3>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Every chip has protection circuits that can absorb thousands of volts in nanoseconds. Without them, static electricity would destroy electronics instantly.
        </p>
      </div>
      {renderVisualization()}
      <button
        onClick={() => onPhaseComplete?.()}
        style={primaryButtonStyle}
      >
        Explore ESD Protection
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
          When you touch a chip's I/O pin with 2,000+ volts of static charge, what happens?
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
                ? (p.id === 'protection' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: prediction === p.id ? (p.id === 'protection' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {prediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'protection' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: prediction === 'protection' ? colors.success : colors.warning }}>
            {prediction === 'protection'
              ? 'Correct! ESD protection diodes clamp the voltage and divert current safely to ground or power rails.'
              : 'Not quite. Without protection, ESD would cause damage - but modern chips have built-in protection circuits at every pin.'}
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
        ESD Discharge Simulator
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        Toggle protection and trigger ESD events to see the difference
      </p>

      {renderVisualization()}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          ESD Voltage: {esdVoltage}V
        </label>
        <input
          type="range"
          min="500"
          max="15000"
          step="500"
          value={esdVoltage}
          onChange={(e) => setEsdVoltage(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setHasProtection(!hasProtection)}
          style={{
            ...secondaryButtonStyle,
            flex: 1,
            background: hasProtection ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            borderColor: hasProtection ? colors.success : colors.error,
          }}
        >
          Protection: {hasProtection ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={triggerDischarge}
          disabled={isDischarging}
          style={{
            ...primaryButtonStyle,
            flex: 1,
            opacity: isDischarging ? 0.5 : 1,
          }}
        >
          {isDischarging ? 'Discharging...' : 'Trigger ESD'}
        </button>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={resetSimulation} style={secondaryButtonStyle}>
          Reset Damage
        </button>
      </div>

      <div style={{ marginTop: '20px', background: colors.bgCard, borderRadius: '8px', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: colors.textMuted }}>Chip Health:</span>
          <span style={{ color: chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success, fontWeight: 'bold' }}>
            {(100 - chipDamage).toFixed(0)}%
          </span>
        </div>
        <div style={{ marginTop: '8px', height: '8px', background: '#1f2937', borderRadius: '4px' }}>
          <div
            style={{
              height: '100%',
              width: `${100 - chipDamage}%`,
              background: chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {chipDamage > 80 && (
        <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ color: colors.error, margin: 0 }}>
            Critical damage! Without ESD protection, the chip would be destroyed.
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
        Understanding ESD Protection
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Human Body Model (HBM)</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          2kV - 15kV+
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
          Typical static discharge from human touch
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { icon: '🛡️', title: 'Clamping Diodes', desc: 'Pairs of diodes to VDD and GND create a voltage clamp window' },
          { icon: '⚡', title: 'Fast Response', desc: 'Protection must activate in nanoseconds before damage occurs' },
          { icon: '📍', title: 'Every Pin', desc: 'Protection structures exist at every I/O pad on the chip' },
          { icon: '🔄', title: 'Energy Routing', desc: 'ESD current is safely routed through power rails, not circuits' },
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
        Discover the Speed Challenge
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
        The Speed Twist
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        How fast must ESD protection respond?
      </p>

      <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          An ESD event rises from 0V to thousands of volts in under a nanosecond. What does this mean for protection circuits?
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
                ? (p.id === 'fast' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: twistPrediction === p.id ? (p.id === 'fast' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'fast' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: twistPrediction === 'fast' ? colors.success : colors.warning }}>
            {twistPrediction === 'fast'
              ? 'Correct! ESD rises in < 1ns, so protection must respond faster than that or the voltage spike reaches internal circuits first.'
              : 'ESD events are incredibly fast - protection circuits must be even faster, responding in sub-nanosecond timescales.'}
          </p>
        </div>
      )}

      {twistPrediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          Explore Response Time
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Response Time Explorer
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        ESD protection must balance speed and signal integrity
      </p>

      {renderVisualization(true)}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Response Time: {responseTime}ns
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={responseTime}
          onChange={(e) => setResponseTime(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>ESD Rise Time</div>
          <div style={{ color: colors.spark, fontSize: '20px', fontWeight: 'bold' }}>0.7ns</div>
          <div style={{ color: colors.textMuted, fontSize: '10px' }}>Typical HBM</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Protection Status</div>
          <div style={{ color: responseTime < 1 ? colors.success : colors.error, fontSize: '14px', fontWeight: 'bold' }}>
            {responseTime < 1 ? 'PROTECTED' : 'TOO SLOW'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px' }}>
        <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
          <strong style={{ color: colors.warning }}>Trade-off:</strong> Faster protection requires larger structures with more capacitance, which can affect high-speed signal integrity.
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
        The ESD Design Challenge
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          Fast Enough, But Not Too Big
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
          ESD structures add capacitance that can slow down signals
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🐇</div>
          <div style={{ color: colors.success, fontWeight: 'bold' }}>Fast Response</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Big diodes, high capacitance</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📶</div>
          <div style={{ color: colors.circuit, fontWeight: 'bold' }}>Signal Quality</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Small diodes, low capacitance</div>
        </div>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Design Solutions</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
          <li>Multi-stage protection: fast primary + robust secondary</li>
          <li>Silicon-controlled rectifiers (SCRs) for high current capability</li>
          <li>Low-capacitance TVS diodes for high-speed interfaces</li>
          <li>Careful layout to minimize parasitic inductance</li>
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
            {testScore >= 7 ? 'Excellent! You understand ESD protection!' : 'Review the concepts and try again.'}
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
        ESD Protection Master!
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        You now understand how chips survive the invisible threat of static electricity.
      </p>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>ESD can reach 2,000-15,000+ volts from human touch</li>
          <li style={{ marginBottom: '8px' }}>Clamping diodes route current safely to power rails</li>
          <li style={{ marginBottom: '8px' }}>Protection must respond in sub-nanosecond timescales</li>
          <li style={{ marginBottom: '8px' }}>Every I/O pin has dedicated protection structures</li>
          <li>Design trade-off: protection strength vs. signal speed</li>
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

export default ESDProtectionRenderer;
