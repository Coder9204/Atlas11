'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CENTER OF MASS - Premium 10-Phase Educational Game
// Gold Standard Implementation with Sequential Transfer Navigation
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'weight_add' | 'weight_move' | 'balance_check' | 'reset' | 'answer_submit';
}

interface CenterOfMassRendererProps {
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
    // Refined dark theme with emerald accent
    bgDeep: '#040a08',
    bgPrimary: '#0a100e',
    bgSecondary: '#121a18',
    bgTertiary: '#1a2422',
    bgCard: '#182220',
    bgElevated: '#223330',
    bgHover: '#2a3d38',

    // High contrast text
    textPrimary: '#ffffff',
    textSecondary: '#a8c4bc',
    textMuted: '#6a8580',
    textDisabled: '#405550',

    // Brand colors - Emerald theme
    accentPrimary: '#10b981',
    accentPrimaryHover: '#059669',
    accentPrimaryMuted: 'rgba(16, 185, 129, 0.15)',
    accentSecondary: '#f59e0b',
    accentSecondaryMuted: 'rgba(245, 158, 11, 0.15)',

    // Physics elements
    fork: '#b8c4c0',
    forkHighlight: '#d4dcd8',
    forkDark: '#8a9a94',
    toothpick: '#d4a574',
    toothpickDark: '#a67c4a',
    glass: '#7dd3fc',
    glassDark: '#0284c7',
    clay: '#d97706',
    com: '#ef4444',

    // Functional
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',

    // Borders
    border: '#2a3d38',
    borderLight: '#3a4d48',
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
const CenterOfMassRenderer: React.FC<CenterOfMassRendererProps> = ({
  width = 400,
  height = 500,
  onGameEvent,
  gamePhase
}) => {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [clayPosition, setClayPosition] = useState<number>(0);
  const [hasClayAdded, setHasClayAdded] = useState(false);
  const [isBalanced, setIsBalanced] = useState(true);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [showCOM, setShowCOM] = useState(true);
  const [experimentCount, setExperimentCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Transfer state with sequential navigation
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Navigation debouncing ref
  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>();

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

  // Cleanup animation
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Event emitter
  const emit = useCallback((type: GameEvent['type'], data: Record<string, unknown>, eventType?: GameEvent['eventType']) => {
    onGameEvent?.({ type, phase, data, timestamp: Date.now(), eventType });
  }, [onGameEvent, phase]);

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // Physics calculations
  const calculateBalance = useCallback((clay: number) => {
    const baseCOM = -0.3;
    const clayEffect = clay * 0.5;
    const finalCOM = baseCOM + clayEffect;
    return { comY: finalCOM, stable: finalCOM < 0.1 };
  }, []);

  const addClay = useCallback((position: number) => {
    if (isAnimating || hasClayAdded) return;
    setHasClayAdded(true);
    setClayPosition(position);
    const { stable, comY } = calculateBalance(position);
    setIsBalanced(stable);

    if (!stable) {
      setIsAnimating(true);
      let angle = 0;
      const animate = () => {
        angle += (position > 0 ? 2 : -2);
        setTiltAngle(angle);
        if (Math.abs(angle) < 45) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setExperimentCount(prev => prev + 1);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setTiltAngle(0);
      setExperimentCount(prev => prev + 1);
    }
    emit('interaction', { clayPosition: position, stable, comY }, 'weight_add');
  }, [calculateBalance, emit, isAnimating, hasClayAdded]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setHasClayAdded(false);
    setClayPosition(0);
    setIsBalanced(true);
    setTiltAngle(0);
    setIsAnimating(false);
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
  }, [currentQuestion, answeredQuestions, emit]);

  // Test questions
  const testQuestions = [
    { question: "Why does the fork-toothpick system balance on the glass rim?", options: ["The fork is very light", "Center of mass is below the pivot point", "Magic holds it in place", "The glass surface is sticky"], correct: 1, explanation: "The system balances because its center of mass lies below the pivot point. This creates stable equilibrium where gravity provides a restoring torque." },
    { question: "What happens if you move the center of mass above the pivot?", options: ["System becomes more stable", "System becomes unstable and falls", "Nothing changes at all", "It starts to float"], correct: 1, explanation: "When COM is above the pivot, any small disturbance causes gravity to tip it further (unstable equilibrium). It will fall over." },
    { question: "Adding clay to the fork end (lower side) would:", options: ["Make it more stable", "Make it less stable", "Have no effect on stability", "Make it lighter"], correct: 0, explanation: "Adding weight to the fork end (which hangs low) shifts the COM even lower, making the system more stable." },
    { question: "A tightrope walker holds a long pole because:", options: ["For exercise during the walk", "To lower their overall center of mass", "To wave at the crowd below", "The pole has no purpose"], correct: 1, explanation: "The heavy pole bends downward, lowering the walker's overall center of mass below the rope, creating stability." },
    { question: "Where is the center of mass of a donut shape?", options: ["In the dough material", "In the empty hole at center", "Nowhere specific", "At the outer edge"], correct: 1, explanation: "A donut's center of mass is in the hole—the geometric center—even though there's no material there!" },
    { question: "To balance a ruler on your finger, where should you place it?", options: ["At one end of the ruler", "At its center of mass", "Anywhere works the same", "At both ends simultaneously"], correct: 1, explanation: "You must place your finger under the center of mass. For a uniform ruler, that's the geometric center." },
    { question: "Why do racing cars have low centers of mass?", options: ["To go faster in a straight line", "To be more stable in turns", "Only for aerodynamics", "To use less fuel"], correct: 1, explanation: "A low COM means the car is less likely to tip over during sharp turns. The lower the COM, the more it can lean before tipping." },
    { question: "A bird perches on a branch by:", options: ["Gripping with claws only", "Keeping its COM over the branch", "Birds cannot balance well", "The branch helps them"], correct: 1, explanation: "Birds constantly adjust their body position to keep their center of mass directly over the branch (support point)." },
    { question: "If you lean too far forward while standing, you fall because:", options: ["Your legs are too weak", "Your COM moves outside your base of support", "Gravity suddenly increases", "Wind pushes you over"], correct: 1, explanation: "When your COM moves outside the area between your feet (base of support), gravity creates an unbalanced torque and you fall." },
    { question: "A Weeble toy always rights itself because:", options: ["It contains magnets", "Its center of mass is very low", "It is filled with water", "It is perfectly round"], correct: 1, explanation: "Weebles have a heavy, rounded bottom that keeps the COM very low. Any tilt creates a restoring torque from gravity." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'tightrope',
      title: "Tightrope Walking",
      description: "Performers use long, curved poles that dip below the rope. This lowers their overall center of mass below the rope, creating remarkable stability.",
      formula: "Stable when COM < pivot height",
      insight: "Poles: 10-12m, 10-15kg",
      color: design.colors.accentPrimary,
    },
    {
      id: 'ship',
      title: "Ship Stability",
      description: "Ships have heavy ballast at the bottom to keep the center of mass low. This prevents capsizing even in rough seas and high waves.",
      formula: "Metacentric height = GM",
      insight: "GM: 0.5-2m for stability",
      color: design.colors.glass,
    },
    {
      id: 'wine',
      title: "Wine Glass Balance",
      description: "A wine glass with liquid is more stable than when empty because the liquid lowers the center of mass closer to the wide base.",
      formula: "Lower COM = wider stability zone",
      insight: "COM drops ~2cm when filled",
      color: '#a855f7',
    },
    {
      id: 'standing',
      title: "Human Balance",
      description: "We constantly adjust our body position to keep our center of mass over our feet. That's why it's hard to stand still with eyes closed!",
      formula: "COM must stay over base of support",
      insight: "COM: ~55% of standing height",
      color: design.colors.accentSecondary,
    }
  ];

  // ============================================================================
  // HELPER FUNCTIONS (Not React Components)
  // ============================================================================
  const renderButton = (
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled: boolean = false,
    fullWidth: boolean = false
  ) => {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      fontSize: isMobile ? 14 : 15,
      fontWeight: 600,
      fontFamily: design.font.sans,
      border: 'none',
      borderRadius: design.radius.md,
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
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentPrimaryHover} 100%)`,
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
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled && !navigationLockRef.current) {
            navigationLockRef.current = true;
            onClick();
            setTimeout(() => { navigationLockRef.current = false; }, 400);
          }
        }}
        disabled={disabled}
        style={{ ...baseStyle, ...variants[variant] }}
      >
        {text}
      </button>
    );
  };

  const renderProgressBar = () => {
    const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseList.indexOf(phase);

    return (
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        gap: 4,
        zIndex: 10,
      }}>
        {phaseList.map((p, idx) => (
          <div key={p} style={{
            width: isMobile ? 6 : 8,
            height: isMobile ? 6 : 8,
            borderRadius: design.radius.full,
            background: idx === currentIndex
              ? design.colors.accentPrimary
              : idx < currentIndex
                ? design.colors.success
                : design.colors.bgElevated,
            transition: 'all 0.3s ease',
            boxShadow: idx === currentIndex ? design.shadow.glow(design.colors.accentPrimary) : 'none',
          }} />
        ))}
      </div>
    );
  };

  // ============================================================================
  // VISUALIZATION - Premium Fork Balance Animation
  // ============================================================================
  const renderVisualization = () => {
    const svgWidth = Math.min(width, 400);
    const glassX = svgWidth / 2;
    const glassY = 180;
    const pivotY = glassY - 60;
    const { comY } = calculateBalance(clayPosition);

    return (
      <svg width="100%" height={260} viewBox={`0 0 ${svgWidth} 260`} style={{ display: 'block', background: design.colors.bgDeep }}>
        <defs>
          <linearGradient id="com-glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.glass} stopOpacity="0.9" />
            <stop offset="100%" stopColor={design.colors.glassDark} stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="com-fork-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.forkHighlight} />
            <stop offset="100%" stopColor={design.colors.forkDark} />
          </linearGradient>
          <linearGradient id="com-toothpick-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.toothpick} />
            <stop offset="50%" stopColor={design.colors.toothpickDark} />
            <stop offset="100%" stopColor={design.colors.toothpick} />
          </linearGradient>
          <filter id="com-glass-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={design.colors.glass} floodOpacity="0.4" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="com-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="com-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={design.colors.com} floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="com-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke={design.colors.border} strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={svgWidth} height={260} fill="url(#com-grid)" />

        {/* Table surface */}
        <rect x={0} y={glassY + 55} width={svgWidth} height={60} fill="#2d1f14" />
        <rect x={0} y={glassY + 55} width={svgWidth} height={4} fill="#4a3525" />

        {/* Glass */}
        <g filter="url(#com-glass-glow)">
          <path
            d={`M${glassX - 28} ${glassY + 55} L${glassX - 22} ${glassY - 55} Q${glassX} ${glassY - 60} ${glassX + 22} ${glassY - 55} L${glassX + 28} ${glassY + 55} Z`}
            fill="url(#com-glass-grad)"
            stroke={design.colors.glass}
            strokeWidth={2}
          />
          <ellipse cx={glassX} cy={glassY + 55} rx={28} ry={7} fill={design.colors.glassDark} opacity={0.5} />
          {/* Glass shine */}
          <path
            d={`M${glassX - 18} ${glassY - 45} Q${glassX - 10} ${glassY - 50} ${glassX - 12} ${glassY}`}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Pivot reference line */}
        <line x1={glassX - 100} y1={pivotY} x2={glassX + 100} y2={pivotY}
              stroke={design.colors.textMuted} strokeWidth={1} strokeDasharray="5,5" opacity={0.5} />
        <text x={glassX + 108} y={pivotY + 4} fill={design.colors.textMuted} fontSize={10} fontFamily={design.font.sans}>
          Pivot
        </text>

        {/* Fork-toothpick system with rotation */}
        <g transform={`translate(${glassX}, ${pivotY}) rotate(${tiltAngle})`} filter="url(#com-shadow)">
          {/* Toothpick */}
          <rect x={-85} y={-4} width={170} height={8} rx={4} fill="url(#com-toothpick-grad)" />

          {/* Left Fork */}
          <g transform="translate(-70, 0) rotate(35)">
            <rect x={-6} y={0} width={12} height={55} rx={3} fill="url(#com-fork-grad)" />
            <ellipse cx={0} cy={60} rx={16} ry={7} fill={design.colors.fork} />
            {[-10, -3.5, 3.5, 10].map((x, i) => (
              <rect key={i} x={x - 2.5} y={60} width={5} height={22} rx={1} fill={design.colors.forkHighlight} />
            ))}
          </g>

          {/* Right Fork (mirrored) */}
          <g transform="translate(-70, 0) rotate(-35) scale(-1, 1)">
            <rect x={-6} y={0} width={12} height={55} rx={3} fill="url(#com-fork-grad)" />
            <ellipse cx={0} cy={60} rx={16} ry={7} fill={design.colors.fork} />
            {[-10, -3.5, 3.5, 10].map((x, i) => (
              <rect key={i} x={x - 2.5} y={60} width={5} height={22} rx={1} fill={design.colors.forkHighlight} />
            ))}
          </g>

          {/* Clay ball if added */}
          {hasClayAdded && (
            <g transform={`translate(${clayPosition * 65}, 0)`}>
              <circle cx={0} cy={0} r={14} fill={design.colors.clay} stroke="#92400e" strokeWidth={2} />
              <ellipse cx={-4} cy={-4} rx={4} ry={3} fill="rgba(255,255,255,0.2)" />
            </g>
          )}

          {/* Center of mass indicator */}
          {showCOM && (
            <g filter="url(#com-glow)" transform={`translate(0, ${comY * 80})`}>
              <circle cx={0} cy={0} r={10} fill={design.colors.com} />
              <circle cx={0} cy={0} r={5} fill="#fff" opacity={0.4} />
              <text x={18} y={4} fill={design.colors.com} fontSize={11} fontWeight="700" fontFamily={design.font.sans}>
                COM
              </text>
            </g>
          )}

          {/* Pivot point */}
          <circle cx={0} cy={0} r={5} fill="#fff" stroke={design.colors.accentPrimary} strokeWidth={2} />
        </g>

        {/* Status badges */}
        <g transform="translate(16, 16)">
          <rect x={0} y={0} width={95} height={34} rx={8}
                fill={isBalanced ? design.colors.successMuted : design.colors.errorMuted}
                stroke={isBalanced ? design.colors.success : design.colors.error} strokeWidth={1} />
          <text x={47} y={22} textAnchor="middle"
                fill={isBalanced ? design.colors.success : design.colors.error}
                fontSize={12} fontWeight="700" fontFamily={design.font.sans}>
            {isBalanced ? '✓ Balanced' : '✗ Falling!'}
          </text>
        </g>

        {showCOM && (
          <g transform={`translate(${svgWidth - 110}, 16)`}>
            <rect x={0} y={0} width={95} height={34} rx={8} fill={design.colors.bgTertiary}
                  stroke={design.colors.border} strokeWidth={1} />
            <text x={47} y={14} textAnchor="middle" fill={design.colors.textMuted} fontSize={9} fontFamily={design.font.sans}>
              COM Position
            </text>
            <text x={47} y={28} textAnchor="middle"
                  fill={comY < 0 ? design.colors.success : design.colors.error}
                  fontSize={12} fontWeight="600" fontFamily={design.font.sans}>
              {comY < 0 ? '↓ Below pivot' : '↑ Above pivot'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Application graphics for transfer phase
  const renderApplicationGraphic = (appId: string) => {
    const svgWidth = Math.min(width - 60, 340);

    return (
      <svg width="100%" height={120} viewBox={`0 0 ${svgWidth} 120`} style={{ display: 'block' }}>
        <rect width={svgWidth} height={120} fill={design.colors.bgDeep} rx={12} />

        {appId === 'tightrope' && (
          <g>
            <line x1={40} y1={85} x2={svgWidth - 40} y2={85} stroke="#6b7280" strokeWidth={3} />
            {/* Support posts */}
            <rect x={35} y={85} width={10} height={25} fill="#374151" />
            <rect x={svgWidth - 45} y={85} width={10} height={25} fill="#374151" />
            {/* Walker */}
            <circle cx={svgWidth / 2} cy={55} r={12} fill="#fcd5ce" />
            <rect x={svgWidth / 2 - 7} y={67} width={14} height={20} rx={3} fill={design.colors.accentPrimary} />
            {/* Pole - curved downward */}
            <path d={`M ${svgWidth / 2 - 100} 75 Q ${svgWidth / 2} 100 ${svgWidth / 2 + 100} 75`} stroke="#9ca3af" strokeWidth={4} fill="none" />
            {/* COM marker */}
            <circle cx={svgWidth / 2} cy={88} r={6} fill={design.colors.com}>
              <animate attributeName="cy" values="86;90;86" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x={svgWidth / 2 + 15} y={92} fill={design.colors.com} fontSize={8}>COM</text>
          </g>
        )}

        {appId === 'ship' && (
          <g>
            {/* Water */}
            <rect x={20} y={80} width={svgWidth - 40} height={30} fill="#0ea5e9" opacity={0.3} rx={4} />
            <path d={`M 20 80 Q ${svgWidth * 0.25} 75 ${svgWidth * 0.5} 80 T ${svgWidth - 20} 80`} stroke="#0ea5e9" strokeWidth={2} fill="none">
              <animate attributeName="d"
                values={`M 20 80 Q ${svgWidth * 0.25} 75 ${svgWidth * 0.5} 80 T ${svgWidth - 20} 80;M 20 80 Q ${svgWidth * 0.25} 85 ${svgWidth * 0.5} 80 T ${svgWidth - 20} 80;M 20 80 Q ${svgWidth * 0.25} 75 ${svgWidth * 0.5} 80 T ${svgWidth - 20} 80`}
                dur="2s" repeatCount="indefinite" />
            </path>
            {/* Ship hull */}
            <path d={`M ${svgWidth / 2 - 70} 80 L ${svgWidth / 2 - 50} 50 L ${svgWidth / 2 + 50} 50 L ${svgWidth / 2 + 70} 80 Z`} fill="#374151" />
            <rect x={svgWidth / 2 - 30} y={30} width={60} height={20} rx={2} fill="#4b5563" />
            {/* Ballast */}
            <rect x={svgWidth / 2 - 40} y={60} width={80} height={15} rx={2} fill="#1f2937" />
            <text x={svgWidth / 2} y={72} textAnchor="middle" fill="#9ca3af" fontSize={8}>Ballast</text>
            {/* COM */}
            <circle cx={svgWidth / 2} cy={68} r={5} fill={design.colors.com} />
          </g>
        )}

        {appId === 'wine' && (
          <g>
            {/* Table */}
            <rect x={20} y={100} width={svgWidth - 40} height={10} fill="#4a3520" rx={2} />
            {/* Empty glass */}
            <g transform="translate(80, 30)">
              <path d="M 0 70 L 10 0 L 50 0 L 60 70 Z" fill="none" stroke={design.colors.glass} strokeWidth={2} />
              <ellipse cx={30} cy={70} rx={25} ry={6} fill={design.colors.glassDark} opacity={0.5} />
              <circle cx={30} cy={35} r={4} fill={design.colors.com} />
              <text x={30} y={20} textAnchor="middle" fill={design.colors.textMuted} fontSize={9}>Empty</text>
            </g>
            {/* Filled glass */}
            <g transform={`translate(${svgWidth - 140}, 30)`}>
              <path d="M 0 70 L 10 0 L 50 0 L 60 70 Z" fill="none" stroke={design.colors.glass} strokeWidth={2} />
              <path d="M 8 50 L 15 10 L 45 10 L 52 50 Z" fill="#7c3aed" opacity={0.4} />
              <ellipse cx={30} cy={70} rx={25} ry={6} fill={design.colors.glassDark} opacity={0.5} />
              <circle cx={30} cy={55} r={4} fill={design.colors.com} />
              <text x={30} y={20} textAnchor="middle" fill={design.colors.textMuted} fontSize={9}>Filled</text>
            </g>
            <text x={svgWidth / 2} y={115} textAnchor="middle" fill={design.colors.textMuted} fontSize={9}>COM lowers with liquid</text>
          </g>
        )}

        {appId === 'standing' && (
          <g>
            {/* Ground */}
            <rect x={20} y={100} width={svgWidth - 40} height={10} fill="#374151" rx={2} />
            {/* Standing person (stable) */}
            <g transform="translate(100, 20)">
              <circle cx={15} cy={10} r={10} fill="#fcd5ce" />
              <rect x={8} y={20} width={14} height={35} rx={3} fill={design.colors.accentSecondary} />
              <rect x={5} y={55} width={8} height={25} rx={2} fill="#374151" />
              <rect x={17} y={55} width={8} height={25} rx={2} fill="#374151" />
              {/* COM */}
              <circle cx={15} cy={35} r={5} fill={design.colors.com} />
              {/* Base of support */}
              <line x1={3} y1={82} x2={27} y2={82} stroke={design.colors.success} strokeWidth={2} />
            </g>
            {/* Leaning person (unstable) */}
            <g transform={`translate(${svgWidth - 130}, 20) rotate(15)`}>
              <circle cx={15} cy={10} r={10} fill="#fcd5ce" />
              <rect x={8} y={20} width={14} height={35} rx={3} fill={design.colors.error} />
              <rect x={5} y={55} width={8} height={25} rx={2} fill="#374151" />
              <rect x={17} y={55} width={8} height={25} rx={2} fill="#374151" />
              {/* COM outside base */}
              <circle cx={15} cy={35} r={5} fill={design.colors.com} />
            </g>
            <text x={115} y={115} textAnchor="middle" fill={design.colors.success} fontSize={9}>Stable</text>
            <text x={svgWidth - 100} y={115} textAnchor="middle" fill={design.colors.error} fontSize={9}>Falling!</text>
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: design.spacing.xl,
      background: `linear-gradient(180deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    }}>
      <div style={{
        fontSize: isMobile ? 56 : 64, marginBottom: design.spacing.lg,
        filter: `drop-shadow(0 8px 24px ${design.colors.accentPrimary}40)`,
        animation: 'float 3s ease-in-out infinite',
      }}>
        ⚖️
      </div>

      <h1 style={{
        fontSize: isMobile ? 22 : 26, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, textAlign: 'center', margin: 0, marginBottom: design.spacing.sm,
        letterSpacing: '-0.5px',
      }}>
        The Impossible Balance
      </h1>

      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', maxWidth: 300, lineHeight: 1.6, margin: 0, marginBottom: design.spacing.xl,
      }}>
        A toothpick with forks attached balances on the rim of a glass. Most of it hangs off the edge!
      </p>

      <div style={{
        background: design.colors.accentPrimaryMuted,
        border: `1px solid ${design.colors.accentPrimary}50`,
        borderRadius: design.radius.lg, padding: '20px 24px',
        maxWidth: 320, marginBottom: design.spacing.xl,
      }}>
        <p style={{
          fontSize: isMobile ? 15 : 17, color: design.colors.accentPrimary, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, lineHeight: 1.5, margin: 0,
        }}>
          "How can something hang off a table without falling?"
        </p>
      </div>

      {renderButton('Discover the Secret →', () => goToPhase('predict'))}

      <p style={{
        fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
        marginTop: design.spacing.xl, letterSpacing: '0.5px',
      }}>
        CENTER OF MASS • STABILITY
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
        Why doesn't the fork-toothpick system fall off the glass?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'light', label: 'The toothpick is very light', icon: '🪶' },
          { id: 'com_below', label: 'The center of mass is below the pivot', icon: '⬇️' },
          { id: 'friction', label: 'Friction holds it in place', icon: '🤝' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => { setPrediction(option.id); emit('prediction', { prediction: option.id }); }}
            style={{
              padding: '16px 20px', borderRadius: design.radius.md,
              border: prediction === option.id ? `2px solid ${design.colors.accentPrimary}` : `1px solid ${design.colors.border}`,
              background: prediction === option.id ? design.colors.accentPrimaryMuted : design.colors.bgSecondary,
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
          {renderButton('See It In Action! →', () => goToPhase('play'))}
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
        {/* Show COM toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.sm }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>
            Show COM:
          </span>
          <button
            onMouseDown={() => setShowCOM(!showCOM)}
            style={{
              padding: '8px 16px', borderRadius: design.radius.md, border: 'none',
              background: showCOM ? design.colors.com : design.colors.bgTertiary,
              color: showCOM ? '#fff' : design.colors.textSecondary,
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {showCOM ? 'ON' : 'OFF'}
          </button>
        </div>

        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', maxWidth: 320, lineHeight: 1.6, margin: 0,
        }}>
          Notice how the <span style={{ color: design.colors.com, fontWeight: 600 }}>center of mass</span> (red dot) is{' '}
          <strong>below</strong> the pivot point. This creates stability!
        </p>

        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0 }}>
          The forks hang down, pulling the COM below the glass rim.
        </p>

        {renderButton('I understand! →', () => goToPhase('review'))}
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
        The Secret: Center of Mass
      </h2>

      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.lg, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 16, color: design.colors.accentPrimary, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, margin: 0, marginBottom: design.spacing.sm,
        }}>
          COM below pivot = Stable equilibrium
        </p>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.5, margin: 0,
        }}>
          When the center of mass is below the support point, gravity creates a{' '}
          <em style={{ color: design.colors.accentPrimary }}>restoring torque</em> that pulls it back to balance.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, maxWidth: 340, width: '100%', marginBottom: design.spacing.md }}>
        <div style={{
          background: design.colors.successMuted, border: `1px solid ${design.colors.success}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.success, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            Stable (COM below)
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            Tilt it, and gravity pulls it back. Like a pendulum!
          </p>
        </div>

        <div style={{
          background: design.colors.errorMuted, border: `1px solid ${design.colors.error}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.error, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            Unstable (COM above)
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            Tilt it, and gravity tips it further. Falls over!
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 14, color: prediction === 'com_below' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {prediction === 'com_below' ? '✓ Correct!' : 'Now you understand!'}
      </p>

      {renderButton('Can We Break It? →', () => goToPhase('twist_predict'))}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🟤</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm,
      }}>
        Plot Twist: Add Clay!
      </h2>
      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', margin: 0, marginBottom: design.spacing.lg,
      }}>
        What if we stick a ball of clay on the toothpick? Where should we put it?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'fork_side', label: 'Near the forks (left) - more stable' },
          { id: 'middle', label: 'In the middle - no change' },
          { id: 'other_side', label: 'Away from forks (right) - might fall!' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => { setTwistPrediction(option.id); emit('prediction', { twistPrediction: option.id }); }}
            style={{
              padding: '16px 20px', borderRadius: design.radius.md,
              border: twistPrediction === option.id ? `2px solid ${design.colors.accentPrimary}` : `1px solid ${design.colors.border}`,
              background: twistPrediction === option.id ? design.colors.accentPrimaryMuted : design.colors.bgSecondary,
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
          {renderButton('Experiment! →', () => goToPhase('twist_play'))}
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
        <p style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
          Where do you want to add clay?
        </p>

        <div style={{ display: 'flex', gap: design.spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { pos: -0.8, label: '← Fork side' },
            { pos: 0, label: 'Middle' },
            { pos: 0.8, label: 'Other side →' }
          ].map((opt) => (
            <button
              key={opt.pos}
              onMouseDown={() => addClay(opt.pos)}
              disabled={isAnimating || hasClayAdded}
              style={{
                padding: '10px 14px', borderRadius: design.radius.md, border: 'none',
                background: design.colors.clay, color: '#fff',
                fontWeight: 600, fontSize: 12, cursor: (isAnimating || hasClayAdded) ? 'not-allowed' : 'pointer',
                opacity: (isAnimating || hasClayAdded) ? 0.5 : 1, transition: 'all 0.2s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasClayAdded && renderButton('↺ Reset & Try Again', resetExperiment, 'secondary')}

        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0 }}>
          Experiments: {experimentCount}
        </p>

        {experimentCount >= 2 && renderButton('I see the pattern! →', () => goToPhase('twist_review'))}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🎯</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.md,
      }}>
        Shifting the Center of Mass
      </h2>

      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.md, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 15, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.6, margin: 0, marginBottom: design.spacing.sm,
        }}>
          Adding weight <span style={{ color: design.colors.success, fontWeight: 600 }}>on the fork side</span> lowers the COM further → <strong>more stable</strong>
        </p>
        <p style={{
          fontSize: 15, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.6, margin: 0,
        }}>
          Adding weight <span style={{ color: design.colors.error, fontWeight: 600 }}>on the other side</span> raises the COM → <strong>unstable, falls!</strong>
        </p>
      </div>

      <div style={{
        background: design.colors.accentPrimaryMuted, border: `1px solid ${design.colors.accentPrimary}40`,
        borderRadius: design.radius.lg, padding: design.spacing.md, marginBottom: design.spacing.lg,
        maxWidth: 340, width: '100%',
      }}>
        <p style={{
          fontSize: 14, color: design.colors.accentPrimary, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, margin: 0,
        }}>
          The Rule: Keep your center of mass over (or below) your support point!
        </p>
      </div>

      <p style={{
        fontSize: 14, color: twistPrediction === 'other_side' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {twistPrediction === 'other_side' ? '✓ Correct!' : 'Now you see why!'}
      </p>

      {renderButton('See Real-World Examples →', () => goToPhase('transfer'))}
    </div>
  );

  // ============================================================================
  // TRANSFER - Sequential Application Navigation
  // ============================================================================
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: design.spacing.lg, background: design.colors.bgPrimary,
      }}>
        <h2 style={{
          fontSize: isMobile ? 18 : 20, fontWeight: 700, color: design.colors.textPrimary,
          fontFamily: design.font.sans, textAlign: 'center', margin: 0, marginBottom: design.spacing.md,
        }}>
          Center of Mass in Action
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
                  ? design.colors.accentPrimary
                  : design.colors.bgTertiary,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <p style={{
          fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
          textAlign: 'center', margin: 0, marginBottom: design.spacing.md,
        }}>
          Application {activeApp + 1} of {applications.length} • {completedApps.size} completed
        </p>

        {/* Application card */}
        <div style={{
          flex: 1, background: design.colors.bgSecondary, borderRadius: design.radius.lg,
          padding: design.spacing.lg, display: 'flex', flexDirection: 'column',
          border: `1px solid ${design.colors.border}`, overflow: 'auto',
        }}>
          {/* Graphic */}
          <div style={{ marginBottom: design.spacing.md }}>
            {renderApplicationGraphic(app.id)}
          </div>

          <h3 style={{
            fontSize: isMobile ? 16 : 18, fontWeight: 700, color: app.color,
            fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
          }}>
            {app.title}
          </h3>

          <p style={{
            fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
            lineHeight: 1.6, margin: 0, marginBottom: design.spacing.md, textAlign: 'center',
          }}>
            {app.description}
          </p>

          <div style={{ display: 'flex', gap: design.spacing.sm }}>
            <div style={{
              flex: 1, background: design.colors.bgTertiary, borderRadius: design.radius.md,
              padding: design.spacing.sm, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Principle</p>
              <p style={{ fontSize: 11, color: design.colors.textPrimary, fontFamily: design.font.mono, margin: 0 }}>
                {app.formula}
              </p>
            </div>
            <div style={{
              flex: 1, background: design.colors.bgTertiary, borderRadius: design.radius.md,
              padding: design.spacing.sm, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Real Data</p>
              <p style={{ fontSize: 11, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
                {app.insight}
              </p>
            </div>
          </div>

          {/* Mark as read button */}
          {!completedApps.has(activeApp) && (
            <div style={{ marginTop: design.spacing.md }}>
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emit('interaction', { app: app.id, action: 'marked_read' });
                  // Auto-advance to next if not last
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  border: `1px solid ${design.colors.success}50`,
                  background: design.colors.successMuted,
                  color: design.colors.success,
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: design.font.sans,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                ✓ Mark "{app.title}" as Read
              </button>
            </div>
          )}

          {/* Already read indicator */}
          {completedApps.has(activeApp) && (
            <div style={{
              marginTop: design.spacing.md,
              padding: '10px',
              background: design.colors.successMuted,
              borderRadius: design.radius.md,
              textAlign: 'center',
            }}>
              <span style={{ color: design.colors.success, fontSize: 13, fontFamily: design.font.sans }}>
                ✓ Completed
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: design.spacing.md, gap: design.spacing.sm,
        }}>
          {renderButton(
            '← Previous',
            () => setActiveApp(Math.max(0, activeApp - 1)),
            'ghost',
            activeApp === 0
          )}

          {activeApp < applications.length - 1 ? (
            renderButton(
              'Next →',
              () => setActiveApp(activeApp + 1),
              'secondary',
              !completedApps.has(activeApp)
            )
          ) : allAppsCompleted ? (
            renderButton('Take the Quiz →', () => goToPhase('test'))
          ) : (
            <span style={{
              fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
              textAlign: 'center',
            }}>
              Complete all to continue
            </span>
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: design.spacing.md,
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
            background: design.colors.accentPrimary, borderRadius: design.radius.full,
            transition: 'width 0.3s ease',
          }} />
        </div>

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

          {showExplanation && (
            <div style={{
              marginTop: design.spacing.md, background: design.colors.accentPrimaryMuted,
              border: `1px solid ${design.colors.accentPrimary}40`,
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.md }}>
          {renderButton(
            '← Back',
            () => {
              setCurrentQuestion(prev => Math.max(0, prev - 1));
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion - 1));
            },
            'secondary',
            currentQuestion === 0
          )}

          {currentQuestion < testQuestions.length - 1 ? (
            renderButton(
              'Next →',
              () => {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(answeredQuestions.has(currentQuestion + 1));
              },
              'secondary'
            )
          ) : answeredQuestions.size === testQuestions.length ? (
            renderButton('Complete →', () => goToPhase('mastery'))
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
        background: `linear-gradient(180deg, ${design.colors.bgDeep} 0%, ${design.colors.accentPrimaryMuted} 100%)`,
      }}>
        <div style={{ fontSize: isMobile ? 64 : 72, marginBottom: design.spacing.md }}>🏆</div>

        <h2 style={{
          fontSize: isMobile ? 22 : 26, fontWeight: 700, color: design.colors.textPrimary,
          fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
        }}>
          Balance Master!
        </h2>

        <div style={{
          fontSize: isMobile ? 48 : 56, fontWeight: 700, color: design.colors.success,
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
            fontSize: 15, fontWeight: 700, color: design.colors.accentPrimary,
            fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm, textAlign: 'center',
          }}>
            Key Takeaways
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'COM below pivot = stable equilibrium',
              'COM above pivot = unstable, falls',
              'Adding weight shifts the COM',
              'Keep COM over support to balance'
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
          setCompletedApps(new Set());
          setActiveApp(0);
          setPrediction(null);
          setTwistPrediction(null);
          resetExperiment();
        }, 'primary')}

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
            {['⚖️', '🎯', '⭐', '✨', '🎉'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const phaseRenderers: Record<Phase, () => JSX.Element> = {
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
      {renderProgressBar()}
      {phaseRenderers[phase]()}
    </div>
  );
};

export default CenterOfMassRenderer;
