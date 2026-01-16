'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TORQUE - Premium 10-Phase Educational Game
// Gold Standard Implementation with Sequential Transfer Navigation
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'push_position' | 'friction_toggle' | 'door_push' | 'reset' | 'answer_submit';
}

interface TorqueRendererProps {
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
    // Refined dark theme with purple accent
    bgDeep: '#08050c',
    bgPrimary: '#0f0a14',
    bgSecondary: '#181220',
    bgTertiary: '#221a2d',
    bgCard: '#1e1628',
    bgElevated: '#2d2240',
    bgHover: '#382a4d',

    // High contrast text
    textPrimary: '#ffffff',
    textSecondary: '#b8a8c8',
    textMuted: '#7a6890',
    textDisabled: '#4a4058',

    // Brand colors - Purple theme
    accentPrimary: '#a855f7',
    accentPrimaryHover: '#9333ea',
    accentPrimaryMuted: 'rgba(168, 85, 247, 0.15)',
    accentSecondary: '#f97316',
    accentSecondaryMuted: 'rgba(249, 115, 22, 0.15)',

    // Physics elements
    door: '#a08060',
    doorDark: '#6b5344',
    doorLight: '#c4a882',
    hinge: '#5a5a6a',
    hingeHighlight: '#7a7a8a',
    force: '#22c55e',
    leverArm: '#3b82f6',

    // Functional
    success: '#22c55e',
    successMuted: 'rgba(34, 197, 94, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',

    // Borders
    border: '#3a2850',
    borderLight: '#4a3860',
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
const TorqueRenderer: React.FC<TorqueRendererProps> = ({
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
  const [pushPosition, setPushPosition] = useState(0.8);
  const [hasFriction, setHasFriction] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [doorAngle, setDoorAngle] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [showForceVector, setShowForceVector] = useState(true);

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

  // Physics calculations
  const requiredTorque = hasFriction ? 30 : 15;
  const leverArm = Math.max(0.1, pushPosition);
  const requiredForce = requiredTorque / leverArm;

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

  // Door physics
  const pushDoor = useCallback(() => {
    if (isPushing) return;
    setIsPushing(true);
    setDoorAngle(0);

    emit('interaction', { pushPosition, requiredForce, hasFriction }, 'door_push');

    const targetAngle = 60;
    const speed = 150 / requiredForce;
    let angle = 0;

    const animate = () => {
      angle += speed;
      setDoorAngle(Math.min(angle, targetAngle));

      if (angle < targetAngle) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPushing(false);
        setExperimentCount(prev => prev + 1);
        emit('result', { finalAngle: targetAngle, pushPosition, force: requiredForce });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isPushing, pushPosition, requiredForce, hasFriction, emit]);

  const resetDoor = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPushing(false);
    setDoorAngle(0);
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
    { question: "Why is it easier to open a door by pushing at the handle (far from hinge)?", options: ["The handle is smoother", "Larger lever arm = less force needed", "The door is lighter there", "It's not actually easier"], correct: 1, explanation: "Torque = Force × Lever arm. With a larger lever arm (distance from hinge), you need less force to create the same torque." },
    { question: "What is the correct formula for torque?", options: ["τ = F + r", "τ = F × r", "τ = F / r", "τ = F - r"], correct: 1, explanation: "Torque (τ) equals force (F) times the perpendicular distance (r) from the pivot point: τ = F × r" },
    { question: "If you push a door at half the distance from the hinge, you need:", options: ["Half the force", "The same force", "Twice the force", "Four times the force"], correct: 2, explanation: "Since τ = F × r, halving r means you need to double F to maintain the same torque." },
    { question: "Door handles are placed far from hinges because:", options: ["It looks better aesthetically", "Maximizes lever arm, minimizing force needed", "It's where the door is strongest", "There's no particular reason"], correct: 1, explanation: "Engineers place handles far from hinges to maximize the lever arm, making doors easy to open with minimal force." },
    { question: "A sticky hinge increases the force needed because:", options: ["It adds friction resistance to overcome", "It makes the door heavier", "It changes the lever arm length", "It doesn't affect the force needed"], correct: 0, explanation: "Friction at the hinge creates a resisting torque that must be overcome in addition to the torque needed to accelerate the door." },
    { question: "A wrench with a longer handle:", options: ["Is always heavier to use", "Provides more torque for the same force", "Provides less torque overall", "Doesn't affect the torque"], correct: 1, explanation: "A longer wrench handle increases the lever arm, so the same force produces more torque." },
    { question: "To balance a seesaw with unequal weights:", options: ["Put the heavier weight in the middle", "Put the heavier weight closer to pivot", "Put the lighter weight closer to pivot", "It cannot be balanced"], correct: 1, explanation: "For balance, torques must be equal: W₁ × r₁ = W₂ × r₂. The heavier weight needs a shorter lever arm." },
    { question: "Why do doorstops work best when placed far from the hinge?", options: ["They're easier to see there", "Maximum leverage prevents door motion", "The door is thinner there", "Position doesn't matter"], correct: 1, explanation: "Placing a doorstop far from the hinge maximizes the resisting moment arm, making it harder to push the door open." },
    { question: "A torque wrench is designed to measure:", options: ["The weight of the wrench", "Rotational force being applied", "The length of the wrench", "The turning speed"], correct: 1, explanation: "A torque wrench measures the rotational force (torque) being applied to a fastener, ensuring proper tightening." },
    { question: "If torque = 20 N·m and lever arm = 0.5 m, what force is applied?", options: ["10 N", "40 N", "20 N", "0.025 N"], correct: 1, explanation: "Using τ = F × r: 20 = F × 0.5, solving for F gives F = 40 N." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'wrench',
      title: "Wrench & Bolts",
      description: "Longer wrenches provide more torque with less effort. Mechanics use breaker bars for stubborn bolts—maximum leverage from extended handles!",
      formula: "τ = F × r",
      insight: "2× handle length = 2× torque",
      color: design.colors.accentPrimary,
    },
    {
      id: 'steering',
      title: "Steering Wheels",
      description: "Large steering wheels require less force to turn. Power steering reduces the torque needed at your hands, making driving effortless.",
      formula: "F = τ / r",
      insight: "Larger radius = less effort",
      color: design.colors.leverArm,
    },
    {
      id: 'seesaw',
      title: "Seesaw Balance",
      description: "Torque balance determines equilibrium. A heavier child sits closer to the pivot to balance a lighter child sitting farther away.",
      formula: "m₁r₁ = m₂r₂",
      insight: "Balance point shifts with mass",
      color: design.colors.success,
    },
    {
      id: 'bicycle',
      title: "Bicycle Pedals",
      description: "The crank arm length affects your torque output. Longer cranks provide more leverage but require greater leg movement per rotation.",
      formula: "τ = F × crank length",
      insight: "Typical crank: 170-175mm",
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
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #16a34a 100%)`,
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

  const renderBottomNav = (
    backPhase: Phase | null,
    nextPhase: Phase | null,
    nextDisabled: boolean = false,
    nextText: string = 'Continue →'
  ) => (
    <div style={{
      display: 'flex',
      justifyContent: backPhase ? 'space-between' : 'center',
      marginTop: design.spacing.lg,
      gap: design.spacing.md,
    }}>
      {backPhase && renderButton('← Back', () => goToPhase(backPhase), 'ghost')}
      {nextPhase && renderButton(nextText, () => goToPhase(nextPhase), 'primary', nextDisabled)}
    </div>
  );

  // ============================================================================
  // VISUALIZATION - Premium Door Animation
  // ============================================================================
  const renderVisualization = () => {
    const svgWidth = Math.min(width, 400);
    const hingeX = 65;
    const hingeY = 130;
    const doorLength = svgWidth - 130;
    const doorWidth = 22;
    const pushX = pushPosition * doorLength;

    return (
      <svg width="100%" height={260} viewBox={`0 0 ${svgWidth} 260`} style={{ display: 'block', background: design.colors.bgDeep }}>
        <defs>
          <linearGradient id="torque-door-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.doorLight} />
            <stop offset="50%" stopColor={design.colors.door} />
            <stop offset="100%" stopColor={design.colors.doorDark} />
          </linearGradient>
          <filter id="torque-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="torque-force-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={design.colors.force} floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="torque-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke={design.colors.border} strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={svgWidth} height={260} fill="url(#torque-grid)" />

        {/* Wall */}
        <rect x={0} y={hingeY - 90} width={55} height={180} fill="#3a3a4a" />
        <rect x={50} y={hingeY - 90} width={5} height={180} fill="#4a4a5a" />

        {/* Title */}
        <text x={svgWidth / 2} y={24} textAnchor="middle" fill={design.colors.textPrimary} fontSize={13} fontWeight="600" fontFamily={design.font.sans}>
          Top-Down View (looking down at door)
        </text>

        {/* Door with rotation */}
        <g transform={`translate(${hingeX}, ${hingeY}) rotate(${doorAngle})`} filter="url(#torque-shadow)">
          {/* Door body */}
          <rect x={0} y={-doorWidth / 2} width={doorLength} height={doorWidth} rx={3} fill="url(#torque-door-grad)" />

          {/* Wood grain lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
            <line key={i} x1={doorLength * pos} y1={-doorWidth / 2 + 3} x2={doorLength * pos} y2={doorWidth / 2 - 3}
                  stroke={design.colors.doorDark} strokeWidth={0.5} opacity={0.3} />
          ))}

          {/* Door handle */}
          <circle cx={doorLength - 35} cy={0} r={10} fill="#c9a97c" stroke={design.colors.door} strokeWidth={2} />
          <circle cx={doorLength - 35} cy={0} r={4} fill={design.colors.doorDark} />

          {/* Lever arm visualization */}
          {showForceVector && (
            <g>
              <line x1={0} y1={35} x2={pushX} y2={35}
                    stroke={design.colors.leverArm} strokeWidth={3} strokeDasharray="6,3" />
              <circle cx={0} cy={35} r={4} fill={design.colors.leverArm} />
              <circle cx={pushX} cy={35} r={4} fill={design.colors.leverArm} />
              <text x={pushX / 2} y={55} textAnchor="middle" fill={design.colors.leverArm} fontSize={11} fontWeight="600" fontFamily={design.font.sans}>
                r = {(pushPosition * 100).toFixed(0)}%
              </text>
            </g>
          )}

          {/* Push point indicator */}
          <circle cx={pushX} cy={0} r={12} fill={design.colors.force} stroke="#fff" strokeWidth={2}>
            <animate attributeName="r" values="10;12;10" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Force arrow */}
          {showForceVector && (
            <g transform={`translate(${pushX}, 0)`} filter="url(#torque-force-glow)">
              <line x1={0} y1={-18} x2={0} y2={-18 - requiredForce * 1.2}
                    stroke={design.colors.force} strokeWidth={3} strokeLinecap="round" />
              <polygon points={`0,${-18 - requiredForce * 1.2 - 8} -6,${-18 - requiredForce * 1.2} 6,${-18 - requiredForce * 1.2}`}
                       fill={design.colors.force} />
              <text x={18} y={-25 - requiredForce * 0.6} fill={design.colors.force} fontSize={12} fontWeight="700" fontFamily={design.font.sans}>
                F = {requiredForce.toFixed(1)}N
              </text>
            </g>
          )}
        </g>

        {/* Hinge */}
        <g transform={`translate(${hingeX}, ${hingeY})`}>
          <circle r={16} fill={hasFriction ? '#8b4513' : design.colors.hinge} stroke={design.colors.hingeHighlight} strokeWidth={3} />
          <circle r={6} fill={design.colors.hingeHighlight} />
          {hasFriction && (
            <text x={0} y={38} textAnchor="middle" fill={design.colors.accentSecondary} fontSize={11} fontWeight="600" fontFamily={design.font.sans}>
              Sticky!
            </text>
          )}
        </g>

        {/* Force meter */}
        <g transform={`translate(${svgWidth - 105}, 180)`}>
          <rect x={0} y={0} width={90} height={65} rx={10} fill={design.colors.bgSecondary}
                stroke={design.colors.border} strokeWidth={1} />
          <text x={45} y={18} textAnchor="middle" fill={design.colors.textMuted} fontSize={10} fontFamily={design.font.sans}>
            Required Force
          </text>
          <text x={45} y={45} textAnchor="middle"
                fill={requiredForce > 100 ? design.colors.error : design.colors.force}
                fontSize={22} fontWeight="700" fontFamily={design.font.sans}>
            {requiredForce.toFixed(1)}N
          </text>
        </g>

        {/* Torque display */}
        <g transform="translate(15, 180)">
          <rect x={0} y={0} width={105} height={65} rx={10} fill={design.colors.bgSecondary}
                stroke={design.colors.border} strokeWidth={1} />
          <text x={52} y={18} textAnchor="middle" fill={design.colors.textMuted} fontSize={10} fontFamily={design.font.sans}>
            Torque (τ = F×r)
          </text>
          <text x={52} y={45} textAnchor="middle" fill={design.colors.accentPrimary} fontSize={20} fontWeight="700" fontFamily={design.font.sans}>
            {requiredTorque} N·m
          </text>
        </g>
      </svg>
    );
  };

  // Application graphics for transfer phase
  const renderApplicationGraphic = (appId: string) => {
    const svgWidth = Math.min(width - 60, 340);

    return (
      <svg width="100%" height={140} viewBox={`0 0 ${svgWidth} 140`} style={{ display: 'block' }}>
        <rect width={svgWidth} height={140} fill={design.colors.bgDeep} rx={12} />

        {appId === 'wrench' && (
          <g>
            {/* Wrench body */}
            <rect x={80} y={60} width={180} height={20} rx={4} fill="#6b7280" />
            <rect x={80} y={65} width={180} height={4} fill="#9ca3af" />
            {/* Wrench head */}
            <circle cx={80} cy={70} r={22} fill="#4b5563" stroke="#6b7280" strokeWidth={2} />
            <circle cx={80} cy={70} r={8} fill="#1f2937" />
            {/* Bolt */}
            <polygon points="80,70 88,66 88,62 80,58 72,62 72,66" fill="#374151" stroke="#4b5563" strokeWidth={1} />
            {/* Force arrow */}
            <line x1={260} y1={70} x2={260} y2={25} stroke={design.colors.force} strokeWidth={4} />
            <polygon points="260,20 253,32 267,32" fill={design.colors.force} />
            <text x={278} y={45} fill={design.colors.force} fontSize={12} fontWeight="600">F</text>
            {/* Lever arm */}
            <line x1={80} y1={100} x2={260} y2={100} stroke={design.colors.leverArm} strokeWidth={2} strokeDasharray="4,4" />
            <text x={170} y={118} textAnchor="middle" fill={design.colors.leverArm} fontSize={11} fontWeight="600">Lever arm (r)</text>
            {/* Rotation indicator */}
            <path d="M 60 50 A 30 30 0 0 0 60 90" stroke={design.colors.accentPrimary} strokeWidth={2} fill="none" markerEnd="url(#arrow)" />
            <text x={35} y={75} fill={design.colors.accentPrimary} fontSize={14} fontWeight="700">τ</text>
          </g>
        )}

        {appId === 'steering' && (
          <g>
            {/* Steering wheel */}
            <circle cx={svgWidth/2} cy={70} r={50} fill="none" stroke="#374151" strokeWidth={10} />
            <circle cx={svgWidth/2} cy={70} r={50} fill="none" stroke="#4b5563" strokeWidth={5} />
            <circle cx={svgWidth/2} cy={70} r={15} fill="#1f2937" stroke="#4b5563" strokeWidth={2} />
            {/* Spokes */}
            <line x1={svgWidth/2} y1={70} x2={svgWidth/2} y2={25} stroke="#4b5563" strokeWidth={6} />
            <line x1={svgWidth/2} y1={70} x2={svgWidth/2 - 40} y2={100} stroke="#4b5563" strokeWidth={6} />
            <line x1={svgWidth/2} y1={70} x2={svgWidth/2 + 40} y2={100} stroke="#4b5563" strokeWidth={6} />
            {/* Hands and force arrows */}
            <circle cx={svgWidth/2 - 50} cy={70} r={8} fill={design.colors.accentSecondary} />
            <line x1={svgWidth/2 - 50} y1={58} x2={svgWidth/2 - 50} y2={40} stroke={design.colors.force} strokeWidth={3} />
            <polygon points={`${svgWidth/2 - 50},36 ${svgWidth/2 - 55},44 ${svgWidth/2 - 45},44`} fill={design.colors.force} />
            <circle cx={svgWidth/2 + 50} cy={70} r={8} fill={design.colors.accentSecondary} />
            <line x1={svgWidth/2 + 50} y1={82} x2={svgWidth/2 + 50} y2={100} stroke={design.colors.force} strokeWidth={3} />
            <polygon points={`${svgWidth/2 + 50},104 ${svgWidth/2 - 45 + 100},96 ${svgWidth/2 + 55},96`} fill={design.colors.force} />
            {/* Rotation arrow */}
            <path d="M ${svgWidth/2 + 70} 45 A 60 60 0 0 1 ${svgWidth/2 + 70} 95" stroke={design.colors.accentPrimary} strokeWidth={2} fill="none" />
            <text x={svgWidth/2 + 85} y={75} fill={design.colors.accentPrimary} fontSize={14} fontWeight="700">τ</text>
          </g>
        )}

        {appId === 'seesaw' && (
          <g>
            {/* Fulcrum */}
            <polygon points={`${svgWidth/2},95 ${svgWidth/2 - 25},125 ${svgWidth/2 + 25},125`} fill="#4b5563" />
            {/* Board */}
            <rect x={40} y={85} width={svgWidth - 80} height={10} rx={3} fill="#8b7355" transform={`rotate(-6, ${svgWidth/2}, 90)`} />
            {/* Heavy weight (left, closer to center) */}
            <g transform="rotate(-6, ${svgWidth/2}, 90)">
              <circle cx={100} cy={70} r={25} fill={design.colors.error}>
                <animate attributeName="cy" values="68;72;68" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text x={100} y={76} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="700">5kg</text>
              {/* Arrow down */}
              <line x1={100} y1={100} x2={100} y2={115} stroke={design.colors.error} strokeWidth={2} />
              <polygon points="100,120 95,112 105,112" fill={design.colors.error} />
            </g>
            {/* Light weight (right, farther from center) */}
            <g transform="rotate(-6, ${svgWidth/2}, 90)">
              <circle cx={svgWidth - 80} cy={105} r={18} fill={design.colors.success}>
                <animate attributeName="cy" values="107;103;107" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text x={svgWidth - 80} y={110} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="700">2kg</text>
            </g>
            {/* Labels */}
            <text x={100} y={40} textAnchor="middle" fill={design.colors.textMuted} fontSize={10}>short r₁</text>
            <text x={svgWidth - 80} y={40} textAnchor="middle" fill={design.colors.textMuted} fontSize={10}>long r₂</text>
          </g>
        )}

        {appId === 'bicycle' && (
          <g>
            {/* Chainring */}
            <circle cx={svgWidth/2} cy={70} r={40} fill="none" stroke="#4b5563" strokeWidth={5} />
            <circle cx={svgWidth/2} cy={70} r={40} fill="none" stroke="#374151" strokeWidth={2} strokeDasharray="8,4" />
            <circle cx={svgWidth/2} cy={70} r={10} fill="#1f2937" stroke="#4b5563" strokeWidth={2} />
            {/* Chain teeth */}
            {[...Array(16)].map((_, i) => (
              <circle key={i}
                cx={svgWidth/2 + 38 * Math.cos(i * Math.PI / 8)}
                cy={70 + 38 * Math.sin(i * Math.PI / 8)}
                r={3} fill="#4b5563" />
            ))}
            {/* Crank arm */}
            <line x1={svgWidth/2} y1={70} x2={svgWidth/2} y2={120} stroke="#6b7280" strokeWidth={8} strokeLinecap="round" />
            {/* Pedal */}
            <rect x={svgWidth/2 - 18} y={115} width={36} height={12} rx={3} fill="#374151" stroke="#4b5563" strokeWidth={1} />
            {/* Foot */}
            <ellipse cx={svgWidth/2} cy={112} rx={15} ry={8} fill={design.colors.accentSecondary} opacity={0.8} />
            {/* Force arrow */}
            <line x1={svgWidth/2} y1={132} x2={svgWidth/2} y2={138} stroke={design.colors.force} strokeWidth={4} />
            <polygon points={`${svgWidth/2},142 ${svgWidth/2 - 6},134 ${svgWidth/2 + 6},134`} fill={design.colors.force} />
            <text x={svgWidth/2 + 20} y={140} fill={design.colors.force} fontSize={12} fontWeight="600">F</text>
            {/* Crank length label */}
            <line x1={svgWidth/2 + 12} y1={70} x2={svgWidth/2 + 12} y2={120} stroke={design.colors.accentSecondary} strokeWidth={1} strokeDasharray="3,3" />
            <text x={svgWidth/2 + 28} y={100} fill={design.colors.accentSecondary} fontSize={10}>crank (r)</text>
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
        🚪
      </div>

      <h1 style={{
        fontSize: isMobile ? 22 : 26, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, textAlign: 'center', margin: 0, marginBottom: design.spacing.sm,
        letterSpacing: '-0.5px',
      }}>
        The Door Handle Mystery
      </h1>

      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', maxWidth: 300, lineHeight: 1.6, margin: 0, marginBottom: design.spacing.xl,
      }}>
        Have you ever tried to push a door near its hinges? It's surprisingly hard!
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
          "Where should you push to need the <em>least</em> force?"
        </p>
      </div>

      {renderButton("Let's Investigate →", () => goToPhase('predict'))}

      <p style={{
        fontSize: 12, color: design.colors.textMuted, fontFamily: design.font.sans,
        marginTop: design.spacing.xl, letterSpacing: '0.5px',
      }}>
        TORQUE • LEVER ARMS • τ = F × r
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
        To open a door with the least effort, where should you push?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'near_hinge', label: 'Near the hinge (close to pivot)', icon: '📍' },
          { id: 'middle', label: 'In the middle of the door', icon: '🎯' },
          { id: 'far_edge', label: 'Far from hinge (at the handle)', icon: '🚪' }
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
        {/* Slider control */}
        <div style={{ width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 13, color: design.colors.textSecondary, marginBottom: design.spacing.sm, fontFamily: design.font.sans }}>
            Push position: <strong style={{ color: design.colors.accentPrimary }}>{(pushPosition * 100).toFixed(0)}%</strong> from hinge
          </p>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={pushPosition}
            onChange={(e) => { setPushPosition(parseFloat(e.target.value)); resetDoor(); emit('interaction', { position: e.target.value }, 'push_position'); }}
            disabled={isPushing}
            style={{ width: '100%', accentColor: design.colors.accentPrimary, height: 6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: design.colors.textMuted, fontFamily: design.font.sans, marginTop: 4 }}>
            <span>Near hinge</span>
            <span>At handle</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.sm }}>
          {doorAngle === 0 && renderButton('👆 Push Door!', pushDoor, 'success', isPushing)}
          {doorAngle > 0 && renderButton('↺ Reset', resetDoor, 'secondary')}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0 }}>
          Experiments: {experimentCount} • Try different positions!
        </p>

        {experimentCount >= 3 && renderButton('I see the pattern! →', () => goToPhase('review'))}
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
        Torque = Force × Lever Arm
      </h2>

      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.lg, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 24, color: design.colors.accentPrimary, fontFamily: design.font.mono,
          textAlign: 'center', fontWeight: 700, margin: 0, marginBottom: design.spacing.sm,
        }}>
          τ = F × r
        </p>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.5, margin: 0,
        }}>
          To rotate something, you need <em style={{ color: design.colors.accentPrimary }}>torque</em>.
          Same torque can come from big force + small distance, or small force + big distance!
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, maxWidth: 340, width: '100%', marginBottom: design.spacing.md }}>
        <div style={{
          background: design.colors.successMuted, border: `1px solid ${design.colors.success}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.success, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            Far from hinge (large r)
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            Small force gives enough torque → Easy!
          </p>
        </div>

        <div style={{
          background: design.colors.errorMuted, border: `1px solid ${design.colors.error}40`,
          borderRadius: design.radius.md, padding: design.spacing.md,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.error, fontFamily: design.font.sans, margin: 0, marginBottom: 4 }}>
            Near hinge (small r)
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
            Need huge force for same torque → Hard!
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 14, color: prediction === 'far_edge' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {prediction === 'far_edge' ? '✓ Correct!' : 'Now you understand!'}
      </p>

      {renderButton('What About a Sticky Hinge? →', () => goToPhase('twist_predict'))}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>🔥</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.sm,
      }}>
        Plot Twist: Sticky Hinge!
      </h2>
      <p style={{
        fontSize: isMobile ? 14 : 15, color: design.colors.textSecondary, fontFamily: design.font.sans,
        textAlign: 'center', margin: 0, marginBottom: design.spacing.lg,
      }}>
        What if the hinge is rusty and sticky?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm, width: '100%', maxWidth: 340 }}>
        {[
          { id: 'same', label: "Same force - friction doesn't matter" },
          { id: 'more', label: "More force needed - must overcome friction" },
          { id: 'less', label: "Less force - friction helps somehow" }
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
          {renderButton('Test Sticky Hinge! →', () => { setHasFriction(true); resetDoor(); goToPhase('twist_play'); })}
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
        {/* Hinge toggle */}
        <div style={{ display: 'flex', gap: design.spacing.sm, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>Hinge:</span>
          <button onMouseDown={() => { setHasFriction(false); resetDoor(); }} disabled={isPushing}
            style={{
              padding: '8px 16px', borderRadius: design.radius.md, border: 'none',
              background: !hasFriction ? design.colors.success : design.colors.bgTertiary,
              color: !hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600, fontSize: 13, cursor: isPushing ? 'not-allowed' : 'pointer',
            }}>
            Smooth
          </button>
          <button onMouseDown={() => { setHasFriction(true); resetDoor(); }} disabled={isPushing}
            style={{
              padding: '8px 16px', borderRadius: design.radius.md, border: 'none',
              background: hasFriction ? design.colors.accentSecondary : design.colors.bgTertiary,
              color: hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600, fontSize: 13, cursor: isPushing ? 'not-allowed' : 'pointer',
            }}>
            🔥 Sticky
          </button>
        </div>

        {/* Slider */}
        <div style={{ width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 13, color: design.colors.textSecondary, marginBottom: design.spacing.sm, fontFamily: design.font.sans }}>
            Push position: <strong style={{ color: design.colors.accentPrimary }}>{(pushPosition * 100).toFixed(0)}%</strong>
          </p>
          <input type="range" min="0.1" max="1" step="0.05" value={pushPosition}
            onChange={(e) => { setPushPosition(parseFloat(e.target.value)); resetDoor(); }}
            disabled={isPushing} style={{ width: '100%', accentColor: design.colors.accentPrimary }} />
        </div>

        <div style={{ display: 'flex', gap: design.spacing.sm }}>
          {doorAngle === 0 && renderButton('👆 Push!', pushDoor, 'success', isPushing)}
          {doorAngle > 0 && renderButton('↺ Reset', resetDoor, 'secondary')}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textMuted, fontFamily: design.font.sans, margin: 0 }}>
          Compare smooth vs sticky hinge forces!
        </p>

        {experimentCount >= 5 && renderButton('I understand! →', () => goToPhase('twist_review'))}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: design.spacing.xl, height: '100%', background: design.colors.bgPrimary,
    }}>
      <div style={{ fontSize: 48, marginBottom: design.spacing.md }}>⚙️</div>
      <h2 style={{
        fontSize: isMobile ? 20 : 22, fontWeight: 700, color: design.colors.textPrimary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.md,
      }}>
        Friction Adds Resistance
      </h2>

      <div style={{
        background: design.colors.bgSecondary, borderRadius: design.radius.lg,
        padding: design.spacing.lg, marginBottom: design.spacing.md, maxWidth: 340, width: '100%',
        border: `1px solid ${design.colors.border}`,
      }}>
        <p style={{
          fontSize: 16, color: design.colors.accentSecondary, fontFamily: design.font.sans,
          textAlign: 'center', fontWeight: 600, margin: 0, marginBottom: design.spacing.sm,
        }}>
          Friction creates a resisting torque!
        </p>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', lineHeight: 1.5, margin: 0,
        }}>
          You need extra torque to overcome the friction at the hinge. This means more force at any position!
        </p>
      </div>

      <div style={{
        background: design.colors.accentPrimaryMuted, border: `1px solid ${design.colors.accentPrimary}40`,
        borderRadius: design.radius.lg, padding: design.spacing.md, marginBottom: design.spacing.lg,
        maxWidth: 340, width: '100%',
      }}>
        <p style={{
          fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans,
          textAlign: 'center', margin: 0,
        }}>
          <strong style={{ color: design.colors.success }}>Smooth:</strong> τ needed = 15 N·m<br />
          <strong style={{ color: design.colors.accentSecondary }}>Sticky:</strong> τ needed = 30 N·m (2× more!)
        </p>
      </div>

      <p style={{
        fontSize: 14, color: twistPrediction === 'more' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans, margin: 0, marginBottom: design.spacing.lg,
      }}>
        Your prediction: {twistPrediction === 'more' ? '✓ Correct!' : 'Now you understand!'}
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
          Torque in the Real World
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
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Formula</p>
              <p style={{ fontSize: 12, color: design.colors.textPrimary, fontFamily: design.font.mono, margin: 0 }}>
                {app.formula}
              </p>
            </div>
            <div style={{
              flex: 1, background: design.colors.bgTertiary, borderRadius: design.radius.md,
              padding: design.spacing.sm, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: design.colors.textMuted, margin: 0, marginBottom: 2 }}>Key Insight</p>
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
          Torque Master!
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
              'τ = Force × Lever arm',
              'Longer lever arm = less force needed',
              'Door handles maximize leverage',
              'Friction requires extra torque'
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
          setPushPosition(0.8);
          setHasFriction(false);
          resetDoor();
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
            {['🚪', '🔧', '⭐', '✨', '🎉'][Math.floor(Math.random() * 5)]}
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

export default TorqueRenderer;
