'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// POLARIZATION RENDERER - CROSSED SUNGLASSES DEMONSTRATION
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface PolarizationRendererProps {
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
    question: "You have two identical polarizing sunglasses. If you hold one lens in front of the other and rotate it, what happens to the light passing through?",
    options: [
      { id: 'a', text: 'Light stays the same brightness regardless of angle', icon: '🔆' },
      { id: 'b', text: 'Light dims slightly when rotated', icon: '🔅' },
      { id: 'c', text: 'Light can be completely blocked at certain angles', icon: '⬛' },
      { id: 'd', text: 'Light creates rainbow colors when rotated', icon: '🌈' },
    ],
    correct: 'c',
    explanation: "Polarized sunglasses only allow light vibrating in one direction to pass through. When you cross two polarizers at 90°, the first filter blocks all light except one direction, then the second filter blocks that remaining light completely!"
  },
  twist: {
    question: "You place a third polarizer between two crossed (90°) polarizers. The two end polarizers completely block light. What happens when you add the middle one at 45°?",
    options: [
      { id: 'a', text: 'Still completely dark - three filters block more', icon: '⬛' },
      { id: 'b', text: 'Some light comes through now', icon: '💡' },
      { id: 'c', text: 'Creates polarized rainbows', icon: '🌈' },
      { id: 'd', text: 'The middle filter has no effect', icon: '🤷' },
    ],
    correct: 'b',
    explanation: "Mind-bending! Adding MORE material lets MORE light through. The 45° middle filter rotates the polarization state, allowing some light to pass through what was previously a complete block. This is quantum weirdness in action!"
  }
};

const realWorldApplications = [
  {
    id: 'sunglasses',
    title: '🕶️ Anti-Glare Sunglasses',
    subtitle: 'Cutting road and water glare',
    description: 'Light reflecting off horizontal surfaces (roads, water, snow) becomes horizontally polarized. Polarized sunglasses have vertical filters that block this glare while letting other light through, dramatically improving visibility.',
    formula: 'Reflected glare → Horizontally polarized → Vertical filter blocks it',
    realExample: 'Fishermen use polarized glasses to see through water surface reflections and spot fish beneath.',
    interactiveHint: 'Next time you have polarized sunglasses, tilt your head 90° - glare returns!'
  },
  {
    id: 'lcd',
    title: '📺 LCD Screens',
    subtitle: 'Every pixel uses polarization',
    description: 'LCD screens sandwich liquid crystals between two crossed polarizers. Electricity twists the crystals to rotate polarization, controlling whether light passes through each pixel. No crystals? Screen stays dark.',
    formula: 'Light → Polarizer 1 → Liquid Crystal (twist) → Polarizer 2 → Your eyes',
    realExample: 'Put polarized sunglasses on and tilt your head while viewing an LCD - the screen goes dark!',
    interactiveHint: 'Every smartphone, computer monitor, and TV uses this polarization principle.'
  },
  {
    id: '3d_movies',
    title: '🎬 3D Movie Glasses',
    subtitle: 'Different images for each eye',
    description: 'Modern 3D theaters project two images with different polarizations (often circular). Each lens of 3D glasses filters for one polarization, so your left eye sees one image and right eye sees another, creating depth perception.',
    formula: 'Left projection (circular L) → Left lens filter → Left eye only',
    realExample: 'RealD 3D uses circular polarization so you can tilt your head without losing the effect.',
    interactiveHint: 'Try closing one eye in a 3D movie - you\'ll see a ghost image from the other projector!'
  },
  {
    id: 'stress_analysis',
    title: '🔬 Stress Analysis',
    subtitle: 'Seeing invisible forces',
    description: 'Transparent plastics become birefringent under stress - they rotate polarization differently in different areas. Between crossed polarizers, stress patterns appear as colorful fringes, revealing where forces concentrate.',
    formula: 'Stress → Birefringence → Polarization rotation → Color patterns',
    realExample: 'Engineers use photoelastic analysis to find stress concentrations in prototypes before building.',
    interactiveHint: 'Put a plastic protractor between polarizers and press on it - colors appear!'
  }
];

const quizQuestions = [
  {
    question: "What does a polarizing filter do to unpolarized light?",
    options: [
      "Blocks all light completely",
      "Allows only light vibrating in one direction through",
      "Splits light into rainbow colors",
      "Makes light travel faster"
    ],
    correct: 1,
    explanation: "A polarizer acts like a fence with vertical slats - only waves vibrating in the aligned direction can pass through."
  },
  {
    question: "Two polarizers are crossed at 90°. What percentage of unpolarized light gets through?",
    options: ["100%", "50%", "25%", "0%"],
    correct: 3,
    explanation: "The first polarizer passes 50% (one direction only). The second, at 90°, blocks ALL of that remaining light. Result: complete darkness."
  },
  {
    question: "According to Malus's Law, when two polarizers are at 45°, what fraction of polarized light passes through the second?",
    options: ["All of it", "Half (cos²45° = 0.5)", "None of it", "One quarter"],
    correct: 1,
    explanation: "Malus's Law: I = I₀cos²θ. At 45°, cos²(45°) = 0.5, so half the intensity passes through."
  },
  {
    question: "Why do polarized sunglasses reduce glare from roads and water?",
    options: [
      "They're darker than regular sunglasses",
      "Reflected light is horizontally polarized, and vertical polarizers block it",
      "They absorb more UV light",
      "They have anti-reflective coating"
    ],
    correct: 1,
    explanation: "Light reflecting at shallow angles from horizontal surfaces becomes horizontally polarized. Polarized sunglasses with vertical transmission axis block this specific glare."
  },
  {
    question: "What's paradoxical about adding a third polarizer between two crossed polarizers?",
    options: [
      "It makes the light brighter than before",
      "The third filter has no effect",
      "Adding more filter material can let MORE light through",
      "It creates rainbow colors"
    ],
    correct: 2,
    explanation: "Counterintuitively, adding a 45° polarizer between two crossed polarizers lets light through what was previously complete darkness. Each polarizer rotates the polarization state."
  },
  {
    question: "How do LCD screens control individual pixels?",
    options: [
      "By changing pixel color directly",
      "By adjusting LCD brightness",
      "By twisting liquid crystals to rotate polarization between crossed polarizers",
      "By blocking specific wavelengths"
    ],
    correct: 2,
    explanation: "LCD pixels are sandwiched between crossed polarizers. Voltage controls how much the liquid crystals twist polarization, determining how much light passes through."
  },
  {
    question: "What type of polarization do modern 3D movie glasses typically use?",
    options: [
      "Linear horizontal/vertical",
      "Circular (left/right handed)",
      "Color-based filtering",
      "No polarization, just colored lenses"
    ],
    correct: 1,
    explanation: "RealD 3D uses circular polarization - left-handed for one eye, right-handed for the other. This lets you tilt your head without losing the 3D effect."
  },
  {
    question: "In photoelastic stress analysis, why do stressed plastics show colorful patterns between crossed polarizers?",
    options: [
      "The plastic glows when stressed",
      "Stress creates birefringence that rotates polarization differently for different wavelengths",
      "The colors are from the polarizers themselves",
      "Chemical changes in the plastic"
    ],
    correct: 1,
    explanation: "Stress makes materials birefringent - they rotate polarization by different amounts for different colors, creating interference patterns that reveal stress distribution."
  },
  {
    question: "If unpolarized light passes through a single polarizer, what's the intensity compared to before?",
    options: ["Same (100%)", "Half (50%)", "Quarter (25%)", "Zero"],
    correct: 1,
    explanation: "Unpolarized light vibrates in all directions equally. A polarizer passes only components aligned with its axis - exactly half the total intensity on average."
  },
  {
    question: "Why might an LCD screen appear dark when viewed through polarized sunglasses at certain angles?",
    options: [
      "The sunglasses are broken",
      "The LCD is malfunctioning",
      "The sunglasses' polarization aligns with the LCD's output polarizer and blocks light",
      "LCDs emit unpolarized light"
    ],
    correct: 2,
    explanation: "LCD screens emit polarized light (from their output polarizer). When your polarized sunglasses align perpendicular to this, they block the screen's light completely."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PolarizationRenderer: React.FC<PolarizationRendererProps> = ({
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
  const [polarizer1Angle, setPolarizer1Angle] = useState(0);
  const [polarizer2Angle, setPolarizer2Angle] = useState(0);
  const [showPolarizer3, setShowPolarizer3] = useState(false);
  const [polarizer3Angle, setPolarizer3Angle] = useState(45);
  const [showWaves, setShowWaves] = useState(true);
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
      setAnimationTime(t => t + 0.03);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate intensity after polarizers using Malus's Law
  const calculateIntensity = useCallback((angle1: number, angle2: number, angle3?: number): number => {
    // Unpolarized light through first polarizer = 50%
    let intensity = 0.5;

    if (angle3 !== undefined) {
      // Three polarizers: I = I0 * 0.5 * cos²(θ3 - θ1) * cos²(θ2 - θ3)
      const diff1 = (angle3 - angle1) * Math.PI / 180;
      const diff2 = (angle2 - angle3) * Math.PI / 180;
      intensity *= Math.pow(Math.cos(diff1), 2) * Math.pow(Math.cos(diff2), 2);
    } else {
      // Two polarizers: I = I0 * 0.5 * cos²(θ2 - θ1)
      const diff = (angle2 - angle1) * Math.PI / 180;
      intensity *= Math.pow(Math.cos(diff), 2);
    }

    return Math.max(0, Math.min(1, intensity));
  }, []);

  const currentIntensity = showPolarizer3
    ? calculateIntensity(polarizer1Angle, polarizer2Angle, polarizer3Angle)
    : calculateIntensity(polarizer1Angle, polarizer2Angle);

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setPolarizer1Angle(0);
      setPolarizer2Angle(0);
      setShowPolarizer3(false);
    } else if (newPhase === 'twist_play') {
      setPolarizer1Angle(0);
      setPolarizer2Angle(90);
      setShowPolarizer3(true);
      setPolarizer3Angle(45);
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
  // POLARIZATION VISUALIZATION
  // ============================================================================

  const renderPolarizationSimulation = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 300;
    const centerY = simHeight / 2;

    return (
      <div style={{
        background: 'linear-gradient(180deg, #0a0a1a 0%, #141428 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          {/* Light source */}
          <defs>
            <radialGradient id="lightGlow">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="50%" stopColor="#ffd700" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="polarizerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4a90d9" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#2a5a8a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4a90d9" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Light source */}
          <circle cx={30} cy={centerY} r={20} fill="url(#lightGlow)" />
          <circle cx={30} cy={centerY} r={8} fill="#fff" />

          {/* Incoming unpolarized light waves */}
          {showWaves && (
            <g>
              {[0, 1, 2, 3, 4].map((i) => {
                const x = 50 + i * 15 - (animationTime * 30 % 75);
                if (x < 50 || x > 100) return null;
                return (
                  <g key={`unpol-${i}`}>
                    {/* Vertical component */}
                    <line
                      x1={x}
                      y1={centerY - 15}
                      x2={x}
                      y2={centerY + 15}
                      stroke="#ffd700"
                      strokeWidth={2}
                      opacity={0.6}
                    />
                    {/* Horizontal component */}
                    <line
                      x1={x - 10}
                      y1={centerY}
                      x2={x + 10}
                      y2={centerY}
                      stroke="#ffd700"
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* First Polarizer */}
          <g transform={`translate(120, ${centerY})`}>
            <rect
              x={-8}
              y={-60}
              width={16}
              height={120}
              fill="url(#polarizerGrad)"
              stroke={colors.primary}
              strokeWidth={2}
              rx={4}
            />
            {/* Polarization lines */}
            {[-40, -20, 0, 20, 40].map((y) => (
              <line
                key={y}
                x1={-6}
                y1={y}
                x2={6}
                y2={y}
                stroke={colors.text}
                strokeWidth={1}
                transform={`rotate(${polarizer1Angle})`}
              />
            ))}
            <text
              y={80}
              textAnchor="middle"
              fill={colors.textSecondary}
              fontSize={12}
            >
              P1: {polarizer1Angle}°
            </text>
          </g>

          {/* Light between polarizers */}
          {showWaves && (
            <g>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const baseX = showPolarizer3 ? 140 : 140;
                const endX = showPolarizer3 ? 220 : 280;
                const x = baseX + i * 20 - (animationTime * 30 % 120);
                if (x < baseX || x > endX) return null;

                const len = 15;
                const angle = polarizer1Angle * Math.PI / 180;
                const dx = Math.sin(angle) * len;
                const dy = Math.cos(angle) * len;

                return (
                  <line
                    key={`pol1-${i}`}
                    x1={x - dx}
                    y1={centerY - dy}
                    x2={x + dx}
                    y2={centerY + dy}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    opacity={0.8}
                  />
                );
              })}
            </g>
          )}

          {/* Third Polarizer (optional) */}
          {showPolarizer3 && (
            <>
              <g transform={`translate(240, ${centerY})`}>
                <rect
                  x={-8}
                  y={-60}
                  width={16}
                  height={120}
                  fill="url(#polarizerGrad)"
                  stroke={colors.accent}
                  strokeWidth={2}
                  rx={4}
                />
                {[-40, -20, 0, 20, 40].map((y) => (
                  <line
                    key={y}
                    x1={-6}
                    y1={y}
                    x2={6}
                    y2={y}
                    stroke={colors.text}
                    strokeWidth={1}
                    transform={`rotate(${polarizer3Angle})`}
                  />
                ))}
                <text
                  y={80}
                  textAnchor="middle"
                  fill={colors.accent}
                  fontSize={12}
                >
                  P3: {polarizer3Angle}°
                </text>
              </g>

              {/* Light after P3 */}
              {showWaves && currentIntensity > 0.01 && (
                <g>
                  {[0, 1, 2, 3].map((i) => {
                    const x = 260 + i * 20 - (animationTime * 30 % 80);
                    if (x < 260 || x > 340) return null;

                    const len = 15;
                    const angle = polarizer3Angle * Math.PI / 180;
                    const dx = Math.sin(angle) * len;
                    const dy = Math.cos(angle) * len;
                    const intensity = calculateIntensity(polarizer1Angle, polarizer3Angle);

                    return (
                      <line
                        key={`pol3-${i}`}
                        x1={x - dx}
                        y1={centerY - dy}
                        x2={x + dx}
                        y2={centerY + dy}
                        stroke={colors.accent}
                        strokeWidth={2}
                        opacity={intensity * 0.8}
                      />
                    );
                  })}
                </g>
              )}
            </>
          )}

          {/* Second Polarizer */}
          <g transform={`translate(${showPolarizer3 ? 360 : 300}, ${centerY})`}>
            <rect
              x={-8}
              y={-60}
              width={16}
              height={120}
              fill="url(#polarizerGrad)"
              stroke={colors.secondary}
              strokeWidth={2}
              rx={4}
            />
            {[-40, -20, 0, 20, 40].map((y) => (
              <line
                key={y}
                x1={-6}
                y1={y}
                x2={6}
                y2={y}
                stroke={colors.text}
                strokeWidth={1}
                transform={`rotate(${polarizer2Angle})`}
              />
            ))}
            <text
              y={80}
              textAnchor="middle"
              fill={colors.textSecondary}
              fontSize={12}
            >
              P2: {polarizer2Angle}°
            </text>
          </g>

          {/* Output light */}
          {showWaves && currentIntensity > 0.01 && (
            <g>
              {[0, 1, 2, 3, 4].map((i) => {
                const startX = showPolarizer3 ? 380 : 320;
                const x = startX + i * 20 - (animationTime * 30 % 100);
                if (x < startX || x > simWidth - 30) return null;

                const len = 15;
                const angle = polarizer2Angle * Math.PI / 180;
                const dx = Math.sin(angle) * len;
                const dy = Math.cos(angle) * len;

                return (
                  <line
                    key={`out-${i}`}
                    x1={x - dx}
                    y1={centerY - dy}
                    x2={x + dx}
                    y2={centerY + dy}
                    stroke={colors.success}
                    strokeWidth={2}
                    opacity={currentIntensity * 0.8}
                  />
                );
              })}
            </g>
          )}

          {/* Output screen */}
          <rect
            x={simWidth - 30}
            y={centerY - 50}
            width={20}
            height={100}
            fill={`rgba(255, 255, 255, ${currentIntensity})`}
            stroke={colors.border}
            strokeWidth={1}
            rx={4}
          />

          {/* Labels */}
          <text x={30} y={centerY + 50} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>
            Light Source
          </text>
          <text x={simWidth - 20} y={centerY + 65} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>
            Screen
          </text>
        </svg>

        {/* Intensity readout */}
        <div style={{
          textAlign: 'center',
          marginTop: spacing.md,
          padding: spacing.md,
          background: colors.background,
          borderRadius: radius.md,
        }}>
          <div style={{ color: colors.textSecondary, fontSize: typography.small.fontSize, marginBottom: 4 }}>
            Output Intensity (Malus's Law)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.success }}>
            {(currentIntensity * 100).toFixed(1)}%
          </div>
          <div style={{ color: colors.textSecondary, fontSize: typography.small.fontSize, marginTop: 4 }}>
            I = I₀ × 0.5 × cos²(θ₂ - θ₁){showPolarizer3 ? ' × cos²(θ₃ - θ₂)' : ''}
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : (showPolarizer3 ? '1fr 1fr 1fr' : '1fr 1fr'),
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.primary}`,
      }}>
        <label style={{ color: colors.primary, fontSize: typography.small.fontSize, display: 'block', marginBottom: 8 }}>
          Polarizer 1 Angle: {polarizer1Angle}°
        </label>
        <input
          type="range"
          min={0}
          max={180}
          value={polarizer1Angle}
          onChange={(e) => setPolarizer1Angle(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showPolarizer3 && (
        <div style={{
          background: colors.cardBg,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${colors.accent}`,
        }}>
          <label style={{ color: colors.accent, fontSize: typography.small.fontSize, display: 'block', marginBottom: 8 }}>
            Polarizer 3 (Middle): {polarizer3Angle}°
          </label>
          <input
            type="range"
            min={0}
            max={180}
            value={polarizer3Angle}
            onChange={(e) => setPolarizer3Angle(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.secondary}`,
      }}>
        <label style={{ color: colors.secondary, fontSize: typography.small.fontSize, display: 'block', marginBottom: 8 }}>
          Polarizer 2 Angle: {polarizer2Angle}°
        </label>
        <input
          type="range"
          min={0}
          max={180}
          value={polarizer2Angle}
          onChange={(e) => setPolarizer2Angle(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );

  const renderQuickControls = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      justifyContent: 'center',
    }}>
      <button
        onMouseDown={() => { setPolarizer1Angle(0); setPolarizer2Angle(0); }}
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
        Parallel (0°)
      </button>
      <button
        onMouseDown={() => { setPolarizer1Angle(0); setPolarizer2Angle(45); }}
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
        45° Offset
      </button>
      <button
        onMouseDown={() => { setPolarizer1Angle(0); setPolarizer2Angle(90); }}
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
        Crossed (90°)
      </button>
      <button
        onMouseDown={() => setShowWaves(!showWaves)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showWaves ? colors.primary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showWaves ? '🌊 Waves On' : '🌊 Waves Off'}
      </button>
      {phase === 'play' && (
        <button
          onMouseDown={() => setShowPolarizer3(!showPolarizer3)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: showPolarizer3 ? colors.accent : colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
          }}
        >
          {showPolarizer3 ? '3rd Polarizer On' : 'Add 3rd Polarizer'}
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
        🕶️
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        The Polarization Paradox
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        Take two polarized sunglasses. Hold them together and rotate one...
        light can be completely blocked! But add a THIRD lens in between,
        and somehow MORE light gets through. How can adding material let more light pass?
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '48px', marginBottom: spacing.sm }}>⬛ + 🟦 = 💡?</div>
        <p style={{ color: colors.text, margin: 0 }}>
          Darkness + More Filter = Light?!
        </p>
      </div>
      {renderButton('Explore This Mystery', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (istwist = false) => {
    const pred = istwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {istwist ? '🔮 The Paradox Deepens' : '🤔 Make Your Prediction'}
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
              {selectedPrediction === pred.correct ? '✓ Excellent intuition!' : '✗ Surprising, right?'}
            </h3>
            <p style={{ color: colors.text, margin: 0 }}>{pred.explanation}</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          {!showPredictionFeedback ? (
            renderButton('Lock In Prediction', handlePredictionSubmit, 'primary', !selectedPrediction)
          ) : (
            renderButton('See It In Action →', () => goToPhase(istwist ? 'twist_play' : 'play'))
          )}
        </div>
      </div>
    );
  };

  const renderPlay = (isTwist = false) => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        {isTwist ? '🔮 Three Polarizer Paradox' : '🎮 Polarizer Playground'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'The middle polarizer at 45° lets light through what was completely blocked!'
          : 'Rotate the polarizers and watch how the output intensity changes.'}
      </p>

      {renderPolarizationSimulation()}
      {renderControls()}
      {renderQuickControls()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>🤯 The Quantum Connection</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            This isn't just classical optics - it's connected to quantum mechanics! Each polarizer
            "measures" the light's polarization state, collapsing it to a new orientation. The middle
            polarizer creates a new state that has a component the final polarizer can pass.
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
        {isTwist ? '🧠 The Three Polarizer Solution' : '📚 Malus\'s Law'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Why Adding More Lets More Through</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: spacing.lg,
            }}>
              <div>
                <h4 style={{ color: colors.primary, marginBottom: spacing.sm }}>Two Crossed Polarizers</h4>
                <p style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                  P1 at 0° → Light polarized at 0°<br/>
                  P2 at 90° → cos²(90°) = 0<br/>
                  <strong style={{ color: colors.warning }}>Result: 0% transmission</strong>
                </p>
              </div>
              <div>
                <h4 style={{ color: colors.accent, marginBottom: spacing.sm }}>With Middle at 45°</h4>
                <p style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                  P1 at 0° → Light at 0°<br/>
                  P3 at 45° → cos²(45°) = 50%<br/>
                  P2 at 90° → cos²(45°) = 50%<br/>
                  <strong style={{ color: colors.success }}>Result: 12.5% transmission!</strong>
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
              <code style={{ color: colors.success, fontSize: typography.h3.fontSize }}>
                I = I₀ × 0.5 × cos²(45°) × cos²(45°) = I₀ × 0.125
              </code>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>The Mathematics of Polarization</h3>
            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '28px', color: colors.primary, fontFamily: 'monospace' }}>
                I = I₀ × cos²(θ)
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                Where θ is the angle between polarizer axes
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: spacing.md }}>
              <div style={{ textAlign: 'center', padding: spacing.md }}>
                <div style={{ fontSize: '24px', color: colors.success }}>θ = 0°</div>
                <div style={{ color: colors.textSecondary }}>cos²(0°) = 1</div>
                <div style={{ color: colors.text }}>100% transmission</div>
              </div>
              <div style={{ textAlign: 'center', padding: spacing.md }}>
                <div style={{ fontSize: '24px', color: colors.warning }}>θ = 45°</div>
                <div style={{ color: colors.textSecondary }}>cos²(45°) = 0.5</div>
                <div style={{ color: colors.text }}>50% transmission</div>
              </div>
              <div style={{ textAlign: 'center', padding: spacing.md }}>
                <div style={{ fontSize: '24px', color: colors.accent }}>θ = 90°</div>
                <div style={{ color: colors.textSecondary }}>cos²(90°) = 0</div>
                <div style={{ color: colors.text }}>0% transmission</div>
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
          🌍 Real-World Polarization
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
              How it works:
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
          {passed ? 'Polarization Master!' : 'Keep Learning!'}
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
            <li>Polarizers only pass light vibrating in one direction</li>
            <li>Malus's Law: I = I₀ cos²(θ) governs transmission</li>
            <li>Crossed polarizers (90°) block all light</li>
            <li>A third polarizer can paradoxically let MORE light through</li>
            <li>Polarization is used in sunglasses, LCDs, 3D movies, and more</li>
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
            🕶️ Polarization
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

export default PolarizationRenderer;
