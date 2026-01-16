import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EGGDROP RENDERER - CRUMPLE ZONES & IMPULSE PHYSICS
// Teaching: Force = Δp/Δt → More time = less force = surviving eggs
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
  | 'hook'           // 1. Dramatic scenario
  | 'predict'        // 2. Initial prediction
  | 'play'           // 3. Interactive simulation
  | 'review'         // 4. Core concept explanation
  | 'twist_predict'  // 5. Predict with new scenario
  | 'twist_play'     // 6. Play twist scenario
  | 'twist_review'   // 7. Review twist insights
  | 'transfer'       // 8. Real-world applications
  | 'test'           // 9. 10-question assessment
  | 'mastery';       // 10. Celebration & summary

const isValidPhase = (phase: string): phase is Phase => {
  return ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].includes(phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface EggDropRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const EggDropRenderer: React.FC<EggDropRendererProps> = ({
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
  const [isDropping, setIsDropping] = useState(false);
  const [dropComplete, setDropComplete] = useState(false);
  const [eggPosition, setEggPosition] = useState(0);
  const [selectedPadding, setSelectedPadding] = useState<'none' | 'foam' | 'thick'>('none');
  const [eggSurvived, setEggSurvived] = useState<boolean | null>(null);

  // Twist state (different heights)
  const [twistHeight, setTwistHeight] = useState<'low' | 'medium' | 'high'>('medium');
  const [twistDropComplete, setTwistDropComplete] = useState(false);
  const [twistEggSurvived, setTwistEggSurvived] = useState<boolean | null>(null);

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
  // EGG DROP PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  const calculateSurvival = (padding: 'none' | 'foam' | 'thick', height: 'low' | 'medium' | 'high' = 'medium') => {
    // Impulse = F * Δt = Δp
    // More padding = longer Δt = less F
    const heightMultiplier = { low: 0.5, medium: 1.0, high: 1.5 }[height];
    const paddingProtection = { none: 0, foam: 0.6, thick: 0.95 }[padding];

    // Egg breaks if force exceeds threshold
    const forceRatio = heightMultiplier * (1 - paddingProtection);
    return forceRatio < 0.4; // Survives if force ratio is low enough
  };

  const startDrop = () => {
    if (isDropping) return;
    setIsDropping(true);
    setDropComplete(false);
    setEggPosition(0);
    setEggSurvived(null);

    const animate = () => {
      setEggPosition(prev => {
        const newPos = prev + 5;
        if (newPos >= 100) {
          setDropComplete(true);
          setIsDropping(false);
          const survived = calculateSurvival(selectedPadding);
          setEggSurvived(survived);
          playSound(survived ? 800 : 200, 'triangle', 0.3);
          emitEvent('observation', {
            details: `Dropped with ${selectedPadding} padding - ${survived ? 'survived' : 'broke'}`
          });
          return 100;
        }
        animationRef.current = requestAnimationFrame(animate);
        return newPos;
      });
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const startTwistDrop = () => {
    if (isDropping) return;
    setIsDropping(true);
    setTwistDropComplete(false);
    setEggPosition(0);
    setTwistEggSurvived(null);

    const animate = () => {
      setEggPosition(prev => {
        const speedMultiplier = { low: 3, medium: 5, high: 7 }[twistHeight];
        const newPos = prev + speedMultiplier;
        if (newPos >= 100) {
          setTwistDropComplete(true);
          setIsDropping(false);
          const survived = calculateSurvival('foam', twistHeight);
          setTwistEggSurvived(survived);
          playSound(survived ? 800 : 200, 'triangle', 0.3);
          emitEvent('observation', {
            details: `Dropped from ${twistHeight} height with foam - ${survived ? 'survived' : 'broke'}`
          });
          return 100;
        }
        animationRef.current = requestAnimationFrame(animate);
        return newPos;
      });
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const resetDrop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setEggPosition(0);
    setDropComplete(false);
    setEggSurvived(null);
    setIsDropping(false);
  };

  const resetTwistDrop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setEggPosition(0);
    setTwistDropComplete(false);
    setTwistEggSurvived(null);
    setIsDropping(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "🥚 Imagine dropping an egg from a 3-story building. One has foam packaging, one has nothing. Which survives?",
    predict: "Before we experiment, predict: will adding padding save an egg from a 10-foot drop?",
    play: "Drop eggs with different padding and observe what happens!",
    review: "The secret is IMPULSE! Force × Time = Momentum Change. More time = Less force!",
    twist_predict: "Same foam padding, but different drop heights. What happens as we go higher?",
    twist_play: "Test different heights with the same foam padding.",
    twist_review: "Even good padding fails at extreme heights—momentum increases with velocity!",
    transfer: "This physics saves lives every day in car crashes, sports, and more!",
    test: "Let's see how well you understand impulse and crumple zone physics!",
    mastery: "🎉 You've mastered the physics of protection! Now you understand why cars crumple!"
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
    eggYellow: '#FDE047',
    eggWhite: '#FEFCE8',
    foam: '#60A5FA',
    padding: '#34D399',
    ground: '#78716C',
    sky: '#E0F2FE',
    cracked: '#DC2626'
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
  // EGG SVG VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderEggDropVisualization = (
    position: number,
    survived: boolean | null,
    complete: boolean,
    paddingType: 'none' | 'foam' | 'thick',
    height: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    const heightPixels = { low: 120, medium: 200, high: 280 }[height];
    const eggY = 30 + (position / 100) * (heightPixels - 40);

    return (
      <svg viewBox="0 0 200 320" className="w-full h-64 md:h-80">
        {/* Sky background */}
        <rect x="0" y="0" width="200" height="280" fill={colors.sky} />

        {/* Ground */}
        <rect x="0" y="280" width="200" height="40" fill={colors.ground} />

        {/* Building/platform */}
        <rect x="70" y="10" width="60" height="25" fill="#94A3B8" rx="3" />
        <text x="100" y="28" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          {height === 'low' ? '1m' : height === 'medium' ? '3m' : '5m'}
        </text>

        {/* Padding on ground */}
        {paddingType !== 'none' && (
          <>
            <rect
              x="60" y={paddingType === 'thick' ? 255 : 265}
              width="80"
              height={paddingType === 'thick' ? 25 : 15}
              fill={paddingType === 'thick' ? colors.padding : colors.foam}
              rx="3"
            />
            <text x="100" y={paddingType === 'thick' ? 272 : 277} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
              {paddingType === 'thick' ? 'THICK FOAM' : 'FOAM'}
            </text>
          </>
        )}

        {/* Egg */}
        {!complete ? (
          <g transform={`translate(100, ${eggY})`}>
            <ellipse cx="0" cy="0" rx="15" ry="20" fill={colors.eggWhite} stroke={colors.eggYellow} strokeWidth="2" />
            <ellipse cx="0" cy="0" rx="10" ry="14" fill={colors.eggYellow} opacity="0.5" />
          </g>
        ) : (
          <g transform="translate(100, 265)">
            {survived ? (
              // Intact egg
              <>
                <ellipse cx="0" cy="-10" rx="15" ry="20" fill={colors.eggWhite} stroke={colors.eggYellow} strokeWidth="2" />
                <ellipse cx="0" cy="-10" rx="10" ry="14" fill={colors.eggYellow} opacity="0.5" />
                <text x="0" y="20" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="bold">✓ SAFE!</text>
              </>
            ) : (
              // Cracked egg
              <>
                <ellipse cx="0" cy="-5" rx="25" ry="10" fill={colors.eggYellow} opacity="0.8" />
                <ellipse cx="-10" cy="-8" rx="8" ry="5" fill={colors.eggWhite} />
                <ellipse cx="10" cy="-3" rx="10" ry="6" fill={colors.eggWhite} />
                <path d="M-8,-5 L-2,-15 L5,-8 L12,-18 L8,-5" fill="none" stroke={colors.cracked} strokeWidth="2" />
                <text x="0" y="20" textAnchor="middle" fill={colors.danger} fontSize="12" fontWeight="bold">✗ BROKE!</text>
              </>
            )}
          </g>
        )}

        {/* Drop arrow */}
        {position < 100 && (
          <g>
            <line x1="140" y1="50" x2="140" y2="240" stroke={colors.primary} strokeWidth="2" strokeDasharray="5,5" />
            <polygon points="140,250 135,240 145,240" fill={colors.primary} />
          </g>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      {renderSectionHeader('The Egg Drop Challenge', 'A physics puzzle about survival')}

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 mb-6 shadow-lg">
        <svg viewBox="0 0 300 200" className="w-full h-48 md:h-56 mb-4">
          {/* Scene: Two eggs being dropped */}
          <rect x="0" y="0" width="300" height="160" fill={colors.sky} />
          <rect x="0" y="160" width="300" height="40" fill={colors.ground} />

          {/* Left building */}
          <rect x="30" y="20" width="60" height="80" fill="#94A3B8" />
          <text x="60" y="55" textAnchor="middle" fill="white" fontSize="10">3 FLOORS</text>

          {/* Right building */}
          <rect x="210" y="20" width="60" height="80" fill="#94A3B8" />
          <text x="240" y="55" textAnchor="middle" fill="white" fontSize="10">3 FLOORS</text>

          {/* Left egg (no protection) */}
          <g transform="translate(60, 110)">
            <ellipse cx="0" cy="0" rx="12" ry="16" fill={colors.eggWhite} stroke={colors.eggYellow} strokeWidth="2" />
            <ellipse cx="0" cy="0" rx="8" ry="11" fill={colors.eggYellow} opacity="0.5" />
          </g>
          <text x="60" y="175" textAnchor="middle" fill={colors.danger} fontSize="10" fontWeight="bold">NO PADDING</text>

          {/* Right egg (with foam) */}
          <g transform="translate(240, 110)">
            <rect x="-20" y="-20" width="40" height="45" fill={colors.foam} rx="5" opacity="0.7" />
            <ellipse cx="0" cy="0" rx="12" ry="16" fill={colors.eggWhite} stroke={colors.eggYellow} strokeWidth="2" />
            <ellipse cx="0" cy="0" rx="8" ry="11" fill={colors.eggYellow} opacity="0.5" />
          </g>
          <text x="240" y="175" textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="bold">FOAM WRAPPED</text>

          {/* Arrows showing drop */}
          <line x1="60" y1="100" x2="60" y2="145" stroke={colors.primary} strokeWidth="2" strokeDasharray="4,2" />
          <polygon points="60,150 55,142 65,142" fill={colors.primary} />

          <line x1="240" y1="100" x2="240" y2="145" stroke={colors.primary} strokeWidth="2" strokeDasharray="4,2" />
          <polygon points="240,150 235,142 245,142" fill={colors.primary} />

          {/* Question */}
          <text x="150" y="95" textAnchor="middle" fill={colors.primary} fontSize="14" fontWeight="bold">WHICH SURVIVES?</text>
        </svg>

        <p className="text-lg text-amber-800">
          You're dropping eggs from a 3-story building. One has foam padding, one has nothing.
          <br />
          <span className="font-bold">Why does padding save eggs?</span>
        </p>
      </div>

      {renderKeyTakeaway(
        "The Mystery",
        "The foam doesn't change the egg's speed at impact—so why does it survive? The secret lies in how force is spread over TIME."
      )}

      {renderBottomBar(() => goToPhase('predict'), true, 'Make Your Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'stops', label: 'Padding stops the egg before impact', icon: '🛑' },
      { id: 'absorbs', label: 'Padding absorbs all the energy', icon: '🔋' },
      { id: 'spreads_time', label: 'Padding spreads impact over more time', icon: '⏱️' },
      { id: 'soft', label: 'Padding is just softer than ground', icon: '🧸' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'Why does padding protect eggs?')}

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
              <span className="font-semibold">Your hypothesis:</span> Let's test it with experiments!
            </p>
          </div>
        )}

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiment')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Egg Drop Lab', 'Test different padding levels')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderEggDropVisualization(eggPosition, eggSurvived, dropComplete, selectedPadding)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Padding:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'none' as const, label: 'No Padding', color: colors.danger },
            { id: 'foam' as const, label: 'Thin Foam', color: colors.foam },
            { id: 'thick' as const, label: 'Thick Foam', color: colors.padding }
          ].map(pad => (
            <button
              key={pad.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!isDropping) {
                  setSelectedPadding(pad.id);
                  resetDrop();
                  playSound(300, 'sine', 0.1);
                }
              }}
              disabled={isDropping}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPadding === pad.id
                  ? 'border-indigo-500 shadow-md'
                  : 'border-gray-200'
              } ${isDropping ? 'opacity-50' : ''}`}
              style={{ backgroundColor: selectedPadding === pad.id ? `${pad.color}20` : 'white' }}
            >
              <span className="text-sm font-medium">{pad.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isDropping && !dropComplete) startDrop();
          }}
          disabled={isDropping || dropComplete}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            isDropping || dropComplete
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          🥚 Drop Egg
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetDrop();
          }}
          className="px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      {dropComplete && (
        <div className={`rounded-xl p-4 mb-4 ${eggSurvived ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={eggSurvived ? 'text-green-800' : 'text-red-800'}>
            <span className="font-bold">{eggSurvived ? '✓ Egg survived!' : '✗ Egg broke!'}</span>
            <br />
            {selectedPadding === 'none' && 'No padding = instant force = broken egg'}
            {selectedPadding === 'foam' && (eggSurvived ? 'Foam extends impact time, reducing force!' : 'Some padding but not enough for this height')}
            {selectedPadding === 'thick' && 'Maximum padding = maximum time = minimum force!'}
          </p>
        </div>
      )}

      {renderBottomBar(() => goToPhase('review'), dropComplete, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader('The Impulse-Momentum Secret', 'Why padding works')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 180" className="w-full h-40 mb-4">
          {/* Force-time diagram */}
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Axes */}
          <line x1="50" y1="150" x2="280" y2="150" stroke="#64748B" strokeWidth="2" />
          <line x1="50" y1="150" x2="50" y2="20" stroke="#64748B" strokeWidth="2" />

          <text x="165" y="175" textAnchor="middle" fill="#64748B" fontSize="12">Time →</text>
          <text x="25" y="90" textAnchor="middle" fill="#64748B" fontSize="12" transform="rotate(-90, 25, 90)">Force →</text>

          {/* No padding: tall narrow spike */}
          <path d="M80,150 L90,30 L100,150" fill={colors.danger} opacity="0.6" />
          <text x="90" y="165" textAnchor="middle" fill={colors.danger} fontSize="9">No pad</text>

          {/* Some padding: medium spike */}
          <path d="M140,150 L150,70 L160,150 L170,150" fill={colors.foam} opacity="0.6" />
          <text x="155" y="165" textAnchor="middle" fill={colors.foam} fontSize="9">Foam</text>

          {/* Thick padding: wide low curve */}
          <path d="M200,150 Q210,100 230,95 Q250,100 260,150" fill={colors.success} opacity="0.6" />
          <text x="230" y="165" textAnchor="middle" fill={colors.success} fontSize="9">Thick</text>

          {/* Label */}
          <text x="150" y="18" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">SAME AREA = SAME IMPULSE</text>
        </svg>

        <div className="text-center mb-4">
          <div className="inline-block bg-white rounded-xl p-4 shadow-inner">
            <span className="text-2xl font-bold text-indigo-600">F × Δt = Δp</span>
            <p className="text-sm text-gray-600 mt-1">Force × Time = Momentum Change</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-red-100 rounded-lg p-3">
            <p className="font-semibold text-red-800">No Padding:</p>
            <p className="text-red-700 text-sm">Short time → BIG force → 💥 Broken</p>
          </div>
          <div className="bg-green-100 rounded-lg p-3">
            <p className="font-semibold text-green-800">With Padding:</p>
            <p className="text-green-700 text-sm">Long time → Small force → ✓ Safe</p>
          </div>
        </div>
      </div>

      {renderKeyTakeaway(
        "The Key Insight",
        "The momentum change is fixed (egg goes from moving to stopped). Padding doesn't change this—it spreads the same impulse over MORE TIME, so force is smaller!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">The Physics Equation:</h4>
        <div className="text-center">
          <p className="text-lg">If <span className="font-mono bg-gray-100 px-2 rounded">F × t = constant</span></p>
          <p className="text-lg mt-2">Then <span className="font-mono bg-green-100 px-2 rounded">↑ time</span> means <span className="font-mono bg-green-100 px-2 rounded">↓ force</span></p>
        </div>
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Try a Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'all_survive', label: 'All heights work with foam padding', icon: '✓' },
      { id: 'higher_breaks', label: 'Higher drops will break despite foam', icon: '📈' },
      { id: 'same_force', label: 'Force stays the same regardless of height', icon: '=' }
    ];

    return (
      <div>
        {renderSectionHeader('The Height Twist', 'Same foam, different heights')}

        <div className="bg-amber-50 rounded-xl p-4 mb-5">
          <p className="text-amber-800">
            Now let's keep the foam padding the same, but change the drop height.
            <br /><br />
            <span className="font-semibold">What happens when we drop from higher up?</span>
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

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test Heights')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      {renderSectionHeader('Height Experiment', 'Same foam, different drops')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderEggDropVisualization(eggPosition, twistEggSurvived, twistDropComplete, 'foam', twistHeight)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Height (with foam):</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'low' as const, label: '1 meter', safe: true },
            { id: 'medium' as const, label: '3 meters', safe: true },
            { id: 'high' as const, label: '5 meters', safe: false }
          ].map(h => (
            <button
              key={h.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!isDropping) {
                  setTwistHeight(h.id);
                  resetTwistDrop();
                  playSound(300, 'sine', 0.1);
                }
              }}
              disabled={isDropping}
              className={`p-3 rounded-lg border-2 transition-all ${
                twistHeight === h.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white'
              } ${isDropping ? 'opacity-50' : ''}`}
            >
              <span className="text-sm font-medium">{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isDropping && !twistDropComplete) startTwistDrop();
          }}
          disabled={isDropping || twistDropComplete}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            isDropping || twistDropComplete
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          🥚 Drop from {twistHeight === 'low' ? '1m' : twistHeight === 'medium' ? '3m' : '5m'}
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetTwistDrop();
          }}
          className="px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      {twistDropComplete && (
        <div className={`rounded-xl p-4 mb-4 ${twistEggSurvived ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={twistEggSurvived ? 'text-green-800' : 'text-red-800'}>
            <span className="font-bold">{twistEggSurvived ? '✓ Egg survived!' : '✗ Egg broke!'}</span>
            <br />
            {twistHeight === 'low' && 'Low height = low velocity = foam handles it easily'}
            {twistHeight === 'medium' && 'Medium height = more velocity but foam still works'}
            {twistHeight === 'high' && 'Higher velocity = more momentum = foam can\'t extend time enough!'}
          </p>
        </div>
      )}

      {renderBottomBar(() => goToPhase('twist_review'), twistDropComplete, 'Review Findings')}
    </div>
  );

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('The Complete Picture', 'Height, velocity, and momentum')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 150" className="w-full h-36 mb-4">
          {/* Velocity and momentum diagram */}
          <rect x="0" y="0" width="300" height="150" fill="white" rx="10" />

          {/* Three scenarios */}
          <g transform="translate(50, 75)">
            <circle cx="0" cy="0" r="20" fill={colors.success} opacity="0.2" />
            <text x="0" y="5" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="bold">1m</text>
            <text x="0" y="50" textAnchor="middle" fill="#64748B" fontSize="10">v = 4.4 m/s</text>
            <text x="0" y="65" textAnchor="middle" fill={colors.success} fontSize="10">✓ Safe</text>
          </g>

          <g transform="translate(150, 75)">
            <circle cx="0" cy="0" r="30" fill={colors.accent} opacity="0.2" />
            <text x="0" y="5" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">3m</text>
            <text x="0" y="50" textAnchor="middle" fill="#64748B" fontSize="10">v = 7.7 m/s</text>
            <text x="0" y="65" textAnchor="middle" fill={colors.success} fontSize="10">✓ Safe</text>
          </g>

          <g transform="translate(250, 75)">
            <circle cx="0" cy="0" r="40" fill={colors.danger} opacity="0.2" />
            <text x="0" y="5" textAnchor="middle" fill={colors.danger} fontSize="12" fontWeight="bold">5m</text>
            <text x="0" y="55" textAnchor="middle" fill="#64748B" fontSize="10">v = 10 m/s</text>
            <text x="0" y="70" textAnchor="middle" fill={colors.danger} fontSize="10">✗ Breaks</text>
          </g>

          {/* Formula */}
          <text x="150" y="15" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">v = √(2gh) — Velocity increases with height!</text>
        </svg>

        <div className="text-center">
          <p className="text-indigo-800">
            <span className="font-bold">Higher drops → More velocity → More momentum → More force needed to stop</span>
          </p>
        </div>
      </div>

      {renderKeyTakeaway(
        "The Complete Physics",
        "Padding helps by extending time, but there's a limit! Higher velocities mean more momentum (p = mv), requiring more impulse to stop. Eventually, even thick padding can't spread the force enough."
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Real-World Implication:</h4>
        <p className="text-gray-700">
          This is why cars have <span className="font-semibold text-indigo-600">speed limits</span> and
          <span className="font-semibold text-indigo-600"> crumple zones</span> are designed for specific impact speeds.
          At extreme velocities, no amount of crumpling is enough!
        </p>
      </div>

      {renderBottomBar(() => goToPhase('transfer'), true, 'See Real Applications')}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE - REAL WORLD APPLICATIONS
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '🚗',
      title: 'Car Crumple Zones',
      short: 'Automotive Safety',
      tagline: 'Why cars are designed to crumple',
      description: 'Modern cars have carefully engineered crumple zones that collapse in a controlled way during crashes, extending the time of deceleration and reducing force on passengers.',
      connection: 'Just like padding protects eggs, crumple zones extend the time of impact from milliseconds to tenths of seconds—reducing force by 10x or more.',
      howItWorks: 'The front and rear of cars contain sacrificial structures made of steel and aluminum that fold like an accordion during impact, absorbing energy and extending the collision time.',
      stats: [
        { value: '0.1s', label: 'Crumple time' },
        { value: '10x', label: 'Force reduction' },
        { value: '90%', label: 'Fatality reduction since 1960s' }
      ],
      examples: ['Front crumple zones in head-on collisions', 'Side-impact bars in doors', 'Rear crumple zones for rear-end crashes', 'Subframe collapse structures'],
      companies: ['Volvo (safety pioneer)', 'Mercedes-Benz (first crumple zones 1959)', 'Tesla (mega-castings)', 'All modern manufacturers'],
      futureImpact: 'Next-generation vehicles use AI to predict crash severity and deploy variable crumple responses, with some prototypes featuring inflatable external airbags.',
      color: '#EF4444'
    },
    {
      icon: '🪖',
      title: 'Helmet Technology',
      short: 'Head Protection',
      tagline: 'Extending impact time for your brain',
      description: 'Helmets use foam liners that compress during impact, extending the time over which the head decelerates and dramatically reducing the force transmitted to the brain.',
      connection: 'The foam in helmets works exactly like padding for eggs—same momentum change, more time, less force on the delicate brain inside.',
      howItWorks: 'EPS (expanded polystyrene) foam crushes irreversibly during impact, converting kinetic energy to material deformation while extending the deceleration time.',
      stats: [
        { value: '50ms', label: 'Impact extended to' },
        { value: '85%', label: 'Fatality reduction for cyclists' },
        { value: '88%', label: 'TBI reduction for motorcyclists' }
      ],
      examples: ['Bicycle helmets', 'Motorcycle helmets', 'Football helmets with MIPS', 'Military combat helmets', 'Ski and snowboard helmets'],
      companies: ['Giro', 'Bell', 'Shoei', 'POC', 'MIPS (angular impact technology)'],
      futureImpact: 'Smart helmets with sensors are emerging that can detect impacts, measure forces, and alert emergency services. Multi-impact foams that recover are also being developed.',
      color: '#8B5CF6'
    },
    {
      icon: '📦',
      title: 'Packaging Engineering',
      short: 'Product Protection',
      tagline: 'Why Amazon boxes have so much padding',
      description: 'Product packaging uses foam, air pillows, and engineered structures to extend impact time during drops and rough handling, protecting fragile electronics and goods.',
      connection: 'Every piece of packaging foam is solving the egg drop problem—extending deceleration time so fragile items survive the forces of shipping.',
      howItWorks: 'Packaging materials are designed to compress progressively, creating a controlled deceleration that keeps forces below the damage threshold of the product.',
      stats: [
        { value: '3-6ft', label: 'Drop height protection' },
        { value: '$15B', label: 'Shipping damage prevented yearly' },
        { value: '95%+', label: 'Survival rate for good packaging' }
      ],
      examples: ['Electronics shipping foam', 'Air pillows in Amazon boxes', 'Egg carton design', 'Suspension packaging for medical devices'],
      companies: ['Sealed Air (bubble wrap inventors)', 'Sonoco', 'Pregis', 'Storopack'],
      futureImpact: 'Sustainable packaging using mushroom-based and recycled materials is emerging, offering the same impulse-extending protection with lower environmental impact.',
      color: '#F59E0B'
    },
    {
      icon: '🪂',
      title: 'Parachute Landing Falls',
      short: 'Military Training',
      tagline: 'The physics of safe landing',
      description: 'Paratroopers and skydivers are trained in Parachute Landing Falls (PLF)—a technique that extends impact time by rolling and using the whole body to absorb the landing.',
      connection: 'Human bodies become living crumple zones! By rolling and distributing the impact over time and body area, the same momentum change results in survivable forces.',
      howItWorks: 'The PLF technique involves landing on the balls of the feet, rolling to the calf, thigh, buttock, and back—extending contact time from 0.1s to nearly 1 second.',
      stats: [
        { value: '10x', label: 'Force reduction with PLF' },
        { value: '90%', label: 'Injury reduction' },
        { value: '1940s', label: 'First PLF training' }
      ],
      examples: ['Military parachute training', 'Skydiving instruction', 'Parkour landing rolls', 'Gymnastics dismounts', 'Martial arts breakfalls'],
      companies: ['US Army Airborne School', 'British Parachute Regiment', 'Martial arts systems worldwide'],
      futureImpact: 'Virtual reality training systems now teach PLF techniques before actual jumps, reducing injuries during learning. Exoskeletons may eventually augment human ability to absorb impact.',
      color: '#10B981'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Real-World Impact', 'Impulse physics saves lives daily')}

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
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Egg Drop:</h4>
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
              You've seen how impulse physics protects us in cars, helmets, packaging, and more.
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
      scenario: 'A phone drops 1 meter onto concrete vs. onto a pillow.',
      question: 'Why does the pillow protect the phone better?',
      options: [
        { text: 'The pillow absorbs all the kinetic energy magically', correct: false },
        { text: 'The pillow extends the stopping time, reducing force', correct: true },
        { text: 'The pillow slows down the phone before impact', correct: false },
        { text: 'The pillow is lighter than concrete', correct: false }
      ],
      explanation: 'The pillow compresses during impact, extending the deceleration time. Since impulse (F×t) equals momentum change (fixed), more time means less force.'
    },
    {
      scenario: 'A car has a crumple zone that extends collision time from 0.05s to 0.5s.',
      question: 'How much does this reduce the average force on passengers?',
      options: [
        { text: '2 times less force', correct: false },
        { text: '5 times less force', correct: false },
        { text: '10 times less force', correct: true },
        { text: '50 times less force', correct: false }
      ],
      explanation: 'If time increases by 10x (0.05s to 0.5s), and impulse (F×t) must stay constant, then force decreases by 10x. This is why crumple zones save lives!'
    },
    {
      scenario: 'An egg can survive a force of 25 Newtons but no more.',
      question: 'If padding extends impact from 0.01s to 0.1s, what happens?',
      options: [
        { text: 'Force drops by 10x, egg likely survives', correct: true },
        { text: 'Force stays the same, egg breaks', correct: false },
        { text: 'Force increases, egg definitely breaks', correct: false },
        { text: 'Time doesn\'t affect force at all', correct: false }
      ],
      explanation: '10x more time means 10x less force. If the unpadded impact would be 100N, padding reduces it to about 10N—well under the 25N threshold.'
    },
    {
      scenario: 'A skydiver falls twice as fast due to heavier gear.',
      question: 'How does this affect the momentum they must dissipate on landing?',
      options: [
        { text: 'Same momentum—speed doesn\'t matter', correct: false },
        { text: 'Double the momentum (p = mv)', correct: true },
        { text: 'Half the momentum', correct: false },
        { text: 'Momentum only depends on height', correct: false }
      ],
      explanation: 'Momentum is mass × velocity. Doubling velocity doubles momentum, which means twice the impulse needed to stop, requiring either twice the time or twice the force.'
    },
    {
      scenario: 'A boxer "rolls with the punch" by moving their head backward when hit.',
      question: 'How does this reduce injury?',
      options: [
        { text: 'It makes the punch miss entirely', correct: false },
        { text: 'It reduces the punch\'s velocity', correct: false },
        { text: 'It extends the contact time, reducing force', correct: true },
        { text: 'It absorbs energy in their muscles', correct: false }
      ],
      explanation: 'By moving with the punch, the boxer extends the time over which momentum is transferred, reducing peak force—the same principle as crumple zones!'
    },
    {
      scenario: 'A phone case has "air cushion corners" that compress during impact.',
      question: 'What physics principle makes this effective?',
      options: [
        { text: 'Air is lighter than the phone', correct: false },
        { text: 'Air cushions bounce the phone back up', correct: false },
        { text: 'Air compression extends impact time', correct: true },
        { text: 'Air absorbs radio signals', correct: false }
      ],
      explanation: 'The air cushions compress progressively during impact, extending the stopping time and reducing the peak force on the phone\'s fragile components.'
    },
    {
      scenario: 'An airbag deploys in a crash, but the car has no seatbelt.',
      question: 'Why might the airbag alone cause injury?',
      options: [
        { text: 'Airbags are always dangerous', correct: false },
        { text: 'Without a seatbelt, you hit the airbag at full speed', correct: true },
        { text: 'Airbags don\'t work without seatbelts', correct: false },
        { text: 'Seatbelts activate airbags', correct: false }
      ],
      explanation: 'Seatbelts slow you down with the car during the crumple phase. Without one, you\'re still moving at crash speed when you hit the airbag—much higher momentum to stop.'
    },
    {
      scenario: 'A gymnastics mat is 4 inches thick. The coach considers using an 8-inch mat.',
      question: 'What would doubling the mat thickness approximately do?',
      options: [
        { text: 'Double the protection (half the force)', correct: true },
        { text: 'Same protection, just bouncier', correct: false },
        { text: 'Less protection due to height', correct: false },
        { text: 'Quadruple the protection', correct: false }
      ],
      explanation: 'Thicker mats can compress more, roughly doubling the deceleration time and halving the impact force—making harder landings survivable.'
    },
    {
      scenario: 'A martial artist breaks boards but not bricks.',
      question: 'What\'s the key difference from an impulse perspective?',
      options: [
        { text: 'Bricks are too heavy', correct: false },
        { text: 'Boards flex, extending contact time', correct: true },
        { text: 'Bricks absorb more energy', correct: false },
        { text: 'Only the surface matters', correct: false }
      ],
      explanation: 'Wood boards flex slightly before breaking, extending the time of force application. Rigid bricks create an almost instantaneous impulse, focusing all force in a short time.'
    },
    {
      scenario: 'Racing cars are designed to disintegrate in crashes.',
      question: 'Why is this considered a safety feature?',
      options: [
        { text: 'Lighter cars are safer', correct: false },
        { text: 'Debris slows down other cars', correct: false },
        { text: 'Disintegration extends deceleration time', correct: true },
        { text: 'The driver is ejected safely', correct: false }
      ],
      explanation: 'When the car breaks apart, each piece independently decelerates, and the driver\'s cockpit slows down over a much longer time than a rigid car would, dramatically reducing G-forces on the driver.'
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
              {score >= 8 ? 'Excellent! You\'ve mastered impulse physics!' :
               score >= 6 ? 'Good work! You understand the core concepts.' :
               'Keep learning—impulse physics takes practice!'}
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
    // Create confetti effect
    const confetti = Array(20).fill(null).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: [colors.primary, colors.secondary, colors.accent, colors.success][Math.floor(Math.random() * 4)]
    }));

    return (
      <div className="text-center relative overflow-hidden">
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none">
          {confetti.map((c, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-bounce"
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

        <div className="text-6xl mb-4">🎓</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Mastery Achieved!
        </h2>
        <p className="text-gray-600 mb-6">You've mastered Impulse & Crumple Zone Physics</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">The Impulse-Momentum Theorem:</span>
              <p className="text-sm text-gray-700">Force × Time = Change in Momentum (F × Δt = Δp)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">The Protection Principle:</span>
              <p className="text-sm text-gray-700">Extending impact time reduces force proportionally</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Real-World Applications:</span>
              <p className="text-sm text-gray-700">Crumple zones, helmets, packaging, and PLF techniques</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Height Limitation:</span>
              <p className="text-sm text-gray-700">Higher velocity = more momentum = protective limits</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-green-600 mb-1">
            Test Score: {testScore}/10 ({testScore * 10}%)
          </div>
          <p className="text-green-700 text-sm">
            {testScore >= 8 ? 'Outstanding performance!' : 'Great progress on your physics journey!'}
          </p>
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
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            🥚 Egg Drop Physics
          </h1>
          <p className="text-gray-600 text-sm">Crumple Zones & Impulse</p>
        </div>

        {renderProgressBar()}

        {/* Coach Message */}
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

        {/* Phase Content */}
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

export default EggDropRenderer;
