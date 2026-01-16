'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// SNELL'S LAW RENDERER - MEASURE THE BEND
// =============================================================================
// Premium educational game teaching Snell's Law through hands-on measurement.
// Students use virtual protractors to measure angles and verify the law
// experimentally, developing real laboratory skills.
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
    laser: {
      beam: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.4)',
    },
    medium: {
      air: 'rgba(148, 163, 184, 0.05)',
      water: 'rgba(56, 189, 248, 0.25)',
      glass: 'rgba(148, 163, 184, 0.35)',
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
const REFRACTIVE_INDICES: Record<string, number> = {
  air: 1.0,
  water: 1.333,
  glass: 1.52,
  diamond: 2.42,
  acrylic: 1.49,
};

const MEDIA_INFO: Record<string, { name: string; color: string; n: number }> = {
  air: { name: 'Air', color: 'rgba(148, 163, 184, 0.05)', n: 1.0 },
  water: { name: 'Water', color: 'rgba(56, 189, 248, 0.25)', n: 1.333 },
  glass: { name: 'Crown Glass', color: 'rgba(148, 163, 184, 0.35)', n: 1.52 },
  acrylic: { name: 'Acrylic', color: 'rgba(167, 139, 250, 0.25)', n: 1.49 },
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

interface Measurement {
  incidentAngle: number;
  refractedAngle: number;
  sinRatio: number;
}

// =============================================================================
// QUESTIONS DATA
// =============================================================================
const questions: Question[] = [
  {
    id: 1,
    question: "What does Snell's Law describe?",
    options: [
      'The speed of light in a vacuum',
      'The relationship between incident and refracted angles',
      'How light reflects off mirrors',
      'The frequency of light waves',
    ],
    correctIndex: 1,
    explanation:
      "Snell's Law (n₁sinθ₁ = n₂sinθ₂) mathematically relates the angle of incident light to the angle of refracted light using the refractive indices of both materials.",
  },
  {
    id: 2,
    question: 'If n₁sinθ₁ = n₂sinθ₂, and n₂ > n₁, what happens to θ₂?',
    options: [
      'θ₂ is larger than θ₁',
      'θ₂ is smaller than θ₁',
      'θ₂ equals θ₁',
      'θ₂ becomes 90°',
    ],
    correctIndex: 1,
    explanation:
      'When light enters a denser medium (higher n), it bends toward the normal, making θ₂ smaller than θ₁. The sine must decrease to maintain equality with the larger n₂.',
  },
  {
    id: 3,
    question: 'What is the critical angle?',
    options: [
      'The angle at which light travels fastest',
      'The angle above which total internal reflection occurs',
      'The angle at which colors separate',
      '45 degrees exactly',
    ],
    correctIndex: 1,
    explanation:
      'The critical angle is the incident angle that produces a refracted angle of exactly 90°. Above this angle, light cannot escape and undergoes total internal reflection.',
  },
  {
    id: 4,
    question: 'Light travels from glass (n=1.5) to air (n=1.0). At 30° incidence, what is sinθ₂?',
    options: ['0.5', '0.75', '1.0 (critical angle)', 'Greater than 1 (TIR)'],
    correctIndex: 1,
    explanation:
      'Using Snell\'s Law: 1.5 × sin(30°) = 1.0 × sinθ₂. So sinθ₂ = 1.5 × 0.5 = 0.75, giving θ₂ ≈ 48.6°.',
  },
  {
    id: 5,
    question: 'Why is the ratio sinθ₁/sinθ₂ constant for a given pair of media?',
    options: [
      'It depends on light color',
      'It equals the ratio of refractive indices n₂/n₁',
      'It changes with angle',
      'It is always 1.0',
    ],
    correctIndex: 1,
    explanation:
      "From Snell's Law rearranged: sinθ₁/sinθ₂ = n₂/n₁. This ratio is constant because refractive indices are material properties independent of angle.",
  },
  {
    id: 6,
    question: 'When light enters water from air at 45°, why does it bend toward the normal?',
    options: [
      'Water pushes the light down',
      'Light speeds up in water',
      'Light slows down in water',
      'The light beam gets wider',
    ],
    correctIndex: 2,
    explanation:
      "Light slows down in denser media. The part of the wavefront entering water first slows down while the rest catches up, causing the wave to pivot toward the normal (Huygens' principle).",
  },
  {
    id: 7,
    question: 'A scientist measures θ₁=40° and θ₂=25° for air-to-unknown material. What is n?',
    options: ['n ≈ 1.0', 'n ≈ 1.33', 'n ≈ 1.52', 'n ≈ 2.0'],
    correctIndex: 2,
    explanation:
      "Using Snell's Law: n = sin(40°)/sin(25°) = 0.643/0.423 ≈ 1.52. This is close to glass!",
  },
  {
    id: 8,
    question: 'At what incident angle does NO refraction occur?',
    options: ['0° (perpendicular to surface)', '45°', '90° (parallel to surface)', 'Refraction always occurs'],
    correctIndex: 0,
    explanation:
      'At 0° incidence (perpendicular), sin(0°) = 0, so sin(θ₂) = 0 and θ₂ = 0°. The light passes straight through without bending.',
  },
  {
    id: 9,
    question: 'What happens when sinθ₂ would need to exceed 1.0?',
    options: [
      'The light disappears',
      'Total internal reflection occurs',
      'The light splits into colors',
      'The equation fails',
    ],
    correctIndex: 1,
    explanation:
      'Since sin cannot exceed 1.0, no refracted ray exists. All light reflects back into the first medium - this is total internal reflection, used in fiber optics.',
  },
  {
    id: 10,
    question: 'Which material pair has the largest critical angle?',
    options: [
      'Diamond to air (n: 2.42 to 1.0)',
      'Glass to air (n: 1.5 to 1.0)',
      'Water to air (n: 1.33 to 1.0)',
      'Acrylic to air (n: 1.49 to 1.0)',
    ],
    correctIndex: 2,
    explanation:
      'Critical angle = arcsin(n₂/n₁). Water-air: arcsin(1/1.33) ≈ 48.8°. Glass-air: ≈41.8°. Diamond-air: ≈24.4°. Higher ratio = larger critical angle.',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'Optical Fiber Design',
    description: 'How the internet travels',
    icon: '🌐',
    details: [
      "Snell's Law determines the critical angle for total internal reflection",
      'Core and cladding materials chosen for optimal light trapping',
      'Engineers calculate exact angles to minimize signal loss',
      'Submarine cables carry 99% of international data using this principle',
    ],
  },
  {
    id: 2,
    title: 'Diamond Cutting',
    description: 'Maximizing brilliance',
    icon: '💎',
    details: [
      "Diamond's high refractive index (2.42) creates small critical angle (24.4°)",
      'Cuts angled to maximize total internal reflection',
      'Light bounces multiple times before exiting through the top',
      'Brilliant cut (57 facets) optimized using Snell\'s Law calculations',
    ],
  },
  {
    id: 3,
    title: 'Lens Design',
    description: 'From cameras to telescopes',
    icon: '📷',
    details: [
      "Snell's Law at curved surfaces determines focal length",
      'Multiple lens elements compensate for chromatic aberration',
      'Aspherical lenses use varying curvature for sharper images',
      'Modern camera lenses use 10+ elements precisely calculated',
    ],
  },
  {
    id: 4,
    title: 'Underwater Optics',
    description: 'Cameras and goggles',
    icon: '🤿',
    details: [
      'Flat mask creates air layer - Snell\'s Law at water-air-eye interfaces',
      'Underwater camera housings use dome ports to minimize distortion',
      'Spearfishing requires mental compensation for apparent fish position',
      'Marine biologists calibrate instruments for accurate measurements',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function SnellsLawRenderer() {
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
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [topMedium, setTopMedium] = useState<'air' | 'water' | 'glass' | 'acrylic'>('air');
  const [bottomMedium, setBottomMedium] = useState<'air' | 'water' | 'glass' | 'acrylic'>('water');
  const [showProtractor, setShowProtractor] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [reverseDirection, setReverseDirection] = useState(false);

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
  const calculateRefractedAngle = useCallback(
    (theta1: number, n1: number, n2: number): { angle: number; isTIR: boolean } => {
      const theta1Rad = (theta1 * Math.PI) / 180;
      const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2;

      if (Math.abs(sinTheta2) > 1) {
        // Total internal reflection
        return { angle: theta1, isTIR: true };
      }

      const theta2Rad = Math.asin(sinTheta2);
      return { angle: (theta2Rad * 180) / Math.PI, isTIR: false };
    },
    []
  );

  const calculateCriticalAngle = useCallback((n1: number, n2: number): number | null => {
    if (n1 <= n2) return null; // No critical angle when going to denser medium
    const sinCritical = n2 / n1;
    return (Math.asin(sinCritical) * 180) / Math.PI;
  }, []);

  const getN1 = useCallback(() => {
    return reverseDirection ? REFRACTIVE_INDICES[bottomMedium] : REFRACTIVE_INDICES[topMedium];
  }, [reverseDirection, topMedium, bottomMedium]);

  const getN2 = useCallback(() => {
    return reverseDirection ? REFRACTIVE_INDICES[topMedium] : REFRACTIVE_INDICES[bottomMedium];
  }, [reverseDirection, topMedium, bottomMedium]);

  const refractedResult = calculateRefractedAngle(incidentAngle, getN1(), getN2());

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

  const handleRecordMeasurement = useCallback(() => {
    if (refractedResult.isTIR) return;

    const theta1Rad = (incidentAngle * Math.PI) / 180;
    const theta2Rad = (refractedResult.angle * Math.PI) / 180;
    const sinRatio = Math.sin(theta1Rad) / Math.sin(theta2Rad);

    const newMeasurement: Measurement = {
      incidentAngle,
      refractedAngle: refractedResult.angle,
      sinRatio,
    };

    setMeasurements((prev) => [...prev.slice(-4), newMeasurement]);
  }, [incidentAngle, refractedResult]);

  const allAppsCompleted = completedApps.every(Boolean);

  // =============================================================================
  // BUTTON COMPONENT
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
  // SNELL'S LAW VISUALIZATION
  // =============================================================================
  const renderSnellsLawVisualization = useCallback(() => {
    const width = isMobile ? 300 : 400;
    const height = isMobile ? 300 : 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const rayLength = 120;

    const n1 = getN1();
    const n2 = getN2();
    const criticalAngle = calculateCriticalAngle(n1, n2);
    const { angle: refractedAngle, isTIR } = refractedResult;

    // Calculate ray endpoints
    const incidentRad = ((reverseDirection ? -incidentAngle : incidentAngle) * Math.PI) / 180;
    const refractedRad = ((reverseDirection ? refractedAngle : -refractedAngle) * Math.PI) / 180;

    // Incident ray (coming from top-left or bottom-left depending on direction)
    const incidentStartX = reverseDirection
      ? centerX - Math.sin(Math.abs(incidentRad)) * rayLength
      : centerX - Math.sin(incidentRad) * rayLength;
    const incidentStartY = reverseDirection
      ? centerY + Math.cos(Math.abs(incidentRad)) * rayLength
      : centerY - Math.cos(incidentRad) * rayLength;

    // Refracted/reflected ray
    let refractedEndX: number;
    let refractedEndY: number;

    if (isTIR) {
      // Total internal reflection - mirror the incident ray
      refractedEndX = reverseDirection
        ? centerX + Math.sin(Math.abs(incidentRad)) * rayLength
        : centerX + Math.sin(incidentRad) * rayLength;
      refractedEndY = reverseDirection
        ? centerY + Math.cos(Math.abs(incidentRad)) * rayLength
        : centerY - Math.cos(incidentRad) * rayLength;
    } else {
      refractedEndX = centerX + Math.sin(refractedRad) * rayLength;
      refractedEndY = reverseDirection
        ? centerY - Math.cos(refractedRad) * rayLength
        : centerY + Math.cos(refractedRad) * rayLength;
    }

    const topMediumInfo = MEDIA_INFO[topMedium];
    const bottomMediumInfo = MEDIA_INFO[bottomMedium];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}
      >
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            {/* Laser glow filter */}
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Protractor arc clip */}
            <clipPath id="protractorClip">
              <circle cx={centerX} cy={centerY} r={80} />
            </clipPath>
          </defs>

          {/* Top medium (air by default) */}
          <rect
            x={0}
            y={0}
            width={width}
            height={centerY}
            fill={topMediumInfo.color}
          />
          <text
            x={10}
            y={25}
            fill={defined.colors.text.muted}
            fontSize="12"
            fontFamily={defined.typography.fontFamily}
          >
            {topMediumInfo.name} (n={topMediumInfo.n.toFixed(2)})
          </text>

          {/* Bottom medium (water by default) */}
          <rect
            x={0}
            y={centerY}
            width={width}
            height={centerY}
            fill={bottomMediumInfo.color}
          />
          <text
            x={10}
            y={height - 10}
            fill={defined.colors.text.muted}
            fontSize="12"
            fontFamily={defined.typography.fontFamily}
          >
            {bottomMediumInfo.name} (n={bottomMediumInfo.n.toFixed(2)})
          </text>

          {/* Interface line */}
          <line
            x1={0}
            y1={centerY}
            x2={width}
            y2={centerY}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="2"
          />

          {/* Normal line (dashed) */}
          <line
            x1={centerX}
            y1={centerY - 100}
            x2={centerX}
            y2={centerY + 100}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1"
            strokeDasharray="6,4"
          />
          <text
            x={centerX + 5}
            y={centerY - 105}
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="10"
            fontFamily={defined.typography.fontFamily}
          >
            Normal
          </text>

          {/* Protractor (if enabled) */}
          {showProtractor && (
            <g opacity={0.5}>
              {/* Protractor arc - top half */}
              <path
                d={`M ${centerX - 80} ${centerY} A 80 80 0 0 1 ${centerX + 80} ${centerY}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
              />
              {/* Protractor arc - bottom half */}
              <path
                d={`M ${centerX - 80} ${centerY} A 80 80 0 0 0 ${centerX + 80} ${centerY}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
              />
              {/* Angle marks */}
              {[0, 15, 30, 45, 60, 75, 90].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const innerR = 75;
                const outerR = 80;
                return (
                  <g key={angle}>
                    {/* Top marks */}
                    <line
                      x1={centerX - Math.sin(rad) * innerR}
                      y1={centerY - Math.cos(rad) * innerR}
                      x2={centerX - Math.sin(rad) * outerR}
                      y2={centerY - Math.cos(rad) * outerR}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="1"
                    />
                    <line
                      x1={centerX + Math.sin(rad) * innerR}
                      y1={centerY - Math.cos(rad) * innerR}
                      x2={centerX + Math.sin(rad) * outerR}
                      y2={centerY - Math.cos(rad) * outerR}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="1"
                    />
                    {/* Bottom marks */}
                    <line
                      x1={centerX - Math.sin(rad) * innerR}
                      y1={centerY + Math.cos(rad) * innerR}
                      x2={centerX - Math.sin(rad) * outerR}
                      y2={centerY + Math.cos(rad) * outerR}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="1"
                    />
                    <line
                      x1={centerX + Math.sin(rad) * innerR}
                      y1={centerY + Math.cos(rad) * innerR}
                      x2={centerX + Math.sin(rad) * outerR}
                      y2={centerY + Math.cos(rad) * outerR}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="1"
                    />
                    {/* Labels */}
                    {angle > 0 && angle < 90 && (
                      <>
                        <text
                          x={centerX - Math.sin(rad) * 65}
                          y={centerY - Math.cos(rad) * 65}
                          fill="rgba(255, 255, 255, 0.4)"
                          fontSize="8"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontFamily={defined.typography.fontFamily}
                        >
                          {angle}°
                        </text>
                        <text
                          x={centerX - Math.sin(rad) * 65}
                          y={centerY + Math.cos(rad) * 65}
                          fill="rgba(255, 255, 255, 0.4)"
                          fontSize="8"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontFamily={defined.typography.fontFamily}
                        >
                          {angle}°
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Incident angle arc */}
          <path
            d={
              reverseDirection
                ? `M ${centerX} ${centerY + 40} A 40 40 0 0 1 ${centerX - Math.sin(Math.abs(incidentRad)) * 40} ${centerY + Math.cos(Math.abs(incidentRad)) * 40}`
                : `M ${centerX} ${centerY - 40} A 40 40 0 0 0 ${centerX - Math.sin(incidentRad) * 40} ${centerY - Math.cos(incidentRad) * 40}`
            }
            fill="none"
            stroke={defined.colors.accent}
            strokeWidth="2"
          />
          <text
            x={reverseDirection ? centerX - 50 : centerX - 50}
            y={reverseDirection ? centerY + 55 : centerY - 50}
            fill={defined.colors.accent}
            fontSize="12"
            fontFamily={defined.typography.fontFamily}
          >
            θ₁={incidentAngle}°
          </text>

          {/* Refracted angle arc (if not TIR) */}
          {!isTIR && (
            <>
              <path
                d={
                  reverseDirection
                    ? `M ${centerX} ${centerY - 40} A 40 40 0 0 0 ${centerX + Math.sin(Math.abs(refractedRad)) * 40} ${centerY - Math.cos(Math.abs(refractedRad)) * 40}`
                    : `M ${centerX} ${centerY + 40} A 40 40 0 0 1 ${centerX + Math.sin(Math.abs(refractedRad)) * 40} ${centerY + Math.cos(Math.abs(refractedRad)) * 40}`
                }
                fill="none"
                stroke={defined.colors.success}
                strokeWidth="2"
              />
              <text
                x={centerX + 30}
                y={reverseDirection ? centerY - 50 : centerY + 55}
                fill={defined.colors.success}
                fontSize="12"
                fontFamily={defined.typography.fontFamily}
              >
                θ₂={refractedAngle.toFixed(1)}°
              </text>
            </>
          )}

          {/* Incident ray */}
          <line
            x1={incidentStartX}
            y1={incidentStartY}
            x2={centerX}
            y2={centerY}
            stroke={defined.colors.laser.beam}
            strokeWidth="3"
            filter="url(#laserGlow)"
          />
          {/* Arrow head for incident ray */}
          <polygon
            points={`${centerX},${centerY} ${centerX - 8},${centerY - 15} ${centerX + 8},${centerY - 15}`}
            fill={defined.colors.laser.beam}
            transform={`rotate(${reverseDirection ? 180 - incidentAngle : incidentAngle}, ${centerX}, ${centerY})`}
          />

          {/* Refracted/Reflected ray */}
          <line
            x1={centerX}
            y1={centerY}
            x2={refractedEndX}
            y2={refractedEndY}
            stroke={isTIR ? defined.colors.secondary : defined.colors.success}
            strokeWidth="3"
            filter="url(#laserGlow)"
          />

          {/* TIR indicator */}
          {isTIR && (
            <text
              x={centerX}
              y={centerY - 120}
              fill={defined.colors.error}
              fontSize="14"
              fontFamily={defined.typography.fontFamily}
              textAnchor="middle"
              fontWeight="bold"
            >
              ⚡ Total Internal Reflection!
            </text>
          )}

          {/* Critical angle indicator (if applicable) */}
          {criticalAngle && (
            <g opacity={0.5}>
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX - Math.sin((criticalAngle * Math.PI) / 180) * 90}
                y2={
                  reverseDirection
                    ? centerY + Math.cos((criticalAngle * Math.PI) / 180) * 90
                    : centerY - Math.cos((criticalAngle * Math.PI) / 180) * 90
                }
                stroke={defined.colors.warning}
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={centerX - Math.sin((criticalAngle * Math.PI) / 180) * 95}
                y={
                  reverseDirection
                    ? centerY + Math.cos((criticalAngle * Math.PI) / 180) * 95
                    : centerY - Math.cos((criticalAngle * Math.PI) / 180) * 95
                }
                fill={defined.colors.warning}
                fontSize="10"
                fontFamily={defined.typography.fontFamily}
              >
                Critical: {criticalAngle.toFixed(1)}°
              </text>
            </g>
          )}

          {/* Light source indicator */}
          <circle
            cx={incidentStartX}
            cy={incidentStartY}
            r="8"
            fill={defined.colors.laser.beam}
            filter="url(#laserGlow)"
          />
        </svg>

        {/* Snell's Law equation display */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.md,
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '280px',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.muted,
              marginBottom: defined.spacing.xs,
            }}
          >
            Snell's Law Verification
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.text.primary,
              fontFamily: 'monospace',
            }}
          >
            {n1.toFixed(2)} × sin({incidentAngle}°) = {n2.toFixed(2)} × sin(
            {refractedAngle.toFixed(1)}°)
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.base,
              color: isTIR ? defined.colors.error : defined.colors.success,
              marginTop: defined.spacing.xs,
            }}
          >
            {isTIR
              ? 'sinθ₂ > 1 → Total Internal Reflection'
              : `${(n1 * Math.sin((incidentAngle * Math.PI) / 180)).toFixed(3)} ≈ ${(n2 * Math.sin((refractedAngle * Math.PI) / 180)).toFixed(3)} ✓`}
          </div>
        </div>
      </div>
    );
  }, [
    isMobile,
    incidentAngle,
    topMedium,
    bottomMedium,
    showProtractor,
    reverseDirection,
    getN1,
    getN2,
    calculateCriticalAngle,
    refractedResult,
  ]);

  // =============================================================================
  // CONTROLS PANEL
  // =============================================================================
  const renderControls = useCallback(
    () => (
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
          width: isMobile ? '100%' : '280px',
        }}
      >
        {/* Incident Angle Slider */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Incident Angle: {incidentAngle}°
          </label>
          <input
            type="range"
            min="0"
            max="89"
            value={incidentAngle}
            onChange={(e) => setIncidentAngle(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: defined.colors.primary,
            }}
          />
        </div>

        {/* Medium Selectors */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Top Medium
          </label>
          <select
            value={topMedium}
            onChange={(e) => setTopMedium(e.target.value as typeof topMedium)}
            style={{
              width: '100%',
              padding: defined.spacing.sm,
              borderRadius: defined.radius.md,
              background: defined.colors.background.tertiary,
              color: defined.colors.text.primary,
              border: 'none',
              fontFamily: defined.typography.fontFamily,
            }}
          >
            {Object.entries(MEDIA_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} (n={info.n})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Bottom Medium
          </label>
          <select
            value={bottomMedium}
            onChange={(e) => setBottomMedium(e.target.value as typeof bottomMedium)}
            style={{
              width: '100%',
              padding: defined.spacing.sm,
              borderRadius: defined.radius.md,
              background: defined.colors.background.tertiary,
              color: defined.colors.text.primary,
              border: 'none',
              fontFamily: defined.typography.fontFamily,
            }}
          >
            {Object.entries(MEDIA_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} (n={info.n})
              </option>
            ))}
          </select>
        </div>

        {/* Toggles */}
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
            Show Protractor
          </span>
          <button
            onClick={() => setShowProtractor(!showProtractor)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showProtractor
                ? defined.colors.primary
                : defined.colors.background.tertiary,
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
                left: showProtractor ? '23px' : '3px',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* Record Measurement Button */}
        {Button({
          children: '📏 Record Measurement',
          onClick: handleRecordMeasurement,
          variant: 'secondary',
          size: 'sm',
          fullWidth: true,
          disabled: refractedResult.isTIR,
        })}

        {/* Measurements Table */}
        {measurements.length > 0 && (
          <div
            style={{
              background: defined.colors.background.secondary,
              borderRadius: defined.radius.md,
              padding: defined.spacing.sm,
              fontSize: defined.typography.sizes.xs,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: defined.spacing.xs,
                color: defined.colors.text.muted,
                marginBottom: defined.spacing.xs,
                textAlign: 'center',
              }}
            >
              <span>θ₁</span>
              <span>θ₂</span>
              <span>sin ratio</span>
            </div>
            {measurements.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: defined.spacing.xs,
                  color: defined.colors.text.secondary,
                  textAlign: 'center',
                }}
              >
                <span>{m.incidentAngle}°</span>
                <span>{m.refractedAngle.toFixed(1)}°</span>
                <span>{m.sinRatio.toFixed(3)}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: defined.spacing.sm,
                paddingTop: defined.spacing.sm,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                color: defined.colors.success,
                textAlign: 'center',
              }}
            >
              Avg ratio: {(measurements.reduce((a, b) => a + b.sinRatio, 0) / measurements.length).toFixed(3)}
              <br />
              <span style={{ color: defined.colors.text.muted }}>
                (Expected: {(getN2() / getN1()).toFixed(3)})
              </span>
            </div>
          </div>
        )}
      </div>
    ),
    [
      isMobile,
      incidentAngle,
      topMedium,
      bottomMedium,
      showProtractor,
      measurements,
      refractedResult.isTIR,
      Button,
      handleRecordMeasurement,
      getN1,
      getN2,
    ]
  );

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
        📐
      </div>
      <h1
        style={{
          fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Snell's Law Laboratory
      </h1>
      <p
        style={{
          fontSize: defined.typography.sizes.lg,
          color: defined.colors.text.secondary,
          maxWidth: '500px',
          lineHeight: 1.6,
        }}
      >
        In 1621, Dutch mathematician Willebrord Snellius discovered a
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          {' '}
          precise mathematical relationship
        </span>{' '}
        between angles of light entering and exiting a material. Can you verify his law?
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
            fontSize: defined.typography.sizes['2xl'],
            color: defined.colors.primary,
            fontFamily: 'serif',
            fontStyle: 'italic',
            marginBottom: defined.spacing.md,
          }}
        >
          n₁ sin θ₁ = n₂ sin θ₂
        </div>
        <p
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.muted,
          }}
        >
          Where n is the refractive index and θ is the angle from the normal line
        </p>
      </div>

      {Button({
        children: 'Start the Experiment →',
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
        Light enters water (n=1.33) from air (n=1.0) at 45°. If you measure several angles, what do
        you expect to find about the ratio sinθ₁/sinθ₂?
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
          { id: 'constant', text: 'The ratio is CONSTANT regardless of incident angle' },
          { id: 'varies', text: 'The ratio VARIES with different incident angles' },
          { id: 'one', text: 'The ratio is always 1.0 (angles are equal)' },
          { id: 'random', text: 'The ratio appears random' },
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
        children: 'Begin Measurements →',
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
        Measure the Angles
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust the incident angle and record measurements. Watch how the refracted angle changes and
        calculate the sin ratio!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {renderSnellsLawVisualization()}
        {renderControls()}
      </div>

      {Button({
        children:
          measurements.length >= 3
            ? 'I Have Enough Data → Review'
            : `Record ${3 - measurements.length} more measurements`,
        onClick: () => handleNavigation('review'),
        disabled: measurements.length < 3,
        size: 'lg',
      })}
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => {
    const avgRatio =
      measurements.length > 0
        ? measurements.reduce((a, b) => a + b.sinRatio, 0) / measurements.length
        : 0;
    const expectedRatio = REFRACTIVE_INDICES[bottomMedium] / REFRACTIVE_INDICES[topMedium];
    const accuracy = Math.abs(avgRatio - expectedRatio) < 0.05;

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
        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          Your Experimental Results
        </h2>

        <div
          style={{
            background:
              prediction === 'constant' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            maxWidth: '500px',
            textAlign: 'center',
            border: `1px solid ${prediction === 'constant' ? defined.colors.success : defined.colors.error}`,
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              fontWeight: defined.typography.weights.semibold,
              color: prediction === 'constant' ? defined.colors.success : defined.colors.error,
              marginBottom: defined.spacing.sm,
            }}
          >
            {prediction === 'constant' ? '✓ Correct prediction!' : '✗ Not quite!'}
          </div>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            The ratio sinθ₁/sinθ₂ is indeed constant for a given pair of media. This is the essence
            of Snell's Law!
          </p>
        </div>

        {/* Results summary */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
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
              marginBottom: defined.spacing.lg,
              textAlign: 'center',
            }}
          >
            Your Measurements
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: defined.spacing.sm,
              textAlign: 'center',
              marginBottom: defined.spacing.lg,
            }}
          >
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              θ₁ (incident)
            </div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              θ₂ (refracted)
            </div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              sinθ₁/sinθ₂
            </div>
            {measurements.map((m, i) => (
              <>
                <div key={`${i}-1`} style={{ color: defined.colors.text.primary }}>
                  {m.incidentAngle}°
                </div>
                <div key={`${i}-2`} style={{ color: defined.colors.text.primary }}>
                  {m.refractedAngle.toFixed(1)}°
                </div>
                <div key={`${i}-3`} style={{ color: defined.colors.primary }}>
                  {m.sinRatio.toFixed(3)}
                </div>
              </>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: defined.spacing.md,
              textAlign: 'center',
            }}
          >
            <div style={{ color: defined.colors.text.muted, marginBottom: defined.spacing.xs }}>
              Your average ratio
            </div>
            <div
              style={{
                fontSize: defined.typography.sizes['2xl'],
                fontWeight: defined.typography.weights.bold,
                color: accuracy ? defined.colors.success : defined.colors.accent,
              }}
            >
              {avgRatio.toFixed(3)}
            </div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Expected: n₂/n₁ = {expectedRatio.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Key insight */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: defined.spacing.lg,
            maxWidth: '600px',
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📊</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.base,
                marginBottom: defined.spacing.sm,
              }}
            >
              Constant Ratio
            </h3>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              No matter what angle you choose, the ratio remains constant for the same two materials.
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔢</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.base,
                marginBottom: defined.spacing.sm,
              }}
            >
              The Magic Number
            </h3>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              This ratio equals n₂/n₁ - the ratio of refractive indices of the two materials.
            </p>
          </div>
        </div>

        {Button({
          children: 'Try Reverse Direction →',
          onClick: () => handleNavigation('twist_predict'),
          size: 'lg',
        })}
      </div>
    );
  };

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
        Light Going the Other Way
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        What happens if light travels from water INTO air (denser to less dense)? What do you
        predict will happen at large angles?
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
          { id: 'same', text: 'Same behavior - just angles swap places' },
          { id: 'tir', text: 'At large angles, light cannot escape - total reflection!' },
          { id: 'scatter', text: 'Light scatters in all directions' },
          { id: 'absorb', text: 'Light gets absorbed at the interface' },
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
        children: 'Test with Reverse Light →',
        onClick: () => {
          setReverseDirection(true);
          setIncidentAngle(30);
          setMeasurements([]);
          handleNavigation('twist_play');
        },
        disabled: !twistPrediction,
        size: 'lg',
      })}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => {
    const criticalAngle = calculateCriticalAngle(getN1(), getN2());

    return (
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
            🔄 LIGHT FROM DENSE TO LESS DENSE
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
          Find the Critical Angle
        </h2>

        <p
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.secondary,
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          Slowly increase the incident angle until something dramatic happens. Watch for the point
          where the refracted ray can no longer exist!
        </p>

        {criticalAngle && (
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ color: defined.colors.warning, fontSize: defined.typography.sizes.sm }}>
              🎯 Hint: Critical angle = {criticalAngle.toFixed(1)}°
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: defined.spacing.xl,
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '800px',
          }}
        >
          {renderSnellsLawVisualization()}
          {renderControls()}
        </div>

        {Button({
          children: 'See What This Means →',
          onClick: () => handleNavigation('twist_review'),
          size: 'lg',
        })}
      </div>
    );
  };

  // TWIST REVIEW PHASE
  const renderTwistReview = () => {
    const criticalAngle = calculateCriticalAngle(
      REFRACTIVE_INDICES[bottomMedium],
      REFRACTIVE_INDICES[topMedium]
    );

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
        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          Total Internal Reflection!
        </h2>

        <div
          style={{
            background:
              twistPrediction === 'tir' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            maxWidth: '500px',
            textAlign: 'center',
            border: `1px solid ${twistPrediction === 'tir' ? defined.colors.success : defined.colors.error}`,
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              fontWeight: defined.typography.weights.semibold,
              color: twistPrediction === 'tir' ? defined.colors.success : defined.colors.error,
              marginBottom: defined.spacing.sm,
            }}
          >
            {twistPrediction === 'tir' ? '✓ Exactly right!' : '✗ Surprising result!'}
          </div>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            When light goes from dense to less dense medium, there's an angle beyond which ALL light
            reflects back - total internal reflection (TIR).
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: defined.spacing.lg,
            maxWidth: '700px',
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
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>📐</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.lg,
                marginBottom: defined.spacing.sm,
              }}
            >
              Critical Angle Formula
            </h3>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: defined.typography.sizes.lg,
                color: defined.colors.primary,
                marginBottom: defined.spacing.sm,
              }}
            >
              θc = arcsin(n₂/n₁)
            </div>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              For water→air: θc = arcsin(1.0/1.33) = {criticalAngle?.toFixed(1)}°
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
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>🌐</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.lg,
                marginBottom: defined.spacing.sm,
              }}
            >
              Fiber Optics
            </h3>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              Optical fibers trap light using TIR. Light bounces inside the fiber, carrying data
              thousands of kilometers with minimal loss!
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
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>💎</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.lg,
                marginBottom: defined.spacing.sm,
              }}
            >
              Diamond's Sparkle
            </h3>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              Diamond has a tiny critical angle (24°). Light entering bounces many times inside
              before escaping - creating brilliant sparkle!
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
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>🔍</div>
            <h3
              style={{
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.lg,
                marginBottom: defined.spacing.sm,
              }}
            >
              Snell's Limit
            </h3>
            <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
              When sinθ₂ would exceed 1.0, no refracted ray exists. Mathematics predicts physics
              beautifully!
            </p>
          </div>
        </div>

        {Button({
          children: 'See Real-World Applications →',
          onClick: () => {
            setReverseDirection(false);
            handleNavigation('transfer');
          },
          size: 'lg',
        })}
      </div>
    );
  };

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
          {passed ? '🔬' : '📖'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? "Snell's Law Expert!" : 'More Practice Needed'}
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>📐</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              n₁sinθ₁ = n₂sinθ₂
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>⚡</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Total Internal Reflection
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🌐</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Fiber Optics
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
            ? "You've mastered the quantitative relationship between light angles! This law powers fiber optics, diamonds, and optical design."
            : "Keep practicing! Snell's Law is fundamental to understanding how light interacts with different materials."}
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
              setMeasurements([]);
              setReverseDirection(false);
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
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${defined.colors.background.primary} 0%, ${defined.colors.background.secondary} 100%)`,
        fontFamily: defined.typography.fontFamily,
        padding: defined.spacing.lg,
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
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
  );
}
