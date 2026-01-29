import React, { useState, useEffect, useCallback } from 'react';

interface CoupledPendulumsRendererProps {
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
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pendulum1: '#3b82f6',
  pendulum2: '#f59e0b',
  spring: '#10b981',
  energy1: '#3b82f6',
  energy2: '#f59e0b',
};

interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

const CoupledPendulumsRenderer: React.FC<CoupledPendulumsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [pendulum, setPendulum] = useState<PendulumState>({
    theta1: 0.5,
    theta2: 0,
    omega1: 0,
    omega2: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [coupling, setCoupling] = useState(0.5); // Spring coupling strength
  const [initialMode, setInitialMode] = useState<'one' | 'symmetric' | 'antisymmetric'>('one');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics constants
  const g = 9.81;
  const length = 1.0;
  const naturalFreq = Math.sqrt(g / length);

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: PendulumState): PendulumState => {
    // Equations of motion for coupled pendulums
    // d²θ₁/dt² = -ω₀²sin(θ₁) + k(θ₂ - θ₁)
    // d²θ₂/dt² = -ω₀²sin(θ₂) + k(θ₁ - θ₂)

    const k = coupling * naturalFreq * naturalFreq; // Coupling constant

    // Use small angle approximation for stability
    const alpha1 = -naturalFreq * naturalFreq * state.theta1 + k * (state.theta2 - state.theta1);
    const alpha2 = -naturalFreq * naturalFreq * state.theta2 + k * (state.theta1 - state.theta2);

    // Euler integration with damping
    const damping = 0.001;
    const newOmega1 = state.omega1 * (1 - damping) + alpha1 * dt;
    const newOmega2 = state.omega2 * (1 - damping) + alpha2 * dt;
    const newTheta1 = state.theta1 + newOmega1 * dt;
    const newTheta2 = state.theta2 + newOmega2 * dt;

    return {
      theta1: newTheta1,
      theta2: newTheta2,
      omega1: newOmega1,
      omega2: newOmega2,
    };
  }, [coupling, naturalFreq]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.02;
    const interval = setInterval(() => {
      setPendulum(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 20);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset based on initial mode
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);

    if (initialMode === 'one') {
      // Only first pendulum displaced
      setPendulum({ theta1: 0.5, theta2: 0, omega1: 0, omega2: 0 });
    } else if (initialMode === 'symmetric') {
      // Both displaced in same direction (in-phase mode)
      setPendulum({ theta1: 0.4, theta2: 0.4, omega1: 0, omega2: 0 });
    } else {
      // Displaced in opposite directions (anti-phase mode)
      setPendulum({ theta1: 0.4, theta2: -0.4, omega1: 0, omega2: 0 });
    }
  }, [initialMode]);

  useEffect(() => {
    resetSimulation();
  }, [initialMode, resetSimulation]);

  // Calculate energies
  const getEnergies = useCallback(() => {
    const m = 1;
    const KE1 = 0.5 * m * length * length * pendulum.omega1 * pendulum.omega1;
    const KE2 = 0.5 * m * length * length * pendulum.omega2 * pendulum.omega2;
    const PE1 = m * g * length * (1 - Math.cos(pendulum.theta1));
    const PE2 = m * g * length * (1 - Math.cos(pendulum.theta2));

    // Spring potential energy
    const k = coupling * naturalFreq * naturalFreq * m * length * length;
    const springPE = 0.5 * k * Math.pow(pendulum.theta2 - pendulum.theta1, 2);

    const total1 = KE1 + PE1;
    const total2 = KE2 + PE2;

    return { total1, total2, spring: springPE, total: total1 + total2 + springPE };
  }, [pendulum, coupling, naturalFreq, g, length]);

  const predictions = [
    { id: 'stays', label: 'First pendulum keeps swinging, second stays still' },
    { id: 'transfer', label: 'Energy gradually transfers to second pendulum' },
    { id: 'chaos', label: 'Both pendulums swing chaotically' },
    { id: 'sync', label: 'Both immediately swing together in sync' },
  ];

  const twistPredictions = [
    { id: 'faster', label: 'Energy transfers faster between pendulums' },
    { id: 'slower', label: 'Energy transfers slower between pendulums' },
    { id: 'same', label: 'Transfer rate stays the same' },
    { id: 'none', label: 'Energy stops transferring completely' },
  ];

  const transferApplications = [
    {
      title: 'Coupled Power Lines',
      description: 'Parallel power lines can oscillate together when wind excites one line. Engineers design spacers to control this coupling.',
      question: 'Why do engineers add spacer dampers to parallel power lines?',
      answer: 'Spacer dampers control the coupling between lines, preventing large-amplitude synchronized oscillations that could cause galloping or conductor clash.',
    },
    {
      title: 'Molecular Vibrations',
      description: 'In molecules like CO₂, the carbon and oxygen atoms act as coupled oscillators. Energy transfers between different vibrational modes.',
      question: 'How does coupled oscillator theory explain infrared absorption in CO₂?',
      answer: 'The symmetric and antisymmetric stretching modes absorb different IR frequencies. The coupling determines which modes are IR-active, making CO₂ a greenhouse gas.',
    },
    {
      title: 'Acoustic Beats',
      description: 'Two tuning forks of slightly different frequencies produce beats - periodic variations in loudness as they go in and out of phase.',
      question: 'Why do beat frequencies equal the difference between two frequencies?',
      answer: 'The coupled air creates interference. When waves align (constructive), sound is loud; when opposite (destructive), it\'s quiet. This cycles at the frequency difference.',
    },
    {
      title: 'Wilberforce Pendulum',
      description: 'A mass on a spring that can both bounce and twist exhibits coupled oscillations between vertical and torsional motion.',
      question: 'What determines whether a Wilberforce pendulum shows energy exchange?',
      answer: 'Energy transfer requires the bounce and twist frequencies to be nearly equal (resonance). The spring geometry couples these modes, causing periodic exchange.',
    },
  ];

  const testQuestions = [
    {
      question: 'When one of two identical coupled pendulums is displaced and released, what happens to the energy?',
      options: [
        { text: 'Stays in the first pendulum', correct: false },
        { text: 'Gradually transfers back and forth between pendulums', correct: true },
        { text: 'Immediately splits equally between both', correct: false },
        { text: 'Dissipates into the coupling spring', correct: false },
      ],
    },
    {
      question: 'What is the "beat frequency" in coupled pendulums?',
      options: [
        { text: 'The average frequency of both pendulums', correct: false },
        { text: 'The difference between normal mode frequencies', correct: true },
        { text: 'The frequency of the coupling spring', correct: false },
        { text: 'The natural frequency of a single pendulum', correct: false },
      ],
    },
    {
      question: 'What are "normal modes" in coupled oscillators?',
      options: [
        { text: 'The most common ways pendulums swing', correct: false },
        { text: 'Patterns where all parts oscillate at the same frequency', correct: true },
        { text: 'The modes that require the least energy', correct: false },
        { text: 'Patterns that only occur when damping is zero', correct: false },
      ],
    },
    {
      question: 'In the symmetric (in-phase) normal mode of coupled pendulums, how does the spring behave?',
      options: [
        { text: 'Stretches and compresses maximally', correct: false },
        { text: 'Remains at its natural length (no stretching)', correct: true },
        { text: 'Oscillates at double the pendulum frequency', correct: false },
        { text: 'Stores all the system\'s energy', correct: false },
      ],
    },
    {
      question: 'Why does increasing coupling strength affect energy transfer rate?',
      options: [
        { text: 'Stronger spring provides more resistance to motion', correct: false },
        { text: 'Larger frequency difference between normal modes means faster beats', correct: true },
        { text: 'More coupling reduces the total system energy', correct: false },
        { text: 'Coupling strength doesn\'t affect transfer rate', correct: false },
      ],
    },
    {
      question: 'If you start both pendulums displaced equally in the same direction, what happens?',
      options: [
        { text: 'They immediately begin energy exchange', correct: false },
        { text: 'They continue swinging in phase forever (pure normal mode)', correct: true },
        { text: 'The coupling causes them to slow down quickly', correct: false },
        { text: 'They swing out of phase due to spring coupling', correct: false },
      ],
    },
    {
      question: 'What causes the energy to transfer back from the second pendulum to the first?',
      options: [
        { text: 'Gravity pulls energy back to the first pendulum', correct: false },
        { text: 'The phase relationship reverses as beats continue', correct: true },
        { text: 'The spring recoils after maximum stretch', correct: false },
        { text: 'Energy doesn\'t actually transfer back', correct: false },
      ],
    },
    {
      question: 'The antisymmetric (out-of-phase) mode has a higher frequency than symmetric mode because:',
      options: [
        { text: 'The spring adds restoring force when pendulums oppose', correct: true },
        { text: 'Opposite motion creates destructive interference', correct: false },
        { text: 'The effective mass decreases in antisymmetric motion', correct: false },
        { text: 'Air resistance is lower for opposite motion', correct: false },
      ],
    },
    {
      question: 'Two pendulum clocks on the same shelf can synchronize over time. This is due to:',
      options: [
        { text: 'Identical manufacturing tolerances', correct: false },
        { text: 'Weak coupling through the shelf allowing energy exchange', correct: true },
        { text: 'Temperature equilibration of the room', correct: false },
        { text: 'Electromagnetic interactions between clock mechanisms', correct: false },
      ],
    },
    {
      question: 'What determines how long it takes for complete energy transfer between coupled pendulums?',
      options: [
        { text: 'The total initial energy of the system', correct: false },
        { text: 'The pendulum length', correct: false },
        { text: 'The inverse of the coupling strength (weaker = longer)', correct: true },
        { text: 'The mass of the pendulum bobs', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;
    const pivotY = 60;
    const pendulumLength = 150;
    const bobRadius = 20;

    // Calculate bob positions
    const x1 = width * 0.3 + pendulumLength * Math.sin(pendulum.theta1);
    const y1 = pivotY + pendulumLength * Math.cos(pendulum.theta1);
    const x2 = width * 0.7 + pendulumLength * Math.sin(pendulum.theta2);
    const y2 = pivotY + pendulumLength * Math.cos(pendulum.theta2);

    // Calculate coupling spring position (at 40% of pendulum length)
    const springY = pivotY + pendulumLength * 0.4;
    const spring1X = width * 0.3 + pendulumLength * 0.4 * Math.sin(pendulum.theta1);
    const spring2X = width * 0.7 + pendulumLength * 0.4 * Math.sin(pendulum.theta2);

    // Generate spring path
    const generateSpringPath = () => {
      const numCoils = 10;
      const amplitude = 8;
      const dx = (spring2X - spring1X) / numCoils;

      let path = `M ${spring1X} ${springY}`;
      for (let i = 0; i < numCoils; i++) {
        const x = spring1X + dx * (i + 0.5);
        const yOffset = i % 2 === 0 ? amplitude : -amplitude;
        path += ` L ${x} ${springY + yOffset}`;
      }
      path += ` L ${spring2X} ${springY}`;
      return path;
    };

    // Get energies for display
    const energies = getEnergies();
    const maxEnergy = energies.total || 1;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Support beam */}
          <rect x={width * 0.2} y={pivotY - 10} width={width * 0.6} height={10} fill="#475569" rx={3} />

          {/* Pivot points */}
          <circle cx={width * 0.3} cy={pivotY} r={6} fill="#64748b" />
          <circle cx={width * 0.7} cy={pivotY} r={6} fill="#64748b" />

          {/* Coupling spring */}
          <path
            d={generateSpringPath()}
            fill="none"
            stroke={colors.spring}
            strokeWidth={2}
          />

          {/* Pendulum 1 rod */}
          <line
            x1={width * 0.3}
            y1={pivotY}
            x2={x1}
            y2={y1}
            stroke="#64748b"
            strokeWidth={4}
          />

          {/* Pendulum 2 rod */}
          <line
            x1={width * 0.7}
            y1={pivotY}
            x2={x2}
            y2={y2}
            stroke="#64748b"
            strokeWidth={4}
          />

          {/* Pendulum 1 bob */}
          <circle
            cx={x1}
            cy={y1}
            r={bobRadius}
            fill={colors.pendulum1}
            filter="url(#glow1)"
          />

          {/* Pendulum 2 bob */}
          <circle
            cx={x2}
            cy={y2}
            r={bobRadius}
            fill={colors.pendulum2}
            filter="url(#glow2)"
          />

          {/* Glow filters */}
          <defs>
            <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor={colors.pendulum1} floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor={colors.pendulum2} floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Labels */}
          <text x={width * 0.3} y={height - 40} textAnchor="middle" fill={colors.pendulum1} fontSize={14} fontWeight="bold">
            Pendulum 1
          </text>
          <text x={width * 0.7} y={height - 40} textAnchor="middle" fill={colors.pendulum2} fontSize={14} fontWeight="bold">
            Pendulum 2
          </text>

          {/* Energy bars */}
          <rect x={width * 0.15} y={height - 30} width={width * 0.3} height={12} fill="rgba(255,255,255,0.1)" rx={6} />
          <rect x={width * 0.15} y={height - 30} width={width * 0.3 * (energies.total1 / maxEnergy)} height={12} fill={colors.pendulum1} rx={6} />

          <rect x={width * 0.55} y={height - 30} width={width * 0.3} height={12} fill="rgba(255,255,255,0.1)" rx={6} />
          <rect x={width * 0.55} y={height - 30} width={width * 0.3 * (energies.total2 / maxEnergy)} height={12} fill={colors.pendulum2} rx={6} />

          <text x={width * 0.15} y={height - 35} fill={colors.textMuted} fontSize={10}>Energy</text>
          <text x={width * 0.55} y={height - 35} fill={colors.textMuted} fontSize={10}>Energy</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🔄 Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Coupling Strength: {coupling.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={coupling}
          onChange={(e) => setCoupling(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Initial Condition:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { mode: 'one' as const, label: 'One Displaced' },
            { mode: 'symmetric' as const, label: 'In-Phase' },
            { mode: 'antisymmetric' as const, label: 'Anti-Phase' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setInitialMode(mode)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: initialMode === mode ? colors.accent : 'rgba(255,255,255,0.1)',
                color: initialMode === mode ? 'white' : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Beat Period: ~{(2 * Math.PI / (coupling * naturalFreq)).toFixed(1)}s
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              🔗 The Sympathetic Swings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Two pendulums. One connection. A mysterious dance of energy.
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
                In 1665, Christiaan Huygens noticed something bizarre: two pendulum clocks on the same
                shelf would synchronize their swings over time, even when started differently.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                He called it "an odd kind of sympathy" - but what causes this ghostly connection?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Try displacing just one pendulum and watch what happens to the other...
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two identical pendulums connected by a spring. The left pendulum (blue) is
              pulled to the side. The right pendulum (orange) starts at rest. The energy
              bars show how much energy each pendulum has.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When I release the left pendulum, what will happen?
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
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Coupled Oscillations</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch energy flow between pendulums through the spring coupling
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Start with "One Displaced" - watch energy transfer</li>
              <li>Try "In-Phase" mode - both swing together</li>
              <li>Try "Anti-Phase" mode - they swing opposite</li>
              <li>Increase coupling - energy transfers faster!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'transfer';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Energy gradually transfers back and forth between the two pendulums!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Coupling</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Exchange:</strong> The spring
                connecting the pendulums acts as an energy transfer mechanism. When one pendulum
                swings, it stretches the spring, which pulls on the other pendulum.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Beat Phenomenon:</strong> The energy
                oscillates back and forth at the "beat frequency" - the difference between the two
                natural frequencies of the coupled system.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Normal Modes:</strong> There are two
                special patterns: symmetric (in-phase) where both swing together, and antisymmetric
                (anti-phase) where they swing opposite. Each has its own frequency.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we make the spring stiffer (stronger coupling)?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Same two pendulums, but now imagine we replace the spring with a much stiffer one.
              This creates stronger coupling between the pendulums.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With a stiffer coupling spring, what happens to the energy transfer?
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
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Coupling Strength</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the coupling and observe how it affects energy transfer rate
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the beat period change as you adjust coupling strength. Stronger coupling
              means the two normal mode frequencies are more different, so beats happen faster!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Stronger coupling causes faster energy transfer between pendulums!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 The Mathematics of Beats</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Normal Mode Frequencies:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Symmetric mode: ω₁ = ω₀ (natural frequency)</li>
                <li>Antisymmetric mode: ω₂ = √(ω₀² + 2k) where k is coupling</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Beat Frequency:</strong> The energy
                transfer rate equals |ω₂ - ω₁|. Stronger coupling increases ω₂, making this
                difference larger and beats faster.
              </p>
              <p>
                This is why Huygens' clocks synchronized - weak coupling through the shelf
                meant very slow energy exchange, eventually locking them in phase.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Coupled oscillators are everywhere in nature and engineering
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  💭 {app.question}
                </p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered coupled oscillations!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(139, 92, 246, 0.2)'
                      : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered the physics of coupled oscillators
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Energy transfer between coupled oscillators</li>
              <li>Beat frequency from normal mode superposition</li>
              <li>Symmetric and antisymmetric normal modes</li>
              <li>Effect of coupling strength on transfer rate</li>
              <li>Phase relationships and synchronization</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Coupled oscillators appear in quantum mechanics (molecular vibrations),
              electronics (coupled resonators), biology (neural oscillators), and even
              social systems (synchronized applause). The mathematics you've learned
              scales from atoms to galaxies!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default CoupledPendulumsRenderer;
