import React, { useState, useEffect, useCallback } from 'react';

interface TunedMassDamperRendererProps {
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  building: '#3b82f6',
  damper: '#ef4444',
  ground: '#475569',
};

interface BuildingState {
  x: number;        // Building displacement
  v: number;        // Building velocity
  damperX: number;  // Damper displacement relative to building
  damperV: number;  // Damper velocity relative to building
}

const TunedMassDamperRenderer: React.FC<TunedMassDamperRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [building, setBuilding] = useState<BuildingState>({
    x: 0,
    v: 0,
    damperX: 0,
    damperV: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [damperEnabled, setDamperEnabled] = useState(true);
  const [earthquakeFreq, setEarthquakeFreq] = useState(1.0);
  const [earthquakeAmplitude, setEarthquakeAmplitude] = useState(0.5);
  const [damperTuning, setDamperTuning] = useState(1.0); // 1.0 = perfectly tuned

  // Max amplitude tracking
  const [maxBuildingAmplitude, setMaxBuildingAmplitude] = useState(0);

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
  const buildingMass = 1000;  // Building mass
  const damperMass = 50;      // ~5% of building mass
  const buildingK = 1000;     // Building stiffness
  const damperK = buildingK * (damperMass / buildingMass) * damperTuning; // Tuned spring constant
  const buildingC = 10;       // Building damping
  const damperC = 20;         // Damper damping

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: BuildingState, t: number): BuildingState => {
    // Ground acceleration (earthquake)
    const groundAcc = earthquakeAmplitude * Math.sin(2 * Math.PI * earthquakeFreq * t);

    // Building equation of motion
    let buildingAcc = -buildingK / buildingMass * state.x - buildingC / buildingMass * state.v;
    buildingAcc += groundAcc;

    // Add damper force to building (reaction force)
    if (damperEnabled) {
      const damperForce = damperK * state.damperX + damperC * state.damperV;
      buildingAcc += damperForce / buildingMass;
    }

    // Damper equation of motion (relative to building)
    let damperAcc = 0;
    if (damperEnabled) {
      damperAcc = -damperK / damperMass * state.damperX - damperC / damperMass * state.damperV;
      damperAcc -= buildingAcc; // Pseudo-force from building acceleration
    }

    // Integration
    const newV = state.v + buildingAcc * dt;
    const newX = state.x + newV * dt;
    const newDamperV = state.damperV + damperAcc * dt;
    const newDamperX = state.damperX + newDamperV * dt;

    // Track max amplitude
    if (Math.abs(newX) > maxBuildingAmplitude) {
      setMaxBuildingAmplitude(Math.abs(newX));
    }

    return {
      x: newX,
      v: newV,
      damperX: newDamperX,
      damperV: newDamperV,
    };
  }, [earthquakeFreq, earthquakeAmplitude, damperEnabled, damperK, damperC, buildingK, buildingC, buildingMass, damperMass, maxBuildingAmplitude]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.01;
    const interval = setInterval(() => {
      setBuilding(prev => updatePhysics(dt, prev, time));
      setTime(prev => prev + dt);
    }, 10);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics, time]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setMaxBuildingAmplitude(0);
    setBuilding({
      x: 0,
      v: 0,
      damperX: 0,
      damperV: 0,
    });
  }, []);

  const predictions = [
    { id: 'amplify', label: 'The heavy mass makes the building shake more' },
    { id: 'reduce', label: 'The heavy mass reduces the building\'s shaking' },
    { id: 'nothing', label: 'The mass doesn\'t affect the building at all' },
    { id: 'break', label: 'The mass crashes through the floor' },
  ];

  const twistPredictions = [
    { id: 'worse', label: 'The damper makes building motion worse' },
    { id: 'same', label: 'The damper still works equally well' },
    { id: 'less', label: 'The damper is less effective but still helps' },
    { id: 'no_effect', label: 'The damper stops working entirely' },
  ];

  const transferApplications = [
    {
      title: 'Taipei 101 Pendulum',
      description: 'Taipei 101 has a 730-ton steel sphere suspended as a tuned mass damper. It can sway over a meter during typhoons, visibly countering the building\'s motion.',
      question: 'Why is Taipei 101\'s damper designed as a pendulum instead of a spring?',
      answer: 'A pendulum\'s frequency depends only on length, making it easy to tune to the building\'s period. The enormous mass and gravity provide restoring force without needing giant springs.',
    },
    {
      title: 'Power Line Stockbridge Dampers',
      description: 'The dumbbell-shaped weights you see on power lines are Stockbridge dampers that prevent galloping - dangerous oscillations from wind.',
      question: 'How do small Stockbridge dampers protect long spans of power lines?',
      answer: 'Each damper is tuned to absorb energy at the natural frequency of that span. The masses oscillate out of phase with the cable, transferring kinetic energy to heat through internal friction.',
    },
    {
      title: 'Car Engine Mounts',
      description: 'Modern cars use hydraulic engine mounts with tuned mass damper properties to isolate vibration from the passenger cabin.',
      question: 'Why do engine mounts need to be "tuned" rather than just using soft rubber?',
      answer: 'The engine vibrates at specific frequencies (based on RPM). Tuned mounts target these frequencies for maximum absorption. Too soft would allow the engine to bounce; too stiff would transmit all vibration.',
    },
    {
      title: 'Concert Hall Acoustics',
      description: 'Concert halls use tuned absorbers (Helmholtz resonators) to dampen specific frequencies that would otherwise create boomy acoustics.',
      question: 'How is a Helmholtz resonator similar to a tuned mass damper?',
      answer: 'Both are resonant systems tuned to a specific frequency. The TMD has a mass on a spring; the Helmholtz resonator has air in a cavity. When the environment vibrates at that frequency, the absorber oscillates and dissipates energy.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the primary purpose of a tuned mass damper?',
      options: [
        { text: 'To add weight to stabilize the building', correct: false },
        { text: 'To absorb vibration energy at specific frequencies', correct: true },
        { text: 'To make the building more rigid', correct: false },
        { text: 'To provide emergency power', correct: false },
      ],
    },
    {
      question: 'Why must a tuned mass damper\'s frequency match the building\'s natural frequency?',
      options: [
        { text: 'So they don\'t collide during earthquakes', correct: false },
        { text: 'So energy transfers efficiently (resonance)', correct: true },
        { text: 'Building codes require it', correct: false },
        { text: 'It\'s just easier to manufacture that way', correct: false },
      ],
    },
    {
      question: 'When the building sways left, which way does a well-tuned damper move?',
      options: [
        { text: 'Left (same direction)', correct: false },
        { text: 'Right (opposite direction)', correct: true },
        { text: 'Up', correct: false },
        { text: 'It doesn\'t move', correct: false },
      ],
    },
    {
      question: 'What happens if the damper is mis-tuned (wrong frequency)?',
      options: [
        { text: 'It works even better', correct: false },
        { text: 'It becomes less effective or even amplifies motion', correct: true },
        { text: 'Nothing changes', correct: false },
        { text: 'It falls off the building', correct: false },
      ],
    },
    {
      question: 'Typical tuned mass dampers are what percentage of building mass?',
      options: [
        { text: '0.1-0.5%', correct: false },
        { text: '1-5%', correct: true },
        { text: '10-20%', correct: false },
        { text: '50%', correct: false },
      ],
    },
    {
      question: 'How does the damper\'s internal damping (friction) help?',
      options: [
        { text: 'It prevents the damper from moving', correct: false },
        { text: 'It converts kinetic energy to heat', correct: true },
        { text: 'It makes the damper heavier', correct: false },
        { text: 'It holds the damper in place', correct: false },
      ],
    },
    {
      question: 'Why are tuned mass dampers typically placed near the top of buildings?',
      options: [
        { text: 'It\'s cheaper to install there', correct: false },
        { text: 'Maximum displacement occurs at the top', correct: true },
        { text: 'They need fresh air', correct: false },
        { text: 'To be visible to the public', correct: false },
      ],
    },
    {
      question: 'What would happen with zero damping in the TMD system?',
      options: [
        { text: 'Perfect energy absorption', correct: false },
        { text: 'The damper would oscillate indefinitely at resonance', correct: true },
        { text: 'The building would stop moving', correct: false },
        { text: 'Nothing different would happen', correct: false },
      ],
    },
    {
      question: 'Active tuned mass dampers use sensors and motors to:',
      options: [
        { text: 'Replace the heavy mass', correct: false },
        { text: 'Adjust response in real-time for better performance', correct: true },
        { text: 'Generate electricity from building motion', correct: false },
        { text: 'Change the building\'s shape', correct: false },
      ],
    },
    {
      question: 'Why might a building need multiple tuned mass dampers?',
      options: [
        { text: 'One for each floor', correct: false },
        { text: 'Different modes vibrate at different frequencies', correct: true },
        { text: 'For aesthetic reasons', correct: false },
        { text: 'Regulations require redundancy', correct: false },
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
    const height = 400;
    const groundY = height - 50;
    const buildingWidth = 80;
    const buildingHeight = 250;
    const buildingBaseX = width / 2 - buildingWidth / 2;

    // Scale displacement for visualization
    const visualScale = 100;
    const buildingOffset = building.x * visualScale;
    const damperOffset = building.damperX * visualScale * 0.5;

    // Earthquake indicator
    const groundShake = Math.sin(2 * Math.PI * earthquakeFreq * time) * earthquakeAmplitude * 20;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Sky */}
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width={width} height={height} fill="url(#skyGrad)" />

          {/* Ground with earthquake shake */}
          <g transform={`translate(${isPlaying ? groundShake : 0}, 0)`}>
            <rect x={0} y={groundY} width={width} height={50} fill={colors.ground} />

            {/* Earthquake waves */}
            {isPlaying && (
              <>
                <path
                  d={`M 0 ${groundY + 10} Q 50 ${groundY + 10 + Math.sin(time * 10) * 5} 100 ${groundY + 10}`}
                  stroke={colors.warning}
                  strokeWidth={2}
                  fill="none"
                  opacity={0.5}
                />
                <path
                  d={`M 100 ${groundY + 10} Q 150 ${groundY + 10 - Math.sin(time * 10) * 5} 200 ${groundY + 10}`}
                  stroke={colors.warning}
                  strokeWidth={2}
                  fill="none"
                  opacity={0.5}
                />
              </>
            )}
          </g>

          {/* Building */}
          <g transform={`translate(${buildingOffset}, 0)`}>
            {/* Building body */}
            <rect
              x={buildingBaseX}
              y={groundY - buildingHeight}
              width={buildingWidth}
              height={buildingHeight}
              fill={colors.building}
              stroke="#60a5fa"
              strokeWidth={2}
              rx={4}
            />

            {/* Windows */}
            {[0, 1, 2, 3, 4, 5].map((floor) => (
              <g key={floor}>
                <rect
                  x={buildingBaseX + 10}
                  y={groundY - buildingHeight + 20 + floor * 38}
                  width={15}
                  height={25}
                  fill="#1e3a5f"
                  rx={2}
                />
                <rect
                  x={buildingBaseX + buildingWidth - 25}
                  y={groundY - buildingHeight + 20 + floor * 38}
                  width={15}
                  height={25}
                  fill="#1e3a5f"
                  rx={2}
                />
              </g>
            ))}

            {/* Damper on top floor */}
            {damperEnabled && (
              <g transform={`translate(${damperOffset}, 0)`}>
                {/* Damper housing */}
                <rect
                  x={buildingBaseX + 10}
                  y={groundY - buildingHeight + 5}
                  width={buildingWidth - 20}
                  height={30}
                  fill="rgba(0,0,0,0.3)"
                  rx={4}
                />

                {/* Damper mass */}
                <rect
                  x={buildingBaseX + buildingWidth / 2 - 15}
                  y={groundY - buildingHeight + 10}
                  width={30}
                  height={20}
                  fill={colors.damper}
                  rx={4}
                  filter="url(#damperGlow)"
                />

                {/* Springs */}
                <line
                  x1={buildingBaseX + 15}
                  y1={groundY - buildingHeight + 20}
                  x2={buildingBaseX + buildingWidth / 2 - 15}
                  y2={groundY - buildingHeight + 20}
                  stroke="#fbbf24"
                  strokeWidth={3}
                  strokeDasharray="4,2"
                />
                <line
                  x1={buildingBaseX + buildingWidth / 2 + 15}
                  y1={groundY - buildingHeight + 20}
                  x2={buildingBaseX + buildingWidth - 15}
                  y2={groundY - buildingHeight + 20}
                  stroke="#fbbf24"
                  strokeWidth={3}
                  strokeDasharray="4,2"
                />
              </g>
            )}

            {/* Glow filter */}
            <defs>
              <filter id="damperGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={colors.damper} floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </g>

          {/* Displacement indicator */}
          <g>
            <line
              x1={width / 2}
              y1={groundY - buildingHeight - 20}
              x2={width / 2 + buildingOffset}
              y2={groundY - buildingHeight - 20}
              stroke={colors.warning}
              strokeWidth={2}
            />
            <circle
              cx={width / 2 + buildingOffset}
              cy={groundY - buildingHeight - 20}
              r={5}
              fill={colors.warning}
            />
            <text
              x={width / 2}
              y={groundY - buildingHeight - 30}
              textAnchor="middle"
              fill={colors.textMuted}
              fontSize={10}
            >
              Displacement
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(20, 20)`}>
            <rect x={0} y={0} width={12} height={12} fill={colors.building} rx={2} />
            <text x={18} y={10} fill={colors.textMuted} fontSize={10}>Building</text>

            {damperEnabled && (
              <>
                <rect x={0} y={18} width={12} height={12} fill={colors.damper} rx={2} />
                <text x={18} y={28} fill={colors.textMuted} fontSize={10}>TMD Mass</text>
              </>
            )}
          </g>

          {/* Max amplitude display */}
          <text
            x={width - 20}
            y={25}
            textAnchor="end"
            fill={colors.textSecondary}
            fontSize={12}
          >
            Max Amp: {(maxBuildingAmplitude * 100).toFixed(1)}
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
              {isPlaying ? '⏹ Stop Earthquake' : '🌋 Start Earthquake'}
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
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={damperEnabled}
            onChange={(e) => {
              setDamperEnabled(e.target.checked);
              resetSimulation();
            }}
            style={{ marginRight: '8px' }}
          />
          Damper Enabled
        </label>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Earthquake Frequency: {earthquakeFreq.toFixed(1)} Hz
        </label>
        <input
          type="range"
          min="0.3"
          max="2.0"
          step="0.1"
          value={earthquakeFreq}
          onChange={(e) => setEarthquakeFreq(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Damper Tuning: {(damperTuning * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={damperTuning}
          onChange={(e) => {
            setDamperTuning(parseFloat(e.target.value));
            resetSimulation();
          }}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
          <span>Mis-tuned</span>
          <span>Perfect (100%)</span>
          <span>Mis-tuned</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(249, 115, 22, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Building natural frequency: ~1.0 Hz
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {damperTuning === 1.0 ? '✓ Damper perfectly tuned!' : `Damper ${damperTuning > 1 ? 'too stiff' : 'too soft'}`}
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
              🏗️ The Giant Pendulum Inside a Skyscraper
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do engineers put 730-ton steel balls in tall buildings?
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
                Taipei 101, once the world's tallest building, has a massive golden sphere
                suspended near its top floor. During typhoons, you can watch it sway!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is a tuned mass damper - and it fights earthquakes with physics.
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Start the earthquake and watch how the building responds!
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
              A skyscraper with a heavy mass (red box) mounted on springs at the top floor.
              When an earthquake hits, the ground shakes and the building sways.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What effect does the heavy mass on top have?
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
                    background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Tuned Mass Damper</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare building motion with and without the damper
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
              <li>Toggle damper on/off - compare max amplitude</li>
              <li>Set frequency to 1.0 Hz (resonance) for dramatic effect</li>
              <li>Try different tuning values - see what happens</li>
              <li>Watch the damper move opposite to the building</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'reduce';

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
              The tuned mass damper reduces the building's shaking dramatically!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 How Tuned Mass Dampers Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resonance Transfer:</strong> The damper
                is tuned to the building's natural frequency. When the building sways, energy transfers
                to the damper, making it move instead.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Opposite Motion:</strong> The damper
                always moves opposite to the building. When the building sways left, the damper moves
                right, counteracting the motion.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Energy Dissipation:</strong> Internal
                damping converts the damper's kinetic energy into heat. The building's energy is
                literally absorbed and dissipated by the damper.
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
              What if the damper is mis-tuned (wrong frequency)?
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
              Imagine the damper springs are too stiff or too soft, so its natural
              frequency doesn't match the building's. It's no longer "tuned."
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With a mis-tuned damper, what happens?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Mis-Tuned Damper</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the tuning and see how it affects damper performance
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
              Mis-tuning reduces effectiveness dramatically! In extreme cases, a poorly
              tuned damper can even make motion worse by adding energy at the wrong phase.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse' || twistPrediction === 'less';

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
              Mis-tuned dampers are less effective and can even amplify motion!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 The Importance of Tuning</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Phase Relationship:</strong> A perfectly
                tuned damper moves exactly opposite to the building (180° out of phase). When mis-tuned,
                this phase relationship shifts, reducing cancellation.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resonance Matters:</strong> Energy
                transfer between oscillators is most efficient at resonance. Off-resonance, the
                damper can't absorb as much energy from the building.
              </p>
              <p>
                This is why modern "active" TMDs use sensors and motors to adjust tuning in
                real-time as building properties change with temperature and loading!
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
              Tuned mass dampers protect structures around the world
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
                background: 'rgba(249, 115, 22, 0.1)',
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
                {testScore >= 8 ? 'You\'ve mastered tuned mass dampers!' : 'Review the material and try again.'}
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
                      ? 'rgba(249, 115, 22, 0.2)'
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
              You've mastered tuned mass dampers and structural dynamics
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
              <li>Resonance and energy transfer between oscillators</li>
              <li>Phase relationships in vibration control</li>
              <li>Importance of frequency tuning</li>
              <li>Energy dissipation through damping</li>
              <li>Real-world structural engineering applications</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(249, 115, 22, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern "smart" buildings use arrays of active TMDs with real-time control,
              multiple TMDs for different modes, and even liquid sloshing dampers. The
              same principles now protect bridges, wind turbines, and even space telescopes!
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

export default TunedMassDamperRenderer;
