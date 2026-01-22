'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// REFRACTION RENDERER - THE BROKEN STRAW ILLUSION
// =============================================================================
// Premium educational game teaching light refraction through interactive
// visualization. Students explore why objects appear bent in water and learn
// Snell's Law through hands-on experimentation.
// =============================================================================

// Premium Design System
const defined = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
    },
    water: {
      surface: 'rgba(56, 189, 248, 0.3)',
      deep: 'rgba(14, 165, 233, 0.5)',
      light: 'rgba(125, 211, 252, 0.2)',
    },
    glass: {
      surface: 'rgba(148, 163, 184, 0.15)',
      edge: 'rgba(148, 163, 184, 0.3)',
    },
    straw: {
      red: '#EF4444',
      white: '#F1F5F9',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
};

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================
const REFRACTIVE_INDICES = {
  air: 1.0,
  water: 1.333,
  glass: 1.52,
  oil: 1.47,
  diamond: 2.42,
  ice: 1.31,
};

const MEDIA_COLORS: Record<string, { surface: string; deep: string; name: string }> = {
  water: { surface: 'rgba(56, 189, 248, 0.3)', deep: 'rgba(14, 165, 233, 0.5)', name: 'Water' },
  oil: { surface: 'rgba(251, 191, 36, 0.3)', deep: 'rgba(245, 158, 11, 0.4)', name: 'Vegetable Oil' },
  glass: { surface: 'rgba(148, 163, 184, 0.2)', deep: 'rgba(100, 116, 139, 0.3)', name: 'Liquid Glass' },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Application {
  id: number;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

// =============================================================================
// QUESTIONS DATA
// =============================================================================
const questions: Question[] = [
  {
    id: 1,
    question: 'Why does a straw appear bent when placed in water?',
    options: [
      'The water magnifies the straw',
      'Light bends when passing between air and water',
      'Water physically pushes the straw',
      'Your eyes are tricked by the glass',
    ],
    correctIndex: 1,
    explanation:
      'Light travels at different speeds in air and water. When light crosses the boundary, it changes direction (refracts), making the submerged part appear shifted.',
  },
  {
    id: 2,
    question: 'What is the refractive index of water approximately?',
    options: ['1.0', '1.33', '2.0', '0.75'],
    correctIndex: 1,
    explanation:
      "Water has a refractive index of about 1.33, meaning light travels 1.33 times slower in water than in vacuum. Air is very close to 1.0.",
  },
  {
    id: 3,
    question: 'If light enters water at an angle, which way does it bend?',
    options: [
      'Away from the normal (perpendicular line)',
      'Toward the normal',
      'It continues straight',
      'It bends randomly',
    ],
    correctIndex: 1,
    explanation:
      'When light enters a denser medium (higher refractive index), it slows down and bends toward the normal. Going from water to air, it bends away.',
  },
  {
    id: 4,
    question: 'A pool looks shallower than it really is. Why?',
    options: [
      'Water compresses light waves',
      'Your brain overestimates depth',
      'Refraction makes the bottom appear closer',
      'The pool liner has a special coating',
    ],
    correctIndex: 2,
    explanation:
      'Light from the pool bottom bends as it exits the water, reaching your eyes at an angle that makes the bottom appear closer to the surface than it actually is.',
  },
  {
    id: 5,
    question: 'Which material bends light the most?',
    options: ['Air (n=1.0)', 'Water (n=1.33)', 'Glass (n=1.5)', 'Diamond (n=2.42)'],
    correctIndex: 3,
    explanation:
      'Diamond has the highest refractive index listed (2.42), causing light to bend dramatically. This creates the brilliant sparkle diamonds are famous for.',
  },
  {
    id: 6,
    question: "What does Snell's Law describe?",
    options: [
      'How fast light travels',
      'The relationship between angles of incidence and refraction',
      'Why rainbows form',
      'The color of light',
    ],
    correctIndex: 1,
    explanation:
      "Snell's Law (n₁sinθ₁ = n₂sinθ₂) mathematically relates the angle of incoming light to the angle of refracted light based on the refractive indices of both media.",
  },
  {
    id: 7,
    question: 'Spearfishers must aim below where they see a fish. Why?',
    options: [
      'Fish swim fast and move',
      'Refraction makes the fish appear higher than it is',
      'Water magnifies the fish',
      'Spears curve in water',
    ],
    correctIndex: 1,
    explanation:
      "Light from the fish bends as it leaves the water, making the fish appear at a higher position than its actual location. Experienced spearfishers learn to compensate for this optical shift.",
  },
  {
    id: 8,
    question: 'At what angle does NO refraction occur?',
    options: ['45 degrees', '90 degrees (perpendicular)', '30 degrees', 'Refraction always occurs'],
    correctIndex: 1,
    explanation:
      'When light hits a surface perfectly perpendicular (90° to the surface, or 0° to the normal), it passes straight through without bending. Refraction only occurs at angles.',
  },
  {
    id: 9,
    question: 'Why do eyeglasses correct vision?',
    options: [
      'They filter harmful light',
      'They use refraction to focus light correctly on the retina',
      'They make things bigger',
      'They block UV rays',
    ],
    correctIndex: 1,
    explanation:
      "Prescription lenses use carefully calculated curves to refract light, compensating for the eye's focusing errors and directing light to hit the retina at the correct point.",
  },
  {
    id: 10,
    question: 'If you place a pencil in oil instead of water, what happens to the apparent bend?',
    options: [
      'More bending (oil has higher refractive index)',
      'Less bending (oil has lower refractive index)',
      'Same bending',
      'The pencil becomes invisible',
    ],
    correctIndex: 0,
    explanation:
      "Oil has a higher refractive index (≈1.47) than water (≈1.33), causing more bending of light and a more pronounced apparent shift in the pencil's position.",
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'Spearfishing Correction',
    description: 'Why hunters aim below the fish',
    icon: '🎯',
    details: [
      'Fish appear higher than actual position due to refraction',
      'Experienced spearfishers learn to aim 20-30% lower',
      'The deeper the fish, the greater the correction needed',
      "Ancient fishermen discovered this through trial and error",
    ],
  },
  {
    id: 2,
    title: 'Pool Depth Illusion',
    description: 'Why pools look shallower',
    icon: '🏊',
    details: [
      'A 6-foot pool may appear only 4.5 feet deep',
      'This is dangerous for diving - always check actual depth',
      'The illusion is stronger when looking at an angle',
      'Lifeguards are trained to account for this effect',
    ],
  },
  {
    id: 3,
    title: 'Corrective Lenses',
    description: 'How glasses fix vision',
    icon: '👓',
    details: [
      'Nearsightedness: concave lenses diverge light before it enters the eye',
      'Farsightedness: convex lenses converge light to help focus',
      'Astigmatism: cylindrical lenses correct uneven cornea curvature',
      'Modern lens design uses precise refractive index calculations',
    ],
  },
  {
    id: 4,
    title: 'Mirages & Atmospheric Refraction',
    description: 'Illusions in the sky',
    icon: '🌅',
    details: [
      'Hot air near ground has lower refractive index than cool air above',
      'Light from sky bends upward, creating "water" illusions on hot roads',
      'Inferior mirages show inverted images below the real object',
      'Fata Morgana: complex mirages that make ships appear floating',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function RefractionRenderer() {
  // State management
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive simulation state
  const [strawAngle, setStrawAngle] = useState(25); // Degrees from vertical
  const [medium, setMedium] = useState<'water' | 'oil' | 'glass'>('water');
  const [showLightRays, setShowLightRays] = useState(true);
  const [waterLevel, setWaterLevel] = useState(60); // Percentage of glass filled

  // Navigation debouncing
  const isNavigating = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // PHYSICS CALCULATIONS
  // =============================================================================
  const calculateRefraction = useCallback(
    (incidentAngle: number, n1: number, n2: number): number => {
      // Snell's Law: n1 * sin(θ1) = n2 * sin(θ2)
      const theta1Rad = (incidentAngle * Math.PI) / 180;
      const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2;

      // Check for total internal reflection
      if (Math.abs(sinTheta2) > 1) {
        return incidentAngle; // Would be TIR, return same angle
      }

      const theta2Rad = Math.asin(sinTheta2);
      return (theta2Rad * 180) / Math.PI;
    },
    []
  );

  const getApparentShift = useCallback((): number => {
    const n = REFRACTIVE_INDICES[medium];
    // Apparent depth = actual depth / n
    // Shift percentage based on refractive index
    return ((n - 1) / n) * 100;
  }, [medium]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  const handleNavigation = useCallback((nextPhase: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    setPhase(nextPhase);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      isNavigating.current = false;
    }, 400);
  }, []);

  const handleCompleteApp = useCallback(() => {
    const newCompleted = [...completedApps];
    newCompleted[selectedApp] = true;
    setCompletedApps(newCompleted);

    if (selectedApp < applications.length - 1) {
      setSelectedApp(selectedApp + 1);
    }
  }, [completedApps, selectedApp]);

  const handleAnswerSelect = useCallback(
    (index: number) => {
      if (showResult) return;
      setSelectedAnswer(index);
      setShowResult(true);

      if (index === questions[currentQuestion].correctIndex) {
        setScore((prev) => prev + 1);
      }
    },
    [showResult, currentQuestion]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      handleNavigation('mastery');
    }
  }, [currentQuestion, handleNavigation]);

  const allAppsCompleted = completedApps.every(Boolean);

  // =============================================================================
  // BUTTON COMPONENT (Helper function, not React component)
  // =============================================================================
  const Button = useCallback(
    ({
      children,
      onClick,
      variant = 'primary',
      disabled = false,
      size = 'md',
      fullWidth = false,
    }: {
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost' | 'success';
      disabled?: boolean;
      size?: 'sm' | 'md' | 'lg';
      fullWidth?: boolean;
    }) => {
      const buttonRef = useRef(false);

      const handleClick = () => {
        if (buttonRef.current || disabled) return;
        buttonRef.current = true;
        onClick();
        setTimeout(() => {
          buttonRef.current = false;
        }, 400);
      };

      const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: defined.spacing.sm,
        borderRadius: defined.radius.lg,
        fontFamily: defined.typography.fontFamily,
        fontWeight: defined.typography.weights.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...(size === 'sm' && {
          padding: `${defined.spacing.sm} ${defined.spacing.md}`,
          fontSize: defined.typography.sizes.sm,
        }),
        ...(size === 'md' && {
          padding: `${defined.spacing.md} ${defined.spacing.lg}`,
          fontSize: defined.typography.sizes.base,
        }),
        ...(size === 'lg' && {
          padding: `${defined.spacing.lg} ${defined.spacing.xl}`,
          fontSize: defined.typography.sizes.lg,
        }),
      };

      const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
          background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
        secondary: {
          background: defined.colors.background.tertiary,
          color: defined.colors.text.primary,
          border: `1px solid ${defined.colors.background.tertiary}`,
        },
        ghost: {
          background: 'transparent',
          color: defined.colors.text.secondary,
        },
        success: {
          background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
      };

      return (
        <button
          onMouseDown={handleClick}
          disabled={disabled}
          style={{ ...baseStyles, ...variantStyles[variant] }}
        >
          {children}
        </button>
      );
    },
    []
  );

  // =============================================================================
  // PROGRESS BAR COMPONENT
  // =============================================================================
  const ProgressBar = useCallback(
    ({ current, total }: { current: number; total: number }) => (
      <div
        style={{
          display: 'flex',
          gap: defined.spacing.xs,
          justifyContent: 'center',
          marginBottom: defined.spacing.lg,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: isMobile ? '20px' : '32px',
              height: '4px',
              borderRadius: defined.radius.full,
              background:
                i < current
                  ? defined.colors.primary
                  : i === current
                    ? defined.colors.accent
                    : defined.colors.background.tertiary,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    ),
    [isMobile]
  );

  // =============================================================================
  // GLASS WITH STRAW VISUALIZATION
  // =============================================================================
  const renderGlassVisualization = useCallback(() => {
    const glassWidth = isMobile ? 180 : 240;
    const glassHeight = isMobile ? 240 : 320;
    const waterHeight = (waterLevel / 100) * glassHeight * 0.85;
    const n = REFRACTIVE_INDICES[medium];
    const mediumColor = MEDIA_COLORS[medium];

    // Calculate straw positions
    const strawTopX = glassWidth / 2 + Math.sin((strawAngle * Math.PI) / 180) * (glassHeight * 0.4);
    const strawTopY = 20;
    const waterSurfaceY = glassHeight - waterHeight;

    // Where straw meets water surface (real position)
    const strawAtWaterX =
      glassWidth / 2 +
      Math.sin((strawAngle * Math.PI) / 180) * (waterSurfaceY - strawTopY) * 0.8;
    const strawAtWaterY = waterSurfaceY;

    // Calculate refracted angle (Snell's Law)
    const refractedAngle = calculateRefraction(strawAngle, REFRACTIVE_INDICES.air, n);

    // Real straw bottom position
    const strawBottomX =
      strawAtWaterX + Math.sin((refractedAngle * Math.PI) / 180) * waterHeight * 0.7;
    const strawBottomY = glassHeight - 30;

    // Apparent straw position (what you see due to refraction)
    // The apparent position is shifted toward the normal
    const apparentShiftFactor = 1 - 1 / n;
    const apparentBottomX = strawAtWaterX + (strawBottomX - strawAtWaterX) * (1 - apparentShiftFactor * 0.5);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.lg,
        }}
      >
        <svg
          width={glassWidth + 80}
          height={glassHeight + 40}
          style={{ overflow: 'visible' }}
        >
          {/* Glass container */}
          <defs>
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(148, 163, 184, 0.3)" />
              <stop offset="50%" stopColor="rgba(148, 163, 184, 0.1)" />
              <stop offset="100%" stopColor="rgba(148, 163, 184, 0.3)" />
            </linearGradient>
            <linearGradient id={`liquidGradient-${medium}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={mediumColor.surface} />
              <stop offset="100%" stopColor={mediumColor.deep} />
            </linearGradient>
            <clipPath id="glassClip">
              <rect x={40} y={20} width={glassWidth} height={glassHeight} rx="8" />
            </clipPath>
          </defs>

          {/* Glass body */}
          <rect
            x={40}
            y={20}
            width={glassWidth}
            height={glassHeight}
            rx="8"
            fill="url(#glassGradient)"
            stroke="rgba(148, 163, 184, 0.5)"
            strokeWidth="2"
          />

          {/* Liquid */}
          <rect
            x={42}
            y={waterSurfaceY + 20}
            width={glassWidth - 4}
            height={waterHeight}
            fill={`url(#liquidGradient-${medium})`}
            clipPath="url(#glassClip)"
          />

          {/* Water surface line */}
          <line
            x1={42}
            y1={waterSurfaceY + 20}
            x2={42 + glassWidth - 4}
            y2={waterSurfaceY + 20}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1"
          />

          {/* Light rays (if enabled) */}
          {showLightRays && (
            <g opacity={0.6}>
              {/* Incident ray */}
              <line
                x1={strawTopX + 40}
                y1={strawTopY + 20}
                x2={strawAtWaterX + 40}
                y2={strawAtWaterY + 20}
                stroke={defined.colors.accent}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {/* Refracted ray (real path) */}
              <line
                x1={strawAtWaterX + 40}
                y1={strawAtWaterY + 20}
                x2={strawBottomX + 40}
                y2={strawBottomY + 20}
                stroke={defined.colors.success}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {/* Normal line */}
              <line
                x1={strawAtWaterX + 40}
                y1={strawAtWaterY - 30 + 20}
                x2={strawAtWaterX + 40}
                y2={strawAtWaterY + 60 + 20}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Labels */}
              <text
                x={strawTopX + 60}
                y={strawTopY + 60}
                fill={defined.colors.accent}
                fontSize="10"
                fontFamily={defined.typography.fontFamily}
              >
                Incident
              </text>
              <text
                x={strawBottomX + 50}
                y={strawBottomY - 20}
                fill={defined.colors.success}
                fontSize="10"
                fontFamily={defined.typography.fontFamily}
              >
                Refracted
              </text>
            </g>
          )}

          {/* Straw - above water (real) */}
          <line
            x1={strawTopX + 40}
            y1={strawTopY + 20}
            x2={strawAtWaterX + 40}
            y2={strawAtWaterY + 20}
            stroke={defined.colors.straw.red}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1={strawTopX + 40}
            y1={strawTopY + 20}
            x2={strawAtWaterX + 40}
            y2={strawAtWaterY + 20}
            stroke={defined.colors.straw.white}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="12,12"
          />

          {/* Straw - below water (apparent position - what you see) */}
          <line
            x1={strawAtWaterX + 40}
            y1={strawAtWaterY + 20}
            x2={apparentBottomX + 40}
            y2={strawBottomY + 20}
            stroke={defined.colors.straw.red}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={0.8}
          />
          <line
            x1={strawAtWaterX + 40}
            y1={strawAtWaterY + 20}
            x2={apparentBottomX + 40}
            y2={strawBottomY + 20}
            stroke={defined.colors.straw.white}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="12,12"
            opacity={0.8}
          />

          {/* Ghost straw showing real position */}
          {showLightRays && (
            <g opacity={0.3}>
              <line
                x1={strawAtWaterX + 40}
                y1={strawAtWaterY + 20}
                x2={strawBottomX + 40}
                y2={strawBottomY + 20}
                stroke="#FFFFFF"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="4,8"
              />
              <text
                x={strawBottomX + 50}
                y={strawBottomY}
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
                fontFamily={defined.typography.fontFamily}
              >
                Real position
              </text>
            </g>
          )}

          {/* Angle indicators */}
          <g transform={`translate(${strawAtWaterX + 40}, ${strawAtWaterY + 20})`}>
            {/* Incident angle arc */}
            <path
              d={`M 0,-25 A 25,25 0 0,1 ${Math.sin((strawAngle * Math.PI) / 180) * 25},${-Math.cos((strawAngle * Math.PI) / 180) * 25}`}
              fill="none"
              stroke={defined.colors.accent}
              strokeWidth="2"
            />
            <text
              x={-30}
              y={-15}
              fill={defined.colors.accent}
              fontSize="11"
              fontFamily={defined.typography.fontFamily}
            >
              θ₁={strawAngle}°
            </text>
            {/* Refracted angle arc */}
            <path
              d={`M 0,25 A 25,25 0 0,0 ${Math.sin((refractedAngle * Math.PI) / 180) * 25},${Math.cos((refractedAngle * Math.PI) / 180) * 25}`}
              fill="none"
              stroke={defined.colors.success}
              strokeWidth="2"
            />
            <text
              x={30}
              y={35}
              fill={defined.colors.success}
              fontSize="11"
              fontFamily={defined.typography.fontFamily}
            >
              θ₂={refractedAngle.toFixed(1)}°
            </text>
          </g>
        </svg>

        {/* Info panel */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.md,
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.muted,
              marginBottom: defined.spacing.xs,
            }}
          >
            {mediumColor.name} • n = {n.toFixed(3)}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.text.primary,
              fontWeight: defined.typography.weights.semibold,
            }}
          >
            Apparent shift: {getApparentShift().toFixed(1)}%
          </div>
        </div>
      </div>
    );
  }, [isMobile, waterLevel, medium, strawAngle, showLightRays, calculateRefraction, getApparentShift]);

  // =============================================================================
  // CONTROLS PANEL
  // =============================================================================
  const renderControls = useCallback(() => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: defined.spacing.md,
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Straw Angle Control */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.secondary,
            marginBottom: defined.spacing.sm,
          }}
        >
          Straw Angle: {strawAngle}°
        </label>
        <input
          type="range"
          min="0"
          max="60"
          value={strawAngle}
          onChange={(e) => setStrawAngle(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: defined.colors.primary,
          }}
        />
      </div>

      {/* Water Level Control */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.secondary,
            marginBottom: defined.spacing.sm,
          }}
        >
          Liquid Level: {waterLevel}%
        </label>
        <input
          type="range"
          min="20"
          max="90"
          value={waterLevel}
          onChange={(e) => setWaterLevel(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: defined.colors.primary,
          }}
        />
      </div>

      {/* Show Light Rays Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.secondary,
          }}
        >
          Show Light Rays
        </span>
        <button
          onClick={() => setShowLightRays(!showLightRays)}
          style={{
            width: '48px',
            height: '28px',
            borderRadius: defined.radius.full,
            border: 'none',
            cursor: 'pointer',
            background: showLightRays ? defined.colors.primary : defined.colors.background.tertiary,
            position: 'relative',
            transition: 'background 0.3s ease',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: showLightRays ? '23px' : '3px',
              transition: 'left 0.3s ease',
            }}
          />
        </button>
      </div>
    </div>
  ), [strawAngle, waterLevel, showLightRays]);

  // =============================================================================
  // MEDIUM SELECTOR (for twist phase)
  // =============================================================================
  const renderMediumSelector = useCallback(() => (
    <div
      style={{
        display: 'flex',
        gap: defined.spacing.sm,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {Object.entries(MEDIA_COLORS).map(([key, value]) => (
        <button
          key={key}
          onClick={() => setMedium(key as 'water' | 'oil' | 'glass')}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.md}`,
            borderRadius: defined.radius.lg,
            border: medium === key ? `2px solid ${defined.colors.primary}` : '2px solid transparent',
            background:
              medium === key ? defined.colors.background.tertiary : defined.colors.background.secondary,
            color: defined.colors.text.primary,
            cursor: 'pointer',
            fontFamily: defined.typography.fontFamily,
            fontSize: defined.typography.sizes.sm,
            transition: 'all 0.2s ease',
          }}
        >
          {value.name}
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
            }}
          >
            n = {REFRACTIVE_INDICES[key as keyof typeof REFRACTIVE_INDICES].toFixed(2)}
          </div>
        </button>
      ))}
    </div>
  ), [medium]);

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: isMobile ? defined.typography.sizes['3xl'] : defined.typography.sizes['4xl'],
          marginBottom: defined.spacing.md,
        }}
      >
        🥤
      </div>
      <h1
        style={{
          fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        The Broken Straw Mystery
      </h1>
      <p
        style={{
          fontSize: defined.typography.sizes.lg,
          color: defined.colors.text.secondary,
          maxWidth: '500px',
          lineHeight: 1.6,
        }}
      >
        Drop a straw into a glass of water. Look from the side - it appears
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          {' '}
          snapped in half
        </span>
        ! Pull it out - perfectly straight. What optical trick is water playing on your eyes?
      </p>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          maxWidth: '400px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.muted,
            marginBottom: defined.spacing.md,
          }}
        >
          THE ILLUSION
        </div>
        {/* Simple straw illustration */}
        <svg width="200" height="150" style={{ margin: '0 auto', display: 'block' }}>
          {/* Glass */}
          <rect
            x="60"
            y="30"
            width="80"
            height="110"
            rx="4"
            fill="rgba(148, 163, 184, 0.15)"
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth="2"
          />
          {/* Water */}
          <rect x="62" y="70" width="76" height="68" fill="rgba(56, 189, 248, 0.3)" rx="2" />
          {/* Straw above water */}
          <line x1="100" y1="10" x2="115" y2="70" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
          {/* Straw below water (shifted) */}
          <line x1="115" y1="70" x2="105" y2="130" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
          {/* Break indicator */}
          <text x="130" y="75" fill={defined.colors.accent} fontSize="12">
            ← Break?
          </text>
        </svg>
      </div>

      {Button({
        children: 'Investigate This Illusion →',
        onClick: () => handleNavigation('predict'),
        size: 'lg',
      })}
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        Make Your Prediction
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Why does the straw appear bent when viewed through water?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          { id: 'magnify', text: 'Water magnifies things, stretching the straw image' },
          { id: 'bend', text: 'Light bends when passing from water to air' },
          { id: 'physical', text: 'Water pressure physically bends the straw' },
          { id: 'eyes', text: 'Your eyes cannot focus through water' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                prediction === option.id
                  ? `2px solid ${defined.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                prediction === option.id
                  ? 'rgba(99, 102, 241, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'Test My Prediction →',
        onClick: () => handleNavigation('play'),
        disabled: !prediction,
        size: 'lg',
      })}
    </div>
  );

  // PLAY PHASE
  const renderPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Explore Refraction
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '450px',
        }}
      >
        Adjust the straw angle and observe how the apparent position changes. Toggle light rays to
        see the physics!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {renderGlassVisualization()}
        <div style={{ width: isMobile ? '100%' : '280px' }}>{renderControls()}</div>
      </div>

      {Button({
        children: 'I Understand → Review',
        onClick: () => handleNavigation('review'),
        size: 'lg',
      })}
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        The Science of Refraction
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: defined.spacing.lg,
          maxWidth: '800px',
          width: '100%',
        }}
      >
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              marginBottom: defined.spacing.sm,
            }}
          >
            🌊
          </div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Light Slows Down
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Light travels slower in water (225,000 km/s) than in air (300,000 km/s). When it crosses
            the boundary, it changes direction.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              marginBottom: defined.spacing.sm,
            }}
          >
            📐
          </div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Snell's Law
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            n₁ sin(θ₁) = n₂ sin(θ₂)
            <br />
            The relationship between angles and refractive indices determines exactly how much light
            bends.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              marginBottom: defined.spacing.sm,
            }}
          >
            👁️
          </div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Brain's Assumption
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Your brain assumes light travels in straight lines. It traces rays backward - but gets
            the wrong location because it doesn't account for bending.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              marginBottom: defined.spacing.sm,
            }}
          >
            📊
          </div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Refractive Index
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            n = c/v (speed of light in vacuum / speed in medium)
            <br />
            Water: 1.33 | Glass: 1.52 | Diamond: 2.42
          </p>
        </div>
      </div>

      <div
        style={{
          background:
            prediction === 'bend'
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'bend' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'bend' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'bend' ? '✓ Correct!' : '✗ Not quite!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          {prediction === 'bend'
            ? 'Light bending (refraction) at the air-water interface creates the broken straw illusion.'
            : 'The effect is caused by light bending (refraction) when crossing from water to air, not magnification, pressure, or focusing issues.'}
        </p>
      </div>

      {Button({
        children: 'Try Different Liquids →',
        onClick: () => handleNavigation('twist_predict'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          🔄 TWIST CHALLENGE
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        What About Oil?
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        If you place the same straw in vegetable oil instead of water, how will the bending compare?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          { id: 'more', text: 'MORE bending - oil is thicker and denser' },
          { id: 'same', text: 'SAME bending - all liquids bend light equally' },
          { id: 'less', text: 'LESS bending - oil is lighter than water' },
          { id: 'none', text: 'NO bending - oil doesn\'t refract light' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                twistPrediction === option.id
                  ? `2px solid ${defined.colors.accent}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                twistPrediction === option.id
                  ? 'rgba(245, 158, 11, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'Test With Oil →',
        onClick: () => {
          setMedium('oil');
          handleNavigation('twist_play');
        },
        disabled: !twistPrediction,
        size: 'lg',
      })}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          🔄 TWIST EXPERIMENT
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Compare Different Liquids
      </h2>

      {renderMediumSelector()}

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {renderGlassVisualization()}
        <div style={{ width: isMobile ? '100%' : '280px' }}>{renderControls()}</div>
      </div>

      {Button({
        children: 'See The Results →',
        onClick: () => handleNavigation('twist_review'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Refractive Index Matters!
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'more'
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${twistPrediction === 'more' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: twistPrediction === 'more' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {twistPrediction === 'more' ? '✓ Correct!' : '✗ Interesting result!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Oil has a higher refractive index (n ≈ 1.47) than water (n ≈ 1.33), so it bends light
          MORE. The apparent shift is greater in oil!
        </p>
      </div>

      {/* Comparison table */}
      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          width: '100%',
          maxWidth: '500px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3
          style={{
            color: defined.colors.text.primary,
            fontSize: defined.typography.sizes.lg,
            marginBottom: defined.spacing.md,
            textAlign: 'center',
          }}
        >
          Refractive Index Comparison
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: defined.spacing.sm }}>
          {[
            { name: 'Air', n: 1.0, shift: 0 },
            { name: 'Ice', n: 1.31, shift: 23.7 },
            { name: 'Water', n: 1.33, shift: 24.8 },
            { name: 'Oil', n: 1.47, shift: 32.0 },
            { name: 'Glass', n: 1.52, shift: 34.2 },
            { name: 'Diamond', n: 2.42, shift: 58.7 },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: defined.spacing.sm,
                background:
                  item.name.toLowerCase() === medium
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'transparent',
                borderRadius: defined.radius.md,
              }}
            >
              <span style={{ color: defined.colors.text.primary }}>{item.name}</span>
              <span style={{ color: defined.colors.text.muted }}>n = {item.n.toFixed(2)}</span>
              <div
                style={{
                  width: '100px',
                  height: '8px',
                  background: defined.colors.background.tertiary,
                  borderRadius: defined.radius.full,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${item.shift}%`,
                    height: '100%',
                    background:
                      item.shift > 30
                        ? defined.colors.accent
                        : item.shift > 20
                          ? defined.colors.primary
                          : defined.colors.success,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3
          style={{
            color: defined.colors.text.primary,
            fontSize: defined.typography.sizes.lg,
            marginBottom: defined.spacing.sm,
          }}
        >
          💎 Diamond's Sparkle
        </h3>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Diamond's extremely high refractive index (2.42) causes dramatic light bending. Combined
          with total internal reflection, this creates the brilliant sparkle and fire that makes
          diamonds so prized!
        </p>
      </div>

      {Button({
        children: 'See Real-World Applications →',
        onClick: () => handleNavigation('transfer'),
        size: 'lg',
      })}
    </div>
  );

  // TRANSFER PHASE
  const renderTransfer = () => {
    const currentApp = applications[selectedApp];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.lg,
          padding: defined.spacing.lg,
          minHeight: '500px',
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
          }}
        >
          Real-World Applications
        </h2>

        {/* Progress indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: defined.spacing.xs,
          }}
        >
          {applications.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: completedApps[i]
                  ? defined.colors.success
                  : i === selectedApp
                    ? defined.colors.primary
                    : defined.colors.background.tertiary,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Application tabs */}
        <div
          style={{
            display: 'flex',
            gap: defined.spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {applications.map((app, i) => {
            const isCompleted = completedApps[i];
            const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

            return (
              <button
                key={app.id}
                onClick={() => !isLocked && setSelectedApp(i)}
                disabled={isLocked}
                style={{
                  padding: `${defined.spacing.sm} ${defined.spacing.md}`,
                  borderRadius: defined.radius.lg,
                  border:
                    selectedApp === i
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    selectedApp === i
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: isLocked ? defined.colors.text.muted : defined.colors.text.primary,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  opacity: isLocked ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: defined.spacing.xs,
                }}
              >
                <span>{isLocked ? '🔒' : app.icon}</span>
                {!isMobile && app.title}
                {isCompleted && <span style={{ color: defined.colors.success }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Current application content */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: defined.spacing.md,
              marginBottom: defined.spacing.lg,
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{currentApp.icon}</span>
            <div>
              <h3
                style={{
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.xl,
                  margin: 0,
                }}
              >
                {currentApp.title}
              </h3>
              <p
                style={{
                  color: defined.colors.text.muted,
                  fontSize: defined.typography.sizes.sm,
                  margin: 0,
                }}
              >
                {currentApp.description}
              </p>
            </div>
          </div>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: defined.spacing.md,
            }}
          >
            {currentApp.details.map((detail, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: defined.spacing.md,
                  color: defined.colors.text.secondary,
                  fontSize: defined.typography.sizes.base,
                }}
              >
                <span style={{ color: defined.colors.primary, fontWeight: 'bold' }}>•</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: defined.spacing.md,
          }}
        >
          {Button({
            children: '← Previous',
            onClick: () => setSelectedApp(Math.max(0, selectedApp - 1)),
            variant: 'secondary',
            disabled: selectedApp === 0,
          })}

          {!completedApps[selectedApp] ? (
            Button({
              children:
                selectedApp < applications.length - 1
                  ? 'Next Application →'
                  : 'Complete Applications',
              onClick: handleCompleteApp,
              variant: 'primary',
            })
          ) : selectedApp < applications.length - 1 ? (
            Button({
              children: 'Next Application →',
              onClick: () => setSelectedApp(selectedApp + 1),
              variant: 'secondary',
            })
          ) : allAppsCompleted ? (
            Button({
              children: 'Take the Quiz →',
              onClick: () => handleNavigation('test'),
              variant: 'success',
            })
          ) : (
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Complete all applications to take the quiz
            </div>
          )}
        </div>
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    const question = questions[currentQuestion];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
        }}
      >
        {ProgressBar({ current: currentQuestion, total: questions.length })}

        <div
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.muted,
          }}
        >
          Question {currentQuestion + 1} of {questions.length}
        </div>

        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.lg : defined.typography.sizes.xl,
            fontWeight: defined.typography.weights.semibold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
            maxWidth: '600px',
          }}
        >
          {question.question}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: defined.spacing.md,
            width: '100%',
            maxWidth: '500px',
          }}
        >
          {question.options.map((option, i) => {
            let background = defined.colors.background.secondary;
            let borderColor = 'rgba(255,255,255,0.1)';

            if (showResult) {
              if (i === question.correctIndex) {
                background = 'rgba(16, 185, 129, 0.2)';
                borderColor = defined.colors.success;
              } else if (i === selectedAnswer && i !== question.correctIndex) {
                background = 'rgba(239, 68, 68, 0.2)';
                borderColor = defined.colors.error;
              }
            } else if (i === selectedAnswer) {
              background = 'rgba(99, 102, 241, 0.2)';
              borderColor = defined.colors.primary;
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult}
                style={{
                  padding: defined.spacing.lg,
                  borderRadius: defined.radius.lg,
                  border: `2px solid ${borderColor}`,
                  background,
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.base,
                  textAlign: 'left',
                  cursor: showResult ? 'default' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  transition: 'all 0.2s ease',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.lg,
              maxWidth: '500px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p
              style={{
                color: defined.colors.text.secondary,
                fontSize: defined.typography.sizes.sm,
                margin: 0,
              }}
            >
              {question.explanation}
            </p>
          </div>
        )}

        {showResult &&
          Button({
            children: currentQuestion < questions.length - 1 ? 'Next Question →' : 'See Results →',
            onClick: handleNextQuestion,
            size: 'lg',
          })}
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => {
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '4rem',
            marginBottom: defined.spacing.md,
          }}
        >
          {passed ? '🎉' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'Refraction Master!' : 'Keep Learning!'}
        </h1>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes['4xl'],
              fontWeight: defined.typography.weights.bold,
              color: passed ? defined.colors.success : defined.colors.accent,
              marginBottom: defined.spacing.sm,
            }}
          >
            {score}/{questions.length}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.text.secondary,
            }}
          >
            {percentage.toFixed(0)}% Correct
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '200px',
              height: '8px',
              background: defined.colors.background.tertiary,
              borderRadius: defined.radius.full,
              overflow: 'hidden',
              margin: `${defined.spacing.lg} auto 0`,
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: passed
                  ? defined.colors.success
                  : percentage >= 50
                    ? defined.colors.accent
                    : defined.colors.error,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: defined.spacing.md,
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🌊</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Light Bending
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>📐</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Snell's Law
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>👓</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Vision Correction
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: defined.typography.sizes.base,
            color: defined.colors.text.secondary,
            maxWidth: '500px',
          }}
        >
          {passed
            ? 'You now understand how light bending creates optical illusions and powers technologies from eyeglasses to fiber optics!'
            : 'Review the concepts and try again. Understanding refraction is key to optics!'}
        </p>

        <div style={{ display: 'flex', gap: defined.spacing.md }}>
          {Button({
            children: 'Start Over',
            onClick: () => {
              setPhase('hook');
              setPrediction(null);
              setTwistPrediction(null);
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowResult(false);
              setScore(0);
              setCompletedApps([false, false, false, false]);
              setSelectedApp(0);
              setMedium('water');
            },
            variant: 'secondary',
          })}
        </div>
      </div>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  const allPhases = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = allPhases.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Light Refraction</span>
          <div className="flex items-center gap-1.5">
            {allPhases.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : currentPhaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p.replace('_', ' ')}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400 capitalize">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: defined.spacing.lg }}>
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
}
