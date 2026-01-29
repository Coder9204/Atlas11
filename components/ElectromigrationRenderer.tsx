'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ElectromigrationRendererProps {
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
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  copper: '#b87333',
  electron: '#60a5fa',
  atom: '#fbbf24',
  void: '#1f2937',
};

const ElectromigrationRenderer: React.FC<ElectromigrationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [currentDensity, setCurrentDensity] = useState(5); // MA/cm^2
  const [temperature, setTemperature] = useState(85); // Celsius
  const [wireWidth, setWireWidth] = useState(100); // nm
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [voidFormation, setVoidFormation] = useState(0);
  const [hillockFormation, setHillockFormation] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // MTTF calculation (Black's equation)
  const calculateMTTF = useCallback(() => {
    // Black's equation: MTTF = A * J^(-n) * exp(Ea / kT)
    // Simplified for demonstration
    const J = currentDensity; // MA/cm^2
    const T = temperature + 273; // Kelvin
    const Ea = 0.7; // eV (activation energy for Cu)
    const k = 8.617e-5; // eV/K (Boltzmann constant)
    const n = 2; // current exponent
    const A = 1e12; // constant

    const mttf = A * Math.pow(J, -n) * Math.exp(Ea / (k * T));
    return Math.min(mttf / 1e6, 1000); // Convert to years, cap at 1000
  }, [currentDensity, temperature]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);
      // Simulate void/hillock growth based on current density and temperature
      const growthRate = (currentDensity / 10) * (1 + (temperature - 25) / 100) * 0.01;
      setVoidFormation(prev => Math.min(prev + growthRate, 100));
      setHillockFormation(prev => Math.min(prev + growthRate * 0.8, 100));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, currentDensity, temperature]);

  const mttf = calculateMTTF();

  const predictions = [
    { id: 'heat', label: 'Excessive heat melts the wires over time' },
    { id: 'electromigration', label: 'Electrons push metal atoms, creating voids and failures' },
    { id: 'oxidation', label: 'Oxygen in the chip corrodes the copper wires' },
    { id: 'vibration', label: 'Mechanical vibration causes metal fatigue' },
  ];

  const twistPredictions = [
    { id: 'linear', label: 'Higher temperature increases failure rate linearly' },
    { id: 'exponential', label: 'Higher temperature exponentially accelerates failure' },
    { id: 'none', label: 'Temperature has no effect on electromigration' },
    { id: 'helps', label: 'Higher temperature actually improves reliability' },
  ];

  const transferApplications = [
    {
      title: 'CPU Design Rules',
      description: 'Modern CPUs use strict current density limits (max ~2 MA/cm^2) and wide power traces. Chip designers must balance performance vs. reliability.',
      icon: '💻',
    },
    {
      title: 'Automotive Electronics',
      description: 'Cars operate in extreme temperatures (-40 to 125C). Engineers use copper alloys and redundant paths to ensure 15+ year lifespans.',
      icon: '🚗',
    },
    {
      title: 'Data Center Reliability',
      description: 'Server CPUs run 24/7 at high loads. Active cooling and derating strategies keep current densities safe for multi-year operation.',
      icon: '🖥️',
    },
    {
      title: 'LED Driver ICs',
      description: 'LED drivers carry high currents in small packages. Layout rules mandate wide metal traces and multiple vias to prevent early failure.',
      icon: '💡',
    },
  ];

  const testQuestions = [
    {
      question: 'What is electromigration?',
      options: [
        { text: 'Movement of metal atoms due to electron momentum transfer', correct: true },
        { text: 'Migration of electricity through a conductor', correct: false },
        { text: 'Electrons leaving the conductor entirely', correct: false },
        { text: 'Magnetic field effects on current flow', correct: false },
      ],
    },
    {
      question: 'What physical defects does electromigration cause?',
      options: [
        { text: 'Color changes in the metal', correct: false },
        { text: 'Voids (gaps) and hillocks (bumps) in the conductor', correct: true },
        { text: 'Increased conductivity', correct: false },
        { text: 'Stronger atomic bonds', correct: false },
      ],
    },
    {
      question: 'According to Black\'s equation, how does current density affect MTTF?',
      options: [
        { text: 'MTTF is proportional to J^2 (increases with current)', correct: false },
        { text: 'MTTF is proportional to J^-2 (decreases rapidly with current)', correct: true },
        { text: 'MTTF is independent of current density', correct: false },
        { text: 'MTTF increases linearly with current', correct: false },
      ],
    },
    {
      question: 'How does temperature affect electromigration?',
      options: [
        { text: 'No effect on electromigration rate', correct: false },
        { text: 'Linear increase in failure rate', correct: false },
        { text: 'Exponential acceleration of atom migration', correct: true },
        { text: 'Cooling accelerates failures', correct: false },
      ],
    },
    {
      question: 'Why is electromigration worse in smaller chip geometries?',
      options: [
        { text: 'Smaller wires have higher current density for same current', correct: true },
        { text: 'Smaller atoms migrate faster', correct: false },
        { text: 'More oxygen exposure', correct: false },
        { text: 'Lower operating voltages', correct: false },
      ],
    },
    {
      question: 'What metal is most commonly used in modern IC interconnects?',
      options: [
        { text: 'Aluminum', correct: false },
        { text: 'Gold', correct: false },
        { text: 'Copper (with barrier layers)', correct: true },
        { text: 'Silver', correct: false },
      ],
    },
    {
      question: 'What is the typical activation energy (Ea) for copper electromigration?',
      options: [
        { text: 'Around 0.5-0.9 eV', correct: true },
        { text: 'Around 5-10 eV', correct: false },
        { text: 'Zero (no energy barrier)', correct: false },
        { text: 'Negative (releases energy)', correct: false },
      ],
    },
    {
      question: 'How do chip designers mitigate electromigration?',
      options: [
        { text: 'Use thinner wires to reduce heat', correct: false },
        { text: 'Limit current density, use redundant vias, add barrier layers', correct: true },
        { text: 'Increase operating voltage', correct: false },
        { text: 'Remove cooling systems', correct: false },
      ],
    },
    {
      question: 'What does MTTF stand for?',
      options: [
        { text: 'Maximum Time To Failure', correct: false },
        { text: 'Mean Time To Failure', correct: true },
        { text: 'Minimum Time To Failure', correct: false },
        { text: 'Metal Transfer Time Factor', correct: false },
      ],
    },
    {
      question: 'Why do voids cause circuit failure?',
      options: [
        { text: 'They create open circuits when wire breaks completely', correct: true },
        { text: 'They make the chip heavier', correct: false },
        { text: 'They emit radiation', correct: false },
        { text: 'They improve conductivity too much', correct: false },
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
    setVoidFormation(0);
    setHillockFormation(0);
    setAnimationTime(0);
    setIsAnimating(false);
  };

  const renderVisualization = (interactive: boolean, showTemperatureEffect: boolean = false) => {
    const width = 400;
    const height = 300;

    // Generate atoms and electrons
    const atomCount = 20;
    const electronCount = Math.floor(currentDensity * 3);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.copper} />
            <stop offset="100%" stopColor="#cd853f" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
          Copper Interconnect Cross-Section
        </text>

        {/* Wire background */}
        <rect x="50" y="80" width="300" height="60" fill="url(#copperGrad)" rx="4" />
        <text x="200" y="175" fill={colors.textMuted} fontSize="10" textAnchor="middle">
          Copper Wire ({wireWidth}nm wide)
        </text>

        {/* Void formation (anode end) */}
        {voidFormation > 10 && (
          <ellipse
            cx={80 + voidFormation * 0.3}
            cy={110}
            rx={Math.min(voidFormation * 0.4, 25)}
            ry={Math.min(voidFormation * 0.25, 15)}
            fill={colors.void}
            opacity={Math.min(voidFormation / 50, 1)}
          />
        )}
        {voidFormation > 10 && (
          <text x={80 + voidFormation * 0.3} y={110} fill={colors.textPrimary} fontSize="8" textAnchor="middle" opacity={Math.min(voidFormation / 30, 1)}>
            VOID
          </text>
        )}

        {/* Hillock formation (cathode end) */}
        {hillockFormation > 10 && (
          <ellipse
            cx={320 - hillockFormation * 0.2}
            cy={75}
            rx={Math.min(hillockFormation * 0.25, 20)}
            ry={Math.min(hillockFormation * 0.15, 12)}
            fill={colors.atom}
            opacity={Math.min(hillockFormation / 50, 0.8)}
          />
        )}
        {hillockFormation > 10 && (
          <text x={320 - hillockFormation * 0.2} y={72} fill={colors.bgPrimary} fontSize="7" textAnchor="middle" opacity={Math.min(hillockFormation / 30, 1)}>
            HILLOCK
          </text>
        )}

        {/* Copper atoms */}
        {Array.from({ length: atomCount }, (_, i) => {
          const x = 70 + (i % 10) * 26;
          const y = 95 + Math.floor(i / 10) * 30;
          const displacement = isAnimating ? Math.sin(animationTime * 0.1 + i) * (currentDensity * 0.3) : 0;
          return (
            <circle
              key={`atom-${i}`}
              cx={x + displacement}
              cy={y}
              r={6}
              fill={colors.atom}
              opacity={0.8}
            />
          );
        })}

        {/* Electrons flowing */}
        {isAnimating && Array.from({ length: electronCount }, (_, i) => {
          const baseX = ((animationTime * 5 + i * 40) % 280) + 60;
          const y = 90 + (i % 3) * 20;
          return (
            <circle
              key={`electron-${i}`}
              cx={baseX}
              cy={y}
              r={3}
              fill={colors.electron}
              filter="url(#glow)"
            />
          );
        })}

        {/* Current flow arrow */}
        <path d="M 60 200 L 340 200" stroke={colors.electron} strokeWidth="2" markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.electron} />
          </marker>
        </defs>
        <text x="200" y="220" fill={colors.textMuted} fontSize="10" textAnchor="middle">
          Electron Flow Direction (e-)
        </text>
        <text x="80" y="240" fill={colors.error} fontSize="9" textAnchor="middle">
          Cathode (-)
        </text>
        <text x="320" y="240" fill={colors.success} fontSize="9" textAnchor="middle">
          Anode (+)
        </text>

        {/* Atom migration annotation */}
        {isAnimating && (
          <g>
            <path d="M 200 100 L 270 100" stroke={colors.atom} strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#atomArrow)" />
            <defs>
              <marker id="atomArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={colors.atom} />
              </marker>
            </defs>
            <text x="235" y="95" fill={colors.atom} fontSize="8" textAnchor="middle">
              Atom drift
            </text>
          </g>
        )}

        {/* Temperature indicator if showing twist */}
        {showTemperatureEffect && (
          <g>
            <rect x="320" y="30" width="70" height="50" fill="rgba(239, 68, 68, 0.2)" rx="4" />
            <text x="355" y="50" fill={colors.error} fontSize="10" textAnchor="middle">Temp</text>
            <text x="355" y="70" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">{temperature}C</text>
          </g>
        )}
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💀</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        Why Do Chips Eventually Wear Out?
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
        Every microprocessor has a hidden death sentence. Deep inside, billions of electrons are slowly destroying the copper wires...
      </p>
      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Silent Killer</h3>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          At the nanoscale, flowing electrons act like a river eroding its banks. Over time, they physically push metal atoms out of place, creating gaps that break circuits.
        </p>
      </div>
      {renderVisualization(false)}
      <button
        onClick={() => onPhaseComplete?.()}
        style={primaryButtonStyle}
      >
        Investigate Electromigration
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
          What causes copper interconnects in chips to fail over years of use?
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
                ? (p.id === 'electromigration' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: prediction === p.id ? (p.id === 'electromigration' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {prediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'electromigration' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: prediction === 'electromigration' ? colors.success : colors.warning }}>
            {prediction === 'electromigration'
              ? 'Correct! Electromigration is the main reliability concern for chip interconnects.'
              : 'Not quite. While heat plays a role, the primary mechanism is electron momentum transferring to metal atoms.'}
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
        Electromigration Simulator
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        Adjust current density and watch atoms migrate
      </p>

      {renderVisualization(true)}

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Current Density: {currentDensity} MA/cm²
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={currentDensity}
            onChange={(e) => setCurrentDensity(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Wire Width: {wireWidth}nm
          </label>
          <input
            type="range"
            min="20"
            max="200"
            value={wireWidth}
            onChange={(e) => setWireWidth(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={isAnimating ? secondaryButtonStyle : primaryButtonStyle}
        >
          {isAnimating ? 'Pause Simulation' : 'Start Simulation'}
        </button>
        <button onClick={resetSimulation} style={secondaryButtonStyle}>
          Reset
        </button>
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>MTTF</div>
          <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
            {mttf.toFixed(1)} years
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Void Size</div>
          <div style={{ color: colors.error, fontSize: '18px', fontWeight: 'bold' }}>
            {voidFormation.toFixed(0)}%
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Hillock Size</div>
          <div style={{ color: colors.warning, fontSize: '18px', fontWeight: 'bold' }}>
            {hillockFormation.toFixed(0)}%
          </div>
        </div>
      </div>

      {voidFormation > 50 && (
        <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ color: colors.error }}>
            Critical void formation! Wire approaching failure point.
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
        Understanding Electromigration
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Black's Equation</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
          MTTF = A × J⁻ⁿ × e^(Ea/kT)
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
          J = current density, T = temperature, Ea = activation energy
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { icon: '⚡', title: 'Electron Wind', desc: 'High-energy electrons transfer momentum to metal atoms, pushing them along' },
          { icon: '🕳️', title: 'Void Formation', desc: 'Atoms leave behind empty spaces that grow until the wire breaks' },
          { icon: '⛰️', title: 'Hillock Growth', desc: 'Displaced atoms pile up elsewhere, potentially causing shorts' },
          { icon: '📉', title: 'MTTF vs Current', desc: 'Doubling current density reduces lifetime by 4× (J^-2 relationship)' },
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
        Discover the Temperature Effect
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
        The Temperature Twist
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        How does operating temperature affect electromigration?
      </p>

      <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          A chip running at 85°C vs 105°C - how does failure rate change?
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
                ? (p.id === 'exponential' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: twistPrediction === p.id ? (p.id === 'exponential' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'exponential' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: twistPrediction === 'exponential' ? colors.success : colors.warning }}>
            {twistPrediction === 'exponential'
              ? 'Correct! The Arrhenius term (e^(Ea/kT)) means temperature has an exponential effect - a 10°C increase can halve the lifetime!'
              : 'Not quite. Temperature appears in an exponential term - small increases dramatically accelerate atom migration.'}
          </p>
        </div>
      )}

      {twistPrediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          Explore Temperature Effects
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Temperature vs Reliability
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        See how temperature dramatically affects chip lifetime
      </p>

      {renderVisualization(true, true)}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Junction Temperature: {temperature}°C
        </label>
        <input
          type="range"
          min="25"
          max="150"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>MTTF at {temperature}°C</div>
          <div style={{ color: mttf < 10 ? colors.error : colors.success, fontSize: '24px', fontWeight: 'bold' }}>
            {mttf.toFixed(1)} years
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>vs 25°C baseline</div>
          <div style={{ color: colors.warning, fontSize: '24px', fontWeight: 'bold' }}>
            {(calculateMTTF() / (1e12 * Math.pow(currentDensity, -2) * Math.exp(0.7 / (8.617e-5 * 298)) / 1e6) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '12px' }}>
        <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
          <strong style={{ color: colors.error }}>Key insight:</strong> Every 10-15°C increase roughly halves the chip's lifetime!
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
        Thermal Management is Reliability
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          Cooling = Longer Life
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
          Better heatsinks and lower temps directly extend chip reliability
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>❄️</div>
          <div style={{ color: colors.success, fontWeight: 'bold' }}>Cool Operation</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>65°C = 20+ year MTTF</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔥</div>
          <div style={{ color: colors.error, fontWeight: 'bold' }}>Hot Operation</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>105°C = 3-5 year MTTF</div>
        </div>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why This Matters</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
          <li>Gaming laptops throttle to protect chip lifetime</li>
          <li>Data centers invest heavily in cooling infrastructure</li>
          <li>Automotive chips are rated for higher temps but derated</li>
          <li>Overclocking reduces long-term reliability significantly</li>
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
                ✓ Explored
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
            {testScore >= 7 ? 'Excellent! You understand electromigration!' : 'Review the concepts and try again.'}
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
        Electromigration Master!
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        You now understand why chips wear out and how engineers design for reliability.
      </p>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Electrons push metal atoms, creating voids and hillocks</li>
          <li style={{ marginBottom: '8px' }}>MTTF scales with J^-2 (current density is critical)</li>
          <li style={{ marginBottom: '8px' }}>Temperature has exponential effect on failure rate</li>
          <li style={{ marginBottom: '8px' }}>Cooling directly improves chip reliability</li>
          <li>Design rules limit current density for long lifetimes</li>
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

export default ElectromigrationRenderer;
