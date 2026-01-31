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

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  const soundConfig = {
    click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
    success: { frequency: 600, type: 'triangle' as OscillatorType, duration: 0.2 },
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

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
      playSound('failure');
      return;
    }

    setIsMoving(true);
    setHasStarted(true);
    playSound('click');

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
      playSound('failure');
      return;
    }

    if (!hasBrokenFree) {
      setHasBrokenFree(true);
      playSound('success');
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

    return (
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {phases.map((p, i) => (
          <button
            key={p}
            onMouseDown={(e) => {
              e.preventDefault();
              if (i < currentIndex) goToPhase(p);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                : i < currentIndex
                  ? 'bg-emerald-500 w-2'
                  : 'bg-slate-600 w-2 hover:bg-slate-500'
            }`}
            style={{ cursor: i < currentIndex ? 'pointer' : 'default' }}
          />
        ))}
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
    const frictionForce = friction * 10; // weight = 10N

    return (
      <svg viewBox="0 0 400 180" className="w-full h-44 md:h-52">
        <defs>
          {/* === PREMIUM GRADIENTS FOR ROLLING VS SLIDING === */}

          {/* Lab background gradient */}
          <linearGradient id="rvsLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="25%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Premium surface gradient with texture depth */}
          <linearGradient id="rvsSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="15%" stopColor="#57534e" />
            <stop offset="40%" stopColor="#44403c" />
            <stop offset="70%" stopColor="#292524" />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>

          {/* Premium sliding box gradient - 3D metal effect */}
          <linearGradient id="rvsBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="20%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="80%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* Box highlight for 3D effect */}
          <linearGradient id="rvsBoxHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </linearGradient>

          {/* Premium cart body gradient */}
          <linearGradient id="rvsCartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="25%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="75%" stopColor="#047857" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>

          {/* Cart highlight */}
          <linearGradient id="rvsCartHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.5" />
            <stop offset="30%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </linearGradient>

          {/* Premium wheel radial gradient - 3D sphere effect */}
          <radialGradient id="rvsWheelGrad" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="30%" stopColor="#4b5563" />
            <stop offset="60%" stopColor="#374151" />
            <stop offset="85%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>

          {/* Wheel rubber tire gradient */}
          <radialGradient id="rvsWheelTire" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="70%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>

          {/* Wheel hub metallic gradient */}
          <radialGradient id="rvsWheelHub" cx="40%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="40%" stopColor="#9ca3af" />
            <stop offset="80%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>

          {/* Force arrow gradient */}
          <linearGradient id="rvsForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#6366f1" />
            <stop offset="70%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>

          {/* Friction force arrow - sliding (red) */}
          <linearGradient id="rvsFrictionSlide" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* Friction force arrow - rolling (green, smaller) */}
          <linearGradient id="rvsFrictionRoll" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#22c55e" />
            <stop offset="70%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* Spark/heat glow for sliding friction */}
          <radialGradient id="rvsSparkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Distance marker gradient */}
          <linearGradient id="rvsDistanceMarker" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>

          {/* === PREMIUM FILTERS === */}

          {/* Glow filter for objects */}
          <filter id="rvsObjectGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Spark glow filter */}
          <filter id="rvsSparkFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Force arrow glow */}
          <filter id="rvsForceGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Wheel shadow filter */}
          <filter id="rvsWheelShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="shadow" />
            <feOffset dx="2" dy="2" in="shadow" result="offsetShadow" />
            <feMerge>
              <feMergeNode in="offsetShadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Surface texture pattern */}
          <pattern id="rvsSurfaceTexture" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#44403c" />
            <circle cx="2" cy="2" r="0.5" fill="#57534e" opacity="0.5" />
            <circle cx="6" cy="6" r="0.5" fill="#292524" opacity="0.5" />
            <circle cx="4" cy="4" r="0.3" fill="#57534e" opacity="0.3" />
          </pattern>

          {/* Rough surface texture */}
          <pattern id="rvsRoughTexture" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#5c4033" />
            <rect x="0" y="0" width="3" height="3" fill="#4a3728" opacity="0.7" />
            <rect x="3" y="3" width="3" height="3" fill="#6b4d38" opacity="0.5" />
            <circle cx="1.5" cy="4.5" r="0.8" fill="#3d2b1f" opacity="0.6" />
            <circle cx="4.5" cy="1.5" r="0.6" fill="#7a5c45" opacity="0.4" />
          </pattern>

          {/* Grid pattern for lab floor */}
          <pattern id="rvsLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Premium dark lab background */}
        <rect x="0" y="0" width="400" height="180" fill="url(#rvsLabBg)" rx="12" />
        <rect x="0" y="0" width="400" height="130" fill="url(#rvsLabGrid)" rx="12" />

        {/* Premium surface with texture */}
        <rect x="0" y="130" width="400" height="50" fill="url(#rvsSurfaceGrad)" />
        <rect x="0" y="130" width="400" height="50" fill="url(#rvsSurfaceTexture)" opacity="0.4" />
        {/* Surface edge highlight */}
        <line x1="0" y1="130" x2="400" y2="130" stroke="#a8a29e" strokeWidth="1" opacity="0.5" />

        {/* Surface label */}
        <text x="380" y="165" textAnchor="end" fill="#a8a29e" fontSize="8" fontFamily="monospace" opacity="0.7">
          FLOOR SURFACE
        </text>

        {/* Friction force indicators with labels */}
        <g transform={`translate(${50 + position}, 130)`}>
          {type === 'sliding' ? (
            // Large friction force arrow for sliding
            <g>
              {/* Friction force arrow pointing left (opposing motion) */}
              <line x1="30" y1="-15" x2="-20" y2="-15" stroke="url(#rvsFrictionSlide)" strokeWidth="6" strokeLinecap="round" filter="url(#rvsForceGlow)" />
              <polygon points="-20,-15 -10,-10 -10,-20" fill="#ef4444" />
              <text x="5" y="-25" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">
                f = {frictionForce.toFixed(1)}N
              </text>
              <text x="5" y="-36" textAnchor="middle" fill="#f87171" fontSize="7" opacity="0.8">
                FRICTION
              </text>

              {/* Friction heat/sparks for sliding */}
              {position > 0 && (
                <g filter="url(#rvsSparkFilter)">
                  <circle cx={-15 - Math.random() * 10} cy={-2} r="4" fill="url(#rvsSparkGlow)" opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={-8 - Math.random() * 8} cy={-4} r="3" fill="url(#rvsSparkGlow)" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.25s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={-20 - Math.random() * 5} cy={-1} r="2.5" fill="url(#rvsSparkGlow)" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.35s" repeatCount="indefinite" />
                  </circle>
                  {/* Heat waves */}
                  <path d="M-25,-5 Q-22,-10 -20,-5 Q-18,-10 -15,-5" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.4s" repeatCount="indefinite" />
                  </path>
                </g>
              )}
            </g>
          ) : (
            // Small friction force arrow for rolling
            <g>
              {/* Much smaller friction force arrow */}
              <line x1="8" y1="-15" x2="-5" y2="-15" stroke="url(#rvsFrictionRoll)" strokeWidth="3" strokeLinecap="round" filter="url(#rvsForceGlow)" />
              <polygon points="-5,-15 0,-12 0,-18" fill="#22c55e" />
              <text x="2" y="-25" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold">
                f = {frictionForce.toFixed(2)}N
              </text>
              <text x="2" y="-36" textAnchor="middle" fill="#4ade80" fontSize="7" opacity="0.8">
                MINIMAL
              </text>
            </g>
          )}
        </g>

        {/* Object/Cart */}
        <g transform={`translate(${50 + position}, 0)`}>
          {type === 'sliding' ? (
            // Premium sliding box with 3D effect
            <g filter="url(#rvsObjectGlow)">
              {/* Box shadow */}
              <rect x="-23" y="82" width="50" height="50" fill="#000" opacity="0.3" rx="5" />
              {/* Main box body */}
              <rect x="-25" y="80" width="50" height="50" fill="url(#rvsBoxGrad)" rx="5" />
              {/* Box highlight overlay */}
              <rect x="-25" y="80" width="50" height="25" fill="url(#rvsBoxHighlight)" rx="5" />
              {/* Box edge details */}
              <line x1="-25" y1="80" x2="25" y2="80" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
              <line x1="-25" y1="80" x2="-25" y2="130" stroke="#93c5fd" strokeWidth="0.5" opacity="0.4" />
              {/* Box label */}
              <text x="0" y="108" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                CRATE
              </text>
              <text x="0" y="120" textAnchor="middle" fill="#bfdbfe" fontSize="8" opacity="0.8">
                100 kg
              </text>
            </g>
          ) : (
            // Premium rolling cart with 3D wheels
            <g>
              {/* Cart shadow */}
              <rect x="-28" y="72" width="60" height="35" fill="#000" opacity="0.3" rx="5" />
              {/* Cart body */}
              <rect x="-30" y="70" width="60" height="35" fill="url(#rvsCartGrad)" rx="5" filter="url(#rvsObjectGlow)" />
              {/* Cart highlight */}
              <rect x="-30" y="70" width="60" height="17" fill="url(#rvsCartHighlight)" rx="5" />
              {/* Cart edge details */}
              <line x1="-30" y1="70" x2="30" y2="70" stroke="#6ee7b7" strokeWidth="1" opacity="0.6" />
              {/* Cart label */}
              <text x="0" y="90" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                CART
              </text>
              <text x="0" y="100" textAnchor="middle" fill="#a7f3d0" fontSize="7" opacity="0.8">
                100 kg
              </text>

              {/* Premium left wheel */}
              <g transform={`translate(-18, 115)`} filter="url(#rvsWheelShadow)">
                {/* Outer tire */}
                <circle cx="0" cy="0" r="15" fill="url(#rvsWheelTire)" />
                {/* Tire tread marks */}
                <circle cx="0" cy="0" r="14" fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="4,3" opacity="0.5" />
                {/* Inner wheel */}
                <circle cx="0" cy="0" r="10" fill="url(#rvsWheelGrad)" />
                {/* Hub cap */}
                <circle cx="0" cy="0" r="5" fill="url(#rvsWheelHub)" />
                {/* Spoke lines showing rotation */}
                <g transform={`rotate(${wheelRotation})`}>
                  <line x1="0" y1="-8" x2="0" y2="8" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.8" />
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.8" />
                </g>
                {/* Center bolt */}
                <circle cx="0" cy="0" r="2" fill="#f3f4f6" />
              </g>

              {/* Premium right wheel */}
              <g transform={`translate(18, 115)`} filter="url(#rvsWheelShadow)">
                <circle cx="0" cy="0" r="15" fill="url(#rvsWheelTire)" />
                <circle cx="0" cy="0" r="14" fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="4,3" opacity="0.5" />
                <circle cx="0" cy="0" r="10" fill="url(#rvsWheelGrad)" />
                <circle cx="0" cy="0" r="5" fill="url(#rvsWheelHub)" />
                <g transform={`rotate(${wheelRotation})`}>
                  <line x1="0" y1="-8" x2="0" y2="8" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.8" />
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.8" />
                </g>
                <circle cx="0" cy="0" r="2" fill="#f3f4f6" />
              </g>
            </g>
          )}

          {/* Applied force arrow with premium styling */}
          {force > 0 && (
            <g filter="url(#rvsForceGlow)">
              <line
                x1={-70 - force}
                y1={type === 'sliding' ? 100 : 85}
                x2="-35"
                y2={type === 'sliding' ? 100 : 85}
                stroke="url(#rvsForceArrow)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <polygon
                points={type === 'sliding'
                  ? "-35,100 -45,94 -45,106"
                  : "-35,85 -45,79 -45,91"
                }
                fill="#6366f1"
              />
              {/* Force label with background */}
              <rect
                x={-75 - force}
                y={type === 'sliding' ? 82 : 67}
                width="30"
                height="16"
                fill="#1e1b4b"
                rx="3"
                opacity="0.8"
              />
              <text
                x={-60 - force}
                y={type === 'sliding' ? 94 : 79}
                textAnchor="middle"
                fill="#a5b4fc"
                fontSize="10"
                fontWeight="bold"
              >
                {force}N
              </text>
              <text
                x={-60 - force}
                y={type === 'sliding' ? 74 : 59}
                textAnchor="middle"
                fill="#818cf8"
                fontSize="7"
              >
                PUSH
              </text>
            </g>
          )}
        </g>

        {/* Distance marker with premium styling */}
        {position > 0 && (
          <g>
            <line x1="50" y1="155" x2={50 + position} y2="155" stroke="url(#rvsDistanceMarker)" strokeWidth="3" strokeLinecap="round" />
            {/* End caps */}
            <line x1="50" y1="150" x2="50" y2="160" stroke="#10b981" strokeWidth="2" />
            <line x1={50 + position} y1="150" x2={50 + position} y2="160" stroke="#10b981" strokeWidth="2" />
            {/* Distance label with background */}
            <rect x={45 + position / 2 - 25} y="162" width="50" height="14" fill="#064e3b" rx="3" opacity="0.8" />
            <text x={50 + position / 2} y="173" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="bold">
              {position.toFixed(0)} units
            </text>
          </g>
        )}

        {/* Type label with premium badge styling */}
        <g transform="translate(200, 20)">
          <rect
            x="-80"
            y="-12"
            width="160"
            height="24"
            fill={type === 'sliding' ? '#7f1d1d' : '#14532d'}
            rx="12"
            opacity="0.8"
          />
          <rect
            x="-80"
            y="-12"
            width="160"
            height="12"
            fill={type === 'sliding' ? '#991b1b' : '#166534'}
            rx="12"
            opacity="0.3"
          />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fill={type === 'sliding' ? '#fca5a5' : '#86efac'}
            fontSize="12"
            fontWeight="bold"
          >
            {type === 'sliding' ? 'SLIDING FRICTION (μ = 0.4)' : 'ROLLING FRICTION (μ = 0.02)'}
          </text>
        </g>

        {/* Physics formula display */}
        <g transform="translate(350, 60)">
          <text x="0" y="0" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            f = μ × N
          </text>
          <text x="0" y="12" textAnchor="end" fill="#64748b" fontSize="7" fontFamily="monospace">
            N = mg = 100N
          </text>
        </g>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      {/* Gradient Title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">The Wheel Revolution</h1>
      <p className="text-slate-400 mb-6">Why wheels changed everything</p>

      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-lg border border-white/10">
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          <defs>
            {/* Premium gradients for hook visualization */}
            <linearGradient id="rvsHookBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="rvsHookGround" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="30%" stopColor="#57534e" />
              <stop offset="70%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            <linearGradient id="rvsHookStoneSlide" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <linearGradient id="rvsHookStoneRoll" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="30%" stopColor="#34d399" />
              <stop offset="70%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <radialGradient id="rvsHookWheel" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>

            <radialGradient id="rvsHookSpark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="rvsHookArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>

            <filter id="rvsHookGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rvsHookSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="rvsHookGroundTexture" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#44403c" />
              <circle cx="2" cy="2" r="0.5" fill="#57534e" opacity="0.4" />
              <circle cx="5" cy="5" r="0.4" fill="#292524" opacity="0.4" />
            </pattern>
          </defs>

          {/* Dark lab background */}
          <rect x="0" y="0" width="300" height="180" fill="url(#rvsHookBg)" rx="10" />

          {/* Ground with texture */}
          <rect x="0" y="150" width="300" height="30" fill="url(#rvsHookGround)" />
          <rect x="0" y="150" width="300" height="30" fill="url(#rvsHookGroundTexture)" opacity="0.3" />
          <line x1="0" y1="150" x2="300" y2="150" stroke="#a8a29e" strokeWidth="0.5" opacity="0.5" />

          {/* Sliding block (ancient method) */}
          <g transform="translate(70, 150)">
            {/* Shadow */}
            <rect x="-28" y="-38" width="60" height="40" fill="#000" opacity="0.3" rx="3" />
            {/* Stone block */}
            <rect x="-30" y="-40" width="60" height="40" fill="url(#rvsHookStoneSlide)" rx="3" filter="url(#rvsHookGlow)" />
            {/* Highlight */}
            <rect x="-30" y="-40" width="60" height="20" fill="white" opacity="0.1" rx="3" />
            <text x="0" y="-15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>STONE</text>

            {/* Friction sparks */}
            <g filter="url(#rvsHookSparkGlow)">
              <circle cx="-25" cy="-3" r="3" fill="url(#rvsHookSpark)">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="-15" cy="-1" r="2" fill="url(#rvsHookSpark)">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.25s" repeatCount="indefinite" />
              </circle>
              <circle cx="-35" cy="-2" r="2.5" fill="url(#rvsHookSpark)">
                <animate attributeName="opacity" values="0.7;0.25;0.7" dur="0.35s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Friction resistance lines */}
            <line x1="-40" y1="-2" x2="-20" y2="-2" stroke="#fca5a5" strokeWidth="2" opacity="0.8" />
            <line x1="-35" y1="3" x2="-15" y2="3" stroke="#fca5a5" strokeWidth="1.5" opacity="0.6" />

            {/* Label */}
            <rect x="-35" y="8" width="70" height="16" fill="#7f1d1d" rx="3" opacity="0.8" />
            <text x="0" y="20" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">Hard to move!</text>
          </g>

          {/* Wheeled cart (modern method) */}
          <g transform="translate(230, 150)">
            {/* Shadow */}
            <rect x="-28" y="-53" width="60" height="40" fill="#000" opacity="0.3" rx="3" />
            {/* Cart body */}
            <rect x="-30" y="-55" width="60" height="40" fill="url(#rvsHookStoneRoll)" rx="3" filter="url(#rvsHookGlow)" />
            {/* Highlight */}
            <rect x="-30" y="-55" width="60" height="20" fill="white" opacity="0.1" rx="3" />
            <text x="0" y="-30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>STONE</text>

            {/* Premium wheels */}
            <circle cx="-15" cy="-10" r="12" fill="url(#rvsHookWheel)" />
            <circle cx="-15" cy="-10" r="7" fill="#4b5563" />
            <circle cx="-15" cy="-10" r="3" fill="#9ca3af" />
            <circle cx="15" cy="-10" r="12" fill="url(#rvsHookWheel)" />
            <circle cx="15" cy="-10" r="7" fill="#4b5563" />
            <circle cx="15" cy="-10" r="3" fill="#9ca3af" />

            {/* Label */}
            <rect x="-20" y="8" width="40" height="16" fill="#14532d" rx="3" opacity="0.8" />
            <text x="0" y="20" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold">Easy!</text>
          </g>

          {/* Arrow between with premium styling */}
          <g transform="translate(150, 90)">
            <rect x="-30" y="-25" width="60" height="50" fill="#312e81" rx="8" opacity="0.4" />
            <line x1="-15" y1="10" x2="15" y2="10" stroke="url(#rvsHookArrow)" strokeWidth="4" strokeLinecap="round" />
            <polygon points="15,10 5,5 5,15" fill="#6366f1" />
            <text x="0" y="-5" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="bold">WHEELS!</text>
          </g>

          {/* Title */}
          <text x="150" y="25" textAnchor="middle" fill="#94a3b8" fontSize="11">How pyramids were built vs modern transport</text>
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
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          <defs>
            {/* Premium gradients for comparison chart */}
            <linearGradient id="rvsReviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="rvsReviewSlideBar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="20%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            <linearGradient id="rvsReviewRollBar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="20%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="80%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="rvsReviewAxis" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <filter id="rvsReviewBarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rvsReviewTextGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="rvsReviewGrid" width="15" height="15" patternUnits="userSpaceOnUse">
              <rect width="15" height="15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Dark background */}
          <rect x="0" y="0" width="300" height="180" fill="url(#rvsReviewBg)" rx="10" />
          <rect x="0" y="0" width="300" height="180" fill="url(#rvsReviewGrid)" rx="10" />

          {/* Title with premium styling */}
          <g transform="translate(150, 18)">
            <rect x="-100" y="-10" width="200" height="20" fill="#312e81" rx="4" opacity="0.5" />
            <text x="0" y="5" textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="bold" letterSpacing="1">
              FRICTION COEFFICIENT COMPARISON
            </text>
          </g>

          {/* Y-axis */}
          <line x1="50" y1="40" x2="50" y2="120" stroke="url(#rvsReviewAxis)" strokeWidth="2" />
          <text x="25" y="80" textAnchor="middle" fill="#94a3b8" fontSize="8" transform="rotate(-90, 25, 80)">μ (coefficient)</text>

          {/* Y-axis scale marks */}
          <line x1="45" y1="45" x2="50" y2="45" stroke="#64748b" strokeWidth="1" />
          <text x="40" y="48" textAnchor="end" fill="#64748b" fontSize="7">0.4</text>
          <line x1="45" y1="70" x2="50" y2="70" stroke="#64748b" strokeWidth="1" />
          <text x="40" y="73" textAnchor="end" fill="#64748b" fontSize="7">0.2</text>
          <line x1="45" y1="95" x2="50" y2="95" stroke="#64748b" strokeWidth="1" />
          <text x="40" y="98" textAnchor="end" fill="#64748b" fontSize="7">0.02</text>
          <line x1="45" y1="115" x2="50" y2="115" stroke="#64748b" strokeWidth="1" />
          <text x="40" y="118" textAnchor="end" fill="#64748b" fontSize="7">0</text>

          {/* X-axis */}
          <line x1="50" y1="120" x2="270" y2="120" stroke="url(#rvsReviewAxis)" strokeWidth="2" />

          {/* Sliding bar - tall */}
          <g filter="url(#rvsReviewBarGlow)">
            <rect x="80" y="45" width="50" height="75" fill="url(#rvsReviewSlideBar)" rx="4" />
            {/* Bar highlight */}
            <rect x="80" y="45" width="25" height="75" fill="white" opacity="0.1" rx="4" />
            {/* Value label */}
            <rect x="85" y="55" width="40" height="18" fill="#7f1d1d" rx="3" opacity="0.8" />
            <text x="105" y="68" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">μ = 0.4</text>
          </g>
          <text x="105" y="135" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">SLIDING</text>
          <text x="105" y="145" textAnchor="middle" fill="#94a3b8" fontSize="7">High resistance</text>

          {/* Rolling bar - tiny (scaled proportionally) */}
          <g filter="url(#rvsReviewBarGlow)">
            <rect x="180" y="111" width="50" height="9" fill="url(#rvsReviewRollBar)" rx="2" />
            {/* Bar highlight */}
            <rect x="180" y="111" width="25" height="9" fill="white" opacity="0.15" rx="2" />
          </g>
          {/* Value label positioned above tiny bar */}
          <rect x="175" y="90" width="60" height="16" fill="#14532d" rx="3" opacity="0.8" />
          <text x="205" y="101" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">μ = 0.02</text>
          <text x="205" y="135" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold">ROLLING</text>
          <text x="205" y="145" textAnchor="middle" fill="#94a3b8" fontSize="7">Minimal resistance</text>

          {/* 20x comparison indicator */}
          <g transform="translate(150, 160)">
            <rect x="-70" y="-10" width="140" height="20" fill="#7f1d1d" rx="10" opacity="0.7" />
            <rect x="-70" y="-10" width="140" height="10" fill="#991b1b" rx="10" opacity="0.3" />
            <text x="0" y="4" textAnchor="middle" fill="#fecaca" fontSize="11" fontWeight="bold" filter="url(#rvsReviewTextGlow)">
              Sliding = 20× MORE FRICTION!
            </text>
          </g>

          {/* Comparison arrow */}
          <g opacity="0.6">
            <line x1="135" y1="82" x2="175" y2="115" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" />
            <polygon points="175,115 168,110 170,118" fill="#f59e0b" />
            <text x="155" y="95" textAnchor="middle" fill="#fcd34d" fontSize="8" fontWeight="bold">20×</text>
          </g>
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
          <svg viewBox="0 0 400 150" className="w-full h-36">
            <defs>
              {/* Premium gradients for static vs kinetic */}
              <linearGradient id="rvsTwistBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="rvsTwistSmoothSurface" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#78716c" />
                <stop offset="30%" stopColor="#57534e" />
                <stop offset="70%" stopColor="#44403c" />
                <stop offset="100%" stopColor="#292524" />
              </linearGradient>

              <linearGradient id="rvsTwistRoughSurface" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b6914" />
                <stop offset="30%" stopColor="#6b4d38" />
                <stop offset="70%" stopColor="#5c4033" />
                <stop offset="100%" stopColor="#3d2b1f" />
              </linearGradient>

              <linearGradient id="rvsTwistBlockStuck" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="30%" stopColor="#f87171" />
                <stop offset="70%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>

              <linearGradient id="rvsTwistBlockMoving" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="30%" stopColor="#34d399" />
                <stop offset="70%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              <linearGradient id="rvsTwistForce" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                <stop offset="30%" stopColor="#6366f1" />
                <stop offset="70%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>

              <linearGradient id="rvsTwistStaticFriction" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>

              <linearGradient id="rvsTwistKineticFriction" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <radialGradient id="rvsTwistBreakGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
                <stop offset="50%" stopColor="#22c55e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </radialGradient>

              <pattern id="rvsTwistRoughTexture" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#5c4033" />
                <rect x="0" y="0" width="4" height="4" fill="#4a3728" opacity="0.6" />
                <rect x="4" y="4" width="4" height="4" fill="#6b4d38" opacity="0.5" />
                <circle cx="2" cy="6" r="1" fill="#3d2b1f" opacity="0.7" />
                <circle cx="6" cy="2" r="0.8" fill="#7a5c45" opacity="0.5" />
              </pattern>

              <pattern id="rvsTwistSmoothTexture" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="#44403c" />
                <circle cx="2" cy="2" r="0.3" fill="#57534e" opacity="0.3" />
                <circle cx="5" cy="5" r="0.2" fill="#292524" opacity="0.3" />
              </pattern>

              <filter id="rvsTwistGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="rvsTwistBreakFilter" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dark lab background */}
            <rect x="0" y="0" width="400" height="150" fill="url(#rvsTwistBg)" rx="10" />

            {/* Surface with appropriate texture */}
            <rect x="0" y="110" width="400" height="40" fill={surfaceType === 'rough' ? 'url(#rvsTwistRoughSurface)' : 'url(#rvsTwistSmoothSurface)'} />
            <rect x="0" y="110" width="400" height="40" fill={surfaceType === 'rough' ? 'url(#rvsTwistRoughTexture)' : 'url(#rvsTwistSmoothTexture)'} opacity="0.4" />
            <line x1="0" y1="110" x2="400" y2="110" stroke={surfaceType === 'rough' ? '#a8884d' : '#a8a29e'} strokeWidth="1" opacity="0.5" />

            {/* Surface type label */}
            <text x="380" y="140" textAnchor="end" fill={surfaceType === 'rough' ? '#d4a574' : '#a8a29e'} fontSize="8" fontFamily="monospace" opacity="0.7">
              {surfaceType === 'rough' ? 'ROUGH SURFACE' : 'SMOOTH SURFACE'}
            </text>

            {/* Object with state-dependent styling */}
            <g transform={`translate(${50 + twistPosition}, 110)`}>
              {/* Break-free glow effect */}
              {hasBrokenFree && (
                <circle cx="0" cy="-25" r="40" fill="url(#rvsTwistBreakGlow)" filter="url(#rvsTwistBreakFilter)" opacity="0.3">
                  <animate attributeName="r" values="35;45;35" dur="1s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Shadow */}
              <rect x="-23" y="-48" width="50" height="50" fill="#000" opacity="0.3" rx="5" />

              {/* Block with gradient based on state */}
              <rect
                x="-25"
                y="-50"
                width="50"
                height="50"
                fill={hasBrokenFree ? 'url(#rvsTwistBlockMoving)' : 'url(#rvsTwistBlockStuck)'}
                rx="5"
                filter="url(#rvsTwistGlow)"
              />

              {/* Highlight */}
              <rect x="-25" y="-50" width="50" height="25" fill="white" opacity="0.1" rx="5" />

              {/* Status text */}
              <text x="0" y="-20" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {hasBrokenFree ? 'MOVING!' : 'STUCK'}
              </text>

              {/* Friction force indicator */}
              {!hasBrokenFree && twistForce > 0 && (
                <g>
                  {/* Static friction resistance arrow */}
                  <line x1="30" y1="-25" x2={30 + Math.min(twistForce * 2, 40)} y2="-25" stroke="url(#rvsTwistStaticFriction)" strokeWidth="4" strokeLinecap="round" />
                  <polygon points={`${30 + Math.min(twistForce * 2, 40)},-25 ${20 + Math.min(twistForce * 2, 40)},-20 ${20 + Math.min(twistForce * 2, 40)},-30`} fill="#f97316" />
                  <text x={45 + Math.min(twistForce, 20)} y="-35" textAnchor="middle" fill="#fdba74" fontSize="7">STATIC</text>
                </g>
              )}

              {hasBrokenFree && (
                <g>
                  {/* Kinetic friction (smaller) arrow */}
                  <line x1="30" y1="-25" x2="45" y2="-25" stroke="url(#rvsTwistKineticFriction)" strokeWidth="3" strokeLinecap="round" />
                  <polygon points="45,-25 38,-21 38,-29" fill="#f59e0b" />
                  <text x="50" y="-35" textAnchor="middle" fill="#fcd34d" fontSize="7">KINETIC</text>
                </g>
              )}

              {/* Applied force arrow */}
              {twistForce > 0 && (
                <g filter="url(#rvsTwistGlow)">
                  <line x1={-60 - twistForce * 2} y1="-25" x2="-30" y2="-25" stroke="url(#rvsTwistForce)" strokeWidth="5" strokeLinecap="round" />
                  <polygon points="-30,-25 -40,-19 -40,-31" fill="#6366f1" />
                  <rect x={-75 - twistForce * 2} y="-38" width="30" height="14" fill="#1e1b4b" rx="3" opacity="0.8" />
                  <text x={-60 - twistForce * 2} y="-28" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="bold">
                    {twistForce}N
                  </text>
                </g>
              )}
            </g>

            {/* Status bar with premium styling */}
            <g transform="translate(200, 20)">
              <rect x="-190" y="-12" width="380" height="28" fill="#1e1b4b" rx="6" opacity="0.6" />

              {/* Force display */}
              <text x="-170" y="5" textAnchor="start" fill="#c7d2fe" fontSize="10" fontWeight="bold">
                Applied: {twistForce}N
              </text>

              {/* Static threshold */}
              <text x="-30" y="5" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="bold">
                Static: {staticForce.toFixed(1)}N
              </text>

              {/* Kinetic threshold */}
              <text x="120" y="5" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">
                Kinetic: {kineticForce.toFixed(1)}N
              </text>

              {/* Progress indicator */}
              <rect x="-190" y="18" width="380" height="4" fill="#312e81" rx="2" />
              <rect x="-190" y="18" width={Math.min((twistForce / staticForce) * 380, 380)} height="4" fill={hasBrokenFree ? '#22c55e' : '#f97316'} rx="2" />
            </g>
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
                Now only {kineticForce.toFixed(1)}N needed to keep moving. Static friction {'>'} Kinetic friction!
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
        <svg viewBox="0 0 300 160" className="w-full h-40 mb-4">
          <defs>
            {/* Premium gradients for static vs kinetic graph */}
            <linearGradient id="rvsTwistRevBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="rvsTwistRevStaticLine" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <linearGradient id="rvsTwistRevKineticLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            <linearGradient id="rvsTwistRevAxis" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <radialGradient id="rvsTwistRevPeakGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="rvsTwistRevDropGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            <filter id="rvsTwistRevLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rvsTwistRevPeakFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="rvsTwistRevGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>

            {/* Area fill under static line */}
            <linearGradient id="rvsTwistRevStaticFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>

            {/* Area fill under kinetic line */}
            <linearGradient id="rvsTwistRevKineticFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Dark background with grid */}
          <rect x="0" y="0" width="300" height="160" fill="url(#rvsTwistRevBg)" rx="10" />
          <rect x="0" y="0" width="300" height="160" fill="url(#rvsTwistRevGrid)" rx="10" />

          {/* Y-axis */}
          <line x1="50" y1="130" x2="50" y2="25" stroke="url(#rvsTwistRevAxis)" strokeWidth="2" />
          <polygon points="50,25 46,32 54,32" fill="#64748b" />
          <text x="25" y="80" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" transform="rotate(-90, 25, 80)">
            Friction Force →
          </text>

          {/* X-axis */}
          <line x1="50" y1="130" x2="280" y2="130" stroke="url(#rvsTwistRevAxis)" strokeWidth="2" />
          <polygon points="280,130 273,126 273,134" fill="#64748b" />
          <text x="165" y="150" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
            Applied Force →
          </text>

          {/* Area fills */}
          <path d="M 50,130 L 130,55 L 130,130 Z" fill="url(#rvsTwistRevStaticFill)" />
          <path d="M 130,130 L 130,80 L 270,80 L 270,130 Z" fill="url(#rvsTwistRevKineticFill)" />

          {/* Static friction line (rises to peak) */}
          <path d="M 50,130 L 130,55" stroke="url(#rvsTwistRevStaticLine)" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#rvsTwistRevLineGlow)" />

          {/* Peak point with glow */}
          <circle cx="130" cy="55" r="12" fill="url(#rvsTwistRevPeakGlow)" filter="url(#rvsTwistRevPeakFilter)">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="130" cy="55" r="6" fill="#fbbf24" />
          <circle cx="130" cy="55" r="3" fill="#fef3c7" />

          {/* Peak label */}
          <rect x="55" y="35" width="65" height="16" fill="#7f1d1d" rx="3" opacity="0.8" />
          <text x="87" y="47" textAnchor="middle" fill="#fecaca" fontSize="9" fontWeight="bold">STATIC MAX</text>

          {/* Drop line (transition) */}
          <line x1="130" y1="55" x2="130" y2="80" stroke="#fbbf24" strokeWidth="3" strokeDasharray="5,3" filter="url(#rvsTwistRevLineGlow)">
            <animate attributeName="stroke-dashoffset" values="0;16" dur="0.8s" repeatCount="indefinite" />
          </line>

          {/* Break free indicator */}
          <circle cx="130" cy="80" r="8" fill="url(#rvsTwistRevDropGlow)" filter="url(#rvsTwistRevPeakFilter)">
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.6s" repeatCount="indefinite" />
          </circle>

          {/* Kinetic friction line (lower constant) */}
          <line x1="130" y1="80" x2="270" y2="80" stroke="url(#rvsTwistRevKineticLine)" strokeWidth="4" strokeLinecap="round" filter="url(#rvsTwistRevLineGlow)" />

          {/* Kinetic label */}
          <rect x="175" y="60" width="75" height="16" fill="#14532d" rx="3" opacity="0.8" />
          <text x="212" y="72" textAnchor="middle" fill="#bbf7d0" fontSize="9" fontWeight="bold">KINETIC (lower)</text>

          {/* Break free callout */}
          <g transform="translate(155, 105)">
            <rect x="-35" y="-10" width="70" height="18" fill="#78350f" rx="4" opacity="0.8" />
            <text x="0" y="3" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="bold">BREAK FREE!</text>
          </g>

          {/* Friction difference annotation */}
          <line x1="275" y1="55" x2="275" y2="80" stroke="#f59e0b" strokeWidth="2" />
          <line x1="270" y1="55" x2="280" y2="55" stroke="#f59e0b" strokeWidth="2" />
          <line x1="270" y1="80" x2="280" y2="80" stroke="#f59e0b" strokeWidth="2" />
          <text x="285" y="70" textAnchor="start" fill="#fcd34d" fontSize="7" fontWeight="bold">Δf</text>
        </svg>

        <div className="text-center">
          <p className="text-lg text-purple-800 font-semibold">
            Static Friction {'>'} Kinetic Friction
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
    playSound(optionIndex === testQuestions[questionIndex].options.findIndex(o => o.correct) ? 'success' : 'failure');
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
              <p className="text-sm text-gray-700">Static friction (starting) {'>'} Kinetic friction (moving)</p>
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
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />

      <div className={`relative z-10 ${isMobile ? 'p-3' : 'p-6'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Progress bar header */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-white/10 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-400">Rolling vs Sliding</span>
              <span className="text-sm text-slate-500">{phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
            {renderProgressBar()}
          </div>

          {showCoachMessage && (
            <div className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-xl text-white rounded-xl p-4 mb-4 shadow-lg border border-white/10">
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

          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl shadow-xl p-4 md:p-6 border border-white/10">
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

export default RollingVsSlidingRenderer;
