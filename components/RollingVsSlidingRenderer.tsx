import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ROLLINGVSSLIDING RENDERER - FRICTION TYPES
// Teaching: Rolling friction << Sliding friction. Why wheels changed everything!
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

interface RollingVsSlidingRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const RollingVsSlidingRenderer: React.FC<RollingVsSlidingRendererProps> = ({
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

  // Motion simulation
  const [motionType, setMotionType] = useState<'sliding' | 'rolling'>('sliding');
  const [appliedForce, setAppliedForce] = useState(0);
  const [objectPosition, setObjectPosition] = useState(0);
  const [objectVelocity, setObjectVelocity] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [experimentsRun, setExperimentsRun] = useState(0);

  // Twist: static vs kinetic
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'rough'>('smooth');
  const [twistForce, setTwistForce] = useState(0);
  const [twistPosition, setTwistPosition] = useState(0);
  const [twistVelocity, setTwistVelocity] = useState(0);
  const [hasBrokenFree, setHasBrokenFree] = useState(false);
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
  // FRICTION PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  // Friction coefficients (simplified)
  const getFriction = (type: 'sliding' | 'rolling', surface: 'smooth' | 'rough' = 'smooth') => {
    // Rolling friction is much smaller than sliding
    const baseFrictions = {
      sliding: { smooth: 0.4, rough: 0.7 },
      rolling: { smooth: 0.02, rough: 0.05 }
    };
    return baseFrictions[type][surface];
  };

  const getStaticFriction = (surface: 'smooth' | 'rough') => {
    // Static friction is higher than kinetic
    return surface === 'smooth' ? 0.5 : 0.9;
  };

  const startMotion = () => {
    if (isMoving || hasStarted) return;

    const friction = getFriction(motionType);
    const force = appliedForce;
    const weight = 10; // N
    const frictionForce = friction * weight;

    if (force <= frictionForce && motionType === 'sliding') {
      // Not enough force to overcome static friction
      playSound(200, 'square', 0.2);
      return;
    }

    setIsMoving(true);
    setHasStarted(true);
    playSound(400, 'sine', 0.1);

    const netAccel = (force - frictionForce) / 1; // mass = 1kg

    let pos = 0;
    let vel = 0;

    const animate = () => {
      vel += netAccel * 0.016;
      if (vel < 0) vel = 0;
      pos += vel * 0.016 * 50;

      setObjectPosition(pos);
      setObjectVelocity(vel);

      if (pos < 300 && vel > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        emitEvent('observation', {
          details: `${motionType} moved ${pos.toFixed(0)} units with friction ${friction.toFixed(3)}`
        });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const startTwistMotion = () => {
    const staticFric = getStaticFriction(surfaceType);
    const kineticFric = getFriction('sliding', surfaceType);
    const weight = 10;

    const staticForce = staticFric * weight;
    const kineticForce = kineticFric * weight;

    if (twistForce < staticForce && !hasBrokenFree) {
      // Not enough to break static friction
      playSound(200, 'square', 0.2);
      return;
    }

    if (!hasBrokenFree) {
      setHasBrokenFree(true);
      playSound(600, 'triangle', 0.2);
    }

    // Once moving, kinetic friction is lower
    const netAccel = (twistForce - kineticForce) / 1;

    let pos = twistPosition;
    let vel = twistVelocity;

    const animate = () => {
      vel += netAccel * 0.016;
      if (vel < 0) vel = 0;
      pos += vel * 0.016 * 50;

      setTwistPosition(pos);
      setTwistVelocity(vel);

      if (pos < 300 && vel > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        emitEvent('observation', {
          details: `Static friction: ${staticForce.toFixed(1)}N, Kinetic: ${kineticForce.toFixed(1)}N`
        });
      }
    };

    if (netAccel > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const resetMotion = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setObjectPosition(0);
    setObjectVelocity(0);
    setIsMoving(false);
    setHasStarted(false);
  };

  const resetTwistMotion = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setTwistPosition(0);
    setTwistVelocity(0);
    setHasBrokenFree(false);
    setTwistForce(0);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "🛞 Why did the invention of the wheel change human civilization? The answer is friction!",
    predict: "Predict: Is it easier to push a heavy box or roll it on wheels?",
    play: "Apply force to sliding and rolling objects. Compare how far they go!",
    review: "Rolling friction can be 20-100× less than sliding! That's why wheels matter!",
    twist_predict: "Here's a twist: is it harder to START moving or to KEEP moving?",
    twist_play: "Test static vs kinetic friction. Watch what happens when you break free!",
    twist_review: "Static friction > Kinetic friction. Once moving, it's easier to keep moving!",
    transfer: "From tires to brakes to bearings, friction physics is everywhere!",
    test: "Let's test your understanding of friction types!",
    mastery: "🎉 You've mastered friction physics! Roll on!"
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
    sliding: '#EF4444',
    rolling: '#10B981',
    surface: '#78716C',
    object: '#3B82F6',
    wheel: '#1F2937'
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
  // MOTION VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderMotionVisualization = (
    type: 'sliding' | 'rolling',
    position: number,
    force: number
  ) => {
    const friction = getFriction(type);
    const wheelRotation = type === 'rolling' ? position * 2 : 0;

    return (
      <svg viewBox="0 0 400 150" className="w-full h-36 md:h-44">
        {/* Background */}
        <rect x="0" y="0" width="400" height="150" fill="#F8FAFC" rx="10" />

        {/* Surface */}
        <rect x="0" y="110" width="400" height="40" fill={colors.surface} />

        {/* Friction indicators */}
        <g transform={`translate(${50 + position}, 110)`}>
          {/* Friction lines (more for sliding) */}
          {type === 'sliding' && (
            <>
              <line x1="-30" y1="-2" x2="-10" y2="-2" stroke={colors.sliding} strokeWidth="3" />
              <line x1="-25" y1="2" x2="-5" y2="2" stroke={colors.sliding} strokeWidth="3" />
              <line x1="-20" y1="6" x2="0" y2="6" stroke={colors.sliding} strokeWidth="2" />
            </>
          )}
          {type === 'rolling' && (
            <line x1="-15" y1="0" x2="0" y2="0" stroke={colors.rolling} strokeWidth="2" strokeDasharray="3,3" />
          )}
        </g>

        {/* Object/Cart */}
        <g transform={`translate(${50 + position}, 0)`}>
          {type === 'sliding' ? (
            // Sliding box
            <g>
              <rect x="-25" y="60" width="50" height="50" fill={colors.object} rx="5" />
              <text x="0" y="90" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BOX</text>
              {/* Friction sparks for sliding */}
              {position > 0 && (
                <>
                  <circle cx="-20" cy="108" r="3" fill={colors.accent} opacity="0.7" />
                  <circle cx="-10" cy="106" r="2" fill={colors.accent} opacity="0.5" />
                </>
              )}
            </g>
          ) : (
            // Rolling cart with wheels
            <g>
              <rect x="-30" y="50" width="60" height="35" fill={colors.object} rx="5" />
              <text x="0" y="72" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">CART</text>
              {/* Wheels */}
              <g transform={`translate(-20, 95)`}>
                <circle cx="0" cy="0" r="15" fill={colors.wheel} />
                <circle cx="0" cy="0" r="10" fill="#374151" />
                <line
                  x1="0" y1="-8"
                  x2="0" y2="8"
                  stroke="white"
                  strokeWidth="2"
                  transform={`rotate(${wheelRotation})`}
                />
              </g>
              <g transform={`translate(20, 95)`}>
                <circle cx="0" cy="0" r="15" fill={colors.wheel} />
                <circle cx="0" cy="0" r="10" fill="#374151" />
                <line
                  x1="0" y1="-8"
                  x2="0" y2="8"
                  stroke="white"
                  strokeWidth="2"
                  transform={`rotate(${wheelRotation})`}
                />
              </g>
            </g>
          )}

          {/* Applied force arrow */}
          {force > 0 && (
            <g>
              <line x1={-60 - force / 2} y1="80" x2="-30" y2="80" stroke={colors.primary} strokeWidth="4" />
              <polygon points="-30,80 -40,74 -40,86" fill={colors.primary} />
              <text x={-60 - force / 2} y="75" textAnchor="middle" fill={colors.primary} fontSize="10" fontWeight="bold">
                {force}N
              </text>
            </g>
          )}
        </g>

        {/* Distance marker */}
        {position > 0 && (
          <g>
            <line x1="50" y1="130" x2={50 + position} y2="130" stroke={colors.success} strokeWidth="2" />
            <text x={50 + position / 2} y="145" textAnchor="middle" fill={colors.success} fontSize="10">
              {position.toFixed(0)} units
            </text>
          </g>
        )}

        {/* Type label */}
        <text x="200" y="25" textAnchor="middle" fill={type === 'sliding' ? colors.sliding : colors.rolling} fontSize="14" fontWeight="bold">
          {type === 'sliding' ? '📦 SLIDING (μ = 0.4)' : '🛞 ROLLING (μ = 0.02)'}
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      {renderSectionHeader('The Wheel Revolution', 'Why wheels changed everything')}

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 mb-6 shadow-lg">
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Ground */}
          <rect x="0" y="150" width="300" height="30" fill={colors.surface} />

          {/* Slave dragging block (ancient) */}
          <g transform="translate(70, 150)">
            <rect x="-30" y="-40" width="60" height="40" fill={colors.sliding} rx="3" />
            <text x="0" y="-15" textAnchor="middle" fill="white" fontSize="8">STONE</text>
            {/* Friction lines */}
            <line x1="-35" y1="-2" x2="-20" y2="-2" stroke={colors.danger} strokeWidth="2" />
            <line x1="-30" y1="3" x2="-15" y2="3" stroke={colors.danger} strokeWidth="2" />
            <text x="0" y="20" textAnchor="middle" fill={colors.danger} fontSize="9">Hard to move!</text>
          </g>

          {/* Wheeled cart (modern) */}
          <g transform="translate(230, 150)">
            <rect x="-30" y="-55" width="60" height="40" fill={colors.rolling} rx="3" />
            <text x="0" y="-30" textAnchor="middle" fill="white" fontSize="8">STONE</text>
            <circle cx="-15" cy="-10" r="12" fill={colors.wheel} />
            <circle cx="15" cy="-10" r="12" fill={colors.wheel} />
            <text x="0" y="20" textAnchor="middle" fill={colors.success} fontSize="9">Easy!</text>
          </g>

          {/* Arrow between */}
          <text x="150" y="100" textAnchor="middle" fill={colors.primary} fontSize="20" fontWeight="bold">➜</text>
          <text x="150" y="60" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">WHEELS!</text>

          <text x="150" y="25" textAnchor="middle" fill={colors.neutral} fontSize="12">How pyramids were built vs modern transport</text>
        </svg>

        <p className="text-lg text-amber-800">
          The same stone becomes 20× easier to move with wheels.
          <br />
          <span className="font-bold">Why is rolling so much easier than sliding?</span>
        </p>
      </div>

      {renderKeyTakeaway(
        "The Question",
        "Both sliding and rolling involve friction, but rolling friction is dramatically less. Understanding why changed human civilization!"
      )}

      {renderBottomBar(() => goToPhase('predict'), true, 'Make Your Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'same', label: 'Rolling and sliding have similar friction', icon: '=' },
      { id: 'rolling_less', label: 'Rolling has much less friction than sliding', icon: '🛞' },
      { id: 'sliding_less', label: 'Sliding has less friction (no wheel resistance)', icon: '📦' },
      { id: 'depends', label: 'It depends entirely on the surface', icon: '❓' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'Rolling vs Sliding Friction')}

        <div className="bg-blue-50 rounded-xl p-4 mb-5">
          <p className="text-blue-800">
            You need to move a 100kg crate across a warehouse floor.
            <br /><br />
            <span className="font-semibold">Is it easier to slide it or put it on a cart with wheels?</span>
          </p>
        </div>

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

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiments')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Friction Lab', 'Compare sliding vs rolling')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderMotionVisualization(motionType, objectPosition, appliedForce)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Motion Type:</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setMotionType('sliding');
              resetMotion();
            }}
            className={`p-3 rounded-lg border-2 transition-all ${
              motionType === 'sliding'
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-2xl">📦</span>
            <p className="font-medium">Sliding Box</p>
            <p className="text-xs text-gray-500">μ = 0.4</p>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setMotionType('rolling');
              resetMotion();
            }}
            className={`p-3 rounded-lg border-2 transition-all ${
              motionType === 'rolling'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-2xl">🛞</span>
            <p className="font-medium">Rolling Cart</p>
            <p className="text-xs text-gray-500">μ = 0.02</p>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Applied Force: {appliedForce}N</h4>
        <input
          type="range"
          min="0"
          max="20"
          value={appliedForce}
          onChange={(e) => setAppliedForce(parseInt(e.target.value))}
          disabled={isMoving || hasStarted}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0N</span>
          <span>Required: {motionType === 'sliding' ? '4N' : '0.2N'}</span>
          <span>20N</span>
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isMoving && !hasStarted) {
              startMotion();
              setExperimentsRun(prev => prev + 1);
            }
          }}
          disabled={isMoving || hasStarted || appliedForce === 0}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            isMoving || hasStarted || appliedForce === 0
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
          }`}
        >
          Push!
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetMotion();
          }}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium"
        >
          Reset
        </button>
      </div>

      {hasStarted && !isMoving && (
        <div className={`rounded-xl p-4 mb-4 ${objectPosition > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={objectPosition > 0 ? 'text-green-800' : 'text-red-800'}>
            <span className="font-bold">
              {objectPosition > 0
                ? `✓ Traveled ${objectPosition.toFixed(0)} units!`
                : '✗ Not enough force to overcome friction'}
            </span>
            <br />
            <span className="text-sm">
              {motionType === 'sliding'
                ? `Sliding friction = 0.4 × 10N = 4N needed to move`
                : `Rolling friction = 0.02 × 10N = only 0.2N needed!`}
            </span>
          </p>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mb-2">
        Experiments run: {experimentsRun} (try both types with same force!)
      </p>

      {renderBottomBar(() => goToPhase('review'), experimentsRun >= 2, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader('The Friction Difference', 'Why rolling wins')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 160" className="w-full h-36 mb-4">
          <rect x="0" y="0" width="300" height="160" fill="white" rx="10" />

          {/* Bar chart comparison */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
            FRICTION COEFFICIENT COMPARISON
          </text>

          {/* Sliding bar */}
          <rect x="60" y="40" width="80" height="30" fill={colors.sliding} rx="5" />
          <text x="100" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">μ = 0.4</text>
          <text x="100" y="85" textAnchor="middle" fill={colors.neutral} fontSize="10">SLIDING</text>

          {/* Rolling bar (much smaller) */}
          <rect x="180" y="66" width="4" height="4" fill={colors.rolling} rx="1" />
          <text x="220" y="72" textAnchor="start" fill={colors.rolling} fontSize="11" fontWeight="bold">μ = 0.02</text>
          <text x="182" y="85" textAnchor="middle" fill={colors.neutral} fontSize="10">ROLLING</text>

          {/* Comparison */}
          <text x="150" y="115" textAnchor="middle" fill={colors.danger} fontSize="14" fontWeight="bold">
            Sliding = 20× MORE FRICTION!
          </text>

          <text x="150" y="140" textAnchor="middle" fill={colors.neutral} fontSize="10">
            Same weight, same surface, huge difference
          </text>
        </svg>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-100 rounded-lg p-3">
            <h4 className="font-bold text-red-800 mb-1">📦 Sliding Friction</h4>
            <p className="text-red-700 text-sm">
              Surface atoms interlock. Continuous breaking of bonds = high resistance.
            </p>
          </div>
          <div className="bg-green-100 rounded-lg p-3">
            <h4 className="font-bold text-green-800 mb-1">🛞 Rolling Friction</h4>
            <p className="text-green-700 text-sm">
              Surface deforms slightly. No sliding = minimal energy loss.
            </p>
          </div>
        </div>
      </div>

      {renderKeyTakeaway(
        "Why Wheels Are Revolutionary",
        "Rolling friction is typically 10-100× less than sliding friction. This single physics fact enabled carts, cars, trains, and planes—transforming human civilization!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">The Physics:</h4>
        <p className="text-gray-700 text-sm">
          Sliding friction involves continuous breaking of surface bonds. Rolling friction only requires
          <span className="font-semibold"> deforming</span> the surface slightly at the contact point—much less energy!
        </p>
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Static vs Kinetic Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'start_harder', label: 'Starting to move requires more force than continuing', icon: '🏋️' },
      { id: 'same', label: 'Starting and continuing require the same force', icon: '=' },
      { id: 'continue_harder', label: 'Continuing to move is harder than starting', icon: '🏃' }
    ];

    return (
      <div>
        {renderSectionHeader('Static vs Kinetic Twist', 'Starting vs. continuing')}

        <div className="bg-purple-50 rounded-xl p-4 mb-5">
          <p className="text-purple-800">
            You've probably noticed: pushing a heavy object to START moving
            seems harder than keeping it moving.
            <br /><br />
            <span className="font-semibold">Is this real physics or just perception?</span>
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

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test Static Friction')}
      </div>
    );
  };

  const renderTwistPlay = () => {
    const staticForce = getStaticFriction(surfaceType) * 10;
    const kineticForce = getFriction('sliding', surfaceType) * 10;

    return (
      <div>
        {renderSectionHeader('Static vs Kinetic Lab', 'Break free then slide')}

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <svg viewBox="0 0 400 120" className="w-full h-28">
            <rect x="0" y="0" width="400" height="120" fill="#F8FAFC" rx="10" />
            <rect x="0" y="90" width="400" height="30" fill={surfaceType === 'rough' ? '#5C4033' : colors.surface} />

            {/* Object */}
            <g transform={`translate(${50 + twistPosition}, 90)`}>
              <rect x="-25" y="-50" width="50" height="50" fill={hasBrokenFree ? colors.success : colors.sliding} rx="5" />
              <text x="0" y="-20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                {hasBrokenFree ? 'MOVING!' : 'STUCK'}
              </text>

              {/* Force arrow */}
              {twistForce > 0 && (
                <g>
                  <line x1={-60 - twistForce * 3} y1="-25" x2="-30" y2="-25" stroke={colors.primary} strokeWidth="4" />
                  <polygon points="-30,-25 -40,-19 -40,-31" fill={colors.primary} />
                </g>
              )}
            </g>

            {/* Status */}
            <text x="200" y="25" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
              Force: {twistForce}N | Static threshold: {staticForce.toFixed(1)}N | Kinetic: {kineticForce.toFixed(1)}N
            </text>
          </svg>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Surface Type:</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setSurfaceType('smooth');
                resetTwistMotion();
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                surfaceType === 'smooth'
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium">Smooth Floor</p>
              <p className="text-xs text-gray-500">Static: {getStaticFriction('smooth').toFixed(1)}μ</p>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setSurfaceType('rough');
                resetTwistMotion();
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                surfaceType === 'rough'
                  ? 'border-amber-500 bg-amber-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium">Rough Floor</p>
              <p className="text-xs text-gray-500">Static: {getStaticFriction('rough').toFixed(1)}μ</p>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Applied Force: {twistForce}N</h4>
          <input
            type="range"
            min="0"
            max="15"
            value={twistForce}
            onChange={(e) => {
              const newForce = parseInt(e.target.value);
              setTwistForce(newForce);
              if (newForce >= staticForce && !hasBrokenFree) {
                startTwistMotion();
                setTwistExperimentsRun(prev => prev + 1);
              }
            }}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0N</span>
            <span className="text-red-500 font-bold">Static: {staticForce.toFixed(1)}N</span>
            <span className="text-green-500 font-bold">Kinetic: {kineticForce.toFixed(1)}N</span>
            <span>15N</span>
          </div>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetTwistMotion();
          }}
          className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-medium mb-4"
        >
          Reset
        </button>

        {hasBrokenFree && (
          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <p className="text-green-800">
              <span className="font-bold">✓ Broke free at {staticForce.toFixed(1)}N!</span>
              <br />
              <span className="text-sm">
                Now only {kineticForce.toFixed(1)}N needed to keep moving. Static friction > Kinetic friction!
              </span>
            </p>
          </div>
        )}

        {renderBottomBar(() => goToPhase('twist_review'), twistExperimentsRun >= 1, 'Review Findings')}
      </div>
    );
  };

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('Two Types of Friction', 'Static vs Kinetic')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 140" className="w-full h-32 mb-4">
          <rect x="0" y="0" width="300" height="140" fill="white" rx="10" />

          {/* Graph */}
          <line x1="50" y1="110" x2="280" y2="110" stroke={colors.neutral} strokeWidth="2" />
          <line x1="50" y1="110" x2="50" y2="20" stroke={colors.neutral} strokeWidth="2" />

          <text x="165" y="130" textAnchor="middle" fill={colors.neutral} fontSize="10">Applied Force →</text>
          <text x="25" y="70" textAnchor="middle" fill={colors.neutral} fontSize="10" transform="rotate(-90, 25, 70)">Friction →</text>

          {/* Static friction line (rises then drops) */}
          <path d="M 50,110 L 120,50" stroke={colors.danger} strokeWidth="3" fill="none" />
          <circle cx="120" cy="50" r="5" fill={colors.danger} />
          <text x="85" y="45" textAnchor="middle" fill={colors.danger} fontSize="9" fontWeight="bold">STATIC MAX</text>

          {/* Kinetic friction line (lower) */}
          <line x1="120" y1="70" x2="260" y2="70" stroke={colors.success} strokeWidth="3" />
          <text x="190" y="60" textAnchor="middle" fill={colors.success} fontSize="9" fontWeight="bold">KINETIC (lower)</text>

          {/* Drop indicator */}
          <line x1="120" y1="50" x2="120" y2="70" stroke={colors.accent} strokeWidth="2" strokeDasharray="4,2" />
          <text x="140" y="95" textAnchor="middle" fill={colors.accent} fontSize="8">BREAK FREE!</text>
        </svg>

        <div className="text-center">
          <p className="text-lg text-purple-800 font-semibold">
            Static Friction > Kinetic Friction
          </p>
          <p className="text-purple-700 text-sm mt-1">
            Once you break the bonds and start moving, less force is needed!
          </p>
        </div>
      </div>

      {renderKeyTakeaway(
        "Why This Matters",
        "This is why ABS brakes work! If wheels lock up (sliding), friction drops. ABS keeps wheels just at the edge of slipping, maximizing braking force."
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Summary:</h4>
        <ul className="text-gray-700 text-sm space-y-1">
          <li>• <span className="font-semibold text-red-600">Static:</span> Higher force to START moving</li>
          <li>• <span className="font-semibold text-green-600">Kinetic:</span> Lower force to KEEP moving</li>
          <li>• <span className="font-semibold text-blue-600">Rolling:</span> MUCH lower than either (10-100×)</li>
        </ul>
      </div>

      {renderBottomBar(() => goToPhase('transfer'), true, 'See Applications')}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '🚗',
      title: 'ABS Braking Systems',
      short: 'Automotive',
      tagline: 'Why your car pumps the brakes for you',
      description: 'Anti-lock Braking Systems prevent wheel lockup by rapidly pulsing brake pressure, keeping tires at the edge of static/kinetic transition for maximum grip.',
      connection: 'Locked wheels slide (kinetic friction). Rolling wheels use static friction at the contact point—which is HIGHER! ABS keeps you in the static friction zone.',
      howItWorks: 'Wheel speed sensors detect lockup. A hydraulic modulator releases and reapplies brake pressure up to 15 times per second, preventing sliding.',
      stats: [
        { value: '30%', label: 'Shorter stopping distance' },
        { value: '15Hz', label: 'ABS cycling rate' },
        { value: '35%', label: 'Reduction in crashes' }
      ],
      examples: ['Emergency braking', 'Wet road traction', 'Steering while braking', 'Motorcycle ABS'],
      companies: ['Bosch (inventor)', 'Continental', 'ZF', 'Brembo'],
      futureImpact: 'Predictive braking systems will anticipate obstacles and pre-charge brakes, while regenerative braking in EVs adds another layer of control.',
      color: '#EF4444'
    },
    {
      icon: '⚽',
      title: 'Ball Bearings',
      short: 'Machinery',
      tagline: 'Rolling elements eliminate sliding friction',
      description: 'Ball and roller bearings replace sliding contact with rolling contact, reducing friction by factors of 10-100 in rotating machinery.',
      connection: 'Instead of a shaft sliding against a housing (sliding friction), bearings use balls that roll—achieving the low friction you tested with the cart!',
      howItWorks: 'Precision-ground steel balls or rollers separate inner and outer races. The elements roll rather than slide, with only rolling friction at contact points.',
      stats: [
        { value: '0.001-0.01', label: 'Rolling friction coefficient' },
        { value: '10-100×', label: 'Friction reduction vs sliding' },
        { value: '1M RPM', label: 'Max bearing speed' }
      ],
      examples: ['Skateboard wheels', 'Hard drives', 'Wind turbines', 'Jet engine shafts', 'Bicycle hubs'],
      companies: ['SKF', 'NSK', 'Timken', 'FAG', 'NTN'],
      futureImpact: 'Ceramic and magnetic bearings enable even lower friction for extreme applications like satellite gyroscopes and quantum computers.',
      color: '#10B981'
    },
    {
      icon: '🛹',
      title: 'Wheel Sports',
      short: 'Recreation',
      tagline: 'Why skateboarding and skating work',
      description: 'Skateboards, roller skates, and inline skates all exploit rolling friction to convert pushing energy into long-distance gliding.',
      connection: 'Each push overcomes a tiny amount of rolling friction. Because it\'s so small, you coast for a long distance—impossible with sliding friction!',
      howItWorks: 'Urethane wheels on precision bearings minimize rolling resistance while providing enough grip for turns. Larger wheels have even lower rolling friction.',
      stats: [
        { value: '30-100m', label: 'Glide per push' },
        { value: '0.01-0.03', label: 'Rolling resistance' },
        { value: '95%', label: 'Energy to motion' }
      ],
      examples: ['Street skateboarding', 'Roller derby', 'Speed skating', 'Longboarding', 'Roller hockey'],
      companies: ['Bones Bearings', 'Spitfire Wheels', 'Rollerblade', 'K2'],
      futureImpact: 'Electric skateboards use regenerative braking, and new wheel materials continue to reduce rolling resistance while improving grip.',
      color: '#8B5CF6'
    },
    {
      icon: '🚂',
      title: 'Rail Transportation',
      short: 'Transit',
      tagline: 'Steel wheels on steel rails: minimal friction',
      description: 'Trains achieve remarkable efficiency because steel-on-steel rolling friction is extremely low—about 10× lower than rubber on road.',
      connection: 'Train wheels roll on rails with coefficient around 0.001-0.002. This tiny friction is why trains can pull massive loads with relatively small engines.',
      howItWorks: 'Hard steel wheels on hard steel rails minimize deformation at the contact point. The small contact patch and lack of tire flexing reduce energy loss dramatically.',
      stats: [
        { value: '0.001-0.002', label: 'Steel on steel μ' },
        { value: '3-4×', label: 'More efficient than trucks' },
        { value: '1km+', label: 'Freight train length' }
      ],
      examples: ['Freight rail', 'High-speed rail', 'Subways', 'Light rail', 'Maglev (zero contact!)'],
      companies: ['Union Pacific', 'BNSF', 'SNCF', 'JR Central', 'Siemens Mobility'],
      futureImpact: 'Maglev trains eliminate rolling friction entirely using magnetic levitation, achieving speeds over 600 km/h with virtually no mechanical friction.',
      color: '#F59E0B'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Friction in Action', 'From brakes to bearings')}

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
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Friction:</h4>
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
              Friction physics powers everything from skateboards to maglev trains!
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
      scenario: 'A heavy crate needs to be moved across a warehouse.',
      question: 'Which method requires the least force?',
      options: [
        { text: 'Dragging it on the floor', correct: false },
        { text: 'Putting it on a dolly with wheels', correct: true },
        { text: 'Pushing harder and faster', correct: false },
        { text: 'Lifting and carrying it', correct: false }
      ],
      explanation: 'Rolling friction (dolly with wheels) is 10-100× less than sliding friction (dragging). Wheels dramatically reduce the force needed.'
    },
    {
      scenario: 'A car is braking hard on a wet road.',
      question: 'Why does ABS pump the brakes rapidly?',
      options: [
        { text: 'To save brake pad wear', correct: false },
        { text: 'To prevent wheels from locking and sliding', correct: true },
        { text: 'To make the pedal feel better', correct: false },
        { text: 'To cool down the brakes', correct: false }
      ],
      explanation: 'Locked wheels slide with kinetic friction (lower). ABS keeps wheels rolling with static friction (higher), maximizing grip and stopping power.'
    },
    {
      scenario: 'You\'re pushing a refrigerator. It\'s very hard to start, but easier once moving.',
      question: 'This happens because:',
      options: [
        { text: 'You get tired', correct: false },
        { text: 'Static friction is higher than kinetic friction', correct: true },
        { text: 'The floor heats up', correct: false },
        { text: 'The refrigerator weighs less when moving', correct: false }
      ],
      explanation: 'Static friction (before moving) is higher than kinetic friction (while moving). Once bonds are broken, less force is needed to maintain motion.'
    },
    {
      scenario: 'Ball bearings are used in bicycle wheel hubs.',
      question: 'They reduce friction by:',
      options: [
        { text: 'Adding lubricant that slides', correct: false },
        { text: 'Converting sliding to rolling friction', correct: true },
        { text: 'Making the hub lighter', correct: false },
        { text: 'Heating up and becoming slippery', correct: false }
      ],
      explanation: 'Ball bearings replace sliding contact between the axle and hub with rolling balls. Rolling friction is much lower than sliding friction.'
    },
    {
      scenario: 'Trains are extremely efficient for moving heavy cargo.',
      question: 'This is primarily because:',
      options: [
        { text: 'Trains are very aerodynamic', correct: false },
        { text: 'Steel wheel on steel rail has very low rolling friction', correct: true },
        { text: 'Trains use diesel fuel efficiently', correct: false },
        { text: 'Railroad tracks are always flat', correct: false }
      ],
      explanation: 'Steel-on-steel rolling friction is about 0.001-0.002—roughly 10× lower than rubber tires on road. This makes trains remarkably efficient.'
    },
    {
      scenario: 'A skateboarder pushes once and glides for 50 meters.',
      question: 'This long glide is possible because:',
      options: [
        { text: 'Skateboards are very light', correct: false },
        { text: 'Bearings provide extremely low rolling friction', correct: true },
        { text: 'Urethane wheels are sticky', correct: false },
        { text: 'The ground is smooth', correct: false }
      ],
      explanation: 'Precision ball bearings in skateboard wheels create minimal rolling friction, allowing a single push to result in extended gliding.'
    },
    {
      scenario: 'Ice skating works better on fresh ice than on rough, scraped ice.',
      question: 'This is because:',
      options: [
        { text: 'Fresh ice is colder', correct: false },
        { text: 'Smooth surfaces have lower friction than rough surfaces', correct: true },
        { text: 'Fresh ice weighs less', correct: false },
        { text: 'Rough ice reflects more light', correct: false }
      ],
      explanation: 'Surface roughness increases friction. Smooth fresh ice has lower friction coefficient than rough, scraped ice—though ice skating involves both sliding and fluid dynamics.'
    },
    {
      scenario: 'A car tire has treads while racing slicks are smooth.',
      question: 'Slicks have more grip on dry pavement because:',
      options: [
        { text: 'More rubber contacts the road (larger contact area)', correct: true },
        { text: 'Slicks are made of softer rubber', correct: false },
        { text: 'Treads create wind resistance', correct: false },
        { text: 'Slicks heat up faster', correct: false }
      ],
      explanation: 'More contact area means more friction force. Slicks maximize rubber-to-road contact. Treads sacrifice some grip to channel water on wet roads.'
    },
    {
      scenario: 'Maglev trains "float" above the track using magnets.',
      question: 'Why does this allow higher speeds than regular trains?',
      options: [
        { text: 'Magnets are lighter than wheels', correct: false },
        { text: 'Eliminating contact eliminates friction entirely', correct: true },
        { text: 'Magnetic fields push the train forward', correct: false },
        { text: 'The train can go around corners easier', correct: false }
      ],
      explanation: 'With no physical contact, there is zero mechanical friction. The only resistance is air drag, enabling speeds over 600 km/h.'
    },
    {
      scenario: 'Hockey pucks slide easily on ice but not on concrete.',
      question: 'Ice has low friction because:',
      options: [
        { text: 'Ice is very smooth', correct: false },
        { text: 'A thin water layer forms under pressure, creating lubrication', correct: true },
        { text: 'Ice is frozen water', correct: false },
        { text: 'Hockey pucks are specially designed', correct: false }
      ],
      explanation: 'Pressure and friction heat melt a microscopic water layer at the contact point. This liquid water acts as a lubricant, dramatically reducing friction.'
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
              {score >= 8 ? 'Excellent! Friction physics mastered!' :
               score >= 6 ? 'Good understanding of friction types!' :
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

        <div className="text-6xl mb-4">🛞</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Friction Physics Mastered!
        </h2>
        <p className="text-gray-600 mb-6">You understand why wheels changed the world!</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Rolling vs Sliding:</span>
              <p className="text-sm text-gray-700">Rolling friction is 10-100× less than sliding friction</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Static vs Kinetic:</span>
              <p className="text-sm text-gray-700">Static friction (starting) > Kinetic friction (moving)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Wheel Revolution:</span>
              <p className="text-sm text-gray-700">Low rolling friction enabled carts, cars, and civilization</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">ABS Braking:</span>
              <p className="text-sm text-gray-700">Keeping wheels rolling (not sliding) maximizes braking grip</p>
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
            🛞 Rolling vs Sliding
          </h1>
          <p className="text-gray-600 text-sm">Friction Types Explained</p>
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

export default RollingVsSlidingRenderer;
