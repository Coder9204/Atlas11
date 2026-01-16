'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CARTESIAN DIVER RENDERER - BUOYANCY & PRESSURE
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface CartesianDiverRendererProps {
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
  water: '#0ea5e9',
  waterDark: '#0369a1',
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
    question: "You have a sealed plastic bottle filled with water and a small dropper with an air bubble inside. When you squeeze the bottle hard, what happens to the dropper?",
    options: [
      { id: 'a', text: 'Nothing - it stays in place', icon: '➖' },
      { id: 'b', text: 'It rises to the top', icon: '⬆️' },
      { id: 'c', text: 'It sinks to the bottom', icon: '⬇️' },
      { id: 'd', text: 'It spins around', icon: '🔄' },
    ],
    correct: 'c',
    explanation: "When you squeeze the bottle, you increase the pressure throughout the water. This compresses the air bubble inside the dropper (Boyle's Law: PV = constant). With less air volume, the dropper displaces less water, reducing its buoyancy. When buoyancy becomes less than its weight, it sinks!"
  },
  twist: {
    question: "You adjust the dropper so it floats perfectly in the middle - neutrally buoyant. Now the temperature drops by 10°C. What happens?",
    options: [
      { id: 'a', text: 'It stays perfectly neutral - temperature doesn\'t matter', icon: '➖' },
      { id: 'b', text: 'It slowly sinks as the water contracts', icon: '⬇️' },
      { id: 'c', text: 'It slowly rises as the air contracts more than water', icon: '⬆️' },
      { id: 'd', text: 'It sinks because cold water is denser', icon: '🥶' },
    ],
    correct: 'c',
    explanation: "Gases contract much more than liquids when cooled! The air bubble shrinks significantly, while the water barely contracts. This reduces the dropper's buoyancy and it sinks. Real submarines face this challenge - cold ocean layers affect their buoyancy unexpectedly!"
  }
};

const realWorldApplications = [
  {
    id: 'submarines',
    title: '🚢 Submarines',
    subtitle: 'Controlling buoyancy with ballast tanks',
    description: 'Submarines use the same principle as Cartesian divers! They have ballast tanks that can be filled with water (to sink) or compressed air (to rise). By controlling how much air vs water is in the tanks, they achieve neutral buoyancy at any depth.',
    formula: 'Buoyancy = ρ_water × V_displaced × g = Weight for neutral buoyancy',
    realExample: 'A nuclear submarine can hover motionless at 300m depth by precisely balancing its ballast tanks.',
    interactiveHint: 'Submarines pump water in/out of ballast tanks - exactly like controlling pressure on the bottle!'
  },
  {
    id: 'fish',
    title: '🐟 Fish Swim Bladders',
    subtitle: 'Nature\'s buoyancy control',
    description: 'Most fish have a swim bladder - an internal air sac they can inflate or deflate. By adjusting the gas volume, fish control their buoyancy without constantly swimming. Some deep-sea fish lack swim bladders because pressure would crush them.',
    formula: 'Fish adjusts V_bladder to match: ρ_fish × V_fish = ρ_water × V_fish',
    realExample: 'Goldfish can hover motionless by fine-tuning their swim bladder - no fin movement needed!',
    interactiveHint: 'Watch aquarium fish - they barely move their fins when hovering. Their swim bladder does the work!'
  },
  {
    id: 'scuba',
    title: '🤿 Scuba Diving',
    subtitle: 'BCD and pressure at depth',
    description: 'Scuba divers wear a BCD (Buoyancy Control Device) - an inflatable vest. As divers descend, increasing water pressure compresses air in their BCD and wetsuit, making them sink faster. They must add air to compensate. Rising reverses this.',
    formula: 'P₁V₁ = P₂V₂ → At 10m depth, air volume halves!',
    realExample: 'At 30m depth, a diver needs 4× as much air in their BCD as at the surface to maintain buoyancy.',
    interactiveHint: 'Divers call uncontrolled rising "runaway ascent" - expanding air in BCD makes you rise faster!'
  },
  {
    id: 'density',
    title: '⚗️ Density Columns',
    subtitle: 'Layered liquids and floating objects',
    description: 'Objects float at the level where their density matches the surrounding liquid. A density column with different liquids (oil, water, syrup) demonstrates this - objects settle at their matching density layer, like Cartesian divers finding equilibrium.',
    formula: 'Object floats when: ρ_object < ρ_liquid, sinks when: ρ_object > ρ_liquid',
    realExample: 'An egg sinks in fresh water but floats in salt water - the salt increases water density above the egg\'s.',
    interactiveHint: 'Try floating a grape in water, then add salt - watch it rise as water density increases!'
  }
];

const quizQuestions = [
  {
    question: "What happens to the air bubble in a Cartesian diver when you squeeze the bottle?",
    options: [
      "It expands",
      "It compresses (gets smaller)",
      "It stays the same size",
      "It turns into water"
    ],
    correct: 1,
    explanation: "Squeezing the bottle increases water pressure. Since the air bubble is compressible (unlike water), the increased pressure compresses it according to Boyle's Law (PV = constant)."
  },
  {
    question: "What gas law explains why the air bubble changes size under pressure?",
    options: [
      "Newton's Law",
      "Ohm's Law",
      "Boyle's Law (PV = constant)",
      "Murphy's Law"
    ],
    correct: 2,
    explanation: "Boyle's Law states that for a gas at constant temperature, pressure times volume is constant (PV = k). When pressure increases, volume must decrease proportionally."
  },
  {
    question: "Why does compressing the air bubble make the diver sink?",
    options: [
      "The diver gets heavier",
      "Less displaced water means less buoyant force",
      "The water pushes it down",
      "Air becomes heavier under pressure"
    ],
    correct: 1,
    explanation: "Buoyancy equals the weight of displaced water. When the air bubble shrinks, the diver displaces less water, reducing buoyant force. When buoyancy < weight, the diver sinks."
  },
  {
    question: "What is the condition for neutral buoyancy (floating at a fixed depth)?",
    options: [
      "Object must be hollow",
      "Object density equals water density",
      "Object must be made of plastic",
      "Water must be cold"
    ],
    correct: 1,
    explanation: "Neutral buoyancy occurs when the object's average density equals the surrounding water's density. The buoyant force exactly equals the weight, so the object neither rises nor sinks."
  },
  {
    question: "How do submarines control their depth?",
    options: [
      "By spinning propellers faster",
      "By adjusting ballast tanks (water vs air)",
      "By changing shape",
      "By heating the water around them"
    ],
    correct: 1,
    explanation: "Submarines have ballast tanks that can be filled with water (to sink) or pressurized air (to rise). This is exactly the Cartesian diver principle at massive scale!"
  },
  {
    question: "At 10 meters underwater, how does pressure compare to the surface?",
    options: [
      "Same pressure",
      "About double (2 atm total)",
      "Ten times higher",
      "Half the pressure"
    ],
    correct: 1,
    explanation: "Water pressure increases by 1 atm for every 10m of depth. At 10m, you have 1 atm from the air above plus 1 atm from 10m of water = 2 atm total."
  },
  {
    question: "Why do scuba divers need to add air to their BCD as they descend?",
    options: [
      "To breathe easier",
      "To compensate for air compression from increased pressure",
      "To stay warm",
      "To see better"
    ],
    correct: 1,
    explanation: "As divers descend, increasing pressure compresses the air in their BCD, reducing buoyancy. They must add air to maintain neutral buoyancy - just like the Cartesian diver in reverse!"
  },
  {
    question: "What does a fish's swim bladder do?",
    options: [
      "Helps the fish breathe",
      "Stores food",
      "Controls buoyancy by adjusting gas volume",
      "Makes the fish swim faster"
    ],
    correct: 2,
    explanation: "The swim bladder is an internal gas-filled sac that fish inflate or deflate to control their buoyancy. This lets them hover at any depth without swimming - nature's Cartesian diver!"
  },
  {
    question: "If you heat a Cartesian diver setup, what happens?",
    options: [
      "The diver sinks (air expands)",
      "The diver rises (air expands, more buoyancy)",
      "Nothing changes",
      "The diver spins"
    ],
    correct: 1,
    explanation: "Heating causes the air bubble to expand (gases expand more than liquids when heated). The expanded bubble displaces more water, increasing buoyancy and making the diver rise."
  },
  {
    question: "Why can't deep-sea fish survive if brought to the surface quickly?",
    options: [
      "They get cold",
      "It's too bright",
      "Their swim bladder expands rapidly and can rupture",
      "They can't breathe surface air"
    ],
    correct: 2,
    explanation: "Deep-sea fish are adapted to high pressure. When brought up quickly, the dramatic pressure drop causes their swim bladder to expand violently (Boyle's Law), potentially rupturing it."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CartesianDiverRenderer: React.FC<CartesianDiverRendererProps> = ({
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
  const [pressure, setPressure] = useState(1.0); // 1.0 = normal, 1.5 = squeezed
  const [temperature, setTemperature] = useState(20); // Celsius
  const [diverPosition, setDiverPosition] = useState(0.3); // 0 = top, 1 = bottom
  const [diverVelocity, setDiverVelocity] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const [isSqueezing, setIsSqueezing] = useState(false);
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

  // Calculate bubble size based on pressure and temperature (Boyle's Law + Charles's Law)
  const calculateBubbleSize = useCallback((p: number, t: number) => {
    // PV/T = constant (combined gas law)
    // Base size at P=1atm, T=20°C
    const baseSize = 1.0;
    const baseTemp = 293; // 20°C in Kelvin
    const currentTemp = t + 273; // Convert to Kelvin

    // V2 = V1 * (P1/P2) * (T2/T1)
    return baseSize * (1.0 / p) * (currentTemp / baseTemp);
  }, []);

  const bubbleSize = calculateBubbleSize(pressure, temperature);

  // Calculate buoyancy - diver sinks when bubble shrinks
  const calculateNetForce = useCallback((bubbleVol: number) => {
    // Simplified model: neutral at bubbleSize = 1.0
    // Positive = upward (buoyant), Negative = downward (sinking)
    const buoyancy = (bubbleVol - 0.85) * 2.0; // Tuned for good dynamics
    return buoyancy;
  }, []);

  // Physics simulation
  useEffect(() => {
    const simulate = () => {
      setAnimationTime(t => t + 0.016);

      setDiverPosition(pos => {
        setDiverVelocity(vel => {
          const netForce = calculateNetForce(bubbleSize);
          const gravity = 0.001;
          const drag = 0.95;

          // Simple physics: F = ma, with drag
          let newVel = (vel + netForce * 0.01 - gravity) * drag;

          // Clamp velocity
          newVel = Math.max(-0.02, Math.min(0.02, newVel));

          let newPos = pos - newVel; // Subtract because positive vel = up

          // Boundaries with bounce
          if (newPos < 0.05) {
            newPos = 0.05;
            newVel = Math.abs(newVel) * 0.3;
          }
          if (newPos > 0.9) {
            newPos = 0.9;
            newVel = -Math.abs(newVel) * 0.3;
          }

          return newVel;
        });

        return pos;
      });

      // Update position based on velocity
      setDiverPosition(pos => {
        const newPos = pos - diverVelocity;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbleSize, calculateNetForce, diverVelocity]);

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setPressure(1.0);
      setTemperature(20);
      setDiverPosition(0.3);
      setDiverVelocity(0);
    } else if (newPhase === 'twist_play') {
      setPressure(1.0);
      setTemperature(20);
      setDiverPosition(0.5);
      setDiverVelocity(0);
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

  // Squeeze handlers
  const handleSqueezeStart = useCallback(() => {
    setIsSqueezing(true);
    setPressure(1.5);
  }, []);

  const handleSqueezeEnd = useCallback(() => {
    setIsSqueezing(false);
    setPressure(1.0);
  }, []);

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
  // CARTESIAN DIVER VISUALIZATION
  // ============================================================================

  const renderDiverSimulation = () => {
    const simWidth = isMobile ? width - 40 : 400;
    const simHeight = 400;
    const bottleWidth = 120;
    const bottleHeight = 320;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 40;

    // Diver position in pixels
    const diverY = bottleY + 30 + diverPosition * (bottleHeight - 80);
    const diverX = simWidth / 2;

    // Bubble size visualization (radius)
    const bubbleRadius = 8 + bubbleSize * 12;

    // Net force for visualization
    const netForce = calculateNetForce(bubbleSize);

    return (
      <div style={{
        background: 'linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.water} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.waterDark} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#88c0d0" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#88c0d0" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#88c0d0" stopOpacity="0.3" />
            </linearGradient>
            <filter id="waterRipple">
              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
          </defs>

          {/* Bottle outline - compressed when squeezing */}
          <rect
            x={bottleX - (isSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#bottleGrad)"
            stroke="#88c0d0"
            strokeWidth={3}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water inside bottle */}
          <rect
            x={bottleX + 5 - (isSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#waterGrad)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Animated bubbles in water */}
          {[...Array(8)].map((_, i) => {
            const bubbleY = ((animationTime * 30 + i * 45) % (bottleHeight - 40)) + bottleY + 20;
            const bubbleX = bottleX + 20 + (i % 3) * 35 + Math.sin(animationTime * 2 + i) * 5;
            return (
              <circle
                key={i}
                cx={bubbleX}
                cy={bottleY + bottleHeight - (bubbleY - bottleY)}
                r={2 + (i % 3)}
                fill="white"
                opacity={0.3}
              />
            );
          })}

          {/* The Diver (eye dropper shape) */}
          <g transform={`translate(${diverX}, ${diverY})`}>
            {/* Dropper body */}
            <rect
              x={-8}
              y={-25}
              width={16}
              height={50}
              rx={4}
              fill="#e5e7eb"
              stroke="#9ca3af"
              strokeWidth={1}
            />

            {/* Rubber bulb at top */}
            <ellipse
              cx={0}
              cy={-30}
              rx={10}
              ry={8}
              fill="#ef4444"
            />

            {/* Air bubble inside - changes with pressure */}
            <ellipse
              cx={0}
              cy={-5}
              rx={bubbleRadius * 0.5}
              ry={bubbleRadius}
              fill="white"
              opacity={0.8}
            >
              <animate
                attributeName="ry"
                values={`${bubbleRadius};${bubbleRadius * 1.05};${bubbleRadius}`}
                dur="1s"
                repeatCount="indefinite"
              />
            </ellipse>

            {/* Opening at bottom */}
            <rect
              x={-3}
              y={25}
              width={6}
              height={8}
              fill="#6b7280"
            />
          </g>

          {/* Force arrows */}
          {showForces && (
            <g transform={`translate(${diverX + 40}, ${diverY})`}>
              {/* Buoyancy arrow (up) */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={-netForce * 500}
                stroke={colors.success}
                strokeWidth={3}
                markerEnd="url(#arrowUp)"
              />
              <text x={5} y={-netForce * 250} fill={colors.success} fontSize={10}>
                F_b
              </text>

              {/* Weight arrow (down) */}
              <line
                x1={20}
                y1={0}
                x2={20}
                y2={30}
                stroke={colors.warning}
                strokeWidth={3}
              />
              <polygon
                points="20,35 15,25 25,25"
                fill={colors.warning}
              />
              <text x={25} y={25} fill={colors.warning} fontSize={10}>
                W
              </text>
            </g>
          )}

          {/* Pressure indicator arrows when squeezing */}
          {isSqueezing && (
            <>
              <polygon
                points={`${bottleX - 20},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 10} ${bottleX - 5},${bottleY + bottleHeight / 2 + 10}`}
                fill={colors.accent}
              />
              <polygon
                points={`${bottleX + bottleWidth + 20},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 10} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 10}`}
                fill={colors.accent}
              />
            </>
          )}

          {/* Labels */}
          <text x={simWidth / 2} y={simHeight - 10} fill={colors.textSecondary}
                fontSize={12} textAnchor="middle">
            {isSqueezing ? '🤏 Squeezing! Pressure increased!' : 'Click and hold to squeeze bottle'}
          </text>
        </svg>

        {/* Data panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.sm,
          marginTop: spacing.lg,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.accent, fontSize: typography.small.fontSize }}>
              Pressure
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
              {pressure.toFixed(2)} atm
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.primary, fontSize: typography.small.fontSize }}>
              Bubble Size
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
              {(bubbleSize * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: netForce > 0 ? colors.success : colors.warning, fontSize: typography.small.fontSize }}>
              Net Force
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
              {netForce > 0 ? '↑ Rising' : '↓ Sinking'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      {/* Squeeze button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
      }}>
        <button
          onMouseDown={handleSqueezeStart}
          onMouseUp={handleSqueezeEnd}
          onMouseLeave={handleSqueezeEnd}
          onTouchStart={handleSqueezeStart}
          onTouchEnd={handleSqueezeEnd}
          style={{
            padding: `${spacing.lg}px ${spacing.xl}px`,
            fontSize: typography.h3.fontSize,
            fontWeight: '700',
            color: colors.text,
            background: isSqueezing
              ? `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`
              : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            border: 'none',
            borderRadius: radius.lg,
            cursor: 'pointer',
            transform: isSqueezing ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.1s ease',
            boxShadow: isSqueezing
              ? `0 0 20px ${colors.accent}66`
              : `0 4px 15px ${colors.primary}44`,
          }}
        >
          {isSqueezing ? '🤏 Squeezing!' : '👆 Hold to Squeeze'}
        </button>
      </div>

      {/* Temperature control (for twist phase) */}
      {phase === 'twist_play' && (
        <div style={{
          background: colors.cardBg,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <label style={{
            color: colors.warning,
            fontSize: typography.small.fontSize,
            display: 'block',
            marginBottom: 8
          }}>
            Temperature: {temperature}°C
          </label>
          <input
            type="range"
            min={5}
            max={35}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: typography.small.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
          }}>
            <span>🥶 Cold</span>
            <span>🔥 Warm</span>
          </div>
        </div>
      )}

      {/* Quick controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.sm,
        justifyContent: 'center',
      }}>
        <button
          onMouseDown={() => setShowForces(!showForces)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: showForces ? colors.primary : colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
          }}
        >
          {showForces ? '📊 Forces On' : '📊 Forces Off'}
        </button>
        <button
          onMouseDown={() => {
            setDiverPosition(0.3);
            setDiverVelocity(0);
          }}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
          }}
        >
          🔄 Reset Position
        </button>
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
        🧪
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        The Cartesian Diver
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        A simple squeeze makes things sink. Release, and they rise. This 17th-century toy,
        named after René Descartes, reveals the same physics that lets submarines dive to
        crushing depths and fish hover effortlessly at any level.
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '48px', marginBottom: spacing.sm }}>🤏 → ⬇️ | 👋 → ⬆️</div>
        <p style={{ color: colors.text, margin: 0 }}>
          Squeeze to sink, release to rise!
        </p>
      </div>
      {renderButton('Discover the Secret', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '🌡️ Temperature Twist' : '🤔 Make Your Prediction'}
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
              {selectedPrediction === pred.correct ? '✓ Excellent!' : '✗ Surprising, right?'}
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
        {isTwist ? '🌡️ Temperature & Buoyancy' : '🧪 Diver Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'Watch how temperature changes affect the air bubble and buoyancy!'
          : 'Press and hold to squeeze the bottle. Watch the air bubble and diver respond!'}
      </p>

      {renderDiverSimulation()}
      {renderControls()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>🚢 Submarine Challenge</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            Real submarines encounter "thermoclines" - layers of water at different temperatures.
            Cold water is denser, and the sub's air tanks compress in cold water. Submariners must
            constantly adjust ballast when crossing these invisible temperature boundaries!
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
        {isTwist ? '🎯 Temperature Effects' : '📚 The Physics of Buoyancy'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Combined Gas Law</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '28px', color: colors.primary, fontFamily: 'monospace' }}>
                PV/T = constant
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                Pressure × Volume ÷ Temperature stays constant
              </p>
            </div>

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
                <h4 style={{ color: colors.warning, marginBottom: spacing.sm }}>🥶 Cold Temperature</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Gas contracts more than liquid</li>
                  <li>Bubble gets smaller</li>
                  <li>Less buoyancy → sinks</li>
                </ul>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.accent, marginBottom: spacing.sm }}>🔥 Warm Temperature</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Gas expands more than liquid</li>
                  <li>Bubble gets larger</li>
                  <li>More buoyancy → rises</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Key Principles</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '24px', color: colors.primary, fontFamily: 'monospace' }}>
                Boyle's Law: P₁V₁ = P₂V₂
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                When pressure goes up, volume goes down (at constant T)
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
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>🤏</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Squeeze</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  ↑ Pressure<br/>↓ Bubble<br/>↓ Buoyancy<br/>= Sinks!
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>⚖️</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Neutral</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Buoyancy = Weight<br/>Object hovers<br/>at fixed depth
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>👋</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Release</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  ↓ Pressure<br/>↑ Bubble<br/>↑ Buoyancy<br/>= Rises!
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
          🌍 Buoyancy Control in Nature & Technology
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
          {passed ? 'Buoyancy Master!' : 'Keep Learning!'}
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
            <li>Boyle's Law: PV = constant (at constant T)</li>
            <li>Buoyancy = weight of displaced fluid</li>
            <li>Compressing air reduces buoyancy → sink</li>
            <li>Submarines and fish use adjustable air volumes</li>
            <li>Temperature affects gas volume (combined gas law)</li>
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
            🧪 Cartesian Diver
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

export default CartesianDiverRenderer;
