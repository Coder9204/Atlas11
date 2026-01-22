'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// THIN FILM INTERFERENCE RENDERER - SOAP BUBBLE COLORS
// =============================================================================
// Premium educational game demonstrating thin film interference - the physics
// behind soap bubble rainbows, oil slicks, and anti-reflective coatings.
// Students discover how nanometer-thin films create spectacular colors.
// =============================================================================

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

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
    soap: {
      base: 'rgba(200, 220, 255, 0.3)',
      highlight: 'rgba(255, 255, 255, 0.6)',
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
const WAVELENGTHS = {
  violet: { wavelength: 400, color: '#8B5CF6' },
  blue: { wavelength: 470, color: '#3B82F6' },
  cyan: { wavelength: 500, color: '#06B6D4' },
  green: { wavelength: 550, color: '#22C55E' },
  yellow: { wavelength: 580, color: '#EAB308' },
  orange: { wavelength: 620, color: '#F97316' },
  red: { wavelength: 700, color: '#EF4444' },
};

const FILM_MATERIALS: Record<string, { name: string; n: number }> = {
  soap: { name: 'Soap Film', n: 1.33 },
  oil: { name: 'Oil Film', n: 1.5 },
  coating: { name: 'MgF₂ Coating', n: 1.38 },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
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
    question: 'Why do soap bubbles show rainbow colors?',
    options: [
      'Soap contains colored dyes',
      'Light interferes after reflecting from front and back surfaces',
      'Air inside the bubble is colored',
      'The soap absorbs certain wavelengths',
    ],
    correctIndex: 1,
    explanation:
      'Light reflects from both surfaces of the thin soap film. These reflections travel different distances and interfere - some colors reinforce (bright), others cancel (dark).',
  },
  {
    id: 2,
    question: 'A soap film appears blue. What can you say about its thickness?',
    options: [
      'It is thick enough to constructively interfere blue light',
      'It contains blue dye',
      'The film is very hot',
      'Blue light travels fastest in soap',
    ],
    correctIndex: 0,
    explanation:
      "For a specific thickness, only certain wavelengths experience constructive interference. Blue appearing means 2nt equals a half-integer multiple of blue's wavelength (with phase shift).",
  },
  {
    id: 3,
    question: 'Why does a soap bubble\'s colors change as it thins?',
    options: [
      'The soap is evaporating',
      'Different thicknesses cause different wavelengths to interfere constructively',
      'Gravity pulls colors downward',
      'The air pressure changes inside',
    ],
    correctIndex: 1,
    explanation:
      'As the film thins, the path difference changes, so different wavelengths meet the constructive interference condition. This creates shifting color bands.',
  },
  {
    id: 4,
    question: 'Just before a bubble pops, it often appears dark or black. Why?',
    options: [
      'The soap runs out of color',
      'Film is too thin - all visible wavelengths destructively interfere',
      'Light stops reflecting',
      'Your eyes cannot focus that close',
    ],
    correctIndex: 1,
    explanation:
      'When extremely thin, the film is much less than λ/4. All wavelengths destructively interfere due to the 180° phase shift at the top surface, making it appear black.',
  },
  {
    id: 5,
    question: 'What is the "phase shift" that occurs when light reflects from a denser medium?',
    options: [
      'Light speeds up',
      'The wave inverts (180° or λ/2 shift)',
      'Light changes color',
      'The wave splits in two',
    ],
    correctIndex: 1,
    explanation:
      'When light reflects from a higher refractive index surface, it undergoes a 180° phase shift - like a rope wave inverting when hitting a fixed end. This affects the interference condition.',
  },
  {
    id: 6,
    question: 'Anti-reflective coatings on eyeglasses use thin film interference to:',
    options: [
      'Absorb incoming light',
      'Cancel reflected light through destructive interference',
      'Make lenses thicker',
      'Add color to the image',
    ],
    correctIndex: 1,
    explanation:
      'AR coatings are precisely λ/4 thick for green light. Reflections from top and bottom surfaces travel paths differing by λ/2, causing destructive interference - reducing reflection.',
  },
  {
    id: 7,
    question: 'Why are oil slicks on water so colorful?',
    options: [
      'Oil contains rainbow pigments',
      'Varying oil thickness creates different interference colors at different spots',
      'Water underneath is colored',
      'Sunlight is especially bright on oil',
    ],
    correctIndex: 1,
    explanation:
      "Oil spreads in varying thickness. Each thickness region constructively interferes with different wavelengths, creating the swirling rainbow pattern we see.",
  },
  {
    id: 8,
    question: 'The condition for constructive interference in a thin film (with one phase shift) is:',
    options: [
      '2nt = mλ',
      '2nt = (m + ½)λ',
      'nt = λ',
      '2t = mλ',
    ],
    correctIndex: 1,
    explanation:
      'With one phase shift (180°), constructive interference needs an odd number of half-wavelengths: 2nt = (m + ½)λ. The "n" accounts for wavelength shortening in the film.',
  },
  {
    id: 9,
    question: 'Butterfly wings often show brilliant colors not from pigments but from:',
    options: [
      'Bioluminescence',
      'Nanoscale structures causing thin film interference',
      'Chemical reactions',
      'Reflection from crystals',
    ],
    correctIndex: 1,
    explanation:
      'Many butterfly wings have microscopic layered structures that act like thin films. This "structural coloration" produces iridescent colors that shift with viewing angle.',
  },
  {
    id: 10,
    question: 'Why does the optimal AR coating thickness differ for different wavelengths?',
    options: [
      'Different colors travel at different speeds in air',
      'λ/4 thickness is wavelength-dependent - one thickness can\'t cancel all colors',
      'Coatings absorb different colors differently',
      'Eyes see colors differently',
    ],
    correctIndex: 1,
    explanation:
      'Since the optimal thickness is λ/4, and wavelengths differ (400-700nm), one coating thickness can only perfectly cancel one wavelength. AR coatings optimize for green (center of spectrum).',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'Soap Bubbles & Oil Slicks',
    description: 'Everyday thin film colors',
    icon: '🫧',
    details: [
      'Bubble thickness varies from ~1μm (thick) to ~10nm (about to pop)',
      'Gravity causes film to thin at top, creating color bands',
      'Oil films are typically 100-1000nm thick',
      'The swirling patterns show where thickness varies randomly',
    ],
  },
  {
    id: 2,
    title: 'Anti-Reflective Coatings',
    description: 'Clearer vision technology',
    icon: '👓',
    details: [
      'Modern lenses use multiple layers (4-7) for broader spectrum coverage',
      'Each layer optimized for different wavelength range',
      'Reduces reflection from 4% to under 0.5%',
      'Also used on camera lenses, solar panels, and phone screens',
    ],
  },
  {
    id: 3,
    title: 'Structural Coloration',
    description: 'Nature\'s iridescence',
    icon: '🦋',
    details: [
      'Morpho butterflies: scales with 80nm chitin layers',
      'Peacock feathers: 2D photonic crystals in keratin',
      'Beetles: chitin films create metallic colors',
      'Structural color never fades (unlike pigments) - million-year-old fossils retain it',
    ],
  },
  {
    id: 4,
    title: 'Security Features',
    description: 'Anti-counterfeit technology',
    icon: '💵',
    details: [
      'Currency uses thin film holograms with angle-dependent colors',
      'Colors shift when tilted - impossible to photocopy',
      'Credit cards, passports, and IDs use similar technology',
      'Combines diffraction gratings with thin film interference',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function ThinFilmInterferenceRenderer() {
  // State management - using numeric phases
  const [phase, setPhase] = useState<number>(0);
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
  const [filmThickness, setFilmThickness] = useState(300); // nm
  const [filmMaterial, setFilmMaterial] = useState<'soap' | 'oil' | 'coating'>('soap');
  const [viewAngle, setViewAngle] = useState(0); // degrees
  const [showRays, setShowRays] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Navigation debouncing
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sound function
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
    } catch { /* Audio not available */ }
  }, []);

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
      setAnimationPhase((prev) => (prev + 1) % 360);
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
  const calculateInterferenceColor = useCallback((thickness: number, n: number): string => {
    // Calculate which wavelength constructively interferes
    // 2nt = (m + 0.5)λ for constructive with one phase shift
    // Solve for λ: λ = 2nt / (m + 0.5)

    const opticalPath = 2 * n * thickness; // in nm

    // Find which visible wavelength best matches constructive interference
    let bestMatch = { wavelength: 550, intensity: 0 };

    Object.values(WAVELENGTHS).forEach((w) => {
      // Check m = 0, 1, 2, 3 orders
      for (let m = 0; m <= 5; m++) {
        const targetPath = (m + 0.5) * w.wavelength;
        const diff = Math.abs(opticalPath - targetPath);
        const intensity = Math.max(0, 1 - diff / (w.wavelength * 0.3));

        if (intensity > bestMatch.intensity) {
          bestMatch = { wavelength: w.wavelength, intensity };
        }
      }
    });

    // Convert wavelength to color with intensity
    const entry = Object.values(WAVELENGTHS).find(
      (w) => Math.abs(w.wavelength - bestMatch.wavelength) < 50
    );

    if (entry && bestMatch.intensity > 0.3) {
      return entry.color;
    }

    // Mix colors for intermediate wavelengths
    return `rgba(200, 200, 200, ${bestMatch.intensity * 0.5})`;
  }, []);

  const getDominantColor = useCallback(() => {
    return calculateInterferenceColor(filmThickness, FILM_MATERIALS[filmMaterial].n);
  }, [filmThickness, filmMaterial, calculateInterferenceColor]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [playSound]);

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
      goToPhase(9);
    }
  }, [currentQuestion, goToPhase]);

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
  // SOAP BUBBLE VISUALIZATION
  // =============================================================================
  const renderBubbleVisualization = useCallback(() => {
    const width = isMobile ? 340 : 450;
    const height = isMobile ? 380 : 450;
    const bubbleRadius = isMobile ? 100 : 140;
    const centerX = width / 2;
    const centerY = height * 0.45;

    const n = FILM_MATERIALS[filmMaterial].n;
    const dominantColor = getDominantColor();

    // Generate color bands based on varying thickness
    const bands = [];
    for (let i = 0; i < 8; i++) {
      const thicknessVariation = filmThickness * (1 - i * 0.1);
      const bandColor = calculateInterferenceColor(thicknessVariation, n);
      bands.push({
        y: i * (bubbleRadius * 2) / 8,
        color: bandColor,
      });
    }

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
            {/* Bubble gradient with interference colors */}
            <radialGradient id="bubbleGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
              <stop offset="30%" stopColor={dominantColor} stopOpacity="0.6" />
              <stop offset="60%" stopColor={bands[3]?.color || dominantColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor={bands[6]?.color || dominantColor} stopOpacity="0.3" />
            </radialGradient>

            {/* Linear gradient for thickness variation */}
            <linearGradient id="thicknessGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              {bands.map((band, i) => (
                <stop
                  key={i}
                  offset={`${(i / bands.length) * 100}%`}
                  stopColor={band.color}
                  stopOpacity="0.6"
                />
              ))}
            </linearGradient>

            {/* Glow filter */}
            <filter id="bubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip path for bubble */}
            <clipPath id="bubbleClip">
              <circle cx={centerX} cy={centerY} r={bubbleRadius} />
            </clipPath>
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
            {FILM_MATERIALS[filmMaterial].name} (n = {n})
          </text>

          {/* Bubble body */}
          <circle
            cx={centerX}
            cy={centerY}
            r={bubbleRadius}
            fill="url(#bubbleGradient)"
            filter="url(#bubbleGlow)"
          />

          {/* Thickness variation bands overlay */}
          <circle
            cx={centerX}
            cy={centerY}
            r={bubbleRadius}
            fill="url(#thicknessGradient)"
            opacity="0.5"
            clipPath="url(#bubbleClip)"
          />

          {/* Highlight reflection */}
          <ellipse
            cx={centerX - bubbleRadius * 0.3}
            cy={centerY - bubbleRadius * 0.3}
            rx={bubbleRadius * 0.25}
            ry={bubbleRadius * 0.15}
            fill="rgba(255, 255, 255, 0.6)"
            transform={`rotate(-20, ${centerX - bubbleRadius * 0.3}, ${centerY - bubbleRadius * 0.3})`}
          />

          {/* Ray diagram (if enabled) */}
          {showRays && (
            <g transform={`translate(${centerX + bubbleRadius + 30}, ${centerY - 40})`}>
              {/* Thin film cross-section */}
              <rect x={0} y={0} width={80} height={80} fill={defined.colors.background.tertiary} rx="4" />

              {/* Air label */}
              <text x={40} y={-5} fill={defined.colors.text.muted} fontSize="9" textAnchor="middle">
                Air (n=1)
              </text>

              {/* Film layer */}
              <rect
                x={10}
                y={30}
                width={60}
                height={Math.max(5, filmThickness / 30)}
                fill={dominantColor}
                opacity="0.7"
              />
              <text x={40} y={30 + filmThickness / 60 + 3} fill="white" fontSize="8" textAnchor="middle">
                Film (n={n.toFixed(2)})
              </text>

              {/* Substrate */}
              <rect x={10} y={50} width={60} height={25} fill="rgba(100, 116, 139, 0.5)" />
              <text x={40} y={67} fill={defined.colors.text.muted} fontSize="8" textAnchor="middle">
                {filmMaterial === 'coating' ? 'Glass' : 'Air'}
              </text>

              {/* Incident ray */}
              <line
                x1={-15}
                y1={5}
                x2={25}
                y2={30}
                stroke="#FBBF24"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              {/* Reflected ray 1 (from top surface) */}
              <line x1={25} y1={30} x2={50} y2={5} stroke="#EF4444" strokeWidth="2" strokeDasharray="4,2" />
              <text x={55} y={8} fill="#EF4444" fontSize="7">
                R₁
              </text>

              {/* Transmitted ray into film */}
              <line x1={25} y1={30} x2={35} y2={50} stroke="#FBBF24" strokeWidth="1.5" />

              {/* Reflected ray 2 (from bottom surface) */}
              <line x1={35} y1={50} x2={45} y2={30} stroke="#3B82F6" strokeWidth="1.5" />
              <line x1={45} y1={30} x2={70} y2={5} stroke="#3B82F6" strokeWidth="2" strokeDasharray="4,2" />
              <text x={75} y={8} fill="#3B82F6" fontSize="7">
                R₂
              </text>

              {/* Phase shift indicator */}
              <text x={10} y={28} fill="#EF4444" fontSize="8">
                λ/2
              </text>
            </g>
          )}

          {/* Thickness scale */}
          <g transform={`translate(30, ${height - 80})`}>
            <text
              x={0}
              y={0}
              fill={defined.colors.text.muted}
              fontSize="11"
              fontFamily={defined.typography.fontFamily}
            >
              Film thickness
            </text>
            <rect x={0} y={10} width={100} height={15} fill={defined.colors.background.tertiary} rx="4" />
            <rect
              x={2}
              y={12}
              width={(filmThickness / 800) * 96}
              height={11}
              fill={dominantColor}
              rx="2"
            />
            <text
              x={105}
              y={22}
              fill={defined.colors.text.primary}
              fontSize="11"
              fontFamily={defined.typography.fontFamily}
            >
              {filmThickness} nm
            </text>
          </g>

          {/* Dominant color indicator */}
          <g transform={`translate(30, ${height - 40})`}>
            <text
              x={0}
              y={0}
              fill={defined.colors.text.muted}
              fontSize="11"
              fontFamily={defined.typography.fontFamily}
            >
              Dominant color
            </text>
            <circle cx={100} cy={-4} r={10} fill={dominantColor} />
          </g>
        </svg>
      </div>
    );
  }, [isMobile, filmThickness, filmMaterial, showRays, getDominantColor, calculateInterferenceColor]);

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
        {/* Film Thickness */}
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
            <span>Film Thickness</span>
            <span style={{ color: defined.colors.text.primary }}>{filmThickness} nm</span>
          </label>
          <input
            type="range"
            min="50"
            max="800"
            value={filmThickness}
            onChange={(e) => setFilmThickness(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: getDominantColor(),
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
            <span>Thin (dark)</span>
            <span>Thick</span>
          </div>
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
            Film Material
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: defined.spacing.xs }}>
            {Object.entries(FILM_MATERIALS).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => setFilmMaterial(key as typeof filmMaterial)}
                style={{
                  padding: defined.spacing.sm,
                  borderRadius: defined.radius.md,
                  border:
                    filmMaterial === key
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    filmMaterial === key
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: defined.colors.text.primary,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{mat.name}</span>
                <span style={{ color: defined.colors.text.muted }}>n = {mat.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Show Rays Toggle */}
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
            Show Ray Diagram
          </span>
          <button
            onClick={() => setShowRays(!showRays)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showRays ? defined.colors.primary : defined.colors.background.tertiary,
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
                left: showRays ? '23px' : '3px',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* Interference equation */}
        <div
          style={{
            background: defined.colors.background.secondary,
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
              marginBottom: defined.spacing.xs,
            }}
          >
            Constructive Interference
          </div>
          <div
            style={{
              fontFamily: 'serif',
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.primary,
            }}
          >
            2nt = (m + ½)λ
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
              marginTop: defined.spacing.xs,
            }}
          >
            Path: 2 × {FILM_MATERIALS[filmMaterial].n.toFixed(2)} × {filmThickness}nm ={' '}
            {(2 * FILM_MATERIALS[filmMaterial].n * filmThickness).toFixed(0)}nm
          </div>
        </div>
      </div>
    ),
    [isMobile, filmThickness, filmMaterial, showRays, getDominantColor]
  );

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Physics of Bubbles
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why soap bubbles shimmer with <span className="text-amber-400 font-semibold">swirling rainbow colors</span>
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          {/* Bubble illustration */}
          <div
            className="mx-auto mb-6"
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(139,92,246,0.5) 30%, rgba(34,197,94,0.4) 60%, rgba(234,179,8,0.3) 100%)',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
            }}
          />

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Soap is colorless - yet bubbles shimmer with rainbows!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The secret lies in a film thinner than the wavelength of light itself.
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                Film thickness: 100-1000 nanometers (1000x thinner than a hair!)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Thin Film Interference
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Wave Interference
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Anti-Reflective Coatings
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Oil Slick Colors
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
        Light reflects from BOTH the front and back surfaces of a thin film. How might this create
        colors?
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
          {
            id: 'interfere',
            text: 'The two reflections INTERFERE - some colors reinforce, others cancel',
          },
          { id: 'scatter', text: 'The film scatters light in different directions' },
          { id: 'absorb', text: 'The film absorbs certain colors' },
          { id: 'bend', text: 'Different colors bend by different amounts' },
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
        onClick: () => goToPhase(2),
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
        Explore Thin Film Colors
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust the film thickness and watch the colors change. Notice how different thicknesses
        favor different wavelengths!
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
        {renderBubbleVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'I Understand → Review',
        onClick: () => goToPhase(3),
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
        How Thin Films Create Color
      </h2>

      <div
        style={{
          background:
            prediction === 'interfere' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'interfere' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'interfere' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'interfere' ? '✓ Correct!' : '✗ Not quite!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Light reflects from both surfaces of the thin film. These reflections travel different
          distances and interfere - reinforcing some wavelengths (bright) and canceling others
          (dark)!
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔄</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Two Reflections
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            R₁ reflects from the top surface (with a 180° phase shift). R₂ reflects from the bottom
            and travels an extra distance of 2nt.
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
            When 2nt = (m + ½)λ, waves add constructively (bright). When 2nt = mλ, they cancel
            (dark for that color).
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
            Color Selection
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Each thickness enhances specific wavelengths. A 300nm soap film (n=1.33) constructively
            interferes with green light!
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>⬛</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Dark = Very Thin
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            When a bubble is about to pop, it's so thin (~10nm) that all colors destructively
            interfere - it appears black!
          </p>
        </div>
      </div>

      {Button({
        children: 'See Anti-Reflective Coatings →',
        onClick: () => goToPhase(4),
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
        Anti-Reflective Coatings
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Camera lenses and eyeglasses have special coatings that ELIMINATE reflection. How could thin
        film interference help?
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
          { id: 'cancel', text: 'Coating designed so reflections DESTRUCTIVELY interfere' },
          { id: 'absorb', text: 'Coating absorbs the reflected light' },
          { id: 'scatter', text: 'Coating scatters light randomly' },
          { id: 'block', text: 'Coating blocks light from entering' },
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
        children: 'See AR Coating Physics →',
        onClick: () => {
          setFilmMaterial('coating');
          setFilmThickness(100);
          goToPhase(5);
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
          👓 ANTI-REFLECTIVE COATING
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
        Quarter-Wave Magic
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Try to find the thickness where reflections CANCEL for green light (~550nm). Hint: The
        optical path should equal λ/2!
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
        {renderBubbleVisualization()}
        {renderControls()}
      </div>

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
          }}
        >
          Optimal thickness for green (λ=550nm, n=1.38): t = λ/(4n) ≈{' '}
          {Math.round(550 / (4 * 1.38))}nm
        </div>
      </div>

      {Button({
        children: 'See How It Works →',
        onClick: () => goToPhase(6),
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
        The Quarter-Wave Coating
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'cancel' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${twistPrediction === 'cancel' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: twistPrediction === 'cancel' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {twistPrediction === 'cancel' ? '✓ Exactly right!' : '✗ The key is interference!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          A λ/4 thick coating creates a λ/2 path difference (light travels through twice). This puts
          reflections exactly out of phase - they CANCEL!
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
          How AR Coatings Work
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: defined.spacing.lg,
          }}
        >
          <div>
            <div
              style={{
                color: defined.colors.accent,
                fontWeight: defined.typography.weights.semibold,
                marginBottom: defined.spacing.sm,
              }}
            >
              Without Coating
            </div>
            <ul
              style={{
                color: defined.colors.text.secondary,
                fontSize: defined.typography.sizes.sm,
                paddingLeft: defined.spacing.md,
                margin: 0,
              }}
            >
              <li>~4% reflection per surface</li>
              <li>8% total for both lens surfaces</li>
              <li>Glare and ghost images</li>
            </ul>
          </div>
          <div>
            <div
              style={{
                color: defined.colors.success,
                fontWeight: defined.typography.weights.semibold,
                marginBottom: defined.spacing.sm,
              }}
            >
              With AR Coating
            </div>
            <ul
              style={{
                color: defined.colors.text.secondary,
                fontSize: defined.typography.sizes.sm,
                paddingLeft: defined.spacing.md,
                margin: 0,
              }}
            >
              <li>&lt;0.5% reflection</li>
              <li>More light through lens</li>
              <li>Sharper, clearer images</li>
            </ul>
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📷</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Multi-Layer Coatings
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Modern lenses use 4-7 layers of different thickness to cancel multiple wavelengths
            simultaneously!
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
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🌙</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Purple Tint
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            AR coatings often look purple because they're optimized for green - so red and blue
            reflect slightly more.
          </p>
        </div>
      </div>

      {Button({
        children: 'See Real-World Applications →',
        onClick: () => goToPhase(7),
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
              onClick: () => goToPhase(8),
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
          {passed ? '🫧' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'Thin Film Expert!' : 'Keep Practicing!'}
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🫧</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Soap Bubbles
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
              AR Coatings
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
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🦋</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Structural Color
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
            ? "You understand the nanoscale physics behind bubble colors, AR coatings, and butterfly iridescence!"
            : 'Review thin film interference and try again. This beautiful physics is all around us!'}
        </p>

        <div style={{ display: 'flex', gap: defined.spacing.md }}>
          {Button({
            children: 'Start Over',
            onClick: () => {
              setPhase(0);
              setPrediction(null);
              setTwistPrediction(null);
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowResult(false);
              setScore(0);
              setCompletedApps([false, false, false, false]);
              setSelectedApp(0);
              setFilmMaterial('soap');
              setFilmThickness(300);
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Thin Film Interference</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ fontFamily: defined.typography.fontFamily }}>
        <div className="max-w-4xl mx-auto px-4">
          {phase === 0 && renderHook()}
          {phase === 1 && renderPredict()}
          {phase === 2 && renderPlay()}
          {phase === 3 && renderReview()}
          {phase === 4 && renderTwistPredict()}
          {phase === 5 && renderTwistPlay()}
          {phase === 6 && renderTwistReview()}
          {phase === 7 && renderTransfer()}
          {phase === 8 && renderTest()}
          {phase === 9 && renderMastery()}
        </div>
      </div>
    </div>
  );
}
