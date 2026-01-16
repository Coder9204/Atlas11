'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// BERNOULLI RENDERER - LIFT & FLUID DYNAMICS
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface BernoulliRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  metadata?: {
    currentPhase?: number;
    showPrediction?: boolean;
    showQuiz?: boolean;
  };
}

// Premium Design System
const colors = {
  background: '#0a0f1a',
  cardBg: '#141e2c',
  primary: '#60a5fa',
  secondary: '#818cf8',
  accent: '#f472b6',
  success: '#34d399',
  warning: '#fbbf24',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#1e3a5f',
  gradientStart: '#1e3a8a',
  gradientEnd: '#7c3aed',
};

const typography = {
  h1: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' },
  h2: { fontSize: '22px', fontWeight: '600', letterSpacing: '-0.01em' },
  h3: { fontSize: '18px', fontWeight: '600' },
  body: { fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
  small: { fontSize: '14px', fontWeight: '400' },
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

const phases = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type Phase = typeof phases[number];

const predictions = {
  initial: {
    question: "You hold a strip of paper below your lips and blow across the top of it (not under it). What happens to the paper?",
    options: [
      { id: 'a', text: 'It bends downward from the force of air', icon: '⬇️' },
      { id: 'b', text: 'It rises up toward the airflow', icon: '⬆️' },
      { id: 'c', text: 'It stays perfectly still', icon: '➖' },
      { id: 'd', text: 'It flaps back and forth randomly', icon: '🔄' },
    ],
    correct: 'b',
    explanation: "The paper rises! When you blow across the top, you create fast-moving air above and still air below. According to Bernoulli's principle, faster-moving air has LOWER pressure. The higher pressure below pushes the paper up into the low-pressure zone above. This is exactly how airplane wings generate lift!"
  },
  twist: {
    question: "A baseball pitcher throws a curveball. The ball spins as it travels, creating faster airflow on one side than the other. Which way does the ball curve?",
    options: [
      { id: 'a', text: 'Toward the side with faster-moving air (lower pressure)', icon: '💨' },
      { id: 'b', text: 'Away from the side with faster-moving air', icon: '↔️' },
      { id: 'c', text: 'It doesn\'t curve - that\'s an optical illusion', icon: '👁️' },
      { id: 'd', text: 'Straight down from gravity only', icon: '⬇️' },
    ],
    correct: 'a',
    explanation: "The ball curves toward the low-pressure side! Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). The ball is pushed from high to low pressure - this is the Magnus effect! It's Bernoulli's principle applied to spinning objects."
  }
};

const realWorldApplications = [
  {
    id: 'airplane',
    title: '✈️ Airplane Wings',
    subtitle: 'How 500 tons fly through air',
    description: 'Airplane wings are shaped so air travels faster over the curved top than under the flatter bottom. Faster air = lower pressure above the wing. The pressure difference creates lift - up to 500,000+ pounds for a 747!',
    formula: 'Lift = ½ρv²ACL (air density × velocity² × wing area × lift coefficient)',
    realExample: 'A Boeing 747 wing creates enough lift to support 400 tons at takeoff speed of 180 mph.',
    interactiveHint: 'Hold paper below your lips and blow across the top - instant wing demonstration!'
  },
  {
    id: 'curveball',
    title: '⚾ Sports Spin',
    subtitle: 'Curving balls and soccer bends',
    description: 'When a ball spins, it drags air faster on one side (creating low pressure) and slower on the other (higher pressure). The ball moves toward low pressure - that\'s the Magnus effect, making curveballs, sliced golf shots, and "banana kicks" possible.',
    formula: 'Magnus Force ∝ spin rate × velocity × ball radius',
    realExample: 'A 90mph fastball with 2000 RPM spin can curve over 17 inches from a straight path!',
    interactiveHint: 'Try spinning a ping pong ball when you throw it - watch it curve dramatically!'
  },
  {
    id: 'venturi',
    title: '💨 Venturi Effect',
    subtitle: 'Narrow pipes, fast flow',
    description: 'When fluid flows through a constriction, it speeds up (continuity) and pressure drops (Bernoulli). This venturi effect powers carburetors, atomizers, paint sprayers, and even measures fluid flow in pipes.',
    formula: 'A₁v₁ = A₂v₂ (continuity) + Bernoulli → P₂ < P₁ in narrow section',
    realExample: 'Perfume atomizers use venturi effect - fast air over a tube sucks up perfume to make mist.',
    interactiveHint: 'Put two cans close together and blow between them - they pull together, not apart!'
  },
  {
    id: 'shower',
    title: '🚿 Shower Curtain Mystery',
    subtitle: 'Why it attacks you',
    description: 'Hot shower water creates a column of rising air (convection). This moving air has lower pressure than the still air outside the shower. The pressure difference pushes the curtain inward - Bernoulli strikes again!',
    formula: 'Moving air inside (low P) + Still air outside (high P) = Inward force',
    realExample: 'The shower curtain effect was officially studied and won an Ig Nobel Prize in 2001!',
    interactiveHint: 'Notice how the curtain billows less with cold water - less convection, less Bernoulli!'
  }
];

const quizQuestions = [
  {
    question: "According to Bernoulli's principle, when fluid speed increases, what happens to pressure?",
    options: [
      "Pressure increases",
      "Pressure decreases",
      "Pressure stays the same",
      "Pressure becomes zero"
    ],
    correct: 1,
    explanation: "Bernoulli's principle states that faster-moving fluid has lower pressure. This is because energy is conserved - as kinetic energy (speed) increases, pressure energy must decrease."
  },
  {
    question: "How do airplane wings generate lift?",
    options: [
      "By pushing air downward with propellers",
      "By creating higher pressure above the wing",
      "By creating lower pressure above the wing (faster airflow)",
      "By being lighter than air"
    ],
    correct: 2,
    explanation: "Wings are shaped so air flows faster over the curved top than under the bottom. Faster air = lower pressure above. The pressure difference (high below, low above) creates upward lift force."
  },
  {
    question: "What is the Bernoulli equation?",
    options: [
      "F = ma",
      "E = mc²",
      "P + ½ρv² + ρgh = constant",
      "PV = nRT"
    ],
    correct: 2,
    explanation: "The Bernoulli equation states that pressure (P) + kinetic energy density (½ρv²) + gravitational potential energy density (ρgh) remains constant along a streamline."
  },
  {
    question: "What causes a curveball to curve?",
    options: [
      "Air resistance alone",
      "Gravity pulling it down",
      "The Magnus effect - spin creates pressure differences",
      "Optical illusion"
    ],
    correct: 2,
    explanation: "Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). The ball is pushed toward the low-pressure side - this is the Magnus effect."
  },
  {
    question: "What is the Venturi effect?",
    options: [
      "Sound travels faster in tunnels",
      "Fluid speeds up and pressure drops in a constriction",
      "Water always flows downhill",
      "Hot air rises"
    ],
    correct: 1,
    explanation: "When fluid enters a narrow section, it must speed up (continuity equation). By Bernoulli's principle, this faster-moving fluid has lower pressure - the Venturi effect."
  },
  {
    question: "Why does a shower curtain get sucked inward?",
    options: [
      "Static electricity",
      "Water splashing on it",
      "Moving air from hot water has lower pressure than still air outside",
      "Magnetic forces"
    ],
    correct: 2,
    explanation: "Hot water creates a rising column of moving air (convection) with lower pressure. The higher pressure of still air outside pushes the curtain inward - Bernoulli's principle at work!"
  },
  {
    question: "If you blow between two hanging pieces of paper, what happens?",
    options: [
      "They blow apart",
      "They come together",
      "They don't move",
      "One rises, one falls"
    ],
    correct: 1,
    explanation: "The fast-moving air between the papers has lower pressure than the still air outside them. The higher outside pressure pushes them together - a classic Bernoulli demonstration!"
  },
  {
    question: "Why do race cars have spoilers that push down instead of up?",
    options: [
      "To look cool",
      "Inverted wing shape creates downforce for better grip",
      "To reduce drag",
      "To cool the engine"
    ],
    correct: 1,
    explanation: "Spoilers are inverted wings - they create faster airflow below, lower pressure below, and therefore downward force. This gives tires more grip for faster cornering."
  },
  {
    question: "What does the continuity equation state about fluid in a pipe?",
    options: [
      "Pressure is constant",
      "Temperature is constant",
      "A₁v₁ = A₂v₂ (flow rate is constant)",
      "Density changes with speed"
    ],
    correct: 2,
    explanation: "The continuity equation states that for incompressible flow, the product of cross-sectional area and velocity is constant. Narrow pipe = faster flow. Wide pipe = slower flow."
  },
  {
    question: "How do atomizers and spray bottles work?",
    options: [
      "Pumping creates high pressure that pushes liquid out",
      "Fast air over a tube creates low pressure that sucks liquid up (Venturi)",
      "Chemical reaction produces gas",
      "Liquid is heated until it evaporates"
    ],
    correct: 1,
    explanation: "Fast-moving air over a tube creates low pressure (Venturi effect). This sucks liquid up the tube where it gets broken into tiny droplets by the airflow - that's how perfume atomizers work!"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BernoulliRenderer: React.FC<BernoulliRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  metadata
}) => {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [completedApps, setCompletedApps] = useState<string[]>([]);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive state for simulation
  const [airSpeed, setAirSpeed] = useState(50);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [showPressure, setShowPressure] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'wing' | 'venturi' | 'ball'>('wing');
  const [ballSpin, setBallSpin] = useState(0); // RPM, negative = topspin
  const [animationTime, setAnimationTime] = useState(0);

  // Animation ref
  const animationRef = useRef<number>();
  const isTransitioningRef = useRef(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate lift based on airspeed and angle of attack
  const calculateLift = useCallback((speed: number, angle: number) => {
    // Simplified lift calculation
    // Lift increases with speed² and angle (up to stall)
    const stallAngle = 15;
    const effectiveAngle = Math.min(angle, stallAngle);
    const lift = (speed / 100) ** 2 * (effectiveAngle / 15) * 100;
    return Math.min(100, lift);
  }, []);

  // Calculate Magnus force for spinning ball
  const calculateMagnusForce = useCallback((speed: number, spin: number) => {
    // Magnus force proportional to speed × spin
    return (speed / 100) * (spin / 2000) * 50;
  }, []);

  const lift = calculateLift(airSpeed, angleOfAttack);
  const magnusForce = calculateMagnusForce(airSpeed, ballSpin);

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setAirSpeed(50);
      setAngleOfAttack(5);
      setSimulationMode('wing');
    } else if (newPhase === 'twist_play') {
      setAirSpeed(50);
      setBallSpin(1500);
      setSimulationMode('ball');
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, []);

  // Prediction handling
  const handlePredictionSelect = useCallback((optionId: string) => {
    if (showPredictionFeedback || isTransitioningRef.current) return;
    setSelectedPrediction(optionId);
  }, [showPredictionFeedback]);

  const handlePredictionSubmit = useCallback(() => {
    if (!selectedPrediction || showPredictionFeedback || isTransitioningRef.current) return;
    setShowPredictionFeedback(true);
  }, [selectedPrediction, showPredictionFeedback]);

  // Quiz handling
  const handleAnswerSelect = useCallback((index: number) => {
    if (showQuizFeedback || isTransitioningRef.current) return;
    setSelectedAnswer(index);
  }, [showQuizFeedback]);

  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || showQuizFeedback || isTransitioningRef.current) return;
    setShowQuizFeedback(true);
    if (selectedAnswer === quizQuestions[currentQuestion].correct) {
      setScore(s => s + 1);
    }
  }, [selectedAnswer, showQuizFeedback, currentQuestion]);

  const handleNextQuestion = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowQuizFeedback(false);
    } else {
      goToPhase('mastery');
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [currentQuestion, goToPhase]);

  // Application navigation with sequential unlock
  const handleCompleteApp = useCallback((appId: string) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (!completedApps.includes(appId)) {
      setCompletedApps(prev => [...prev, appId]);
    }

    if (currentAppIndex < realWorldApplications.length - 1) {
      setCurrentAppIndex(i => i + 1);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [completedApps, currentAppIndex]);

  const canAccessQuiz = completedApps.length >= realWorldApplications.length;

  // ============================================================================
  // RENDER HELPERS (Functions, not components)
  // ============================================================================

  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) => {
    const bgColor = variant === 'primary' ? colors.primary
      : variant === 'success' ? colors.success
      : 'transparent';
    const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

    return (
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: variant === 'secondary' ? colors.primary : colors.text,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: radius.md,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </button>
    );
  };

  const renderProgressBar = () => {
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div style={{ marginBottom: spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
          fontSize: typography.small.fontSize,
          color: colors.textSecondary,
        }}>
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{
          height: 8,
          background: colors.border,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: radius.sm,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  };

  // ============================================================================
  // BERNOULLI VISUALIZATION
  // ============================================================================

  const renderWingSimulation = () => {
    const simWidth = isMobile ? width - 40 : 550;
    const simHeight = 350;
    const centerX = simWidth / 2;
    const centerY = simHeight / 2;

    // Wing position with angle of attack
    const wingLength = 150;
    const wingAngleRad = angleOfAttack * Math.PI / 180;

    // Pressure visualization (color intensity)
    const topPressure = 1 - (lift / 100) * 0.6; // Lower pressure on top
    const bottomPressure = 1 + (lift / 100) * 0.3; // Higher pressure on bottom

    return (
      <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={simWidth} height={simHeight} fill="url(#skyGrad)" />

        {/* Streamlines */}
        {showStreamlines && (
          <g>
            {/* Top streamlines (compressed = faster) */}
            {[-60, -45, -30, -15].map((yOffset, i) => {
              const compression = 1 - (lift / 200); // Lines get closer when lift is high
              const animOffset = (animationTime * airSpeed * 0.5 + i * 50) % simWidth;
              const yPos = centerY + yOffset * compression;

              return (
                <g key={`top-${i}`}>
                  {/* Streamline path */}
                  <path
                    d={`M 0 ${yPos}
                        Q ${centerX - 80} ${yPos}
                          ${centerX - 30} ${yPos + yOffset * 0.3 * (lift / 100)}
                        Q ${centerX + 30} ${yPos + yOffset * 0.5 * (lift / 100)}
                          ${centerX + 80} ${yPos}
                        L ${simWidth} ${yPos}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                  {/* Animated particle */}
                  <circle
                    cx={(animOffset)}
                    cy={yPos}
                    r={3}
                    fill={colors.primary}
                    opacity={0.8}
                  />
                </g>
              );
            })}

            {/* Bottom streamlines (spread = slower) */}
            {[15, 30, 45, 60].map((yOffset, i) => {
              const spread = 1 + (lift / 400);
              const animOffset = (animationTime * airSpeed * 0.35 + i * 50) % simWidth;
              const yPos = centerY + yOffset * spread;

              return (
                <g key={`bottom-${i}`}>
                  <path
                    d={`M 0 ${yPos}
                        Q ${centerX - 60} ${yPos}
                          ${centerX - 20} ${yPos - yOffset * 0.2 * (lift / 100)}
                        Q ${centerX + 60} ${yPos - yOffset * 0.1 * (lift / 100)}
                          ${simWidth} ${yPos}`}
                    fill="none"
                    stroke={colors.warning}
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                  <circle
                    cx={(animOffset)}
                    cy={yPos}
                    r={3}
                    fill={colors.warning}
                    opacity={0.8}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Pressure regions */}
        {showPressure && (
          <g>
            {/* Low pressure above (blue) */}
            <ellipse
              cx={centerX}
              cy={centerY - 30}
              rx={80}
              ry={30}
              fill={colors.primary}
              opacity={0.2 + (lift / 200)}
            />
            <text x={centerX} y={centerY - 50} fill={colors.primary}
                  fontSize={12} textAnchor="middle" fontWeight="600">
              LOW PRESSURE
            </text>
            <text x={centerX} y={centerY - 35} fill={colors.primary}
                  fontSize={10} textAnchor="middle">
              Fast air → {(100 - topPressure * 50).toFixed(0)}% P
            </text>

            {/* High pressure below (orange) */}
            <ellipse
              cx={centerX}
              cy={centerY + 50}
              rx={70}
              ry={25}
              fill={colors.warning}
              opacity={0.2 + (lift / 300)}
            />
            <text x={centerX} y={centerY + 70} fill={colors.warning}
                  fontSize={12} textAnchor="middle" fontWeight="600">
              HIGH PRESSURE
            </text>
            <text x={centerX} y={centerY + 85} fill={colors.warning}
                  fontSize={10} textAnchor="middle">
              Slow air → {(100 + bottomPressure * 20).toFixed(0)}% P
            </text>
          </g>
        )}

        {/* Airfoil (wing) */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${-angleOfAttack})`}>
          {/* Wing shape - airfoil */}
          <path
            d={`M ${-wingLength / 2} 0
                Q ${-wingLength / 4} ${-20} 0 ${-25}
                Q ${wingLength / 4} ${-20} ${wingLength / 2} 0
                Q ${wingLength / 4} 5 0 8
                Q ${-wingLength / 4} 5 ${-wingLength / 2} 0`}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={2}
          />
        </g>

        {/* Lift arrow */}
        {lift > 5 && (
          <g>
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY - lift * 0.8}
              stroke={colors.success}
              strokeWidth={4}
            />
            <polygon
              points={`${centerX},${centerY - lift * 0.8 - 15} ${centerX - 10},${centerY - lift * 0.8} ${centerX + 10},${centerY - lift * 0.8}`}
              fill={colors.success}
            />
            <text x={centerX + 20} y={centerY - lift * 0.4} fill={colors.success}
                  fontSize={14} fontWeight="600">
              LIFT
            </text>
          </g>
        )}

        {/* Wind direction */}
        <g>
          <line x1={30} y1={centerY} x2={80} y2={centerY}
                stroke={colors.text} strokeWidth={2} />
          <polygon points="80,{centerY} 70,{centerY - 5} 70,{centerY + 5}"
                   fill={colors.text}
                   transform={`translate(0, ${centerY - centerY})`} />
          <text x={10} y={centerY - 15} fill={colors.textSecondary} fontSize={11}>
            Wind
          </text>
          <text x={10} y={centerY + 20} fill={colors.textSecondary} fontSize={11}>
            {airSpeed} m/s
          </text>
        </g>

        {/* Labels */}
        <text x={simWidth - 10} y={20} fill={colors.textSecondary}
              fontSize={12} textAnchor="end">
          Angle of Attack: {angleOfAttack}°
        </text>
      </svg>
    );
  };

  const renderBallSimulation = () => {
    const simWidth = isMobile ? width - 40 : 550;
    const simHeight = 350;
    const centerY = simHeight / 2;

    // Ball position (curves based on Magnus force)
    const ballX = (animationTime * airSpeed * 2) % (simWidth + 100) - 50;
    const curveAmount = magnusForce * 2;
    const ballY = centerY + Math.sin(ballX / 100) * curveAmount;

    // Spin direction visualization
    const spinDirection = ballSpin > 0 ? 1 : -1;

    return (
      <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
        </defs>

        {/* Background - baseball field */}
        <rect width={simWidth} height={simHeight} fill="url(#fieldGrad)" />

        {/* Trajectory path */}
        <path
          d={`M 50 ${centerY} Q ${simWidth / 2} ${centerY + curveAmount * 3} ${simWidth - 50} ${centerY}`}
          fill="none"
          stroke={colors.warning}
          strokeWidth={2}
          strokeDasharray="10,5"
          opacity={0.5}
        />

        {/* Streamlines around ball */}
        {showStreamlines && ballX > 0 && ballX < simWidth && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            {/* Fast side (low pressure) */}
            <path
              d={`M -60 ${-20 * spinDirection} Q -20 ${-40 * spinDirection} 40 ${-20 * spinDirection}`}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              opacity={0.6}
            />
            <text x={-10} y={-50 * spinDirection} fill={colors.primary}
                  fontSize={10} textAnchor="middle">
              Fast (Low P)
            </text>

            {/* Slow side (high pressure) */}
            <path
              d={`M -60 ${20 * spinDirection} Q -20 ${30 * spinDirection} 40 ${20 * spinDirection}`}
              fill="none"
              stroke={colors.warning}
              strokeWidth={2}
              opacity={0.6}
            />
            <text x={-10} y={60 * spinDirection} fill={colors.warning}
                  fontSize={10} textAnchor="middle">
              Slow (High P)
            </text>
          </g>
        )}

        {/* Baseball */}
        <g transform={`translate(${ballX}, ${ballY}) rotate(${animationTime * ballSpin * 0.1})`}>
          <circle r={25} fill="#f5f5f4" stroke="#a3a3a3" strokeWidth={2} />
          {/* Seams */}
          <path
            d="M -20 -10 Q -10 -20, 0 -15 Q 10 -10, 20 -15"
            fill="none"
            stroke="#dc2626"
            strokeWidth={2}
          />
          <path
            d="M -20 10 Q -10 20, 0 15 Q 10 10, 20 15"
            fill="none"
            stroke="#dc2626"
            strokeWidth={2}
          />
        </g>

        {/* Magnus force arrow */}
        {Math.abs(ballSpin) > 100 && ballX > 100 && ballX < simWidth - 100 && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-magnusForce * 1.5}
              stroke={colors.accent}
              strokeWidth={3}
            />
            <polygon
              points={`0,${-magnusForce * 1.5 - 10} -8,${-magnusForce * 1.5 + 5} 8,${-magnusForce * 1.5 + 5}`}
              fill={colors.accent}
            />
            <text x={15} y={-magnusForce * 0.75} fill={colors.accent}
                  fontSize={11} fontWeight="600">
              Magnus
            </text>
          </g>
        )}

        {/* Spin indicator */}
        <g transform={`translate(${simWidth - 80}, 50)`}>
          <text x={0} y={0} fill={colors.text} fontSize={12} fontWeight="600">
            Spin: {ballSpin} RPM
          </text>
          <text x={0} y={20} fill={colors.textSecondary} fontSize={10}>
            {ballSpin > 0 ? '↺ Topspin' : ballSpin < 0 ? '↻ Backspin' : 'No spin'}
          </text>
        </g>

        {/* Curve direction indicator */}
        <text x={simWidth / 2} y={simHeight - 20} fill={colors.textSecondary}
              fontSize={12} textAnchor="middle">
          Ball curves {magnusForce > 0 ? 'UP ⬆️' : magnusForce < 0 ? 'DOWN ⬇️' : 'straight →'}
          (Magnus effect)
        </text>
      </svg>
    );
  };

  const renderSimulation = () => {
    if (simulationMode === 'wing') {
      return renderWingSimulation();
    } else if (simulationMode === 'ball') {
      return renderBallSimulation();
    }
    return renderWingSimulation();
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.primary}`,
      }}>
        <label style={{
          color: colors.primary,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Air Speed: {airSpeed} m/s
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={airSpeed}
          onChange={(e) => setAirSpeed(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {simulationMode === 'wing' && (
        <div style={{
          background: colors.cardBg,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${colors.warning}`,
        }}>
          <label style={{
            color: colors.warning,
            fontSize: typography.small.fontSize,
            display: 'block',
            marginBottom: 8
          }}>
            Angle of Attack: {angleOfAttack}°
            {angleOfAttack > 12 && <span style={{ color: colors.accent }}> ⚠️ Near stall!</span>}
          </label>
          <input
            type="range"
            min={0}
            max={20}
            value={angleOfAttack}
            onChange={(e) => setAngleOfAttack(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {simulationMode === 'ball' && (
        <div style={{
          background: colors.cardBg,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${colors.accent}`,
        }}>
          <label style={{
            color: colors.accent,
            fontSize: typography.small.fontSize,
            display: 'block',
            marginBottom: 8
          }}>
            Ball Spin: {ballSpin} RPM
          </label>
          <input
            type="range"
            min={-2500}
            max={2500}
            value={ballSpin}
            onChange={(e) => setBallSpin(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: typography.small.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
          }}>
            <span>Backspin</span>
            <span>Topspin</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuickButtons = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      justifyContent: 'center',
    }}>
      <button
        onMouseDown={() => setShowStreamlines(!showStreamlines)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showStreamlines ? colors.primary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showStreamlines ? '💨 Flow On' : '💨 Flow Off'}
      </button>
      <button
        onMouseDown={() => setShowPressure(!showPressure)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showPressure ? colors.secondary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showPressure ? '📊 Pressure On' : '📊 Pressure Off'}
      </button>
      {phase === 'play' && (
        <>
          <button
            onMouseDown={() => setSimulationMode('wing')}
            style={{
              padding: `${spacing.xs}px ${spacing.md}px`,
              background: simulationMode === 'wing' ? colors.success : colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              color: colors.text,
              fontSize: typography.small.fontSize,
              cursor: 'pointer',
            }}
          >
            ✈️ Wing
          </button>
          <button
            onMouseDown={() => setSimulationMode('ball')}
            style={{
              padding: `${spacing.xs}px ${spacing.md}px`,
              background: simulationMode === 'ball' ? colors.success : colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              color: colors.text,
              fontSize: typography.small.fontSize,
              cursor: 'pointer',
            }}
          >
            ⚾ Ball
          </button>
        </>
      )}
    </div>
  );

  // Data panel
  const renderDataPanel = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    }}>
      <div style={{
        background: colors.background,
        padding: spacing.md,
        borderRadius: radius.md,
        textAlign: 'center',
      }}>
        <div style={{ color: colors.primary, fontSize: typography.small.fontSize }}>
          Airspeed
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
          {airSpeed} m/s
        </div>
      </div>
      <div style={{
        background: colors.background,
        padding: spacing.md,
        borderRadius: radius.md,
        textAlign: 'center',
      }}>
        <div style={{ color: colors.success, fontSize: typography.small.fontSize }}>
          {simulationMode === 'wing' ? 'Lift Force' : 'Magnus Force'}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
          {simulationMode === 'wing' ? `${lift.toFixed(0)}%` : `${magnusForce.toFixed(1)} N`}
        </div>
      </div>
      <div style={{
        background: colors.background,
        padding: spacing.md,
        borderRadius: radius.md,
        textAlign: 'center',
      }}>
        <div style={{ color: colors.warning, fontSize: typography.small.fontSize }}>
          {simulationMode === 'wing' ? 'Angle' : 'Spin'}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
          {simulationMode === 'wing' ? `${angleOfAttack}°` : `${ballSpin} RPM`}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '72px',
        marginBottom: spacing.lg,
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        ✈️
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        Why Planes Fly
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        A 500-ton airplane floats through the air. A baseball curves impossibly. Your shower
        curtain attacks you. What do these have in common? A Swiss mathematician named Daniel
        Bernoulli discovered the answer 300 years ago: faster fluid = lower pressure.
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '24px', fontFamily: 'monospace', marginBottom: spacing.sm }}>
          P + ½ρv² = constant
        </div>
        <p style={{ color: colors.text, margin: 0 }}>
          Speed up → Pressure down!
        </p>
      </div>
      {renderButton('Discover Lift', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '⚾ The Curveball' : '🤔 Make Your Prediction'}
        </h2>
        <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          {pred.question}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          {pred.options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handlePredictionSelect(opt.id)}
              style={{
                padding: spacing.lg,
                background: selectedPrediction === opt.id
                  ? `linear-gradient(135deg, ${colors.primary}33, ${colors.secondary}33)`
                  : colors.cardBg,
                border: `2px solid ${selectedPrediction === opt.id ? colors.primary : colors.border}`,
                borderRadius: radius.lg,
                cursor: showPredictionFeedback ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>{opt.icon}</div>
              <p style={{ color: colors.text, margin: 0 }}>{opt.text}</p>
            </div>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{
            padding: spacing.lg,
            background: selectedPrediction === pred.correct
              ? `${colors.success}22`
              : `${colors.warning}22`,
            border: `1px solid ${selectedPrediction === pred.correct ? colors.success : colors.warning}`,
            borderRadius: radius.lg,
            marginBottom: spacing.lg,
          }}>
            <h3 style={{
              color: selectedPrediction === pred.correct ? colors.success : colors.warning,
              marginBottom: spacing.sm,
            }}>
              {selectedPrediction === pred.correct ? '✓ Excellent!' : '✗ Counterintuitive, right?'}
            </h3>
            <p style={{ color: colors.text, margin: 0 }}>{pred.explanation}</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          {!showPredictionFeedback ? (
            renderButton('Lock In Prediction', handlePredictionSubmit, 'primary', !selectedPrediction)
          ) : (
            renderButton('See It In Action →', () => goToPhase(isTwist ? 'twist_play' : 'play'))
          )}
        </div>
      </div>
    );
  };

  const renderPlay = (isTwist = false) => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        {isTwist ? '⚾ Magnus Effect Lab' : '✈️ Bernoulli Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'Watch how spin creates pressure differences that curve the ball!'
          : 'See how airspeed and wing angle affect lift and pressure.'}
      </p>

      <div style={{
        background: 'linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        {renderSimulation()}
      </div>

      {renderDataPanel()}
      {renderControls()}
      {renderQuickButtons()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>⚾ The Magnus Effect</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            Named after Heinrich Magnus (1853), this effect explains how spinning balls curve.
            The spin drags air faster on one side (lower pressure) and slower on the other
            (higher pressure). The ball is pushed from high to low pressure - creating curves
            that seem to defy physics!
          </p>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        {renderButton('I Understand This →', () => goToPhase(isTwist ? 'twist_review' : 'review'))}
      </div>
    </div>
  );

  const renderReview = (isTwist = false) => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist ? '🎯 The Magnus Effect' : '📚 Bernoulli\'s Principle'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Spin Creates Pressure Differences</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: spacing.lg,
            }}>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.primary, marginBottom: spacing.sm }}>↺ Topspin</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Top moves with airflow (faster)</li>
                  <li>Bottom moves against (slower)</li>
                  <li>Lower pressure above</li>
                  <li>Ball curves DOWN</li>
                </ul>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.warning, marginBottom: spacing.sm }}>↻ Backspin</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Bottom moves with airflow (faster)</li>
                  <li>Top moves against (slower)</li>
                  <li>Lower pressure below</li>
                  <li>Ball curves UP (floats longer)</li>
                </ul>
              </div>
            </div>

            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: colors.background,
              borderRadius: radius.md,
              textAlign: 'center',
            }}>
              <code style={{ color: colors.primary, fontSize: typography.h3.fontSize }}>
                F_Magnus ∝ ω × v (spin rate × velocity)
              </code>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>The Bernoulli Equation</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '24px', color: colors.primary, fontFamily: 'monospace' }}>
                P + ½ρv² + ρgh = constant
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                Pressure + Kinetic energy + Potential energy = constant along streamline
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: spacing.md,
            }}>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>💨</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Fast Flow</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  High velocity<br/>= Low pressure
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>🐌</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Slow Flow</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Low velocity<br/>= High pressure
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>⬆️</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Lift!</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Pressure diff<br/>= Force on wing
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {renderButton(
          isTwist ? 'See Real Applications →' : 'What\'s the Twist? →',
          () => goToPhase(isTwist ? 'transfer' : 'twist_predict')
        )}
      </div>
    </div>
  );

  const renderTransfer = () => {
    const currentApp = realWorldApplications[currentAppIndex];

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
          🌍 Bernoulli Everywhere
        </h2>

        {/* App navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}>
          {realWorldApplications.map((app, index) => {
            const isCompleted = completedApps.includes(app.id);
            const isCurrent = index === currentAppIndex;
            const isLocked = index > 0 && !completedApps.includes(realWorldApplications[index - 1].id);

            return (
              <div
                key={app.id}
                onClick={() => {
                  if (!isLocked && !isTransitioningRef.current) {
                    setCurrentAppIndex(index);
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCurrent ? colors.primary : isCompleted ? colors.success : colors.cardBg,
                  border: `2px solid ${isCurrent ? colors.primary : isCompleted ? colors.success : colors.border}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.4 : 1,
                  transition: 'all 0.3s ease',
                  fontSize: '16px',
                }}
              >
                {isLocked ? '🔒' : isCompleted ? '✓' : index + 1}
              </div>
            );
          })}
        </div>

        {/* Current application card */}
        <div style={{
          background: colors.cardBg,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.lg,
        }}>
          <div style={{ fontSize: '48px', marginBottom: spacing.md, textAlign: 'center' }}>
            {currentApp.title.split(' ')[0]}
          </div>
          <h3 style={{ ...typography.h3, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' }}>
            {currentApp.title.substring(currentApp.title.indexOf(' ') + 1)}
          </h3>
          <p style={{ color: colors.secondary, textAlign: 'center', marginBottom: spacing.lg }}>
            {currentApp.subtitle}
          </p>

          <p style={{ ...typography.body, color: colors.text, marginBottom: spacing.lg }}>
            {currentApp.description}
          </p>

          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typography.small.fontSize, marginBottom: 4 }}>
              Key Formula:
            </div>
            <code style={{ color: colors.primary }}>{currentApp.formula}</code>
          </div>

          <div style={{
            background: `${colors.success}22`,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.success, marginBottom: 4 }}>💡 Real Example:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.realExample}</p>
          </div>

          <div style={{
            background: `${colors.accent}22`,
            padding: spacing.md,
            borderRadius: radius.md,
          }}>
            <div style={{ color: colors.accent, marginBottom: 4 }}>🔬 Try This:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.interactiveHint}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.md }}>
          {!completedApps.includes(currentApp.id) ? (
            renderButton('Got It! ✓', () => handleCompleteApp(currentApp.id), 'success')
          ) : currentAppIndex < realWorldApplications.length - 1 ? (
            renderButton('Next Application →', () => setCurrentAppIndex(i => i + 1))
          ) : null}

          {canAccessQuiz && (
            renderButton('Take the Quiz →', () => {
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowQuizFeedback(false);
              setScore(0);
              goToPhase('test');
            }, 'success')
          )}
        </div>

        {!canAccessQuiz && (
          <p style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginTop: spacing.md,
            fontSize: typography.small.fontSize,
          }}>
            Complete all {realWorldApplications.length} applications to unlock the quiz
            ({completedApps.length}/{realWorldApplications.length} completed)
          </p>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = quizQuestions[currentQuestion];

    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}>
          <span style={{ color: colors.textSecondary }}>
            Question {currentQuestion + 1} of {quizQuestions.length}
          </span>
          <span style={{ color: colors.success, fontWeight: '600' }}>
            Score: {score}/{currentQuestion + (showQuizFeedback ? 1 : 0)}
          </span>
        </div>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ ...typography.h3, color: colors.text, marginBottom: spacing.lg }}>
            {question.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const showResult = showQuizFeedback;

              let bgColor = colors.background;
              let borderColor = colors.border;

              if (showResult) {
                if (isCorrect) {
                  bgColor = `${colors.success}33`;
                  borderColor = colors.success;
                } else if (isSelected && !isCorrect) {
                  bgColor = `${colors.warning}33`;
                  borderColor = colors.warning;
                }
              } else if (isSelected) {
                bgColor = `${colors.primary}33`;
                borderColor = colors.primary;
              }

              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  style={{
                    padding: spacing.md,
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: radius.md,
                    cursor: showQuizFeedback ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: colors.text }}>{option}</span>
                  {showResult && isCorrect && <span style={{ marginLeft: 8 }}>✓</span>}
                  {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 8 }}>✗</span>}
                </div>
              );
            })}
          </div>

          {showQuizFeedback && (
            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: `${colors.primary}22`,
              borderRadius: radius.md,
            }}>
              <p style={{ color: colors.text, margin: 0 }}>{question.explanation}</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          {!showQuizFeedback ? (
            renderButton('Submit Answer', handleAnswerSubmit, 'primary', selectedAnswer === null)
          ) : (
            renderButton(
              currentQuestion < quizQuestions.length - 1 ? 'Next Question →' : 'See Results →',
              handleNextQuestion
            )
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: spacing.lg }}>
          {passed ? '🏆' : '📚'}
        </div>
        <h2 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
          {passed ? 'Fluid Dynamics Master!' : 'Keep Learning!'}
        </h2>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
          maxWidth: 400,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: passed ? colors.success : colors.warning,
            marginBottom: spacing.sm,
          }}>
            {percentage}%
          </div>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {score} out of {quizQuestions.length} correct
          </p>

          <div style={{
            height: 8,
            background: colors.border,
            borderRadius: radius.sm,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: passed ? colors.success : colors.warning,
              borderRadius: radius.sm,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.xl,
          maxWidth: 500,
          margin: '0 auto 24px',
        }}>
          <h3 style={{ color: colors.text, marginBottom: spacing.sm }}>🧠 Key Takeaways</h3>
          <ul style={{ color: colors.textSecondary, textAlign: 'left', margin: 0, paddingLeft: 20 }}>
            <li>P + ½ρv² = constant (Bernoulli's principle)</li>
            <li>Faster fluid = lower pressure</li>
            <li>Wings: fast over top → lift</li>
            <li>Magnus effect: spin → curved path</li>
            <li>Venturi: narrow tube → fast flow → low P</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!passed && renderButton('Try Again', () => {
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowQuizFeedback(false);
            setScore(0);
            goToPhase('test');
          })}
          {renderButton('Restart Journey', () => {
            setCompletedApps([]);
            setCurrentAppIndex(0);
            goToPhase('hook');
          }, 'secondary')}
          {onBack && renderButton('Back to Menu', onBack, 'secondary')}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPrediction(false);
      case 'play': return renderPlay(false);
      case 'review': return renderReview(false);
      case 'twist_predict': return renderPrediction(true);
      case 'twist_play': return renderPlay(true);
      case 'twist_review': return renderReview(true);
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: height,
      background: colors.background,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: isMobile ? spacing.md : spacing.xl,
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.body.fontSize,
              }}
            >
              ← Back
            </button>
          )}
          <div style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: colors.cardBg,
            borderRadius: radius.sm,
            fontSize: typography.small.fontSize,
            color: colors.textSecondary,
          }}>
            ✈️ Bernoulli's Principle
          </div>
        </div>

        {renderProgressBar()}
        {renderPhaseContent()}

        {/* CSS Animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BernoulliRenderer;
