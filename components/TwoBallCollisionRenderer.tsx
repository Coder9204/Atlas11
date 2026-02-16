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

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  const soundConfig = {
    click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
    success: { frequency: 600, type: 'sine' as OscillatorType, duration: 0.15 },
    failure: { frequency: 200, type: 'square' as OscillatorType, duration: 0.2 },
    transition: { frequency: 500, type: 'sine' as OscillatorType, duration: 0.1 },
    complete: { frequency: 800, type: 'sine' as OscillatorType, duration: 0.3 }
  };
  const { frequency, type, duration } = soundConfig[soundType];
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
  const lastClickRef = useRef(0);

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

  // Interactive controls
  const [initialVelocity, setInitialVelocity] = useState(4); // m/s
  const [elasticityCoeff, setElasticityCoeff] = useState(1.0); // 0-1 (1 = perfectly elastic)
  const [mass1, setMass1] = useState(1); // kg
  const [mass2, setMass2] = useState(1); // kg
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);
  const [momentumBefore, setMomentumBefore] = useState(0);
  const [momentumAfter, setMomentumAfter] = useState(0);
  const [energyBefore, setEnergyBefore] = useState(0);
  const [energyAfter, setEnergyAfter] = useState(0);

  // Twist: mass ratio experiments
  const [massRatio, setMassRatio] = useState<'equal' | 'heavy_light' | 'light_heavy'>('equal');
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionConfirmed, setQuestionConfirmed] = useState(false);

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
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
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
  // COLLISION PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  const runCollision = (type: 'elastic' | 'inelastic', masses: 'equal' | 'heavy_light' | 'light_heavy' = 'equal') => {
    if (isAnimating) return;

    // Reset positions
    setBall1Pos(50);
    setBall2Pos(250);
    setAnimationPhase('before');
    setIsAnimating(true);

    // Mass values - use sliders if in play phase, preset if in twist phase
    let m1: number, m2: number;
    if (phase === 'play') {
      m1 = mass1;
      m2 = mass2;
    } else {
      m1 = 1;
      m2 = 1;
      if (masses === 'heavy_light') { m1 = 3; m2 = 1; }
      if (masses === 'light_heavy') { m1 = 1; m2 = 3; }
    }

    // Initial velocities
    const v1i = phase === 'play' ? initialVelocity : 4; // Ball 1 moving right
    const v2i = 0; // Ball 2 stationary

    // Calculate initial momentum and energy
    const p_before = m1 * v1i + m2 * v2i;
    const ke_before = 0.5 * m1 * v1i * v1i + 0.5 * m2 * v2i * v2i;
    setMomentumBefore(p_before);
    setEnergyBefore(ke_before);

    // Calculate final velocities
    let v1f: number, v2f: number;

    // Use elasticity coefficient for variable collision types
    const e = phase === 'play' && type === 'elastic' ? elasticityCoeff : (type === 'elastic' ? 1 : 0);

    if (e === 0) {
      // Perfectly inelastic (they stick)
      v1f = v2f = (m1 * v1i + m2 * v2i) / (m1 + m2);
    } else {
      // General collision with coefficient of restitution
      // v1f = (m1*v1i + m2*v2i + m2*e*(v2i-v1i)) / (m1+m2)
      // v2f = (m1*v1i + m2*v2i + m1*e*(v1i-v2i)) / (m1+m2)
      v1f = ((m1 - e * m2) * v1i + (1 + e) * m2 * v2i) / (m1 + m2);
      v2f = ((m2 - e * m1) * v2i + (1 + e) * m1 * v1i) / (m1 + m2);
    }

    // Calculate final momentum and energy
    const p_after = m1 * v1f + m2 * v2f;
    const ke_after = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
    setMomentumAfter(p_after);
    setEnergyAfter(ke_after);

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
        playSound(type === 'elastic' ? 'success' : 'click');

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
    textSecondary: '#cbd5e1', // slate-300 (brighter for better contrast)
    textMuted: '#94a3b8',     // slate-400 (was slate-500)
    // Borders
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Game-specific
    neutral: '#64748B',
    ball1: '#3B82F6',
    ball2: '#EF4444',
    elastic: '#10B981',
    inelastic: '#F59E0B',
    track: '#E2E8F0',
    collision: '#FCD34D'
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
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
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
  // COLLISION VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderCollisionVisualization = (type: 'elastic' | 'inelastic', masses: 'equal' | 'heavy_light' | 'light_heavy' = 'equal') => {
    // Calculate radii based on mass (either from sliders or presets)
    let m1Radius: number, m2Radius: number;
    let displayMass1: string, displayMass2: string;

    if (phase === 'play') {
      // Use slider values
      m1Radius = 12 + mass1 * 4;
      m2Radius = 12 + mass2 * 4;
      displayMass1 = `${mass1}kg`;
      displayMass2 = `${mass2}kg`;
    } else {
      // Use presets for twist phase
      m1Radius = masses === 'heavy_light' ? 30 : masses === 'light_heavy' ? 18 : 24;
      m2Radius = masses === 'light_heavy' ? 30 : masses === 'heavy_light' ? 18 : 24;
      displayMass1 = masses === 'heavy_light' ? '3m' : masses === 'light_heavy' ? 'm' : 'm';
      displayMass2 = masses === 'light_heavy' ? '3m' : masses === 'heavy_light' ? 'm' : 'm';
    }

    return (
      <div>
        <svg viewBox="0 0 400 200" className="w-full h-48 md:h-56">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="tbcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ball 1 - Blue 3D spherical gradient */}
            <radialGradient id="tbcBall1Grad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Ball 2 Elastic - Red 3D spherical gradient */}
            <radialGradient id="tbcBall2ElasticGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* Ball 2 Inelastic - Amber/Orange 3D spherical gradient */}
            <radialGradient id="tbcBall2InelasticGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Track gradient for metallic effect */}
            <linearGradient id="tbcTrackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Velocity arrow gradient - Blue */}
            <linearGradient id="tbcArrow1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Velocity arrow gradient - Red */}
            <linearGradient id="tbcArrow2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Collision impact glow gradient */}
            <radialGradient id="tbcImpactGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Motion trail gradient - Ball 1 */}
            <linearGradient id="tbcTrail1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>

            {/* Motion trail gradient - Ball 2 */}
            <linearGradient id="tbcTrail2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Ball glow filter */}
            <filter id="tbcBallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Impact glow filter */}
            <filter id="tbcImpactBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" />
            </filter>

            {/* Ball shadow filter */}
            <filter id="tbcBallShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>

            {/* Highlight filter for specular reflection */}
            <filter id="tbcSpecular" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect x="0" y="0" width="400" height="200" fill="url(#tbcLabBg)" rx="10" />

          {/* Subtle grid pattern */}
          <pattern id="tbcGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect x="0" y="0" width="400" height="200" fill="url(#tbcGrid)" rx="10" />

          {/* Axis labels for educational clarity */}
          <text x="200" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Position</text>
          <text x="12" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" transform="rotate(-90, 12, 100)">Velocity</text>

          {/* Tick marks along the track for visual reference */}
          <line x1="60" y1="78" x2="60" y2="90" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
          <line x1="120" y1="78" x2="120" y2="90" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
          <line x1="200" y1="78" x2="200" y2="90" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
          <line x1="280" y1="78" x2="280" y2="90" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
          <line x1="340" y1="78" x2="340" y2="90" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />

          {/* Track with metallic gradient and depth */}
          <rect x="20" y="78" width="360" height="12" fill="url(#tbcTrackGrad)" rx="6" />
          <rect x="20" y="78" width="360" height="2" fill="#94a3b8" fillOpacity="0.3" rx="1" />
          <rect x="20" y="88" width="360" height="2" fill="#1e293b" fillOpacity="0.5" rx="1" />

          {/* Motion trails during animation */}
          {isAnimating && animationPhase === 'before' && (
            <ellipse
              cx={ball1Pos - 15}
              cy="72"
              rx="25"
              ry={m1Radius * 0.6}
              fill="url(#tbcTrail1Grad)"
            />
          )}
          {isAnimating && animationPhase === 'after' && ball2Vel > 0 && (
            <ellipse
              cx={ball2Pos - 20}
              cy="72"
              rx="30"
              ry={m2Radius * 0.6}
              fill="url(#tbcTrail2Grad)"
            />
          )}

          {/* Velocity arrows (before collision) with gradient */}
          {animationPhase === 'before' && (
            <g>
              <line
                x1={ball1Pos + m1Radius + 5}
                y1="45"
                x2={ball1Pos + m1Radius + 35}
                y2="45"
                stroke="url(#tbcArrow1Grad)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <polygon
                points={`${ball1Pos + m1Radius + 40},45 ${ball1Pos + m1Radius + 30},40 ${ball1Pos + m1Radius + 30},50`}
                fill="#60a5fa"
              />
            </g>
          )}

          {/* Collision impact effect with premium glow */}
          {animationPhase === 'collision' && (
            <g>
              {/* Outer glow ring */}
              <circle cx="170" cy="72" r="50" fill="url(#tbcImpactGlow)" filter="url(#tbcImpactBlur)">
                <animate attributeName="r" values="30;60;30" dur="0.3s" />
                <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" />
              </circle>
              {/* Inner bright flash */}
              <circle cx="170" cy="72" r="25" fill="#fef9c3" opacity="0.9">
                <animate attributeName="r" values="20;35;20" dur="0.3s" />
                <animate attributeName="opacity" values="1;0.4;1" dur="0.3s" />
              </circle>
              {/* Spark particles */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <circle
                  key={i}
                  cx={170 + Math.cos(angle * Math.PI / 180) * 35}
                  cy={72 + Math.sin(angle * Math.PI / 180) * 35}
                  r="3"
                  fill="#fcd34d"
                >
                  <animate
                    attributeName="cx"
                    values={`${170 + Math.cos(angle * Math.PI / 180) * 25};${170 + Math.cos(angle * Math.PI / 180) * 50}`}
                    dur="0.3s"
                  />
                  <animate
                    attributeName="cy"
                    values={`${72 + Math.sin(angle * Math.PI / 180) * 25};${72 + Math.sin(angle * Math.PI / 180) * 50}`}
                    dur="0.3s"
                  />
                  <animate attributeName="opacity" values="1;0" dur="0.3s" />
                </circle>
              ))}
            </g>
          )}

          {/* Velocity arrows (after collision) with gradients */}
          {animationPhase === 'after' && (
            <g>
              {ball1Vel !== 0 && (
                <>
                  <line
                    x1={ball1Vel > 0 ? ball1Pos + m1Radius + 5 : ball1Pos - m1Radius - 5}
                    y1="45"
                    x2={ball1Vel > 0 ? ball1Pos + m1Radius + 35 : ball1Pos - m1Radius - 35}
                    y2="45"
                    stroke="url(#tbcArrow1Grad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={ball1Vel > 0 ?
                      `${ball1Pos + m1Radius + 40},45 ${ball1Pos + m1Radius + 30},40 ${ball1Pos + m1Radius + 30},50` :
                      `${ball1Pos - m1Radius - 40},45 ${ball1Pos - m1Radius - 30},40 ${ball1Pos - m1Radius - 30},50`
                    }
                    fill="#60a5fa"
                  />
                </>
              )}
              {ball2Vel > 0 && (
                <>
                  <line
                    x1={ball2Pos + m2Radius + 5}
                    y1="45"
                    x2={ball2Pos + m2Radius + 35}
                    y2="45"
                    stroke="url(#tbcArrow2Grad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${ball2Pos + m2Radius + 40},45 ${ball2Pos + m2Radius + 30},40 ${ball2Pos + m2Radius + 30},50`}
                    fill="#f87171"
                  />
                </>
              )}
            </g>
          )}

          {/* Ball 1 with 3D gradient, shadow, and specular highlight */}
          <g filter="url(#tbcBallShadow)">
            <circle
              cx={ball1Pos}
              cy="72"
              r={m1Radius}
              fill="url(#tbcBall1Grad)"
            />
            {/* Specular highlight */}
            <ellipse
              cx={ball1Pos - m1Radius * 0.3}
              cy={72 - m1Radius * 0.3}
              rx={m1Radius * 0.25}
              ry={m1Radius * 0.15}
              fill="white"
              opacity="0.5"
            />
          </g>

          {/* Ball 2 with 3D gradient, shadow, and specular highlight */}
          <g filter="url(#tbcBallShadow)">
            <circle
              cx={ball2Pos}
              cy="72"
              r={m2Radius}
              fill={type === 'elastic' ? 'url(#tbcBall2ElasticGrad)' : 'url(#tbcBall2InelasticGrad)'}
            />
            {/* Specular highlight */}
            <ellipse
              cx={ball2Pos - m2Radius * 0.3}
              cy={72 - m2Radius * 0.3}
              rx={m2Radius * 0.25}
              ry={m2Radius * 0.15}
              fill="white"
              opacity="0.5"
            />
          </g>

          {/* Educational labels directly on SVG */}
          <text x={ball1Pos} y="22" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">Ball 1</text>
          <text x={ball1Pos} y="105" textAnchor="middle" fill="#93c5fd" fontSize="9">{displayMass1}</text>
          <text x={ball2Pos} y="22" textAnchor="middle" fill={type === 'elastic' ? '#f87171' : '#fbbf24'} fontSize="10" fontWeight="bold">Ball 2</text>
          <text x={ball2Pos} y="105" textAnchor="middle" fill={type === 'elastic' ? '#fca5a5' : '#fcd34d'} fontSize="9">{displayMass2}</text>
          <text x="200" y="116" textAnchor="middle" fill="#94a3b8" fontSize="8">Collision Track</text>
        </svg>

        {/* Labels outside SVG using typo system for responsive typography */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: typo.elementGap,
          padding: `0 ${typo.cardPadding}`
        }}>
          {/* Ball 1 label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }} />
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: colors.textPrimary
            }}>Ball 1: {displayMass1}</span>
          </div>

          {/* Collision type label */}
          <div style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            background: type === 'elastic'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: `1px solid ${type === 'elastic' ? colors.elastic : colors.inelastic}40`
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 700,
              color: type === 'elastic' ? colors.elastic : colors.inelastic
            }}>
              {type === 'elastic' ? 'ELASTIC' : 'INELASTIC'}
            </span>
          </div>

          {/* Ball 2 label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: colors.textPrimary
            }}>Ball 2: {displayMass2}</span>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: type === 'elastic'
                ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              boxShadow: type === 'elastic'
                ? '0 2px 4px rgba(239, 68, 68, 0.3)'
                : '0 2px 4px rgba(245, 158, 11, 0.3)'
            }} />
          </div>
        </div>
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
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Collision Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do some balls bounce and others stick together?
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
            <rect x="0" y="0" width="300" height="180" fill="transparent" rx="10" />

            {/* Elastic scenario (top) */}
            <g transform="translate(0, 20)">
              <text x="150" y="10" textAnchor="middle" fill={colors.elastic} fontSize="11" fontWeight="bold">SUPER BALL</text>
              <rect x="20" y="45" width="260" height="8" fill="#334155" rx="4" />
              <circle cx="80" cy="40" r="18" fill={colors.ball1} />
              <text x="80" y="45" textAnchor="middle" fill="white" fontSize="10">→</text>
              <circle cx="180" cy="40" r="18" fill={colors.ball2} />
              <text x="250" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">After:</text>
              <circle cx="50" cy="40" r="10" fill={colors.ball1} opacity="0.5" />
              <text x="50" y="43" textAnchor="middle" fill="white" fontSize="8">←</text>
              <circle cx="250" cy="40" r="10" fill={colors.ball2} opacity="0.5" />
              <text x="250" y="43" textAnchor="middle" fill="white" fontSize="8">→</text>
            </g>

            {/* Inelastic scenario (bottom) */}
            <g transform="translate(0, 100)">
              <text x="150" y="10" textAnchor="middle" fill={colors.inelastic} fontSize="11" fontWeight="bold">CLAY BALL</text>
              <rect x="20" y="45" width="260" height="8" fill="#334155" rx="4" />
              <circle cx="80" cy="40" r="18" fill={colors.ball1} />
              <text x="80" y="45" textAnchor="middle" fill="white" fontSize="10">→</text>
              <circle cx="180" cy="40" r="18" fill={colors.inelastic} />
              <text x="250" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">After:</text>
              <ellipse cx="200" cy="40" rx="25" ry="15" fill={colors.inelastic} opacity="0.7" />
              <text x="200" y="45" textAnchor="middle" fill="white" fontSize="8">→ (stuck)</text>
            </g>
          </svg>

          <div className="mt-4 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A super ball bounces back. Clay sticks together.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Both conserve momentum, but something is different...
            </p>
            <div className="pt-2">
              <p className="text-base text-indigo-400 font-semibold">
                Where does the missing energy go?
              </p>
            </div>
          </div>
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
          <span className="text-indigo-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'both_conserve', label: 'Both always conserved', desc: 'Momentum and energy are always conserved', icon: '⚖️' },
      { id: 'momentum_only', label: 'Momentum always', desc: 'Energy only conserved in elastic collisions', icon: '📊' },
      { id: 'energy_only', label: 'Energy always', desc: 'Momentum only conserved in elastic collisions', icon: '⚡' },
      { id: 'neither', label: 'Neither truly conserved', desc: 'Real collisions always lose both', icon: '❓' }
    ];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {renderSectionHeader('Step 1 • Make Your Prediction', 'What Gets Conserved?', 'Predict before you test!')}

        {/* Prediction Diagram SVG */}
        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginBottom: typo.sectionGap,
          background: colors.bgCard,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 400 120" style={{ width: '100%', height: isMobile ? '90px' : '110px' }}>
            {/* Background */}
            <rect x="0" y="0" width="400" height="120" fill={colors.bgDark} rx="8" />

            {/* Track */}
            <rect x="20" y="75" width="360" height="8" fill={colors.bgCardLight} rx="4" />

            {/* Ball 1 - Moving */}
            <circle cx="80" cy="60" r="22" fill={colors.ball1} />
            <text x="80" y="65" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">→</text>
            <text x="80" y="100" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Ball 1 (moving)</text>

            {/* Ball 2 - Stationary */}
            <circle cx="200" cy="60" r="22" fill={colors.ball2} />
            <text x="200" y="100" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Ball 2 (still)</text>

            {/* Question mark */}
            <text x="300" y="70" textAnchor="middle" fill={colors.warning} fontSize="36" fontWeight="bold">?</text>
            <text x="300" y="100" textAnchor="middle" fill={colors.warning} fontSize="10">What happens?</text>

            {/* Velocity arrow */}
            <line x1="110" y1="60" x2="150" y2="60" stroke={colors.primary} strokeWidth="3" markerEnd="url(#arrow)" />
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill={colors.primary} />
              </marker>
            </defs>
          </svg>
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginBottom: typo.sectionGap,
          background: `${colors.primary}15`,
          border: `1px solid ${colors.primary}30`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            When two balls collide, <strong style={{ color: colors.textPrimary }}>momentum</strong> and <strong style={{ color: colors.textPrimary }}>kinetic energy</strong> might be conserved. But which ones?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          {predictionOptions.map(option => (
            <button
              key={option.id}
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
            <span style={{ color: colors.warning, fontWeight: 700 }}>💡 Think about:</span> Super-balls bounce, clay sticks. Does energy behave the same in both?
          </p>
        </div>
      </div>,
      renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiments')
    );
  };

  const renderPlay = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      {renderSectionHeader('Step 2 • Experiment', 'Collision Lab', 'Compare elastic vs inelastic collisions')}

      {/* Interactive Controls Panel */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white text-sm">⚙️ Physics Controls</h4>
          <button
            onClick={() => setShowPhysicsPanel(!showPhysicsPanel)}
            className="text-slate-400 hover:text-white text-xs"
            style={{ zIndex: 10 }}
          >
            {showPhysicsPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPhysicsPanel && (
          <div className="space-y-4">
            {/* Mass 1 Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Ball 1 Mass (Blue)</span>
                <span className="text-blue-400 font-mono">{mass1} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={mass1}
                onChange={(e) => setMass1(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'none' }}
                disabled={isAnimating}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0.5 kg (low)</span>
                <span>5 kg (max)</span>
              </div>
            </div>

            {/* Mass 2 Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Ball 2 Mass (Red)</span>
                <span className="text-red-400 font-mono">{mass2} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={mass2}
                onChange={(e) => setMass2(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                style={{ width: '100%', height: '20px', accentColor: '#ef4444', touchAction: 'none' }}
                disabled={isAnimating}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0.5 kg (low)</span>
                <span>5 kg (max)</span>
              </div>
            </div>

            {/* Initial Velocity Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Ball 1 Initial Velocity</span>
                <span className="text-green-400 font-mono">{initialVelocity} m/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={initialVelocity}
                onChange={(e) => setInitialVelocity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                style={{ width: '100%', height: '20px', accentColor: '#22c55e', touchAction: 'none' }}
                disabled={isAnimating}
              />
            </div>

            {/* Elasticity Coefficient (only for elastic type) */}
            {collisionType === 'elastic' && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">Elasticity Coefficient (e)</span>
                  <span className="text-purple-400 font-mono">{elasticityCoeff.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={elasticityCoeff}
                  onChange={(e) => setElasticityCoeff(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{ width: '100%', height: '20px', accentColor: '#a855f7', touchAction: 'none' }}
                  disabled={isAnimating}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Inelastic (0)</span>
                  <span>Perfectly Elastic (1)</span>
                </div>
              </div>
            )}

            {/* Conservation Display */}
            {animationPhase === 'after' && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Momentum (p = mv)</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Before:</span>
                    <span className="text-emerald-400 font-mono">{momentumBefore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">After:</span>
                    <span className="text-emerald-400 font-mono">{momentumAfter.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-1 text-center">✓ Conserved!</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Energy (KE = ½mv²)</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Before:</span>
                    <span className="text-amber-400 font-mono">{energyBefore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">After:</span>
                    <span className="text-amber-400 font-mono">{energyAfter.toFixed(2)}</span>
                  </div>
                  <div className={`text-xs mt-1 text-center ${Math.abs(energyBefore - energyAfter) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {Math.abs(energyBefore - energyAfter) < 0.01 ? '✓ Conserved!' : `Lost: ${((1 - energyAfter / energyBefore) * 100).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderCollisionVisualization(collisionType)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Collision Type:</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
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
            style={{ zIndex: 10 }}
          >
            <span className="text-2xl">🎱</span>
            <p className="font-medium text-sm">Elastic (Bouncy)</p>
            <p className="text-xs text-gray-500">Like billiard balls</p>
          </button>
          <button
            onClick={() => {
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
            style={{ zIndex: 10 }}
          >
            <span className="text-2xl">🧱</span>
            <p className="font-medium text-sm">Inelastic (Sticky)</p>
            <p className="text-xs text-gray-500">Like clay balls</p>
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <button
          onClick={() => {
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
          style={{ zIndex: 10 }}
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

      {/* Educational explanation */}
      <div className="bg-slate-800/30 rounded-xl p-4 mb-4 border border-slate-700/50">
        <h4 className="font-semibold text-white text-sm mb-2">Understanding Collisions</h4>
        <p className="text-slate-300 text-sm leading-relaxed">
          <strong>When you increase the mass</strong>, the ball carries more momentum (p = mv).
          This affects how velocity is transferred during collision. Higher mass means more impact force.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-2">
          <strong>Momentum is calculated as:</strong> p = mass x velocity. This formula describes how
          the motion of an object relates to both its mass and speed.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-2">
          <strong>Why this matters:</strong> Collision physics is important for car crash safety design,
          sports equipment engineering, and particle physics research.
        </p>
      </div>

      {renderBottomBar(() => goToPhase('review'), experimentsRun >= 2, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 3 • Understand', 'Conservation Laws', 'The fundamental rules of collisions')}

      {/* Connection to prediction/observation */}
      <div style={{
        padding: typo.cardPadding,
        borderRadius: '12px',
        marginBottom: typo.sectionGap,
        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}10 100%)`,
        border: `1px solid ${colors.primary}30`
      }}>
        <p style={{ fontSize: typo.body, color: colors.textPrimary, lineHeight: 1.6 }}>
          <strong>As you observed</strong> in the experiment, elastic and inelastic collisions behave very differently.
          {prediction === 'momentum_only'
            ? " Your prediction was correct! Momentum is always conserved, but energy only in elastic collisions."
            : " The result confirms what happens in real physics."}
        </p>
      </div>

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
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {renderSectionHeader('Step 4 • The Twist', 'What If Mass Is Unequal?', 'Predict the outcome')}

        {/* Mass Ratio Diagram SVG */}
        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginBottom: typo.sectionGap,
          background: colors.bgCard,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 400 100" style={{ width: '100%', height: isMobile ? '80px' : '95px' }}>
            {/* Background */}
            <rect x="0" y="0" width="400" height="100" fill={colors.bgDark} rx="8" />

            {/* Track */}
            <rect x="20" y="65" width="360" height="6" fill={colors.bgCardLight} rx="3" />

            {/* Heavy ball (3m) - large */}
            <circle cx="70" cy="50" r="28" fill={colors.ball1} />
            <text x="70" y="55" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">3m</text>
            <text x="70" y="90" textAnchor="middle" fill={colors.textSecondary} fontSize="9">Heavy</text>

            {/* Arrow */}
            <line x1="105" y1="50" x2="135" y2="50" stroke={colors.primary} strokeWidth="2" />
            <polygon points="140,50 130,45 130,55" fill={colors.primary} />

            {/* Light ball (m) - small */}
            <circle cx="180" cy="50" r="18" fill={colors.ball2} />
            <text x="180" y="55" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">m</text>
            <text x="180" y="90" textAnchor="middle" fill={colors.textSecondary} fontSize="9">Light</text>

            {/* Question mark */}
            <text x="280" y="60" textAnchor="middle" fill={colors.secondary} fontSize="32" fontWeight="bold">?</text>
            <text x="280" y="90" textAnchor="middle" fill={colors.secondary} fontSize="9">Predict outcome</text>

            {/* Versus text */}
            <text x="230" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">vs</text>
          </svg>
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginBottom: typo.sectionGap,
          background: `${colors.secondary}15`,
          border: `1px solid ${colors.secondary}30`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            We've seen equal mass collisions. Now imagine:
            <br /><br />
            <strong style={{ color: colors.textPrimary }}>A heavy ball (3m) hits a light ball (m), or vice versa.</strong>
            <br />
            What happens in an elastic collision?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          {twistOptions.map(option => (
            <button
              key={option.id}
              onPointerDown={(e) => {
                e.preventDefault();
                setTwistPrediction(option.id);
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
                background: twistPrediction === option.id ? `${colors.secondary}15` : colors.bgCard,
                border: `2px solid ${twistPrediction === option.id ? colors.secondary : colors.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '20px' }}>{option.icon}</span>
              <span style={{
                fontSize: typo.body,
                fontWeight: twistPrediction === option.id ? 700 : 400,
                color: twistPrediction === option.id ? colors.textPrimary : colors.textSecondary
              }}>
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
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      {renderSectionHeader('Step 5 • Twist Experiment', 'Mass Ratio Lab', 'Elastic collisions with different masses')}

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
              onPointerDown={(e) => {
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
          onPointerDown={(e) => {
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
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 6 • Twist Review', 'Mass Effects Explained', 'How mass ratio changes outcomes')}

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
        { value: '9 m/s', label: 'Break speed' },
        { value: '170 kg', label: 'Table weight' }
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
    <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
      {renderSectionHeader('Step 7 • Real-World', 'Collisions Everywhere', 'From games to galaxies')}

      <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
      {completedApps < realWorldApps.length ? (
        <div style={{ borderRadius: '16px' }} className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

            <div className="bg-indigo-50 rounded-lg p-3 mb-4" style={{ borderRadius: '8px' }}>
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Collisions:</h4>
              <p className="text-indigo-700 text-sm">{realWorldApps[completedApps].connection}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4" style={{ borderRadius: '8px' }}>
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
              onClick={() => {
                playSound('click');
                setCompletedApps(prev => prev + 1);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                playSound('click');
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
    if (questionConfirmed) return; // Don't allow changing after confirming
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    playSound('click');
  };

  const handleConfirmAnswer = () => {
    if (testAnswers[currentQuestionIndex] === null) return;
    setQuestionConfirmed(true);
    const correctIndex = testQuestions[currentQuestionIndex].options.findIndex(opt => opt.correct);
    if (testAnswers[currentQuestionIndex] === correctIndex) {
      playSound('success');
    } else {
      playSound('failure');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionConfirmed(false);
    } else {
      setShowTestResults(true);
    }
  };

  const calculateTestScore = () => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) correct++;
    });
    return correct;
  };

  const renderTest = () => {
    const q = testQuestions[currentQuestionIndex];
    const correctIndex = q.options.findIndex(opt => opt.correct);
    const isCorrect = testAnswers[currentQuestionIndex] === correctIndex;

    if (showTestResults) {
      const score = calculateTestScore();
      return (
        <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          {renderSectionHeader('Step 8 • Results', 'Test Complete!', `You scored ${score}/10`)}

          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {score >= 8 ? '🏆' : score >= 6 ? '🌟' : '📚'}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: colors.primary, marginBottom: '8px' }}>{score * 10}%</div>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              {score >= 8 ? 'Excellent! Collision physics mastered!' :
               score >= 6 ? 'Good grasp of conservation laws!' :
               'Review the concepts and try again!'}
            </p>
          </div>

          {/* Answer Review with scrollable container */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '24px',
            padding: '4px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {testQuestions.map((question, i) => {
                const correctIdx = question.options.findIndex(opt => opt.correct);
                const wasCorrect = testAnswers[i] === correctIdx;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      background: wasCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${wasCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>{wasCorrect ? '✓' : '✗'}</span>
                      <div>
                        <p style={{ fontSize: typo.small, fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>
                          Question {i+1}: {question.question}
                        </p>
                        {!wasCorrect && (
                          <p style={{ fontSize: typo.label, color: colors.textSecondary, lineHeight: 1.5 }}>
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation buttons for results page */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestionIndex(0);
                setQuestionConfirmed(false);
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: typo.body,
                background: colors.bgCardLight,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                minHeight: '48px'
              }}
            >
              Try Again
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setTestScore(score);
                goToPhase('mastery');
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: typo.body,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                minHeight: '48px',
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              Complete Lesson
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto' }}>
        {/* Question counter header */}
        <div style={{ marginBottom: typo.sectionGap }}>
          <p style={{
            fontSize: typo.label,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '8px',
            color: colors.warning
          }}>Step 8 • Knowledge Test</p>
          <h2 style={{
            fontSize: typo.heading,
            fontWeight: 800,
            marginBottom: '8px',
            color: colors.textPrimary
          }}>Question {currentQuestionIndex + 1} of 10</h2>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestionIndex
                    ? colors.primary
                    : testAnswers[i] !== null
                      ? colors.success
                      : colors.bgCardLight
                }}
              />
            ))}
          </div>
        </div>

        {/* Current question */}
        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          marginBottom: typo.sectionGap
        }}>
          <p style={{
            fontSize: typo.small,
            fontStyle: 'italic',
            marginBottom: '8px',
            color: colors.textMuted,
            lineHeight: 1.5
          }}>{q.scenario}</p>
          <p style={{
            fontWeight: 700,
            fontSize: typo.body,
            marginBottom: '16px',
            color: colors.textPrimary,
            lineHeight: 1.5
          }}>{q.question}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, oIndex) => {
              const isSelected = testAnswers[currentQuestionIndex] === oIndex;
              const showCorrect = questionConfirmed && opt.correct;
              const showIncorrect = questionConfirmed && isSelected && !opt.correct;

              return (
                <button
                  key={oIndex}
                  onClick={(e) => {
                    e.preventDefault();
                    handleTestAnswer(currentQuestionIndex, oIndex);
                  }}
                  disabled={questionConfirmed}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    textAlign: 'left',
                    fontSize: typo.body,
                    fontWeight: isSelected ? 700 : 400,
                    lineHeight: 1.4,
                    background: showCorrect ? 'rgba(34, 197, 94, 0.2)'
                      : showIncorrect ? 'rgba(239, 68, 68, 0.2)'
                      : isSelected ? 'rgba(59, 130, 246, 0.3)'
                      : colors.bgCardLight,
                    border: showCorrect ? '2px solid #22c55e'
                      : showIncorrect ? '2px solid #ef4444'
                      : isSelected ? '2px solid #3b82f6'
                      : '2px solid transparent',
                    color: colors.textSecondary,
                    cursor: questionConfirmed ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span>{String.fromCharCode(65 + oIndex)}) {opt.text}</span>
                  {showCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  {showIncorrect && <span style={{ marginLeft: 'auto' }}>✗</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation shown after confirming */}
          {questionConfirmed && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <p style={{
                color: isCorrect ? '#22c55e' : '#ef4444',
                fontWeight: 600,
                marginBottom: '8px',
                lineHeight: 1.5
              }}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                {q.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {!questionConfirmed ? (
            <button
              onClick={(e) => { e.preventDefault(); handleConfirmAnswer(); }}
              disabled={testAnswers[currentQuestionIndex] === null}
              style={{
                flex: 1,
                maxWidth: '300px',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: typo.body,
                lineHeight: 1.5,
                border: 'none',
                cursor: testAnswers[currentQuestionIndex] === null ? 'not-allowed' : 'pointer',
                background: testAnswers[currentQuestionIndex] === null
                  ? colors.bgCardLight
                  : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: testAnswers[currentQuestionIndex] === null ? colors.textMuted : 'white',
                opacity: testAnswers[currentQuestionIndex] === null ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); handleNextQuestion(); }}
              style={{
                flex: 1,
                maxWidth: '300px',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: typo.body,
                lineHeight: 1.5,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: 'white',
                transition: 'all 0.2s ease'
              }}
            >
              {currentQuestionIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
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
  // PHASE LABELS
  // ─────────────────────────────────────────────────────────────────────────

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION BAR
  // ─────────────────────────────────────────────────────────────────────────

  const currentPhaseIndex = PHASES.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = phase !== 'mastery' && phase !== 'test';

  const handleBack = () => {
    if (canGoBack) goToPhase(PHASES[currentPhaseIndex - 1]);
  };

  const handleNext = () => {
    if (currentPhaseIndex < PHASES.length - 1) goToPhase(PHASES[currentPhaseIndex + 1]);
  };

  const renderFixedBottomBar = () => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '12px 16px' : '14px 24px',
      backgroundColor: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      zIndex: 1000
    }}>
      <button
        onPointerDown={(e) => { e.preventDefault(); handleBack(); }}
        style={{
          padding: isMobile ? '12px 20px' : '14px 24px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: typo.body,
          backgroundColor: colors.bgCardLight,
          color: canGoBack ? colors.textSecondary : colors.textMuted,
          border: `1px solid ${colors.border}`,
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          opacity: canGoBack ? 1 : 0.4,
          minHeight: '48px',
          transition: 'all 0.2s ease'
        }}
      >
        ← Back
      </button>
      <button
        onPointerDown={(e) => { e.preventDefault(); if (canGoNext) handleNext(); }}
        style={{
          padding: isMobile ? '12px 20px' : '14px 24px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: typo.body,
          background: canGoNext
            ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
            : colors.bgCardLight,
          color: canGoNext ? 'white' : colors.textMuted,
          border: 'none',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.4,
          minHeight: '48px',
          boxShadow: canGoNext ? `0 4px 20px ${colors.primary}40` : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        Next →
      </button>
    </nav>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: '100vh',
      backgroundColor: colors.bgDark,
      color: colors.textPrimary,
      overflow: 'hidden',
      position: 'relative',
      fontWeight: 400,
      lineHeight: 1.6
    }}>
      {/* Premium background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)',
        pointerEvents: 'none'
      }} />

      {/* Header with nav dots */}
      <header style={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '12px 16px' : '14px 24px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 100
      }}>
        <span style={{
          fontSize: typo.small,
          fontWeight: 600,
          color: colors.textSecondary
        }}>Collision Physics</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {PHASES.map((p, i) => (
            <button
              key={p}
              onPointerDown={(e) => { e.preventDefault(); goToPhase(p); }}
              title={phaseLabels[p]}
              style={{
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: phase === p
                  ? colors.primary
                  : PHASES.indexOf(phase) > i
                    ? colors.success
                    : colors.bgCardLight
              }}
            />
          ))}
        </div>
        <span style={{
          fontSize: typo.small,
          fontWeight: 600,
          color: colors.primary
        }}>{phaseLabels[phase]}</span>
      </header>

      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '100px',
        position: 'relative'
      }}>
        {/* Coach message */}
        {showCoachMessage && phase !== 'hook' && (
          <div style={{
            margin: '16px',
            padding: typo.cardPadding,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%)`,
            border: `1px solid ${colors.primary}30`
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🧑‍🏫</span>
              <p style={{ flex: 1, margin: 0, fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.5 }}>
                {coachMessages[phase]}
              </p>
              <button
                onPointerDown={(e) => { e.preventDefault(); setShowCoachMessage(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Phase content */}
        <div style={{ padding: phase === 'hook' ? 0 : typo.pagePadding, maxWidth: '800px', margin: '0 auto' }}>
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

      {/* Fixed bottom navigation bar */}
      {renderFixedBottomBar()}
    </div>
  );
};

export default TwoBallCollisionRenderer;
