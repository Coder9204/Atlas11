import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TWOBALLCOLLISION RENDERER - ENERGY VS MOMENTUM CONSERVATION
// Teaching: Momentum is ALWAYS conserved; Energy is only conserved in elastic collisions
// ─────────────────────────────────────────────────────────────────────────────

interface GameEvent {
  type: 'prediction' | 'observation' | 'phase_change' | 'interaction' | 'completion';
  phase: string;
  data?: {
    prediction?: string;
    actual?: string;
    isCorrect?: boolean;
    score?: number;
    action?: string;
    details?: string;
  };
  timestamp: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND UTILITY
// ─────────────────────────────────────────────────────────────────────────────

const playSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio not available
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const isValidPhase = (phase: string): phase is Phase => {
  return ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].includes(phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface TwoBallCollisionRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TwoBallCollisionRenderer: React.FC<TwoBallCollisionRendererProps> = ({
  onComplete,
  emitGameEvent,
  gamePhase
}) => {
  // Phase management
  const getInitialPhase = (): Phase => {
    if (gamePhase && isValidPhase(gamePhase)) return gamePhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase());
  const [showCoachMessage, setShowCoachMessage] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Collision simulation state
  const [collisionType, setCollisionType] = useState<'elastic' | 'inelastic'>('elastic');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'before' | 'collision' | 'after'>('before');
  const [ball1Pos, setBall1Pos] = useState(50);
  const [ball2Pos, setBall2Pos] = useState(250);
  const [ball1Vel, setBall1Vel] = useState(0);
  const [ball2Vel, setBall2Vel] = useState(0);
  const [experimentsRun, setExperimentsRun] = useState(0);

  // Twist: mass ratio experiments
  const [massRatio, setMassRatio] = useState<'equal' | 'heavy_light' | 'light_heavy'>('equal');
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation ref
  const animationRef = useRef<number | null>(null);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (gamePhase && isValidPhase(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Emit game events
  const emitEvent = useCallback((
    type: GameEvent['type'],
    data?: GameEvent['data'],
    message?: string
  ) => {
    if (emitGameEvent) {
      emitGameEvent({ type, phase, data, timestamp: Date.now(), message });
    }
  }, [emitGameEvent, phase]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound(500, 'sine', 0.1);
    setPhase(newPhase);
    setShowCoachMessage(true);
    emitEvent('phase_change', { action: `Moved to ${newPhase}` });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [emitEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  // COLLISION PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  const runCollision = (type: 'elastic' | 'inelastic', masses: 'equal' | 'heavy_light' | 'light_heavy' = 'equal') => {
    if (isAnimating) return;

    // Reset positions
    setBall1Pos(50);
    setBall2Pos(250);
    setAnimationPhase('before');
    setIsAnimating(true);

    // Mass values
    let m1 = 1, m2 = 1;
    if (masses === 'heavy_light') { m1 = 3; m2 = 1; }
    if (masses === 'light_heavy') { m1 = 1; m2 = 3; }

    // Initial velocities
    const v1i = 4; // Ball 1 moving right
    const v2i = 0; // Ball 2 stationary

    // Calculate final velocities
    let v1f: number, v2f: number;

    if (type === 'elastic') {
      // Elastic collision formulas
      v1f = ((m1 - m2) / (m1 + m2)) * v1i + ((2 * m2) / (m1 + m2)) * v2i;
      v2f = ((2 * m1) / (m1 + m2)) * v1i + ((m2 - m1) / (m1 + m2)) * v2i;
    } else {
      // Inelastic (perfectly inelastic - they stick)
      v1f = v2f = (m1 * v1i + m2 * v2i) / (m1 + m2);
    }

    // Animate approach
    let pos1 = 50;
    let pos2 = 250;
    const targetPos = 145;

    const approach = () => {
      pos1 += 3;
      setBall1Pos(pos1);

      if (pos1 < targetPos) {
        animationRef.current = requestAnimationFrame(approach);
      } else {
        // Collision!
        setAnimationPhase('collision');
        playSound(type === 'elastic' ? 800 : 400, type === 'elastic' ? 'triangle' : 'square', 0.2);

        setTimeout(() => {
          setAnimationPhase('after');
          setBall1Vel(v1f);
          setBall2Vel(v2f);

          // Animate separation
          let postPos1 = targetPos;
          let postPos2 = 250;

          const separate = () => {
            postPos1 += v1f * 2;
            postPos2 += v2f * 2;
            setBall1Pos(postPos1);
            setBall2Pos(postPos2);

            if (postPos2 < 350 && postPos1 > 0) {
              animationRef.current = requestAnimationFrame(separate);
            } else {
              setIsAnimating(false);
              emitEvent('observation', {
                details: `${type} collision with ${masses} masses completed`
              });
            }
          };

          animationRef.current = requestAnimationFrame(separate);
        }, 300);
      }
    };

    animationRef.current = requestAnimationFrame(approach);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "⚽ Two balls collide. One bounces back, one absorbs. What's the difference?",
    predict: "Before we test, predict: what happens when a super-ball hits a stationary ball vs. when clay hits?",
    play: "Run both collision types and observe the difference!",
    review: "Momentum is ALWAYS conserved. Energy? Only in elastic collisions!",
    twist_predict: "What if one ball is heavier? How does mass ratio change the outcome?",
    twist_play: "Experiment with different mass combinations!",
    twist_review: "Mass ratio determines who moves more—but total momentum stays the same!",
    transfer: "Car crashes, pool shots, and particle physics all follow these rules!",
    test: "Let's test your understanding of collision physics!",
    mastery: "🎉 You've mastered collision physics! Conservation laws unlocked!"
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM COLOR PALETTE
  // ─────────────────────────────────────────────────────────────────────────

  const colors = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
    neutral: '#64748B',
    ball1: '#3B82F6',
    ball2: '#EF4444',
    elastic: '#10B981',
    inelastic: '#F59E0B',
    track: '#E2E8F0',
    collision: '#FCD34D'
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
          }}
        />
      </div>
    );
  };

  const renderBottomBar = (onNext: () => void, canProceed: boolean, buttonText: string = 'Continue') => (
    <div className="mt-6 flex justify-center">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          if (canProceed) onNext();
        }}
        disabled={!canProceed}
        className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-300 ${
          canProceed
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );

  const renderKeyTakeaway = (title: string, content: string) => (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
      <h4 className="font-bold text-amber-800 mb-1">💡 {title}</h4>
      <p className="text-amber-900">{content}</p>
    </div>
  );

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
      {subtitle && <p className="text-gray-600">{subtitle}</p>}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // COLLISION VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderCollisionVisualization = (type: 'elastic' | 'inelastic', masses: 'equal' | 'heavy_light' | 'light_heavy' = 'equal') => {
    const m1Radius = masses === 'heavy_light' ? 30 : masses === 'light_heavy' ? 18 : 24;
    const m2Radius = masses === 'light_heavy' ? 30 : masses === 'heavy_light' ? 18 : 24;

    return (
      <svg viewBox="0 0 400 150" className="w-full h-40 md:h-48">
        {/* Background */}
        <rect x="0" y="0" width="400" height="150" fill="#F8FAFC" rx="10" />

        {/* Track */}
        <rect x="20" y="90" width="360" height="10" fill={colors.track} rx="5" />

        {/* Velocity arrows (before collision) */}
        {animationPhase === 'before' && (
          <g>
            <line x1={ball1Pos + 30} y1="50" x2={ball1Pos + 60} y2="50" stroke={colors.ball1} strokeWidth="3" markerEnd="url(#arrow1)" />
            <text x={ball1Pos + 45} y="40" textAnchor="middle" fill={colors.ball1} fontSize="10">v₁</text>
            <text x={ball2Pos} y="40" textAnchor="middle" fill={colors.ball2} fontSize="10">v₂ = 0</text>
          </g>
        )}

        {/* Collision effect */}
        {animationPhase === 'collision' && (
          <circle cx="170" cy="75" r="40" fill={colors.collision} opacity="0.5">
            <animate attributeName="r" values="30;50;30" dur="0.3s" />
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.3s" />
          </circle>
        )}

        {/* Velocity arrows (after collision) */}
        {animationPhase === 'after' && (
          <g>
            {ball1Vel !== 0 && (
              <>
                <line
                  x1={ball1Vel > 0 ? ball1Pos + m1Radius : ball1Pos - m1Radius}
                  y1="50"
                  x2={ball1Vel > 0 ? ball1Pos + m1Radius + 30 : ball1Pos - m1Radius - 30}
                  y2="50"
                  stroke={colors.ball1}
                  strokeWidth="3"
                />
                <polygon
                  points={ball1Vel > 0 ?
                    `${ball1Pos + m1Radius + 30},50 ${ball1Pos + m1Radius + 20},45 ${ball1Pos + m1Radius + 20},55` :
                    `${ball1Pos - m1Radius - 30},50 ${ball1Pos - m1Radius - 20},45 ${ball1Pos - m1Radius - 20},55`
                  }
                  fill={colors.ball1}
                />
              </>
            )}
            {ball2Vel > 0 && (
              <>
                <line x1={ball2Pos + m2Radius} y1="50" x2={ball2Pos + m2Radius + 30} y2="50" stroke={colors.ball2} strokeWidth="3" />
                <polygon points={`${ball2Pos + m2Radius + 30},50 ${ball2Pos + m2Radius + 20},45 ${ball2Pos + m2Radius + 20},55`} fill={colors.ball2} />
              </>
            )}
          </g>
        )}

        {/* Ball 1 */}
        <circle
          cx={ball1Pos}
          cy="75"
          r={m1Radius}
          fill={colors.ball1}
          stroke="white"
          strokeWidth="2"
        />
        <text x={ball1Pos} y="80" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          {masses === 'heavy_light' ? '3m' : masses === 'light_heavy' ? 'm' : 'm'}
        </text>

        {/* Ball 2 */}
        <circle
          cx={ball2Pos}
          cy="75"
          r={m2Radius}
          fill={type === 'elastic' ? colors.ball2 : colors.inelastic}
          stroke="white"
          strokeWidth="2"
        />
        <text x={ball2Pos} y="80" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          {masses === 'light_heavy' ? '3m' : masses === 'heavy_light' ? 'm' : 'm'}
        </text>

        {/* Type label */}
        <text x="200" y="135" textAnchor="middle" fill={type === 'elastic' ? colors.elastic : colors.inelastic} fontSize="12" fontWeight="bold">
          {type === 'elastic' ? '🎱 ELASTIC (Bouncy)' : '🧱 INELASTIC (Sticky)'}
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      {renderSectionHeader('The Collision Mystery', 'Why do some balls bounce and others stick?')}

      <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-6 mb-6 shadow-lg">
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          {/* Two scenarios */}
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Elastic scenario (top) */}
          <g transform="translate(0, 20)">
            <text x="150" y="10" textAnchor="middle" fill={colors.elastic} fontSize="11" fontWeight="bold">SUPER BALL</text>
            <rect x="20" y="45" width="260" height="8" fill={colors.track} rx="4" />

            <circle cx="80" cy="40" r="18" fill={colors.ball1} />
            <text x="80" y="45" textAnchor="middle" fill="white" fontSize="10">→</text>

            <circle cx="180" cy="40" r="18" fill={colors.ball2} />

            <text x="250" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">After:</text>
            <circle cx="50" cy="40" r="10" fill={colors.ball1} opacity="0.5" />
            <text x="50" y="43" textAnchor="middle" fill="white" fontSize="8">←</text>
            <circle cx="250" cy="40" r="10" fill={colors.ball2} opacity="0.5" />
            <text x="250" y="43" textAnchor="middle" fill="white" fontSize="8">→</text>
          </g>

          {/* Inelastic scenario (bottom) */}
          <g transform="translate(0, 100)">
            <text x="150" y="10" textAnchor="middle" fill={colors.inelastic} fontSize="11" fontWeight="bold">CLAY BALL</text>
            <rect x="20" y="45" width="260" height="8" fill={colors.track} rx="4" />

            <circle cx="80" cy="40" r="18" fill={colors.ball1} />
            <text x="80" y="45" textAnchor="middle" fill="white" fontSize="10">→</text>

            <circle cx="180" cy="40" r="18" fill={colors.inelastic} />

            <text x="250" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">After:</text>
            <ellipse cx="200" cy="40" rx="25" ry="15" fill={colors.inelastic} opacity="0.7" />
            <text x="200" y="45" textAnchor="middle" fill="white" fontSize="8">→ (stuck)</text>
          </g>
        </svg>

        <p className="text-lg text-indigo-800">
          A super ball bounces back. Clay sticks.
          <br />
          <span className="font-bold">Both conserve momentum, but something's different...</span>
        </p>
      </div>

      {renderKeyTakeaway(
        "The Mystery",
        "In both collisions, total momentum before = total momentum after. But the super ball also conserves kinetic energy—the clay doesn't. Where does the energy go?"
      )}

      {renderBottomBar(() => goToPhase('predict'), true, 'Make Your Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'both_conserve', label: 'Both momentum and energy are always conserved', icon: '⚖️' },
      { id: 'momentum_only', label: 'Momentum is always conserved, energy sometimes', icon: '📊' },
      { id: 'energy_only', label: 'Energy is always conserved, momentum sometimes', icon: '⚡' },
      { id: 'neither', label: 'Neither is truly conserved in real collisions', icon: '❓' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'What\'s conserved in collisions?')}

        <div className="grid grid-cols-1 gap-3 mb-6">
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setPrediction(option.id);
                playSound(400, 'sine', 0.1);
                emitEvent('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                prediction === option.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl">{option.icon}</span>
              <span className={prediction === option.id ? 'text-indigo-700 font-semibold' : 'text-gray-700'}>
                {option.label}
              </span>
              {prediction === option.id && (
                <span className="ml-auto text-indigo-500">✓</span>
              )}
            </button>
          ))}
        </div>

        {prediction && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <p className="text-indigo-800">
              <span className="font-semibold">Interesting hypothesis!</span> Let's test with real collision simulations.
            </p>
          </div>
        )}

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiments')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Collision Lab', 'Compare elastic vs inelastic')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderCollisionVisualization(collisionType)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Collision Type:</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!isAnimating) {
                setCollisionType('elastic');
                setBall1Pos(50);
                setBall2Pos(250);
                setAnimationPhase('before');
              }
            }}
            disabled={isAnimating}
            className={`p-3 rounded-lg border-2 transition-all ${
              collisionType === 'elastic'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-2xl">🎱</span>
            <p className="font-medium text-sm">Elastic (Bouncy)</p>
            <p className="text-xs text-gray-500">Like billiard balls</p>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!isAnimating) {
                setCollisionType('inelastic');
                setBall1Pos(50);
                setBall2Pos(250);
                setAnimationPhase('before');
              }
            }}
            disabled={isAnimating}
            className={`p-3 rounded-lg border-2 transition-all ${
              collisionType === 'inelastic'
                ? 'border-amber-500 bg-amber-50 shadow-md'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-2xl">🧱</span>
            <p className="font-medium text-sm">Inelastic (Sticky)</p>
            <p className="text-xs text-gray-500">Like clay balls</p>
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isAnimating) {
              runCollision(collisionType);
              setExperimentsRun(prev => prev + 1);
            }
          }}
          disabled={isAnimating}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            isAnimating
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isAnimating ? 'Colliding...' : '💥 Run Collision'}
        </button>
      </div>

      {animationPhase === 'after' && (
        <div className={`rounded-xl p-4 mb-4 ${collisionType === 'elastic' ? 'bg-green-50' : 'bg-amber-50'}`}>
          <p className={collisionType === 'elastic' ? 'text-green-800' : 'text-amber-800'}>
            <span className="font-bold">
              {collisionType === 'elastic'
                ? '✓ Elastic: Ball 1 bounces back, Ball 2 moves forward!'
                : '✓ Inelastic: Balls stick together and move as one!'}
            </span>
            <br />
            <span className="text-sm">
              {collisionType === 'elastic'
                ? 'Both momentum AND kinetic energy conserved.'
                : 'Momentum conserved, but kinetic energy converted to heat/deformation.'}
            </span>
          </p>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 mb-2">
        Experiments run: {experimentsRun} (try both types!)
      </div>

      {renderBottomBar(() => goToPhase('review'), experimentsRun >= 2, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader('Conservation Laws', 'The fundamental rules of collisions')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 200" className="w-full h-44 mb-4">
          <rect x="0" y="0" width="300" height="200" fill="white" rx="10" />

          {/* Momentum bar (always conserved) */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">MOMENTUM (p = mv)</text>
          <rect x="30" y="30" width="100" height="25" fill={colors.ball1} rx="5" />
          <text x="80" y="48" textAnchor="middle" fill="white" fontSize="10">Before</text>
          <rect x="170" y="30" width="100" height="25" fill={colors.success} rx="5" />
          <text x="220" y="48" textAnchor="middle" fill="white" fontSize="10">After</text>
          <text x="145" y="48" textAnchor="middle" fill={colors.success} fontSize="16">=</text>
          <text x="150" y="70" textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="bold">✓ ALWAYS CONSERVED</text>

          {/* Energy bars (elastic only) */}
          <text x="150" y="95" textAnchor="middle" fill={colors.secondary} fontSize="12" fontWeight="bold">KINETIC ENERGY (KE = ½mv²)</text>

          {/* Elastic */}
          <text x="80" y="115" textAnchor="middle" fill={colors.elastic} fontSize="10">Elastic:</text>
          <rect x="30" y="120" width="60" height="20" fill={colors.elastic} rx="3" />
          <rect x="110" y="120" width="60" height="20" fill={colors.elastic} rx="3" />
          <text x="95" y="135" textAnchor="middle" fill={colors.success} fontSize="12">=</text>

          {/* Inelastic */}
          <text x="220" y="115" textAnchor="middle" fill={colors.inelastic} fontSize="10">Inelastic:</text>
          <rect x="180" y="120" width="60" height="20" fill={colors.inelastic} rx="3" />
          <rect x="250" y="120" width="30" height="20" fill={colors.inelastic} rx="3" opacity="0.5" />
          <text x="245" y="135" textAnchor="middle" fill={colors.danger} fontSize="12">≠</text>

          {/* Legend */}
          <text x="80" y="160" textAnchor="middle" fill={colors.elastic} fontSize="9">✓ Conserved</text>
          <text x="220" y="160" textAnchor="middle" fill={colors.inelastic} fontSize="9">Lost to heat/sound</text>

          {/* Key equation */}
          <rect x="60" y="170" width="180" height="25" fill="#F8FAFC" rx="5" stroke={colors.primary} strokeWidth="1" />
          <text x="150" y="188" textAnchor="middle" fill={colors.primary} fontSize="10">p₁ᵢ + p₂ᵢ = p₁f + p₂f (ALWAYS!)</text>
        </svg>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-green-100 rounded-lg p-3">
            <p className="font-semibold text-green-800">🎱 Elastic Collisions:</p>
            <p className="text-green-700 text-sm">Both momentum AND kinetic energy conserved. Objects bounce apart.</p>
          </div>
          <div className="bg-amber-100 rounded-lg p-3">
            <p className="font-semibold text-amber-800">🧱 Inelastic Collisions:</p>
            <p className="text-amber-700 text-sm">Only momentum conserved. Energy becomes heat, sound, deformation.</p>
          </div>
        </div>
      </div>

      {renderKeyTakeaway(
        "The Key Difference",
        "Momentum conservation is a LAW—it always holds. Energy conservation in kinetic form is a PROPERTY of the collision type. Real collisions are usually somewhere in between."
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Why Momentum is Always Conserved:</h4>
        <p className="text-gray-700 text-sm">
          Newton's 3rd Law: Every action has an equal opposite reaction. When ball 1 pushes ball 2,
          ball 2 pushes back equally. The momentum one loses, the other gains. <span className="font-semibold">Total stays constant!</span>
        </p>
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Try Mass Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'heavy_wins', label: 'Heavy ball always pushes through, light bounces back', icon: '🏋️' },
      { id: 'light_wins', label: 'Light ball gains more speed after collision', icon: '🚀' },
      { id: 'same', label: 'Mass doesn\'t affect the outcome', icon: '=' }
    ];

    return (
      <div>
        {renderSectionHeader('The Mass Twist', 'What if one ball is heavier?')}

        <div className="bg-purple-50 rounded-xl p-4 mb-5">
          <p className="text-purple-800">
            We've seen equal mass collisions. Now imagine:
            <br /><br />
            <span className="font-semibold">A heavy ball (3m) hits a light ball (m), or vice versa.</span>
            <br />
            What happens in an elastic collision?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setTwistPrediction(option.id);
                playSound(400, 'sine', 0.1);
                emitEvent('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                twistPrediction === option.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-xl">{option.icon}</span>
              <span className={twistPrediction === option.id ? 'text-purple-700 font-semibold' : 'text-gray-700'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test Mass Ratios')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      {renderSectionHeader('Mass Ratio Lab', 'Elastic collisions with different masses')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderCollisionVisualization('elastic', massRatio)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Mass Combination:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'equal' as const, label: 'Equal', desc: 'm vs m' },
            { id: 'heavy_light' as const, label: 'Heavy→Light', desc: '3m vs m' },
            { id: 'light_heavy' as const, label: 'Light→Heavy', desc: 'm vs 3m' }
          ].map(m => (
            <button
              key={m.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!isAnimating) {
                  setMassRatio(m.id);
                  setBall1Pos(50);
                  setBall2Pos(250);
                  setAnimationPhase('before');
                }
              }}
              disabled={isAnimating}
              className={`p-3 rounded-lg border-2 transition-all ${
                massRatio === m.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium text-sm">{m.label}</p>
              <p className="text-xs text-gray-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isAnimating) {
              runCollision('elastic', massRatio);
              setTwistExperimentsRun(prev => prev + 1);
            }
          }}
          disabled={isAnimating}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            isAnimating
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isAnimating ? 'Colliding...' : '💥 Run Collision'}
        </button>
      </div>

      {animationPhase === 'after' && (
        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <p className="text-purple-800">
            <span className="font-bold">
              {massRatio === 'equal' && '✓ Equal masses: Ball 1 stops, Ball 2 takes all velocity!'}
              {massRatio === 'heavy_light' && '✓ Heavy hits light: Heavy continues forward (slower), light zooms off!'}
              {massRatio === 'light_heavy' && '✓ Light hits heavy: Light bounces back, heavy barely moves!'}
            </span>
          </p>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 mb-2">
        Experiments: {twistExperimentsRun} (try all three!)
      </div>

      {renderBottomBar(() => goToPhase('twist_review'), twistExperimentsRun >= 2, 'Review Findings')}
    </div>
  );

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('Mass Effects Explained', 'How mass ratio changes outcomes')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 180" className="w-full h-40 mb-4">
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Equal masses */}
          <g transform="translate(50, 30)">
            <circle cx="0" cy="0" r="15" fill={colors.ball1} />
            <text x="25" y="5" fill={colors.neutral} fontSize="10">→</text>
            <circle cx="50" cy="0" r="15" fill={colors.ball2} />
            <text x="80" y="5" fill={colors.neutral} fontSize="10">⇒</text>
            <circle cx="100" cy="0" r="8" fill={colors.ball1} opacity="0.5" />
            <circle cx="130" cy="0" r="15" fill={colors.ball2} />
            <text x="130" y="5" textAnchor="middle" fill="white" fontSize="8">→</text>
          </g>
          <text x="150" y="60" textAnchor="middle" fill={colors.neutral} fontSize="9">Equal: Complete transfer</text>

          {/* Heavy → Light */}
          <g transform="translate(50, 90)">
            <circle cx="0" cy="0" r="22" fill={colors.ball1} />
            <text x="30" y="5" fill={colors.neutral} fontSize="10">→</text>
            <circle cx="55" cy="0" r="12" fill={colors.ball2} />
            <text x="85" y="5" fill={colors.neutral} fontSize="10">⇒</text>
            <circle cx="110" cy="0" r="15" fill={colors.ball1} opacity="0.7" />
            <text x="110" y="5" textAnchor="middle" fill="white" fontSize="8">→</text>
            <circle cx="150" cy="0" r="12" fill={colors.ball2} />
            <text x="150" y="5" textAnchor="middle" fill="white" fontSize="8">→→</text>
          </g>
          <text x="150" y="125" textAnchor="middle" fill={colors.neutral} fontSize="9">Heavy→Light: Both move forward, light faster</text>

          {/* Light → Heavy */}
          <g transform="translate(50, 155)">
            <circle cx="0" cy="0" r="12" fill={colors.ball1} />
            <text x="20" y="5" fill={colors.neutral} fontSize="10">→</text>
            <circle cx="45" cy="0" r="22" fill={colors.ball2} />
            <text x="80" y="5" fill={colors.neutral} fontSize="10">⇒</text>
            <circle cx="95" cy="0" r="12" fill={colors.ball1} />
            <text x="95" y="5" textAnchor="middle" fill="white" fontSize="8">←</text>
            <circle cx="140" cy="0" r="22" fill={colors.ball2} opacity="0.7" />
            <text x="140" y="5" textAnchor="middle" fill="white" fontSize="8">→</text>
          </g>
          <text x="150" y="178" textAnchor="middle" fill={colors.neutral} fontSize="9">Light→Heavy: Light bounces, heavy moves slowly</text>
        </svg>
      </div>

      {renderKeyTakeaway(
        "Mass Ratio Rule",
        "In elastic collisions, lighter objects change velocity more than heavier ones. Think of a ping-pong ball hitting a bowling ball—the ping-pong bounces back, the bowling ball barely moves!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200 mb-4">
        <h4 className="font-bold text-gray-800 mb-2">The Physics:</h4>
        <p className="text-gray-700 text-sm mb-2">
          For an elastic collision with stationary target:
        </p>
        <div className="bg-gray-50 rounded p-2 text-center font-mono text-sm">
          v₁f = ((m₁-m₂)/(m₁+m₂)) × v₁ᵢ
          <br />
          v₂f = (2m₁/(m₁+m₂)) × v₁ᵢ
        </div>
      </div>

      {renderBottomBar(() => goToPhase('transfer'), true, 'See Applications')}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '🎱',
      title: 'Pool & Billiards',
      short: 'Game Physics',
      tagline: 'The perfect collision laboratory',
      description: 'Pool is one of the closest real-world examples to ideal elastic collisions. Players must intuitively understand momentum transfer to control ball positions.',
      connection: 'A straight shot where the cue ball stops and the target ball moves forward is a beautiful example of elastic collision between equal masses—complete momentum transfer!',
      howItWorks: 'The balls are designed with very low friction and high elasticity. Professional players use spin (angular momentum) combined with linear momentum for advanced shot control.',
      stats: [
        { value: '95%', label: 'Energy conserved' },
        { value: '0.92', label: 'Elasticity coefficient' },
        { value: '20mph', label: 'Typical break speed' }
      ],
      examples: ['Straight shots (complete transfer)', 'Follow shots (rolling forward)', 'Draw shots (backspin)', 'Combination shots', 'Jump shots'],
      companies: ['Brunswick', 'Aramith (balls)', 'Diamond (tables)', 'Simonis (cloth)'],
      futureImpact: 'Computer vision systems now track every collision for training analysis, and robotic pool players use physics simulations to plan optimal shots.',
      color: '#10B981'
    },
    {
      icon: '🚗',
      title: 'Car Crash Physics',
      short: 'Safety Engineering',
      tagline: 'Making inelastic collisions save lives',
      description: 'Car crashes are highly inelastic—kinetic energy is deliberately converted to deformation energy to protect occupants. The more the car crumples, the less energy reaches you.',
      connection: 'Unlike pool balls, we WANT car collisions to be inelastic! The energy "lost" to crushing metal is energy NOT transferred to passengers.',
      howItWorks: 'Crumple zones are engineered to deform progressively, converting kinetic energy to material deformation. The passenger cabin remains rigid while the front/rear absorbs impact.',
      stats: [
        { value: '70%', label: 'Energy absorbed by crumple' },
        { value: '50ms', label: 'Typical crash duration' },
        { value: '90%', label: 'Fatality reduction since 1970' }
      ],
      examples: ['Front crumple zones', 'Side-impact bars', 'Rear crumple structures', 'Airbag deployment timing'],
      companies: ['NHTSA (testing)', 'Euro NCAP', 'Volvo (safety pioneer)', 'Mercedes (inventor)'],
      futureImpact: 'Autonomous vehicles aim to prevent crashes entirely, but passive safety continues to improve with new materials like carbon fiber crumple zones.',
      color: '#EF4444'
    },
    {
      icon: '⚛️',
      title: 'Particle Physics',
      short: 'Subatomic World',
      tagline: 'Collisions reveal the universe\'s secrets',
      description: 'Particle accelerators like the Large Hadron Collider smash particles together at near light-speed. The collision products reveal fundamental particles and forces.',
      connection: 'Particle collisions can be elastic, inelastic, or even create NEW particles from pure energy (E=mc²). Momentum is always conserved, even when new matter appears!',
      howItWorks: 'Protons are accelerated in a 27km ring and collided at specific points. Detectors track every resulting particle, reconstructing what happened via conservation laws.',
      stats: [
        { value: '99.999%', label: 'Speed of light' },
        { value: '13 TeV', label: 'Collision energy' },
        { value: '600M', label: 'Collisions per second' }
      ],
      examples: ['Higgs boson discovery', 'Quark-gluon plasma', 'Antimatter creation', 'Dark matter searches'],
      companies: ['CERN', 'Fermilab', 'SLAC', 'Brookhaven'],
      futureImpact: 'Future colliders like FCC could reach 100 TeV, potentially revealing supersymmetry or extra dimensions through collision products.',
      color: '#8B5CF6'
    },
    {
      icon: '⛳',
      title: 'Golf Impact Physics',
      short: 'Sports Equipment',
      tagline: 'Maximizing energy transfer',
      description: 'The golf club-ball collision is engineered to transfer maximum energy while controlling spin and launch angle. The "sweet spot" represents optimal elastic collision.',
      connection: 'A well-struck golf shot approaches perfect elastic collision—nearly all clubhead energy transfers to the ball. Mishits are more inelastic, losing energy to vibration.',
      howItWorks: 'Modern drivers use thin titanium faces that flex and snap back (trampoline effect), temporarily storing and returning energy for higher ball speeds.',
      stats: [
        { value: '0.83', label: 'COR limit (USGA)' },
        { value: '1.5x', label: 'Ball speed vs club' },
        { value: '180mph', label: 'Pro ball speed' }
      ],
      examples: ['Driver face flexing', 'Iron compression', 'Putter feel', 'Ball construction layers'],
      companies: ['Titleist', 'TaylorMade', 'Callaway', 'Bridgestone'],
      futureImpact: 'AI-designed club faces optimize collision zones, while launch monitors provide instant feedback on energy transfer efficiency.',
      color: '#F59E0B'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Real-World Collisions', 'From games to galaxies')}

      {completedApps < realWorldApps.length ? (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div
            className="p-4 text-white"
            style={{ backgroundColor: realWorldApps[completedApps].color }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">{realWorldApps[completedApps].icon}</span>
              <div>
                <h3 className="text-xl font-bold">{realWorldApps[completedApps].title}</h3>
                <p className="opacity-90">{realWorldApps[completedApps].tagline}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-gray-700 mb-4">{realWorldApps[completedApps].description}</p>

            <div className="bg-indigo-50 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Collisions:</h4>
              <p className="text-indigo-700 text-sm">{realWorldApps[completedApps].connection}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-gray-800 mb-1">⚙️ How It Works:</h4>
              <p className="text-gray-700 text-sm">{realWorldApps[completedApps].howItWorks}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {realWorldApps[completedApps].stats.map((stat, i) => (
                <div key={i} className="text-center bg-white rounded-lg p-2 shadow-sm border">
                  <div className="text-lg font-bold" style={{ color: realWorldApps[completedApps].color }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {realWorldApps[completedApps].examples.slice(0, 4).map((ex, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                  {ex}
                </span>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                playSound(600, 'sine', 0.1);
                setCompletedApps(prev => prev + 1);
              }}
              className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: realWorldApps[completedApps].color }}
            >
              {completedApps < realWorldApps.length - 1 ? 'Next Application →' : 'Complete Applications'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="bg-green-50 rounded-2xl p-6 mb-6">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Applications Complete!</h3>
            <p className="text-green-700">
              From pool tables to particle accelerators, collision physics is everywhere!
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {realWorldApps.map((app, i) => (
              <div
                key={i}
                className="p-3 rounded-xl text-center"
                style={{ backgroundColor: `${app.color}20` }}
              >
                <span className="text-2xl">{app.icon}</span>
                <p className="text-xs font-medium mt-1" style={{ color: app.color }}>{app.short}</p>
              </div>
            ))}
          </div>

          {renderBottomBar(() => goToPhase('test'), true, 'Take the Test')}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    {
      scenario: 'Two identical billiard balls collide head-on. Ball A is moving, Ball B is stationary.',
      question: 'In a perfectly elastic collision, what happens?',
      options: [
        { text: 'Both balls move forward together', correct: false },
        { text: 'Ball A stops, Ball B moves with Ball A\'s original speed', correct: true },
        { text: 'Both balls bounce backward', correct: false },
        { text: 'Ball B stays still, Ball A bounces back', correct: false }
      ],
      explanation: 'In elastic collisions between equal masses, momentum and energy conservation require complete velocity exchange—Ball A stops, Ball B moves with A\'s original velocity.'
    },
    {
      scenario: 'A golf ball and a bowling ball collide head-on, both moving at the same speed.',
      question: 'After collision, which experiences the greater speed change?',
      options: [
        { text: 'The bowling ball (more mass means more change)', correct: false },
        { text: 'The golf ball (lighter objects change more)', correct: true },
        { text: 'Both change equally (same initial speed)', correct: false },
        { text: 'Neither changes (momentum cancels)', correct: false }
      ],
      explanation: 'Momentum conservation requires mv changes balance. Since m is smaller for the golf ball, v must change more to keep Δ(mv) equal but opposite.'
    },
    {
      scenario: 'Two cars of equal mass collide and stick together.',
      question: 'This is called:',
      options: [
        { text: 'An elastic collision', correct: false },
        { text: 'A perfectly inelastic collision', correct: true },
        { text: 'An impossible collision', correct: false },
        { text: 'A momentum-violating collision', correct: false }
      ],
      explanation: 'When objects stick together after collision, it\'s a perfectly inelastic collision—maximum kinetic energy is lost while momentum is still conserved.'
    },
    {
      scenario: 'In a particle accelerator, two protons collide and create a new particle.',
      question: 'Which quantity is NOT necessarily conserved?',
      options: [
        { text: 'Momentum', correct: false },
        { text: 'Kinetic energy (it becomes mass!)', correct: true },
        { text: 'Total energy', correct: false },
        { text: 'Electric charge', correct: false }
      ],
      explanation: 'When new particles are created, kinetic energy converts to mass (E=mc²). Total energy and momentum are conserved, but kinetic energy alone is not.'
    },
    {
      scenario: 'A Newton\'s cradle has 5 steel balls. You pull back and release 2 balls.',
      question: 'What happens on the other side?',
      options: [
        { text: '1 ball swings out twice as high', correct: false },
        { text: '2 balls swing out at the same speed', correct: true },
        { text: '3 balls swing out at lower speed', correct: false },
        { text: '5 balls move slightly', correct: false }
      ],
      explanation: 'Both momentum AND energy must be conserved. Only 2 balls out at the same speed satisfies both conditions. Other options violate one or both laws.'
    },
    {
      scenario: 'A 2kg ball moving at 3m/s hits a stationary 1kg ball elastically.',
      question: 'What is the total momentum before and after?',
      options: [
        { text: 'Before: 6 kg·m/s, After: 3 kg·m/s', correct: false },
        { text: 'Before: 6 kg·m/s, After: 6 kg·m/s', correct: true },
        { text: 'Before: 3 kg·m/s, After: 6 kg·m/s', correct: false },
        { text: 'It depends on the collision angle', correct: false }
      ],
      explanation: 'Momentum is ALWAYS conserved: p = mv = 2kg × 3m/s = 6 kg·m/s, and this exact amount exists after the collision, just distributed differently.'
    },
    {
      scenario: 'A car crash test shows the vehicle\'s front end crumples significantly.',
      question: 'Why is this considered a safety feature?',
      options: [
        { text: 'It makes the car lighter', correct: false },
        { text: 'It converts kinetic energy to deformation energy', correct: true },
        { text: 'It increases the car\'s momentum', correct: false },
        { text: 'It reflects the impact force backward', correct: false }
      ],
      explanation: 'The crumpling converts passenger kinetic energy into work done deforming metal. This inelastic process protects occupants by absorbing energy that would otherwise harm them.'
    },
    {
      scenario: 'A super ball vs a clay ball, same mass, dropped from same height onto concrete.',
      question: 'Which exerts more force on the ground?',
      options: [
        { text: 'Clay ball (inelastic means more force)', correct: false },
        { text: 'Super ball (bounces, so more momentum change)', correct: true },
        { text: 'Same force (same mass and drop height)', correct: false },
        { text: 'Neither exerts force (momentum is conserved)', correct: false }
      ],
      explanation: 'The super ball reverses direction, so its momentum change is 2mv (stops then rebounds) vs mv for clay (just stops). More momentum change means more force!'
    },
    {
      scenario: 'In elastic collision, a small ball hits a large stationary ball.',
      question: 'The small ball bounces back. What happened to its kinetic energy?',
      options: [
        { text: 'It was destroyed', correct: false },
        { text: 'Most transferred to the large ball', correct: false },
        { text: 'The small ball keeps most of it (reversed direction)', correct: true },
        { text: 'Converted to potential energy', correct: false }
      ],
      explanation: 'Since the large ball barely moves, it gains little kinetic energy. The small ball reverses direction but keeps most of its speed, thus most of its kinetic energy.'
    },
    {
      scenario: 'A hockey puck slides on ice and hits the boards, sticking momentarily before falling.',
      question: 'What type of collision is this?',
      options: [
        { text: 'Elastic (ice has low friction)', correct: false },
        { text: 'Inelastic (puck doesn\'t bounce back)', correct: true },
        { text: 'Neither (momentum wasn\'t conserved)', correct: false },
        { text: 'Super-elastic (energy was added)', correct: false }
      ],
      explanation: 'The puck sticks and stops, converting all kinetic energy to sound, heat, and deformation. This is an inelastic collision—momentum transferred to the entire rink!'
    }
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    playSound(optionIndex === testQuestions[questionIndex].options.findIndex(o => o.correct) ? 600 : 300, 'sine', 0.15);
  };

  const calculateTestScore = () => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) correct++;
    });
    return correct;
  };

  const renderTest = () => {
    const allAnswered = testAnswers.every(a => a !== null);

    if (showTestResults) {
      const score = calculateTestScore();
      return (
        <div className="text-center">
          {renderSectionHeader('Test Results', `You scored ${score}/10`)}

          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 mb-6">
            <div className="text-6xl mb-4">
              {score >= 8 ? '🏆' : score >= 6 ? '🌟' : '📚'}
            </div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">{score * 10}%</div>
            <p className="text-indigo-800">
              {score >= 8 ? 'Excellent! Collision physics mastered!' :
               score >= 6 ? 'Good grasp of conservation laws!' :
               'Review the concepts and try again!'}
            </p>
          </div>

          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {testQuestions.map((q, i) => {
              const isCorrect = testAnswers[i] !== null && q.options[testAnswers[i]!].correct;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-left ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <div className="flex items-start gap-2">
                    <span>{isCorrect ? '✓' : '✗'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Q{i+1}: {q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-gray-600 mt-1">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {renderBottomBar(() => {
            setTestScore(score);
            goToPhase('mastery');
          }, true, 'Complete Lesson')}
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeader('Knowledge Check', `${testAnswers.filter(a => a !== null).length}/10 answered`)}

        <div className="space-y-6 max-h-96 overflow-y-auto mb-4">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1 italic">{q.scenario}</p>
              <p className="font-semibold text-gray-800 mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`p-2 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {renderBottomBar(() => setShowTestResults(true), allAnswered, 'Submit Answers')}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MASTERY PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const renderMastery = () => {
    const confetti = Array(20).fill(null).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: [colors.primary, colors.secondary, colors.accent, colors.success][Math.floor(Math.random() * 4)]
    }));

    return (
      <div className="text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {confetti.map((c, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${c.left}%`,
                top: '-10px',
                backgroundColor: c.color,
                animation: `fall ${c.duration}s ease-in forwards`,
                animationDelay: `${c.delay}s`
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Collision Physics Mastered!
        </h2>
        <p className="text-gray-600 mb-6">You've conquered conservation laws!</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Momentum Conservation:</span>
              <p className="text-sm text-gray-700">p₁ᵢ + p₂ᵢ = p₁f + p₂f (ALWAYS true!)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Elastic Collisions:</span>
              <p className="text-sm text-gray-700">Both momentum AND kinetic energy conserved</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Inelastic Collisions:</span>
              <p className="text-sm text-gray-700">Only momentum conserved; energy becomes heat/deformation</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Mass Effects:</span>
              <p className="text-sm text-gray-700">Lighter objects change velocity more than heavier ones</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-green-600 mb-1">
            Test Score: {testScore}/10 ({testScore * 10}%)
          </div>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound(800, 'sine', 0.3);
            if (onComplete) onComplete(testScore * 10);
            emitEvent('completion', { score: testScore * 10 });
          }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          Complete Lesson 🚀
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 ${isMobile ? 'p-3' : 'p-6'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            ⚽ Collision Physics
          </h1>
          <p className="text-gray-600 text-sm">Energy vs Momentum</p>
        </div>

        {renderProgressBar()}

        {showCoachMessage && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl p-4 mb-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧑‍🏫</span>
              <p className="flex-1">{coachMessages[phase]}</p>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowCoachMessage(false);
                }}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-4 md:p-6">
          {phase === 'hook' && renderHook()}
          {phase === 'predict' && renderPredict()}
          {phase === 'play' && renderPlay()}
          {phase === 'review' && renderReview()}
          {phase === 'twist_predict' && renderTwistPredict()}
          {phase === 'twist_play' && renderTwistPlay()}
          {phase === 'twist_review' && renderTwistReview()}
          {phase === 'transfer' && renderTransfer()}
          {phase === 'test' && renderTest()}
          {phase === 'mastery' && renderMastery()}
        </div>
      </div>
    </div>
  );
};

export default TwoBallCollisionRenderer;
