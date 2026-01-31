'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DISPERSION RENDERER - THE CD RAINBOW
// =============================================================================
// Premium educational game demonstrating light dispersion - how white light
// separates into its component colors. Students explore prisms, rainbows,
// and the wavelength-dependent nature of refraction.
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
    spectrum: {
      red: '#EF4444',
      orange: '#F97316',
      yellow: '#EAB308',
      green: '#22C55E',
      blue: '#3B82F6',
      indigo: '#6366F1',
      violet: '#8B5CF6',
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
// Refractive indices for different wavelengths (glass prism)
const WAVELENGTHS = {
  red: { name: 'Red', wavelength: 700, n: 1.513, color: '#EF4444' },
  orange: { name: 'Orange', wavelength: 620, n: 1.517, color: '#F97316' },
  yellow: { name: 'Yellow', wavelength: 580, n: 1.519, color: '#EAB308' },
  green: { name: 'Green', wavelength: 550, n: 1.521, color: '#22C55E' },
  blue: { name: 'Blue', wavelength: 470, n: 1.526, color: '#3B82F6' },
  indigo: { name: 'Indigo', wavelength: 445, n: 1.529, color: '#6366F1' },
  violet: { name: 'Violet', wavelength: 400, n: 1.532, color: '#8B5CF6' },
};

const PRISM_MATERIALS: Record<string, { name: string; dispersion: number }> = {
  crown: { name: 'Crown Glass', dispersion: 1.0 },
  flint: { name: 'Flint Glass', dispersion: 1.5 },
  diamond: { name: 'Diamond', dispersion: 2.2 },
  water: { name: 'Water Droplet', dispersion: 0.6 },
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

interface QuestionOption {
  text: string;
  correct: boolean;
}

interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
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
    question: 'Why does a prism separate white light into colors?',
    options: [
      { text: 'The prism adds color to the light', correct: false },
      { text: 'Different wavelengths refract by different amounts', correct: true },
      { text: 'The prism filters out some colors', correct: false },
      { text: 'Light bounces inside the prism', correct: false },
    ],
    explanation:
      'Each wavelength (color) has a slightly different refractive index in glass. Blue light bends more than red, so colors fan out into a spectrum.',
  },
  {
    id: 2,
    question: 'In a prism, which color bends the MOST?',
    options: [
      { text: 'Red', correct: false },
      { text: 'Yellow', correct: false },
      { text: 'Green', correct: false },
      { text: 'Violet', correct: true },
    ],
    explanation:
      'Violet light has the shortest wavelength and highest refractive index in glass (n ≈ 1.532), so it bends the most. Red bends the least (n ≈ 1.513).',
  },
  {
    id: 3,
    question: 'What is the order of colors in a rainbow (top to bottom)?',
    options: [
      { text: 'VIBGYOR (violet to red)', correct: false },
      { text: 'ROYGBIV (red to violet)', correct: true },
      { text: 'Random - depends on conditions', correct: false },
      { text: 'All colors appear equal', correct: false },
    ],
    explanation:
      'In a primary rainbow, red is on top and violet on bottom (ROYGBIV). This is because red refracts the least and appears at a higher angle to the observer.',
  },
  {
    id: 4,
    question: 'Why does a CD show rainbow colors?',
    options: [
      { text: 'The CD contains colored dyes', correct: false },
      { text: 'Light diffracts off the tiny grooves on the surface', correct: true },
      { text: 'The plastic absorbs certain colors', correct: false },
      { text: 'Static electricity separates the light', correct: false },
    ],
    explanation:
      'CD tracks are microscopic grooves that act as a diffraction grating. Different wavelengths diffract at different angles, creating rainbow patterns.',
  },
  {
    id: 5,
    question: 'What phenomenon causes diamond "fire" (rainbow flashes)?',
    options: [
      { text: 'Diamond is radioactive', correct: false },
      { text: 'High dispersion spreads colors more than other gems', correct: true },
      { text: 'Diamond reflects all light', correct: false },
      { text: 'Internal heating', correct: false },
    ],
    explanation:
      "Diamond has very high dispersion (0.044 vs 0.017 for crown glass). Colors spread more dramatically, creating the brilliant rainbow flashes called 'fire'.",
  },
  {
    id: 6,
    question: 'Why is the sky blue but sunsets red?',
    options: [
      { text: 'The sun changes color during the day', correct: false },
      { text: 'Blue light scatters more, but at sunset light travels through more atmosphere', correct: true },
      { text: 'The atmosphere is blue-colored', correct: false },
      { text: 'Our eyes perceive differently at different times', correct: false },
    ],
    explanation:
      'Blue light scatters more (Rayleigh scattering). At sunset, light travels through more atmosphere, scattering away blue and leaving red/orange.',
  },
  {
    id: 7,
    question: 'A second rainbow (double rainbow) appears above the primary one. What is different?',
    options: [
      { text: 'Colors are in the same order', correct: false },
      { text: 'Colors are reversed (violet on top, red on bottom)', correct: true },
      { text: "It's always brighter", correct: false },
      { text: 'Only red and blue appear', correct: false },
    ],
    explanation:
      'Secondary rainbows form from two internal reflections in water droplets, reversing the color order. They appear above the primary rainbow and are dimmer.',
  },
  {
    id: 8,
    question: 'What is "dispersion" in optics?',
    options: [
      { text: 'Light spreading out in all directions', correct: false },
      { text: 'The variation of refractive index with wavelength', correct: true },
      { text: 'Light being absorbed by a material', correct: false },
      { text: 'Light intensity decreasing with distance', correct: false },
    ],
    explanation:
      "Dispersion is specifically the wavelength-dependence of refractive index. Higher dispersion means colors separate more when light refracts.",
  },
  {
    id: 9,
    question: 'Why do achromatic lenses use two types of glass?',
    options: [
      { text: 'To make the lens stronger', correct: false },
      { text: 'To cancel out dispersion and focus all colors at the same point', correct: true },
      { text: 'To increase magnification', correct: false },
      { text: 'To reduce weight', correct: false },
    ],
    explanation:
      'Achromatic lenses combine crown glass (low dispersion) and flint glass (high dispersion) to cancel chromatic aberration, focusing all colors together.',
  },
  {
    id: 10,
    question: 'What creates the "green flash" sometimes seen at sunset?',
    options: [
      { text: 'A special type of cloud', correct: false },
      { text: 'Atmospheric dispersion separating colors at the horizon', correct: true },
      { text: 'Reflection from the ocean', correct: false },
      { text: 'An optical illusion', correct: false },
    ],
    explanation:
      "The atmosphere acts like a giant prism. At sunset, refraction separates colors vertically. When red sets first, a brief green band can appear - the 'green flash'.",
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'Rainbows',
    description: 'Nature\'s spectrum display',
    icon: '🌈',
    details: [
      'Raindrops act as tiny prisms, refracting sunlight into colors',
      'Each droplet sends one color to your eye - you see millions of droplets',
      'Rainbow appears at 42° from the antisolar point (opposite the sun)',
      'Double rainbows occur from second internal reflection, reversing colors',
    ],
  },
  {
    id: 2,
    title: 'Spectroscopy',
    description: 'Reading light signatures',
    icon: '🔬',
    details: [
      'Prisms/gratings separate light into spectrum for analysis',
      'Every element has unique spectral "fingerprint" emission lines',
      'Astronomers identify distant star compositions from light spectra',
      'Medical labs analyze blood samples using spectroscopic techniques',
    ],
  },
  {
    id: 3,
    title: 'Diamond Fire',
    description: 'The rainbow sparkle',
    icon: '💎',
    details: [
      'Diamond dispersion (0.044) is 2.5x higher than typical glass',
      'Colors spread dramatically as light exits through facets',
      'Brilliant cuts maximize the "fire" by creating many light paths',
      'Cubic zirconia actually has higher dispersion (0.060) than diamond',
    ],
  },
  {
    id: 4,
    title: 'CD/DVD Technology',
    description: 'Diffraction rainbows',
    icon: '💿',
    details: [
      'Data stored in spiral tracks of microscopic pits',
      'Track spacing (~1.6μm for CDs) creates diffraction grating effect',
      'Different wavelengths diffract at different angles, showing colors',
      'Holographic security features use similar diffraction principles',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
  twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review',
  transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

export default function DispersionRenderer() {
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
  const [prismAngle, setPrismAngle] = useState(60);
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [prismMaterial, setPrismMaterial] = useState<'crown' | 'flint' | 'diamond' | 'water'>('crown');
  const [showLabels, setShowLabels] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Audio feedback
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not supported */ }
  }, []);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography responsive system
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationPhase((prev) => (prev + 0.5) % 360);
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
  const calculateDispersionAngles = useCallback(() => {
    const dispersionFactor = PRISM_MATERIALS[prismMaterial].dispersion;
    const baseSpread = (prismAngle / 60) * 15 * dispersionFactor;

    return Object.entries(WAVELENGTHS).map(([key, data]) => {
      // Longer wavelengths bend less
      const normalizedWavelength = (data.wavelength - 400) / 300; // 0 for violet, 1 for red
      const angle = incidentAngle + baseSpread * (1 - normalizedWavelength);
      return {
        key,
        ...data,
        exitAngle: angle,
      };
    });
  }, [prismAngle, incidentAngle, prismMaterial]);

  const dispersedColors = calculateDispersionAngles();
  const totalSpread = dispersedColors[0].exitAngle - dispersedColors[dispersedColors.length - 1].exitAngle;

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

      if (questions[currentQuestion].options[index]?.correct) {
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
  // PRISM VISUALIZATION - Premium SVG Graphics
  // =============================================================================
  const renderPrismVisualization = useCallback(() => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 320 : 400;

    // Prism geometry
    const prismSize = isMobile ? 100 : 140;
    const prismCenterX = width * 0.4;
    const prismCenterY = height * 0.5;

    // Simple triangular prism
    const prismPoints = [
      { x: prismCenterX, y: prismCenterY - prismSize * 0.7 }, // top
      { x: prismCenterX - prismSize * 0.6, y: prismCenterY + prismSize * 0.5 }, // bottom-left
      { x: prismCenterX + prismSize * 0.6, y: prismCenterY + prismSize * 0.5 }, // bottom-right
    ];

    // Incident ray position
    const rayStartX = 30;
    const rayStartY = prismCenterY;
    const rayHitX = prismCenterX - prismSize * 0.3;
    const rayHitY = prismCenterY;

    // Exit point on right face
    const exitX = prismCenterX + prismSize * 0.2;
    const exitY = prismCenterY + prismSize * 0.1;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}
      >
        {/* Prism title label - moved outside SVG */}
        <div
          style={{
            fontSize: typo.small,
            color: defined.colors.text.muted,
            fontFamily: defined.typography.fontFamily,
            textAlign: 'center',
          }}
        >
          {PRISM_MATERIALS[prismMaterial].name} Prism
        </div>

        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            {/* ============================================ */}
            {/* PREMIUM GRADIENT DEFINITIONS - disp* prefix */}
            {/* ============================================ */}

            {/* Lab background gradient */}
            <linearGradient id="dispLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Premium prism glass gradient with refraction effect */}
            <linearGradient id="dispPrismGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(200, 220, 255, 0.35)" />
              <stop offset="20%" stopColor="rgba(180, 200, 240, 0.25)" />
              <stop offset="40%" stopColor="rgba(160, 180, 220, 0.15)" />
              <stop offset="60%" stopColor="rgba(180, 200, 240, 0.20)" />
              <stop offset="80%" stopColor="rgba(200, 220, 255, 0.30)" />
              <stop offset="100%" stopColor="rgba(220, 240, 255, 0.25)" />
            </linearGradient>

            {/* Prism internal refraction gradient */}
            <radialGradient id="dispPrismInternal" cx="30%" cy="30%" r="80%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="30%" stopColor="rgba(200, 220, 255, 0.08)" />
              <stop offset="60%" stopColor="rgba(180, 200, 240, 0.05)" />
              <stop offset="100%" stopColor="rgba(160, 180, 220, 0.02)" />
            </radialGradient>

            {/* White light beam gradient */}
            <linearGradient id="dispWhiteLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#FFFEF8" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="80%" stopColor="#FFFEF8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
            </linearGradient>

            {/* Light source radial gradient */}
            <radialGradient id="dispLightSource" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="30%" stopColor="#FFFEF0" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#FFF8E1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFECB3" stopOpacity="0" />
            </radialGradient>

            {/* Rainbow spectrum gradient - vertical for screen display */}
            <linearGradient id="dispRainbowVertical" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="14%" stopColor="#6366F1" />
              <stop offset="28%" stopColor="#3B82F6" />
              <stop offset="43%" stopColor="#22C55E" />
              <stop offset="57%" stopColor="#EAB308" />
              <stop offset="71%" stopColor="#F97316" />
              <stop offset="85%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>

            {/* Individual color ray gradients for glow effect */}
            <linearGradient id="dispRayRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
              <stop offset="50%" stopColor="#F87171" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayOrange" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="1" />
              <stop offset="50%" stopColor="#FB923C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EAB308" stopOpacity="1" />
              <stop offset="50%" stopColor="#FACC15" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#EAB308" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="1" />
              <stop offset="50%" stopColor="#4ADE80" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayIndigo" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="dispRayViolet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
              <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="dispInfoPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(30, 41, 59, 0.95)" />
              <stop offset="50%" stopColor="rgba(30, 41, 59, 0.9)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
            </linearGradient>

            {/* ============================================ */}
            {/* PREMIUM FILTER DEFINITIONS                  */}
            {/* ============================================ */}

            {/* White light glow filter */}
            <filter id="dispWhiteLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Color ray glow filter */}
            <filter id="dispRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for light source */}
            <filter id="dispSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="12" result="blur2" />
              <feGaussianBlur stdDeviation="20" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Prism glass refraction shimmer */}
            <filter id="dispPrismShimmer" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Spectrum screen glow */}
            <filter id="dispSpectrumGlow" x="-30%" y="-10%" width="160%" height="120%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner glow for panels */}
            <filter id="dispPanelGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium background with gradient */}
          <rect width={width} height={height} fill="url(#dispLabBg)" rx="12" />

          {/* Subtle grid pattern */}
          <defs>
            <pattern id="dispGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="rgba(100, 116, 139, 0.1)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#dispGrid)" rx="12" opacity="0.5" />

          {/* Premium glass prism with refraction effect */}
          <polygon
            points={prismPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="url(#dispPrismGlass)"
            stroke="rgba(200, 220, 255, 0.4)"
            strokeWidth="2"
            filter="url(#dispPrismShimmer)"
          />

          {/* Prism internal refraction overlay */}
          <polygon
            points={prismPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="url(#dispPrismInternal)"
          />

          {/* Prism edge highlights for 3D glass effect */}
          <line
            x1={prismPoints[0].x}
            y1={prismPoints[0].y}
            x2={prismPoints[1].x}
            y2={prismPoints[1].y}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1.5"
          />
          <line
            x1={prismPoints[0].x}
            y1={prismPoints[0].y}
            x2={prismPoints[2].x}
            y2={prismPoints[2].y}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />

          {/* Premium white light beam with glow */}
          <line
            x1={rayStartX}
            y1={rayStartY}
            x2={rayHitX}
            y2={rayHitY}
            stroke="url(#dispWhiteLight)"
            strokeWidth="6"
            filter="url(#dispWhiteLightGlow)"
            strokeLinecap="round"
          />

          {/* Light source with premium glow effect */}
          <circle cx={rayStartX} cy={rayStartY} r="20" fill="url(#dispLightSource)" filter="url(#dispSourceGlow)" />
          <circle cx={rayStartX} cy={rayStartY} r="12" fill="white" opacity="0.95" />
          <circle cx={rayStartX} cy={rayStartY} r="6" fill="white" />

          {/* Light path inside prism - transitioning to rainbow */}
          <line
            x1={rayHitX}
            y1={rayHitY}
            x2={exitX}
            y2={exitY}
            stroke="white"
            strokeWidth="4"
            opacity="0.5"
            strokeLinecap="round"
          />
          {/* Rainbow hint inside prism */}
          <line
            x1={rayHitX + 5}
            y1={rayHitY - 2}
            x2={exitX}
            y2={exitY - 5}
            stroke="rgba(139, 92, 246, 0.3)"
            strokeWidth="2"
          />
          <line
            x1={rayHitX + 5}
            y1={rayHitY + 2}
            x2={exitX}
            y2={exitY + 5}
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="2"
          />

          {/* Dispersed rainbow rays exiting prism */}
          {dispersedColors.map((color, i) => {
            // Calculate exit angle for each color
            const angleOffset = ((i - 3) * totalSpread) / 7;
            const exitAngleRad = ((30 + angleOffset) * Math.PI) / 180;

            const rayLength = isMobile ? 120 : 180;
            const rayEndX = exitX + Math.cos(exitAngleRad) * rayLength;
            const rayEndY = exitY + Math.sin(exitAngleRad) * rayLength;

            // Animate with slight pulse
            const pulse = 0.85 + 0.15 * Math.sin((animationPhase + i * 30) * (Math.PI / 180));

            // Map color key to gradient
            const gradientMap: Record<string, string> = {
              red: 'url(#dispRayRed)',
              orange: 'url(#dispRayOrange)',
              yellow: 'url(#dispRayYellow)',
              green: 'url(#dispRayGreen)',
              blue: 'url(#dispRayBlue)',
              indigo: 'url(#dispRayIndigo)',
              violet: 'url(#dispRayViolet)',
            };

            return (
              <g key={color.key}>
                {/* Outer glow layer */}
                <line
                  x1={exitX}
                  y1={exitY}
                  x2={rayEndX}
                  y2={rayEndY}
                  stroke={color.color}
                  strokeWidth={6 * pulse}
                  opacity={0.3}
                  filter="url(#dispRayGlow)"
                  strokeLinecap="round"
                />
                {/* Main ray with gradient */}
                <line
                  x1={exitX}
                  y1={exitY}
                  x2={rayEndX}
                  y2={rayEndY}
                  stroke={gradientMap[color.key] || color.color}
                  strokeWidth={3 * pulse}
                  filter="url(#dispRayGlow)"
                  opacity={0.95}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Premium spectrum screen with glow */}
          <rect
            x={width - 65}
            y={height * 0.18}
            width="35"
            height={height * 0.64}
            fill="url(#dispRainbowVertical)"
            rx="6"
            filter="url(#dispSpectrumGlow)"
          />
          {/* Screen frame */}
          <rect
            x={width - 65}
            y={height * 0.18}
            width="35"
            height={height * 0.64}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1"
            rx="6"
          />

          {/* Premium info display panel */}
          <rect
            x={10}
            y={height - 75}
            width={170}
            height={60}
            fill="url(#dispInfoPanel)"
            rx="10"
            filter="url(#dispPanelGlow)"
          />
          <rect
            x={10}
            y={height - 75}
            width={170}
            height={60}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
            rx="10"
          />
          <text
            x={22}
            y={height - 52}
            fill={defined.colors.text.secondary}
            fontSize="11"
            fontFamily={defined.typography.fontFamily}
          >
            Prism angle: {prismAngle}°
          </text>
          <text
            x={22}
            y={height - 35}
            fill={defined.colors.text.secondary}
            fontSize="11"
            fontFamily={defined.typography.fontFamily}
          >
            Color spread: {totalSpread.toFixed(1)}°
          </text>
          <text
            x={22}
            y={height - 18}
            fill={defined.colors.accent}
            fontSize="11"
            fontFamily={defined.typography.fontFamily}
            fontWeight="600"
          >
            Dispersion: {PRISM_MATERIALS[prismMaterial].dispersion}x
          </text>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        {showLabels && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: `${width}px`,
              padding: `0 ${defined.spacing.md}`,
            }}
          >
            <span
              style={{
                fontSize: typo.label,
                color: defined.colors.text.secondary,
                fontFamily: defined.typography.fontFamily,
              }}
            >
              White Light Source
            </span>
            <span
              style={{
                fontSize: typo.label,
                color: defined.colors.text.secondary,
                fontFamily: defined.typography.fontFamily,
              }}
            >
              Spectrum Display
            </span>
          </div>
        )}

        {/* Wavelength info with premium styling */}
        <div
          style={{
            display: 'flex',
            gap: defined.spacing.xs,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '420px',
          }}
        >
          {Object.values(WAVELENGTHS).map((color) => (
            <div
              key={color.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: defined.spacing.xs,
                background: `linear-gradient(135deg, ${color.color}15, ${color.color}25)`,
                borderRadius: defined.radius.md,
                minWidth: '48px',
                border: `1px solid ${color.color}30`,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${color.color}, ${color.color}CC)`,
                  boxShadow: `0 0 8px ${color.color}60`,
                }}
              />
              <span
                style={{
                  fontSize: typo.label,
                  color: defined.colors.text.muted,
                  fontFamily: defined.typography.fontFamily,
                  marginTop: '2px',
                }}
              >
                {color.wavelength}nm
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [isMobile, prismAngle, prismMaterial, dispersedColors, totalSpread, showLabels, animationPhase, typo]);

  // =============================================================================
  // CD VISUALIZATION - Premium SVG Graphics (for twist)
  // =============================================================================
  const renderCDVisualization = useCallback(() => {
    const width = isMobile ? 300 : 400;
    const height = isMobile ? 250 : 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const cdRadius = isMobile ? 90 : 120;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.sm,
        }}
      >
        <svg width={width} height={height - 30}>
          <defs>
            {/* ============================================ */}
            {/* PREMIUM CD GRADIENT DEFINITIONS             */}
            {/* ============================================ */}

            {/* Premium lab background */}
            <linearGradient id="dispCdLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* CD base metallic gradient */}
            <radialGradient id="dispCdBase" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#2a2a4a" />
              <stop offset="30%" stopColor="#1a1a2e" />
              <stop offset="60%" stopColor="#252545" />
              <stop offset="100%" stopColor="#0f0f1e" />
            </radialGradient>

            {/* Premium rainbow diffraction gradient */}
            <radialGradient id="dispCdRainbow" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="15%" stopColor="rgba(139, 92, 246, 0.4)" />
              <stop offset="30%" stopColor="rgba(99, 102, 241, 0.35)" />
              <stop offset="45%" stopColor="rgba(59, 130, 246, 0.35)" />
              <stop offset="60%" stopColor="rgba(34, 197, 94, 0.35)" />
              <stop offset="75%" stopColor="rgba(234, 179, 8, 0.35)" />
              <stop offset="90%" stopColor="rgba(249, 115, 22, 0.35)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.3)" />
            </radialGradient>

            {/* Secondary rainbow layer for depth */}
            <radialGradient id="dispCdRainbow2" cx="60%" cy="60%" r="50%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
              <stop offset="25%" stopColor="rgba(234, 179, 8, 0.2)" />
              <stop offset="50%" stopColor="rgba(34, 197, 94, 0.2)" />
              <stop offset="75%" stopColor="rgba(59, 130, 246, 0.25)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.2)" />
            </radialGradient>

            {/* Animated sweep/reflection gradient */}
            <linearGradient
              id="dispCdSweep"
              gradientTransform={`rotate(${animationPhase}, 0.5, 0.5)`}
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0)" />
              <stop offset="48%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="52%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* CD center hole gradient */}
            <radialGradient id="dispCdHole" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* CD edge highlight */}
            <linearGradient id="dispCdEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
            </linearGradient>

            {/* ============================================ */}
            {/* PREMIUM CD FILTER DEFINITIONS               */}
            {/* ============================================ */}

            {/* CD surface shimmer glow */}
            <filter id="dispCdGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Rainbow arc glow */}
            <filter id="dispArcGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense reflection glow */}
            <filter id="dispReflectionGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Track groove pattern */}
            <pattern id="dispCdTracks" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.3" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height - 30} fill="url(#dispCdLabBg)" rx="12" />

          {/* Subtle ambient glow behind CD */}
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={cdRadius * 1.1}
            ry={cdRadius * 1.1}
            fill="rgba(139, 92, 246, 0.1)"
            filter="url(#dispCdGlow)"
          />

          {/* CD base with metallic finish */}
          <circle cx={centerX} cy={centerY} r={cdRadius} fill="url(#dispCdBase)" />

          {/* Primary rainbow diffraction layer */}
          <circle cx={centerX} cy={centerY} r={cdRadius} fill="url(#dispCdRainbow)" />

          {/* Secondary rainbow layer for depth */}
          <circle cx={centerX} cy={centerY} r={cdRadius} fill="url(#dispCdRainbow2)" opacity="0.7" />

          {/* Concentric data tracks with premium styling */}
          {[0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95].map((ratio, i) => (
            <circle
              key={i}
              cx={centerX}
              cy={centerY}
              r={cdRadius * ratio}
              fill="none"
              stroke={`rgba(255,255,255,${0.03 + i * 0.015})`}
              strokeWidth="0.5"
              strokeDasharray={i % 2 === 0 ? '2 4' : '4 2'}
            />
          ))}

          {/* Track pattern overlay */}
          <circle cx={centerX} cy={centerY} r={cdRadius} fill="url(#dispCdTracks)" opacity="0.5" />

          {/* Animated light sweep/reflection */}
          <circle cx={centerX} cy={centerY} r={cdRadius} fill="url(#dispCdSweep)" filter="url(#dispReflectionGlow)" />

          {/* Edge highlight ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={cdRadius - 1}
            fill="none"
            stroke="url(#dispCdEdge)"
            strokeWidth="2"
          />

          {/* Animated rainbow arcs showing diffraction */}
          {Object.values(WAVELENGTHS).map((color, i) => {
            const startAngle = animationPhase + i * 12;
            const arcRadius = cdRadius * (0.5 + (i * 0.05));
            const x1 = centerX + arcRadius * Math.cos((startAngle * Math.PI) / 180);
            const y1 = centerY + arcRadius * Math.sin((startAngle * Math.PI) / 180);
            const x2 = centerX + arcRadius * Math.cos(((startAngle + 25) * Math.PI) / 180);
            const y2 = centerY + arcRadius * Math.sin(((startAngle + 25) * Math.PI) / 180);

            const pulse = 0.7 + 0.3 * Math.sin((animationPhase + i * 20) * (Math.PI / 180));

            return (
              <g key={color.name}>
                {/* Glow layer */}
                <path
                  d={`M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={color.color}
                  strokeWidth={5 * pulse}
                  opacity={0.3}
                  filter="url(#dispArcGlow)"
                  strokeLinecap="round"
                />
                {/* Main arc */}
                <path
                  d={`M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={color.color}
                  strokeWidth={3 * pulse}
                  opacity={0.85}
                  filter="url(#dispArcGlow)"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Premium center hole with depth */}
          <circle cx={centerX} cy={centerY} r={cdRadius * 0.14} fill="url(#dispCdHole)" />
          <circle
            cx={centerX}
            cy={centerY}
            r={cdRadius * 0.14}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
          />
          {/* Inner ring highlight */}
          <circle
            cx={centerX}
            cy={centerY}
            r={cdRadius * 0.12}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Label moved outside SVG using typo system */}
        <div
          style={{
            fontSize: typo.small,
            color: defined.colors.text.muted,
            fontFamily: defined.typography.fontFamily,
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
          CD tracks diffract light into rainbow patterns
        </div>
      </div>
    );
  }, [isMobile, animationPhase, typo]);

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
        {/* Prism Angle */}
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
            <span>Prism Angle</span>
            <span style={{ color: defined.colors.text.primary }}>{prismAngle}°</span>
          </label>
          <input
            type="range"
            min="30"
            max="90"
            value={prismAngle}
            onChange={(e) => setPrismAngle(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: defined.colors.primary,
            }}
          />
        </div>

        {/* Material Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Prism Material
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: defined.spacing.xs,
            }}
          >
            {Object.entries(PRISM_MATERIALS).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => setPrismMaterial(key as typeof prismMaterial)}
                style={{
                  padding: defined.spacing.sm,
                  borderRadius: defined.radius.md,
                  border:
                    prismMaterial === key
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    prismMaterial === key
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: defined.colors.text.primary,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.xs,
                  transition: 'all 0.2s ease',
                }}
              >
                <div>{mat.name}</div>
                <div style={{ color: defined.colors.accent }}>{mat.dispersion}x</div>
              </button>
            ))}
          </div>
        </div>

        {/* Show Labels Toggle */}
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
            Show Labels
          </span>
          <button
            onClick={() => setShowLabels(!showLabels)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showLabels ? defined.colors.primary : defined.colors.background.tertiary,
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
                left: showLabels ? '23px' : '3px',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* Dispersion explanation */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(139, 92, 246, 0.1))',
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.primary,
              fontWeight: defined.typography.weights.semibold,
              marginBottom: defined.spacing.xs,
            }}
          >
            🌈 Color Spread: {totalSpread.toFixed(1)}°
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.secondary,
            }}
          >
            Higher dispersion = more color separation
          </div>
        </div>
      </div>
    ),
    [isMobile, prismAngle, prismMaterial, showLabels, totalSpread]
  );

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-violet-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-purple-200 bg-clip-text text-transparent">
        Light Dispersion
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how white light separates into its hidden rainbow of colors
      </p>

      {/* Premium card with content */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🌈</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Tilt a CD in sunlight and watch rainbow colors dance.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              White light contains a hidden spectrum - how does it separate into colors?
            </p>
            <div className="pt-2">
              <p className="text-base text-violet-400 font-semibold">
                Explore the science of prisms and rainbows!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('transition'); handleNavigation('predict'); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Dispersion
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Knowledge Test
        </div>
      </div>
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
        White light enters a glass prism. Why do different colors exit at different angles?
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
          { id: 'refract', text: 'Different wavelengths have different refractive indices' },
          { id: 'absorb', text: 'The prism absorbs some colors and lets others through' },
          { id: 'speed', text: 'Some colors move faster and get ahead' },
          { id: 'reflect', text: 'Different colors reflect off different internal surfaces' },
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
        children: 'Test with a Prism →',
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
        Explore Dispersion
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust the prism angle and material to see how colors separate. Notice which color bends
        the most!
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
        {renderPrismVisualization()}
        {renderControls()}
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
        The Science of Color Separation
      </h2>

      <div
        style={{
          background:
            prediction === 'refract' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'refract' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'refract' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'refract' ? '✓ Correct!' : '✗ Not quite!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Each color (wavelength) has a slightly different refractive index in glass. Blue/violet
          light slows more and bends more than red light - this is dispersion!
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📊</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Wavelength-Dependent n
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Violet (n≈1.532) bends more than red (n≈1.513) in crown glass. This ~1.3% difference
            creates visible color separation.
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔺</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Prism Geometry
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            The prism's angled faces refract light twice, amplifying the angular separation between
            colors. Larger apex angles = more spread.
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🌈</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            ROYGBIV
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Red, Orange, Yellow, Green, Blue, Indigo, Violet - ordered by increasing refraction
            (decreasing wavelength).
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>💎</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Material Matters
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Different materials have different dispersion. Diamond spreads colors 2x more than crown
            glass, creating brilliant "fire."
          </p>
        </div>
      </div>

      {Button({
        children: 'Explore CD Rainbows →',
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
        The CD Rainbow Mystery
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        A CD shows rainbow colors, but it's flat - not prism-shaped. How does it create rainbows?
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
          { id: 'diffraction', text: 'Microscopic grooves act as a diffraction grating' },
          { id: 'coating', text: 'Special rainbow-colored coating on the surface' },
          { id: 'layers', text: 'Multiple thin layers create color interference' },
          { id: 'prism', text: 'The plastic edge acts like a tiny prism' },
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
        children: 'Discover CD Physics →',
        onClick: () => handleNavigation('twist_play'),
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
          💿 DIFFRACTION GRATINGS
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
        CD as a Diffraction Grating
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        CD tracks are spiral grooves spaced about 1.6 micrometers apart - comparable to light
        wavelengths. This creates diffraction!
      </p>

      {renderCDVisualization()}

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
            fontSize: defined.typography.sizes.base,
            marginBottom: defined.spacing.md,
          }}
        >
          Diffraction vs. Refraction Dispersion
        </h3>
        <div style={{ display: 'flex', gap: defined.spacing.lg }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: defined.colors.primary, fontWeight: defined.typography.weights.semibold, marginBottom: defined.spacing.xs }}>
              Prism (Refraction)
            </div>
            <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, margin: 0 }}>
              <li>Blue bends MORE</li>
              <li>Single spectrum</li>
              <li>Based on n(λ)</li>
            </ul>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold, marginBottom: defined.spacing.xs }}>
              CD (Diffraction)
            </div>
            <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, margin: 0 }}>
              <li>Red bends MORE</li>
              <li>Multiple spectra</li>
              <li>Based on d·sinθ = mλ</li>
            </ul>
          </div>
        </div>
      </div>

      {Button({
        children: 'See Complete Picture →',
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
        Two Ways to Split Light!
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'diffraction'
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${twistPrediction === 'diffraction' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: twistPrediction === 'diffraction' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {twistPrediction === 'diffraction' ? '✓ Exactly right!' : '✗ Interesting!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          CD grooves act as a diffraction grating. Light waves from adjacent grooves interfere,
          with different wavelengths constructively interfering at different angles.
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
            background:
              'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>🔺</div>
          <h3
            style={{
              color: defined.colors.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Dispersion (Prism)
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Wavelength-dependent refractive index. Violet bends most. Creates one spectrum.
          </p>
        </div>

        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.1))',
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>💿</div>
          <h3
            style={{
              color: defined.colors.accent,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Diffraction (Grating)
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Wavelength-dependent interference. Red bends most. Creates multiple spectra.
          </p>
        </div>
      </div>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '600px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3
          style={{
            color: defined.colors.text.primary,
            fontSize: defined.typography.sizes.base,
            marginBottom: defined.spacing.md,
            textAlign: 'center',
          }}
        >
          Key Equations
        </h3>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: defined.spacing.lg,
            justifyContent: 'center',
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
              n = n(λ)
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Dispersion
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
              d·sin(θ) = mλ
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Diffraction Grating
            </div>
          </div>
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
              if (option.correct) {
                background = 'rgba(16, 185, 129, 0.2)';
                borderColor = defined.colors.success;
              } else if (i === selectedAnswer && !option.correct) {
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
                {option.text}
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
          {passed ? '🌈' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'Dispersion Expert!' : 'Keep Learning!'}
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
            display: 'flex',
            gap: defined.spacing.md,
            maxWidth: '400px',
            width: '100%',
          }}
        >
          {Object.values(WAVELENGTHS).slice(0, 7).map((color) => (
            <div
              key={color.name}
              style={{
                flex: 1,
                height: '30px',
                background: color.color,
                borderRadius: defined.radius.sm,
              }}
            />
          ))}
        </div>

        <p
          style={{
            fontSize: defined.typography.sizes.base,
            color: defined.colors.text.secondary,
            maxWidth: '500px',
          }}
        >
          {passed
            ? "You understand how white light separates into colors - from rainbows to diamonds to CD technology!"
            : "Review dispersion concepts and try again. Understanding how light separates into colors opens up a colorful world of physics!"}
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
              setPrismMaterial('crown');
              setPrismAngle(60);
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Light Dispersion</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); handleNavigation(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-violet-400 w-6 shadow-lg shadow-violet-400/30'
                    : PHASES.indexOf(phase) > PHASES.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-violet-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto px-4">
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
