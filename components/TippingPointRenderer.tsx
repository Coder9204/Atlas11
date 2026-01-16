import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TIPPINGPOINT RENDERER - STABILITY & CENTER OF GRAVITY
// Teaching: Objects tip when center of gravity moves outside base of support
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

interface TippingPointRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TippingPointRenderer: React.FC<TippingPointRendererProps> = ({
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

  // Tilt simulation
  const [tiltAngle, setTiltAngle] = useState(0);
  const [objectType, setObjectType] = useState<'tall' | 'wide' | 'normal'>('normal');
  const [hasTipped, setHasTipped] = useState(false);
  const [experimentsRun, setExperimentsRun] = useState(0);
  const [tippingAngles, setTippingAngles] = useState<Record<string, number>>({});

  // Twist: loading position
  const [loadPosition, setLoadPosition] = useState<'low' | 'middle' | 'high'>('middle');
  const [twistTiltAngle, setTwistTiltAngle] = useState(0);
  const [twistHasTipped, setTwistHasTipped] = useState(false);
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

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
  // TIPPING PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  // Calculate critical tipping angle based on geometry
  const getCriticalAngle = (type: 'tall' | 'wide' | 'normal', load: 'low' | 'middle' | 'high' = 'middle') => {
    // Base angles for different shapes
    const baseAngles = { tall: 15, normal: 30, wide: 50 };
    let angle = baseAngles[type];

    // Adjust for load position (higher load = easier to tip)
    if (load === 'high') angle *= 0.6;
    if (load === 'low') angle *= 1.3;

    return angle;
  };

  const handleTilt = (delta: number, istwist = false) => {
    if (istwist) {
      if (twistHasTipped) return;
      const newAngle = Math.max(0, Math.min(60, twistTiltAngle + delta));
      setTwistTiltAngle(newAngle);

      const criticalAngle = getCriticalAngle('normal', loadPosition);
      if (newAngle >= criticalAngle) {
        setTwistHasTipped(true);
        playSound(200, 'sawtooth', 0.3);
        emitEvent('observation', {
          details: `Tipped at ${newAngle.toFixed(0)}° with load ${loadPosition}`
        });
      }
    } else {
      if (hasTipped) return;
      const newAngle = Math.max(0, Math.min(60, tiltAngle + delta));
      setTiltAngle(newAngle);

      const criticalAngle = getCriticalAngle(objectType);
      if (newAngle >= criticalAngle) {
        setHasTipped(true);
        setTippingAngles(prev => ({ ...prev, [objectType]: newAngle }));
        playSound(200, 'sawtooth', 0.3);
        emitEvent('observation', {
          details: `${objectType} object tipped at ${newAngle.toFixed(0)}°`
        });
      }
    }
  };

  const resetTilt = (istwist = false) => {
    if (istwist) {
      setTwistTiltAngle(0);
      setTwistHasTipped(false);
    } else {
      setTiltAngle(0);
      setHasTipped(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "🏗️ Why do tall buildings need wider foundations? Why do SUVs roll over more than sports cars?",
    predict: "Predict: which shape is hardest to tip over—tall and narrow, or short and wide?",
    play: "Tilt different shapes and find their tipping point!",
    review: "The secret: Center of Gravity must stay over the Base of Support!",
    twist_predict: "What if we load cargo at different heights in a truck? How does that change stability?",
    twist_play: "Test loading positions and see how they affect tipping!",
    twist_review: "Higher loads raise the center of gravity, making objects tip more easily!",
    transfer: "This physics governs everything from buildings to baby toys!",
    test: "Let's test your understanding of stability and tipping!",
    mastery: "🎉 You've mastered stability physics! Balance achieved!"
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
    warning: '#F59E0B',
    neutral: '#64748B',
    stable: '#10B981',
    unstable: '#EF4444',
    cgMarker: '#3B82F6',
    base: '#78716C',
    platform: '#94A3B8'
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
  // TIPPING VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderTippingVisualization = (
    angle: number,
    type: 'tall' | 'wide' | 'normal',
    tipped: boolean,
    loadPos?: 'low' | 'middle' | 'high'
  ) => {
    const objectDims = {
      tall: { width: 40, height: 120 },
      normal: { width: 60, height: 80 },
      wide: { width: 100, height: 50 }
    };

    const dims = objectDims[type];
    const criticalAngle = getCriticalAngle(type, loadPos);

    // Calculate center of gravity position
    let cgY = dims.height / 2;
    if (loadPos === 'high') cgY = dims.height * 0.75;
    if (loadPos === 'low') cgY = dims.height * 0.25;

    // Platform pivot point
    const pivotX = 150;
    const pivotY = 200;

    return (
      <svg viewBox="0 0 300 250" className="w-full h-56 md:h-64">
        <defs>
          <linearGradient id="objectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tipped ? colors.danger : colors.stable} stopOpacity="0.8" />
            <stop offset="100%" stopColor={tipped ? '#B91C1C' : '#059669'} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="250" fill="#F8FAFC" rx="10" />

        {/* Ground */}
        <rect x="0" y="220" width="300" height="30" fill={colors.base} />

        {/* Tilting platform */}
        <g transform={`rotate(${angle}, ${pivotX}, ${pivotY})`}>
          {/* Platform */}
          <rect
            x={pivotX - 80}
            y={pivotY - 5}
            width="160"
            height="10"
            fill={colors.platform}
            rx="3"
          />

          {/* Object */}
          <g transform={`translate(${pivotX}, ${pivotY - 5})`}>
            <rect
              x={-dims.width / 2}
              y={-dims.height}
              width={dims.width}
              height={dims.height}
              fill="url(#objectGrad)"
              rx="5"
              style={{
                transform: tipped ? `rotate(${30}deg)` : 'rotate(0deg)',
                transformOrigin: `0 0`,
                transition: 'transform 0.3s'
              }}
            />

            {/* Center of gravity marker */}
            <circle
              cx="0"
              cy={-cgY}
              r="8"
              fill={colors.cgMarker}
              stroke="white"
              strokeWidth="2"
            />
            <text x="0" y={-cgY + 3} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CG</text>

            {/* Load indicator for twist */}
            {loadPos && (
              <rect
                x={-dims.width / 4}
                y={loadPos === 'high' ? -dims.height + 10 : loadPos === 'low' ? -30 : -dims.height / 2 - 10}
                width={dims.width / 2}
                height="20"
                fill={colors.accent}
                rx="3"
              />
            )}
          </g>

          {/* Base of support indicator */}
          <line
            x1={pivotX - dims.width / 2}
            y1={pivotY + 15}
            x2={pivotX + dims.width / 2}
            y2={pivotY + 15}
            stroke={colors.cgMarker}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x={pivotX} y={pivotY + 30} textAnchor="middle" fill={colors.cgMarker} fontSize="10">Base of Support</text>
        </g>

        {/* Angle indicator */}
        <text x="20" y="30" fill={colors.neutral} fontSize="12" fontWeight="bold">
          Tilt: {angle.toFixed(0)}°
        </text>
        <text x="20" y="50" fill={angle >= criticalAngle ? colors.danger : colors.stable} fontSize="11">
          Critical: {criticalAngle.toFixed(0)}°
        </text>

        {/* Status */}
        <g transform="translate(150, 20)">
          <rect
            x="-40"
            y="-15"
            width="80"
            height="25"
            fill={tipped ? colors.danger : colors.stable}
            rx="12"
          />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
            {tipped ? '⚠️ TIPPED!' : '✓ STABLE'}
          </text>
        </g>

        {/* CG projection line (vertical from CG) */}
        {!tipped && (
          <line
            x1="150"
            y1="100"
            x2="150"
            y2="195"
            stroke={colors.cgMarker}
            strokeWidth="1"
            strokeDasharray="4,2"
            opacity="0.5"
          />
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      {renderSectionHeader('The Tipping Point Mystery', 'Why do some things fall over easily?')}

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 mb-6 shadow-lg">
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Ground */}
          <rect x="0" y="160" width="300" height="20" fill={colors.base} />

          {/* Tall unstable object */}
          <g transform="translate(70, 160)">
            <rect x="-15" y="-100" width="30" height="100" fill={colors.danger} rx="3" />
            <text x="0" y="-105" textAnchor="middle" fill={colors.danger} fontSize="10" fontWeight="bold">TALL</text>
            <text x="0" y="15" textAnchor="middle" fill={colors.neutral} fontSize="9">Tips easy</text>
          </g>

          {/* Wide stable object */}
          <g transform="translate(230, 160)">
            <rect x="-50" y="-40" width="100" height="40" fill={colors.success} rx="3" />
            <text x="0" y="-45" textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="bold">WIDE</text>
            <text x="0" y="15" textAnchor="middle" fill={colors.neutral} fontSize="9">Very stable</text>
          </g>

          {/* VS */}
          <text x="150" y="100" textAnchor="middle" fill={colors.primary} fontSize="20" fontWeight="bold">VS</text>

          {/* Question marks */}
          <text x="150" y="25" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="bold">Which tips first?</text>
        </svg>

        <p className="text-lg text-amber-800">
          A bookshelf falls over, but a wide coffee table stays put.
          <br />
          <span className="font-bold">What determines when something tips?</span>
        </p>
      </div>

      {renderKeyTakeaway(
        "The Question",
        "Why do some objects topple easily while others are rock-solid? The answer involves the battle between gravity and geometry!"
      )}

      {renderBottomBar(() => goToPhase('predict'), true, 'Make Your Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'weight', label: 'Heavier objects are always more stable', icon: '⚖️' },
      { id: 'base', label: 'Wider base = more stability', icon: '📐' },
      { id: 'height', label: 'Shorter objects = more stability', icon: '📏' },
      { id: 'both', label: 'Both base width AND height matter', icon: '🎯' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'What makes objects stable?')}

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
              <span className="font-semibold">Interesting!</span> Let's test different shapes to find out.
            </p>
          </div>
        )}

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiments')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Stability Lab', 'Tilt objects until they tip')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderTippingVisualization(tiltAngle, objectType, hasTipped)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Object Shape:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'tall' as const, label: 'Tall & Narrow', icon: '🗼' },
            { id: 'normal' as const, label: 'Normal', icon: '📦' },
            { id: 'wide' as const, label: 'Wide & Short', icon: '🧱' }
          ].map(obj => (
            <button
              key={obj.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setObjectType(obj.id);
                resetTilt();
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                objectType === obj.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-xl">{obj.icon}</span>
              <p className="text-sm font-medium mt-1">{obj.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleTilt(-5);
          }}
          disabled={hasTipped || tiltAngle <= 0}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          ◀
        </button>

        <div className="text-center">
          <p className="text-lg font-bold text-indigo-600">{tiltAngle.toFixed(0)}°</p>
          <p className="text-sm text-gray-500">Tilt angle</p>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleTilt(5);
          }}
          disabled={hasTipped}
          className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          ▶
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetTilt();
          }}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium"
        >
          Reset
        </button>
        {hasTipped && !tippingAngles[objectType] && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setExperimentsRun(prev => prev + 1);
              setTippingAngles(prev => ({ ...prev, [objectType]: tiltAngle }));
            }}
            className="px-6 py-2 rounded-lg bg-indigo-500 text-white font-medium"
          >
            Record Result
          </button>
        )}
      </div>

      {Object.keys(tippingAngles).length > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-indigo-800 mb-2">📊 Results:</h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(tippingAngles).map(([type, angle]) => (
              <div key={type} className="bg-white rounded-lg p-2 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-700 capitalize">{type}</p>
                <p className="text-lg font-bold text-indigo-600">{angle.toFixed(0)}°</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderBottomBar(() => goToPhase('review'), Object.keys(tippingAngles).length >= 2, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader('The Stability Secret', 'Center of Gravity & Base of Support')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 200" className="w-full h-44 mb-4">
          <rect x="0" y="0" width="300" height="200" fill="white" rx="10" />

          {/* Stable example */}
          <g transform="translate(80, 150)">
            <rect x="-40" y="-60" width="80" height="60" fill={colors.stable} rx="3" />
            <circle cx="0" cy="-30" r="8" fill={colors.cgMarker} stroke="white" strokeWidth="2" />
            <text x="0" y="-27" textAnchor="middle" fill="white" fontSize="7">CG</text>

            {/* Projection line */}
            <line x1="0" y1="-30" x2="0" y2="5" stroke={colors.cgMarker} strokeWidth="2" strokeDasharray="4,2" />

            {/* Base */}
            <line x1="-40" y1="5" x2="40" y2="5" stroke={colors.success} strokeWidth="4" strokeLinecap="round" />
            <text x="0" y="20" textAnchor="middle" fill={colors.success} fontSize="9" fontWeight="bold">CG INSIDE BASE ✓</text>
          </g>

          {/* Unstable example */}
          <g transform="translate(220, 150)">
            <rect x="-15" y="-80" width="30" height="80" fill={colors.danger} rx="3" transform="rotate(25, 0, 0)" />
            <circle cx="20" cy="-45" r="8" fill={colors.cgMarker} stroke="white" strokeWidth="2" />
            <text x="20" y="-42" textAnchor="middle" fill="white" fontSize="7">CG</text>

            {/* Projection line */}
            <line x1="20" y1="-45" x2="20" y2="5" stroke={colors.danger} strokeWidth="2" strokeDasharray="4,2" />

            {/* Base */}
            <line x1="-15" y1="5" x2="15" y2="5" stroke={colors.danger} strokeWidth="4" strokeLinecap="round" />
            <text x="0" y="20" textAnchor="middle" fill={colors.danger} fontSize="9" fontWeight="bold">CG OUTSIDE BASE ✗</text>
          </g>

          {/* Title */}
          <text x="150" y="25" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">THE STABILITY RULE</text>
        </svg>

        <div className="text-center">
          <p className="text-lg text-indigo-800 font-semibold">
            An object tips when the Center of Gravity
            <br />falls OUTSIDE the Base of Support
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-green-50 rounded-xl p-4">
          <h4 className="font-bold text-green-800 mb-2">✓ More Stable When:</h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Wider base of support</li>
            <li>• Lower center of gravity</li>
            <li>• Heavier bottom, lighter top</li>
          </ul>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <h4 className="font-bold text-red-800 mb-2">✗ Less Stable When:</h4>
          <ul className="text-red-700 text-sm space-y-1">
            <li>• Narrow base of support</li>
            <li>• High center of gravity</li>
            <li>• Top-heavy loading</li>
          </ul>
        </div>
      </div>

      {renderKeyTakeaway(
        "The Physics",
        "Gravity pulls straight down on the CG. As long as this line hits inside the base, the object is stable. Tilt it enough that the line falls outside, and it tips!"
      )}

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Try Loading Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'no_difference', label: 'Load position doesn\'t affect stability', icon: '=' },
      { id: 'high_unstable', label: 'High load makes it tip easier', icon: '⬆️' },
      { id: 'low_unstable', label: 'Low load makes it tip easier', icon: '⬇️' }
    ];

    return (
      <div>
        {renderSectionHeader('The Loading Twist', 'Where you put weight matters!')}

        <div className="bg-amber-50 rounded-xl p-4 mb-5">
          <p className="text-amber-800">
            Imagine loading cargo in a delivery truck.
            <br /><br />
            <span className="font-semibold">Does it matter if heavy boxes go on top or bottom?</span>
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

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test Loading')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      {renderSectionHeader('Loading Position Lab', 'Test different load heights')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderTippingVisualization(twistTiltAngle, 'normal', twistHasTipped, loadPosition)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Load Position:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'low' as const, label: 'Low', desc: 'Bottom loaded' },
            { id: 'middle' as const, label: 'Middle', desc: 'Center loaded' },
            { id: 'high' as const, label: 'High', desc: 'Top loaded' }
          ].map(pos => (
            <button
              key={pos.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setLoadPosition(pos.id);
                resetTilt(true);
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                loadPosition === pos.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium text-sm">{pos.label}</p>
              <p className="text-xs text-gray-500">{pos.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleTilt(-5, true);
          }}
          disabled={twistHasTipped || twistTiltAngle <= 0}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          ◀
        </button>

        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">{twistTiltAngle.toFixed(0)}°</p>
          <p className="text-sm text-gray-500">Tilt angle</p>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleTilt(5, true);
          }}
          disabled={twistHasTipped}
          className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          ▶
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetTilt(true);
          }}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium"
        >
          Reset
        </button>
        {twistHasTipped && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setTwistExperimentsRun(prev => prev + 1);
              resetTilt(true);
            }}
            className="px-6 py-2 rounded-lg bg-purple-500 text-white font-medium"
          >
            Try Another
          </button>
        )}
      </div>

      {twistHasTipped && (
        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <p className="text-purple-800">
            <span className="font-bold">
              {loadPosition === 'high' && '⚠️ High load tipped at just ~18°!'}
              {loadPosition === 'middle' && '📊 Middle load tipped at ~30°'}
              {loadPosition === 'low' && '✓ Low load lasted until ~39°!'}
            </span>
            <br />
            <span className="text-sm">Higher loads raise the center of gravity, making tipping easier.</span>
          </p>
        </div>
      )}

      {renderBottomBar(() => goToPhase('twist_review'), twistExperimentsRun >= 2, 'Review Findings')}
    </div>
  );

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('Loading Effects', 'Why placement matters')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 160" className="w-full h-36 mb-4">
          <rect x="0" y="0" width="300" height="160" fill="white" rx="10" />

          {/* Three loading scenarios */}
          {[
            { x: 50, load: 'high', cg: 35, angle: 18, color: colors.danger },
            { x: 150, load: 'middle', cg: 50, angle: 30, color: colors.warning },
            { x: 250, load: 'low', cg: 65, angle: 39, color: colors.success }
          ].map((scenario, i) => (
            <g key={i} transform={`translate(${scenario.x}, 120)`}>
              {/* Object */}
              <rect x="-20" y="-80" width="40" height="80" fill="#E2E8F0" rx="3" />

              {/* Load */}
              <rect
                x="-12"
                y={scenario.load === 'high' ? -75 : scenario.load === 'middle' ? -50 : -25}
                width="24"
                height="20"
                fill={scenario.color}
                rx="2"
              />

              {/* CG marker */}
              <circle cx="0" cy={-80 + scenario.cg} r="6" fill={colors.cgMarker} />
              <text x="0" y={-77 + scenario.cg} textAnchor="middle" fill="white" fontSize="6">CG</text>

              {/* Label */}
              <text x="0" y="15" textAnchor="middle" fill={scenario.color} fontSize="9" fontWeight="bold">
                {scenario.load.toUpperCase()}
              </text>
              <text x="0" y="28" textAnchor="middle" fill={colors.neutral} fontSize="8">
                Tips @ {scenario.angle}°
              </text>
            </g>
          ))}

          {/* Title */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">LOAD POSITION AFFECTS STABILITY</text>
        </svg>
      </div>

      {renderKeyTakeaway(
        "The Complete Picture",
        "Heavy items placed HIGH raise the center of gravity, making objects tip at smaller angles. Always load heavy items LOW for maximum stability!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Real-World Safety:</h4>
        <ul className="text-gray-700 text-sm space-y-1">
          <li>• <span className="font-semibold">Trucks:</span> Heavy cargo at bottom</li>
          <li>• <span className="font-semibold">SUVs:</span> Higher CG = more rollover risk</li>
          <li>• <span className="font-semibold">Shipping:</span> Heavy items in lower holds</li>
          <li>• <span className="font-semibold">Backpacks:</span> Heavy items close to back</li>
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
      title: 'Vehicle Rollover Safety',
      short: 'Automotive',
      tagline: 'Why SUVs and trucks have rollover warnings',
      description: 'Vehicles with high centers of gravity (SUVs, trucks) have a higher rollover risk than low-slung sports cars. Electronic stability control actively prevents rollovers.',
      connection: 'An SUV\'s high CG makes it tip at smaller turn angles than a sports car. This is exactly what you tested—higher CG = easier tipping!',
      howItWorks: 'Electronic Stability Control (ESC) monitors steering and yaw rate. When it detects potential rollover conditions, it applies individual brakes and reduces power to keep the vehicle stable.',
      stats: [
        { value: '2.5x', label: 'SUV rollover risk vs sedans' },
        { value: '35%', label: 'Rollover reduction with ESC' },
        { value: '10,000+', label: 'Lives saved by ESC yearly' }
      ],
      examples: ['SUV cornering stability', 'Truck load distribution', 'Sports car low profile', 'Race car ground effects'],
      companies: ['Bosch (ESC inventor)', 'NHTSA', 'Euro NCAP', 'All major automakers'],
      futureImpact: 'Active suspension systems will dynamically lower CG during high-risk maneuvers, while autonomous vehicles will avoid rollover-prone situations entirely.',
      color: '#EF4444'
    },
    {
      icon: '🏗️',
      title: 'Building Foundations',
      short: 'Architecture',
      tagline: 'Why skyscrapers need deep, wide foundations',
      description: 'Tall buildings are designed with massive foundations that extend the base of support and lower the overall center of gravity, ensuring stability against wind and earthquakes.',
      connection: 'A skyscraper is like the tall narrow object you tested—without a wide foundation acting as the base, it would tip at small angles!',
      howItWorks: 'Foundations spread building weight over large areas and often extend deep underground. Some use "mat" foundations (wide), others use "pile" foundations (deep) to prevent tipping.',
      stats: [
        { value: '60ft', label: 'Burj Khalifa foundation depth' },
        { value: '30%', label: 'Building mass in foundation' },
        { value: '200+', label: 'Piles per skyscraper' }
      ],
      examples: ['Empire State Building foundation', 'Leaning Tower of Pisa (failed foundation)', 'Earthquake-proof buildings', 'Wind-resistant towers'],
      companies: ['Skidmore Owings & Merrill', 'Foster + Partners', 'Arup', 'AECOM'],
      futureImpact: 'Active foundation systems with hydraulic dampers will adjust to external forces in real-time, allowing taller and thinner structures.',
      color: '#8B5CF6'
    },
    {
      icon: '👶',
      title: 'Baby Product Safety',
      short: 'Child Safety',
      tagline: 'Designing wobble-proof toys and furniture',
      description: 'Baby walkers, high chairs, and furniture are designed with low CGs and wide bases to prevent tipping, protecting children from fall injuries.',
      connection: 'Weeble toys work on this principle—weighted bottoms keep the CG so low that they always self-right. The same physics protects babies!',
      howItWorks: 'Heavy weighted bases keep CG near the ground. Wide footprints ensure the CG projection stays inside the base even during normal use forces.',
      stats: [
        { value: '9,000+', label: 'Tip-over injuries/year (US)' },
        { value: '5:1', label: 'Safe base-to-height ratio' },
        { value: '2019', label: 'STURDY Act for furniture' }
      ],
      examples: ['Weeble toys', 'High chairs', 'Baby walkers', 'Furniture anchoring requirements'],
      companies: ['IKEA', 'Graco', 'Fisher-Price', 'CPSC (safety regulator)'],
      futureImpact: 'Smart furniture with embedded sensors will detect unstable loading and alert parents, while self-anchoring systems automatically secure to walls.',
      color: '#10B981'
    },
    {
      icon: '🚢',
      title: 'Ship Stability',
      short: 'Maritime',
      tagline: 'How ships stay upright in rough seas',
      description: 'Ships use ballast, cargo placement, and hull design to maintain stability. Improper loading has caused many maritime disasters.',
      connection: 'A ship\'s metacentric height (distance from CG to pivot point) determines stability—just like your experiments showed with load position!',
      howItWorks: 'Ballast tanks filled with water lower the CG. Cargo is carefully distributed to maintain proper balance. Stability computers calculate safe loading conditions.',
      stats: [
        { value: '1m+', label: 'Required metacentric height' },
        { value: '2,000+', label: 'Capsizing deaths/year' },
        { value: '90%', label: 'Due to improper loading' }
      ],
      examples: ['Container ship loading', 'Cruise ship ballast', 'Oil tanker stability', 'Sailboat keels'],
      companies: ['DNV', 'Lloyd\'s Register', 'Wärtsilä', 'ClassNK'],
      futureImpact: 'Real-time stability monitoring with AI will prevent overloading and suggest optimal cargo arrangements to maximize both capacity and safety.',
      color: '#F59E0B'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Stability in Action', 'From toys to skyscrapers')}

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
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Tipping:</h4>
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
              Stability physics protects us everywhere—from cribs to cruise ships!
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
      scenario: 'A bookshelf is 6 feet tall and 2 feet wide. A coffee table is 1.5 feet tall and 4 feet wide.',
      question: 'Which is more stable against tipping?',
      options: [
        { text: 'The bookshelf (taller means heavier)', correct: false },
        { text: 'The coffee table (wider base, lower CG)', correct: true },
        { text: 'They\'re equally stable', correct: false },
        { text: 'Depends on what\'s on them', correct: false }
      ],
      explanation: 'The coffee table has both a wider base of support AND a lower center of gravity, making it much more stable than the tall, narrow bookshelf.'
    },
    {
      scenario: 'A delivery truck is being loaded with heavy appliances.',
      question: 'For maximum stability, where should the heaviest items go?',
      options: [
        { text: 'Top of the cargo area (easier to unload first)', correct: false },
        { text: 'Bottom of the cargo area (lowers center of gravity)', correct: true },
        { text: 'Middle of the cargo area (balanced)', correct: false },
        { text: 'Doesn\'t matter if properly secured', correct: false }
      ],
      explanation: 'Heavy items at the bottom lower the overall center of gravity, making the truck much less likely to tip during turns or on uneven roads.'
    },
    {
      scenario: 'An object tips over when tilted to a certain angle.',
      question: 'What specifically happens at the tipping point?',
      options: [
        { text: 'The object becomes weightless', correct: false },
        { text: 'The center of gravity moves outside the base of support', correct: true },
        { text: 'Gravity suddenly increases', correct: false },
        { text: 'The base of support shrinks', correct: false }
      ],
      explanation: 'At the critical tipping angle, the vertical line from the center of gravity falls outside the base of support, creating a torque that causes rotation (tipping).'
    },
    {
      scenario: 'SUVs have a higher rollover rate than sports cars in crash statistics.',
      question: 'What\'s the primary physics reason?',
      options: [
        { text: 'SUVs are heavier', correct: false },
        { text: 'SUVs have a higher center of gravity', correct: true },
        { text: 'SUVs have larger tires', correct: false },
        { text: 'SUVs have more powerful engines', correct: false }
      ],
      explanation: 'SUVs sit higher, raising the center of gravity. This means smaller lateral forces (like sharp turns) can push the CG outside the wheelbase, causing rollover.'
    },
    {
      scenario: 'Weeble toys always return upright no matter how you push them.',
      question: 'How is this achieved?',
      options: [
        { text: 'Springs inside push them back up', correct: false },
        { text: 'Magnets in the base pull them down', correct: false },
        { text: 'Heavy weighted bottom keeps CG very low', correct: true },
        { text: 'The rounded bottom reduces friction', correct: false }
      ],
      explanation: 'The heavy weight at the bottom keeps the center of gravity so low that when tilted, gravity always creates a restoring torque that returns it upright.'
    },
    {
      scenario: 'A pyramid shape is used for many stable structures throughout history.',
      question: 'Why are pyramids inherently stable?',
      options: [
        { text: 'The triangular faces distribute wind forces', correct: false },
        { text: 'Wide base with low CG makes tipping nearly impossible', correct: true },
        { text: 'Stone is heavier than other materials', correct: false },
        { text: 'The pointed top reduces weight', correct: false }
      ],
      explanation: 'Pyramids have extremely wide bases and concentrate mass low, creating a very low center of gravity. This makes the critical tipping angle enormous—practically untippable!'
    },
    {
      scenario: 'A crane is lifting a heavy load. The crane has extendable outriggers (legs that spread out).',
      question: 'What do the outriggers primarily do?',
      options: [
        { text: 'Increase the crane\'s weight', correct: false },
        { text: 'Widen the base of support', correct: true },
        { text: 'Lower the center of gravity', correct: false },
        { text: 'Reduce ground pressure', correct: false }
      ],
      explanation: 'Outriggers dramatically widen the base of support, allowing the crane to lift heavy loads without the combined CG falling outside this larger base.'
    },
    {
      scenario: 'A soda can is easier to knock over when empty than when full.',
      question: 'Why?',
      options: [
        { text: 'An empty can weighs less', correct: false },
        { text: 'The liquid lowers the center of gravity', correct: true },
        { text: 'The liquid adds friction to the base', correct: false },
        { text: 'Full cans have stronger walls', correct: false }
      ],
      explanation: 'When full, the heavy liquid sits at the bottom, lowering the CG significantly. An empty can has its CG near the middle of its height, making it much easier to tip.'
    },
    {
      scenario: 'A gymnast in a handstand is very unstable.',
      question: 'What makes this position so precarious?',
      options: [
        { text: 'Arms are weaker than legs', correct: false },
        { text: 'High CG over a tiny base (hands)', correct: true },
        { text: 'Blood rushing to the head', correct: false },
        { text: 'The floor is slippery', correct: false }
      ],
      explanation: 'The entire body\'s center of gravity is very high, balanced over just two hands (tiny base). The slightest shift moves the CG outside this small base, requiring constant micro-adjustments.'
    },
    {
      scenario: 'A double-decker bus seems like it should tip easily, but it doesn\'t.',
      question: 'How do designers ensure stability?',
      options: [
        { text: 'Heavy engine and chassis at the bottom', correct: true },
        { text: 'Passengers must sit evenly', correct: false },
        { text: 'The wheels are extra wide', correct: false },
        { text: 'The top deck has lighter materials', correct: false }
      ],
      explanation: 'Heavy components (engine, chassis, fuel tanks) are placed at the bottom, keeping the CG low despite the tall structure. This is deliberate engineering for stability.'
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
              {score >= 8 ? 'Excellent! Stability physics mastered!' :
               score >= 6 ? 'Good understanding of tipping points!' :
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

        <div className="text-6xl mb-4">⚖️</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Stability Mastered!
        </h2>
        <p className="text-gray-600 mb-6">You've conquered the physics of balance!</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">The Tipping Rule:</span>
              <p className="text-sm text-gray-700">Objects tip when CG moves outside base of support</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Base Matters:</span>
              <p className="text-sm text-gray-700">Wider base = more stable (larger tipping angle)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Height Matters:</span>
              <p className="text-sm text-gray-700">Lower CG = more stable (CG stays over base longer)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Load Position:</span>
              <p className="text-sm text-gray-700">Heavy items LOW = lower CG = safer!</p>
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
            ⚖️ The Tipping Point
          </h1>
          <p className="text-gray-600 text-sm">Stability & Center of Gravity</p>
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

export default TippingPointRenderer;
