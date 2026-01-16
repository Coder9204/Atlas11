'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CAMERA OBSCURA RENDERER - PINHOLE IMAGE FORMATION
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface CameraObscuraRendererProps {
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
    question: "You poke a tiny hole in one side of a dark box and point it at a candle. On the opposite wall inside the box, you see an image of the candle. What does this image look like?",
    options: [
      { id: 'a', text: 'Same size, right-side up', icon: '🕯️' },
      { id: 'b', text: 'Smaller, upside down', icon: '🙃' },
      { id: 'c', text: 'Larger, upside down', icon: '📍' },
      { id: 'd', text: 'Just a blurry bright spot', icon: '💡' },
    ],
    correct: 'b',
    explanation: "The image is upside down! Light travels in straight lines through the pinhole. Light from the top of the candle goes to the bottom of the screen, and light from the bottom goes to the top. The image is also usually smaller because the pinhole limits which rays can pass through."
  },
  twist: {
    question: "If you make the pinhole LARGER, what happens to the image?",
    options: [
      { id: 'a', text: 'It gets sharper and clearer', icon: '🔬' },
      { id: 'b', text: 'It gets brighter but blurrier', icon: '😵' },
      { id: 'c', text: 'It stays exactly the same', icon: '🤷' },
      { id: 'd', text: 'The image disappears completely', icon: '❌' },
    ],
    correct: 'b',
    explanation: "There's a trade-off! A larger hole lets in more light (brighter) but allows rays from multiple directions to overlap at each point on the screen (blurrier). A smaller hole is sharper but dimmer. This is the fundamental principle behind camera apertures and the physics of f-stops!"
  }
};

const realWorldApplications = [
  {
    id: 'eye',
    title: '👁️ Your Eyes',
    subtitle: 'Nature\'s camera obscura',
    description: 'Your eye works exactly like a camera obscura! Light enters through the pupil (the aperture), and an inverted image forms on your retina. Your brain automatically flips it right-side up. Squinting in bright light is like using a smaller pinhole - it makes things sharper!',
    formula: 'Smaller pupil = sharper image = why you squint',
    realExample: 'When you squint to see better, you\'re creating a smaller aperture that increases depth of field and sharpness.',
    interactiveHint: 'Make a tiny hole with your curled finger - look through it and text suddenly becomes sharper!'
  },
  {
    id: 'cameras',
    title: '📷 Camera Aperture',
    subtitle: 'F-stops explained',
    description: 'Every camera has an adjustable aperture (f-stop) that controls both brightness and sharpness. f/2 (large hole) = bright but shallow focus. f/16 (small hole) = dim but everything sharp. Portrait photographers use large apertures for blurry backgrounds.',
    formula: 'f-number = focal length / aperture diameter',
    realExample: 'Portrait mode on phones simulates large aperture blur - but physics naturally does this in real cameras!',
    interactiveHint: 'Camera on your phone has an "aperture" setting - try different values and see the blur change.'
  },
  {
    id: 'eclipse',
    title: '🌓 Eclipse Viewing',
    subtitle: 'Safe solar observation',
    description: 'During eclipses, tree leaves create thousands of tiny pinholes, projecting crescent suns on the ground! You can make a safe eclipse viewer with a cardboard box and a small hole - the same way astronomers first studied eclipses centuries ago.',
    formula: 'Each gap in leaves = one pinhole projector',
    realExample: 'During the 2024 eclipse, millions of people saw crescent images through leaf shadows.',
    interactiveHint: 'Make a pinhole projector from a cereal box - never look directly at the sun!'
  },
  {
    id: 'architecture',
    title: '🏛️ Camera Obscura Rooms',
    subtitle: 'Walk-in optical experiences',
    description: 'Historic camera obscura rooms exist worldwide - entire darkened rooms with a pinhole or lens projecting the outside world onto walls. Artists like Vermeer may have used them to trace scenes with photographic accuracy centuries before cameras existed.',
    formula: 'Image height / Object height = Image distance / Object distance',
    realExample: 'The Camera Obscura in Edinburgh projects a live panoramic view of the city onto a viewing table.',
    interactiveHint: 'You can build one in any dark room - cover windows, make one small hole, and watch!'
  }
];

const quizQuestions = [
  {
    question: "Why is the image in a pinhole camera upside down?",
    options: [
      "The pinhole flips the light",
      "Light travels in straight lines, so top rays go to bottom and vice versa",
      "There's a lens inside the box",
      "It's an optical illusion"
    ],
    correct: 1,
    explanation: "Light travels in straight lines. Rays from the top of an object pass through the pinhole and continue straight to the bottom of the screen. Rays from the bottom go to the top. This criss-crossing creates an inverted image."
  },
  {
    question: "What happens if you make the pinhole larger?",
    options: [
      "Image gets sharper only",
      "Image gets dimmer only",
      "Image gets brighter but blurrier",
      "Nothing changes"
    ],
    correct: 2,
    explanation: "A larger hole lets more light through (brighter) but allows overlapping rays from different parts of the object to reach the same spot on the screen (blurrier). It's a fundamental trade-off in optics."
  },
  {
    question: "What happens if you move the object closer to the pinhole?",
    options: [
      "The image gets smaller",
      "The image gets larger",
      "The image stays the same size",
      "The image disappears"
    ],
    correct: 1,
    explanation: "Similar triangles! When the object moves closer, the angle of rays through the pinhole becomes steeper, creating a larger projected image on the screen."
  },
  {
    question: "Why do you squint to see more clearly?",
    options: [
      "It changes your eye's focal length",
      "It's just a habit",
      "It creates a smaller aperture, increasing sharpness",
      "It filters out blue light"
    ],
    correct: 2,
    explanation: "Squinting reduces the effective aperture of your eye, which increases depth of field and makes the image sharper - the same principle as a small pinhole!"
  },
  {
    question: "What is the relationship between pinhole size and image brightness?",
    options: [
      "No relationship",
      "Smaller pinhole = brighter image",
      "Larger pinhole = brighter image",
      "Only color is affected"
    ],
    correct: 2,
    explanation: "A larger pinhole allows more light rays to pass through, creating a brighter (but blurrier) image. This is why photographers increase aperture in low light."
  },
  {
    question: "In camera terms, what does 'f/2' mean compared to 'f/16'?",
    options: [
      "f/2 is a smaller aperture",
      "f/2 is a larger aperture (more light, less depth of field)",
      "They are the same",
      "f/16 lets in more light"
    ],
    correct: 1,
    explanation: "f-numbers are counterintuitive: f/2 is a larger opening than f/16. Lower f-numbers = more light, shallower focus. Higher f-numbers = less light, deeper focus."
  },
  {
    question: "How does your eye create a focused image?",
    options: [
      "The pupil flips the image",
      "Light passes through the pupil (aperture) and lens focuses it onto the retina",
      "The brain creates the image without physics",
      "Eyes don't actually focus light"
    ],
    correct: 1,
    explanation: "Your eye is a sophisticated camera obscura. The pupil acts as a variable aperture, and the lens focuses light onto the retina (screen). An inverted image forms, which your brain flips."
  },
  {
    question: "Why do tree leaves create crescent images during a solar eclipse?",
    options: [
      "Leaves change shape during eclipses",
      "Small gaps between leaves act as pinholes, projecting the sun's shape",
      "It's reflected sunlight",
      "The crescent is an illusion"
    ],
    correct: 1,
    explanation: "Every small gap between leaves acts as a pinhole camera, projecting an image of the sun. During an eclipse, these images show the sun's crescent shape!"
  },
  {
    question: "If you move the screen farther from the pinhole, what happens to the image?",
    options: [
      "It gets smaller and brighter",
      "It gets larger and dimmer",
      "It stays exactly the same",
      "The image disappears"
    ],
    correct: 1,
    explanation: "Similar triangles again! As the screen moves back, the projected image spreads over a larger area (gets bigger) but the same amount of light covers more space (gets dimmer)."
  },
  {
    question: "Artists like Vermeer may have used camera obscuras to:",
    options: [
      "Project colors onto canvas",
      "Trace scenes with photographic accuracy before cameras existed",
      "Make paint dry faster",
      "Create 3D effects"
    ],
    correct: 1,
    explanation: "Many art historians believe Dutch masters used camera obscuras to project scenes onto canvas for tracing. This explains the photographic quality and perfect perspective in paintings from centuries before photography!"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CameraObscuraRenderer: React.FC<CameraObscuraRendererProps> = ({
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
  const [pinholeSize, setPinholeSize] = useState(10);
  const [objectDistance, setObjectDistance] = useState(150);
  const [screenDistance, setScreenDistance] = useState(100);
  const [showRays, setShowRays] = useState(true);
  const [objectType, setObjectType] = useState<'candle' | 'arrow' | 'tree'>('candle');
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
      setAnimationTime(t => t + 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate image properties
  const magnification = screenDistance / objectDistance;
  const imageHeight = 60 * magnification; // Object height is 60
  const blurAmount = Math.min(20, pinholeSize * 2); // Blur increases with pinhole size
  const brightness = Math.min(1, (pinholeSize / 10) * 0.8 + 0.2); // Brightness increases with size

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setPinholeSize(10);
      setObjectDistance(150);
      setScreenDistance(100);
    } else if (newPhase === 'twist_play') {
      setPinholeSize(5);
      setObjectDistance(150);
      setScreenDistance(100);
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
  // CAMERA OBSCURA VISUALIZATION
  // ============================================================================

  const renderCameraObscuraSimulation = () => {
    const simWidth = isMobile ? width - 40 : 550;
    const simHeight = 320;
    const centerY = simHeight / 2;

    // Positions
    const objectX = 60;
    const pinholeX = objectX + objectDistance;
    const screenX = pinholeX + screenDistance;
    const objectHeight = 60;

    // Object top and bottom Y positions
    const objectTop = centerY - objectHeight / 2;
    const objectBottom = centerY + objectHeight / 2;

    // Image is inverted - top of object goes to bottom of screen
    const imageTop = centerY + imageHeight / 2;
    const imageBottom = centerY - imageHeight / 2;

    return (
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <filter id="blur">
              <feGaussianBlur stdDeviation={blurAmount / 5} />
            </filter>
            <linearGradient id="candleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <radialGradient id="flameGlow">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background box (camera) */}
          <rect
            x={pinholeX - 10}
            y={20}
            width={screenDistance + 30}
            height={simHeight - 40}
            fill="#1a1a2e"
            stroke={colors.border}
            strokeWidth={2}
            rx={4}
          />
          <text x={pinholeX + screenDistance / 2} y={38} fill={colors.textSecondary}
                fontSize={10} textAnchor="middle">
            Dark Box (Camera)
          </text>

          {/* Screen/back wall */}
          <rect
            x={screenX - 5}
            y={30}
            width={10}
            height={simHeight - 60}
            fill="#2d3748"
            stroke={colors.secondary}
            strokeWidth={2}
          />
          <text x={screenX} y={simHeight - 15} fill={colors.textSecondary}
                fontSize={10} textAnchor="middle">
            Screen
          </text>

          {/* Pinhole wall */}
          <rect
            x={pinholeX - 5}
            y={30}
            width={10}
            height={centerY - 30 - pinholeSize / 2}
            fill="#4a5568"
          />
          <rect
            x={pinholeX - 5}
            y={centerY + pinholeSize / 2}
            width={10}
            height={centerY - 30 - pinholeSize / 2}
            fill="#4a5568"
          />

          {/* Pinhole opening */}
          <circle
            cx={pinholeX}
            cy={centerY}
            r={pinholeSize / 2 + 2}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
          />
          <text x={pinholeX} y={simHeight - 25} fill={colors.primary}
                fontSize={10} textAnchor="middle">
            Pinhole ({pinholeSize}px)
          </text>

          {/* Object (candle/arrow/tree) */}
          {objectType === 'candle' && (
            <g>
              {/* Candle body */}
              <rect
                x={objectX - 8}
                y={objectBottom - 40}
                width={16}
                height={40}
                fill="url(#candleGrad)"
                rx={2}
              />
              {/* Flame */}
              <ellipse
                cx={objectX}
                cy={objectTop + 10}
                rx={8}
                ry={15}
                fill="url(#flameGlow)"
              >
                <animate attributeName="ry" values="15;17;15" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
              {/* Flame tip */}
              <ellipse
                cx={objectX}
                cy={objectTop}
                rx={4}
                ry={8}
                fill="#fef3c7"
              />
            </g>
          )}
          {objectType === 'arrow' && (
            <g>
              <line
                x1={objectX}
                y1={objectBottom}
                x2={objectX}
                y2={objectTop + 10}
                stroke={colors.success}
                strokeWidth={4}
              />
              <polygon
                points={`${objectX},${objectTop} ${objectX - 10},${objectTop + 15} ${objectX + 10},${objectTop + 15}`}
                fill={colors.success}
              />
            </g>
          )}
          {objectType === 'tree' && (
            <g>
              <rect
                x={objectX - 5}
                y={objectBottom - 15}
                width={10}
                height={15}
                fill="#8b5a2b"
              />
              <polygon
                points={`${objectX},${objectTop} ${objectX - 20},${objectBottom - 15} ${objectX + 20},${objectBottom - 15}`}
                fill={colors.success}
              />
            </g>
          )}

          {/* Light rays through pinhole */}
          {showRays && (
            <g>
              {/* Top of object to bottom of image */}
              <line
                x1={objectX}
                y1={objectTop}
                x2={screenX - 5}
                y2={imageTop}
                stroke="#ffd700"
                strokeWidth={2}
                opacity={0.7}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="300;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>

              {/* Bottom of object to top of image */}
              <line
                x1={objectX}
                y1={objectBottom}
                x2={screenX - 5}
                y2={imageBottom}
                stroke="#ffd700"
                strokeWidth={2}
                opacity={0.7}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="300;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>

              {/* Middle ray */}
              <line
                x1={objectX}
                y1={centerY}
                x2={screenX - 5}
                y2={centerY}
                stroke="#ffd700"
                strokeWidth={2}
                opacity={0.5}
              />

              {/* Animated light pulses */}
              {[0, 1, 2].map(i => {
                const t = (animationTime * 0.3 + i * 0.33) % 1;
                // Top ray pulse
                const topX = objectX + (screenX - 5 - objectX) * t;
                const topY = objectTop + (imageTop - objectTop) * t;
                // Bottom ray pulse
                const bottomX = objectX + (screenX - 5 - objectX) * t;
                const bottomY = objectBottom + (imageBottom - objectBottom) * t;

                return (
                  <g key={i}>
                    {t > 0.1 && (
                      <>
                        <circle cx={topX} cy={topY} r={3} fill="#ffd700" opacity={1 - t} />
                        <circle cx={bottomX} cy={bottomY} r={3} fill="#ffd700" opacity={1 - t} />
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Projected image (inverted, with blur based on pinhole size) */}
          <g filter={blurAmount > 2 ? "url(#blur)" : undefined} opacity={brightness}>
            {objectType === 'candle' && (
              <g transform={`translate(${screenX - 5}, ${centerY}) scale(${magnification}, ${-magnification})`}>
                {/* Inverted candle */}
                <rect
                  x={-8}
                  y={-20}
                  width={16}
                  height={40}
                  fill={colors.accent}
                  opacity={0.8}
                />
                <ellipse
                  cx={0}
                  cy={-30}
                  rx={8}
                  ry={12}
                  fill={colors.warning}
                  opacity={0.9}
                />
              </g>
            )}
            {objectType === 'arrow' && (
              <g>
                <line
                  x1={screenX - 5}
                  y1={imageBottom}
                  x2={screenX - 5}
                  y2={imageTop - 10}
                  stroke={colors.accent}
                  strokeWidth={3}
                />
                <polygon
                  points={`${screenX - 5},${imageTop} ${screenX - 15},${imageTop - 12} ${screenX + 5},${imageTop - 12}`}
                  fill={colors.accent}
                />
              </g>
            )}
            {objectType === 'tree' && (
              <g>
                <rect
                  x={screenX - 10}
                  y={imageBottom}
                  width={8 * magnification}
                  height={12 * magnification}
                  fill="#8b5a2b"
                  opacity={0.8}
                />
                <polygon
                  points={`${screenX - 5},${imageTop} ${screenX - 5 - 15 * magnification},${imageBottom} ${screenX - 5 + 15 * magnification},${imageBottom}`}
                  fill={colors.accent}
                  opacity={0.8}
                />
              </g>
            )}
          </g>

          {/* Labels */}
          <text x={objectX} y={objectBottom + 20} fill={colors.textSecondary}
                fontSize={10} textAnchor="middle">
            Object
          </text>

          {/* Inverted indicator */}
          <text x={screenX - 5} y={imageTop + 25} fill={colors.accent}
                fontSize={10} textAnchor="middle">
            Inverted!
          </text>
        </svg>

        {/* Info panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.warning, fontSize: typography.small.fontSize }}>
              Magnification
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>
              {magnification.toFixed(2)}x
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.success, fontSize: typography.small.fontSize }}>
              Brightness
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>
              {(brightness * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.accent, fontSize: typography.small.fontSize }}>
              Sharpness
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>
              {Math.max(0, 100 - blurAmount * 5).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
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
          Pinhole Size: {pinholeSize}px
        </label>
        <input
          type="range"
          min={2}
          max={30}
          value={pinholeSize}
          onChange={(e) => setPinholeSize(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: typography.small.fontSize,
          color: colors.textSecondary,
          marginTop: 4,
        }}>
          <span>Tiny (sharp)</span>
          <span>Large (bright)</span>
        </div>
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
          Object Distance: {objectDistance}px
        </label>
        <input
          type="range"
          min={80}
          max={200}
          value={objectDistance}
          onChange={(e) => setObjectDistance(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.secondary}`,
      }}>
        <label style={{
          color: colors.secondary,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Screen Distance: {screenDistance}px
        </label>
        <input
          type="range"
          min={50}
          max={150}
          value={screenDistance}
          onChange={(e) => setScreenDistance(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
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
        onMouseDown={() => setShowRays(!showRays)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showRays ? colors.warning : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showRays ? '💡 Rays On' : '💡 Rays Off'}
      </button>
      {(['candle', 'arrow', 'tree'] as const).map(type => (
        <button
          key={type}
          onMouseDown={() => setObjectType(type)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: objectType === type ? colors.primary : colors.cardBg,
            border: `1px solid ${objectType === type ? colors.primary : colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
          }}
        >
          {type === 'candle' ? '🕯️' : type === 'arrow' ? '↑' : '🌲'} {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
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
        📷
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        The First Camera
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        Over 2,000 years ago, people noticed something strange: a tiny hole in a dark room
        could project perfect images of the outside world. No lens, no film, no electronics -
        just a hole and physics. This "camera obscura" works exactly like your eye!
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '48px', marginBottom: spacing.sm }}>🕯️ → ⚫ → 🙃</div>
        <p style={{ color: colors.text, margin: 0 }}>
          One tiny hole creates inverted images!
        </p>
      </div>
      {renderButton('Discover the Mystery', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '🔮 The Trade-Off' : '🤔 Make Your Prediction'}
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
              {selectedPrediction === pred.correct ? '✓ Excellent intuition!' : '✗ Let\'s see why!'}
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
        {isTwist ? '📸 Aperture Lab' : '🕳️ Camera Obscura Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'Explore the trade-off: bigger pinhole = brighter but blurrier!'
          : 'Watch how light creates an inverted image through a tiny hole.'}
      </p>

      {renderCameraObscuraSimulation()}
      {renderControls()}
      {renderQuickButtons()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>📷 This Is How Cameras Work!</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            The "f-stop" on a camera controls exactly this trade-off. f/2 = large hole = bright but shallow focus.
            f/16 = small hole = dim but everything sharp. Portrait photographers use large apertures to blur backgrounds,
            while landscape photographers use small apertures for crisp details everywhere!
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
        {isTwist ? '🎯 The Aperture Trade-Off' : '📚 Pinhole Physics'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Why Size Matters</h3>

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
                <h4 style={{ color: colors.success, marginBottom: spacing.sm }}>🔬 Small Aperture</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Less light (dimmer)</li>
                  <li>Each point maps to one spot</li>
                  <li>Sharp image</li>
                  <li>Large depth of field</li>
                  <li>Camera: f/16, f/22</li>
                </ul>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.warning, marginBottom: spacing.sm }}>😵 Large Aperture</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>More light (brighter)</li>
                  <li>Points spread over area</li>
                  <li>Blurry image</li>
                  <li>Shallow depth of field</li>
                  <li>Camera: f/1.4, f/2</li>
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
                Brightness ∝ (aperture)²  |  Sharpness ∝ 1/(aperture)
              </code>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>How the Image Forms</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '24px', color: colors.primary, marginBottom: spacing.sm }}>
                Light travels in straight lines
              </div>
              <p style={{ color: colors.textSecondary, margin: 0 }}>
                Top rays go to bottom. Bottom rays go to top. = Inverted image!
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.md,
            }}>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>📏</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Similar Triangles</div>
                <code style={{ color: colors.secondary, fontSize: typography.small.fontSize }}>
                  Image/Object = Screen dist/Object dist
                </code>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>🔄</div>
                <div style={{ color: colors.text, fontWeight: '600' }}>Always Inverted</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Cross-over through pinhole flips the image
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
          🌍 Pinhole Cameras Everywhere
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
              Key Concept:
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
          {passed ? 'Pinhole Master!' : 'Keep Learning!'}
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
            <li>Light travels in straight lines → inverted images</li>
            <li>Smaller pinhole = sharper but dimmer</li>
            <li>Larger pinhole = brighter but blurrier</li>
            <li>Your eye works exactly like a camera obscura</li>
            <li>f-stops control the aperture trade-off</li>
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
            📷 Camera Obscura
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

export default CameraObscuraRenderer;
