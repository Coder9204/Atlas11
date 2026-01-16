'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// LENS FOCUSING RENDERER - FOCAL LENGTH AND IMAGE FORMATION
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface LensFocusingRendererProps {
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
    question: "You hold a magnifying glass between a candle and a wall. As you move the lens closer to or farther from the candle, at what point will you see the sharpest image on the wall?",
    options: [
      { id: 'a', text: 'When the lens is exactly halfway between candle and wall', icon: '↔️' },
      { id: 'b', text: 'When the lens is at a specific distance that depends on its focal length', icon: '🎯' },
      { id: 'c', text: 'Any distance works equally well', icon: '🤷' },
      { id: 'd', text: 'The closer to the candle, the sharper the image', icon: '🔍' },
    ],
    correct: 'b',
    explanation: "The thin lens equation (1/f = 1/d_object + 1/d_image) determines exactly where the focused image forms! Each lens has a fixed focal length that determines where objects at different distances form sharp images. This is why cameras need to 'focus' - they're adjusting to satisfy this equation."
  },
  twist: {
    question: "What happens when you place an object CLOSER to a convex lens than its focal length?",
    options: [
      { id: 'a', text: 'No image forms at all', icon: '❌' },
      { id: 'b', text: 'A smaller, inverted image forms', icon: '🔽' },
      { id: 'c', text: 'A larger, upright virtual image forms (magnification!)', icon: '🔍' },
      { id: 'd', text: 'The image catches fire', icon: '🔥' },
    ],
    correct: 'c',
    explanation: "When the object is inside the focal length, the lens can't form a real image - instead it creates a virtual, magnified, upright image on the same side as the object. This is exactly how magnifying glasses and reading glasses work! The math gives a negative image distance, indicating a virtual image."
  }
};

const realWorldApplications = [
  {
    id: 'glasses',
    title: '👓 Eyeglasses',
    subtitle: 'Correcting vision with focal lengths',
    description: 'Nearsighted eyes focus images in front of the retina; farsighted eyes focus behind. Glasses add or subtract focusing power (measured in diopters = 1/focal length in meters) to shift the image onto the retina.',
    formula: 'Power (diopters) = 1/f(meters), -2D glasses → f = -0.5m (diverging)',
    realExample: 'A -3D prescription means a diverging lens with f = -33cm to correct nearsightedness.',
    interactiveHint: 'Look at someone\'s glasses - if they look smaller, they\'re nearsighted (diverging lens)!'
  },
  {
    id: 'camera',
    title: '📷 Camera Lenses',
    subtitle: 'Focal length controls perspective',
    description: 'Camera focal length determines field of view and magnification. 50mm is "normal" (similar to human vision). 24mm is wide-angle (captures more, stretches edges). 200mm is telephoto (magnifies, compresses depth).',
    formula: 'Magnification = f / (f - d_object) for distant objects',
    realExample: 'A 200mm lens makes the moon look 4x bigger than a 50mm lens - same moon, different perspective!',
    interactiveHint: 'Compare phone camera vs zoom lens photos of the same scene - notice how depth changes.'
  },
  {
    id: 'microscope',
    title: '🔬 Microscopes',
    subtitle: 'Two lenses for extreme magnification',
    description: 'Microscopes use two converging lenses: objective (short f, creates real magnified image) and eyepiece (acts as magnifier for that image). Total magnification = M_objective × M_eyepiece. Short focal lengths give higher power.',
    formula: 'M_total = (tube length / f_objective) × (25cm / f_eyepiece)',
    realExample: 'A 100x oil immersion objective has f ≈ 1.6mm - nearly touching the sample!',
    interactiveHint: 'In microscopy, shorter focal length = higher magnification = smaller working distance.'
  },
  {
    id: 'projector',
    title: '🎥 Projectors',
    subtitle: 'Making big images from small screens',
    description: 'Projectors use a lens to create a magnified real image on a distant screen. The small display (LCD/DLP chip) is placed just outside the focal length. Moving the lens closer to the chip increases image size on the screen.',
    formula: '1/f = 1/d_chip + 1/d_screen, Magnification = d_screen/d_chip',
    realExample: 'Movie theater projectors can magnify a 1-inch chip to a 50-foot screen - that\'s 600x magnification!',
    interactiveHint: 'Why projectors need dark rooms: the same light spread over a huge area = dim image.'
  }
];

const quizQuestions = [
  {
    question: "What is the thin lens equation?",
    options: [
      "f = d_object × d_image",
      "1/f = 1/d_object + 1/d_image",
      "f = d_object + d_image",
      "1/f = 1/d_object - 1/d_image"
    ],
    correct: 1,
    explanation: "The thin lens equation 1/f = 1/d_o + 1/d_i relates focal length to object and image distances. It works for both converging and diverging lenses when using proper sign conventions."
  },
  {
    question: "A convex (converging) lens has what kind of focal length?",
    options: [
      "Negative",
      "Zero",
      "Positive",
      "Undefined"
    ],
    correct: 2,
    explanation: "Converging (convex) lenses have positive focal lengths. They focus parallel rays to a real focal point. Diverging (concave) lenses have negative focal lengths."
  },
  {
    question: "When does a convex lens create a magnified, upright, virtual image?",
    options: [
      "When the object is beyond 2f",
      "When the object is between f and 2f",
      "When the object is at exactly f",
      "When the object is inside the focal length (d < f)"
    ],
    correct: 3,
    explanation: "When an object is inside the focal length of a convex lens, the lens can't form a real image. Instead, it creates a virtual, magnified, upright image - this is the magnifying glass effect!"
  },
  {
    question: "What happens when an object is placed at exactly the focal point of a convex lens?",
    options: [
      "A tiny image forms at f",
      "Light rays emerge parallel (image at infinity)",
      "The image and object are the same size",
      "No light passes through"
    ],
    correct: 1,
    explanation: "When an object is at the focal point, rays emerge parallel (d_image → ∞). The lens equation gives 1/∞ = 1/f - 1/f = 0. This is how flashlights work - putting a bulb at f creates a parallel beam!"
  },
  {
    question: "A lens with f = 50mm compared to f = 200mm will:",
    options: [
      "Have a wider field of view and less magnification",
      "Have a narrower field of view and more magnification",
      "Be the same - focal length doesn't affect view",
      "Always create smaller images"
    ],
    correct: 0,
    explanation: "Shorter focal length = wider field of view, less magnification. Longer focal length = narrower field (telephoto), more magnification. That's why phone cameras (short f) capture wide scenes while zoom lenses (long f) magnify distant subjects."
  },
  {
    question: "What unit measures optical power of lenses?",
    options: [
      "Lumens",
      "Watts",
      "Diopters (1/meters)",
      "Hertz"
    ],
    correct: 2,
    explanation: "Diopters = 1/focal length in meters. A +2D lens has f = 0.5m and converges light. A -3D lens has f = -0.33m and diverges light. This is how eyeglass prescriptions work!"
  },
  {
    question: "If magnification is negative, what does this indicate about the image?",
    options: [
      "The image doesn't exist",
      "The image is inverted (upside down)",
      "The image is smaller",
      "The lens is broken"
    ],
    correct: 1,
    explanation: "Negative magnification means the image is inverted relative to the object. Real images formed by converging lenses have negative magnification (inverted). Virtual images have positive magnification (upright)."
  },
  {
    question: "Why do microscope objectives have very short focal lengths?",
    options: [
      "To save money on glass",
      "Shorter f = higher magnification (M ∝ 1/f)",
      "Longer f would be too heavy",
      "It's just tradition"
    ],
    correct: 1,
    explanation: "Magnification is inversely proportional to focal length. A 1mm focal length objective can achieve 250x magnification, while a 10mm objective gives only 25x. That's why high-power objectives are tiny and must be very close to samples."
  },
  {
    question: "How do reading glasses (for farsightedness) work?",
    options: [
      "They block UV light",
      "They use converging lenses to add focusing power",
      "They use diverging lenses to spread light",
      "They make everything darker to reduce strain"
    ],
    correct: 1,
    explanation: "Farsighted eyes can't focus on close objects (lens too weak). Reading glasses use converging lenses (positive diopters) to add extra focusing power, helping form the image on the retina."
  },
  {
    question: "In the lens equation, what does a negative image distance (d_i) indicate?",
    options: [
      "Calculation error",
      "The image is on the same side as the object (virtual image)",
      "The image is very far away",
      "The lens is concave"
    ],
    correct: 1,
    explanation: "A negative image distance means the image forms on the same side of the lens as the object - this is a virtual image. You can't project it on a screen; you see it by looking through the lens (like a magnifying glass)."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LensFocusingRenderer: React.FC<LensFocusingRendererProps> = ({
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
  const [focalLength, setFocalLength] = useState(80);
  const [objectDistance, setObjectDistance] = useState(160);
  const [showRays, setShowRays] = useState(true);
  const [showFocalPoints, setShowFocalPoints] = useState(true);
  const [lensType, setLensType] = useState<'converging' | 'diverging'>('converging');
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

  // Calculate image properties using thin lens equation
  const calculateImage = useCallback(() => {
    const f = lensType === 'converging' ? focalLength : -focalLength;
    const d_o = objectDistance;

    // 1/f = 1/d_o + 1/d_i  →  d_i = (f × d_o) / (d_o - f)
    const d_i = (f * d_o) / (d_o - f);

    // Magnification M = -d_i / d_o
    const M = -d_i / d_o;

    const isReal = d_i > 0;
    const isUpright = M > 0;

    return {
      imageDistance: d_i,
      magnification: M,
      isReal,
      isUpright,
      imageHeight: Math.abs(M) * 40 // Object height is 40
    };
  }, [focalLength, objectDistance, lensType]);

  const imageData = calculateImage();

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setFocalLength(80);
      setObjectDistance(160);
      setLensType('converging');
    } else if (newPhase === 'twist_play') {
      setFocalLength(80);
      setObjectDistance(50); // Inside focal length for magnifying effect
      setLensType('converging');
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
  // LENS VISUALIZATION
  // ============================================================================

  const renderLensSimulation = () => {
    const simWidth = isMobile ? width - 40 : 580;
    const simHeight = 340;
    const centerX = simWidth / 2;
    const centerY = simHeight / 2;

    // Scale factor to fit simulation
    const scale = 1.5;
    const objectX = centerX - objectDistance * scale / 2;
    const objectHeight = 40;
    const lensX = centerX;

    // Effective focal length for display
    const f = lensType === 'converging' ? focalLength : -focalLength;
    const focalX_left = lensX - Math.abs(focalLength) * scale / 2;
    const focalX_right = lensX + Math.abs(focalLength) * scale / 2;

    // Image position
    const imageX = lensX + imageData.imageDistance * scale / 2;
    const imageY = centerY;

    // For virtual images, extend rays backward
    const isVirtual = !imageData.isReal;

    return (
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="20%" stopColor={colors.primary} stopOpacity="0.3" />
              <stop offset="50%" stopColor={colors.primary} stopOpacity="0.5" />
              <stop offset="80%" stopColor={colors.primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Optical axis */}
          <line
            x1={20}
            y1={centerY}
            x2={simWidth - 20}
            y2={centerY}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="5,5"
          />

          {/* Focal points */}
          {showFocalPoints && (
            <>
              {/* Left focal point (F) */}
              <circle cx={focalX_left} cy={centerY} r={5} fill={colors.warning} />
              <text x={focalX_left} y={centerY + 20} fill={colors.warning}
                    fontSize={11} textAnchor="middle">F</text>

              {/* Right focal point (F') */}
              <circle cx={focalX_right} cy={centerY} r={5} fill={colors.warning} />
              <text x={focalX_right} y={centerY + 20} fill={colors.warning}
                    fontSize={11} textAnchor="middle">F'</text>

              {/* 2F points */}
              <circle cx={focalX_left - Math.abs(focalLength) * scale / 2} cy={centerY}
                      r={3} fill={colors.secondary} opacity={0.5} />
              <text x={focalX_left - Math.abs(focalLength) * scale / 2} y={centerY + 20}
                    fill={colors.secondary} fontSize={9} textAnchor="middle" opacity={0.5}>2F</text>

              <circle cx={focalX_right + Math.abs(focalLength) * scale / 2} cy={centerY}
                      r={3} fill={colors.secondary} opacity={0.5} />
              <text x={focalX_right + Math.abs(focalLength) * scale / 2} y={centerY + 20}
                    fill={colors.secondary} fontSize={9} textAnchor="middle" opacity={0.5}>2F'</text>
            </>
          )}

          {/* Lens */}
          {lensType === 'converging' ? (
            // Convex lens shape
            <ellipse
              cx={lensX}
              cy={centerY}
              rx={15}
              ry={100}
              fill="url(#lensGrad)"
              stroke={colors.primary}
              strokeWidth={2}
            />
          ) : (
            // Concave lens shape (narrower in middle)
            <path
              d={`M ${lensX - 8} ${centerY - 100}
                  Q ${lensX + 15} ${centerY} ${lensX - 8} ${centerY + 100}
                  L ${lensX + 8} ${centerY + 100}
                  Q ${lensX - 15} ${centerY} ${lensX + 8} ${centerY - 100}
                  Z`}
              fill="url(#lensGrad)"
              stroke={colors.primary}
              strokeWidth={2}
            />
          )}
          <text x={lensX} y={30} fill={colors.primary} fontSize={11} textAnchor="middle">
            {lensType === 'converging' ? 'Convex Lens' : 'Concave Lens'}
          </text>

          {/* Object (arrow) */}
          <line
            x1={objectX}
            y1={centerY}
            x2={objectX}
            y2={centerY - objectHeight}
            stroke={colors.success}
            strokeWidth={3}
          />
          <polygon
            points={`${objectX},${centerY - objectHeight - 10} ${objectX - 8},${centerY - objectHeight + 5} ${objectX + 8},${centerY - objectHeight + 5}`}
            fill={colors.success}
          />
          <text x={objectX} y={centerY + 20} fill={colors.success} fontSize={11} textAnchor="middle">
            Object
          </text>

          {/* Principal rays */}
          {showRays && (
            <g>
              {/* Ray 1: Parallel to axis, through F' */}
              <line
                x1={objectX}
                y1={centerY - objectHeight}
                x2={lensX}
                y2={centerY - objectHeight}
                stroke="#ffd700"
                strokeWidth={2}
                opacity={0.8}
              />
              {lensType === 'converging' && imageData.isReal && (
                <line
                  x1={lensX}
                  y1={centerY - objectHeight}
                  x2={Math.min(simWidth - 20, imageX)}
                  y2={centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1)}
                  stroke="#ffd700"
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}
              {(lensType === 'diverging' || !imageData.isReal) && (
                <>
                  {/* Diverging ray or virtual image backward extension */}
                  <line
                    x1={lensX}
                    y1={centerY - objectHeight}
                    x2={simWidth - 20}
                    y2={centerY - objectHeight + (simWidth - 20 - lensX) * (objectHeight / Math.abs(focalLength))}
                    stroke="#ffd700"
                    strokeWidth={2}
                    opacity={0.8}
                  />
                  {/* Dashed backward extension for virtual image */}
                  <line
                    x1={lensX}
                    y1={centerY - objectHeight}
                    x2={Math.max(20, imageX)}
                    y2={centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1)}
                    stroke="#ffd700"
                    strokeWidth={1.5}
                    strokeDasharray="5,5"
                    opacity={0.5}
                  />
                </>
              )}

              {/* Ray 2: Through center of lens (undeviated) */}
              <line
                x1={objectX}
                y1={centerY - objectHeight}
                x2={lensX}
                y2={centerY}
                stroke={colors.accent}
                strokeWidth={2}
                opacity={0.8}
              />
              <line
                x1={lensX}
                y1={centerY}
                x2={imageData.isReal ? Math.min(simWidth - 20, imageX) : simWidth - 20}
                y2={imageData.isReal
                  ? centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1)
                  : centerY + (simWidth - 20 - lensX) * objectHeight / objectDistance}
                stroke={colors.accent}
                strokeWidth={2}
                opacity={0.8}
              />
              {isVirtual && (
                <line
                  x1={lensX}
                  y1={centerY}
                  x2={Math.max(20, imageX)}
                  y2={centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1)}
                  stroke={colors.accent}
                  strokeWidth={1.5}
                  strokeDasharray="5,5"
                  opacity={0.5}
                />
              )}

              {/* Ray 3: Through F, emerges parallel */}
              {lensType === 'converging' && (
                <>
                  <line
                    x1={objectX}
                    y1={centerY - objectHeight}
                    x2={lensX}
                    y2={centerY - objectHeight * (objectDistance - focalLength) / objectDistance}
                    stroke={colors.secondary}
                    strokeWidth={2}
                    opacity={0.8}
                  />
                  <line
                    x1={lensX}
                    y1={centerY - objectHeight * (objectDistance - focalLength) / objectDistance}
                    x2={simWidth - 20}
                    y2={centerY - objectHeight * (objectDistance - focalLength) / objectDistance}
                    stroke={colors.secondary}
                    strokeWidth={2}
                    opacity={0.8}
                  />
                </>
              )}
            </g>
          )}

          {/* Image (if it fits in view) */}
          {imageData.imageDistance > -200 && imageData.imageDistance < 400 && (
            <g opacity={isVirtual ? 0.6 : 1}>
              <line
                x1={Math.max(20, Math.min(simWidth - 20, imageX))}
                y1={centerY}
                x2={Math.max(20, Math.min(simWidth - 20, imageX))}
                y2={centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1)}
                stroke={colors.accent}
                strokeWidth={3}
                strokeDasharray={isVirtual ? "5,5" : "none"}
              />
              <polygon
                points={`${Math.max(20, Math.min(simWidth - 20, imageX))},${centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1) + (imageData.isUpright ? -10 : 10)} ${Math.max(20, Math.min(simWidth - 20, imageX)) - 8},${centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1) + (imageData.isUpright ? 5 : -5)} ${Math.max(20, Math.min(simWidth - 20, imageX)) + 8},${centerY + imageData.imageHeight * (imageData.isUpright ? -1 : 1) + (imageData.isUpright ? 5 : -5)}`}
                fill={colors.accent}
                opacity={isVirtual ? 0.6 : 1}
              />
              <text
                x={Math.max(35, Math.min(simWidth - 35, imageX))}
                y={centerY + 25}
                fill={colors.accent}
                fontSize={10}
                textAnchor="middle"
              >
                {isVirtual ? 'Virtual Image' : 'Real Image'}
              </text>
            </g>
          )}

          {/* Animated light pulses */}
          {showRays && [0, 1, 2].map(i => {
            const t = (animationTime * 0.4 + i * 0.33) % 1;
            const x = objectX + (lensX - objectX) * t;
            const y = (centerY - objectHeight);
            if (t > 0.95) return null;
            return (
              <circle
                key={`pulse-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill="#ffd700"
                opacity={1 - t}
              />
            );
          })}
        </svg>

        {/* Image properties display */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: spacing.sm,
          marginTop: spacing.lg,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.sm,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.warning, fontSize: typography.small.fontSize }}>
              Focal Length
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text }}>
              {focalLength}px
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.sm,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.success, fontSize: typography.small.fontSize }}>
              Image Dist
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text }}>
              {imageData.imageDistance.toFixed(0)}px
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.sm,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.accent, fontSize: typography.small.fontSize }}>
              Magnification
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text }}>
              {imageData.magnification.toFixed(2)}x
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.sm,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.secondary, fontSize: typography.small.fontSize }}>
              Image Type
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
              {imageData.isReal ? 'Real' : 'Virtual'}, {imageData.isUpright ? 'Upright' : 'Inverted'}
            </div>
          </div>
        </div>
      </div>
    );
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
        border: `1px solid ${colors.warning}`,
      }}>
        <label style={{
          color: colors.warning,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Focal Length (f): {focalLength}px
        </label>
        <input
          type="range"
          min={40}
          max={150}
          value={focalLength}
          onChange={(e) => setFocalLength(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.success}`,
      }}>
        <label style={{
          color: colors.success,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Object Distance: {objectDistance}px
          {objectDistance < focalLength && lensType === 'converging' &&
            <span style={{ color: colors.accent, marginLeft: 8 }}>← Inside f!</span>
          }
        </label>
        <input
          type="range"
          min={30}
          max={250}
          value={objectDistance}
          onChange={(e) => setObjectDistance(Number(e.target.value))}
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
        onMouseDown={() => setObjectDistance(focalLength * 2.5)}
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
        d > 2f (small image)
      </button>
      <button
        onMouseDown={() => setObjectDistance(focalLength * 1.5)}
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
        f < d < 2f (large image)
      </button>
      <button
        onMouseDown={() => setObjectDistance(focalLength * 0.6)}
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
        d < f (magnifier!)
      </button>
      <button
        onMouseDown={() => setShowRays(!showRays)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showRays ? colors.primary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showRays ? '💡 Rays On' : '💡 Rays Off'}
      </button>
      <button
        onMouseDown={() => setLensType(lensType === 'converging' ? 'diverging' : 'converging')}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: lensType === 'diverging' ? colors.secondary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {lensType === 'converging' ? '🔍 Convex' : '🔎 Concave'}
      </button>
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
        🔍
      </div>
      <h1 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        The Magic of Lenses
      </h1>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, maxWidth: 500, margin: '0 auto' }}>
        A simple curved piece of glass can focus the sun to start fires, help you read tiny text,
        or capture stunning photographs. All of this magic comes from one elegant equation
        that governs where images form.
      </p>
      <div style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        maxWidth: 400,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '28px', fontFamily: 'monospace', marginBottom: spacing.sm }}>
          1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>
        </div>
        <p style={{ color: colors.text, margin: 0 }}>
          The thin lens equation - key to all optics!
        </p>
      </div>
      {renderButton('Discover Lens Physics', () => goToPhase('predict'))}
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '🔮 The Magnifying Effect' : '🤔 Make Your Prediction'}
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
              {selectedPrediction === pred.correct ? '✓ Perfect!' : '✗ Let\'s see why!'}
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
        {isTwist ? '🔍 Magnifying Glass Lab' : '🔬 Lens Optics Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'Move the object inside the focal length and watch the magic!'
          : 'Explore how object distance affects where the image forms.'}
      </p>

      {renderLensSimulation()}
      {renderControls()}
      {renderQuickButtons()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>🔍 Magnifying Glass Physics</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            When d {"<"} f, the lens equation gives a <strong>negative</strong> image distance,
            meaning the image is on the same side as the object - a virtual image! This virtual
            image is larger and upright, which is why magnifying glasses work. The closer to f,
            the larger the magnification (but harder to see clearly).
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
        {isTwist ? '🎯 Real vs Virtual Images' : '📚 The Thin Lens Equation'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Image Types</h3>

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
                <h4 style={{ color: colors.success, marginBottom: spacing.sm }}>Real Image (d > f)</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Forms on opposite side of lens</li>
                  <li>Can be projected on screen</li>
                  <li>Inverted (upside down)</li>
                  <li>Positive d_i in equation</li>
                  <li>Example: Camera, projector</li>
                </ul>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.accent, marginBottom: spacing.sm }}>Virtual Image (d {"<"} f)</h4>
                <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li>Forms on same side as object</li>
                  <li>Cannot be projected</li>
                  <li>Upright and magnified</li>
                  <li>Negative d_i in equation</li>
                  <li>Example: Magnifying glass</li>
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
                M = -d_i/d_o  →  M {">"} 0 (upright), M {"<"} 0 (inverted)
              </code>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>The Mathematics</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '28px', color: colors.primary, fontFamily: 'monospace' }}>
                1/f = 1/d_o + 1/d_i
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                f = focal length, d_o = object distance, d_i = image distance
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
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>d_o {">"} 2f</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Smaller, inverted<br/>real image
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>f {"<"} d_o {"<"} 2f</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Larger, inverted<br/>real image
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>d_o {"<"} f</div>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
                  Larger, upright<br/>virtual image
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
          🌍 Lenses in the Real World
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
          {passed ? 'Lens Master!' : 'Keep Learning!'}
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
            <li>Thin lens equation: 1/f = 1/d_o + 1/d_i</li>
            <li>Converging lenses have positive focal length</li>
            <li>Object inside f → virtual, magnified, upright</li>
            <li>Negative d_i indicates virtual image</li>
            <li>Magnification M = -d_i/d_o</li>
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
            🔍 Lens Focusing
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

export default LensFocusingRenderer;
