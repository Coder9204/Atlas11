'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// STABLE LEVITATION RENDERER - EQUILIBRIUM & BALANCE
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface StableLevitationRendererProps {
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
    question: "You point a hair dryer upward and place a ping pong ball in the airstream. What happens when you slowly tilt the hair dryer to the side?",
    options: [
      { id: 'a', text: 'The ball immediately falls off the side', icon: '⬇️' },
      { id: 'b', text: 'The ball stays floating, tilting with the dryer', icon: '🎈' },
      { id: 'c', text: 'The ball flies away in a random direction', icon: '💨' },
      { id: 'd', text: 'The ball starts spinning but stays in place', icon: '🔄' },
    ],
    correct: 'b',
    explanation: "The ball stays levitating even when tilted! This is stable equilibrium - if the ball drifts to the edge of the airstream, it enters slower-moving air (higher pressure) that pushes it back to center. The ball naturally finds and stays at the balance point. This is Bernoulli's principle creating a 'pressure well' that traps the ball!"
  },
  twist: {
    question: "Earnshaw's theorem proves that you CANNOT levitate a magnet stably using only static magnetic fields. Yet magnetic levitation trains (maglev) exist! How do they work?",
    options: [
      { id: 'a', text: 'They use superconductors which bypass Earnshaw\'s theorem', icon: '🧊' },
      { id: 'b', text: 'They use active electronic feedback control', icon: '🎮' },
      { id: 'c', text: 'Both superconductors AND feedback systems exist', icon: '✨' },
      { id: 'd', text: 'Earnshaw was wrong - static magnets can work', icon: '❌' },
    ],
    correct: 'c',
    explanation: "Both methods work! German maglevs use electromagnetic feedback (sensors constantly adjust magnet strength). Japanese maglevs use superconductors which exhibit perfect diamagnetism, a quantum effect that Earnshaw couldn't have predicted. Nature found loopholes to this 'impossible' theorem!"
  }
};

const realWorldApplications = [
  {
    id: 'maglev',
    title: '🚄 Maglev Trains',
    subtitle: 'Frictionless 375 mph travel',
    description: 'Magnetic levitation trains float on magnetic fields, eliminating wheel friction. The Japanese SCMaglev uses superconducting magnets cooled to -269°C. German Transrapid uses electromagnets with active feedback. Both achieve smooth, silent, ultra-fast travel.',
    formula: 'Lift force = Magnetic pressure × Area | No contact = No friction',
    realExample: 'Japan\'s L0 Series maglev reached 375 mph (603 km/h) - faster than commercial aircraft takeoff!',
    interactiveHint: 'Maglev trains are so smooth, passengers can balance coins on edge during the ride.'
  },
  {
    id: 'acoustic',
    title: '🔊 Acoustic Levitation',
    subtitle: 'Sound waves holding objects',
    description: 'Powerful ultrasonic speakers create standing waves with nodes (zero pressure) and antinodes (high pressure). Small objects get trapped at nodes where forces balance. Scientists use this to study droplets without container contamination.',
    formula: 'Standing wave: λ/2 spacing between nodes | Object trapped at pressure minimum',
    realExample: 'Researchers levitate water droplets, insects, and even small fish using 40kHz ultrasound!',
    interactiveHint: 'Acoustic levitation is used in pharmaceutical research to mix chemicals without container walls.'
  },
  {
    id: 'diamagnetic',
    title: '🐸 Diamagnetic Levitation',
    subtitle: 'Even frogs can float!',
    description: 'All materials are slightly diamagnetic - they weakly repel magnetic fields. With powerful enough magnets (16+ Tesla), even water-based objects like strawberries, grapes, and live frogs can levitate! This won the 2000 Ig Nobel Prize.',
    formula: 'Diamagnetic force = χ × V × B × dB/dz (magnetic susceptibility × gradient)',
    realExample: 'A live frog was levitated in a 16 Tesla magnet at Radboud University - it was unharmed!',
    interactiveHint: 'Pyrolytic graphite (from pencil lead) can levitate over rare earth magnets at room temperature.'
  },
  {
    id: 'coanda',
    title: '💨 Coanda Effect',
    subtitle: 'Airflow following curved surfaces',
    description: 'Fluid streams tend to follow nearby curved surfaces rather than continuing straight. This creates regions of low pressure that can trap and levitate objects. It\'s why your hair dryer can levitate a ball at an angle!',
    formula: 'Air follows curve → Creates pressure gradient → Ball trapped in low-P region',
    realExample: 'Aircraft use the Coanda effect for thrust vectoring and short takeoff/landing capability.',
    interactiveHint: 'Run water over the back of a spoon - it curves around. That\'s Coanda!'
  }
];

const quizQuestions = [
  {
    question: "What type of equilibrium keeps a ball floating in an upward airstream?",
    options: [
      "Unstable equilibrium",
      "Neutral equilibrium",
      "Stable equilibrium",
      "No equilibrium - it's magic"
    ],
    correct: 2,
    explanation: "It's stable equilibrium! If the ball moves from center, pressure differences push it back. A displaced ball automatically returns to its equilibrium position - the definition of stability."
  },
  {
    question: "Why does a ping pong ball stay centered in an airstream from a hair dryer?",
    options: [
      "The ball is lighter than air",
      "Static electricity holds it",
      "Fast air in center has lower pressure, trapping the ball",
      "The ball spins creating lift"
    ],
    correct: 2,
    explanation: "Bernoulli's principle! The fast-moving air in the center has lower pressure than the slower air at the edges. If the ball drifts to the edge, higher pressure pushes it back to the low-pressure center."
  },
  {
    question: "What does Earnshaw's theorem state about magnetic levitation?",
    options: [
      "Magnetic levitation is impossible under any circumstances",
      "Stable levitation using only static magnetic fields is impossible",
      "Only superconductors can levitate",
      "Magnets always attract"
    ],
    correct: 1,
    explanation: "Earnshaw's theorem (1842) proves you cannot achieve stable levitation using ONLY static magnetic or electric fields. Loopholes include: diamagnetism, superconductors, feedback control, and rotating fields."
  },
  {
    question: "How do German-style maglev trains achieve stable levitation?",
    options: [
      "Superconducting magnets",
      "Permanent magnets only",
      "Electromagnetic feedback control (active stabilization)",
      "Compressed air cushion"
    ],
    correct: 2,
    explanation: "German Transrapid uses electromagnetic levitation (EMS) with active feedback. Sensors monitor the gap 1000+ times per second, and electronics adjust magnet current to maintain stable levitation despite Earnshaw's theorem."
  },
  {
    question: "What special property allows superconducting magnets to levitate stably?",
    options: [
      "They're very cold",
      "Perfect diamagnetism (Meissner effect) - they expel all magnetic fields",
      "They have infinite strength",
      "They're lighter than air when cold"
    ],
    correct: 1,
    explanation: "Superconductors exhibit the Meissner effect - they completely expel magnetic fields from their interior, creating perfect diamagnetism. This allows stable levitation without feedback control."
  },
  {
    question: "What is acoustic levitation?",
    options: [
      "Levitation using loud music",
      "Levitation using sound wave pressure at standing wave nodes",
      "Levitation using echoes",
      "Levitation using vibrating magnets"
    ],
    correct: 1,
    explanation: "Acoustic levitation uses ultrasonic standing waves. Objects are trapped at nodes (pressure minima) where the acoustic radiation pressure from below balances gravity."
  },
  {
    question: "Why can a frog be levitated in a powerful magnetic field?",
    options: [
      "Frogs are naturally magnetic",
      "Frogs are diamagnetic (water in tissues weakly repels fields)",
      "Frogs can fly",
      "It's a hoax"
    ],
    correct: 1,
    explanation: "All materials, including water (the main component of living things), are slightly diamagnetic. In a powerful enough field (16+ Tesla), even this weak repulsion is enough to counter gravity and levitate a frog!"
  },
  {
    question: "What is the Coanda effect?",
    options: [
      "Cold air falls, hot air rises",
      "Fluid streams tend to follow nearby curved surfaces",
      "Sound travels faster in water",
      "Magnets attract iron"
    ],
    correct: 1,
    explanation: "The Coanda effect causes fluid jets to follow nearby curved surfaces rather than continuing straight. This creates pressure differences that can trap objects - like keeping a ball in a tilted airstream."
  },
  {
    question: "For stable equilibrium, when an object is displaced, what must happen?",
    options: [
      "It keeps moving in that direction",
      "It stays in the new position",
      "A restoring force pushes it back toward equilibrium",
      "It oscillates forever"
    ],
    correct: 2,
    explanation: "Stable equilibrium requires a restoring force! When displaced, the object experiences a force pushing it back toward the equilibrium position. This is what makes the levitation 'stable' rather than 'unstable.'"
  },
  {
    question: "What's the fastest speed achieved by a maglev train?",
    options: [
      "About 200 mph",
      "About 375 mph (603 km/h)",
      "About 500 mph",
      "Over 1000 mph"
    ],
    correct: 1,
    explanation: "Japan's L0 Series SCMaglev reached 603 km/h (375 mph) in 2015 - the world record for crewed rail vehicles. This is faster than many commercial aircraft at takeoff!"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const StableLevitationRenderer: React.FC<StableLevitationRendererProps> = ({
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
  const [airSpeed, setAirSpeed] = useState(80);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const [showPressure, setShowPressure] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'airstream' | 'maglev'>('airstream');
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [ballVelocity, setBallVelocity] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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

  // Physics simulation for ball in airstream
  useEffect(() => {
    const simulate = () => {
      setAnimationTime(t => t + 0.016);

      if (!isDragging && simulationMode === 'airstream') {
        setBallPosition(pos => {
          setBallVelocity(vel => {
            // Convert tilt to radians
            const tiltRad = tiltAngle * Math.PI / 180;

            // Gravity component (perpendicular to airstream)
            const gravityX = 9.8 * Math.sin(tiltRad) * 0.01;
            const gravityY = 9.8 * Math.cos(tiltRad) * 0.01;

            // Bernoulli restoring force (pushes toward center)
            // Stronger when ball is further from center
            const distFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            const restoringStrength = (airSpeed / 100) * 0.05;
            const restoringX = -pos.x * restoringStrength;
            const restoringY = -pos.y * restoringStrength;

            // Lift force (counters gravity in vertical direction)
            const liftForce = (airSpeed / 100) * gravityY * 1.2;

            // Update velocity with drag
            const drag = 0.95;
            const newVelX = (vel.x + restoringX - gravityX) * drag;
            const newVelY = (vel.y + restoringY - gravityY + liftForce) * drag;

            return { x: newVelX, y: newVelY };
          });

          // Update position
          const newX = pos.x + ballVelocity.x;
          const newY = pos.y + ballVelocity.y;

          // Clamp to airstream boundary (ball falls out if too far)
          const maxDist = 50 - (Math.abs(tiltAngle) * 0.5);
          const dist = Math.sqrt(newX * newX + newY * newY);

          if (dist > maxDist && airSpeed < 30) {
            // Ball escapes when airspeed too low
            return { x: newX * 1.1, y: newY * 1.1 };
          }

          return {
            x: Math.max(-60, Math.min(60, newX)),
            y: Math.max(-60, Math.min(60, newY))
          };
        });
      }

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [airSpeed, tiltAngle, isDragging, simulationMode, ballVelocity]);

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setAirSpeed(80);
      setTiltAngle(0);
      setBallPosition({ x: 0, y: 0 });
      setBallVelocity({ x: 0, y: 0 });
      setSimulationMode('airstream');
    } else if (newPhase === 'twist_play') {
      setSimulationMode('maglev');
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
  // RENDER HELPERS
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
  // LEVITATION VISUALIZATION
  // ============================================================================

  const renderAirstreamSimulation = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 400;
    const centerX = simWidth / 2;
    const centerY = simHeight / 2;

    // Ball position in screen coordinates
    const ballScreenX = centerX + ballPosition.x;
    const ballScreenY = centerY - ballPosition.y - 50;

    // Airstream visualization
    const tiltRad = tiltAngle * Math.PI / 180;

    // Check if ball is levitating stably
    const distFromCenter = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.y * ballPosition.y);
    const isStable = distFromCenter < 40 && airSpeed > 40;

    return (
      <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          <radialGradient id="pressureGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
            <stop offset="70%" stopColor={colors.warning} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0.4" />
          </radialGradient>
          <linearGradient id="airstreamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={simWidth} height={simHeight} fill="#0a1520" />

        {/* Tilted coordinate system */}
        <g transform={`translate(${centerX}, ${centerY + 100}) rotate(${-tiltAngle})`}>
          {/* Hair dryer / air source */}
          <rect x={-40} y={60} width={80} height={80} rx={10}
                fill="#4a5568" stroke="#718096" strokeWidth={2} />
          <text x={0} y={110} fill={colors.text} fontSize={12} textAnchor="middle">
            Air Source
          </text>

          {/* Airstream cone */}
          <path
            d={`M -30 60 L -60 -100 L 60 -100 L 30 60 Z`}
            fill="url(#airstreamGrad)"
            opacity={airSpeed / 100}
          />

          {/* Pressure gradient visualization */}
          {showPressure && (
            <ellipse cx={0} cy={-50} rx={50} ry={80}
                     fill="url(#pressureGrad)" />
          )}

          {/* Airstream lines */}
          {[...Array(7)].map((_, i) => {
            const x = -30 + i * 10;
            const speed = airSpeed * (1 - Math.abs(x) / 50);
            const animOffset = (animationTime * speed * 0.1) % 160;

            return (
              <g key={i}>
                <line
                  x1={x * 0.8}
                  y1={60}
                  x2={x * 2}
                  y2={-100}
                  stroke={colors.primary}
                  strokeWidth={1}
                  opacity={0.3}
                />
                {/* Animated particles */}
                {[0, 50, 100].map((offset, j) => {
                  const t = ((animOffset + offset) % 160) / 160;
                  const px = x * 0.8 + (x * 2 - x * 0.8) * t;
                  const py = 60 + (-100 - 60) * t;
                  return (
                    <circle
                      key={j}
                      cx={px}
                      cy={py}
                      r={2}
                      fill={colors.primary}
                      opacity={0.6}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Pressure labels */}
          {showPressure && (
            <>
              <text x={0} y={-50} fill={colors.primary} fontSize={11} textAnchor="middle" fontWeight="600">
                LOW P
              </text>
              <text x={-50} y={0} fill={colors.warning} fontSize={10} textAnchor="middle">
                HIGH P
              </text>
              <text x={50} y={0} fill={colors.warning} fontSize={10} textAnchor="middle">
                HIGH P
              </text>
            </>
          )}
        </g>

        {/* Ball */}
        <g transform={`translate(${ballScreenX}, ${ballScreenY})`}>
          <circle r={20} fill="#f59e0b" stroke="#fbbf24" strokeWidth={2}>
            <animate attributeName="r" values="20;21;20" dur="0.5s" repeatCount="indefinite" />
          </circle>
          <text x={0} y={4} fill="#1f2937" fontSize={10} textAnchor="middle" fontWeight="600">
            BALL
          </text>

          {/* Forces */}
          {showForces && (
            <>
              {/* Gravity */}
              <line x1={0} y1={0} x2={0} y2={30} stroke={colors.warning} strokeWidth={3} />
              <polygon points="0,35 -6,25 6,25" fill={colors.warning} />
              <text x={15} y={35} fill={colors.warning} fontSize={10}>W</text>

              {/* Lift */}
              <line x1={0} y1={0} x2={0} y2={-30 * (airSpeed / 80)} stroke={colors.success} strokeWidth={3} />
              <polygon points={`0,${-35 * (airSpeed / 80)} -6,${-25 * (airSpeed / 80)} 6,${-25 * (airSpeed / 80)}`} fill={colors.success} />
              <text x={15} y={-20 * (airSpeed / 80)} fill={colors.success} fontSize={10}>Lift</text>

              {/* Restoring force (if displaced) */}
              {distFromCenter > 10 && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={-ballPosition.x * 0.3}
                    y2={ballPosition.y * 0.3}
                    stroke={colors.accent}
                    strokeWidth={2}
                  />
                  <text x={-ballPosition.x * 0.15 - 10} y={ballPosition.y * 0.15}
                        fill={colors.accent} fontSize={9}>
                    Restoring
                  </text>
                </>
              )}
            </>
          )}
        </g>

        {/* Status indicator */}
        <rect x={10} y={10} width={140} height={30} rx={5}
              fill={isStable ? colors.success : colors.warning} opacity={0.2} />
        <text x={80} y={30} fill={isStable ? colors.success : colors.warning}
              fontSize={12} textAnchor="middle" fontWeight="600">
          {isStable ? '✓ STABLE LEVITATION' : '⚠️ UNSTABLE'}
        </text>

        {/* Tilt indicator */}
        <text x={simWidth - 10} y={30} fill={colors.textSecondary}
              fontSize={11} textAnchor="end">
          Tilt: {tiltAngle}°
        </text>
      </svg>
    );
  };

  const renderMaglevSimulation = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 400;
    const centerX = simWidth / 2;

    // Animated train position
    const trainX = (animationTime * 100) % (simWidth + 200) - 100;

    return (
      <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
          <linearGradient id="trainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={simWidth} height={simHeight} fill="#0a1520" />

        {/* Track structure */}
        <rect x={0} y={280} width={simWidth} height={40} fill="url(#trackGrad)" />

        {/* Magnetic field lines */}
        {[...Array(15)].map((_, i) => {
          const x = (i * 40 + animationTime * 50) % simWidth;
          return (
            <g key={i}>
              <path
                d={`M ${x} 280 Q ${x + 20} 250 ${x} 220 Q ${x - 20} 190 ${x} 160`}
                fill="none"
                stroke={colors.secondary}
                strokeWidth={1}
                opacity={0.3}
              />
              <path
                d={`M ${x} 280 Q ${x - 20} 250 ${x} 220 Q ${x + 20} 190 ${x} 160`}
                fill="none"
                stroke={colors.secondary}
                strokeWidth={1}
                opacity={0.3}
              />
            </g>
          );
        })}

        {/* Electromagnets in track */}
        {[...Array(12)].map((_, i) => (
          <g key={i}>
            <rect x={i * 45 + 10} y={285} width={30} height={30} rx={3}
                  fill={colors.secondary} opacity={0.5} />
            <text x={i * 45 + 25} y={305} fill={colors.text} fontSize={8} textAnchor="middle">
              EM
            </text>
          </g>
        ))}

        {/* Maglev Train */}
        <g transform={`translate(${trainX}, 220)`}>
          {/* Levitation gap */}
          <rect x={0} y={40} width={150} height={15} fill={colors.primary} opacity={0.3}>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="0.5s" repeatCount="indefinite" />
          </rect>
          <text x={75} y={52} fill={colors.primary} fontSize={8} textAnchor="middle">
            GAP: 10mm
          </text>

          {/* Train body */}
          <path
            d={`M 0 0 L 10 -30 L 140 -30 L 150 0 L 150 40 L 0 40 Z`}
            fill="url(#trainGrad)"
            stroke="#94a3b8"
            strokeWidth={2}
          />

          {/* Windows */}
          {[30, 60, 90, 120].map(x => (
            <rect key={x} x={x} y={-20} width={20} height={15} rx={2}
                  fill="#0ea5e9" opacity={0.7} />
          ))}

          {/* Onboard magnets */}
          <rect x={10} y={35} width={130} height={8} fill={colors.accent} opacity={0.5} />

          {/* Speed indicator */}
          <text x={75} y={-40} fill={colors.success} fontSize={14} textAnchor="middle" fontWeight="600">
            375 mph
          </text>
        </g>

        {/* Sensor feedback visualization */}
        {showForces && (
          <g>
            <rect x={20} y={330} width={simWidth - 40} height={50} rx={5}
                  fill={colors.cardBg} stroke={colors.border} />
            <text x={centerX} y={350} fill={colors.text} fontSize={11} textAnchor="middle">
              Feedback Loop: Sensor → Computer → Magnet Adjustment
            </text>
            <text x={centerX} y={365} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
              Gap monitored 1000+ times/second
            </text>
          </g>
        )}

        {/* Earnshaw's theorem note */}
        <text x={centerX} y={30} fill={colors.accent} fontSize={12} textAnchor="middle" fontWeight="600">
          Active Feedback Defeats Earnshaw's Theorem!
        </text>
      </svg>
    );
  };

  const renderSimulation = () => {
    if (simulationMode === 'maglev') {
      return renderMaglevSimulation();
    }
    return renderAirstreamSimulation();
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      {simulationMode === 'airstream' && (
        <>
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
              Air Speed: {airSpeed}%
              {airSpeed < 40 && <span style={{ color: colors.warning }}> ⚠️ Too low!</span>}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={airSpeed}
              onChange={(e) => setAirSpeed(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

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
              Tilt Angle: {tiltAngle}°
            </label>
            <input
              type="range"
              min={-45}
              max={45}
              value={tiltAngle}
              onChange={(e) => setTiltAngle(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {simulationMode === 'maglev' && (
        <div style={{
          gridColumn: '1 / -1',
          background: colors.cardBg,
          padding: spacing.lg,
          borderRadius: radius.md,
          border: `1px solid ${colors.secondary}`,
          textAlign: 'center',
        }}>
          <p style={{ color: colors.text, margin: 0 }}>
            The maglev train maintains a precise 10mm gap using electromagnetic feedback.
            <br/>
            <span style={{ color: colors.accent }}>Sensors detect changes → Computer calculates correction → Magnets adjust instantly</span>
          </p>
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
        onMouseDown={() => setShowForces(!showForces)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showForces ? colors.success : colors.cardBg,
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
        onMouseDown={() => setShowPressure(!showPressure)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showPressure ? colors.primary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showPressure ? '🌀 Pressure On' : '🌀 Pressure Off'}
      </button>
      {simulationMode === 'airstream' && (
        <button
          onMouseDown={() => {
            setBallPosition({ x: 0, y: 0 });
            setBallVelocity({ x: 0, y: 0 });
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
          🔄 Reset Ball
        </button>
      )}
      {phase === 'play' && (
        <button
          onMouseDown={() => setSimulationMode(simulationMode === 'airstream' ? 'maglev' : 'airstream')}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: colors.accent,
            border: `1px solid ${colors.accent}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
          }}
        >
          {simulationMode === 'airstream' ? '🚄 Try Maglev' : '🎈 Try Airstream'}
        </button>
      )}
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
        🎈
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        The Art of Floating
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        A ping pong ball floats magically in an airstream. A 500-ton train hovers on invisible
        magnetic fields. A frog levitates in a laboratory. What these have in common is
        <em> stable equilibrium</em> - the physics of finding and staying at the perfect balance point.
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '48px', marginBottom: spacing.sm }}>⬆️ = ⬇️</div>
        <p style={{ color: colors.text, margin: 0 }}>
          When forces balance... you float!
        </p>
      </div>
      {renderButton('Explore Levitation', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '🧲 The Magnetic Mystery' : '🤔 Make Your Prediction'}
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
              {selectedPrediction === pred.correct ? '✓ Excellent!' : '✗ Fascinating physics!'}
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
        {isTwist ? '🚄 Maglev Physics' : '🎈 Stable Levitation Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'See how electromagnetic feedback achieves "impossible" stable magnetic levitation!'
          : 'Try tilting the airstream - the ball stays floating! Explore the pressure well that traps it.'}
      </p>

      <div style={{
        background: 'linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        {renderSimulation()}
      </div>

      {renderControls()}
      {renderQuickButtons()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>🧪 Earnshaw's Loopholes</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            Earnshaw proved static magnetic levitation is unstable. But nature found loopholes:
            <br/><br/>
            <strong>1. Diamagnetism:</strong> Materials that weakly repel ALL fields (superconductors, graphite, even frogs!)
            <br/>
            <strong>2. Feedback:</strong> Active control adjusts fields faster than instabilities can grow
            <br/>
            <strong>3. Rotation:</strong> Spinning objects can achieve gyroscopic stability (Levitron)
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
        {isTwist ? '🎯 Breaking Earnshaw\'s Theorem' : '📚 Stable vs Unstable Equilibrium'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Ways to Achieve Magnetic Levitation</h3>

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
                <h4 style={{ color: colors.primary, marginBottom: spacing.sm }}>🎮 Feedback Control</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Sensors monitor position</li>
                  <li>Computer calculates adjustment</li>
                  <li>Electromagnets respond</li>
                  <li>1000+ corrections per second</li>
                  <li>Example: German Transrapid</li>
                </ul>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.secondary, marginBottom: spacing.sm }}>🧊 Superconductors</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Perfect diamagnetism</li>
                  <li>Expel ALL magnetic fields</li>
                  <li>No feedback needed!</li>
                  <li>Requires extreme cold</li>
                  <li>Example: Japanese SCMaglev</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Types of Equilibrium</h3>

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
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>⚽</div>
                <div style={{ color: colors.success, fontWeight: '600' }}>Stable</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Displaced → Returns<br/>
                  (Ball in bowl)
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>⚾</div>
                <div style={{ color: colors.warning, fontWeight: '600' }}>Unstable</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Displaced → Falls away<br/>
                  (Ball on hill)
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>🎱</div>
                <div style={{ color: colors.secondary, fontWeight: '600' }}>Neutral</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Displaced → Stays<br/>
                  (Ball on flat surface)
                </p>
              </div>
            </div>

            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: colors.background,
              borderRadius: radius.md,
              textAlign: 'center',
            }}>
              <p style={{ color: colors.text, margin: 0 }}>
                The ball in airstream has <strong style={{ color: colors.success }}>stable equilibrium</strong>
                <br/>
                Displaced ball enters higher pressure → pushed back to center!
              </p>
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
          🌍 Levitation Technology
        </h2>

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
            <div style={{ color: colors.accent, marginBottom: 4 }}>🔬 Fun Fact:</div>
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
          {passed ? 'Levitation Master!' : 'Keep Learning!'}
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
            <li>Stable equilibrium: displaced → restored</li>
            <li>Bernoulli: fast air = low pressure = trap</li>
            <li>Earnshaw: static magnets can't levitate stably</li>
            <li>Loopholes: feedback, superconductors, diamagnetism</li>
            <li>Maglev trains: 375+ mph with no contact!</li>
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

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review',
    transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
  };
  const currentPhaseIndex = phases.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Stable Levitation</span>
          <div className="flex items-center gap-1.5">
            {phases.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : i < currentPhaseIndex
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ padding: isMobile ? spacing.md : spacing.xl, paddingTop: '64px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {renderPhaseContent()}

          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default StableLevitationRenderer;
