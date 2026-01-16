'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DIFFRACTION RENDERER - SINGLE & DOUBLE SLIT PATTERNS
// =============================================================================
// Premium educational game demonstrating light diffraction through narrow slits.
// Students explore single-slit patterns, Young's double-slit experiment,
// and discover direct evidence that light behaves as a wave.
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
      red: '#EF4444',
      green: '#22C55E',
      blue: '#3B82F6',
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
const WAVELENGTHS: Record<string, { name: string; wavelength: number; color: string }> = {
  red: { name: 'Red', wavelength: 650, color: '#EF4444' },
  green: { name: 'Green', wavelength: 532, color: '#22C55E' },
  blue: { name: 'Blue', wavelength: 450, color: '#3B82F6' },
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
    question: 'What does diffraction prove about light?',
    options: [
      'Light is made of particles',
      'Light behaves as a wave',
      'Light travels in straight lines only',
      'Light has mass',
    ],
    correctIndex: 1,
    explanation:
      'Diffraction patterns can only be explained by wave behavior. Particles would create sharp shadows, but waves bend around edges and interfere with each other.',
  },
  {
    id: 2,
    question: 'In a single-slit pattern, what creates the dark bands (minima)?',
    options: [
      'Light is absorbed at those points',
      'Destructive interference between waves from different parts of the slit',
      'The screen blocks light at those spots',
      'The slit filters out some light',
    ],
    correctIndex: 1,
    explanation:
      'Different parts of the wavefront passing through the slit travel different distances. Where they arrive out of phase, they cancel (destructive interference), creating dark bands.',
  },
  {
    id: 3,
    question: "What happens to the diffraction pattern if you make the slit NARROWER?",
    options: [
      'Pattern gets narrower',
      'Pattern gets wider (more spreading)',
      'Pattern disappears',
      'No change',
    ],
    correctIndex: 1,
    explanation:
      "Narrower slits cause more spreading! This seems counterintuitive, but smaller apertures diffract light more. Think of squeezing water through a narrow gap - it fans out more.",
  },
  {
    id: 4,
    question: 'In Young\'s double-slit experiment, what creates the pattern of bright fringes?',
    options: [
      'Light reflecting between the slits',
      'Constructive interference where waves arrive in phase',
      'The slits acting as lenses',
      'Different colors separating',
    ],
    correctIndex: 1,
    explanation:
      'Light from both slits travels to the screen. Where path lengths differ by whole wavelengths (0, λ, 2λ...), waves arrive in phase and add up constructively - bright fringe!',
  },
  {
    id: 5,
    question: 'For double-slit interference, where is the central bright fringe?',
    options: [
      'Directly behind one slit',
      'At the point equidistant from both slits',
      'At the edge of the screen',
      'It moves randomly',
    ],
    correctIndex: 1,
    explanation:
      'The central maximum is where both waves travel equal distances - zero path difference. Waves arrive perfectly in phase, creating the brightest fringe.',
  },
  {
    id: 6,
    question: 'If you use red light instead of blue, how does the fringe spacing change?',
    options: [
      'Spacing decreases (fringes closer together)',
      'Spacing increases (fringes farther apart)',
      'No change - color doesn\'t matter',
      'Fringes disappear',
    ],
    correctIndex: 1,
    explanation:
      'Fringe spacing is proportional to wavelength. Red light (λ ≈ 650nm) has longer wavelength than blue (λ ≈ 450nm), so red produces wider-spaced fringes.',
  },
  {
    id: 7,
    question: 'What is the condition for a bright fringe in double-slit interference?',
    options: [
      'd·sin(θ) = (m + ½)λ',
      'd·sin(θ) = mλ (where m = 0, 1, 2...)',
      'd·cos(θ) = mλ',
      'λ/d = sin(θ)',
    ],
    correctIndex: 1,
    explanation:
      'Bright fringes occur when path difference equals a whole number of wavelengths: d·sin(θ) = mλ. The integer m indicates the fringe order (0 = central, 1 = first, etc.).',
  },
  {
    id: 8,
    question: 'Why is diffraction more noticeable with laser light than sunlight?',
    options: [
      'Lasers are brighter',
      'Laser light is coherent (same phase and wavelength)',
      'Sunlight is too heavy',
      'Lasers travel faster',
    ],
    correctIndex: 1,
    explanation:
      'Coherence is key! Laser light has a single wavelength and consistent phase. Sunlight contains many wavelengths and random phases, blurring interference patterns.',
  },
  {
    id: 9,
    question: "What happens in single-slit diffraction as slit width approaches zero?",
    options: [
      'Light stops passing through',
      'The pattern approaches a single very wide central maximum',
      'Multiple sharp fringes appear',
      'Light travels backward',
    ],
    correctIndex: 1,
    explanation:
      "As the slit narrows, diffraction increases until the central maximum spreads across nearly the entire screen. In the limit, the slit acts as a point source radiating in all directions.",
  },
  {
    id: 10,
    question: 'Electron diffraction experiments show electrons have wave properties. What does this demonstrate?',
    options: [
      'Electrons are actually made of light',
      'Wave-particle duality applies to matter too',
      'Diffraction only works with charged particles',
      'Electrons are heavier than expected',
    ],
    correctIndex: 1,
    explanation:
      'De Broglie proposed all matter has wave-like properties. Electron diffraction through crystals produces patterns just like light diffraction - confirming quantum wave-particle duality!',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'CD/DVD Reading',
    description: 'Laser track detection',
    icon: '💿',
    details: [
      'CD tracks are 1.6μm apart - comparable to laser wavelength',
      'Diffraction from pit patterns encodes data as intensity changes',
      'Blu-ray uses shorter wavelength (405nm) for finer track pitch (320nm)',
      'The same physics enables DVD to hold 7x more data than CD',
    ],
  },
  {
    id: 2,
    title: 'X-ray Crystallography',
    description: 'Revealing atomic structure',
    icon: '🔬',
    details: [
      'X-rays have wavelengths similar to atomic spacing (~0.1nm)',
      'Crystal lattice acts as a 3D diffraction grating',
      'Diffraction pattern reveals atomic arrangement',
      'Used to discover DNA double helix structure (Rosalind Franklin)',
    ],
  },
  {
    id: 3,
    title: 'Holography',
    description: '3D images from interference',
    icon: '✨',
    details: [
      'Hologram records interference pattern between object and reference beams',
      'When illuminated, diffraction recreates the original wavefront',
      'Produces true 3D images viewable from different angles',
      'Security holograms on credit cards use the same principle',
    ],
  },
  {
    id: 4,
    title: 'Electron Microscopy',
    description: 'Seeing atoms',
    icon: '🔎',
    details: [
      'Electron wavelength is ~100,000x smaller than visible light',
      'Can resolve individual atoms via electron diffraction',
      'Transmission electron microscopes achieve 0.05nm resolution',
      'Confirmed quantum mechanics predictions about matter waves',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DiffractionRenderer() {
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
  const [slitWidth, setSlitWidth] = useState(50); // Arbitrary units
  const [slitSeparation, setSlitSeparation] = useState(100); // For double slit
  const [wavelength, setWavelength] = useState<'red' | 'green' | 'blue'>('red');
  const [slitMode, setSlitMode] = useState<'single' | 'double'>('single');
  const [showWaves, setShowWaves] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationPhase((prev) => (prev + 2) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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
  const calculateSingleSlitPattern = useCallback(() => {
    const points: number[] = [];
    const lambda = WAVELENGTHS[wavelength].wavelength / 500; // Normalized
    const a = slitWidth / 50; // Normalized slit width

    for (let i = -100; i <= 100; i++) {
      const theta = (i / 100) * 0.15; // Small angle approximation
      const beta = (Math.PI * a * Math.sin(theta)) / lambda;

      // Single slit intensity: I = I0 * (sin(β)/β)²
      const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
      points.push(intensity);
    }
    return points;
  }, [slitWidth, wavelength]);

  const calculateDoubleSlitPattern = useCallback(() => {
    const points: number[] = [];
    const lambda = WAVELENGTHS[wavelength].wavelength / 500;
    const a = slitWidth / 50;
    const d = slitSeparation / 50;

    for (let i = -100; i <= 100; i++) {
      const theta = (i / 100) * 0.15;
      const beta = (Math.PI * a * Math.sin(theta)) / lambda;
      const delta = (Math.PI * d * Math.sin(theta)) / lambda;

      // Double slit: single-slit envelope × double-slit interference
      const singleSlitFactor = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
      const doubleSlitFactor = Math.pow(Math.cos(delta), 2);
      points.push(singleSlitFactor * doubleSlitFactor);
    }
    return points;
  }, [slitWidth, slitSeparation, wavelength]);

  const pattern = slitMode === 'single' ? calculateSingleSlitPattern() : calculateDoubleSlitPattern();

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
  // DIFFRACTION VISUALIZATION
  // =============================================================================
  const renderDiffractionVisualization = useCallback(() => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 380 : 450;
    const laserColor = WAVELENGTHS[wavelength].color;

    // Positions
    const laserX = 30;
    const laserY = height * 0.4;
    const slitX = width * 0.35;
    const screenX = width - 40;

    // Pattern display height
    const patternHeight = height * 0.7;
    const patternTop = height * 0.15;

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
            {/* Laser glow */}
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Screen gradient based on pattern */}
            <linearGradient id="patternGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              {pattern.map((intensity, i) => (
                <stop
                  key={i}
                  offset={`${(i / pattern.length) * 100}%`}
                  stopColor={laserColor}
                  stopOpacity={intensity * 0.9 + 0.1}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill={defined.colors.background.secondary} rx="12" />

          {/* Title */}
          <text
            x={width / 2}
            y={25}
            fill={defined.colors.text.muted}
            fontSize="14"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            {slitMode === 'single' ? 'Single Slit' : 'Double Slit'} Diffraction
          </text>

          {/* Laser source */}
          <rect x={laserX - 10} y={laserY - 15} width="30" height="30" fill="#374151" rx="4" />
          <rect x={laserX - 5} y={laserY - 10} width="20" height="20" fill="#4B5563" rx="2" />
          <circle cx={laserX + 18} cy={laserY} r="4" fill={laserColor} filter="url(#laserGlow)" />
          <text
            x={laserX + 5}
            y={laserY + 35}
            fill={defined.colors.text.muted}
            fontSize="10"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            Laser
          </text>

          {/* Laser beam to slit */}
          <line
            x1={laserX + 22}
            y1={laserY}
            x2={slitX - 5}
            y2={laserY}
            stroke={laserColor}
            strokeWidth="3"
            filter="url(#laserGlow)"
          />

          {/* Slit barrier */}
          <rect x={slitX - 5} y={patternTop} width="10" height={patternHeight} fill="#1F2937" />

          {/* Slits */}
          {slitMode === 'single' ? (
            // Single slit
            <rect
              x={slitX - 5}
              y={laserY - slitWidth / 4}
              width="10"
              height={slitWidth / 2}
              fill={defined.colors.background.secondary}
            />
          ) : (
            // Double slit
            <>
              <rect
                x={slitX - 5}
                y={laserY - slitSeparation / 4 - slitWidth / 8}
                width="10"
                height={slitWidth / 4}
                fill={defined.colors.background.secondary}
              />
              <rect
                x={slitX - 5}
                y={laserY + slitSeparation / 4 - slitWidth / 8}
                width="10"
                height={slitWidth / 4}
                fill={defined.colors.background.secondary}
              />
            </>
          )}

          <text
            x={slitX}
            y={height - 15}
            fill={defined.colors.text.muted}
            fontSize="10"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            {slitMode === 'single' ? 'Slit' : 'Slits'}
          </text>

          {/* Wave visualization */}
          {showWaves && (
            <g opacity={0.3}>
              {/* Circular waves from slit(s) */}
              {slitMode === 'single' ? (
                // Single source waves
                [0, 1, 2, 3, 4, 5].map((i) => {
                  const radius = 30 + i * 25 + (animationPhase % 25);
                  return (
                    <circle
                      key={i}
                      cx={slitX}
                      cy={laserY}
                      r={radius}
                      fill="none"
                      stroke={laserColor}
                      strokeWidth="1"
                      opacity={1 - i * 0.15}
                      style={{
                        clipPath: `polygon(${slitX}px 0, ${screenX}px 0, ${screenX}px ${height}px, ${slitX}px ${height}px)`,
                      }}
                    />
                  );
                })
              ) : (
                // Two source waves
                <>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const radius = 25 + i * 22 + (animationPhase % 22);
                    return (
                      <g key={i}>
                        <circle
                          cx={slitX}
                          cy={laserY - slitSeparation / 4}
                          r={radius}
                          fill="none"
                          stroke={laserColor}
                          strokeWidth="1"
                          opacity={0.7 - i * 0.12}
                        />
                        <circle
                          cx={slitX}
                          cy={laserY + slitSeparation / 4}
                          r={radius}
                          fill="none"
                          stroke={laserColor}
                          strokeWidth="1"
                          opacity={0.7 - i * 0.12}
                        />
                      </g>
                    );
                  })}
                </>
              )}
            </g>
          )}

          {/* Diffracted light rays (simplified) */}
          {[...Array(11)].map((_, i) => {
            const angle = ((i - 5) / 5) * 0.25;
            const endY = laserY + Math.tan(angle) * (screenX - slitX);
            const intensity = pattern[Math.floor((i / 11) * pattern.length + pattern.length / 2)];

            return (
              <line
                key={i}
                x1={slitX + 5}
                y1={laserY}
                x2={screenX - 10}
                y2={endY}
                stroke={laserColor}
                strokeWidth={1}
                opacity={intensity * 0.3}
              />
            );
          })}

          {/* Screen */}
          <rect x={screenX - 10} y={patternTop} width="15" height={patternHeight} fill="#1F2937" rx="2" />

          {/* Diffraction pattern on screen */}
          <rect
            x={screenX - 8}
            y={patternTop + 2}
            width="11"
            height={patternHeight - 4}
            fill="url(#patternGradient)"
            rx="1"
          />

          <text
            x={screenX - 3}
            y={height - 15}
            fill={defined.colors.text.muted}
            fontSize="10"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            Screen
          </text>

          {/* Pattern indicators */}
          {slitMode === 'double' && (
            <g>
              <text
                x={screenX + 15}
                y={laserY}
                fill={defined.colors.text.muted}
                fontSize="9"
                fontFamily={defined.typography.fontFamily}
              >
                m=0
              </text>
              <text
                x={screenX + 15}
                y={laserY - 35}
                fill={defined.colors.text.muted}
                fontSize="9"
                fontFamily={defined.typography.fontFamily}
              >
                m=1
              </text>
              <text
                x={screenX + 15}
                y={laserY + 35}
                fill={defined.colors.text.muted}
                fontSize="9"
                fontFamily={defined.typography.fontFamily}
              >
                m=1
              </text>
            </g>
          )}
        </svg>

        {/* Pattern graph */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.md,
            width: '100%',
            maxWidth: width,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.muted,
              marginBottom: defined.spacing.sm,
              textAlign: 'center',
            }}
          >
            Intensity Pattern
          </div>
          <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">
            <path
              d={`M 0 ${60 - pattern[0] * 50} ${pattern
                .map((p, i) => `L ${(i / pattern.length) * 200} ${60 - p * 50}`)
                .join(' ')}`}
              fill="none"
              stroke={laserColor}
              strokeWidth="2"
            />
            {/* Filled area */}
            <path
              d={`M 0 60 L 0 ${60 - pattern[0] * 50} ${pattern
                .map((p, i) => `L ${(i / pattern.length) * 200} ${60 - p * 50}`)
                .join(' ')} L 200 60 Z`}
              fill={`${laserColor}30`}
            />
          </svg>
        </div>
      </div>
    );
  }, [isMobile, wavelength, slitWidth, slitSeparation, slitMode, showWaves, pattern, animationPhase]);

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
          width: isMobile ? '100%' : '260px',
        }}
      >
        {/* Slit Mode Toggle */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Slit Type
          </label>
          <div style={{ display: 'flex', gap: defined.spacing.xs }}>
            {(['single', 'double'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSlitMode(mode)}
                style={{
                  flex: 1,
                  padding: defined.spacing.sm,
                  borderRadius: defined.radius.md,
                  border:
                    slitMode === mode
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    slitMode === mode
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: defined.colors.text.primary,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Slit Width */}
        <div>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            <span>Slit Width</span>
            <span style={{ color: defined.colors.text.primary }}>{slitWidth} μm</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={slitWidth}
            onChange={(e) => setSlitWidth(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: defined.colors.primary,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
            }}
          >
            <span>Narrow</span>
            <span>Wide</span>
          </div>
        </div>

        {/* Slit Separation (double slit only) */}
        {slitMode === 'double' && (
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: defined.typography.sizes.sm,
                color: defined.colors.text.secondary,
                marginBottom: defined.spacing.sm,
              }}
            >
              <span>Slit Separation</span>
              <span style={{ color: defined.colors.text.primary }}>{slitSeparation} μm</span>
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={slitSeparation}
              onChange={(e) => setSlitSeparation(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: defined.colors.accent,
              }}
            />
          </div>
        )}

        {/* Wavelength Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Laser Wavelength
          </label>
          <div style={{ display: 'flex', gap: defined.spacing.xs }}>
            {Object.entries(WAVELENGTHS).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setWavelength(key as typeof wavelength)}
                style={{
                  flex: 1,
                  padding: defined.spacing.sm,
                  borderRadius: defined.radius.md,
                  border:
                    wavelength === key
                      ? `2px solid ${data.color}`
                      : '2px solid transparent',
                  background:
                    wavelength === key
                      ? `${data.color}30`
                      : defined.colors.background.secondary,
                  color: data.color,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: data.color,
                  }}
                />
                {data.wavelength}nm
              </button>
            ))}
          </div>
        </div>

        {/* Show Waves Toggle */}
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
            Show Waves
          </span>
          <button
            onClick={() => setShowWaves(!showWaves)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showWaves ? defined.colors.primary : defined.colors.background.tertiary,
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
                left: showWaves ? '23px' : '3px',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* Key insight */}
        <div
          style={{
            background: `${WAVELENGTHS[wavelength].color}15`,
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            border: `1px solid ${WAVELENGTHS[wavelength].color}30`,
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: WAVELENGTHS[wavelength].color,
              fontWeight: defined.typography.weights.semibold,
              marginBottom: defined.spacing.xs,
            }}
          >
            {slitMode === 'single' ? '📊 Single Slit' : '📊 Double Slit'}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.secondary,
            }}
          >
            {slitMode === 'single'
              ? 'Narrower slit → wider central maximum'
              : 'More fringes from wave interference between two sources'}
          </div>
        </div>
      </div>
    ),
    [isMobile, slitMode, slitWidth, slitSeparation, wavelength, showWaves]
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
        🔦〰️
      </div>
      <h1
        style={{
          fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Light Bends Around Corners
      </h1>
      <p
        style={{
          fontSize: defined.typography.sizes.lg,
          color: defined.colors.text.secondary,
          maxWidth: '500px',
          lineHeight: 1.6,
        }}
      >
        Shine a laser through a tiny slit. Instead of a sharp line, you see
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          {' '}
          bands of light spreading outward
        </span>
        . This "diffraction" pattern proves light is a wave!
      </p>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          maxWidth: '450px',
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
          DIFFRACTION PATTERN
        </div>
        {/* Simple illustration */}
        <svg width="280" height="80" style={{ margin: '0 auto', display: 'block' }}>
          {/* Central maximum */}
          <rect x="125" y="10" width="30" height="60" fill="#EF4444" opacity="0.9" rx="2" />
          {/* Side maxima */}
          <rect x="100" y="20" width="20" height="40" fill="#EF4444" opacity="0.5" rx="2" />
          <rect x="160" y="20" width="20" height="40" fill="#EF4444" opacity="0.5" rx="2" />
          <rect x="75" y="25" width="15" height="30" fill="#EF4444" opacity="0.3" rx="2" />
          <rect x="190" y="25" width="15" height="30" fill="#EF4444" opacity="0.3" rx="2" />
          {/* Label */}
          <text
            x="140"
            y="75"
            fill={defined.colors.text.muted}
            fontSize="9"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            Central maximum
          </text>
        </svg>
        <p
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.secondary,
            marginTop: defined.spacing.md,
          }}
        >
          If light were particles, you'd see a sharp shadow. But waves spread out and interfere!
        </p>
      </div>

      {Button({
        children: 'Explore Diffraction →',
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
        If you make the slit NARROWER, what happens to the diffraction pattern on the screen?
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
          { id: 'wider', text: 'Pattern gets WIDER (more spreading)' },
          { id: 'narrower', text: 'Pattern gets NARROWER (less spreading)' },
          { id: 'same', text: 'Pattern stays the same size' },
          { id: 'disappears', text: 'Pattern disappears completely' },
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
        Explore Single Slit Diffraction
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust the slit width and wavelength. Watch how the diffraction pattern changes!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '850px',
        }}
      >
        {renderDiffractionVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'I See the Pattern → Review',
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
        The Wave Nature of Light
      </h2>

      <div
        style={{
          background:
            prediction === 'wider' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'wider' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'wider' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'wider' ? '✓ Correct!' : '✗ Counterintuitive!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Narrower slits produce WIDER patterns! This is opposite to what we'd expect from
          particles. Smaller apertures cause waves to spread more - a signature of wave behavior.
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>〰️</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Huygens' Principle
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Every point on a wavefront acts as a source of secondary wavelets. At a narrow slit,
            these wavelets spread widely.
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>⚡</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Interference
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Waves from different parts of the slit interfere. In phase = bright bands. Out of phase
            = dark bands.
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📐</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Single Slit Formula
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Minima occur at: a·sin(θ) = mλ
            <br />
            Where a = slit width, m = 1, 2, 3...
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔴</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Wavelength Effect
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Longer wavelength (red) → wider pattern. Blue light creates narrower fringes than red
            light.
          </p>
        </div>
      </div>

      {Button({
        children: 'Try Double Slit →',
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
        Young's Double-Slit Experiment
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Now use TWO slits instead of one. How will the pattern change compared to a single slit?
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
          { id: 'more', text: 'MORE fringes - interference creates additional bright/dark bands' },
          { id: 'same', text: 'SAME pattern - two slits act like one wider slit' },
          { id: 'blur', text: 'BLUR - light from two slits cancels randomly' },
          { id: 'double', text: 'TWO separate patterns - one from each slit' },
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
        children: 'See Double Slit Pattern →',
        onClick: () => {
          setSlitMode('double');
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
          📡 DOUBLE SLIT INTERFERENCE
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
        Two Sources, One Pattern
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust slit separation and see how the interference pattern changes. More separation =
        closer fringes!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '850px',
        }}
      >
        {renderDiffractionVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'See the Science →',
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
        The Historic Proof of Light Waves!
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'more' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
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
          {twistPrediction === 'more' ? '✓ Exactly right!' : '✗ The pattern is surprising!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Waves from both slits interfere, creating many more bright and dark fringes. This pattern
          is impossible to explain with particles - it's proof that light is a wave!
        </p>
      </div>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          maxWidth: '600px',
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
          Thomas Young's 1801 Discovery
        </h3>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, marginBottom: defined.spacing.md }}>
          Young's double-slit experiment definitively proved light's wave nature. The interference
          pattern could only be explained by waves - not Newton's "corpuscles" (particles).
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: defined.spacing.xl,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: defined.typography.sizes.lg,
                color: defined.colors.primary,
              }}
            >
              d·sin(θ) = mλ
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Bright fringes (maxima)
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: defined.typography.sizes.lg,
                color: defined.colors.accent,
              }}
            >
              d·sin(θ) = (m+½)λ
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Dark fringes (minima)
            </div>
          </div>
        </div>
      </div>

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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📏</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Path Difference
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Waves from two slits travel different distances. Where difference = whole wavelengths,
            they add (bright). Half wavelengths = cancel (dark).
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🎯</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Central Maximum
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            At the center, both waves travel equal distances - zero path difference - always a
            bright spot (m = 0).
          </p>
        </div>
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
          {passed ? '〰️' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'Wave Master!' : 'Keep Practicing!'}
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>〰️</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Wave Behavior
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
              Interference
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🔬</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Crystallography
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
            ? "You understand how diffraction reveals light's wave nature - from Young's historic experiment to modern X-ray crystallography!"
            : "Review diffraction concepts and try again. Understanding wave behavior is essential for modern physics!"}
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
              setSlitMode('single');
              setSlitWidth(50);
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
