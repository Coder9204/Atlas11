import React, { useState, useEffect, useCallback, useRef } from 'react';

interface BrownianMotionRendererProps {
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
  particle: '#3b82f6',
  trackedParticle: '#ef4444',
  path: '#10b981',
  molecule: 'rgba(59, 130, 246, 0.3)',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTracked: boolean;
}

interface PathPoint {
  x: number;
  y: number;
}

const BrownianMotionRenderer: React.FC<BrownianMotionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [temperature, setTemperature] = useState(50);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [trackedPath, setTrackedPath] = useState<PathPoint[]>([]);
  const [msdData, setMsdData] = useState<number[]>([]);
  const animationRef = useRef<number>();
  const frameCountRef = useRef(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Initialize particles
  useEffect(() => {
    const initParticles: Particle[] = [];
    const centerX = 200;
    const centerY = 175;

    // Add one tracked particle in the center
    initParticles.push({
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 8,
      isTracked: true,
    });

    // Add smaller particles around
    for (let i = 0; i < 15; i++) {
      initParticles.push({
        x: 50 + Math.random() * 300,
        y: 50 + Math.random() * 250,
        vx: 0,
        vy: 0,
        radius: 4 + Math.random() * 3,
        isTracked: false,
      });
    }

    setParticles(initParticles);
    setTrackedPath([{ x: centerX, y: centerY }]);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating || particles.length === 0) return;

    const animate = () => {
      frameCountRef.current++;
      const jitterStrength = (temperature / 50) * 2;

      setParticles(prevParticles => {
        return prevParticles.map(p => {
          // Random walk - each step is random
          const dx = (Math.random() - 0.5) * jitterStrength * 3;
          const dy = (Math.random() - 0.5) * jitterStrength * 3;

          let newX = p.x + dx;
          let newY = p.y + dy;

          // Boundary constraints
          const margin = p.radius;
          if (newX < margin) newX = margin;
          if (newX > 400 - margin) newX = 400 - margin;
          if (newY < margin) newY = margin;
          if (newY > 350 - margin) newY = 350 - margin;

          return { ...p, x: newX, y: newY };
        });
      });

      // Update tracked path every few frames
      if (frameCountRef.current % 3 === 0) {
        setParticles(currentParticles => {
          const tracked = currentParticles.find(p => p.isTracked);
          if (tracked) {
            setTrackedPath(prevPath => {
              const newPath = [...prevPath, { x: tracked.x, y: tracked.y }];
              // Keep last 200 points
              if (newPath.length > 200) {
                return newPath.slice(-200);
              }
              return newPath;
            });

            // Calculate MSD
            if (frameCountRef.current % 10 === 0) {
              setMsdData(prevMsd => {
                const newMsd = [...prevMsd];
                if (newMsd.length > 0) {
                  const firstPoint = { x: 200, y: 175 };
                  const displacement = Math.sqrt(
                    Math.pow(tracked.x - firstPoint.x, 2) +
                    Math.pow(tracked.y - firstPoint.y, 2)
                  );
                  newMsd.push(displacement);
                  if (newMsd.length > 50) {
                    return newMsd.slice(-50);
                  }
                } else {
                  newMsd.push(0);
                }
                return newMsd;
              });
            }
          }
          return currentParticles;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, temperature, particles.length]);

  const resetSimulation = useCallback(() => {
    const centerX = 200;
    const centerY = 175;

    setParticles(prev => prev.map((p, i) => {
      if (i === 0) {
        return { ...p, x: centerX, y: centerY };
      }
      return { ...p, x: 50 + Math.random() * 300, y: 50 + Math.random() * 250 };
    }));
    setTrackedPath([{ x: centerX, y: centerY }]);
    setMsdData([0]);
    frameCountRef.current = 0;
  }, []);

  const predictions = [
    { id: 'still', label: 'The particles stay still until something pushes them' },
    { id: 'drift', label: 'The particles drift slowly in one direction' },
    { id: 'jitter', label: 'The particles jitter randomly but stay in the same general area' },
    { id: 'orbit', label: 'The particles orbit around in circular paths' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The jittering stays exactly the same' },
    { id: 'faster', label: 'The particles jitter faster and more intensely' },
    { id: 'slower', label: 'The particles jitter slower and less' },
    { id: 'stop', label: 'The particles stop moving entirely' },
  ];

  const transferApplications = [
    {
      title: 'Diffusion in Living Cells',
      description: 'Molecules inside cells move via Brownian motion, enabling nutrients to reach where they are needed without active transport.',
      question: 'How does Brownian motion help molecules distribute themselves inside a cell?',
      answer: 'Random thermal collisions cause molecules to spread out from areas of high concentration to low concentration. This passive diffusion is essential for distributing oxygen, nutrients, and signaling molecules throughout the cell.',
    },
    {
      title: 'Nanoparticle Behavior',
      description: 'Nanoparticles in fluids exhibit strong Brownian motion. This affects drug delivery, nanomaterial synthesis, and colloidal stability.',
      question: 'Why do nanoparticles show stronger Brownian motion than larger particles?',
      answer: 'Smaller particles have less mass and inertia, so individual molecular collisions have a greater relative effect. The random forces from surrounding molecules are not averaged out as much, leading to more visible jittering.',
    },
    {
      title: 'Einstein\'s Proof of Atoms',
      description: 'In 1905, Einstein\'s theoretical analysis of Brownian motion provided compelling evidence that atoms and molecules actually exist.',
      question: 'How did Brownian motion help prove atoms exist?',
      answer: 'Einstein showed that the statistical properties of Brownian motion (like mean square displacement) could only be explained if matter was made of discrete particles (molecules) colliding with the visible particles. Jean Perrin later confirmed this experimentally.',
    },
    {
      title: 'Thermal Noise in Electronics',
      description: 'Random thermal motion of electrons in conductors creates "Johnson-Nyquist noise" that limits the sensitivity of electronic instruments.',
      question: 'How is electronic thermal noise related to Brownian motion?',
      answer: 'Just as visible particles are buffeted by invisible molecules, electrons in a conductor are randomly pushed by thermal vibrations. This creates random voltage fluctuations proportional to temperature - the electronic equivalent of Brownian motion.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes Brownian motion?',
      options: [
        { text: 'Gravity pulling particles downward', correct: false },
        { text: 'Random collisions with invisible fluid molecules', correct: true },
        { text: 'Electric charges on the particles', correct: false },
        { text: 'Convection currents in the fluid', correct: false },
      ],
    },
    {
      question: 'If you observe a pollen grain in water, its path over time will:',
      options: [
        { text: 'Be a straight line', correct: false },
        { text: 'Be a perfect circle', correct: false },
        { text: 'Be a random, zigzag pattern', correct: true },
        { text: 'Always move toward the light', correct: false },
      ],
    },
    {
      question: 'Increasing the temperature of the fluid will:',
      options: [
        { text: 'Stop Brownian motion', correct: false },
        { text: 'Make the jittering slower', correct: false },
        { text: 'Make the jittering faster and more intense', correct: true },
        { text: 'Make particles move in straight lines', correct: false },
      ],
    },
    {
      question: 'The mean square displacement of a Brownian particle grows:',
      options: [
        { text: 'Not at all - particles stay in place', correct: false },
        { text: 'Linearly with time (proportional to t)', correct: true },
        { text: 'Exponentially with time', correct: false },
        { text: 'With the square of time (proportional to t^2)', correct: false },
      ],
    },
    {
      question: 'Smaller particles show stronger Brownian motion because:',
      options: [
        { text: 'They have less inertia relative to collision forces', correct: true },
        { text: 'They are lighter and float better', correct: false },
        { text: 'They have more electric charge', correct: false },
        { text: 'Gravity affects them less', correct: false },
      ],
    },
    {
      question: 'Brownian motion is an example of:',
      options: [
        { text: 'Deterministic motion that can be predicted exactly', correct: false },
        { text: 'Random or stochastic motion with statistical patterns', correct: true },
        { text: 'Periodic motion like a pendulum', correct: false },
        { text: 'Motion caused by external forces', correct: false },
      ],
    },
    {
      question: 'Einstein\'s analysis of Brownian motion helped prove:',
      options: [
        { text: 'The existence of atoms and molecules', correct: true },
        { text: 'The theory of relativity', correct: false },
        { text: 'The photoelectric effect', correct: false },
        { text: 'The wave nature of light', correct: false },
      ],
    },
    {
      question: 'In a fluid at thermal equilibrium, Brownian motion:',
      options: [
        { text: 'Stops completely', correct: false },
        { text: 'Continues indefinitely', correct: true },
        { text: 'Only occurs near the surface', correct: false },
        { text: 'Requires external energy input', correct: false },
      ],
    },
    {
      question: 'The diffusion coefficient in Brownian motion depends on:',
      options: [
        { text: 'Particle color', correct: false },
        { text: 'Room lighting', correct: false },
        { text: 'Temperature and fluid viscosity', correct: true },
        { text: 'Container shape', correct: false },
      ],
    },
    {
      question: 'Thermal noise in electronics is related to Brownian motion because:',
      options: [
        { text: 'Both involve random thermal fluctuations', correct: true },
        { text: 'Both require a vacuum', correct: false },
        { text: 'Both are caused by light', correct: false },
        { text: 'Both only occur at high temperatures', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0c1929 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Background - representing fluid medium */}
          <defs>
            <radialGradient id="fluidGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#fluidGradient)" />

          {/* Invisible molecule hints (small dots) */}
          {Array.from({ length: 50 }).map((_, i) => (
            <circle
              key={`mol-${i}`}
              cx={Math.random() * width}
              cy={Math.random() * height}
              r={1}
              fill={colors.molecule}
              opacity={0.3 + Math.random() * 0.3}
            />
          ))}

          {/* Tracked particle path */}
          {showPath && trackedPath.length > 1 && (
            <path
              d={`M ${trackedPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
              fill="none"
              stroke={colors.path}
              strokeWidth={1.5}
              opacity={0.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Particles */}
          {particles.map((p, i) => (
            <g key={i}>
              {p.isTracked && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.radius + 4}
                  fill="none"
                  stroke={colors.trackedParticle}
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.radius}
                fill={p.isTracked ? colors.trackedParticle : colors.particle}
                opacity={p.isTracked ? 1 : 0.8}
              />
              {p.isTracked && (
                <circle
                  cx={p.x - p.radius * 0.3}
                  cy={p.y - p.radius * 0.3}
                  r={p.radius * 0.25}
                  fill="rgba(255,255,255,0.4)"
                />
              )}
            </g>
          ))}

          {/* Labels */}
          <text x={20} y={25} fill={colors.textPrimary} fontSize={12}>
            Temperature: {temperature}%
          </text>
          <text x={20} y={42} fill={colors.textSecondary} fontSize={11}>
            Red = Tracked Particle | Green = Path
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setShowPath(!showPath)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.path}`,
                background: showPath ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.path,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {showPath ? 'Hide Path' : 'Show Path'}
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
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMSDGraph = () => {
    const width = 300;
    const height = 120;
    const maxMsd = Math.max(...msdData, 50);

    return (
      <div style={{ background: colors.bgCard, padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
        <h4 style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: '13px' }}>
          Mean Square Displacement Over Time
        </h4>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Axes */}
          <line x1={40} y1={100} x2={290} y2={100} stroke={colors.textMuted} strokeWidth={1} />
          <line x1={40} y1={10} x2={40} y2={100} stroke={colors.textMuted} strokeWidth={1} />

          {/* Labels */}
          <text x={165} y={115} fill={colors.textMuted} fontSize={10} textAnchor="middle">Time</text>
          <text x={15} y={55} fill={colors.textMuted} fontSize={10} textAnchor="middle" transform="rotate(-90, 15, 55)">MSD</text>

          {/* Data line */}
          {msdData.length > 1 && (
            <path
              d={`M ${msdData.map((d, i) => `${40 + (i * 250) / msdData.length},${100 - (d / maxMsd) * 80}`).join(' L ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
            />
          )}

          {/* Theoretical linear growth reference */}
          <line
            x1={40}
            y1={100}
            x2={290}
            y2={20}
            stroke={colors.warning}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          <text x={250} y={30} fill={colors.warning} fontSize={9} opacity={0.7}>Linear (theory)</text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature}% (affects jitter intensity)
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {renderMSDGraph()}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Jitter Intensity: {(temperature / 50).toFixed(1)}x base rate
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Higher temperature = more molecular collisions = faster jittering
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
      borderTop: '1px solid rgba(255,255,255,0.1)',
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
              The Random Jiggle
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can "randomness" have a measurable pattern?
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
                Look at tiny particles under a microscope - they never sit still!
                They jitter and dance unpredictably, even when nothing seems to push them.
                This is Brownian motion, discovered in 1827 by botanist Robert Brown.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Try it yourself: Mix a drop of milk in water and observe under a phone microscope.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch the red particle's path - completely random, yet strangely predictable in aggregate!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Tiny particles (like pollen or fat droplets) suspended in water.
              The red particle is being tracked. The fluid appears still - no currents,
              no external forces. What should happen?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How will the particles move over time?
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Brownian Motion</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Observe how particles jitter randomly but with consistent statistical properties
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Watch the path - each step is random, but the overall spread is predictable</li>
              <li>Notice: particles don't travel far in any one direction</li>
              <li>The MSD graph shows displacement grows with time (not distance traveled!)</li>
              <li>Reset and watch different paths - all random, but statistically similar</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'jitter';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Particles jitter randomly but stay in the same general area - classic Brownian motion!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Brownian Motion</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Invisible Collisions:</strong> Water molecules
                are far too small to see, but they're constantly moving and colliding with the visible
                particles from all sides. These collisions are random and uneven.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Walk:</strong> Each tiny kick from
                molecular collisions pushes the particle in a random direction. The net effect is a
                "drunkard's walk" - random steps that don't add up to any particular direction.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Statistical Pattern:</strong> While each
                step is random, the mean square displacement grows linearly with time. This is a
                fundamental result that Einstein used to prove atoms exist!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we warm up the sample slightly?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine gently heating the water sample. The water molecules are now moving faster
              on average. How will this affect the visible particles' jittering?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              With higher temperature, what happens to the Brownian motion?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Temperature Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the temperature and observe how jittering changes
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Higher temperature means faster-moving water molecules, which deliver harder kicks
              to the visible particles. The jittering becomes more intense!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Higher temperature causes faster, more intense jittering!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Temperature and Brownian Motion</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Molecular Speed:</strong> Temperature is
                directly related to the average kinetic energy of molecules. Higher temperature =
                faster molecules = harder collisions.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Einstein's Equation:</strong> The diffusion
                coefficient D = kT / (6 pi eta r), where T is temperature. This predicts that
                Brownian motion intensity is proportional to temperature!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Practical Use:</strong> This relationship
                allows scientists to measure temperature at microscopic scales by observing
                particle motion - a form of "molecular thermometer."
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
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
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Brownian motion appears everywhere from biology to electronics
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
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
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered Brownian motion!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered Brownian motion and random walks</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Random molecular collisions cause visible particle jittering</li>
              <li>Mean square displacement grows linearly with time</li>
              <li>Temperature directly affects jitter intensity</li>
              <li>Brownian motion proved the existence of atoms</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Brownian motion is fundamental to statistical mechanics, finance (stock prices),
              and biology (molecular motors). The Langevin equation and Fokker-Planck equation
              describe it mathematically. It's also key to understanding diffusion, osmosis,
              and many nanoscale phenomena!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default BrownianMotionRenderer;
