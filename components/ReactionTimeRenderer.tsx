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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>(Array(10).fill(false));

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

  // Navigation functions
  const currentPhaseIndex = PHASES.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < PHASES.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      goToPhase(PHASES[currentPhaseIndex - 1]);
    }
  }, [canGoBack, currentPhaseIndex, goToPhase]);

  const goNext = useCallback(() => {
    if (canGoNext) {
      goToPhase(PHASES[currentPhaseIndex + 1]);
    }
  }, [canGoNext, currentPhaseIndex, goToPhase]);

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
  // PREMIUM DESIGN SYSTEM (matches WaveParticleDuality template)
  // ─────────────────────────────────────────────────────────────────────────

  const colors = {
    // Core brand
    primary: '#6366F1',       // indigo-500
    primaryDark: '#4f46e5',   // indigo-600
    accent: '#F59E0B',        // amber-500
    secondary: '#8B5CF6',     // purple-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    // Backgrounds
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    // Text
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#e2e8f0', // slate-200
    textMuted: '#cbd5e1',     // slate-300
    // Borders
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Game-specific
    neutral: '#64748B',
    ruler: '#F59E0B',
    hand: '#FBBF24',
    excellent: '#10B981',
    good: '#3B82F6',
    average: '#F59E0B',
    slow: '#EF4444'
  };

  // Typography system - responsive sizes
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    // Spacing
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px'
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
    <div style={{
      marginTop: typo.sectionGap,
      display: 'flex',
      justifyContent: 'center',
      padding: `${typo.cardPadding} 0`
    }}>
      <button
        onClick={() => { if (canProceed) onNext(); }}
        onPointerDown={(e) => { e.preventDefault(); if (canProceed) onNext(); }}
        onTouchEnd={(e) => { e.preventDefault(); if (canProceed) onNext(); }}
        disabled={!canProceed}
        style={{
          padding: isMobile ? '14px 28px' : '16px 32px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: typo.bodyLarge,
          transition: 'all 0.3s ease',
          border: 'none',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          minHeight: '48px',
          background: canProceed
            ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
            : colors.bgCardLight,
          color: canProceed ? 'white' : colors.textMuted,
          boxShadow: canProceed ? `0 4px 20px ${colors.primary}40` : 'none',
          opacity: canProceed ? 1 : 0.6
        }}
      >
        {buttonText} {canProceed && '→'}
      </button>
    </div>
  );

  const renderKeyTakeaway = (title: string, content: string) => (
    <div style={{
      padding: typo.cardPadding,
      borderRadius: '12px',
      marginBottom: typo.sectionGap,
      background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}05 100%)`,
      borderLeft: `4px solid ${colors.warning}`
    }}>
      <h4 style={{ fontWeight: 700, fontSize: typo.body, color: colors.warning, marginBottom: '4px' }}>💡 {title}</h4>
      <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>{content}</p>
    </div>
  );

  const renderSectionHeader = (step: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: typo.sectionGap, textAlign: 'center' }}>
      <p style={{
        fontSize: typo.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: colors.primary,
        marginBottom: '8px'
      }}>{step}</p>
      <h2 style={{
        fontSize: typo.heading,
        fontWeight: 800,
        color: colors.textPrimary,
        margin: 0,
        marginBottom: subtitle ? '8px' : 0
      }}>{title}</h2>
      {subtitle && <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>{subtitle}</p>}
    </div>
  );

  // Premium wrapper for consistent phase styling
  const renderPremiumWrapper = (content: React.ReactNode, bottomBar?: React.ReactNode) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 'calc(100vh - 80px)',
      background: colors.bgDark,
      overflow: 'auto'
    }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: bottomBar ? '80px' : '20px' }}>
        {content}
      </div>
      {bottomBar && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: `linear-gradient(to top, ${colors.bgDark} 80%, transparent)`,
          padding: typo.cardPadding,
          paddingTop: '24px'
        }}>
          {bottomBar}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RULER DROP VISUALIZATION - PREMIUM SVG GRAPHICS
  // ─────────────────────────────────────────────────────────────────────────

  const renderRulerDrop = (showDistraction = false) => {
    // Status text moved outside SVG for typo system
    const getStatusText = () => {
      switch (rulerState) {
        case 'ready': return 'Click to Start';
        case 'waiting': return 'Get Ready...';
        case 'dropping': return 'CATCH IT!';
        case 'caught': return 'Nice Catch!';
        case 'missed': return 'Missed!';
        default: return '';
      }
    };

    const getStatusColor = () => {
      switch (rulerState) {
        case 'ready': return colors.neutral;
        case 'waiting': return colors.accent;
        case 'dropping': return colors.danger;
        case 'caught': return colors.success;
        case 'missed': return colors.danger;
        default: return colors.neutral;
      }
    };

    return (
      <div style={{ position: 'relative' }}>
        {/* Status label - outside SVG using typo system */}
        <div style={{
          textAlign: 'center',
          marginBottom: typo.elementGap,
          padding: '8px 16px',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${getStatusColor()}dd, ${getStatusColor()}99)`,
          display: 'inline-block',
          width: '100%',
          boxShadow: `0 4px 20px ${getStatusColor()}40`
        }}>
          <span style={{
            fontSize: typo.body,
            fontWeight: 700,
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            {getStatusText()}
          </span>
        </div>

        <svg viewBox="0 0 300 300" className="w-full h-64 md:h-80" style={{ minWidth: '300px' }}>
          {/* Premium SVG Definitions */}
          <defs>
            {/* Lab background gradient */}
            <linearGradient id="reactLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Premium ruler wood gradient */}
            <linearGradient id="reactRulerWood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Ruler edge highlight */}
            <linearGradient id="reactRulerEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Hand skin gradient - realistic flesh tones */}
            <radialGradient id="reactHandGradient" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fcd9bd" />
              <stop offset="30%" stopColor="#f5c9a6" />
              <stop offset="60%" stopColor="#e8b896" />
              <stop offset="100%" stopColor="#d4a574" />
            </radialGradient>

            {/* Hand shadow gradient */}
            <linearGradient id="reactHandShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4a574" stopOpacity="0" />
              <stop offset="100%" stopColor="#8b6914" stopOpacity="0.4" />
            </linearGradient>

            {/* Catch point indicator glow */}
            <radialGradient id="reactCatchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Drop motion blur filter */}
            <filter id="reactDropBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={rulerState === 'dropping' ? '2' : '0'} />
            </filter>

            {/* Glow filter for caught state */}
            <filter id="reactCatchFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Distraction glow filter */}
            <filter id="reactDistractionGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="reactInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Grid pattern for background */}
            <pattern id="reactLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium dark lab background */}
          <rect width="300" height="300" fill="url(#reactLabBg)" rx="10" />
          <rect width="300" height="300" fill="url(#reactLabGrid)" rx="10" />
          {/* Gravity indicator - changes with slider */}
          <text x="260" y="20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">g={gravity.toFixed(1)}</text>
          <text x="260" y="35" textAnchor="middle" fill="#94a3b8" fontSize="11">m/s²</text>
          {/* X-axis label */}
          <text x="150" y="285" textAnchor="middle" fill="#94a3b8" fontSize="11">Distance (cm)</text>
          {/* Y-axis label - positioned to avoid overlap with ruler text at x=22 */}
          <text x="5" y="150" textAnchor="middle" fill="#94a3b8" fontSize="11" transform="rotate(-90,5,150)">Fall</text>

          {/* Subtle corner accents */}
          <circle cx="10" cy="10" r="30" fill="#6366f1" opacity="0.05" />
          <circle cx="290" cy="290" r="40" fill="#8b5cf6" opacity="0.05" />

          {/* Distraction overlay */}
          {showDistraction && distractionType === 'visual' && rulerState === 'dropping' && (
            <>
              <circle cx="60" cy="100" r="25" fill="#ef4444" opacity="0.7" filter="url(#reactDistractionGlow)">
                <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.3s" repeatCount="indefinite" />
                <animate attributeName="r" values="25;30;25" dur="0.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="180" r="20" fill="#a855f7" opacity="0.6" filter="url(#reactDistractionGlow)">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.25s" repeatCount="indefinite" />
                <animate attributeName="r" values="20;25;20" dur="0.35s" repeatCount="indefinite" />
              </circle>
              <circle cx="40" cy="200" r="15" fill="#f59e0b" opacity="0.5" filter="url(#reactDistractionGlow)">
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.2s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* Top hand (releasing) */}
          <g transform="translate(110, 25)">
            {/* Hand shadow */}
            <ellipse cx="2" cy="4" rx="26" ry="16" fill="#000" opacity="0.2" />
            {/* Main palm */}
            <ellipse cx="0" cy="0" rx="25" ry="15" fill="url(#reactHandGradient)" stroke="#c9a87c" strokeWidth="1" />
            {/* Finger hints */}
            <ellipse cx="-12" cy="8" rx="6" ry="4" fill="url(#reactHandGradient)" />
            <ellipse cx="-4" cy="10" rx="5" ry="4" fill="url(#reactHandGradient)" />
            <ellipse cx="4" cy="10" rx="5" ry="4" fill="url(#reactHandGradient)" />
            <ellipse cx="12" cy="8" rx="6" ry="4" fill="url(#reactHandGradient)" />
            {/* Finger creases */}
            <path d="M-15,0 Q-10,3 -5,0" stroke="#c9a87c" strokeWidth="0.5" fill="none" opacity="0.5" />
            <path d="M5,0 Q10,3 15,0" stroke="#c9a87c" strokeWidth="0.5" fill="none" opacity="0.5" />
          </g>

          {/* Ruler with premium styling */}
          <g transform={`translate(110, ${45 + rulerPosition * 8})`} filter={rulerState === 'dropping' ? 'url(#reactDropBlur)' : undefined}>
            {/* Drop motion trail effect */}
            {rulerState === 'dropping' && (
              <>
                <rect x="-15" y="-20" width="30" height="15" fill="#f59e0b" opacity="0.3" rx="2" />
                <rect x="-15" y="-35" width="30" height="12" fill="#f59e0b" opacity="0.15" rx="2" />
              </>
            )}

            {/* Main ruler body with wood texture */}
            <rect x="-15" y="0" width="30" height="180" fill="url(#reactRulerWood)" rx="3" />

            {/* Ruler border/edge */}
            <rect x="-15" y="0" width="30" height="180" fill="none" stroke="url(#reactRulerEdge)" strokeWidth="2" rx="3" />

            {/* Inner highlight */}
            <rect x="-13" y="2" width="26" height="176" fill="none" stroke="#fcd34d" strokeWidth="0.5" rx="2" opacity="0.3" />

            {/* Ruler measurement marks - enhanced */}
            {Array.from({ length: Math.floor(rulerLength / 5) + 1 }, (_, i) => i * 5).map(cm => (
              <g key={cm}>
                {/* Major tick mark */}
                <line x1="-15" y1={cm * 6} x2="-6" y2={cm * 6} stroke="#78350f" strokeWidth="1.5" />
                <line x1="15" y1={cm * 6} x2="6" y2={cm * 6} stroke="#78350f" strokeWidth="1.5" />
                {/* Number label with background */}
                <rect x="-7" y={cm * 6 - 6} width="14" height="12" fill="#fef3c7" rx="2" opacity="0.8" />
                <text x="22" y={cm * 6 + 4} textAnchor="start" fill="#78350f" fontSize="11" fontWeight="bold">{cm}cm</text>
              </g>
            ))}

            {/* Minor tick marks */}
            {Array.from({ length: Math.floor(rulerLength) + 1 }, (_, i) => i).filter(cm => cm % 5 !== 0).map(cm => (
              <g key={`minor-${cm}`}>
                <line x1="-15" y1={cm * 6} x2="-10" y2={cm * 6} stroke="#92400e" strokeWidth="0.5" />
                <line x1="15" y1={cm * 6} x2="10" y2={cm * 6} stroke="#92400e" strokeWidth="0.5" />
              </g>
            ))}

            {/* Catch point indicator when caught */}
            {rulerState === 'caught' && catchDistance !== null && (
              <g transform={`translate(0, ${Math.min(catchDistance * 6, 175)})`}>
                <circle cx="0" cy="0" r="12" fill="url(#reactCatchGlow)" filter="url(#reactCatchFilter)">
                  <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                </circle>
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#10b981" strokeWidth="2" strokeDasharray="4,2">
                  <animate attributeName="stroke-opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                </line>
              </g>
            )}
          </g>

          {/* Bottom catch hand */}
          <g transform="translate(110, 260)" filter={rulerState === 'caught' ? 'url(#reactCatchFilter)' : undefined}>
            {/* Hand shadow */}
            <ellipse cx="3" cy="5" rx="32" ry="20" fill="#000" opacity="0.2" />
            {/* Main palm - slightly cupped for catching */}
            <ellipse cx="0" cy="0" rx="30" ry="18" fill="url(#reactHandGradient)" stroke="#c9a87c" strokeWidth="1.5" />
            {/* Finger shapes */}
            <ellipse cx="-18" cy="-10" rx="8" ry="5" fill="url(#reactHandGradient)" />
            <ellipse cx="-8" cy="-12" rx="7" ry="5" fill="url(#reactHandGradient)" />
            <ellipse cx="2" cy="-13" rx="7" ry="5" fill="url(#reactHandGradient)" />
            <ellipse cx="12" cy="-12" rx="7" ry="5" fill="url(#reactHandGradient)" />
            <ellipse cx="20" cy="-8" rx="6" ry="4" fill="url(#reactHandGradient)" />
            {/* Palm lines */}
            <path d="M-15,5 Q0,10 15,5" stroke="#c9a87c" strokeWidth="0.5" fill="none" opacity="0.4" />
            <path d="M-10,-2 Q-5,2 5,-2" stroke="#c9a87c" strokeWidth="0.5" fill="none" opacity="0.3" />
            {/* Caught indicator glow */}
            {rulerState === 'caught' && (
              <circle cx="0" cy="0" r="35" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.5">
                <animate attributeName="r" values="30;40;30" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
          </g>

          {/* Math distraction overlay */}
          {showDistraction && distractionType === 'math' && (rulerState === 'waiting' || rulerState === 'dropping') && (
            <g transform="translate(100, 150)">
              <rect x="-45" y="-25" width="90" height="50" fill="#0f172a" stroke="#6366f1" strokeWidth="2" rx="8" />
              <rect x="-43" y="-23" width="86" height="46" fill="none" stroke="#818cf8" strokeWidth="1" rx="6" opacity="0.3" />
            </g>
          )}
        </svg>

        {/* Math problem label - outside SVG using typo system */}
        {showDistraction && distractionType === 'math' && (rulerState === 'waiting' || rulerState === 'dropping') && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <span style={{
              fontSize: typo.heading,
              fontWeight: 700,
              color: colors.primary,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {mathProblem.a} + {mathProblem.b} = ?
            </span>
          </div>
        )}

        {/* Catch result label - outside SVG */}
        {rulerState === 'caught' && (
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 700,
              color: colors.success,
              background: 'rgba(16, 185, 129, 0.2)',
              padding: '4px 12px',
              borderRadius: '12px',
              border: `1px solid ${colors.success}40`
            }}>
              CAUGHT!
            </span>
          </div>
        )}
      </div>
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
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent" style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2 }}>
        The Reaction Time Test
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10" style={{ color: '#94a3b8', fontWeight: 400 }}>
        Explore how to measure your brain's speed limit
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
              <text x="0" y="5" textAnchor="middle" fill="#1e1b4b" fontSize="11" fontWeight="bold">BRAIN</text>
            </g>

            <g transform="translate(150, 80)">
              <circle cx="0" cy="0" r="20" fill="#60a5fa" />
              <text x="0" y="5" textAnchor="middle" fill="#1e3a8a" fontSize="11">NERVES</text>
            </g>

            <g transform="translate(250, 80)">
              <ellipse cx="0" cy="0" rx="25" ry="15" fill="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">HAND</text>
            </g>

            {/* Arrows */}
            <line x1="75" y1="80" x2="125" y2="80" stroke="#818cf8" strokeWidth="3" />
            <line x1="175" y1="80" x2="220" y2="80" stroke="#818cf8" strokeWidth="3" />

            {/* Time labels */}
            <text x="100" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="11">~50ms</text>
            <text x="197" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="11">~100ms</text>

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
        onPointerDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
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
      { id: 'fast', label: 'Less than 100ms', desc: 'Lightning fast!', icon: '⚡' },
      { id: 'medium', label: '150-250ms', desc: 'Typical human range', icon: '👤' },
      { id: 'slow', label: '300-500ms', desc: 'Pretty slow', icon: '🐢' },
      { id: 'very_slow', label: 'More than 500ms', desc: 'Half a second+', icon: '🦥' }
    ];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {renderSectionHeader('Step 1 • Make Your Prediction', 'How Fast Is Human Reaction?', 'Predict before you test!')}

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginBottom: typo.sectionGap,
          background: `${colors.primary}15`,
          border: `1px solid ${colors.primary}30`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            From the moment your eyes see the ruler drop to the moment your hand squeezes to catch it—<strong style={{ color: colors.textPrimary }}>how long does that take?</strong>
          </p>
        </div>

        {/* Static ruler visualization */}
        <div style={{ marginBottom: typo.sectionGap, background: colors.bgCard, borderRadius: '12px', padding: typo.cardPadding, border: `1px solid ${colors.border}` }}>
          <svg viewBox="0 0 300 240" style={{ width: '100%', maxWidth: '400px', height: 'auto', display: 'block', margin: '0 auto' }}>
            <defs>
              <linearGradient id="predictRuler" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="predictHand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="predictGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="300" height="240" fill="#1e293b" rx="8" />

            {/* Top hand */}
            <g transform="translate(150, 40)">
              <ellipse cx="0" cy="0" rx="25" ry="15" fill="url(#predictHand)" stroke="#c9a87c" strokeWidth="1" />
              <ellipse cx="-12" cy="8" rx="6" ry="4" fill="url(#predictHand)" />
              <ellipse cx="12" cy="8" rx="6" ry="4" fill="url(#predictHand)" />
            </g>

            {/* Ruler */}
            <g transform="translate(150, 70)">
              <rect x="-12" y="0" width="24" height="100" fill="url(#predictRuler)" rx="2" />
              <rect x="-12" y="0" width="24" height="100" fill="none" stroke="#d97706" strokeWidth="1.5" rx="2" />

              {/* Ruler marks */}
              {Array.from({length: 7}, (_, i) => (
                <g key={i} transform={`translate(0, ${i * 16})`}>
                  <line x1="-12" y1="0" x2="-6" y2="0" stroke="#78350f" strokeWidth="1" />
                  <line x1="12" y1="0" x2="6" y2="0" stroke="#78350f" strokeWidth="1" />
                  <text x="20" y="4" textAnchor="start" fill="#cbd5e1" fontSize="11" fontWeight="600">{i * 5}cm</text>
                </g>
              ))}
            </g>

            {/* Bottom hand */}
            <g transform="translate(150, 195)">
              <ellipse cx="0" cy="0" rx="30" ry="18" fill="url(#predictHand)" stroke="#c9a87c" strokeWidth="1.5" />
              <ellipse cx="-18" cy="-10" rx="8" ry="5" fill="url(#predictHand)" />
              <ellipse cx="18" cy="-10" rx="8" ry="5" fill="url(#predictHand)" />
            </g>

            {/* Label */}
            <text x="150" y="25" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold" filter="url(#predictGlow)">STATIC VIEW</text>
            <text x="150" y="225" textAnchor="middle" fill="#94a3b8" fontSize="11">Ruler Drop Test</text>
          </svg>
          <p style={{ fontSize: typo.small, color: colors.textMuted, textAlign: 'center', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            This shows the ruler drop test. You'll catch the falling ruler to measure your reaction time using physics!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onClick={() => {
                setPrediction(option.id);
                playSound('click');
                emitEvent('prediction', { prediction: option.id });
              }}
              onPointerDown={() => {
                setPrediction(option.id);
                playSound('click');
                emitEvent('prediction', { prediction: option.id });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setPrediction(option.id);
                playSound('click');
                emitEvent('prediction', { prediction: option.id });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: typo.cardPadding,
                borderRadius: '12px',
                textAlign: 'left',
                background: prediction === option.id ? `${colors.primary}15` : colors.bgCard,
                border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                background: prediction === option.id ? `${colors.primary}25` : colors.bgCardLight,
                flexShrink: 0
              }}>
                {option.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: typo.body, margin: 0, color: prediction === option.id ? colors.textPrimary : colors.textSecondary }}>{option.label}</p>
                <p style={{ fontSize: typo.small, color: colors.textMuted, margin: 0 }}>{option.desc}</p>
              </div>
              {prediction === option.id && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: typo.cardPadding, borderRadius: '10px', background: `${colors.warning}10`, border: `1px solid ${colors.warning}25` }}>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: colors.warning, fontWeight: 700 }}>💡 Hint:</span> Your brain processes visual signals → makes decisions → sends signals to muscles. How fast can this chain be?
          </p>
        </div>
      </div>,
      renderBottomBar(() => goToPhase('play'), prediction !== null, 'Test Your Reaction')
    );
  };

  const renderPlay = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      {renderSectionHeader('Step 2 • Experiment', 'Ruler Drop Test', 'Catch it as fast as you can!')}

      {/* Educational Context */}
      <div className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-200">
        <p className="text-indigo-900 text-sm leading-relaxed">
          <strong style={{ color: '#4f46e5', fontWeight: 700 }}>What you're seeing:</strong> This visualization shows a falling ruler. Watch how the ruler drops and try to catch it by clicking when you see it fall. The distance it travels reveals your reaction time through the physics equation <strong style={{ color: '#6366f1', fontWeight: 600 }}>d = ½gt²</strong>.
          <br /><br />
          <strong style={{ color: '#4f46e5', fontWeight: 700 }}>Why it matters:</strong> Reaction time (the delay between seeing something and responding) is crucial in sports, driving, gaming, and medical diagnostics. This experiment uses <strong style={{ color: '#6366f1', fontWeight: 600 }}>free fall physics</strong> to precisely measure that delay—the same principle used by professional athletes and Formula 1 teams to optimize performance.
          <br /><br />
          <strong style={{ color: '#4f46e5', fontWeight: 700 }}>Cause and effect:</strong> When you change <span style={{ color: '#f59e0b', fontWeight: 600 }}>gravity</span>, the ruler falls faster or slower. Higher gravity → faster fall → same reaction time covers less distance. When you change <span style={{ color: '#3b82f6', fontWeight: 600 }}>ruler length</span>, you have more distance to work with, making it easier to catch.
        </p>
      </div>

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
                onInput={(e) => setGravity(parseFloat((e.target as HTMLInputElement).value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                style={{ width: "100%", height: "20px", accentColor: "#3b82f6", cursor: "pointer", touchAction: "pan-y", WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
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
                onInput={(e) => setRulerLength(parseInt((e.target as HTMLInputElement).value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{ width: "100%", height: "20px", accentColor: "#3b82f6", cursor: "pointer", touchAction: "pan-y", WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
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

  const renderReview = () => {
    const getPredictionLabel = (pred: string | null) => {
      const options: Record<string, string> = {
        fast: 'Less than 100ms',
        medium: '150-250ms',
        slow: '300-500ms',
        very_slow: 'More than 500ms'
      };
      return pred ? options[pred] : 'unknown';
    };

    return (
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 3 • Understand', 'The Physics of Reaction Time', 'Free fall as a stopwatch')}

      {/* Observation Callback - always visible */}
      <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
        <p className="text-amber-900 text-sm">
          {prediction ? (
            <><strong style={{ color: '#b45309', fontWeight: 700 }}>Your Prediction:</strong> You predicted reaction times would be <strong style={{ color: '#d97706', fontWeight: 600 }}>{getPredictionLabel(prediction)}</strong>. As you saw in your experiment, typical human reaction time is actually 150-300ms. Let's see how the physics reveals the truth!</>
          ) : (
            <><strong style={{ color: '#b45309', fontWeight: 700 }}>Your Observation:</strong> As you saw from the experiment, the ruler drop distance reveals reaction time through physics. What you observed: typical human reaction time is 150-300ms.</>
          )}
        </p>
      </div>

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

          <text x="150" y="105" textAnchor="middle" fill={colors.neutral} fontSize="11">
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
  };

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'same', label: 'No change', desc: "Distractions don't affect reaction time", icon: '=' },
      { id: 'slower', label: 'Slower', desc: 'Distractions make reaction time slower', icon: '🐢' },
      { id: 'faster', label: 'Faster', desc: 'Distractions make you more alert', icon: '⚡' }
    ];

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {renderSectionHeader('Step 4 • The Twist', 'What Happens When You Multitask?', 'Predict the effect of distractions')}

        <div className="bg-purple-50 rounded-xl p-4 mb-5">
          <p className="text-purple-800">
            What if you're solving a math problem while trying to catch the ruler?
            Or if there are visual distractions?
            <br /><br />
            <span className="font-semibold">How do distractions affect reaction time?</span>
          </p>
        </div>

        {/* Static visualization showing distraction effect */}
        <div style={{ marginBottom: typo.sectionGap, background: colors.bgCard, borderRadius: '12px', padding: typo.cardPadding, border: `1px solid ${colors.border}` }}>
          <svg viewBox="0 0 320 180" style={{ width: '100%', maxWidth: '400px', height: 'auto', display: 'block', margin: '0 auto' }}>
            <defs>
              <linearGradient id="twistBrain" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="320" height="180" fill="#1e293b" rx="8" />

            {/* Brain processing center */}
            <circle cx="160" cy="90" r="35" fill="url(#twistBrain)" opacity="0.9" />
            <text x="160" y="95" textAnchor="middle" fill="#1e1b4b" fontSize="11" fontWeight="bold">BRAIN</text>

            {/* Visual distraction */}
            <g transform="translate(60, 50)">
              <circle cx="0" cy="0" r="15" fill="#ef4444" opacity="0.6" />
              <text x="0" y="30" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Visual</text>
            </g>

            {/* Math problem */}
            <g transform="translate(260, 50)">
              <rect x="-18" y="-12" width="36" height="24" fill="#f59e0b" opacity="0.6" rx="4" />
              <text x="0" y="2" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">3+7?</text>
              <text x="0" y="32" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">Math</text>
            </g>

            {/* Audio distraction - larger path spanning more vertical space */}
            <g transform="translate(60, 130)">
              <path d="M-8,-20 L-8,20 L0,20 L10,30 L10,-30 L0,-20 Z M12,-15 Q25,0 12,15 M15,-22 Q35,0 15,22" fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.7" />
              <path d="M-8,-20 L-8,20 L0,20 L10,30 L10,-30 L0,-20 Z" fill="#8b5cf6" opacity="0.6" />
              <text x="0" y="45" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Audio</text>
            </g>

            {/* Motor response */}
            <g transform="translate(260, 130)">
              <ellipse cx="0" cy="0" rx="18" ry="12" fill="#10b981" opacity="0.6" />
              <text x="0" y="25" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Hand</text>
            </g>

            {/* Connection arrows with delay indicators */}
            <line x1="75" y1="50" x2="130" y2="75" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
            <line x1="245" y1="50" x2="190" y2="75" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
            <line x1="75" y1="130" x2="130" y2="105" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
            <line x1="190" y1="105" x2="242" y2="125" stroke="#10b981" strokeWidth="2" opacity="0.6" />

            <text x="160" y="25" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold">DISTRACTION EFFECT</text>
            <text x="160" y="165" textAnchor="middle" fill="#94a3b8" fontSize="11">Multiple inputs slow processing</text>
          </svg>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onPointerDown={(e) => {
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
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      {renderSectionHeader('Step 5 • Twist Experiment', 'Distraction Test', 'Catch the ruler while multitasking')}

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
              onPointerDown={(e) => {
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
            onPointerDown={(e) => {
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
            onPointerDown={(e) => {
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
            onPointerDown={(e) => {
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
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 6 • Twist Review', 'Distraction Effects', 'Why multitasking is dangerous')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 120" className="w-full h-28 mb-4">
          <rect x="0" y="0" width="300" height="120" fill="white" rx="10" />

          {/* Bar chart */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            TYPICAL REACTION TIME BY CONDITION
          </text>

          {/* Focused bar */}
          <rect x="40" y="40" width="50" height="50" fill={colors.success} rx="5" />
          <text x="65" y="100" textAnchor="middle" fill={colors.neutral} fontSize="11">Focused</text>
          <text x="65" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">200ms</text>

          {/* Visual distraction bar */}
          <rect x="120" y="35" width="50" height="55" fill={colors.accent} rx="5" />
          <text x="145" y="100" textAnchor="middle" fill={colors.neutral} fontSize="11">Visual</text>
          <text x="145" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">250ms</text>

          {/* Cognitive distraction bar */}
          <rect x="200" y="25" width="50" height="65" fill={colors.danger} rx="5" />
          <text x="225" y="100" textAnchor="middle" fill={colors.neutral} fontSize="11">Math</text>
          <text x="225" y="55" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">350ms</text>
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
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 7 • Real-World', 'Reaction Time Matters', 'From racing to medicine')}
      <p style={{ textAlign: 'center', fontSize: typo.small, color: colors.textSecondary, marginBottom: '16px', fontWeight: 600 }}>
        Application {Math.min(completedApps + 1, realWorldApps.length)} of {realWorldApps.length}
      </p>

      <div style={{ overflowY: 'auto', maxHeight: '70vh', paddingBottom: '16px' }}>
      {completedApps < realWorldApps.length ? (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ borderRadius: '16px' }}>
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
              onClick={() => {
                playSound('success');
                setCompletedApps(prev => prev + 1);
              }}
              onPointerDown={(e) => {
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
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    {
      scenario: 'A ruler falls 15cm (0.15m) before you catch it in the ruler drop test.',
      question: 'Using d = ½gt², what is your approximate reaction time?',
      options: [
        { text: '100ms (very fast, athlete-level)', correct: false },
        { text: '175ms (typical calculation result)', correct: true },
        { text: '250ms (average human reaction)', correct: false },
        { text: '350ms (slow reaction time)', correct: false }
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
        <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          {renderSectionHeader('Step 8 • Results', 'Test Complete', `You scored ${score}/10`)}

          <div style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {score >= 8 ? '🏆' : score >= 6 ? '🌟' : '📚'}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#4f46e5', marginBottom: '8px' }}>{score * 10}%</div>
            <p style={{ color: '#3730a3' }}>
              {score >= 8 ? 'Excellent! You scored ' + score + '/10 - Reaction time physics mastered!' :
               score >= 6 ? 'Good! You scored ' + score + '/10 - Good understanding of reaction time!' :
               'You scored ' + score + '/10 - Review the concepts and try again!'}
            </p>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
            {testQuestions.map((q, i) => {
              const isCorrect = testAnswers[i] !== null && q.options[testAnswers[i]!].correct;
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    textAlign: 'left',
                    background: isCorrect ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{isCorrect ? '✓' : '✗'}</span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0 }}>Q{i+1}: {q.question}</p>
                      {!isCorrect && (
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Correct answer: {q.explanation}</p>
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

    const q = testQuestions[currentQuestion];
    const isAnswered = testAnswers[currentQuestion] !== null;
    const isChecked = checkedQuestions[currentQuestion];
    const isLastQuestion = currentQuestion === testQuestions.length - 1;

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {renderSectionHeader('Step 8 • Test', 'Knowledge Check', `Question ${currentQuestion + 1} of ${testQuestions.length}`)}

        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '4px 12px', borderRadius: '12px' }}>
              Question {currentQuestion + 1} of {testQuestions.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{testAnswers.filter(a => a !== null).length} answered</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontStyle: 'italic' }}>{q.scenario}</p>
          <p style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', marginBottom: '8px', lineHeight: 1.5 }}>{q.question}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>Select the best answer. Physics formula: d = ½gt² where g = 9.8 m/s²</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, oIndex) => {
              const isSelected = testAnswers[currentQuestion] === oIndex;
              const isCorrect = opt.correct;
              const bgColor = isSelected
                ? (isCorrect ? '#dcfce7' : '#fee2e2')
                : '#f8fafc';
              const borderColor = isSelected
                ? (isCorrect ? '#22c55e' : '#ef4444')
                : '#e2e8f0';
              const textColor = isSelected
                ? (isCorrect ? '#15803d' : '#dc2626')
                : '#475569';
              return (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentQuestion, oIndex)}
                  onPointerDown={(e) => { e.preventDefault(); handleTestAnswer(currentQuestion, oIndex); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {['A', 'B', 'C', 'D'][oIndex]}) {opt.text}
                  {isSelected && <span style={{ marginLeft: '8px' }}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>}
                </button>
              );
            })}
          </div>
          {isChecked && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
              <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </div>

        {isAnswered && !isChecked && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => { const next = [...checkedQuestions]; next[currentQuestion] = true; setCheckedQuestions(next); }}
              onPointerDown={(e) => { e.preventDefault(); const next = [...checkedQuestions]; next[currentQuestion] = true; setCheckedQuestions(next); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Check Answer
            </button>
          </div>
        )}

        {isAnswered && isChecked && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {currentQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                onPointerDown={(e) => { e.preventDefault(); setCurrentQuestion(prev => prev + 1); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => setShowTestResults(true)}
                onPointerDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
                disabled={!testAnswers.every(a => a !== null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: testAnswers.every(a => a !== null) ? 'linear-gradient(135deg, #10b981, #059669)' : '#94a3b8',
                  color: 'white',
                  fontWeight: 600,
                  border: 'none',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontSize: '15px'
                }}
              >
                Submit Test →
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
          {testQuestions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              onPointerDown={(e) => { e.preventDefault(); setCurrentQuestion(i); }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: `2px solid ${i === currentQuestion ? '#6366f1' : '#e2e8f0'}`,
                background: testAnswers[i] !== null ? '#dcfce7' : (i === currentQuestion ? '#eef2ff' : 'white'),
                fontSize: '11px',
                fontWeight: 600,
                color: i === currentQuestion ? '#6366f1' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
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
          onPointerDown={(e) => {
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
    <div style={{
      minHeight: '100dvh',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0f1a',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" style={{ filter: 'blur(80px)' }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" style={{ filter: 'blur(80px)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" style={{ filter: 'blur(100px)' }} />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto" style={{ maxWidth: '1024px', padding: '12px 24px', margin: '0 auto' }}>
          <span className="text-sm font-semibold text-white/80 tracking-wide" style={{ fontSize: '14px', fontWeight: 600 }}>Reaction Time</span>
          <div className="flex items-center gap-1.5" style={{ display: 'flex', gap: '6px' }}>
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={p}
                aria-label={p}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: phase === p
                    ? '#818cf8'
                    : PHASES.indexOf(phase) > PHASES.indexOf(p)
                      ? '#10b981'
                      : 'rgba(148, 163, 184, 0.5)',
                  border: 'none',
                  padding: 0,
                  flexShrink: 0
                }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400 capitalize" style={{ fontSize: '14px' }}>{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '72px',
        paddingBottom: '90px',
        position: 'relative'
      }}>
        <div className="max-w-2xl mx-auto px-4" style={{ maxWidth: '672px', padding: '0 16px', margin: '0 auto' }}>
          {showCoachMessage && (
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white rounded-xl p-4 mb-4 backdrop-blur-xl" style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div className="flex items-start gap-3" style={{ display: 'flex', gap: '12px' }}>
                <span className="text-2xl">🧑‍🏫</span>
                <p className="flex-1 text-slate-200" style={{ flex: 1, lineHeight: 1.6 }}>{coachMessages[phase]}</p>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setShowCoachMessage(false);
                  }}
                  className="text-white/60 hover:text-white"
                  style={{ cursor: 'pointer' }}
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

      {/* Bottom Navigation Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            minHeight: '44px',
            padding: '10px 16px',
            background: canGoBack ? 'rgba(71, 85, 105, 0.5)' : 'transparent',
            border: `1px solid ${canGoBack ? '#334155' : 'transparent'}`,
            borderRadius: '8px',
            color: canGoBack ? '#e2e8f0' : 'transparent',
            fontSize: '14px',
            fontWeight: 600,
            cursor: canGoBack ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back
        </button>

        {/* Navigation dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {PHASES.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: phase === p ? '24px' : '8px',
                minHeight: '44px',
                padding: '18px 0',
                borderRadius: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{
                display: 'block',
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: PHASES.indexOf(phase) >= i ? '#6366f1' : '#475569',
                transition: 'all 0.3s ease'
              }} />
            </button>
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={!canGoNext || (phase === 'predict' && !prediction) || (phase === 'twist_predict' && !twistPrediction) || (phase === 'test' && !showTestResults)}
          style={{
            minHeight: '44px',
            padding: '10px 16px',
            background: (canGoNext && !((phase === 'predict' && !prediction) || (phase === 'twist_predict' && !twistPrediction) || (phase === 'test' && !showTestResults))) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '8px',
            color: (canGoNext && !((phase === 'predict' && !prediction) || (phase === 'twist_predict' && !twistPrediction) || (phase === 'test' && !showTestResults))) ? 'white' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 600,
            cursor: (canGoNext && !((phase === 'predict' && !prediction) || (phase === 'twist_predict' && !twistPrediction) || (phase === 'test' && !showTestResults))) ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ReactionTimeRenderer;
