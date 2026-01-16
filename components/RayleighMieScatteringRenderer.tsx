'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// RAYLEIGH VS MIE SCATTERING RENDERER - PREMIUM PHYSICS GAME
// Why is the sky blue but clouds white?
// ============================================================================

interface RayleighMieScatteringRendererProps {
  onComplete?: () => void;
  emit?: (event: string, data?: Record<string, unknown>) => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Insight',
  transfer: 'Apply',
  test: 'Quiz',
  mastery: 'Complete',
};

// Premium Design System
const colors = {
  brand: '#6366F1',
  brandGlow: 'rgba(99, 102, 241, 0.15)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  bg: '#0F0F13',
  bgCard: '#18181B',
  bgElevated: '#1F1F23',
  bgHover: '#27272A',
  border: '#2E2E33',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  blue: '#3B82F6',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  white: '#FFFFFF',
  sky: '#7DD3FC',
};

const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  hero: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 },
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
  h2: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  bodySmall: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 12, fontWeight: 500, lineHeight: 1.4 },
  label: { fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

// Real-World Applications Data
const applications = [
  {
    id: 'sky',
    icon: '🌅',
    title: 'Sunrise & Sunset Colors',
    subtitle: 'Atmospheric Optics',
    color: '#F97316',
    description: 'At sunrise and sunset, sunlight travels through much more atmosphere. Blue light scatters away completely, leaving red and orange to reach your eyes - creating those spectacular colors.',
    physics: 'At low sun angles, light path through atmosphere is ~40× longer. Short wavelengths (blue) scatter out entirely via Rayleigh scattering. Only long wavelengths (red/orange) remain in the direct beam.',
    insight: 'Pollution and dust actually enhance sunsets! Additional particles add Mie scattering, spreading the colors wider and creating more vivid displays.',
    stats: [
      { value: '40×', label: 'Longer Path' },
      { value: '450nm', label: 'Blue Scattered' },
      { value: '650nm', label: 'Red Reaches Eye' },
    ],
  },
  {
    id: 'clouds',
    icon: '☁️',
    title: 'White Clouds',
    subtitle: 'Mie Scattering in Action',
    color: '#94A3B8',
    description: 'Water droplets in clouds are much larger than air molecules (~10-20 micrometers vs 0.1 nanometers). At this size, all wavelengths scatter equally - combining to produce white.',
    physics: 'Mie scattering occurs when particle size ≈ wavelength. Large water droplets scatter all visible wavelengths equally and mostly forward. No color separation = white appearance.',
    insight: 'Storm clouds look dark because they\'re so thick that light can\'t penetrate through. It\'s not different scattering - just more of it absorbing the light.',
    stats: [
      { value: '10-20μm', label: 'Droplet Size' },
      { value: '100%', label: 'All Colors' },
      { value: '~White', label: 'Result' },
    ],
  },
  {
    id: 'ocean',
    icon: '🌊',
    title: 'Ocean Blue Color',
    subtitle: 'Selective Absorption + Scattering',
    color: '#0EA5E9',
    description: 'Ocean water is blue for two reasons: Rayleigh scattering by water molecules AND selective absorption. Water absorbs red light more than blue, so only blue survives deep penetration.',
    physics: 'Red light is absorbed within the first 10 meters. Blue penetrates to ~200m before being absorbed or scattered. This plus sky reflection creates the ocean\'s characteristic blue.',
    insight: 'Tropical waters look more turquoise because of white sand reflecting light back up. The shallow depth means less absorption, adding green to the blue.',
    stats: [
      { value: '10m', label: 'Red Absorbed' },
      { value: '200m', label: 'Blue Depth' },
      { value: '2×', label: 'Absorption Diff' },
    ],
  },
  {
    id: 'milk',
    icon: '🥛',
    title: 'Milk\'s White Color',
    subtitle: 'Fat Droplet Scattering',
    color: '#F8FAFC',
    description: 'Milk contains fat globules 1-10 micrometers in size - perfect for Mie scattering. These scatter all visible wavelengths equally, making milk appear white. Skim milk looks slightly blue!',
    physics: 'Fat globules are ideal Mie scatterers. Full-fat milk: strong Mie scattering → white. Skim milk: fewer large particles → some Rayleigh → bluish tint visible.',
    insight: 'This is why you see a bluish tint from the side of a glass of diluted milk with a flashlight - fewer fat particles means more Rayleigh scattering of blue.',
    stats: [
      { value: '1-10μm', label: 'Fat Globules' },
      { value: '3.5%', label: 'Whole Milk Fat' },
      { value: '0.1%', label: 'Skim Milk Fat' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'Why does the sky appear blue during the day?',
    options: ['Blue light reflects off the ocean', 'Air molecules scatter blue light more than red', 'The ozone layer is blue', 'Blue light is absorbed by the atmosphere'],
    correct: 1,
    explanation: 'Air molecules are much smaller than light wavelengths. Rayleigh scattering causes short wavelengths (blue) to scatter more than long wavelengths (red).',
  },
  {
    question: 'In Rayleigh scattering, how does scattering intensity relate to wavelength?',
    options: ['Proportional to wavelength', 'Inversely proportional to wavelength', 'Proportional to wavelength⁴', 'Inversely proportional to wavelength⁴'],
    correct: 3,
    explanation: 'Rayleigh scattering intensity ∝ 1/λ⁴. This means blue light (450nm) scatters about 5.5× more than red light (650nm).',
  },
  {
    question: 'Why do clouds appear white instead of blue?',
    options: ['Water is white', 'Cloud droplets are too large for Rayleigh scattering', 'Clouds are above the atmosphere', 'Ice crystals are white'],
    correct: 1,
    explanation: 'Cloud droplets (10-20μm) are much larger than light wavelengths. Mie scattering occurs, scattering all wavelengths equally → white appearance.',
  },
  {
    question: 'Why is the sunset red/orange?',
    options: ['The sun changes color', 'Pollution makes it red', 'Light travels through more atmosphere, scattering away blue', 'Red light is emitted more at sunset'],
    correct: 2,
    explanation: 'At sunset, sunlight travels through ~40× more atmosphere. Blue light scatters away completely via Rayleigh scattering, leaving only red/orange.',
  },
  {
    question: 'Mie scattering primarily occurs when:',
    options: ['Particles are much smaller than wavelength', 'Particles are comparable to or larger than wavelength', 'Temperature is very high', 'Humidity is above 90%'],
    correct: 1,
    explanation: 'Mie scattering dominates when particle size is comparable to or larger than the light wavelength (roughly 0.1-10× the wavelength).',
  },
  {
    question: 'If you shine white light through dilute milk from the side, what color do you see?',
    options: ['White', 'Yellow', 'Bluish', 'Red'],
    correct: 2,
    explanation: 'Dilute milk has fewer fat droplets, so Rayleigh scattering from water molecules dominates. Blue light scatters more to the sides → bluish appearance.',
  },
  {
    question: 'The ocean appears blue primarily because:',
    options: ['It reflects the sky', 'Water molecules scatter blue light and absorb red', 'Salt is blue', 'Algae are blue'],
    correct: 1,
    explanation: 'Water molecules scatter blue light (Rayleigh) AND absorb red light preferentially. Both effects combine to make deep water appear blue.',
  },
  {
    question: 'Which would make a sunset more vivid?',
    options: ['Cleaner air', 'Volcanic ash particles', 'Lower humidity', 'Colder temperature'],
    correct: 1,
    explanation: 'Volcanic ash and pollution add particles that enhance Mie scattering, spreading reds and oranges more widely across the sky.',
  },
  {
    question: 'On Mars, the sky appears pink/butterscotch because:',
    options: ['Mars has a blue sun', 'Iron-rich dust in the atmosphere', 'CO₂ is pink', 'No atmosphere exists'],
    correct: 1,
    explanation: 'Mars atmosphere contains iron-rich dust particles (~1μm). These are the right size for Mie scattering and absorb blue while scattering red.',
  },
  {
    question: 'Blue eyes have blue pigment. True or false, and why?',
    options: ['True - melanin is blue', 'False - Rayleigh scattering of light in the iris', 'True - blood vessels appear blue', 'False - they reflect the sky'],
    correct: 1,
    explanation: 'Blue eyes have NO blue pigment. The stroma contains colorless collagen fibers that Rayleigh scatter blue light, just like the sky!',
  },
];

export default function RayleighMieScatteringRenderer({ onComplete, emit = () => {} }: RayleighMieScatteringRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [particleSize, setParticleSize] = useState(0.1); // nm scale factor (0.1 = molecules, 10 = droplets)
  const [concentration, setConcentration] = useState(50);
  const [pathLength, setPathLength] = useState(50);
  const [viewAngle, setViewAngle] = useState<'side' | 'through'>('side');

  // Animation state
  const [lightRays, setLightRays] = useState<Array<{ id: number; x: number; color: string; scattered: boolean }>>([]);
  const animationRef = useRef<number | null>(null);
  const rayIdRef = useRef(0);

  // Button debounce locks
  const navigationLock = useRef(false);
  const tabLock = useRef(false);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle button click with debounce
  const handleButtonClick = useCallback((action: () => void, lock: React.MutableRefObject<boolean>) => {
    if (lock.current) return;
    lock.current = true;
    action();
    setTimeout(() => { lock.current = false; }, 400);
  }, []);

  // Navigation helpers
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
    emit('phase_change', { phase: p });
  }, [emit]);

  const goNext = useCallback(() => {
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      goToPhase(phases[currentIndex + 1]);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    const currentIndex = phases.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phases[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Light ray animation
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play') return;

    const addRay = () => {
      const rayColors = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444']; // Blue, Green, Yellow, Orange, Red
      const newRays = rayColors.map((color, i) => ({
        id: rayIdRef.current++,
        x: 0,
        color,
        scattered: false,
      }));

      setLightRays(prev => [...prev.slice(-20), ...newRays]);
    };

    const interval = setInterval(addRay, 800);
    return () => clearInterval(interval);
  }, [phase]);

  // Calculate scattering based on parameters
  const calculateScattering = useCallback((wavelength: number) => {
    // Rayleigh scattering intensity ∝ 1/λ⁴
    // At small particle sizes, blue scatters more
    // At large particle sizes (Mie), all scatter equally

    const particleFactor = particleSize;
    const rayleighIntensity = Math.pow(550 / wavelength, 4); // normalized to green
    const mieFactor = Math.min(1, particleFactor / 5); // Mie kicks in at larger sizes

    // Blend between Rayleigh and Mie
    const scatterIntensity = rayleighIntensity * (1 - mieFactor) + 1 * mieFactor;
    const scatterProbability = scatterIntensity * (concentration / 100) * (pathLength / 100);

    return Math.min(0.95, scatterProbability * 0.3);
  }, [particleSize, concentration, pathLength]);

  // Get scattered color for side view
  const getSideViewColor = useCallback(() => {
    const blueScatter = calculateScattering(450);
    const greenScatter = calculateScattering(550);
    const redScatter = calculateScattering(650);

    // At small particles (Rayleigh): blue dominates
    // At large particles (Mie): white (equal scattering)
    const mieFactor = Math.min(1, particleSize / 5);

    if (mieFactor > 0.7) {
      return `rgb(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${200 + Math.random() * 55})`; // White
    }

    const blue = Math.floor(150 + blueScatter * 105);
    const green = Math.floor(100 + greenScatter * 80);
    const red = Math.floor(80 + redScatter * 60);

    return `rgb(${red}, ${green}, ${blue})`;
  }, [calculateScattering, particleSize]);

  // Get transmitted color for through view
  const getThroughViewColor = useCallback(() => {
    const blueScatter = calculateScattering(450);
    const greenScatter = calculateScattering(550);
    const redScatter = calculateScattering(650);

    const mieFactor = Math.min(1, particleSize / 5);

    // What's transmitted is what's NOT scattered
    // At small particles: blue scattered out → yellow/orange transmitted
    // At large particles: all scattered equally → gray/dim

    if (mieFactor > 0.7) {
      const dim = Math.floor(255 * (1 - concentration / 150));
      return `rgb(${dim}, ${dim}, ${dim})`; // Gray/dim
    }

    const red = Math.floor(255 * (1 - redScatter * 0.3));
    const green = Math.floor(255 * (1 - greenScatter * 0.5));
    const blue = Math.floor(255 * (1 - blueScatter * 0.8));

    return `rgb(${Math.max(50, red)}, ${Math.max(30, green)}, ${Math.max(20, blue)})`;
  }, [calculateScattering, particleSize, concentration]);

  // Helper function: Button component
  function Button({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
  }) {
    const btnLock = useRef(false);

    const handleClick = () => {
      if (disabled || btnLock.current) return;
      btnLock.current = true;
      onClick?.();
      setTimeout(() => { btnLock.current = false; }, 400);
    };

    const baseStyle: React.CSSProperties = {
      fontFamily: typography.fontFamily,
      fontWeight: 600,
      borderRadius: radius.md,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      opacity: disabled ? 0.5 : 1,
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: { background: colors.brand, color: '#FFFFFF' },
      secondary: { background: colors.bgCard, color: colors.textPrimary, border: `1px solid ${colors.border}` },
      ghost: { background: 'transparent', color: colors.textSecondary },
      success: { background: colors.success, color: '#FFFFFF' },
    };

    const sizes: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 16px', fontSize: 13 },
      md: { padding: '12px 24px', fontSize: 15 },
      lg: { padding: '16px 32px', fontSize: 17 },
    };

    return (
      <button
        onMouseDown={handleClick}
        style={{ ...baseStyle, ...variants[variant], ...sizes[size] }}
      >
        {children}
      </button>
    );
  }

  // Helper function: Progress bar
  function ProgressBar() {
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div style={{
        background: colors.bgElevated,
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}>
          <span style={{ ...typography.label, color: colors.textTertiary }}>
            {phaseLabels[phase]}
          </span>
          <span style={{ ...typography.caption, color: colors.textTertiary }}>
            {currentIndex + 1}/{phases.length}
          </span>
        </div>
        <div style={{
          height: 4,
          background: colors.bgHover,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.brand}, ${colors.success})`,
            borderRadius: radius.full,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  }

  // Helper function: Scattering Tank Visualization
  function ScatteringTank() {
    const sideColor = getSideViewColor();
    const throughColor = getThroughViewColor();
    const mieFactor = Math.min(1, particleSize / 5);

    // Generate particles for visualization
    const particles = Array.from({ length: Math.floor(concentration / 2) }, (_, i) => ({
      x: 20 + Math.random() * 260,
      y: 30 + Math.random() * 120,
      size: mieFactor > 0.5 ? 3 + Math.random() * 4 : 1 + Math.random() * 2,
    }));

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        {/* Tank SVG */}
        <svg
          viewBox="0 0 300 200"
          style={{
            width: '100%',
            height: isMobile ? 180 : 220,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f15 100%)',
            borderRadius: radius.md,
          }}
        >
          {/* Tank outline */}
          <rect x="40" y="25" width="220" height="130" fill="none" stroke={colors.border} strokeWidth="2" rx="4" />

          {/* Tank interior - scattering medium */}
          <rect x="42" y="27" width="216" height="126" fill={`${colors.bgHover}80`} rx="3" />

          {/* Particles */}
          {particles.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={mieFactor > 0.5 ? 'rgba(255,255,255,0.6)' : 'rgba(100,150,255,0.4)'}
            />
          ))}

          {/* Light beam entering from left */}
          <defs>
            <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor={throughColor} />
            </linearGradient>
          </defs>
          <rect x="0" y="85" width="45" height="10" fill="#FFFFFF" />
          <rect x="42" y="85" width="218" height="10" fill="url(#beamGradient)" opacity="0.8" />
          <rect x="258" y="85" width="42" height="10" fill={throughColor} />

          {/* Scattered light glow from side */}
          <ellipse
            cx="150"
            cy="90"
            rx={80 + concentration / 2}
            ry={40 + concentration / 4}
            fill={sideColor}
            opacity={0.15 + concentration / 300}
          />

          {/* Labels */}
          <text x="20" y="15" fill={colors.white} fontSize="10" fontWeight="bold">WHITE LIGHT</text>
          <text x="250" y="15" fill={throughColor} fontSize="9">TRANSMITTED</text>

          {/* Camera indicators */}
          {viewAngle === 'side' && (
            <g>
              <text x="150" y="175" textAnchor="middle" fill={colors.sky} fontSize="10">📷 Side View</text>
              <circle cx="150" cy="155" r="12" fill={sideColor} stroke={colors.sky} strokeWidth="2" />
            </g>
          )}
          {viewAngle === 'through' && (
            <g>
              <text x="280" y="100" fill={colors.orange} fontSize="10">📷</text>
              <circle cx="275" cy="90" r="8" fill={throughColor} stroke={colors.orange} strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
        }}>
          <button
            onClick={() => setViewAngle('side')}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: radius.md,
              border: `2px solid ${viewAngle === 'side' ? colors.sky : colors.border}`,
              background: viewAngle === 'side' ? `${colors.sky}20` : 'transparent',
              cursor: 'pointer',
              fontFamily: typography.fontFamily,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: spacing.xs }}>👁️</div>
            <div style={{ ...typography.caption, color: viewAngle === 'side' ? colors.sky : colors.textSecondary }}>
              Side View
            </div>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: radius.full,
              background: sideColor,
              margin: '8px auto 0',
              border: `2px solid ${colors.border}`,
            }} />
          </button>
          <button
            onClick={() => setViewAngle('through')}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: radius.md,
              border: `2px solid ${viewAngle === 'through' ? colors.orange : colors.border}`,
              background: viewAngle === 'through' ? `${colors.orange}20` : 'transparent',
              cursor: 'pointer',
              fontFamily: typography.fontFamily,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: spacing.xs }}>🎯</div>
            <div style={{ ...typography.caption, color: viewAngle === 'through' ? colors.orange : colors.textSecondary }}>
              Through View
            </div>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: radius.full,
              background: throughColor,
              margin: '8px auto 0',
              border: `2px solid ${colors.border}`,
            }} />
          </button>
        </div>

        {/* Current observation */}
        <div style={{
          padding: spacing.md,
          background: colors.bgElevated,
          borderRadius: radius.md,
          textAlign: 'center',
        }}>
          <div style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xs }}>
            WHAT YOU SEE
          </div>
          <div style={{
            ...typography.h3,
            color: viewAngle === 'side' ? colors.sky : colors.orange,
          }}>
            {viewAngle === 'side'
              ? (mieFactor > 0.5 ? 'White/Gray Glow' : 'Blue-ish Glow')
              : (mieFactor > 0.5 ? 'Dimmed White' : 'Yellow/Orange Light')
            }
          </div>
          <div style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs }}>
            {viewAngle === 'side'
              ? (mieFactor > 0.5 ? 'Mie: All colors scatter equally' : 'Rayleigh: Blue scatters most')
              : (mieFactor > 0.5 ? 'Mie: All colors blocked equally' : 'Rayleigh: Blue removed → warm colors remain')
            }
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            {/* Sky/Cloud Illustration */}
            <div style={{
              width: '100%',
              height: 150,
              borderRadius: radius.lg,
              background: 'linear-gradient(180deg, #7DD3FC 0%, #38BDF8 50%, #0EA5E9 100%)',
              marginBottom: spacing.xl,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Sun */}
              <div style={{
                position: 'absolute',
                top: 20,
                right: 30,
                width: 50,
                height: 50,
                borderRadius: radius.full,
                background: 'radial-gradient(circle, #FEF08A 0%, #FBBF24 100%)',
                boxShadow: '0 0 40px #FBBF24',
              }} />
              {/* Clouds */}
              <div style={{
                position: 'absolute',
                top: 40,
                left: 30,
                width: 80,
                height: 40,
                borderRadius: radius.full,
                background: '#FFFFFF',
                boxShadow: '30px 10px 0 #FFFFFF, 60px 0 0 #F8FAFC',
              }} />
              <div style={{
                position: 'absolute',
                top: 80,
                left: 150,
                width: 60,
                height: 30,
                borderRadius: radius.full,
                background: '#FFFFFF',
                boxShadow: '25px 5px 0 #FFFFFF',
              }} />
            </div>

            {/* Title */}
            <h1 style={{
              ...typography.hero,
              color: colors.textPrimary,
              marginBottom: spacing.lg
            }}>
              Why is the Sky Blue?
            </h1>

            {/* Subtitle */}
            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
              lineHeight: 1.6,
            }}>
              And why are clouds white? The answer involves how light interacts with particles of different sizes.
            </p>

            {/* Visual comparison */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: spacing.xl,
              marginBottom: spacing.xxl,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: radius.full,
                  background: 'linear-gradient(135deg, #7DD3FC 0%, #38BDF8 100%)',
                  margin: '0 auto',
                  marginBottom: spacing.sm,
                }} />
                <div style={{ ...typography.caption, color: colors.sky }}>Sky = Blue</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: radius.full,
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #E5E7EB 100%)',
                  margin: '0 auto',
                  marginBottom: spacing.sm,
                  border: `2px solid ${colors.border}`,
                }} />
                <div style={{ ...typography.caption, color: colors.textSecondary }}>Clouds = White</div>
              </div>
            </div>

            {/* CTA */}
            <button
              onMouseDown={() => handleButtonClick(() => goToPhase('predict'), navigationLock)}
              style={{
                padding: '16px 48px',
                borderRadius: radius.lg,
                border: 'none',
                background: `linear-gradient(135deg, ${colors.brand}, #8B5CF6)`,
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
                boxShadow: `0 4px 20px ${colors.brandGlow}`,
              }}
            >
              Discover Why →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  if (phase === 'predict') {
    const predictions = [
      { id: 0, label: 'Blue light is absorbed least', icon: '🔵', description: 'Atmosphere lets blue through more' },
      { id: 1, label: 'Blue light is scattered most', icon: '💫', description: 'Small particles bounce blue around' },
      { id: 2, label: 'Ozone layer is blue', icon: '🛡️', description: 'O₃ molecules give blue color' },
      { id: 3, label: 'Ocean reflection', icon: '🌊', description: 'Sky reflects the ocean\'s color' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Question */}
            <div style={{
              textAlign: 'center',
              marginBottom: spacing.xxl
            }}>
              <span style={{
                ...typography.label,
                color: colors.brand,
                display: 'block',
                marginBottom: spacing.sm,
              }}>
                YOUR PREDICTION
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.md,
              }}>
                Why does the daytime sky appear blue?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Think about what happens when sunlight enters our atmosphere.
              </p>
            </div>

            {/* Options */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.lg,
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    border: `2px solid ${prediction === p.id ? colors.brand : colors.border}`,
                    background: prediction === p.id ? colors.brandGlow : colors.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{p.icon}</span>
                  <div>
                    <div style={{
                      ...typography.h3,
                      color: prediction === p.id ? colors.brand : colors.textPrimary,
                      marginBottom: 2,
                    }}>
                      {p.label}
                    </div>
                    <div style={{
                      ...typography.bodySmall,
                      color: colors.textSecondary
                    }}>
                      {p.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button
                onClick={() => handleButtonClick(() => goToPhase('play'), navigationLock)}
                disabled={prediction === null}
              >
                Test It Out →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PLAY
  // ============================================================================
  if (phase === 'play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
              <span style={{
                ...typography.label,
                color: colors.brand,
                display: 'block',
                marginBottom: spacing.sm,
              }}>
                SCATTERING LAB
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Watch Light Scatter
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Observe what happens when white light passes through tiny particles
              </p>
            </div>

            {/* Visualization */}
            <ScatteringTank />

            {/* Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              {/* Particle Size */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.md,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}>
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>PARTICLE SIZE</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>
                    {particleSize < 1 ? 'Tiny (Molecules)' : particleSize < 5 ? 'Small (Aerosols)' : 'Large (Droplets)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={particleSize}
                  onChange={(e) => setParticleSize(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
                  <span style={{ ...typography.caption, color: colors.sky }}>Rayleigh</span>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>→</span>
                  <span style={{ ...typography.caption, color: colors.white }}>Mie</span>
                </div>
              </div>

              {/* Concentration */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.md,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}>
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>CONCENTRATION</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{concentration}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={concentration}
                  onChange={(e) => setConcentration(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>Few particles</span>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>Many particles</span>
                </div>
              </div>
            </div>

            {/* Key Observation */}
            <div style={{
              padding: spacing.lg,
              background: colors.successBg,
              borderRadius: radius.lg,
              border: `1px solid ${colors.success}40`,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                ...typography.body,
                color: colors.success,
                fontWeight: 600,
                marginBottom: spacing.xs
              }}>
                🔍 Key Observation
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                With <strong style={{ color: colors.textPrimary }}>tiny particles</strong>: side view is bluish, through view is yellowish.
                With <strong style={{ color: colors.textPrimary }}>large particles</strong>: both views become white/gray!
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => handleButtonClick(goNext, navigationLock)}>
                Continue to Review →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 'review') {
    const userWasRight = prediction === 1;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Result */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
              <div style={{ fontSize: 64, marginBottom: spacing.lg }}>
                {userWasRight ? '🎯' : '💡'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.brand,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Exactly Right!' : 'It\'s All About Scattering!'}
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Blue light scatters more than red - this is Rayleigh scattering
              </p>
            </div>

            {/* Core Concepts */}
            <div style={{
              padding: spacing.xl,
              background: colors.bgCard,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <h3 style={{
                ...typography.h2,
                color: colors.textPrimary,
                marginBottom: spacing.lg
              }}>
                Two Types of Scattering
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing.lg,
                marginBottom: spacing.lg,
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.sky}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.sky}30`,
                }}>
                  <div style={{ ...typography.h3, color: colors.sky, marginBottom: spacing.sm }}>
                    Rayleigh Scattering
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }}>
                    Particles &lt;&lt; wavelength
                  </div>
                  <div style={{
                    padding: spacing.sm,
                    background: colors.bgElevated,
                    borderRadius: radius.sm,
                    textAlign: 'center',
                  }}>
                    <span style={{ ...typography.h3, color: colors.sky }}>I ∝ 1/λ⁴</span>
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    Blue scatters 5.5× more than red!
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.white}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm }}>
                    Mie Scattering
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }}>
                    Particles ≈ wavelength
                  </div>
                  <div style={{
                    padding: spacing.sm,
                    background: colors.bgElevated,
                    borderRadius: radius.sm,
                    textAlign: 'center',
                  }}>
                    <span style={{ ...typography.h3, color: colors.textPrimary }}>All λ equal</span>
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    All colors scatter equally → white
                  </div>
                </div>
              </div>
            </div>

            {/* Sky vs Cloud explanation */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}>
              <div style={{
                padding: spacing.lg,
                background: 'linear-gradient(180deg, #7DD3FC20 0%, #38BDF820 100%)',
                borderRadius: radius.lg,
                border: `1px solid ${colors.sky}30`,
              }}>
                <div style={{ fontSize: 32, marginBottom: spacing.sm }}>🌤️</div>
                <div style={{ ...typography.h3, color: colors.sky, marginBottom: spacing.xs }}>Blue Sky</div>
                <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                  N₂ and O₂ molecules are tiny (~0.1nm). Rayleigh scattering sends blue light in all directions.
                </div>
              </div>
              <div style={{
                padding: spacing.lg,
                background: colors.bgCard,
                borderRadius: radius.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: 32, marginBottom: spacing.sm }}>☁️</div>
                <div style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>White Clouds</div>
                <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                  Water droplets are huge (~10-20μm). Mie scattering reflects all colors equally → white.
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => handleButtonClick(goNext, navigationLock)}>
                Try a Twist →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 0, label: 'More vivid (brighter red)', icon: '🔴', description: 'Longer path = more red light' },
      { id: 1, label: 'Less vivid (dimmer)', icon: '⚫', description: 'All light gets scattered away' },
      { id: 2, label: 'Turns purple', icon: '🟣', description: 'Blue and red combine' },
      { id: 3, label: 'No change', icon: '⚪', description: 'Color doesn\'t depend on path length' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Twist Introduction */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
              <span style={{
                ...typography.label,
                color: colors.warning,
                display: 'block',
                marginBottom: spacing.sm,
              }}>
                🔄 TWIST SCENARIO
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.md,
              }}>
                What About Sunsets?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                At sunset, light travels through MUCH more atmosphere. What happens to the color?
              </p>
            </div>

            {/* Diagram showing longer path */}
            <div style={{
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: radius.lg,
              padding: spacing.xl,
              marginBottom: spacing.xxl,
              position: 'relative',
              height: 120,
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 20,
                background: '#374151',
                borderRadius: `0 0 ${radius.lg}px ${radius.lg}px`,
              }} />
              <div style={{
                position: 'absolute',
                bottom: 15,
                left: 20,
                width: 40,
                height: 40,
                borderRadius: radius.full,
                background: 'linear-gradient(135deg, #FCD34D 0%, #F97316 100%)',
              }} />
              <div style={{
                position: 'absolute',
                bottom: 25,
                left: 65,
                right: 20,
                height: 2,
                background: 'linear-gradient(90deg, #F97316 0%, #EF4444 50%, transparent 100%)',
              }} />
              <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                ...typography.caption,
                color: colors.textSecondary,
              }}>
                ~40× longer path
              </div>
            </div>

            {/* Options */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {twistOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTwistPrediction(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.lg,
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    background: twistPrediction === opt.id ? colors.warningBg : colors.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div>
                    <div style={{
                      ...typography.h3,
                      color: twistPrediction === opt.id ? colors.warning : colors.textPrimary,
                      marginBottom: 2,
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      ...typography.bodySmall,
                      color: colors.textSecondary
                    }}>
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button
                onClick={() => handleButtonClick(goNext, navigationLock)}
                disabled={twistPrediction === null}
              >
                Explore →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  if (phase === 'twist_play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
              <span style={{
                ...typography.label,
                color: colors.warning,
                display: 'block',
                marginBottom: spacing.sm,
              }}>
                TWIST EXPERIMENT
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Sunset Simulation
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Increase the path length to simulate sunset conditions
              </p>
            </div>

            {/* Visualization */}
            <ScatteringTank />

            {/* Path Length Slider - Prominent */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              border: `1px solid ${colors.warning}40`,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}>
                <span style={{ ...typography.body, color: colors.warning, fontWeight: 600 }}>
                  🌅 Path Length (Atmosphere Thickness)
                </span>
                <span style={{ ...typography.h2, color: colors.warning }}>
                  {pathLength}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={pathLength}
                onChange={(e) => setPathLength(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.md,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>🌞</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Noon</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>🌤️</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Afternoon</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>🌅</div>
                  <div style={{ ...typography.caption, color: colors.warning }}>Sunset</div>
                </div>
              </div>
            </div>

            {/* Observation */}
            <div style={{
              padding: spacing.lg,
              background: colors.warningBg,
              borderRadius: radius.lg,
              border: `1px solid ${colors.warning}40`,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                ...typography.body,
                color: colors.warning,
                fontWeight: 600,
                marginBottom: spacing.xs
              }}>
                🔍 What to Notice
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                As path length increases, the <strong style={{ color: colors.textPrimary }}>through view</strong> shifts from white → yellow → orange → red. Blue gets completely scattered away before reaching you!
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => handleButtonClick(goNext, navigationLock)}>
                See the Insight →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  if (phase === 'twist_review') {
    const userWasRight = twistPrediction === 0;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Result */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
              <div style={{ fontSize: 64, marginBottom: spacing.lg }}>
                {userWasRight ? '🎯' : '🌅'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.warning,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'You Got It!' : 'More Path = More Red!'}
              </h2>
            </div>

            {/* Core Insight */}
            <div style={{
              padding: spacing.xl,
              background: colors.bgCard,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <h3 style={{
                ...typography.h2,
                color: colors.textPrimary,
                marginBottom: spacing.lg
              }}>
                The Sunset Effect
              </h3>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                marginBottom: spacing.lg,
                padding: spacing.lg,
                background: 'linear-gradient(90deg, #3B82F620 0%, #EAB30820 50%, #EF444420 100%)',
                borderRadius: radius.md,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: spacing.xs }}>🌞</div>
                  <div style={{ ...typography.caption, color: colors.sky }}>Noon</div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>Blue sky</div>
                </div>
                <div style={{ color: colors.textTertiary }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: spacing.xs }}>🌅</div>
                  <div style={{ ...typography.caption, color: colors.orange }}>Sunset</div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>Red/orange</div>
                </div>
              </div>

              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                marginBottom: spacing.lg
              }}>
                At sunset, sunlight travels through <strong style={{ color: colors.textPrimary }}>~40× more atmosphere</strong>. Blue light gets completely scattered away before reaching your eyes, leaving only red and orange.
              </p>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
              }}>
                <div style={{ ...typography.h3, color: colors.warning, marginBottom: spacing.sm }}>
                  Why More = Redder?
                </div>
                <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                  Each meter of atmosphere removes some blue. After enough distance, even green and yellow get scattered out - only the longest wavelengths (red/orange) survive the journey.
                </div>
              </div>
            </div>

            {/* Bonus fact */}
            <div style={{
              padding: spacing.lg,
              background: colors.warningBg,
              borderRadius: radius.lg,
              border: `1px solid ${colors.warning}40`,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                ...typography.body,
                color: colors.warning,
                fontWeight: 600,
                marginBottom: spacing.sm
              }}>
                🌋 Bonus: Volcanic Sunsets
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                After volcanic eruptions, ash particles add Mie scattering that spreads reds and oranges wider across the sky. The 1883 Krakatoa eruption created brilliant red sunsets worldwide for months!
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => handleButtonClick(goNext, navigationLock)}>
                Real World Applications →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications) - SEQUENTIAL NAVIGATION
  // ============================================================================
  if (phase === 'transfer') {
    const app = applications[selectedApp];
    const allCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    const handleCompleteApp = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);

      if (selectedApp < applications.length - 1) {
        setSelectedApp(selectedApp + 1);
      }
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: colors.bgElevated,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            Application {selectedApp + 1} of {applications.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {applications.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: completedApps[idx]
                    ? colors.success
                    : idx === selectedApp
                    ? colors.brand
                    : colors.bgHover,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: colors.textTertiary }}>
            ({completedCount}/4 {allCompleted ? '✓' : 'viewed'})
          </span>
        </div>

        {/* Tab Navigation - only allow clicking on completed or current */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          padding: spacing.md,
          borderBottom: `1px solid ${colors.border}`,
          overflowX: 'auto',
          background: colors.bgElevated,
        }}>
          {applications.map((a, idx) => {
            const isCompleted = completedApps[idx];
            const isCurrent = idx === selectedApp;
            const isLocked = idx > 0 && !completedApps[idx - 1] && !isCompleted;

            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!isLocked) {
                    handleButtonClick(() => setSelectedApp(idx), tabLock);
                  }
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: radius.md,
                  border: `2px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                  background: isCurrent ? `${a.color}20` : 'transparent',
                  color: isCurrent ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.4 : 1,
                  whiteSpace: 'nowrap',
                  fontFamily: typography.fontFamily,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                {a.icon} {a.title.split(' ')[0]}
                {isCompleted && <span style={{ color: colors.success }}>✓</span>}
                {isLocked && <span>🔒</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: radius.lg,
                background: `${app.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}>
                {app.icon}
              </div>
              <div>
                <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs }}>{app.title}</h2>
                <p style={{ ...typography.bodySmall, color: app.color, margin: 0, fontWeight: 500 }}>{app.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 1.7 }}>
              {app.description}
            </p>

            {/* Physics Connection */}
            <div style={{
              padding: spacing.lg,
              background: `${app.color}10`,
              borderRadius: radius.md,
              border: `1px solid ${app.color}30`,
              marginBottom: spacing.lg,
            }}>
              <p style={{ ...typography.body, color: app.color, fontWeight: 600, marginBottom: spacing.xs }}>🔗 Physics Connection</p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>{app.physics}</p>
            </div>

            {/* Insight */}
            <div style={{
              padding: spacing.lg,
              background: colors.bgCard,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}>
              <p style={{ ...typography.body, color: colors.textPrimary, fontWeight: 600, marginBottom: spacing.xs }}>💡 Key Insight</p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>{app.insight}</p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  padding: spacing.md,
                  background: colors.bgCard,
                  borderRadius: radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h3, color: app.color, marginBottom: 2 }}>{stat.value}</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          padding: spacing.lg,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          background: colors.bgElevated,
        }}>
          {selectedApp > 0 ? (
            <button
              onMouseDown={() => handleButtonClick(() => setSelectedApp(selectedApp - 1), tabLock)}
              style={{
                padding: '12px 24px',
                borderRadius: radius.md,
                border: 'none',
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              ← Previous
            </button>
          ) : <div />}

          {allCompleted ? (
            <button
              onMouseDown={() => handleButtonClick(() => goToPhase('test'), navigationLock)}
              style={{
                padding: '12px 24px',
                borderRadius: radius.md,
                border: 'none',
                background: colors.success,
                color: '#FFFFFF',
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Take the Quiz →
            </button>
          ) : (
            <button
              onMouseDown={() => handleButtonClick(handleCompleteApp, tabLock)}
              style={{
                padding: '12px 24px',
                borderRadius: radius.md,
                border: 'none',
                background: colors.brand,
                color: '#FFFFFF',
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {completedApps[selectedApp] ? 'Next Application →' : 'Mark Complete & Continue →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 'test') {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans === testQuestions[i].correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
          <ProgressBar />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
              <div style={{ fontSize: 72, marginBottom: spacing.lg }}>{passed ? '🎉' : '📚'}</div>
              <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm }}>
                {passed ? 'Excellent Work!' : 'Keep Learning!'}
              </h2>
              <div style={{ ...typography.hero, fontSize: 56, color: passed ? colors.success : colors.warning, marginBottom: spacing.md }}>
                {totalCorrect}/10
              </div>
              <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
                {passed ? 'You\'ve mastered light scattering!' : 'Review the concepts and try again.'}
              </p>
              <Button onClick={() => passed ? goNext() : goToPhase('review')} variant={passed ? 'success' : 'primary'} size="lg">
                {passed ? 'Complete! →' : 'Review Material'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        <ProgressBar />
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <span style={{ ...typography.label, color: colors.brand }}>QUESTION {testIndex + 1} OF 10</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: radius.full,
                    background: testAnswers[i] !== null
                      ? (testAnswers[i] === testQuestions[i].correct ? colors.success : colors.error)
                      : i === testIndex ? colors.brand : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Question */}
            <h2 style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xl, lineHeight: 1.4 }}>
              {q.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl }}>
              {q.options.map((opt, i) => {
                const isSelected = testAnswers[testIndex] === i;
                const isCorrect = i === q.correct;
                const showResult = testAnswers[testIndex] !== null;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (testAnswers[testIndex] === null) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testIndex] = i;
                        setTestAnswers(newAnswers);
                        emit(i === q.correct ? 'correct_answer' : 'incorrect_answer', { questionIndex: testIndex });
                      }
                    }}
                    style={{
                      padding: spacing.lg,
                      borderRadius: radius.md,
                      textAlign: 'left',
                      background: showResult
                        ? (isCorrect ? colors.successBg : isSelected ? colors.errorBg : colors.bgCard)
                        : isSelected ? colors.brandGlow : colors.bgCard,
                      border: `2px solid ${showResult
                        ? (isCorrect ? colors.success : isSelected ? colors.error : colors.border)
                        : isSelected ? colors.brand : colors.border}`,
                      color: colors.textPrimary,
                      cursor: showResult ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    <span style={{
                      fontWeight: 700,
                      marginRight: spacing.md,
                      color: showResult ? (isCorrect ? colors.success : isSelected ? colors.error : colors.textSecondary) : colors.brand
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation (after answer) */}
            {testAnswers[testIndex] !== null && (
              <div style={{
                padding: spacing.lg,
                background: colors.bgCard,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                marginBottom: spacing.xl,
              }}>
                <p style={{ ...typography.body, color: colors.textPrimary, fontWeight: 600, marginBottom: spacing.xs }}>
                  💡 Explanation
                </p>
                <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                  {q.explanation}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {testIndex > 0 ? (
                <Button onClick={() => setTestIndex(testIndex - 1)} variant="ghost">← Previous</Button>
              ) : <div />}
              {testAnswers[testIndex] !== null && (
                testIndex < testQuestions.length - 1 ? (
                  <Button onClick={() => setTestIndex(testIndex + 1)}>Next Question →</Button>
                ) : (
                  <Button onClick={() => setTestSubmitted(true)} variant="success">See Results →</Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  if (phase === 'mastery') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily
      }}>
        <ProgressBar />

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            {/* Trophy */}
            <div style={{
              width: 120,
              height: 120,
              borderRadius: radius.full,
              background: `linear-gradient(135deg, ${colors.sky}30, ${colors.orange}30)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.xl,
              fontSize: 56,
            }}>
              🏆
            </div>

            {/* Title */}
            <h1 style={{
              ...typography.hero,
              color: colors.textPrimary,
              marginBottom: spacing.md
            }}>
              Scattering Expert!
            </h1>

            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              You now understand why the sky is blue, clouds are white, and sunsets glow red!
            </p>

            {/* Achievements */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {[
                { icon: '🔵', label: 'Rayleigh' },
                { icon: '⚪', label: 'Mie' },
                { icon: '🌅', label: 'Sunsets' },
              ].map((achievement, i) => (
                <div key={i} style={{
                  padding: spacing.lg,
                  background: colors.bgCard,
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ fontSize: 32, marginBottom: spacing.sm }}>{achievement.icon}</div>
                  <div style={{ ...typography.caption, color: colors.textSecondary }}>{achievement.label}</div>
                </div>
              ))}
            </div>

            {/* Key Formula */}
            <div style={{
              padding: spacing.xl,
              background: colors.bgCard,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xxl,
            }}>
              <p style={{ ...typography.label, color: colors.brand, marginBottom: spacing.md }}>
                KEY CONCEPT MASTERED
              </p>
              <p style={{ ...typography.h2, color: colors.textPrimary, margin: 0 }}>
                Rayleigh: I ∝ 1/λ⁴
              </p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm }}>
                Small particles scatter short wavelengths (blue) much more than long wavelengths (red)
              </p>
            </div>

            {/* CTA */}
            <button
              onMouseDown={() => handleButtonClick(() => onComplete?.(), navigationLock)}
              style={{
                padding: '16px 48px',
                borderRadius: radius.lg,
                border: 'none',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
                boxShadow: `0 4px 20px ${colors.successBg}`,
              }}
            >
              Complete Lesson ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: colors.bg,
      fontFamily: typography.fontFamily,
    }}>
      <p style={{ color: colors.textSecondary }}>Loading...</p>
    </div>
  );
}
