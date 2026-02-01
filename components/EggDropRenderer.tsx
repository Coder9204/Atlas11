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

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  const soundConfig = {
    click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
    success: { frequency: 800, type: 'triangle' as OscillatorType, duration: 0.3 },
    failure: { frequency: 200, type: 'triangle' as OscillatorType, duration: 0.3 },
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
          playSound(survived ? 'success' : 'failure');
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
          playSound(survived ? 'success' : 'failure');
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
        onPointerDown={(e) => {
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
  // EGG SVG VISUALIZATION - PREMIUM GRAPHICS
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
    const impactForce = complete && !survived;

    return (
      <div className="relative">
        <svg viewBox="0 0 200 320" className="w-full h-64 md:h-80">
          <defs>
            {/* Premium sky gradient */}
            <linearGradient id="eggSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="30%" stopColor="#B0E0F6" />
              <stop offset="60%" stopColor="#D4EFFC" />
              <stop offset="100%" stopColor="#E8F7FE" />
            </linearGradient>

            {/* Ground gradient with depth */}
            <linearGradient id="eggGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B7355" />
              <stop offset="30%" stopColor="#78716C" />
              <stop offset="70%" stopColor="#5C534A" />
              <stop offset="100%" stopColor="#44403C" />
            </linearGradient>

            {/* Realistic egg shell gradient */}
            <radialGradient id="eggShellGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFEF5" />
              <stop offset="25%" stopColor="#FDF8E8" />
              <stop offset="50%" stopColor="#F5ECD8" />
              <stop offset="75%" stopColor="#EDE4CC" />
              <stop offset="100%" stopColor="#E8DCC0" />
            </radialGradient>

            {/* Egg yolk gradient */}
            <radialGradient id="eggYolkGradient" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="30%" stopColor="#FDD835" />
              <stop offset="60%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F9A825" />
            </radialGradient>

            {/* Foam padding gradient */}
            <linearGradient id="eggFoamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="25%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="75%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Thick foam gradient */}
            <linearGradient id="eggThickFoamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="25%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="75%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Platform metal gradient */}
            <linearGradient id="eggPlatformGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="20%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#64748B" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Egg glow filter */}
            <filter id="eggGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Success glow filter */}
            <filter id="eggSuccessGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#10B981" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Impact/danger glow filter */}
            <filter id="eggImpactGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#EF4444" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Foam cushion glow */}
            <filter id="eggFoamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow gradient */}
            <linearGradient id="eggForceArrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>

          {/* Premium sky background */}
          <rect x="0" y="0" width="200" height="280" fill="url(#eggSkyGradient)" />

          {/* Cloud decorations */}
          <ellipse cx="30" cy="40" rx="20" ry="10" fill="white" opacity="0.7" />
          <ellipse cx="45" cy="38" rx="15" ry="8" fill="white" opacity="0.7" />
          <ellipse cx="170" cy="60" rx="18" ry="9" fill="white" opacity="0.6" />
          <ellipse cx="160" cy="55" rx="12" ry="7" fill="white" opacity="0.6" />

          {/* Premium ground with grass line */}
          <rect x="0" y="280" width="200" height="40" fill="url(#eggGroundGradient)" />
          <rect x="0" y="278" width="200" height="4" fill="#65A30D" opacity="0.6" />

          {/* Building/platform with premium metal look */}
          <rect x="70" y="10" width="60" height="25" fill="url(#eggPlatformGradient)" rx="3" />
          <rect x="70" y="10" width="60" height="3" fill="white" opacity="0.3" rx="3" />

          {/* Padding on ground with premium gradients */}
          {paddingType !== 'none' && (
            <g filter="url(#eggFoamGlow)">
              <rect
                x="60" y={paddingType === 'thick' ? 255 : 265}
                width="80"
                height={paddingType === 'thick' ? 25 : 15}
                fill={paddingType === 'thick' ? 'url(#eggThickFoamGradient)' : 'url(#eggFoamGradient)'}
                rx="4"
              />
              {/* Foam texture highlights */}
              <rect
                x="62" y={paddingType === 'thick' ? 257 : 267}
                width="76"
                height="3"
                fill="white"
                opacity="0.3"
                rx="2"
              />
              {/* Foam bubble pattern */}
              {[0, 1, 2, 3, 4].map(i => (
                <circle
                  key={i}
                  cx={70 + i * 15}
                  cy={paddingType === 'thick' ? 268 : 273}
                  r={paddingType === 'thick' ? 4 : 3}
                  fill="white"
                  opacity="0.2"
                />
              ))}
            </g>
          )}

          {/* Egg - falling or landed */}
          {!complete ? (
            <g transform={`translate(100, ${eggY})`} filter="url(#eggGlow)">
              {/* Egg shadow */}
              <ellipse cx="2" cy="22" rx="12" ry="5" fill="black" opacity="0.2" />
              {/* Main egg shell */}
              <ellipse cx="0" cy="0" rx="15" ry="20" fill="url(#eggShellGradient)" />
              {/* Egg highlight */}
              <ellipse cx="-5" cy="-8" rx="6" ry="8" fill="white" opacity="0.4" />
              {/* Egg inner glow hint */}
              <ellipse cx="0" cy="5" rx="8" ry="10" fill="url(#eggYolkGradient)" opacity="0.15" />
            </g>
          ) : (
            <g transform="translate(100, 265)">
              {survived ? (
                // Intact egg with success glow
                <g filter="url(#eggSuccessGlow)">
                  {/* Egg shadow */}
                  <ellipse cx="2" cy="12" rx="12" ry="5" fill="black" opacity="0.2" />
                  {/* Main egg */}
                  <ellipse cx="0" cy="-10" rx="15" ry="20" fill="url(#eggShellGradient)" />
                  {/* Egg highlight */}
                  <ellipse cx="-5" cy="-18" rx="6" ry="8" fill="white" opacity="0.4" />
                  {/* Success checkmark circle */}
                  <circle cx="18" cy="-20" r="8" fill={colors.success} />
                  <path d="M14,-20 L17,-17 L22,-23" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                </g>
              ) : (
                // Cracked egg with impact effect
                <g filter="url(#eggImpactGlow)">
                  {/* Splattered yolk */}
                  <ellipse cx="0" cy="-3" rx="30" ry="12" fill="url(#eggYolkGradient)" opacity="0.9" />
                  {/* Shell fragments */}
                  <ellipse cx="-15" cy="-8" rx="10" ry="6" fill="url(#eggShellGradient)" transform="rotate(-15 -15 -8)" />
                  <ellipse cx="15" cy="-5" rx="12" ry="7" fill="url(#eggShellGradient)" transform="rotate(20 15 -5)" />
                  <ellipse cx="0" cy="-12" rx="8" ry="5" fill="url(#eggShellGradient)" transform="rotate(5 0 -12)" />
                  {/* Crack lines */}
                  <path d="M-12,-8 L-5,-18 L2,-10 L10,-22 L15,-8" fill="none" stroke={colors.cracked} strokeWidth="2" strokeLinecap="round" />
                  <path d="M-8,-5 L-3,-12 L5,-7" fill="none" stroke={colors.cracked} strokeWidth="1.5" strokeLinecap="round" />
                  {/* Impact rings */}
                  <circle cx="0" cy="0" r="35" fill="none" stroke={colors.cracked} strokeWidth="1" opacity="0.4" strokeDasharray="4,4" />
                  <circle cx="0" cy="0" r="45" fill="none" stroke={colors.cracked} strokeWidth="0.5" opacity="0.2" strokeDasharray="3,3" />
                </g>
              )}
            </g>
          )}

          {/* Force distribution arrows during impact */}
          {complete && (
            <g opacity="0.8">
              {paddingType === 'none' ? (
                // Single concentrated force arrow
                <g>
                  <line x1="100" y1="230" x2="100" y2="255" stroke="url(#eggForceArrowGradient)" strokeWidth="4" />
                  <polygon points="100,260 95,250 105,250" fill={colors.danger} />
                </g>
              ) : (
                // Distributed force arrows showing padding effect
                <>
                  {[-20, -10, 0, 10, 20].map((offset, i) => (
                    <g key={i}>
                      <line
                        x1={100 + offset}
                        y1={paddingType === 'thick' ? 225 : 235}
                        x2={100 + offset}
                        y2={paddingType === 'thick' ? 248 : 258}
                        stroke="url(#eggForceArrowGradient)"
                        strokeWidth="2"
                        opacity={1 - Math.abs(offset) * 0.02}
                      />
                      <polygon
                        points={`${100 + offset},${paddingType === 'thick' ? 252 : 262} ${97 + offset},${paddingType === 'thick' ? 248 : 258} ${103 + offset},${paddingType === 'thick' ? 248 : 258}`}
                        fill={colors.success}
                        opacity={0.7 - Math.abs(offset) * 0.01}
                      />
                    </g>
                  ))}
                </>
              )}
            </g>
          )}

          {/* Drop trajectory indicator */}
          {position < 100 && (
            <g>
              <line x1="145" y1="50" x2="145" y2="240" stroke="url(#eggForceArrowGradient)" strokeWidth="2" strokeDasharray="6,4" opacity="0.7" />
              <polygon points="145,248 140,238 150,238" fill={colors.primary} />
              {/* Motion lines */}
              <line x1="85" y1={eggY - 10} x2="90" y2={eggY - 15} stroke={colors.primary} strokeWidth="1.5" opacity="0.5" />
              <line x1="85" y1={eggY} x2="88" y2={eggY - 5} stroke={colors.primary} strokeWidth="1.5" opacity="0.4" />
              <line x1="85" y1={eggY + 10} x2="88" y2={eggY + 5} stroke={colors.primary} strokeWidth="1.5" opacity="0.3" />
            </g>
          )}
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-slate-700/90 px-3 py-1 rounded-full">
          <span style={{ fontSize: typo.small, fontWeight: 'bold', color: 'white' }}>
            {height === 'low' ? '1m' : height === 'medium' ? '3m' : '5m'}
          </span>
        </div>

        {paddingType !== 'none' && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded"
            style={{
              bottom: paddingType === 'thick' ? '52px' : '48px',
              backgroundColor: paddingType === 'thick' ? colors.padding : colors.foam,
              opacity: 0.9
            }}
          >
            <span style={{ fontSize: typo.label, fontWeight: 'bold', color: 'white' }}>
              {paddingType === 'thick' ? 'THICK FOAM' : 'FOAM'}
            </span>
          </div>
        )}

        {complete && (
          <div
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full"
            style={{
              backgroundColor: survived ? colors.success : colors.danger,
              boxShadow: `0 0 12px ${survived ? colors.success : colors.danger}`
            }}
          >
            <span style={{ fontSize: typo.body, fontWeight: 'bold', color: 'white' }}>
              {survived ? 'SAFE!' : 'BROKE!'}
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
    <div className="text-center">
      {renderSectionHeader('The Egg Drop Challenge', 'A physics puzzle about survival')}

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 mb-6 shadow-lg">
        <div className="relative">
          <svg viewBox="0 0 300 200" className="w-full h-48 md:h-56 mb-4">
            <defs>
              {/* Hook scene sky gradient */}
              <linearGradient id="eggHookSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7DD3FC" />
                <stop offset="40%" stopColor="#BAE6FD" />
                <stop offset="70%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#F0F9FF" />
              </linearGradient>

              {/* Hook scene ground gradient */}
              <linearGradient id="eggHookGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#84CC16" />
                <stop offset="30%" stopColor="#65A30D" />
                <stop offset="70%" stopColor="#4D7C0F" />
                <stop offset="100%" stopColor="#3F6212" />
              </linearGradient>

              {/* Building gradient */}
              <linearGradient id="eggHookBuildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="25%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="75%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Premium egg shell for hook */}
              <radialGradient id="eggHookShellGradient" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#FFFEF5" />
                <stop offset="30%" stopColor="#FDF8E8" />
                <stop offset="60%" stopColor="#F5ECD8" />
                <stop offset="100%" stopColor="#E8DCC0" />
              </radialGradient>

              {/* Foam packaging gradient */}
              <linearGradient id="eggHookFoamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="30%" stopColor="#60A5FA" />
                <stop offset="60%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>

              {/* Drop arrow gradient */}
              <linearGradient id="eggHookArrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>

              {/* Danger zone glow */}
              <filter id="eggHookDangerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#EF4444" floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Safe zone glow */}
              <filter id="eggHookSafeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#10B981" floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Question mark glow */}
              <filter id="eggHookQuestionGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Premium sky background */}
            <rect x="0" y="0" width="300" height="160" fill="url(#eggHookSkyGradient)" />

            {/* Clouds */}
            <ellipse cx="50" cy="25" rx="25" ry="12" fill="white" opacity="0.8" />
            <ellipse cx="70" cy="22" rx="18" ry="9" fill="white" opacity="0.8" />
            <ellipse cx="250" cy="35" rx="22" ry="10" fill="white" opacity="0.7" />
            <ellipse cx="235" cy="30" rx="15" ry="8" fill="white" opacity="0.7" />

            {/* Premium ground */}
            <rect x="0" y="160" width="300" height="40" fill="url(#eggHookGroundGradient)" />

            {/* Left building with premium look */}
            <rect x="30" y="20" width="60" height="80" fill="url(#eggHookBuildingGradient)" rx="2" />
            <rect x="30" y="20" width="60" height="4" fill="white" opacity="0.2" rx="2" />
            {/* Windows */}
            <rect x="38" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="55" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="72" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="38" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="55" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="72" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="38" y="70" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="55" y="70" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="72" y="70" width="12" height="10" fill="#1E293B" rx="1" />

            {/* Right building with premium look */}
            <rect x="210" y="20" width="60" height="80" fill="url(#eggHookBuildingGradient)" rx="2" />
            <rect x="210" y="20" width="60" height="4" fill="white" opacity="0.2" rx="2" />
            {/* Windows */}
            <rect x="218" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="235" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="252" y="30" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="218" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="235" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="252" y="50" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="218" y="70" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="235" y="70" width="12" height="10" fill="#1E293B" rx="1" />
            <rect x="252" y="70" width="12" height="10" fill="#1E293B" rx="1" />

            {/* Left egg (no protection) with danger glow */}
            <g transform="translate(60, 115)" filter="url(#eggHookDangerGlow)">
              <ellipse cx="0" cy="0" rx="12" ry="16" fill="url(#eggHookShellGradient)" />
              <ellipse cx="-4" cy="-6" rx="5" ry="6" fill="white" opacity="0.4" />
            </g>

            {/* Right egg (with foam) with safe glow */}
            <g transform="translate(240, 115)" filter="url(#eggHookSafeGlow)">
              {/* Foam packaging with texture */}
              <rect x="-22" y="-22" width="44" height="48" fill="url(#eggHookFoamGradient)" rx="6" />
              <rect x="-20" y="-20" width="40" height="4" fill="white" opacity="0.3" rx="4" />
              {/* Foam bubbles */}
              <circle cx="-10" cy="5" r="4" fill="white" opacity="0.15" />
              <circle cx="8" cy="-5" r="3" fill="white" opacity="0.15" />
              <circle cx="0" cy="15" r="3.5" fill="white" opacity="0.15" />
              {/* Egg inside */}
              <ellipse cx="0" cy="0" rx="12" ry="16" fill="url(#eggHookShellGradient)" />
              <ellipse cx="-4" cy="-6" rx="5" ry="6" fill="white" opacity="0.4" />
            </g>

            {/* Drop arrows with premium gradient */}
            <g opacity="0.8">
              <line x1="60" y1="100" x2="60" y2="140" stroke="url(#eggHookArrowGradient)" strokeWidth="3" strokeDasharray="5,3" />
              <polygon points="60,148 54,138 66,138" fill="#7C3AED" />

              <line x1="240" y1="100" x2="240" y2="140" stroke="url(#eggHookArrowGradient)" strokeWidth="3" strokeDasharray="5,3" />
              <polygon points="240,148 234,138 246,138" fill="#7C3AED" />
            </g>

            {/* Central question with glow */}
            <g filter="url(#eggHookQuestionGlow)">
              <rect x="105" y="80" width="90" height="35" fill="white" rx="8" opacity="0.9" />
              <rect x="105" y="80" width="90" height="35" fill="url(#eggHookArrowGradient)" rx="8" opacity="0.1" />
            </g>
          </svg>

          {/* Text labels outside SVG */}
          <div className="absolute" style={{ top: '30%', left: '16%', transform: 'translateX(-50%)' }}>
            <span
              className="bg-slate-700/80 px-2 py-0.5 rounded text-white"
              style={{ fontSize: typo.label, fontWeight: 'bold' }}
            >
              3 FLOORS
            </span>
          </div>
          <div className="absolute" style={{ top: '30%', right: '6%', transform: 'translateX(50%)' }}>
            <span
              className="bg-slate-700/80 px-2 py-0.5 rounded text-white"
              style={{ fontSize: typo.label, fontWeight: 'bold' }}
            >
              3 FLOORS
            </span>
          </div>
          <div className="absolute" style={{ bottom: '18%', left: '20%', transform: 'translateX(-50%)' }}>
            <span
              className="px-2 py-0.5 rounded text-white"
              style={{ fontSize: typo.small, fontWeight: 'bold', backgroundColor: colors.danger }}
            >
              NO PADDING
            </span>
          </div>
          <div className="absolute" style={{ bottom: '18%', right: '12%', transform: 'translateX(50%)' }}>
            <span
              className="px-2 py-0.5 rounded text-white"
              style={{ fontSize: typo.small, fontWeight: 'bold', backgroundColor: colors.success }}
            >
              FOAM WRAPPED
            </span>
          </div>
          <div className="absolute" style={{ top: '42%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <span
              className="px-3 py-1 rounded-lg text-white font-bold"
              style={{ fontSize: typo.bodyLarge, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
            >
              WHICH SURVIVES?
            </span>
          </div>
        </div>

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
              onPointerDown={(e) => {
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
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isDropping) {
                  setSelectedPadding(pad.id);
                  resetDrop();
                  playSound('click');
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
          onPointerDown={(e) => {
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
          onPointerDown={(e) => {
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
        <div className="relative">
          <svg viewBox="0 0 300 180" className="w-full h-40 mb-4">
            <defs>
              {/* Chart background gradient */}
              <linearGradient id="eggReviewBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAFAFA" />
                <stop offset="50%" stopColor="#F5F5F5" />
                <stop offset="100%" stopColor="#EEEEEE" />
              </linearGradient>

              {/* No padding danger gradient */}
              <linearGradient id="eggReviewDangerGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#FCA5A5" />
                <stop offset="30%" stopColor="#F87171" />
                <stop offset="60%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#DC2626" />
              </linearGradient>

              {/* Foam padding gradient */}
              <linearGradient id="eggReviewFoamGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="30%" stopColor="#60A5FA" />
                <stop offset="60%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>

              {/* Thick padding success gradient */}
              <linearGradient id="eggReviewSuccessGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="30%" stopColor="#34D399" />
                <stop offset="60%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Axis gradient */}
              <linearGradient id="eggReviewAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>

              {/* Chart glow filter */}
              <filter id="eggReviewChartGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Area shadow filter */}
              <filter id="eggReviewAreaShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Premium chart background */}
            <rect x="0" y="0" width="300" height="180" fill="url(#eggReviewBgGradient)" rx="10" />
            <rect x="0" y="0" width="300" height="180" fill="none" stroke="#E5E7EB" strokeWidth="1" rx="10" />

            {/* Grid lines */}
            <g opacity="0.3">
              <line x1="50" y1="50" x2="280" y2="50" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="50" y1="100" x2="280" y2="100" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="100" y1="20" x2="100" y2="150" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="165" y1="20" x2="165" y2="150" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="230" y1="20" x2="230" y2="150" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="4,4" />
            </g>

            {/* Axes with gradient */}
            <line x1="50" y1="150" x2="280" y2="150" stroke="url(#eggReviewAxisGradient)" strokeWidth="2" />
            <line x1="50" y1="150" x2="50" y2="20" stroke="url(#eggReviewAxisGradient)" strokeWidth="2" />
            {/* Arrow heads */}
            <polygon points="280,150 272,146 272,154" fill="#64748B" />
            <polygon points="50,20 46,28 54,28" fill="#64748B" />

            {/* No padding: tall narrow spike with gradient fill */}
            <g filter="url(#eggReviewAreaShadow)">
              <path d="M75,150 L90,25 L105,150 Z" fill="url(#eggReviewDangerGradient)" opacity="0.85" />
              <path d="M75,150 L90,25 L105,150" fill="none" stroke="#DC2626" strokeWidth="2" />
            </g>

            {/* Some padding: medium spike with gradient */}
            <g filter="url(#eggReviewAreaShadow)">
              <path d="M135,150 L155,65 L175,150 Z" fill="url(#eggReviewFoamGradient)" opacity="0.85" />
              <path d="M135,150 L155,65 L175,150" fill="none" stroke="#2563EB" strokeWidth="2" />
            </g>

            {/* Thick padding: wide low curve with gradient */}
            <g filter="url(#eggReviewAreaShadow)">
              <path d="M195,150 Q210,100 230,95 Q250,100 265,150 Z" fill="url(#eggReviewSuccessGradient)" opacity="0.85" />
              <path d="M195,150 Q210,100 230,95 Q250,100 265,150" fill="none" stroke="#059669" strokeWidth="2" />
            </g>

            {/* Force level indicators */}
            <g opacity="0.6">
              <line x1="45" y1="25" x2="55" y2="25" stroke={colors.danger} strokeWidth="2" />
              <line x1="45" y1="65" x2="55" y2="65" stroke={colors.foam} strokeWidth="2" />
              <line x1="45" y1="95" x2="55" y2="95" stroke={colors.success} strokeWidth="2" />
            </g>
          </svg>

          {/* Text labels outside SVG */}
          <div className="absolute" style={{ bottom: '12%', left: '50%', transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: typo.small, color: '#64748B' }}>Time</span>
          </div>
          <div className="absolute" style={{ top: '45%', left: '3%', transform: 'rotate(-90deg) translateX(-50%)' }}>
            <span style={{ fontSize: typo.small, color: '#64748B' }}>Force</span>
          </div>
          <div className="absolute" style={{ top: '5%', left: '50%', transform: 'translateX(-50%)' }}>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{
                fontSize: typo.small,
                fontWeight: 'bold',
                color: 'white',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              }}
            >
              SAME AREA = SAME IMPULSE
            </span>
          </div>
          <div className="flex justify-around mt-1">
            <span style={{ fontSize: typo.label, fontWeight: 'bold', color: colors.danger }}>No pad</span>
            <span style={{ fontSize: typo.label, fontWeight: 'bold', color: colors.foam }}>Foam</span>
            <span style={{ fontSize: typo.label, fontWeight: 'bold', color: colors.success }}>Thick</span>
          </div>
        </div>

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
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isDropping) {
                  setTwistHeight(h.id);
                  resetTwistDrop();
                  playSound('click');
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
          onPointerDown={(e) => {
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
          onPointerDown={(e) => {
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
        <div className="relative">
          <svg viewBox="0 0 300 150" className="w-full h-36 mb-4">
            <defs>
              {/* Background gradient */}
              <linearGradient id="eggTwistBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAFAFA" />
                <stop offset="50%" stopColor="#F8F8FF" />
                <stop offset="100%" stopColor="#F5F3FF" />
              </linearGradient>

              {/* Success momentum gradient */}
              <radialGradient id="eggTwistSuccessGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#34D399" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
              </radialGradient>

              {/* Warning momentum gradient */}
              <radialGradient id="eggTwistWarningGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.2" />
              </radialGradient>

              {/* Danger momentum gradient */}
              <radialGradient id="eggTwistDangerGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FCA5A5" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#F87171" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
              </radialGradient>

              {/* Circle glow filters */}
              <filter id="eggTwistSuccessGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#10B981" floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="eggTwistWarningGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#F59E0B" floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="eggTwistDangerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#EF4444" floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Premium background */}
            <rect x="0" y="0" width="300" height="150" fill="url(#eggTwistBgGradient)" rx="10" />
            <rect x="0" y="0" width="300" height="150" fill="none" stroke="#E5E7EB" strokeWidth="1" rx="10" />

            {/* Connecting arrows showing progression */}
            <g opacity="0.4">
              <line x1="75" y1="65" x2="115" y2="65" stroke="#64748B" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="185" y1="65" x2="210" y2="65" stroke="#64748B" strokeWidth="2" markerEnd="url(#arrow)" />
              <polygon points="120,65 112,61 112,69" fill="#64748B" />
              <polygon points="215,65 207,61 207,69" fill="#64748B" />
            </g>

            {/* 1m scenario with glow */}
            <g transform="translate(50, 65)" filter="url(#eggTwistSuccessGlow)">
              <circle cx="0" cy="0" r="22" fill="url(#eggTwistSuccessGradient)" />
              <circle cx="0" cy="0" r="22" fill="none" stroke={colors.success} strokeWidth="2" opacity="0.6" />
              {/* Momentum ring */}
              <circle cx="0" cy="0" r="18" fill="none" stroke={colors.success} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
            </g>

            {/* 3m scenario with warning glow */}
            <g transform="translate(150, 65)" filter="url(#eggTwistWarningGlow)">
              <circle cx="0" cy="0" r="32" fill="url(#eggTwistWarningGradient)" />
              <circle cx="0" cy="0" r="32" fill="none" stroke={colors.accent} strokeWidth="2" opacity="0.6" />
              {/* Momentum rings */}
              <circle cx="0" cy="0" r="26" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              <circle cx="0" cy="0" r="20" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
            </g>

            {/* 5m scenario with danger glow */}
            <g transform="translate(250, 65)" filter="url(#eggTwistDangerGlow)">
              <circle cx="0" cy="0" r="42" fill="url(#eggTwistDangerGradient)" />
              <circle cx="0" cy="0" r="42" fill="none" stroke={colors.danger} strokeWidth="2" opacity="0.6" />
              {/* Momentum rings showing high energy */}
              <circle cx="0" cy="0" r="35" fill="none" stroke={colors.danger} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              <circle cx="0" cy="0" r="28" fill="none" stroke={colors.danger} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
              <circle cx="0" cy="0" r="21" fill="none" stroke={colors.danger} strokeWidth="1" strokeDasharray="3,3" opacity="0.2" />
            </g>
          </svg>

          {/* Text labels outside SVG using typo system */}
          <div className="absolute" style={{ top: '8%', left: '50%', transform: 'translateX(-50%)' }}>
            <span
              className="px-3 py-1 rounded-full text-white"
              style={{
                fontSize: typo.small,
                fontWeight: 'bold',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              }}
            >
              v = sqrt(2gh) - Velocity increases with height!
            </span>
          </div>

          {/* Height labels */}
          <div className="flex justify-around absolute w-full" style={{ top: '38%' }}>
            <span style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: colors.success, marginLeft: '8%' }}>1m</span>
            <span style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: colors.accent }}>3m</span>
            <span style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: colors.danger, marginRight: '5%' }}>5m</span>
          </div>

          {/* Velocity and status labels */}
          <div className="flex justify-around mt-2">
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#64748B' }}>v = 4.4 m/s</div>
              <div style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.success }}>Safe</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#64748B' }}>v = 7.7 m/s</div>
              <div style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.success }}>Safe</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#64748B' }}>v = 10 m/s</div>
              <div style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.danger }}>Breaks</div>
            </div>
          </div>
        </div>

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
                    onPointerDown={(e) => {
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
                onPointerDown={(e) => {
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
