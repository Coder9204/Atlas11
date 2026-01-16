'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// MOMENTUM CONSERVATION - Premium Apple/Airbnb Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'push_release' | 'mass_change' | 'friction_toggle' | 'reset' | 'answer_submit';
}

interface MomentumConservationRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// ============================================================================
// PREMIUM DESIGN TOKENS - Apple/Airbnb Quality
// ============================================================================
const design = {
  colors: {
    // Refined dark theme with depth
    bgDeep: '#05050a',
    bgPrimary: '#0c0c14',
    bgSecondary: '#14141f',
    bgTertiary: '#1c1c2a',
    bgCard: '#1a1a28',
    bgElevated: '#242436',
    bgHover: '#2a2a3d',

    // High contrast text
    textPrimary: '#ffffff',
    textSecondary: '#b4b4c7',
    textMuted: '#7a7a90',
    textDisabled: '#505065',

    // Brand colors
    accentBlue: '#3b82f6',
    accentBlueHover: '#2563eb',
    accentBlueMuted: 'rgba(59, 130, 246, 0.15)',
    accentOrange: '#f97316',
    accentOrangeMuted: 'rgba(249, 115, 22, 0.15)',

    // Cart colors
    cartBlue: '#4f8ff7',
    cartBlueDark: '#2563eb',
    cartOrange: '#fb923c',
    cartOrangeDark: '#ea580c',

    // Functional
    spring: '#22c55e',
    track: '#3d3d50',
    carpet: '#8b6b4a',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',

    // Borders
    border: '#2a2a3d',
    borderLight: '#353548',
    borderFocus: '#3b82f6',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 4px 16px rgba(0,0,0,0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 24px ${color}40`,
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const MomentumConservationRenderer: React.FC<MomentumConservationRendererProps> = ({
  width = 400,
  height = 500,
  onGameEvent,
  gamePhase
}) => {
  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [massLeft, setMassLeft] = useState(1);
  const [massRight, setMassRight] = useState(2);
  const [hasFriction, setHasFriction] = useState(false);
  const [isCompressed, setIsCompressed] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leftPos, setLeftPos] = useState(0);
  const [rightPos, setRightPos] = useState(0);
  const [leftVel, setLeftVel] = useState(0);
  const [rightVel, setRightVel] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Refs for debouncing
  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Test questions
  const testQuestions = [
    { question: "Two carts push off each other. If cart A is heavier, which cart moves faster?", options: ["Cart A (heavier)", "Cart B (lighter)", "Both same speed", "Neither moves"], correct: 1, explanation: "The lighter cart moves faster. Since momentum is conserved and starts at zero, m₁v₁ = m₂v₂. The lighter cart needs higher velocity to match the heavier cart's momentum." },
    { question: "What is the total momentum before and after two stationary carts push off?", options: ["Increases after", "Decreases after", "Zero both times", "Depends on masses"], correct: 2, explanation: "Total momentum is conserved. Starting at rest = zero momentum. After pushing, momenta are equal and opposite, still summing to zero." },
    { question: "If a 1kg cart and 3kg cart push off, and the 1kg cart moves at 6 m/s, how fast is the 3kg cart?", options: ["6 m/s", "2 m/s", "18 m/s", "3 m/s"], correct: 1, explanation: "Using p₁ = p₂: 1kg × 6m/s = 3kg × v₂, so v₂ = 2 m/s. The heavier cart moves slower." },
    { question: "Why doesn't total momentum equal zero on carpet (with friction)?", options: ["Friction creates momentum", "Momentum transfers to Earth", "Carts are heavier", "Momentum is destroyed"], correct: 1, explanation: "Friction transfers momentum to Earth. The Earth-cart system still conserves momentum, but Earth's huge mass means negligible motion." },
    { question: "Two ice skaters push off each other. What happens?", options: ["Only lighter one moves", "Only heavier one moves", "Both move opposite ways", "Neither moves on ice"], correct: 2, explanation: "Both skaters move in opposite directions. The lighter skater moves faster, but both acquire equal and opposite momenta." },
    { question: "Momentum is calculated as:", options: ["mass × acceleration", "mass × velocity", "force × time", "mass × distance"], correct: 1, explanation: "Momentum (p) equals mass times velocity: p = mv. It's a vector quantity with both magnitude and direction." },
    { question: "A gun recoils when fired. This demonstrates:", options: ["Energy conservation", "Momentum conservation", "Mass conservation", "Friction effects"], correct: 1, explanation: "Gun recoil demonstrates momentum conservation. The bullet gains forward momentum, so the gun gains equal backward momentum." },
    { question: "If you double both masses but keep the spring the same, what happens to velocities?", options: ["Both double", "Both halve", "Stay the same", "One doubles, one halves"], correct: 1, explanation: "Same spring impulse but doubled masses means both velocities halve. Total momentum of each cart stays similar, but v = p/m means lower velocity." },
    { question: "Why is momentum a vector quantity?", options: ["Only has magnitude", "Has magnitude and direction", "Always positive", "Doesn't change"], correct: 1, explanation: "Momentum is a vector because it has both magnitude (how much) and direction (which way). Opposite momenta cancel in the sum." },
    { question: "In space, an astronaut throws a tool. What happens?", options: ["Only tool moves", "Both move opposite ways", "Neither moves in space", "Astronaut moves faster"], correct: 1, explanation: "Both move in opposite directions due to momentum conservation. The lighter tool moves faster than the heavier astronaut." }
  ];

  // Real-world applications with graphics
  const applications = [
    {
      id: 'rocket',
      title: "Rocket Propulsion",
      description: "Rockets expel exhaust gases backward at high speed, gaining forward momentum. Newton's third law in action—the faster and more massive the exhaust, the more thrust generated.",
      formula: "F = Δp/Δt = ṁ × vₑ",
      stat: "Saturn V thrust: 35 million N",
      color: design.colors.accentOrange,
    },
    {
      id: 'skating',
      title: "Ice Skating Pairs",
      description: "When skaters push off each other, the lighter skater moves faster. Choreographers use this principle for dramatic separations in performances.",
      formula: "m₁v₁ = m₂v₂",
      stat: "Push-off speeds: 2-5 m/s",
      color: design.colors.accentBlue,
    },
    {
      id: 'cradle',
      title: "Newton's Cradle",
      description: "Momentum transfers through the balls via elastic collisions. Lift one ball, and one ball swings out the other side with nearly equal momentum.",
      formula: "p_before = p_after",
      stat: "~95% momentum transfer",
      color: design.colors.success,
    },
    {
      id: 'billiards',
      title: "Billiard Physics",
      description: "When the cue ball strikes another ball, momentum transfers. A direct center hit can transfer nearly all momentum to the target ball, stopping the cue.",
      formula: "½m₁v₁² = ½m₂v₂² + losses",
      stat: "Cue ball: ~170g at 10 m/s",
      color: '#a855f7',
    }
  ];

  // Effects
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Event emitter
  const emit = useCallback((type: GameEvent['type'], data: Record<string, unknown>, eventType?: GameEvent['eventType']) => {
    onGameEvent?.({ type, phase, data, timestamp: Date.now(), eventType });
  }, [onGameEvent, phase]);

  // Navigation with strong debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // Physics simulation
  const releaseCarts = useCallback(() => {
    if (isAnimating || !isCompressed) return;
    setIsAnimating(true);
    setIsCompressed(false);

    const springImpulse = 10;
    const initialVelLeft = -springImpulse / massLeft;
    const initialVelRight = springImpulse / massRight;
    const friction = hasFriction ? 0.015 : 0.001;

    let vL = initialVelLeft;
    let vR = initialVelRight;
    let pL = 0;
    let pR = 0;

    emit('interaction', { massLeft, massRight, hasFriction }, 'push_release');

    const animate = () => {
      vL *= (1 - friction);
      vR *= (1 - friction);
      pL += vL * 0.5;
      pR += vR * 0.5;

      setLeftPos(pL);
      setRightPos(pR);
      setLeftVel(vL);
      setRightVel(vR);

      if (Math.abs(vL) > 0.05 || Math.abs(vR) > 0.05) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setExperimentCount(prev => prev + 1);
        emit('result', { finalPosLeft: pL, finalPosRight: pR, massLeft, massRight, hasFriction });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, isCompressed, massLeft, massRight, hasFriction, emit]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsCompressed(true);
    setIsAnimating(false);
    setLeftPos(0);
    setRightPos(0);
    setLeftVel(0);
    setRightVel(0);
    emit('interaction', { action: 'reset' }, 'reset');
  }, [emit]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === testQuestions[currentQuestion].correct;
    if (isCorrect) setCorrectAnswers(prev => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emit('interaction', { question: currentQuestion, answer: answerIndex, correct: isCorrect }, 'answer_submit');
  }, [currentQuestion, answeredQuestions, emit, testQuestions]);

  // ============================================================================
  // HELPER FUNCTIONS - Premium Button & Progress
  // ============================================================================
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    fullWidth = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles = {
      sm: { padding: '10px 18px', fontSize: 13 },
      md: { padding: '14px 28px', fontSize: 15 },
      lg: { padding: '18px 36px', fontSize: 16 }
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentBlue} 0%, ${design.colors.accentBlueHover} 100%)`,
        color: '#fff',
        boxShadow: design.shadow.md,
      },
      secondary: {
        background: design.colors.bgTertiary,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
        color: '#fff',
        boxShadow: design.shadow.md,
      }
    };

    return (
      <button
        onMouseDown={() => {
          if (disabled || navigationLockRef.current) return;
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        disabled={disabled}
        style={{
          ...sizeStyles[size],
          ...variants[variant],
          borderRadius: design.radius.md,
          fontWeight: 600,
          fontFamily: design.font.sans,
          border: variants[variant].border || 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {label}
      </button>
    );
  };

  const renderProgressBar = () => {
    const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    return (
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', gap: 4,
      }}>
        {phaseList.map((p, idx) => (
          <div key={p} style={{
            width: 8, height: 8, borderRadius: design.radius.full,
            background: phase === p
              ? design.colors.accentBlue
              : idx < phaseList.indexOf(phase)
                ? design.colors.success
                : design.colors.bgElevated,
            transition: 'all 0.3s ease',
            boxShadow: phase === p ? design.shadow.glow(design.colors.accentBlue) : 'none',
          }} />
        ))}
      </div>
    );
  };

  // ============================================================================
  // VISUALIZATION - Premium Cart Animation
  // ============================================================================
  const renderVisualization = () => {
    const trackY = 140;
    const centerX = width / 2;
    const cartWidth = 56;
    const cartHeight = 38;
    const leftCartX = centerX - 70 + leftPos * 3;
    const rightCartX = centerX + 14 + rightPos * 3;
    const springLen = isCompressed ? 24 : 60;

    const momentumLeft = massLeft * leftVel;
    const momentumRight = massRight * rightVel;
    const totalMomentum = momentumLeft + momentumRight;

    return (
      <svg width={width} height={260} style={{ display: 'block', background: design.colors.bgDeep }}>
        <defs>
          <linearGradient id="mc-cart-blue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.cartBlue} />
            <stop offset="100%" stopColor={design.colors.cartBlueDark} />
          </linearGradient>
          <linearGradient id="mc-cart-orange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.cartOrange} />
            <stop offset="100%" stopColor={design.colors.cartOrangeDark} />
          </linearGradient>
          <linearGradient id="mc-track" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hasFriction ? '#a07a55' : '#4a4a5e'} />
            <stop offset="100%" stopColor={hasFriction ? design.colors.carpet : design.colors.track} />
          </linearGradient>
          <filter id="mc-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="mc-glow-blue">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={design.colors.accentBlue} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="mc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={design.colors.border} strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={width} height={260} fill="url(#mc-grid)" />

        {/* Track with shine */}
        <rect x={24} y={trackY + cartHeight + 8} width={width - 48} height={14} rx={3} fill="url(#mc-track)" />
        <rect x={24} y={trackY + cartHeight + 8} width={width - 48} height={4} rx={2} fill="rgba(255,255,255,0.08)" />

        {/* Track label */}
        <text x={width - 32} y={trackY + cartHeight + 38} textAnchor="end" fill={design.colors.textMuted} fontSize={11} fontFamily={design.font.sans}>
          {hasFriction ? 'Carpet (μ = 0.3)' : 'Frictionless track'}
        </text>

        {/* Spring mechanism */}
        <g transform={`translate(${leftCartX + cartWidth}, ${trackY + cartHeight / 2})`}>
          {isCompressed ? (
            <g>
              <path
                d={`M0 0 ${Array.from({length: 8}, (_, i) => `L${3 + i * 3} ${i % 2 === 0 ? -6 : 6}`).join(' ')} L${springLen} 0`}
                stroke={design.colors.spring} strokeWidth={3.5} fill="none" strokeLinecap="round"
              />
              <circle cx={springLen / 2} cy={0} r={5} fill={design.colors.spring} opacity={0.6}>
                <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </g>
          ) : (
            <line x1={0} y1={0} x2={Math.max(20, rightCartX - leftCartX - cartWidth - 8)} y2={0}
                  stroke={design.colors.spring} strokeWidth={2} strokeDasharray="6,4" opacity={0.4} />
          )}
        </g>

        {/* Left Cart */}
        <g filter="url(#mc-shadow)">
          <rect x={leftCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#mc-cart-blue)" />
          <rect x={leftCartX + 4} y={trackY + 4} width={cartWidth - 8} height={8} rx={2} fill="rgba(255,255,255,0.2)" />
          <text x={leftCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 6} textAnchor="middle"
                fill="#fff" fontSize={15} fontWeight="700" fontFamily={design.font.sans}>
            {massLeft} kg
          </text>
          {/* Wheels */}
          <circle cx={leftCartX + 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={leftCartX + 14} cy={trackY + cartHeight + 5} r={3} fill="#4a4a60" />
          <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={3} fill="#4a4a60" />
        </g>

        {/* Right Cart */}
        <g filter="url(#mc-shadow)">
          <rect x={rightCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#mc-cart-orange)" />
          <rect x={rightCartX + 4} y={trackY + 4} width={cartWidth - 8} height={8} rx={2} fill="rgba(255,255,255,0.2)" />
          <text x={rightCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 6} textAnchor="middle"
                fill="#fff" fontSize={15} fontWeight="700" fontFamily={design.font.sans}>
            {massRight} kg
          </text>
          <circle cx={rightCartX + 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={rightCartX + 14} cy={trackY + cartHeight + 5} r={3} fill="#4a4a60" />
          <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={7} fill="#1a1a25" stroke="#3a3a50" strokeWidth={2} />
          <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={3} fill="#4a4a60" />
        </g>

        {/* Velocity arrows */}
        {!isCompressed && Math.abs(leftVel) > 0.1 && (
          <g transform={`translate(${leftCartX + cartWidth / 2}, ${trackY - 20})`}>
            <line x1={0} y1={0} x2={leftVel * 6} y2={0} stroke={design.colors.accentBlue} strokeWidth={3} strokeLinecap="round" />
            <polygon points={`${leftVel * 6},0 ${leftVel * 6 + (leftVel > 0 ? -8 : 8)},-5 ${leftVel * 6 + (leftVel > 0 ? -8 : 8)},5`} fill={design.colors.accentBlue} />
            <text x={leftVel * 3} y={-10} textAnchor="middle" fill={design.colors.accentBlue} fontSize={11} fontWeight="600" fontFamily={design.font.sans}>
              v = {Math.abs(leftVel).toFixed(1)}
            </text>
          </g>
        )}
        {!isCompressed && Math.abs(rightVel) > 0.1 && (
          <g transform={`translate(${rightCartX + cartWidth / 2}, ${trackY - 20})`}>
            <line x1={0} y1={0} x2={rightVel * 6} y2={0} stroke={design.colors.accentOrange} strokeWidth={3} strokeLinecap="round" />
            <polygon points={`${rightVel * 6},0 ${rightVel * 6 + (rightVel > 0 ? -8 : 8)},-5 ${rightVel * 6 + (rightVel > 0 ? -8 : 8)},5`} fill={design.colors.accentOrange} />
            <text x={rightVel * 3} y={-10} textAnchor="middle" fill={design.colors.accentOrange} fontSize={11} fontWeight="600" fontFamily={design.font.sans}>
              v = {Math.abs(rightVel).toFixed(1)}
            </text>
          </g>
        )}

        {/* Momentum display */}
        <g transform={`translate(20, 220)`}>
          <text x={0} y={0} fill={design.colors.textSecondary} fontSize={12} fontWeight="600" fontFamily={design.font.sans}>
            Momentum (p = mv)
          </text>

          {/* Momentum bars */}
          <rect x={0} y={8} width={100} height={8} rx={4} fill={design.colors.bgTertiary} />
          <rect x={50 - Math.min(50, Math.abs(momentumLeft) * 3)} y={8} width={Math.min(50, Math.abs(momentumLeft) * 3)} height={8} rx={4} fill={design.colors.accentBlue} />
          <text x={110} y={16} fill={design.colors.accentBlue} fontSize={11} fontWeight="600" fontFamily={design.font.mono}>
            p₁ = {momentumLeft.toFixed(1)}
          </text>

          <rect x={180} y={8} width={100} height={8} rx={4} fill={design.colors.bgTertiary} />
          <rect x={230} y={8} width={Math.min(50, Math.abs(momentumRight) * 3)} height={8} rx={4} fill={design.colors.accentOrange} />
          <text x={290} y={16} fill={design.colors.accentOrange} fontSize={11} fontWeight="600" fontFamily={design.font.mono}>
            p₂ = {momentumRight.toFixed(1)}
          </text>
        </g>

        {/* Total momentum badge */}
        <g transform={`translate(${width - 90}, 15)`}>
          <rect x={0} y={0} width={75} height={32} rx={8} fill={Math.abs(totalMomentum) < 0.5 ? design.colors.successMuted : design.colors.bgTertiary}
                stroke={Math.abs(totalMomentum) < 0.5 ? design.colors.success : design.colors.border} strokeWidth={1} />
          <text x={37} y={14} textAnchor="middle" fill={design.colors.textMuted} fontSize={9} fontFamily={design.font.sans}>Σp</text>
          <text x={37} y={26} textAnchor="middle" fill={Math.abs(totalMomentum) < 0.5 ? design.colors.success : design.colors.textPrimary}
                fontSize={12} fontWeight="700" fontFamily={design.font.mono}>
            {totalMomentum.toFixed(1)}
          </text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // APPLICATION GRAPHIC - Transfer Phase Visuals
  // ============================================================================
  const renderApplicationGraphic = (appId: string) => {
    return (
      <svg width="100%" height={120} viewBox="0 0 340 120" style={{ marginBottom: design.spacing.md }}>
        <rect width={340} height={120} fill={design.colors.bgDeep} rx={12} />

        {appId === 'rocket' && (
          // Rocket propulsion
          <g>
            <defs>
              <linearGradient id="rocket-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>
              <radialGradient id="flame" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#dc2626" />
              </radialGradient>
            </defs>
            <polygon points="200,30 230,60 200,90 180,90 180,30" fill="url(#rocket-body)" />
            <polygon points="230,60 240,55 240,65" fill="#374151" />
            <rect x={165} y={45} width={15} height={30} fill="#374151" />
            {/* Exhaust */}
            <ellipse cx={140} cy={60} rx={30} ry={20} fill="url(#flame)" opacity={0.9}>
              <animate attributeName="rx" values="25;35;25" dur="0.3s" repeatCount="indefinite" />
            </ellipse>
            {/* Arrows */}
            <line x1={100} y1={60} x2={60} y2={60} stroke={design.colors.accentOrange} strokeWidth={3} />
            <polygon points="60,60 68,55 68,65" fill={design.colors.accentOrange} />
            <text x={50} y={55} fill={design.colors.accentOrange} fontSize={10} textAnchor="end">Exhaust</text>
            <line x1={250} y1={60} x2={290} y2={60} stroke={design.colors.accentBlue} strokeWidth={3} />
            <polygon points="290,60 282,55 282,65" fill={design.colors.accentBlue} />
            <text x={300} y={55} fill={design.colors.accentBlue} fontSize={10}>Thrust</text>
          </g>
        )}

        {appId === 'skating' && (
          // Ice skaters
          <g>
            <rect x={20} y={95} width={300} height={15} fill="#a5d8ff" rx={2} />
            <text x={170} y={107} textAnchor="middle" fill="#1971c2" fontSize={9}>Ice</text>
            {/* Skater 1 */}
            <ellipse cx={100} cy={70} rx={15} ry={25} fill={design.colors.accentBlue} />
            <circle cx={100} cy={45} r={12} fill="#fcd5ce" />
            <line x1={75} y1={70} x2={55} y2={70} stroke={design.colors.accentBlue} strokeWidth={3} />
            <polygon points="55,70 63,65 63,75" fill={design.colors.accentBlue} />
            {/* Skater 2 */}
            <ellipse cx={240} cy={70} rx={12} ry={20} fill={design.colors.accentOrange} />
            <circle cx={240} cy={50} r={10} fill="#fcd5ce" />
            <line x1={260} y1={70} x2={290} y2={70} stroke={design.colors.accentOrange} strokeWidth={3} />
            <polygon points="290,70 282,65 282,75" fill={design.colors.accentOrange} />
            <text x={170} y={70} textAnchor="middle" fill={design.colors.textMuted} fontSize={10}>push!</text>
          </g>
        )}

        {appId === 'cradle' && (
          // Newton's cradle
          <g>
            <rect x={100} y={15} width={140} height={8} fill="#6b7280" rx={2} />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line x1={120 + i * 25} y1={23} x2={120 + i * 25 + (i === 0 ? -20 : 0)} y2={i === 0 ? 55 : 75}
                      stroke="#9ca3af" strokeWidth={1.5} />
                <circle cx={120 + i * 25 + (i === 0 ? -20 : 0)} cy={i === 0 ? 55 : 75} r={12}
                        fill={i === 0 ? design.colors.accentBlue : '#d1d5db'}
                        stroke="#9ca3af" strokeWidth={1}>
                  {i === 0 && <animate attributeName="cx" values="100;120;100" dur="1s" repeatCount="indefinite" />}
                </circle>
              </g>
            ))}
            <circle cx={220} cy={75} r={12} fill={design.colors.accentOrange}>
              <animate attributeName="cx" values="220;240;220" dur="1s" repeatCount="indefinite" begin="0.5s" />
            </circle>
          </g>
        )}

        {appId === 'billiards' && (
          // Billiards
          <g>
            <rect x={40} y={30} width={260} height={80} fill="#15803d" rx={8} />
            <rect x={45} y={35} width={250} height={70} fill="#166534" rx={6} />
            {/* Cue ball */}
            <circle cx={100} cy={70} r={14} fill="#f5f5f4" stroke="#d6d3d1" strokeWidth={2}>
              <animate attributeName="cx" values="100;150;100" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Target ball */}
            <circle cx={200} cy={70} r={14} fill={design.colors.accentBlue} stroke="#1e40af" strokeWidth={2}>
              <animate attributeName="cx" values="200;260;200" dur="2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            {/* Pockets */}
            <circle cx={50} cy={40} r={8} fill="#0a0a0a" />
            <circle cx={50} cy={100} r={8} fill="#0a0a0a" />
            <circle cx={290} cy={40} r={8} fill="#0a0a0a" />
            <circle cx={290} cy={100} r={8} fill="#0a0a0a" />
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS - Premium Design
  // ============================================================================

  const renderHook = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: design.spacing.xl,
      background: `linear-gradient(180deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    }}>
      {/* Hero icon */}
      <div style={{
        fontSize: isMobile ? 52 : 64, marginBottom: design.spacing.lg,
        filter: `drop-shadow(0 8px 24px ${design.colors.accentBlue}40)`,
        animation: 'float 3s ease-in-out infinite',
      }}>
        🛒💥🛒
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: isMobile ? 22 : 26, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, textAlign: 'center', margin: 0, marginBottom: design.spacing.sm,
        letterSpacing: '-0.5px',
      }}>
        Momentum Conservation
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', maxWidth: 300, lineHeight: 1.6, margin: 0, marginBottom: design.spacing.xl,
      }}>
        Two carts connected by a compressed spring. Release them and discover the physics of momentum.
      </p>

      {/* Hook question card */}
      <div style={{
        background: design.colors.accentBlueMuted,
        border: `1px solid ${design.colors.accentBlue}50`,
        borderRadius: design.radius.lg, padding: '20px 24px',
        maxWidth: 320, marginBottom: design.spacing.xl,
      }}>
        <p style={{
          fontSize: isMobile ? 15 : 17, color: design.colors.accentBlue, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, lineHeight: 1.5, margin: 0,
        }}>
          "If one cart is heavier, which one moves faster after they push off?"
        </p>
      </div>

      {/* CTA Button */}
      {renderButton("Let's Find Out →", () => goToPhase('predict'), 'primary', false, false, 'lg')}

      {/* Footer */}
      <p style={{
        fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
        marginTop: design.spacing.xl, letterSpacing: '0.5px',
      }}>
        CONSERVATION OF MOMENTUM • p = mv
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🤔</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm,
      }}>
        Make Your Prediction
      </h2>
      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', margin: 0, marginBottom: design.spacing.lg,
      }}>
        A 1kg cart and 2kg cart push off. Which moves faster?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'heavy', label: 'The heavy cart (2kg) moves faster', icon: '🏋️' },
          { id: 'light', label: 'The light cart (1kg) moves faster', icon: '🪶' },
          { id: 'same', label: 'Both move at the same speed', icon: '⚖️' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => { setPrediction(option.id); emit('prediction', { prediction: option.id }); }}
            style={{
              padding: '16px 20px', borderRadius: design.radius.md,
              border: prediction === option.id ? `2px solid ${design.colors.accentBlue}` : `1px solid ${design.colors.border}`,
              background: prediction === option.id ? design.colors.accentBlueMuted : design.colors.bgSecondary,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: design.spacing.md,
              transition: 'all 0.2s ease', outline: 'none',
            }}
          >
            <span style={{ fontSize: 24 }}>{option.icon}</span>
            <span style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, fontWeight: 500, textAlign: 'left' }}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {prediction && (
        <div style={{ marginTop: design.spacing.xl }}>
          {renderButton('Test It! →', () => goToPhase('play'))}
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}

      <div style={{
        flex: 1, padding: design.spacing.lg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: design.spacing.md, background: design.colors.bgSecondary,
      }}>
        {/* Mass controls */}
        <div style={{ display: 'flex', gap: design.spacing.lg, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.sm }}>
            <span style={{ fontSize: 13, color: design.colors.accentBlue, fontFamily: design.font.sans, fontWeight: 600 }}>Left:</span>
            {[1, 2, 3].map(m => (
              <button key={m} onMouseDown={() => { setMassLeft(m); resetExperiment(); }} disabled={isAnimating}
                style={{
                  width: 36, height: 36, borderRadius: design.radius.full, border: 'none',
                  background: massLeft === m ? design.colors.accentBlue : design.colors.bgTertiary,
                  color: massLeft === m ? '#fff' : design.colors.textSecondary,
                  fontWeight: 700, fontSize: 14, cursor: isAnimating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                {m}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: design.colors.border }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.sm }}>
            <span style={{ fontSize: 13, color: design.colors.accentOrange, fontFamily: design.font.sans, fontWeight: 600 }}>Right:</span>
            {[1, 2, 3].map(m => (
              <button key={m} onMouseDown={() => { setMassRight(m); resetExperiment(); }} disabled={isAnimating}
                style={{
                  width: 36, height: 36, borderRadius: design.radius.full, border: 'none',
                  background: massRight === m ? design.colors.accentOrange : design.colors.bgTertiary,
                  color: massRight === m ? '#fff' : design.colors.textSecondary,
                  fontWeight: 700, fontSize: 14, cursor: isAnimating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: design.spacing.sm }}>
          {isCompressed ? (
            renderButton('🚀 Release Spring', releaseCarts, 'success', isAnimating)
          ) : (
            renderButton('↺ Reset', resetExperiment, 'secondary')
          )}
        </div>

        {/* Experiment counter */}
        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0, textAlign: 'center' }}>
          Experiments: {experimentCount} • Try different mass combinations
        </p>

        {experimentCount >= 2 && (
          renderButton('I see the pattern →', () => goToPhase('review'))
        )}
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary, overflowY: 'auto',
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>💡</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.md,
      }}>
        Momentum Conservation!
      </h2>

      {/* Main formula card */}
      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.lg, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 16, color: design.colors.accentBlue, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, margin: 0, marginBottom: design.spacing.sm,
        }}>
          Total momentum before = Total momentum after
        </p>
        <p style={{
          fontSize: 22, color: design.colors.textPrimary, fontFamily: design.font.mono,
          textAlign: 'center', margin: 0,
        }}>
          m₁v₁ + m₂v₂ = 0
        </p>
      </div>

      {/* Insight cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, maxWidth: 340, width: '100%', marginBottom: design.spacing.md }}>
        <div style={{
          background: design.colors.accentBlueMuted, border: `1px solid ${design.colors.accentBlue}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.accentBlue, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            Key Insight
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            Starting at rest = zero total momentum. After the push, momenta are equal and opposite. Lighter objects need higher velocity!
          </p>
        </div>

        <div style={{
          background: design.colors.accentOrangeMuted, border: `1px solid ${design.colors.accentOrange}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.accentOrange, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            The Math
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            If m₁ = 1kg and m₂ = 2kg, then v₁ = 2 × v₂. The lighter cart moves twice as fast!
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 14, color: prediction === 'light' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {prediction === 'light' ? '✅ Correct!' : '🤔 Now you know!'}
      </p>

      {renderButton('What About Friction? →', () => goToPhase('twist_predict'))}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🧶</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm,
      }}>
        Plot Twist: Add Friction!
      </h2>
      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', margin: 0, marginBottom: design.spacing.lg,
      }}>
        What if we put the carts on carpet instead of a smooth track?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'still_conserved', label: 'Momentum still conserved perfectly' },
          { id: 'not_conserved', label: "Momentum appears to be 'lost'" },
          { id: 'more_momentum', label: 'Friction creates more momentum' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => { setTwistPrediction(option.id); emit('prediction', { twistPrediction: option.id }); }}
            style={{
              padding: '16px 20px', borderRadius: design.radius.md,
              border: twistPrediction === option.id ? `2px solid ${design.colors.accentBlue}` : `1px solid ${design.colors.border}`,
              background: twistPrediction === option.id ? design.colors.accentBlueMuted : design.colors.bgSecondary,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', outline: 'none',
            }}
          >
            <span style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans }}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: design.spacing.xl }}>
          {renderButton('Test With Carpet →', () => { setHasFriction(true); resetExperiment(); goToPhase('twist_play'); })}
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}

      <div style={{
        flex: 1, padding: design.spacing.lg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: design.spacing.md, background: design.colors.bgSecondary,
      }}>
        {/* Surface toggle */}
        <div style={{ display: 'flex', gap: design.spacing.sm, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>Surface:</span>
          <button onMouseDown={() => { setHasFriction(false); resetExperiment(); }} disabled={isAnimating}
            style={{
              padding: '8px 16px', borderRadius: design.radius.md, border: 'none',
              background: !hasFriction ? design.colors.track : design.colors.bgTertiary,
              color: !hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600, fontSize: 13, cursor: isAnimating ? 'not-allowed' : 'pointer',
            }}>
            Smooth
          </button>
          <button onMouseDown={() => { setHasFriction(true); resetExperiment(); }} disabled={isAnimating}
            style={{
              padding: '8px 16px', borderRadius: design.radius.md, border: 'none',
              background: hasFriction ? design.colors.carpet : design.colors.bgTertiary,
              color: hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600, fontSize: 13, cursor: isAnimating ? 'not-allowed' : 'pointer',
            }}>
            Carpet
          </button>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.sm }}>
          {isCompressed ? (
            renderButton('🚀 Release', releaseCarts, 'success', isAnimating)
          ) : (
            renderButton('↺ Reset', resetExperiment, 'secondary')
          )}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0, textAlign: 'center' }}>
          Compare smooth vs carpet! Watch the total momentum.
        </p>

        {experimentCount >= 4 && (
          renderButton('I understand →', () => goToPhase('twist_review'))
        )}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🌍</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.md,
      }}>
        Friction & Momentum
      </h2>

      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.md, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 16, color: design.colors.accentOrange, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, margin: 0, marginBottom: design.spacing.sm,
        }}>
          Momentum isn't destroyed—it's transferred!
        </p>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.5, margin: 0,
        }}>
          Friction transfers momentum to the Earth. The Earth-cart system still conserves momentum, but Earth's huge mass means it doesn't noticeably move.
        </p>
      </div>

      <div style={{
        background: design.colors.accentBlueMuted, border: `1px solid ${design.colors.accentBlue}40`,
        borderRadius: design.radius.lg, padding: design.spacing.md, marginBottom: design.spacing.lg,
        maxWidth: 340, width: '100%',
      }}>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.6, margin: 0,
        }}>
          <strong style={{ color: design.colors.track }}>Smooth track:</strong> Momentum stays in carts<br />
          <strong style={{ color: design.colors.carpet }}>Carpet:</strong> Momentum leaks to Earth via friction
        </p>
      </div>

      <p style={{
        fontSize: 14, color: twistPrediction === 'not_conserved' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {twistPrediction === 'not_conserved' ? '✅ Correct!' : '🤔 Now you understand!'}
      </p>

      {renderButton('See Real Examples →', () => goToPhase('transfer'))}
    </div>
  );

  // ============================================================================
  // TRANSFER - Real World Applications with Sequential Navigation
  // ============================================================================
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: design.spacing.lg, background: design.colors.bgPrimary, overflowY: 'auto',
      }}>
        <h2 style={{
          fontSize: isMobile ? 18 : 20, fontWeight: 700, color: design.colors.textPrimary,
          fontFamily: design.font.sans, textAlign: 'center', margin: 0, marginBottom: design.spacing.md,
        }}>
          Real-World Applications
        </h2>

        {/* Progress indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: design.spacing.xs,
          marginBottom: design.spacing.md,
        }}>
          {applications.map((_, idx) => (
            <div key={idx} style={{
              width: 10, height: 10, borderRadius: design.radius.full,
              background: completedApps.has(idx)
                ? design.colors.success
                : idx === activeApp
                  ? design.colors.accentBlue
                  : design.colors.bgTertiary,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Tab buttons */}
        <div style={{
          display: 'flex', gap: design.spacing.xs, marginBottom: design.spacing.md,
          background: design.colors.bgSecondary, borderRadius: design.radius.md, padding: 4,
        }}>
          {applications.map((a, idx) => {
            const isAccessible = idx === 0 || completedApps.has(idx - 1);
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!isAccessible || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                disabled={!isAccessible}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: design.radius.sm, border: 'none',
                  background: activeApp === idx ? design.colors.bgTertiary : 'transparent',
                  color: !isAccessible
                    ? design.colors.textDisabled
                    : activeApp === idx
                      ? design.colors.textPrimary
                      : design.colors.textMuted,
                  fontWeight: 600, fontSize: 11, cursor: isAccessible ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease', fontFamily: design.font.sans,
                  opacity: isAccessible ? 1 : 0.5,
                  position: 'relative',
                }}
              >
                {completedApps.has(idx) && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    color: design.colors.success, fontSize: 8,
                  }}>✓</span>
                )}
                {a.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Application card with graphic */}
        <div style={{
          flex: 1, background: design.colors.bgSecondary, borderRadius: design.radius.lg,
          padding: design.spacing.lg, display: 'flex', flexDirection: 'column',
          border: `1px solid ${design.colors.border}`,
        }}>
          {/* Graphic visualization */}
          {renderApplicationGraphic(app.id)}

          {/* Title and description */}
          <h3 style={{
            fontSize: isMobile ? 16 : 18, fontWeight: 700, color: app.color,
            fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
          }}>
            {app.title}
          </h3>

          <p style={{
            fontSize: isMobile ? 13 : 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
            lineHeight: 1.6, margin: 0, marginBottom: design.spacing.md, textAlign: 'center',
          }}>
            {app.description}
          </p>

          {/* Formula and stat */}
          <div style={{ display: 'flex', gap: design.spacing.sm }}>
            <div style={{
              flex: 1, background: design.colors.bgTertiary, borderRadius: design.radius.md,
              padding: design.spacing.sm, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Formula</p>
              <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.mono, margin: 0 }}>
                {app.formula}
              </p>
            </div>
            <div style={{
              flex: 1, background: design.colors.bgTertiary, borderRadius: design.radius.md,
              padding: design.spacing.sm, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Real Data</p>
              <p style={{ fontSize: 12, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
                {app.stat}
              </p>
            </div>
          </div>

          {/* Mark as read button */}
          {!completedApps.has(activeApp) && (
            <button
              onMouseDown={() => {
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emit('interaction', { app: app.id, action: 'marked_read' });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              style={{
                marginTop: design.spacing.md, padding: '12px 20px',
                background: design.colors.successMuted,
                border: `1px solid ${design.colors.success}50`,
                borderRadius: design.radius.md, cursor: 'pointer',
                color: design.colors.success, fontWeight: 600, fontSize: 14,
                fontFamily: design.font.sans, transition: 'all 0.2s ease',
              }}
            >
              ✓ Mark "{app.title}" as Read
            </button>
          )}

          {completedApps.has(activeApp) && activeApp < applications.length - 1 && (
            <button
              onMouseDown={() => {
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                setActiveApp(activeApp + 1);
                setTimeout(() => { navigationLockRef.current = false; }, 300);
              }}
              style={{
                marginTop: design.spacing.md, padding: '12px 20px',
                background: design.colors.bgTertiary,
                border: `1px solid ${design.colors.border}`,
                borderRadius: design.radius.md, cursor: 'pointer',
                color: design.colors.textPrimary, fontWeight: 600, fontSize: 14,
                fontFamily: design.font.sans, transition: 'all 0.2s ease',
              }}
            >
              Next Application →
            </button>
          )}
        </div>

        {/* Continue to quiz button */}
        <div style={{ marginTop: design.spacing.md }}>
          {allAppsCompleted ? (
            renderButton('Take the Quiz →', () => goToPhase('test'), 'primary', false, true)
          ) : (
            <div style={{
              padding: '14px 20px', background: design.colors.bgSecondary,
              borderRadius: design.radius.md, textAlign: 'center',
              border: `1px solid ${design.colors.border}`,
            }}>
              <p style={{
                fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0,
              }}>
                Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TEST - Knowledge Assessment
  // ============================================================================
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: design.spacing.lg, background: design.colors.bgPrimary,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: design.spacing.md, flexWrap: 'wrap', gap: design.spacing.sm,
        }}>
          <span style={{
            fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans,
            background: design.colors.bgSecondary, padding: '6px 12px', borderRadius: design.radius.full,
          }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: design.colors.success, fontFamily: design.font.sans,
            background: design.colors.successMuted, padding: '6px 12px', borderRadius: design.radius.full,
          }}>
            Score: {correctAnswers}/{answeredQuestions.size}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, background: design.colors.bgTertiary, borderRadius: design.radius.full,
          marginBottom: design.spacing.md, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${((currentQuestion + 1) / testQuestions.length) * 100}%`,
            background: design.colors.accentBlue, borderRadius: design.radius.full,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Question and options */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{
            fontSize: isMobile ? 15 : 16, fontWeight: 600, color: design.colors.textPrimary,
            fontFamily: design.font.sans, lineHeight: 1.5, margin: 0, marginBottom: design.spacing.md,
          }}>
            {q.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm }}>
            {q.options.map((option, idx) => {
              let bg = design.colors.bgSecondary;
              let borderColor = design.colors.border;
              let textColor = design.colors.textPrimary;

              if (isAnswered) {
                if (idx === q.correct) {
                  bg = design.colors.successMuted;
                  borderColor = design.colors.success;
                  textColor = design.colors.success;
                } else if (idx === selectedAnswer && idx !== q.correct) {
                  bg = design.colors.errorMuted;
                  borderColor = design.colors.error;
                  textColor = design.colors.error;
                }
              }

              return (
                <button
                  key={idx}
                  onMouseDown={() => handleTestAnswer(idx)}
                  disabled={isAnswered}
                  style={{
                    padding: '14px 16px', borderRadius: design.radius.md,
                    border: `1px solid ${borderColor}`, background: bg,
                    cursor: isAnswered ? 'default' : 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease', outline: 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: textColor, fontFamily: design.font.sans }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{
              marginTop: design.spacing.md, background: design.colors.accentBlueMuted,
              border: `1px solid ${design.colors.accentBlue}40`,
              borderRadius: design.radius.md, padding: design.spacing.md,
            }}>
              <p style={{
                fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans,
                lineHeight: 1.5, margin: 0,
              }}>
                💡 {q.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.md }}>
          {renderButton(
            '← Back',
            () => {
              setCurrentQuestion(prev => Math.max(0, prev - 1));
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion - 1));
            },
            'secondary',
            currentQuestion === 0,
            false,
            'sm'
          )}

          {currentQuestion < testQuestions.length - 1 ? (
            renderButton(
              'Next →',
              () => {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(answeredQuestions.has(currentQuestion + 1));
              },
              'secondary',
              false,
              false,
              'sm'
            )
          ) : answeredQuestions.size === testQuestions.length ? (
            renderButton('Complete →', () => goToPhase('mastery'), 'primary', false, false, 'sm')
          ) : (
            <span style={{
              fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
              alignSelf: 'center',
            }}>
              Answer all to continue
            </span>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MASTERY - Completion Screen
  // ============================================================================
  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: design.spacing.xl, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(180deg, ${design.colors.bgDeep} 0%, ${design.colors.accentBlueMuted} 100%)`,
      }}>
        <div style={{ fontSize: isMobile ? 56 : 72, marginBottom: design.spacing.md }}>🏆</div>

        <h2 style={{
          fontSize: isMobile ? 22 : 26, fontWeight: 700, color: design.colors.textPrimary,
          fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
        }}>
          Momentum Master!
        </h2>

        <div style={{
          fontSize: isMobile ? 44 : 56, fontWeight: 700, color: design.colors.success,
          fontFamily: design.font.sans, marginBottom: design.spacing.xs,
        }}>
          {percentage}%
        </div>

        <p style={{
          fontSize: 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
          margin: 0, marginBottom: design.spacing.lg,
        }}>
          {correctAnswers}/{testQuestions.length} correct answers
        </p>

        <div style={{
          background: design.colors.bgSecondary, borderRadius: design.radius.lg,
          padding: design.spacing.lg, marginBottom: design.spacing.lg, maxWidth: 300, width: '100%',
          border: `1px solid ${design.colors.border}`,
        }}>
          <h3 style={{
            fontSize: 15, fontWeight: 700, color: design.colors.accentBlue,
            fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
          }}>
            Key Takeaways
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'Momentum p = mass × velocity',
              'Total momentum is always conserved',
              'Lighter objects move faster in push-offs',
              'Friction transfers momentum to Earth'
            ].map((item, idx) => (
              <li key={idx} style={{
                fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans,
                marginBottom: design.spacing.xs, display: 'flex', alignItems: 'center', gap: design.spacing.sm,
              }}>
                <span style={{ color: design.colors.success }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {renderButton('Play Again ↺', () => {
          setPhase('hook');
          setExperimentCount(0);
          setCurrentQuestion(0);
          setCorrectAnswers(0);
          setAnsweredQuestions(new Set());
          setPrediction(null);
          setTwistPrediction(null);
          setMassLeft(1);
          setMassRight(2);
          setHasFriction(false);
          setActiveApp(0);
          setCompletedApps(new Set());
          resetExperiment();
        })}

        {/* Confetti */}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
            animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
            pointerEvents: 'none', fontSize: 18,
          }}>
            {['🛒', '⚡', '⭐', '✨', '🎉'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    );
  };

  // Phase mapping
  const phases: Record<Phase, () => JSX.Element> = {
    hook: renderHook,
    predict: renderPredict,
    play: renderPlay,
    review: renderReview,
    twist_predict: renderTwistPredict,
    twist_play: renderTwistPlay,
    twist_review: renderTwistReview,
    transfer: renderTransfer,
    test: renderTest,
    mastery: renderMastery,
  };

  return (
    <div style={{
      width, height, borderRadius: design.radius.lg, overflow: 'hidden',
      position: 'relative', background: design.colors.bgPrimary, fontFamily: design.font.sans,
      boxShadow: design.shadow.lg,
    }}>
      {phases[phase]()}
      {renderProgressBar()}
    </div>
  );
};

export default MomentumConservationRenderer;
