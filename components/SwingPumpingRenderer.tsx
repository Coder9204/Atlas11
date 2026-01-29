import React, { useState, useEffect, useCallback } from 'react';

interface SwingPumpingRendererProps {
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
  accent: '#ec4899',
  accentGlow: 'rgba(236, 72, 153, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  swing: '#f59e0b',
  person: '#3b82f6',
  energy: '#10b981',
};

interface SwingState {
  theta: number;
  omega: number;
  length: number;
  isPumping: boolean;
  pumpPhase: 'up' | 'down' | 'idle';
}

const SwingPumpingRenderer: React.FC<SwingPumpingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [swing, setSwing] = useState<SwingState>({
    theta: 0.3,
    omega: 0,
    length: 1.5,
    isPumping: false,
    pumpPhase: 'idle',
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [maxAmplitude, setMaxAmplitude] = useState(0.3);

  // Game parameters
  const [pumpMode, setPumpMode] = useState<'none' | 'correct' | 'wrong'>('none');
  const [autoPump, setAutoPump] = useState(false);

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
  const baseLength = 1.5;
  const pumpAmount = 0.2; // How much length changes during pump

  // Physics simulation with parametric pumping
  const updatePhysics = useCallback((dt: number, state: SwingState): SwingState => {
    // Parametric resonance: changing length at the right time adds energy
    let newLength = baseLength;
    let newPumpPhase: 'up' | 'down' | 'idle' = 'idle';

    if (pumpMode === 'correct' || (autoPump && pumpMode !== 'wrong')) {
      // Correct pumping: stand up (shorten) at extremes, squat (lengthen) at bottom
      if (Math.abs(state.theta) > 0.7 * Math.abs(maxAmplitude)) {
        // At extremes - stand up (shorten pendulum)
        newLength = baseLength - pumpAmount;
        newPumpPhase = 'up';
      } else if (Math.abs(state.theta) < 0.3 * Math.abs(maxAmplitude)) {
        // At bottom - squat down (lengthen pendulum)
        newLength = baseLength + pumpAmount;
        newPumpPhase = 'down';
      }
    } else if (pumpMode === 'wrong') {
      // Wrong pumping: opposite timing
      if (Math.abs(state.theta) > 0.7 * Math.abs(maxAmplitude)) {
        // At extremes - squat (wrong!)
        newLength = baseLength + pumpAmount;
        newPumpPhase = 'down';
      } else if (Math.abs(state.theta) < 0.3 * Math.abs(maxAmplitude)) {
        // At bottom - stand (wrong!)
        newLength = baseLength - pumpAmount;
        newPumpPhase = 'up';
      }
    }

    // Angular momentum conservation when length changes
    // L = m * r² * ω is conserved, so ω₂ = ω₁ * (r₁/r₂)²
    const lengthRatio = state.length / newLength;
    const newOmega = state.omega * lengthRatio * lengthRatio;

    // Equation of motion: d²θ/dt² = -(g/L)sin(θ)
    const alpha = -(g / newLength) * Math.sin(state.theta);
    const damping = 0.002;

    const omega = newOmega * (1 - damping) + alpha * dt;
    const theta = state.theta + omega * dt;

    // Track max amplitude
    if (Math.abs(theta) > maxAmplitude) {
      setMaxAmplitude(Math.abs(theta));
    }

    return {
      theta,
      omega,
      length: newLength,
      isPumping: newPumpPhase !== 'idle',
      pumpPhase: newPumpPhase,
    };
  }, [pumpMode, autoPump, maxAmplitude, g, baseLength, pumpAmount]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      setSwing(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setMaxAmplitude(0.3);
    setSwing({
      theta: 0.3,
      omega: 0,
      length: baseLength,
      isPumping: false,
      pumpPhase: 'idle',
    });
  }, [baseLength]);

  // Calculate energy
  const getEnergy = useCallback(() => {
    const m = 1;
    const v = swing.length * swing.omega;
    const KE = 0.5 * m * v * v;
    const PE = m * g * swing.length * (1 - Math.cos(swing.theta));
    return { KE, PE, total: KE + PE };
  }, [swing, g]);

  const predictions = [
    { id: 'always', label: 'Stand up at any time during the swing' },
    { id: 'bottom', label: 'Stand up when passing through the bottom' },
    { id: 'extremes', label: 'Stand up at the highest points (extremes)' },
    { id: 'never', label: 'Pumping doesn\'t work - you need a push' },
  ];

  const twistPredictions = [
    { id: 'stops', label: 'The swing will slow down and eventually stop' },
    { id: 'faster', label: 'The swing will speed up even more' },
    { id: 'same', label: 'No difference - timing doesn\'t matter' },
    { id: 'breaks', label: 'The swing motion becomes unstable' },
  ];

  const transferApplications = [
    {
      title: 'Earthquake Building Resonance',
      description: 'Some earthquake frequencies match building natural frequencies. The ground acts like a "pump" adding energy to the building\'s oscillation.',
      question: 'Why do some buildings survive earthquakes while neighbors collapse?',
      answer: 'Buildings with natural frequencies matching the earthquake\'s dominant frequency experience parametric resonance, amplifying oscillations. Engineers tune building frequencies to avoid common earthquake frequencies.',
    },
    {
      title: 'Laser Cooling of Atoms',
      description: 'Physicists use carefully timed laser pulses to remove energy from atoms, cooling them to near absolute zero - essentially "reverse pumping".',
      question: 'How is laser cooling related to swing pumping?',
      answer: 'Both involve transferring energy at specific phases of oscillation. In pumping, energy is added at the right time. In laser cooling, photon absorption and emission are timed to remove energy from atomic motion.',
    },
    {
      title: 'Surfboard Pumping',
      description: 'Surfers pump their boards to generate speed by shifting weight in sync with the wave - similar to pumping a swing but on a moving surface.',
      question: 'When should a surfer shift their weight to gain the most speed?',
      answer: 'Shift weight forward on the downward part of the pump and backward on the upward part. This matches the phase relationship of swing pumping - timing weight shifts to add energy to the wave-riding motion.',
    },
    {
      title: 'Radio Receivers',
      description: 'AM radio uses parametric amplification. A varying capacitor (like changing swing length) amplifies weak radio signals when varied at twice the signal frequency.',
      question: 'Why must the "pump" frequency be twice the signal frequency in parametric amplifiers?',
      answer: 'Just like standing twice per swing cycle (once at each extreme), the parametric pumping needs two energy inputs per oscillation cycle to constructively add energy at the right phase.',
    },
  ];

  const testQuestions = [
    {
      question: 'To pump a swing effectively, when should you stand up (raise your center of mass)?',
      options: [
        { text: 'When passing through the lowest point', correct: false },
        { text: 'At the highest points of the swing', correct: true },
        { text: 'Continuously throughout the motion', correct: false },
        { text: 'Only when moving forward', correct: false },
      ],
    },
    {
      question: 'Why does standing up at the extremes add energy to a swing?',
      options: [
        { text: 'You push against the air', correct: false },
        { text: 'Angular momentum conservation increases speed when radius decreases', correct: true },
        { text: 'Gravity pulls harder on a standing person', correct: false },
        { text: 'The chains become tighter', correct: false },
      ],
    },
    {
      question: 'What is "parametric resonance"?',
      options: [
        { text: 'Resonance that only works with certain parameters', correct: false },
        { text: 'Energy addition by periodically changing a system parameter', correct: true },
        { text: 'The natural frequency of a parametric equation', correct: false },
        { text: 'Resonance between two parameters of motion', correct: false },
      ],
    },
    {
      question: 'If you pump a swing at the wrong phase (stand at bottom, squat at extremes), what happens?',
      options: [
        { text: 'The swing still speeds up, just more slowly', correct: false },
        { text: 'The swing slows down and loses energy', correct: true },
        { text: 'Nothing changes - timing doesn\'t matter', correct: false },
        { text: 'The swing becomes unstable', correct: false },
      ],
    },
    {
      question: 'How many times should you pump (stand and squat) per complete swing cycle?',
      options: [
        { text: 'Once per cycle', correct: false },
        { text: 'Twice per cycle (once at each extreme)', correct: true },
        { text: 'Four times per cycle', correct: false },
        { text: 'Continuously throughout', correct: false },
      ],
    },
    {
      question: 'What physical principle explains why shortening the pendulum increases angular velocity?',
      options: [
        { text: 'Energy conservation', correct: false },
        { text: 'Conservation of angular momentum (L = Iω)', correct: true },
        { text: 'Newton\'s third law', correct: false },
        { text: 'Conservation of linear momentum', correct: false },
      ],
    },
    {
      question: 'Why do children learn to pump swings without understanding physics?',
      options: [
        { text: 'They have natural physics intuition', correct: false },
        { text: 'Trial and error reinforces the correct phase relationship', correct: true },
        { text: 'Adults teach them the correct timing', correct: false },
        { text: 'Swings are designed to enforce correct pumping', correct: false },
      ],
    },
    {
      question: 'In parametric oscillators, energy is typically added at what frequency relative to natural oscillation?',
      options: [
        { text: 'Same frequency', correct: false },
        { text: 'Twice the natural frequency', correct: true },
        { text: 'Half the natural frequency', correct: false },
        { text: 'Any frequency works', correct: false },
      ],
    },
    {
      question: 'What limits how high a pumped swing can go?',
      options: [
        { text: 'The swing can only go up to 90 degrees', correct: false },
        { text: 'Air resistance and energy lost each cycle exceed energy added', correct: true },
        { text: 'The chains become too tense', correct: false },
        { text: 'Human legs can only push so hard', correct: false },
      ],
    },
    {
      question: 'Which everyday action is most similar to swing pumping?',
      options: [
        { text: 'Bouncing on a trampoline', correct: false },
        { text: 'Walking up stairs', correct: false },
        { text: 'Pumping a skateboard on a halfpipe', correct: true },
        { text: 'Jumping rope', correct: false },
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
    const height = 380;
    const pivotY = 50;
    const scale = 100;

    // Calculate swing position
    const swingLength = swing.length * scale;
    const seatX = width / 2 + swingLength * Math.sin(swing.theta);
    const seatY = pivotY + swingLength * Math.cos(swing.theta);

    // Person dimensions based on pump phase
    const isStanding = swing.pumpPhase === 'up';
    const personHeight = isStanding ? 50 : 35;
    const personWidth = 20;

    // Energy display
    const energy = getEnergy();
    const maxPossibleEnergy = energy.total * 3; // Scale for display

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width={width} height={height} fill="url(#sky)" />

          {/* Support frame */}
          <line x1={width / 2 - 60} y1={pivotY + 20} x2={width / 2} y2={pivotY} stroke="#475569" strokeWidth={6} />
          <line x1={width / 2 + 60} y1={pivotY + 20} x2={width / 2} y2={pivotY} stroke="#475569" strokeWidth={6} />
          <line x1={width / 2 - 70} y1={pivotY + 20} x2={width / 2 + 70} y2={pivotY + 20} stroke="#475569" strokeWidth={4} />

          {/* Pivot */}
          <circle cx={width / 2} cy={pivotY} r={5} fill="#64748b" />

          {/* Swing chains */}
          <line x1={width / 2 - 15} y1={pivotY} x2={seatX - 8} y2={seatY - 5} stroke="#94a3b8" strokeWidth={2} />
          <line x1={width / 2 + 15} y1={pivotY} x2={seatX + 8} y2={seatY - 5} stroke="#94a3b8" strokeWidth={2} />

          {/* Swing seat */}
          <rect
            x={seatX - 15}
            y={seatY - 5}
            width={30}
            height={8}
            rx={2}
            fill={colors.swing}
          />

          {/* Person on swing */}
          <g transform={`translate(${seatX}, ${seatY})`}>
            {/* Legs */}
            <rect x={-8} y={-personHeight + 15} width={6} height={personHeight - 15} rx={2} fill="#64748b" />
            <rect x={2} y={-personHeight + 15} width={6} height={personHeight - 15} rx={2} fill="#64748b" />

            {/* Body */}
            <rect x={-10} y={-personHeight - 10} width={20} height={25} rx={4} fill={colors.person} />

            {/* Head */}
            <circle cx={0} cy={-personHeight - 20} r={10} fill="#fbbf24" />

            {/* Arms holding chains */}
            <line x1={-8} y1={-personHeight - 5} x2={-12} y2={-personHeight - 30} stroke="#fbbf24" strokeWidth={3} />
            <line x1={8} y1={-personHeight - 5} x2={12} y2={-personHeight - 30} stroke="#fbbf24" strokeWidth={3} />
          </g>

          {/* Pump indicator */}
          {swing.isPumping && (
            <text
              x={seatX + 40}
              y={seatY - personHeight}
              fill={swing.pumpPhase === 'up' ? colors.success : colors.warning}
              fontSize={12}
              fontWeight="bold"
            >
              {swing.pumpPhase === 'up' ? '↑ STAND' : '↓ SQUAT'}
            </text>
          )}

          {/* Ground */}
          <rect x={0} y={height - 40} width={width} height={40} fill="#1e293b" />
          <ellipse cx={width / 2} cy={height - 40} rx={80} ry={10} fill="#334155" />

          {/* Energy bar */}
          <rect x={20} y={height - 30} width={100} height={15} rx={4} fill="rgba(255,255,255,0.1)" />
          <rect
            x={20}
            y={height - 30}
            width={Math.min(100, 100 * energy.total / maxPossibleEnergy)}
            height={15}
            rx={4}
            fill={colors.energy}
          />
          <text x={20} y={height - 35} fill={colors.textMuted} fontSize={10}>Energy</text>

          {/* Amplitude indicator */}
          <text x={width - 80} y={height - 20} fill={colors.textSecondary} fontSize={12}>
            Amp: {(maxAmplitude * 180 / Math.PI).toFixed(0)}°
          </text>
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
          Pumping Mode:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { mode: 'none' as const, label: 'No Pumping' },
            { mode: 'correct' as const, label: 'Correct Timing' },
            { mode: 'wrong' as const, label: 'Wrong Timing' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => {
                setPumpMode(mode);
                resetSimulation();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: pumpMode === mode ? colors.accent : 'rgba(255,255,255,0.1)',
                color: pumpMode === mode ? 'white' : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(236, 72, 153, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {pumpMode === 'correct' && 'Energy is being added! Watch the amplitude grow.'}
          {pumpMode === 'wrong' && 'Energy is being removed! Watch the amplitude shrink.'}
          {pumpMode === 'none' && 'Swing oscillates with slight damping.'}
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
              🎢 The Self-Propelled Swing
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How do you pump a swing higher without anyone pushing?
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
                Every child learns to pump a swing - stand, squat, stand, squat. But why does this work?
                No one pushes you, yet you go higher and higher!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The secret lies in precise timing and a physics principle called parametric resonance.
              </p>
            </div>

            <div style={{
              background: 'rgba(236, 72, 153, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Can you figure out when you should stand up to go higher?
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
              A person on a swing. They can stand up (raise their center of mass) or squat down
              (lower it). The energy bar shows the total mechanical energy in the swing system.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 To pump the swing higher, when should you stand up?
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
                    background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Swing Pumping</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare correct vs wrong timing to see parametric resonance in action
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
              <li>"No Pumping" - natural oscillation with damping</li>
              <li>"Correct Timing" - stand at extremes, squat at bottom</li>
              <li>"Wrong Timing" - the opposite (energy removed!)</li>
              <li>Watch the amplitude and energy bar change</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'extremes';

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
              You should stand up at the highest points (extremes) of the swing!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Pumping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Angular Momentum Conservation:</strong> When
                you stand up (shorten the pendulum), angular momentum L = Iω must stay constant. Since
                I decreases (closer to pivot), ω must increase - you speed up!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Why at the Extremes?</strong> At the extremes,
                you have maximum potential energy. Standing up converts some gravitational PE into kinetic
                energy. At the bottom, you already have max KE - squatting stores energy for the next pump.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Parametric Resonance:</strong> This is called
                parametric pumping because you change a parameter (length) at twice the natural frequency
                to add energy with each cycle.
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
              What if you pump with exactly wrong timing?
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
              Instead of standing at the extremes and squatting at the bottom, imagine doing
              the exact opposite: squat at the extremes, stand at the bottom.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What happens with this reversed timing?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Wrong Timing</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare correct timing vs wrong timing and observe the energy changes
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
              Watch what happens to the amplitude with "Wrong Timing" - you're actually
              removing energy from the system! This is called parametric damping.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'stops';

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
              Wrong timing causes the swing to slow down and lose energy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Parametric Damping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Phase Matters:</strong> When you do work
                against the motion instead of with it, you remove energy. Standing at the bottom means
                your muscle work fights the swing's motion rather than enhancing it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Practical Application:</strong> This principle
                is used in vibration damping. By changing stiffness at the right phase, engineers can
                remove unwanted oscillations from structures.
              </p>
              <p>
                This is why children quickly learn the correct timing - wrong timing feels "off" because
                you're working against the natural motion!
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
              Parametric resonance appears in surprising places
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
                background: 'rgba(236, 72, 153, 0.1)',
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
                {testScore >= 8 ? 'You\'ve mastered parametric resonance!' : 'Review the material and try again.'}
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
                      ? 'rgba(236, 72, 153, 0.2)'
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
              You've mastered parametric resonance and swing pumping
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
              <li>Parametric resonance through parameter variation</li>
              <li>Angular momentum conservation in pumping</li>
              <li>Correct phase timing for energy addition</li>
              <li>Parametric damping with wrong phase</li>
              <li>Applications from swings to radio amplifiers</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(236, 72, 153, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Parametric amplification is used in quantum computing to amplify
              signals without adding noise, in MEMS accelerometers for smartphones,
              and even proposed for spacecraft propulsion using solar sails with
              oscillating tilt!
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

export default SwingPumpingRenderer;
