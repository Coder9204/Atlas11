import React, { useState, useEffect, useCallback } from 'react';

interface SleepingTopRendererProps {
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
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  top: '#f59e0b',
  spin: '#3b82f6',
  precession: '#10b981',
};

interface TopState {
  theta: number;      // Tilt angle from vertical
  phi: number;        // Precession angle
  psi: number;        // Spin angle
  thetaDot: number;   // Tilt rate
  phiDot: number;     // Precession rate
  psiDot: number;     // Spin rate
}

const SleepingTopRenderer: React.FC<SleepingTopRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [top, setTop] = useState<TopState>({
    theta: 0.1,      // Small initial tilt
    phi: 0,
    psi: 0,
    thetaDot: 0,
    phiDot: 0,
    psiDot: 50,      // High initial spin
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [initialSpin, setInitialSpin] = useState(50);
  const [initialTilt, setInitialTilt] = useState(0.1);

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
  const m = 0.1;           // Mass
  const R = 0.05;          // Radius
  const h = 0.08;          // Height of CM above tip
  const I3 = 0.5 * m * R * R;  // Moment about spin axis
  const I1 = 0.25 * m * R * R + m * h * h / 3;  // Moment about tilt axis
  const friction = 0.01;

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: TopState): TopState => {
    // Simplified top equations with damping
    const sinTheta = Math.sin(state.theta);
    const cosTheta = Math.cos(state.theta);

    // Gyroscopic effect: precession rate from angular momentum
    // phiDot = (m*g*h) / (I3 * psiDot) when steady
    const gyroTerm = I3 * state.psiDot;
    const gravitationalTorque = m * g * h * sinTheta;

    // Precession: τ = L × ω (simplified)
    let phiDot = state.phiDot;
    if (gyroTerm > 0.1 && Math.abs(sinTheta) > 0.01) {
      // Stable precession regime
      phiDot = gravitationalTorque / gyroTerm;
    }

    // Nutation (wobble) with damping
    const nutationDamping = 0.5;
    let thetaDot = state.thetaDot;
    let thetaDDot = 0;

    // If spinning fast enough, the top is stable (gyroscopic stabilization)
    const criticalSpin = Math.sqrt(4 * m * g * h * I1) / I3;

    if (state.psiDot < criticalSpin * 0.5) {
      // Below critical: top falls
      thetaDDot = gravitationalTorque / I1 - nutationDamping * thetaDot;
    } else {
      // Above critical: stable with small oscillations
      thetaDDot = -10 * (state.theta - 0.05) - nutationDamping * thetaDot;
    }

    thetaDot = thetaDot + thetaDDot * dt;
    const newTheta = Math.max(0.01, Math.min(Math.PI / 2, state.theta + thetaDot * dt));

    // Spin decay due to friction
    const newPsiDot = Math.max(0, state.psiDot * (1 - friction * dt));

    // Precession angle
    const newPhi = state.phi + phiDot * dt;

    // Spin angle
    const newPsi = state.psi + newPsiDot * dt;

    return {
      theta: newTheta,
      phi: newPhi,
      psi: newPsi,
      thetaDot: thetaDot,
      phiDot: phiDot,
      psiDot: newPsiDot,
    };
  }, [m, g, h, I1, I3, friction]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      setTop(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setTop({
      theta: initialTilt,
      phi: 0,
      psi: 0,
      thetaDot: 0,
      phiDot: 0,
      psiDot: initialSpin,
    });
  }, [initialSpin, initialTilt]);

  useEffect(() => {
    resetSimulation();
  }, [initialSpin, initialTilt, resetSimulation]);

  // Get top state description
  const getTopState = () => {
    if (top.psiDot < 5) return 'Fallen';
    if (top.theta > 0.5) return 'Wobbling';
    if (top.theta < 0.15 && top.psiDot > 30) return 'Sleeping';
    return 'Precessing';
  };

  const predictions = [
    { id: 'fall', label: 'The top immediately falls over from gravity' },
    { id: 'precess', label: 'The top slowly wobbles in circles instead of falling' },
    { id: 'stable', label: 'The top stays perfectly upright without wobbling' },
    { id: 'faster', label: 'The spin makes it fall faster' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'It behaves exactly the same' },
    { id: 'faster_fall', label: 'It falls over more quickly' },
    { id: 'slower_fall', label: 'It takes longer to fall' },
    { id: 'no_precess', label: 'It stops precessing and just spins' },
  ];

  const transferApplications = [
    {
      title: 'Bicycle Stability',
      description: 'A moving bicycle is remarkably stable, even without a rider. The spinning wheels act like gyroscopes, resisting tipping.',
      question: 'Why is it harder to balance a stationary bicycle than a moving one?',
      answer: 'Moving bicycle wheels have angular momentum. When the bike tips, the gyroscopic effect creates a torque that steers the front wheel into the fall, self-correcting. Stationary wheels have no angular momentum and can\'t provide this stabilization.',
    },
    {
      title: 'Spacecraft Attitude Control',
      description: 'Satellites use reaction wheels (spinning disks) to control their orientation without using fuel. Speeding or slowing wheels changes the spacecraft\'s rotation.',
      question: 'How do reaction wheels change spacecraft orientation without external forces?',
      answer: 'Angular momentum is conserved. When a reaction wheel speeds up in one direction, the spacecraft must rotate the opposite way to keep total angular momentum constant. This is Newton\'s third law applied to rotation.',
    },
    {
      title: 'Helicopter Tail Rotor',
      description: 'Without a tail rotor, a helicopter body would spin opposite to its main rotor due to conservation of angular momentum.',
      question: 'Why does a helicopter need a tail rotor?',
      answer: 'The engine applies torque to spin the main rotor. By Newton\'s third law, equal opposite torque acts on the helicopter body. The tail rotor provides counter-torque to prevent the body from spinning and allows yaw control.',
    },
    {
      title: 'Figure Skating Spins',
      description: 'When a spinning skater pulls in their arms, they spin faster. This is conservation of angular momentum in action.',
      question: 'How does pulling arms inward speed up a spin?',
      answer: 'Angular momentum L = Iω is conserved. When the skater reduces moment of inertia I by pulling in mass, angular velocity ω must increase to keep L constant. This also applies to tops and how their precession rate changes.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why doesn\'t a fast-spinning top fall over immediately?',
      options: [
        { text: 'The spin creates centrifugal force that holds it up', correct: false },
        { text: 'Angular momentum resists changes to the spin axis direction', correct: true },
        { text: 'The tip has too much friction to slip', correct: false },
        { text: 'Gravity is weaker when things spin', correct: false },
      ],
    },
    {
      question: 'What is precession in the context of a spinning top?',
      options: [
        { text: 'The spin around the top\'s own axis', correct: false },
        { text: 'The slow circular motion of the tilted spin axis', correct: true },
        { text: 'The wobbling back and forth motion', correct: false },
        { text: 'The friction between the tip and the surface', correct: false },
      ],
    },
    {
      question: 'As a top slows down, its precession rate:',
      options: [
        { text: 'Stays constant', correct: false },
        { text: 'Decreases', correct: false },
        { text: 'Increases', correct: true },
        { text: 'Stops immediately', correct: false },
      ],
    },
    {
      question: 'What is a "sleeping" top?',
      options: [
        { text: 'A top that has fallen over', correct: false },
        { text: 'A top spinning so fast it appears motionless and perfectly upright', correct: true },
        { text: 'A top that has stopped spinning', correct: false },
        { text: 'A top spinning very slowly', correct: false },
      ],
    },
    {
      question: 'What determines the minimum spin rate for a stable top?',
      options: [
        { text: 'The color of the top', correct: false },
        { text: 'The balance between gravity torque and gyroscopic stability', correct: true },
        { text: 'The temperature of the room', correct: false },
        { text: 'How hard you initially spin it', correct: false },
      ],
    },
    {
      question: 'What causes nutation (the fast wobble superimposed on precession)?',
      options: [
        { text: 'Wind in the room', correct: false },
        { text: 'Oscillation of the tilt angle as the top adjusts to torques', correct: true },
        { text: 'Imperfections in the top\'s shape', correct: false },
        { text: 'Friction with the surface', correct: false },
      ],
    },
    {
      question: 'Why does gravity cause precession instead of simply tipping the top over?',
      options: [
        { text: 'The angular momentum vector changes direction, not magnitude', correct: true },
        { text: 'Gravity is too weak to tip a spinning object', correct: false },
        { text: 'The floor prevents tipping', correct: false },
        { text: 'Air pressure balances gravity', correct: false },
      ],
    },
    {
      question: 'What happens when a spinning top\'s angular momentum drops below a critical value?',
      options: [
        { text: 'It speeds up', correct: false },
        { text: 'It becomes unstable and falls over', correct: true },
        { text: 'It hovers in the air', correct: false },
        { text: 'Nothing changes', correct: false },
      ],
    },
    {
      question: 'The direction of precession depends on:',
      options: [
        { text: 'The direction of gravity', correct: false },
        { text: 'The direction of spin (clockwise vs counterclockwise)', correct: true },
        { text: 'The mass of the top', correct: false },
        { text: 'The temperature', correct: false },
      ],
    },
    {
      question: 'Which principle explains why tops don\'t immediately fall?',
      options: [
        { text: 'Conservation of energy', correct: false },
        { text: 'Conservation of angular momentum', correct: true },
        { text: 'Conservation of mass', correct: false },
        { text: 'Conservation of charge', correct: false },
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
    const centerX = width / 2;
    const centerY = height / 2 + 50;

    // Calculate top position based on angles
    const topHeight = 80;
    const topRadius = 40;

    // Tilt causes the top to lean
    const tiltX = topHeight * Math.sin(top.theta) * Math.cos(top.phi);
    const tiltY = topHeight * Math.sin(top.theta) * Math.sin(top.phi) * 0.5; // Perspective

    // Tip position
    const tipX = centerX;
    const tipY = centerY + 40;

    // Top center position
    const topX = centerX + tiltX;
    const topY = centerY - topHeight * Math.cos(top.theta) * 0.7 + tiltY;

    // Spin visualization
    const spinPhase = top.psi % (2 * Math.PI);

    const state = getTopState();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Surface */}
          <ellipse cx={centerX} cy={tipY + 10} rx={120} ry={20} fill="#1e293b" />

          {/* Precession circle indicator */}
          <ellipse
            cx={centerX}
            cy={centerY - 20}
            rx={Math.sin(top.theta) * topHeight}
            ry={Math.sin(top.theta) * topHeight * 0.3}
            fill="none"
            stroke={colors.precession}
            strokeWidth={1}
            strokeDasharray="5,5"
            opacity={0.5}
          />

          {/* Top body - cone shape */}
          <polygon
            points={`
              ${tipX},${tipY}
              ${topX - topRadius * Math.cos(spinPhase)},${topY}
              ${topX + topRadius * Math.cos(spinPhase)},${topY}
            `}
            fill={colors.top}
            stroke="#d97706"
            strokeWidth={2}
          />

          {/* Top disk at top */}
          <ellipse
            cx={topX}
            cy={topY}
            rx={topRadius}
            ry={topRadius * 0.3}
            fill={colors.top}
            stroke="#d97706"
            strokeWidth={2}
          />

          {/* Spin indicator (stripes on disk) */}
          {[0, 1, 2, 3].map((i) => {
            const angle = spinPhase + (i * Math.PI) / 2;
            return (
              <line
                key={i}
                x1={topX}
                y1={topY}
                x2={topX + topRadius * Math.cos(angle)}
                y2={topY + topRadius * 0.3 * Math.sin(angle)}
                stroke={colors.spin}
                strokeWidth={3}
              />
            );
          })}

          {/* Angular momentum vector */}
          {top.psiDot > 5 && (
            <g>
              <line
                x1={topX}
                y1={topY}
                x2={topX - tiltX * 0.8}
                y2={topY - 60}
                stroke={colors.spin}
                strokeWidth={3}
                markerEnd="url(#arrowBlue)"
              />
              <text
                x={topX - tiltX * 0.8}
                y={topY - 70}
                textAnchor="middle"
                fill={colors.spin}
                fontSize={10}
              >
                L (angular momentum)
              </text>
            </g>
          )}

          {/* Precession arrow */}
          {top.phiDot > 0.1 && (
            <g>
              <path
                d={`M ${centerX + 60} ${centerY - 20} A 60 20 0 0 1 ${centerX - 60} ${centerY - 20}`}
                fill="none"
                stroke={colors.precession}
                strokeWidth={2}
                markerEnd="url(#arrowGreen)"
              />
              <text
                x={centerX}
                y={centerY - 50}
                textAnchor="middle"
                fill={colors.precession}
                fontSize={10}
              >
                Precession
              </text>
            </g>
          )}

          {/* Arrow markers */}
          <defs>
            <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill={colors.spin} />
            </marker>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill={colors.precession} />
            </marker>
          </defs>

          {/* State indicator */}
          <g transform={`translate(20, 20)`}>
            <rect
              x={0}
              y={0}
              width={100}
              height={30}
              rx={4}
              fill={state === 'Sleeping' ? 'rgba(16, 185, 129, 0.3)' :
                    state === 'Fallen' ? 'rgba(239, 68, 68, 0.3)' :
                    'rgba(139, 92, 246, 0.3)'}
            />
            <text x={50} y={20} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
              {state}
            </text>
          </g>

          {/* Stats */}
          <g transform={`translate(${width - 110}, 20)`}>
            <text y={15} fill={colors.textMuted} fontSize={11}>
              Spin: {top.psiDot.toFixed(0)} rad/s
            </text>
            <text y={30} fill={colors.textMuted} fontSize={11}>
              Tilt: {(top.theta * 180 / Math.PI).toFixed(1)}°
            </text>
            <text y={45} fill={colors.textMuted} fontSize={11}>
              Prec: {top.phiDot.toFixed(1)} rad/s
            </text>
          </g>
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
              {isPlaying ? '⏸ Pause' : '▶ Spin Top'}
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
          Initial Spin Rate: {initialSpin} rad/s
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={initialSpin}
          onChange={(e) => setInitialSpin(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
          <span>Slow (falls)</span>
          <span>Fast (stable)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Initial Tilt: {(initialTilt * 180 / Math.PI).toFixed(0)}°
        </label>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.05"
          value={initialTilt}
          onChange={(e) => setInitialTilt(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {getTopState() === 'Sleeping' && 'The top is "sleeping" - spinning so fast it appears stationary!'}
          {getTopState() === 'Precessing' && 'Watch the axis slowly circle around - that\'s precession!'}
          {getTopState() === 'Wobbling' && 'Spin is slowing - instability increasing!'}
          {getTopState() === 'Fallen' && 'The gyroscopic effect couldn\'t overcome gravity.'}
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
              🌀 The Defiant Top
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How does a spinning top resist the force of gravity?
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
                A non-spinning top falls over instantly. But spin it fast enough, and it
                defies gravity - sometimes for minutes! This "sleeping top" phenomenon
                has fascinated physicists for centuries.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The same physics keeps bicycles upright and guides spacecraft through space.
              </p>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Try spinning the top and watch how it behaves!
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
              A conical top balanced on its tip. Gravity pulls down on its center of mass,
              creating a torque that should tip it over. But when spinning...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When a tilted top is spinning fast, what happens?
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
                    background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Sleeping Top</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how spin rate affects stability and precession
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
              <li>High spin (80+) - watch it "sleep" nearly upright</li>
              <li>Medium spin (40-60) - observe precession circles</li>
              <li>Low spin (10-20) - it falls over quickly</li>
              <li>Watch how precession speeds up as spin slows down!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'precess';

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
              The top precesses - it wobbles slowly in circles instead of falling!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Gyroscopic Precession</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Angular Momentum:</strong> A spinning
                top has angular momentum L pointing along its spin axis. This vector resists
                changes to its direction (gyroscopic rigidity).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Torque = dL/dt:</strong> Gravity
                creates a horizontal torque. Instead of tipping over, this torque changes
                L's direction, causing it to sweep in a horizontal circle - precession!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Sleeping Top:</strong> When spinning
                extremely fast, even small tilts are suppressed. The top appears nearly
                motionless - it's "asleep."
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
              What if the top spins slower?
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
              Imagine starting the top with a much lower spin rate. The angular
              momentum is weaker, so the gyroscopic effect is reduced.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With much slower spin, what happens to the top?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Spin Rate Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare high spin vs low spin stability
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
              Below a critical spin rate, the gyroscopic effect can't overcome gravity's
              torque. Also notice: slower spin = faster precession (they're inversely related)!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster_fall';

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
              Lower spin means less gyroscopic stability - the top falls faster!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Critical Spin Rate</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Balance:</strong> The gyroscopic
                effect must overcome gravity's tipping torque. Below a critical spin rate,
                gravity wins and the top becomes unstable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inverse Relationship:</strong>
                Precession rate ∝ 1/spin rate. As the top slows down from friction, its
                precession speeds up - until stability is lost.
              </p>
              <p>
                This is why a spinning top always eventually falls - friction inevitably
                slows the spin below the critical threshold!
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
              Gyroscopic effects are everywhere in technology
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
                background: 'rgba(168, 85, 247, 0.1)',
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
                {testScore >= 8 ? 'You\'ve mastered gyroscopic physics!' : 'Review the material and try again.'}
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
                      ? 'rgba(168, 85, 247, 0.2)'
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
              You've mastered gyroscopic physics and the sleeping top
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
              <li>Angular momentum and gyroscopic stability</li>
              <li>Precession as a response to torque</li>
              <li>Critical spin rate for stability</li>
              <li>Inverse relationship between spin and precession</li>
              <li>Applications from bicycles to spacecraft</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The mathematics of gyroscopes (Euler equations) describe phenomena from
              Earth's axial precession (26,000 year cycle!) to quantum spin. Modern
              inertial navigation uses laser ring gyroscopes - light instead of mass,
              but the same fundamental physics!
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

export default SleepingTopRenderer;
