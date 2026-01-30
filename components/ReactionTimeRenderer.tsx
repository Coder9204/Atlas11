import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// REACTIONTIME RENDERER - RULER DROP TEST
// Teaching: d = ½gt² → Measure reaction time using free fall physics
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

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const soundConfig = {
      click: { frequency: 440, duration: 0.1, oscType: 'sine' as OscillatorType },
      success: { frequency: 600, duration: 0.15, oscType: 'sine' as OscillatorType },
      failure: { frequency: 200, duration: 0.2, oscType: 'sawtooth' as OscillatorType },
      transition: { frequency: 520, duration: 0.15, oscType: 'sine' as OscillatorType },
      complete: { frequency: 800, duration: 0.3, oscType: 'sine' as OscillatorType },
    };

    const config = soundConfig[type];
    oscillator.frequency.value = config.frequency;
    oscillator.type = config.oscType;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
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

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface ReactionTimeRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ReactionTimeRenderer: React.FC<ReactionTimeRendererProps> = ({
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

  // Ruler drop simulation
  const [rulerState, setRulerState] = useState<'ready' | 'waiting' | 'dropping' | 'caught' | 'missed'>('ready');
  const [rulerPosition, setRulerPosition] = useState(0);
  const [dropStartTime, setDropStartTime] = useState<number | null>(null);
  const [catchTime, setCatchTime] = useState<number | null>(null);
  const [catchDistance, setCatchDistance] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);

  // Interactive controls
  const [gravity, setGravity] = useState(9.8); // m/s² - Earth default
  const [rulerLength, setRulerLength] = useState(30); // cm
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);

  // Twist: distraction test
  const [distractionType, setDistractionType] = useState<'none' | 'visual' | 'audio' | 'math'>('none');
  const [mathProblem, setMathProblem] = useState({ a: 0, b: 0, answer: 0 });
  const [twistAttempts, setTwistAttempts] = useState<{ type: string; time: number }[]>([]);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation ref
  const animationRef = useRef<number | null>(null);
  const dropTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    playSound('transition');
    setPhase(newPhase);
    setShowCoachMessage(true);
    emitEvent('phase_change', { action: `Moved to ${newPhase}` });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [emitEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────

  // d = ½gt² → t = √(2d/g)
  const distanceToTime = (distanceCm: number): number => {
    const distanceM = distanceCm / 100;
    return Math.sqrt((2 * distanceM) / gravity) * 1000; // Convert to ms
  };

  // t = √(2d/g) → d = ½gt²
  const timeToDistance = (timeMs: number): number => {
    const timeS = timeMs / 1000;
    return (0.5 * gravity * timeS * timeS) * 100; // Convert to cm
  };

  // Calculate current velocity during fall
  const getCurrentVelocity = (distanceCm: number): number => {
    // v = √(2gd)
    const distanceM = distanceCm / 100;
    return Math.sqrt(2 * gravity * distanceM) * 100; // cm/s
  };

  // Gravity presets
  const gravityPresets = [
    { name: 'Moon', value: 1.62, emoji: '🌙' },
    { name: 'Mars', value: 3.72, emoji: '🔴' },
    { name: 'Earth', value: 9.8, emoji: '🌍' },
    { name: 'Jupiter', value: 24.79, emoji: '🟠' }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RULER DROP SIMULATION
  // ─────────────────────────────────────────────────────────────────────────

  const startTest = () => {
    setRulerState('waiting');
    setRulerPosition(0);
    setCatchDistance(null);
    setReactionTime(null);

    // Random delay before drop (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;

    dropTimeoutRef.current = setTimeout(() => {
      setRulerState('dropping');
      setDropStartTime(Date.now());

      // Animate the drop
      let pos = 0;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        pos = 0.5 * gravity * elapsed * elapsed * 100; // cm

        if (pos >= rulerLength) {
          // Missed!
          setRulerState('missed');
          setRulerPosition(rulerLength);
          playSound('failure');
          return;
        }

        setRulerPosition(pos);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }, delay);
  };

  const catchRuler = () => {
    if (rulerState === 'waiting') {
      // Jumped the gun!
      setRulerState('ready');
      playSound('failure');
      return;
    }

    if (rulerState !== 'dropping') return;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const now = Date.now();
    const reaction = now - (dropStartTime || now);
    const distance = rulerPosition;

    setCatchTime(now);
    setCatchDistance(distance);
    setReactionTime(reaction);
    setRulerState('caught');

    playSound('success');

    setAttempts(prev => [...prev, reaction]);
    emitEvent('observation', {
      details: `Caught at ${distance.toFixed(1)}cm = ${reaction.toFixed(0)}ms reaction time`
    });
  };

  const resetTest = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (dropTimeoutRef.current) clearTimeout(dropTimeoutRef.current);
    setRulerState('ready');
    setRulerPosition(0);
    setDropStartTime(null);
    setCatchTime(null);
    setCatchDistance(null);
    setReactionTime(null);
  };

  // Twist: distraction test
  const startDistractionTest = () => {
    if (distractionType === 'math') {
      const a = Math.floor(Math.random() * 10) + 5;
      const b = Math.floor(Math.random() * 10) + 5;
      setMathProblem({ a, b, answer: a + b });
    }
    startTest();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (dropTimeoutRef.current) clearTimeout(dropTimeoutRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "⏱️ How fast can you react? Your brain has a speed limit, and we can measure it with physics!",
    predict: "Predict: How long does it take for your brain to see something and tell your hand to move?",
    play: "Try to catch the falling ruler! The distance tells us your reaction time.",
    review: "Using d = ½gt², we convert catch distance to reaction time. Physics as a stopwatch!",
    twist_predict: "What happens to reaction time when you're distracted?",
    twist_play: "Try catching the ruler while doing math or with visual distractions!",
    twist_review: "Distractions increase reaction time—that's why texting and driving is deadly!",
    transfer: "Reaction time matters in sports, driving, gaming, and medicine!",
    test: "Let's test your understanding of reaction time physics!",
    mastery: "🎉 You've mastered reaction time measurement! Quick reflexes!"
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
    ruler: '#F59E0B',
    hand: '#FBBF24',
    excellent: '#10B981',
    good: '#3B82F6',
    average: '#F59E0B',
    slow: '#EF4444'
  };

  // Get rating based on reaction time
  const getReactionRating = (ms: number) => {
    if (ms < 180) return { label: 'Excellent!', color: colors.excellent, emoji: '🏆' };
    if (ms < 220) return { label: 'Great!', color: colors.good, emoji: '⭐' };
    if (ms < 280) return { label: 'Average', color: colors.average, emoji: '👍' };
    return { label: 'Keep practicing', color: colors.slow, emoji: '🎯' };
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
  // RULER DROP VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderRulerDrop = (showDistraction = false) => {
    return (
      <svg viewBox="0 0 200 320" className="w-full h-64 md:h-80">
        {/* Background */}
        <rect x="0" y="0" width="200" height="320" fill="#F8FAFC" rx="10" />

        {/* Distraction overlay */}
        {showDistraction && distractionType === 'visual' && rulerState === 'dropping' && (
          <>
            <circle cx={50 + Math.random() * 100} cy={50 + Math.random() * 200} r="20" fill={colors.danger} opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx={30 + Math.random() * 140} cy={100 + Math.random() * 150} r="15" fill={colors.accent} opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.25s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Hand at top (releasing) */}
        <g transform="translate(100, 30)">
          <ellipse cx="0" cy="0" rx="25" ry="15" fill={colors.hand} />
          <rect x="-8" y="-5" width="16" height="20" fill={colors.hand} />
          <text x="0" y="5" textAnchor="middle" fill={colors.neutral} fontSize="8">
            {rulerState === 'waiting' ? '...' : rulerState === 'dropping' ? 'DROP!' : ''}
          </text>
        </g>

        {/* Ruler */}
        <g transform={`translate(100, ${50 + rulerPosition * 8})`}>
          <rect x="-15" y="0" width="30" height="180" fill={colors.ruler} rx="3" stroke="#D97706" strokeWidth="2" />

          {/* Ruler markings - dynamic based on rulerLength */}
          {Array.from({ length: Math.floor(rulerLength / 5) + 1 }, (_, i) => i * 5).map(cm => (
            <g key={cm} transform={`translate(0, ${cm * 6})`}>
              <line x1="-15" y1="0" x2="-8" y2="0" stroke="#92400E" strokeWidth="1" />
              <text x="-5" y="4" textAnchor="end" fill="#92400E" fontSize="8">{cm}</text>
            </g>
          ))}

          <text x="8" y={rulerLength * 3} fill="#92400E" fontSize="8" fontWeight="bold">cm</text>
        </g>

        {/* Catch hand at bottom */}
        <g transform="translate(100, 280)">
          <ellipse cx="0" cy="0" rx="30" ry="18" fill={colors.hand} stroke="#D97706" strokeWidth="2" />
          <rect x="-10" y="-8" width="20" height="15" fill={colors.hand} />
          {rulerState === 'caught' && (
            <text x="0" y="5" textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="bold">CAUGHT!</text>
          )}
        </g>

        {/* Status indicator */}
        <g transform="translate(100, 10)">
          <rect
            x="-50"
            y="-8"
            width="100"
            height="20"
            fill={
              rulerState === 'ready' ? colors.neutral :
              rulerState === 'waiting' ? colors.accent :
              rulerState === 'dropping' ? colors.danger :
              rulerState === 'caught' ? colors.success : colors.danger
            }
            rx="10"
          />
          <text x="0" y="6" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            {rulerState === 'ready' ? 'Click to Start' :
             rulerState === 'waiting' ? 'Get Ready...' :
             rulerState === 'dropping' ? 'CATCH IT!' :
             rulerState === 'caught' ? 'Nice Catch!' : 'Missed!'}
          </text>
        </g>

        {/* Math distraction */}
        {showDistraction && distractionType === 'math' && (rulerState === 'waiting' || rulerState === 'dropping') && (
          <g transform="translate(100, 160)">
            <rect x="-40" y="-20" width="80" height="40" fill="white" stroke={colors.primary} strokeWidth="2" rx="5" />
            <text x="0" y="5" textAnchor="middle" fill={colors.primary} fontSize="14" fontWeight="bold">
              {mathProblem.a} + {mathProblem.b} = ?
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Reaction Time Test
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Measure your brain's speed limit
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <svg viewBox="0 0 300 160" className="w-full h-40 mb-6">
            <rect x="0" y="0" width="300" height="160" fill="#1e293b" rx="10" />

            {/* Brain to hand pathway */}
            <g transform="translate(50, 80)">
              <circle cx="0" cy="0" r="25" fill="#818cf8" />
              <text x="0" y="5" textAnchor="middle" fill="#1e1b4b" fontSize="8" fontWeight="bold">BRAIN</text>
            </g>

            <g transform="translate(150, 80)">
              <circle cx="0" cy="0" r="20" fill="#60a5fa" />
              <text x="0" y="5" textAnchor="middle" fill="#1e3a8a" fontSize="7">NERVES</text>
            </g>

            <g transform="translate(250, 80)">
              <ellipse cx="0" cy="0" rx="25" ry="15" fill="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">HAND</text>
            </g>

            {/* Arrows */}
            <line x1="75" y1="80" x2="125" y2="80" stroke="#818cf8" strokeWidth="3" />
            <line x1="175" y1="80" x2="220" y2="80" stroke="#818cf8" strokeWidth="3" />

            {/* Time labels */}
            <text x="100" y="60" textAnchor="middle" fill="#94a3b8" fontSize="9">~50ms</text>
            <text x="197" y="60" textAnchor="middle" fill="#94a3b8" fontSize="9">~100ms</text>

            {/* Total */}
            <text x="150" y="140" textAnchor="middle" fill="#818cf8" fontSize="12" fontWeight="bold">
              Total: ~150-300ms
            </text>

            <text x="150" y="25" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="bold">
              THE NEURAL PATHWAY
            </text>
          </svg>

          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            Your brain can't react instantly—there's a physical limit!
          </p>
          <p className="text-lg text-indigo-400 font-semibold">
            We can measure it using a falling ruler and physics.
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">✦</span>
          10 Phases
        </div>
      </div>
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'fast', label: 'Less than 100ms (lightning fast!)', icon: '⚡' },
      { id: 'medium', label: '150-250ms (typical human range)', icon: '👤' },
      { id: 'slow', label: '300-500ms (pretty slow)', icon: '🐢' },
      { id: 'very_slow', label: 'More than 500ms (half a second+)', icon: '🦥' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'How fast is human reaction?')}

        <div className="bg-blue-50 rounded-xl p-4 mb-5">
          <p className="text-blue-800">
            From the moment your eyes see the ruler drop to the moment your hand
            squeezes to catch it—how long does that take?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setPrediction(option.id);
                playSound('click');
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

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Test Your Reaction')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Ruler Drop Test', 'Catch it as fast as you can!')}

      {/* Interactive Controls Panel */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white">⚙️ Physics Controls</h4>
          <button
            onClick={() => setShowPhysicsPanel(!showPhysicsPanel)}
            className="text-slate-400 hover:text-white text-sm"
            style={{ zIndex: 10 }}
          >
            {showPhysicsPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPhysicsPanel && (
          <div className="space-y-4">
            {/* Gravity Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Gravity Environment</span>
                <span className="text-amber-400 font-mono">{gravity.toFixed(2)} m/s²</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.1"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                disabled={rulerState !== 'ready'}
              />
              <div className="flex justify-between mt-2 gap-2">
                {gravityPresets.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => setGravity(preset.value)}
                    disabled={rulerState !== 'ready'}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${
                      Math.abs(gravity - preset.value) < 0.1
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    {preset.emoji} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Ruler Length Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Ruler Length</span>
                <span className="text-blue-400 font-mono">{rulerLength} cm</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={rulerLength}
                onChange={(e) => setRulerLength(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                disabled={rulerState !== 'ready'}
              />
            </div>

            {/* Real-time Physics Display */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700">
              <div className="text-center bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Max Fall Time</div>
                <div className="text-lg font-bold text-green-400">{distanceToTime(rulerLength).toFixed(0)}ms</div>
              </div>
              <div className="text-center bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Current Distance</div>
                <div className="text-lg font-bold text-blue-400">{rulerPosition.toFixed(1)}cm</div>
              </div>
              <div className="text-center bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Fall Velocity</div>
                <div className="text-lg font-bold text-purple-400">{getCurrentVelocity(rulerPosition).toFixed(0)}cm/s</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderRulerDrop()}
      </div>

      <div className="flex justify-center gap-3 mb-4">
        {rulerState === 'ready' && (
          <button
            onClick={() => startTest()}
            className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl"
            style={{ zIndex: 10 }}
          >
            🎯 Start Test
          </button>
        )}
        {(rulerState === 'waiting' || rulerState === 'dropping') && (
          <button
            onClick={() => catchRuler()}
            className="px-12 py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl animate-pulse"
            style={{ zIndex: 10 }}
          >
            👋 CATCH!
          </button>
        )}
        {(rulerState === 'caught' || rulerState === 'missed') && (
          <button
            onClick={() => resetTest()}
            className="px-8 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700"
            style={{ zIndex: 10 }}
          >
            Try Again
          </button>
        )}
      </div>

      {rulerState === 'caught' && reactionTime !== null && catchDistance !== null && (
        <div className="bg-green-50 rounded-xl p-4 mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-1">
              {reactionTime.toFixed(0)}ms
            </p>
            <p className="text-green-700">
              Caught at {catchDistance.toFixed(1)}cm
              <br />
              <span className="text-2xl">{getReactionRating(reactionTime).emoji}</span>
              <span className="font-semibold ml-2" style={{ color: getReactionRating(reactionTime).color }}>
                {getReactionRating(reactionTime).label}
              </span>
            </p>
          </div>
        </div>
      )}

      {rulerState === 'missed' && (
        <div className="bg-red-50 rounded-xl p-4 mb-4">
          <p className="text-red-800 text-center">
            <span className="font-bold">Missed!</span> The ruler fell more than {rulerLength}cm.
            <br />
            Reaction time would be &gt;{distanceToTime(rulerLength).toFixed(0)}ms
          </p>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-indigo-800 mb-2">📊 Your Attempts:</h4>
          <div className="flex flex-wrap gap-2">
            {attempts.map((time, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: getReactionRating(time).color }}
              >
                {time.toFixed(0)}ms
              </span>
            ))}
          </div>
          <p className="text-sm text-indigo-700 mt-2">
            Average: {(attempts.reduce((a, b) => a + b, 0) / attempts.length).toFixed(0)}ms
          </p>
        </div>
      )}

      {renderBottomBar(() => goToPhase('review'), attempts.length >= 3, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader('The Physics of Reaction Time', 'Free fall as a stopwatch')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <div className="text-center mb-4">
          <div className="inline-block bg-white rounded-xl p-4 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Free Fall Equation:</p>
            <span className="text-2xl font-bold text-indigo-600">d = ½gt²</span>
            <p className="text-sm text-gray-600 mt-2">Solving for time:</p>
            <span className="text-xl font-bold text-purple-600">t = √(2d/g)</span>
          </div>
        </div>

        <svg viewBox="0 0 300 120" className="w-full h-28 mb-4">
          <rect x="0" y="0" width="300" height="120" fill="white" rx="10" />

          {/* Distance to time conversion table */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            DISTANCE → REACTION TIME
          </text>

          {[
            { d: 5, t: 101 },
            { d: 10, t: 143 },
            { d: 15, t: 175 },
            { d: 20, t: 202 },
            { d: 25, t: 226 },
            { d: 30, t: 247 }
          ].map((item, i) => (
            <g key={i} transform={`translate(${40 + i * 42}, 60)`}>
              <rect x="-18" y="-20" width="36" height="55" fill={getReactionRating(item.t).color} opacity="0.2" rx="5" />
              <text x="0" y="-5" textAnchor="middle" fill={colors.neutral} fontSize="10">{item.d}cm</text>
              <text x="0" y="15" textAnchor="middle" fill={getReactionRating(item.t).color} fontSize="11" fontWeight="bold">{item.t}ms</text>
            </g>
          ))}

          <text x="150" y="105" textAnchor="middle" fill={colors.neutral} fontSize="9">
            (assuming g = 9.8 m/s²)
          </text>
        </svg>
      </div>

      {renderKeyTakeaway(
        "Physics as Measurement",
        "By using gravity's constant acceleration, we turn a falling ruler into a precise stopwatch! The catch distance directly converts to reaction time through d = ½gt²."
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Human Reaction Time Breakdown:</h4>
        <ul className="text-gray-700 text-sm space-y-1">
          <li>• <span className="font-semibold">Visual processing:</span> ~50ms (retina → visual cortex)</li>
          <li>• <span className="font-semibold">Recognition:</span> ~50ms (identify the drop)</li>
          <li>• <span className="font-semibold">Decision:</span> ~30ms (decide to catch)</li>
          <li>• <span className="font-semibold">Motor signal:</span> ~70ms (brain → hand muscles)</li>
          <li>• <span className="font-semibold">Total:</span> ~150-300ms typical</li>
        </ul>
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Try Distraction Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'same', label: 'Distractions don\'t affect reaction time', icon: '=' },
      { id: 'slower', label: 'Distractions make reaction time slower', icon: '🐢' },
      { id: 'faster', label: 'Distractions make you more alert (faster)', icon: '⚡' }
    ];

    return (
      <div>
        {renderSectionHeader('The Distraction Twist', 'What happens when you multitask?')}

        <div className="bg-purple-50 rounded-xl p-4 mb-5">
          <p className="text-purple-800">
            What if you're solving a math problem while trying to catch the ruler?
            Or if there are visual distractions?
            <br /><br />
            <span className="font-semibold">How do distractions affect reaction time?</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setTwistPrediction(option.id);
                playSound('click');
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

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test with Distractions')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      {renderSectionHeader('Distraction Test', 'Catch while multitasking')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderRulerDrop(true)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Distraction:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'none' as const, label: 'None', icon: '😌' },
            { id: 'visual' as const, label: 'Visual', icon: '👀' },
            { id: 'math' as const, label: 'Math', icon: '🔢' }
          ].map(d => (
            <button
              key={d.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setDistractionType(d.id);
                resetTest();
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                distractionType === d.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-xl">{d.icon}</span>
              <p className="text-sm font-medium">{d.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        {rulerState === 'ready' && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              startDistractionTest();
            }}
            className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg"
          >
            🎯 Start Test
          </button>
        )}
        {(rulerState === 'waiting' || rulerState === 'dropping') && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              catchRuler();
              if (reactionTime !== null) {
                setTwistAttempts(prev => [...prev, { type: distractionType, time: reactionTime }]);
              }
            }}
            className="px-12 py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg animate-pulse"
          >
            👋 CATCH!
          </button>
        )}
        {(rulerState === 'caught' || rulerState === 'missed') && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (reactionTime !== null) {
                setTwistAttempts(prev => [...prev, { type: distractionType, time: reactionTime }]);
              }
              resetTest();
            }}
            className="px-8 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700"
          >
            Try Again
          </button>
        )}
      </div>

      {rulerState === 'caught' && reactionTime !== null && (
        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <p className="text-center text-2xl font-bold text-purple-600">{reactionTime.toFixed(0)}ms</p>
          <p className="text-center text-purple-700">with {distractionType === 'none' ? 'no' : distractionType} distraction</p>
        </div>
      )}

      {twistAttempts.length > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-indigo-800 mb-2">📊 Distraction Results:</h4>
          <div className="space-y-2">
            {['none', 'visual', 'math'].map(type => {
              const typeAttempts = twistAttempts.filter(a => a.type === type);
              if (typeAttempts.length === 0) return null;
              const avg = typeAttempts.reduce((a, b) => a + b.time, 0) / typeAttempts.length;
              return (
                <div key={type} className="flex justify-between items-center bg-white rounded-lg p-2">
                  <span className="text-gray-700 capitalize">{type === 'none' ? 'No distraction' : type}</span>
                  <span className="font-bold" style={{ color: getReactionRating(avg).color }}>{avg.toFixed(0)}ms</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderBottomBar(() => goToPhase('twist_review'), twistAttempts.length >= 3, 'Review Findings')}
    </div>
  );

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('Distraction Effects', 'Why multitasking is dangerous')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 120" className="w-full h-28 mb-4">
          <rect x="0" y="0" width="300" height="120" fill="white" rx="10" />

          {/* Bar chart */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            TYPICAL REACTION TIME BY CONDITION
          </text>

          {/* Focused bar */}
          <rect x="40" y="40" width="50" height="50" fill={colors.success} rx="5" />
          <text x="65" y="100" textAnchor="middle" fill={colors.neutral} fontSize="9">Focused</text>
          <text x="65" y="60" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">200ms</text>

          {/* Visual distraction bar */}
          <rect x="120" y="35" width="50" height="55" fill={colors.accent} rx="5" />
          <text x="145" y="100" textAnchor="middle" fill={colors.neutral} fontSize="9">Visual</text>
          <text x="145" y="60" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">250ms</text>

          {/* Cognitive distraction bar */}
          <rect x="200" y="25" width="50" height="65" fill={colors.danger} rx="5" />
          <text x="225" y="100" textAnchor="middle" fill={colors.neutral} fontSize="9">Math</text>
          <text x="225" y="55" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">350ms</text>
        </svg>

        <div className="text-center">
          <p className="text-lg text-purple-800 font-semibold">
            Cognitive load increases reaction time by 50-100%!
          </p>
        </div>
      </div>

      {renderKeyTakeaway(
        "Why This Matters",
        "Texting while driving requires cognitive attention (reading, typing, thinking). This can add 200+ ms to your reaction time—equivalent to driving 20+ feet blind at highway speeds!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Real-World Implications:</h4>
        <ul className="text-gray-700 text-sm space-y-1">
          <li>• <span className="font-semibold text-red-600">Texting & driving:</span> ~400ms slower (dangerous!)</li>
          <li>• <span className="font-semibold text-amber-600">Phone conversation:</span> ~200ms slower</li>
          <li>• <span className="font-semibold text-green-600">Focused driving:</span> baseline ~250ms</li>
          <li>• <span className="font-semibold text-blue-600">Professional racers:</span> ~150ms (trained)</li>
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
      icon: '🏎️',
      title: 'Motorsport Reaction',
      short: 'Racing',
      tagline: 'Where milliseconds decide championships',
      description: 'F1 drivers train to achieve reaction times under 150ms for race starts. The difference between winning and losing can be 0.001 seconds.',
      connection: 'Just like the ruler test, race start lights measure who reacts first. Drivers train specific neural pathways to shave milliseconds off their response.',
      howItWorks: 'Starting lights sequence through red lights, then go out simultaneously. Sensors detect wheel movement within 1ms precision. False starts (< 200ms) are penalized.',
      stats: [
        { value: '140ms', label: 'Top F1 reaction' },
        { value: '0.010s', label: 'Start time precision' },
        { value: '$1M+', label: 'Training investment' }
      ],
      examples: ['F1 race starts', 'Drag racing lights', 'Sprint starts', 'Swimming dive reaction'],
      companies: ['TAG Heuer (timing)', 'Omega (Olympics)', 'Red Bull Racing', 'Mercedes F1'],
      futureImpact: 'Neural training devices and VR simulators are helping drivers shave another 10-20ms off reaction times through targeted neural pathway training.',
      color: '#EF4444'
    },
    {
      icon: '🎮',
      title: 'Esports & Gaming',
      short: 'Gaming',
      tagline: 'Professional reflexes in the digital age',
      description: 'Professional esports players have reaction times averaging 150-180ms, compared to 250ms for casual gamers. This is trained, not just natural talent.',
      connection: 'The same physics applies—visual stimulus → brain processing → motor response. Pro gamers optimize each step through practice.',
      howItWorks: 'High refresh rate monitors (240-360Hz) reduce display latency. Low-latency peripherals (1ms response) ensure inputs register instantly. The limiting factor becomes human neurons.',
      stats: [
        { value: '150ms', label: 'Pro gamer average' },
        { value: '1ms', label: 'Monitor response' },
        { value: '8hrs/day', label: 'Training time' }
      ],
      examples: ['CS:GO aim duels', 'Fighting game combos', 'Battle royale reactions', 'Rhythm games'],
      companies: ['Team Liquid', 'Cloud9', 'Logitech G', 'Razer', 'BenQ'],
      futureImpact: 'Brain-computer interfaces may eventually bypass the motor neuron delay, allowing direct neural game control with 50ms faster response times.',
      color: '#8B5CF6'
    },
    {
      icon: '🚗',
      title: 'Automotive Safety',
      short: 'Safety',
      tagline: 'Why 250ms can mean life or death',
      description: 'At 60 mph, a car travels 88 feet per second. A 250ms reaction time means 22 feet of travel before braking even begins.',
      connection: 'The ruler drop test demonstrates exactly the delay that makes distracted driving deadly. Every millisecond of reaction time equals real distance.',
      howItWorks: 'Modern cars use radar, cameras, and AI to detect obstacles faster than humans. Automatic Emergency Braking (AEB) can react in ~300ms total—faster than any human.',
      stats: [
        { value: '22ft', label: 'Travel during reaction (60mph)' },
        { value: '300ms', label: 'AEB system response' },
        { value: '40%', label: 'Rear-end crash reduction' }
      ],
      examples: ['Automatic Emergency Braking', 'Forward Collision Warning', 'Pedestrian detection', 'Lane departure systems'],
      companies: ['Mobileye', 'Tesla Autopilot', 'Waymo', 'Bosch', 'Continental'],
      futureImpact: 'Full self-driving systems will eliminate human reaction time entirely, with vehicle-to-vehicle communication enabling coordinated responses in under 10ms.',
      color: '#10B981'
    },
    {
      icon: '⚕️',
      title: 'Medical Diagnostics',
      short: 'Medicine',
      tagline: 'Reaction time as a health indicator',
      description: 'Neurologists use reaction time tests to assess brain function, detect cognitive decline, and monitor conditions like Parkinson\'s disease.',
      connection: 'The simple ruler drop test is actually a clinical tool! Changes in reaction time can indicate neurological problems before other symptoms appear.',
      howItWorks: 'Computerized tests measure reaction time to visual, auditory, and tactile stimuli. Patterns reveal which neural pathways may be affected by disease or injury.',
      stats: [
        { value: '50ms', label: 'Detectable change' },
        { value: '2x', label: 'Slower in dementia' },
        { value: '85%', label: 'Diagnostic accuracy' }
      ],
      examples: ['Concussion assessment', 'Parkinson\'s monitoring', 'Cognitive aging tests', 'ADHD evaluation'],
      companies: ['Cogstate', 'Cambridge Cognition', 'ImPACT', 'CNS Vital Signs'],
      futureImpact: 'AI analysis of reaction time patterns may enable early detection of Alzheimer\'s disease up to 10 years before clinical symptoms appear.',
      color: '#F59E0B'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Reaction Time Matters', 'From racing to medicine')}

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
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Reaction Time:</h4>
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
                playSound('success');
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
              Reaction time physics impacts racing, gaming, safety, and medicine!
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
      scenario: 'A ruler falls 15cm before you catch it.',
      question: 'Using d = ½gt², what is your approximate reaction time?',
      options: [
        { text: '100ms', correct: false },
        { text: '175ms', correct: true },
        { text: '250ms', correct: false },
        { text: '350ms', correct: false }
      ],
      explanation: 't = √(2d/g) = √(2×0.15/9.8) = √0.0306 = 0.175s = 175ms'
    },
    {
      scenario: 'An F1 driver has a 140ms reaction time at the start.',
      question: 'How far will the car travel during this time at 0 to 60mph acceleration?',
      options: [
        { text: 'Less than 1 meter (driver is ready)', correct: true },
        { text: 'About 5 meters', correct: false },
        { text: 'About 10 meters', correct: false },
        { text: 'Reaction time doesn\'t affect starting distance', correct: false }
      ],
      explanation: 'At the start, the car is stationary. The 140ms is the delay before the driver begins pressing the throttle—minimal distance is covered during this pure reaction phase.'
    },
    {
      scenario: 'A driver is texting while driving at 60 mph.',
      question: 'If texting adds 400ms to reaction time, how much extra distance is traveled before braking?',
      options: [
        { text: 'About 10 feet', correct: false },
        { text: 'About 20 feet', correct: false },
        { text: 'About 35 feet', correct: true },
        { text: 'About 60 feet', correct: false }
      ],
      explanation: '60 mph = 88 ft/s. In 400ms (0.4s), distance = 88 × 0.4 = 35.2 feet. That\'s nearly 3 car lengths of extra travel!'
    },
    {
      scenario: 'A baseball is thrown at 90 mph from 60 feet away.',
      question: 'How much time does the batter have to react?',
      options: [
        { text: 'About 200ms', correct: false },
        { text: 'About 400ms', correct: true },
        { text: 'About 600ms', correct: false },
        { text: 'About 1 second', correct: false }
      ],
      explanation: '90 mph = 132 ft/s. Time = 60ft / 132ft/s = 0.45s = ~450ms. Subtracting swing time (~150ms), batters have only ~300ms to decide!'
    },
    {
      scenario: 'A goalkeeper in soccer needs to react to a penalty kick.',
      question: 'If the ball travels 12 meters in 0.3 seconds, and human reaction time is 200ms, can they react in time?',
      options: [
        { text: 'Yes, easily', correct: false },
        { text: 'Barely, if they guess the direction', correct: true },
        { text: 'No, impossible to react', correct: false },
        { text: 'Only if they start moving before the kick', correct: false }
      ],
      explanation: 'With only 300ms flight time and 200ms reaction time, goalkeepers have just 100ms to move—not enough to cover the goal. They must anticipate/guess!'
    },
    {
      scenario: 'An elderly person\'s reaction time has increased from 250ms to 400ms.',
      question: 'In terms of the ruler drop test, how much further would the ruler fall?',
      options: [
        { text: 'About 2 cm further', correct: false },
        { text: 'About 5 cm further', correct: false },
        { text: 'About 10 cm further', correct: false },
        { text: 'About 48 cm further (nearly double)', correct: true }
      ],
      explanation: 'd = ½gt². For 250ms: d = ½(9.8)(0.25)² = 31cm. For 400ms: d = ½(9.8)(0.4)² = 78cm. Difference: 47cm. Distance increases with time SQUARED!'
    },
    {
      scenario: 'A sprinter in the Olympics has a reaction time of 0.12 seconds.',
      question: 'Is this a legal start?',
      options: [
        { text: 'Yes, excellent reaction', correct: false },
        { text: 'No, it\'s considered a false start', correct: true },
        { text: 'Depends on the event', correct: false },
        { text: 'Only illegal if under 0.05 seconds', correct: false }
      ],
      explanation: 'The IAAF rules state that any reaction time under 0.100 seconds is considered a false start, as humans cannot physiologically react that fast—it indicates anticipation.'
    },
    {
      scenario: 'Automatic Emergency Braking (AEB) systems can detect and brake in 300ms.',
      question: 'Compared to a human driver (250ms reaction + 200ms brake application), how much sooner does AEB start braking?',
      options: [
        { text: 'About the same time', correct: false },
        { text: '150ms sooner', correct: true },
        { text: '300ms sooner', correct: false },
        { text: 'AEB is actually slower', correct: false }
      ],
      explanation: 'Human total: 250ms + 200ms = 450ms. AEB: 300ms. Difference: 150ms. At 60 mph, this saves about 13 feet of stopping distance!'
    },
    {
      scenario: 'A video game has 16ms input lag, and the monitor has 5ms response time.',
      question: 'If a player\'s base reaction time is 180ms, what is their total response time?',
      options: [
        { text: '180ms (hardware doesn\'t add delay)', correct: false },
        { text: '196ms (adds game lag only)', correct: false },
        { text: '201ms (adds all hardware delays)', correct: true },
        { text: '360ms (hardware doubles reaction time)', correct: false }
      ],
      explanation: 'Total = Human reaction + Game lag + Monitor response = 180 + 16 + 5 = 201ms. Every millisecond of hardware lag adds directly to response time.'
    },
    {
      scenario: 'Doctors test a patient\'s reaction time and find it has increased by 100ms compared to last year.',
      question: 'This finding might indicate:',
      options: [
        { text: 'The patient had too much coffee', correct: false },
        { text: 'Possible neurological changes worth investigating', correct: true },
        { text: 'Normal day-to-day variation', correct: false },
        { text: 'The test equipment was faulty', correct: false }
      ],
      explanation: 'A 100ms change in reaction time is clinically significant and may indicate cognitive decline, medication effects, or neurological conditions. It warrants further evaluation.'
    }
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    const isCorrect = optionIndex === testQuestions[questionIndex].options.findIndex(o => o.correct);
    playSound(isCorrect ? 'success' : 'failure');
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
              {score >= 8 ? 'Excellent! Reaction time physics mastered!' :
               score >= 6 ? 'Good understanding of reaction time!' :
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
    const avgReaction = attempts.length > 0
      ? attempts.reduce((a, b) => a + b, 0) / attempts.length
      : 200;

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

        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Reaction Time Mastered!
        </h2>
        <p className="text-gray-600 mb-6">You understand the physics of human reflexes!</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">The Physics:</span>
              <p className="text-sm text-gray-700">d = ½gt² converts fall distance to reaction time</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Human Limits:</span>
              <p className="text-sm text-gray-700">Typical reaction time is 150-300ms due to neural pathway delays</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Distraction Effects:</span>
              <p className="text-sm text-gray-700">Cognitive load can add 100-200ms to reaction time</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Real Applications:</span>
              <p className="text-sm text-gray-700">Racing, gaming, driving safety, and medical diagnostics</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <p className="text-amber-800">
            <span className="font-bold">Your Average Reaction Time:</span>
            <br />
            <span className="text-2xl font-bold" style={{ color: getReactionRating(avgReaction).color }}>
              {avgReaction.toFixed(0)}ms {getReactionRating(avgReaction).emoji}
            </span>
          </p>
        </div>

        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-green-600 mb-1">
            Test Score: {testScore}/10 ({testScore * 10}%)
          </div>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound('complete');
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Reaction Time</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : PHASES.indexOf(phase) > PHASES.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400 capitalize">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          {showCoachMessage && (
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white rounded-xl p-4 mb-4 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧑‍🏫</span>
                <p className="flex-1 text-slate-200">{coachMessages[phase]}</p>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowCoachMessage(false);
                  }}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="relative">
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
    </div>
  );
};

export default ReactionTimeRenderer;
