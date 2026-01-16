'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// PRESSURE RENDERER - PREMIUM PHYSICS GAME
// The Bed of Nails: Why standing on 1 nail hurts, but 1000 nails is fine
// ============================================================================

interface PressureRendererProps {
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
  pressure: '#EF4444',
  force: '#3B82F6',
  area: '#10B981',
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
    id: 'shoes',
    icon: '👠',
    title: 'High Heels vs Snowshoes',
    subtitle: 'Fashion & Function',
    color: '#EC4899',
    description: 'A 60kg woman in stilettos (1 cm² heel) exerts 30 MPa - enough to damage hardwood floors! The same woman in snowshoes (2000 cm²) exerts just 300 Pa - she can walk on snow without sinking.',
    physics: 'Pressure = Force/Area. Stiletto: 600N / 0.0001m² = 6 MPa per heel. Snowshoes: 600N / 0.2m² = 3000 Pa. That\'s 2000× less pressure!',
    insight: 'This is why many historic buildings ban high heels, and why we use snowshoes, skis, and wide tires on soft surfaces.',
    stats: [
      { value: '6 MPa', label: 'Stiletto' },
      { value: '3 kPa', label: 'Snowshoe' },
      { value: '2000×', label: 'Difference' },
    ],
  },
  {
    id: 'knives',
    icon: '🔪',
    title: 'Sharp vs Dull Knives',
    subtitle: 'Kitchen Science',
    color: '#EF4444',
    description: 'A sharp knife has an edge thickness of ~0.1mm, creating extreme pressure with minimal force. A dull knife (1mm edge) needs 10× more force to cut, which is why dull knives are actually MORE dangerous.',
    physics: 'Sharp edge: Force concentrated on tiny area → high pressure → clean cut. Dull edge: Same force spread over larger area → must push harder → more likely to slip.',
    insight: 'Surgeons use obsidian scalpels (sharper than steel) for delicate operations. The pressure at the edge can exceed 1 GPa.',
    stats: [
      { value: '0.1mm', label: 'Sharp Edge' },
      { value: '10×', label: 'Force Diff' },
      { value: '1 GPa', label: 'Edge Pressure' },
    ],
  },
  {
    id: 'tires',
    icon: '🚗',
    title: 'Tire Pressure & Contact',
    subtitle: 'Automotive Engineering',
    color: '#3B82F6',
    description: 'Car tires at 32 PSI (220 kPa) support a 1500kg car because the contact patch adjusts. Under-inflate to 20 PSI and the contact patch grows larger to maintain the same force support.',
    physics: 'Tire pressure × contact area = weight supported. If tire pressure drops, contact area increases proportionally. P₁A₁ = P₂A₂ = mg.',
    insight: 'Race cars use wide, soft tires for maximum grip (larger contact patch), while eco cars use narrow, hard tires for low rolling resistance.',
    stats: [
      { value: '32 PSI', label: 'Normal' },
      { value: '~200 cm²', label: 'Contact Area' },
      { value: '4×', label: 'Per Tire' },
    ],
  },
  {
    id: 'scuba',
    icon: '🤿',
    title: 'Scuba Diving Pressure',
    subtitle: 'Underwater Physics',
    color: '#06B6D4',
    description: 'Water pressure increases by 1 atmosphere (101 kPa) every 10 meters. At 30m depth, you experience 4 atm - your lungs compress to 1/4 their surface volume!',
    physics: 'P = P₀ + ρgh. Water density ~1000 kg/m³, so every 10m adds ~100 kPa. Scuba regulators deliver air at ambient pressure to let you breathe normally.',
    insight: 'Deep divers must ascend slowly to avoid "the bends" - nitrogen dissolved in blood at high pressure can form bubbles if pressure drops too fast.',
    stats: [
      { value: '1 atm', label: 'Per 10m' },
      { value: '4 atm', label: 'At 30m' },
      { value: '332m', label: 'Record Dive' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 70kg person stands on one foot (100 cm² contact area). What pressure do they exert? (g = 10 m/s²)',
    options: ['700 Pa', '7,000 Pa', '70,000 Pa', '700,000 Pa'],
    correct: 2,
    explanation: 'P = F/A = mg/A = (70 × 10) / 0.01m² = 70,000 Pa = 70 kPa',
  },
  {
    question: 'Standing on a bed of 1000 nails vs 1 nail (same total area), the pressure per nail is:',
    options: ['1000× higher on many nails', '1000× lower on many nails', 'Same for both', 'Cannot determine'],
    correct: 1,
    explanation: 'With 1000 nails, force is divided among them. Each nail receives 1/1000 of the force, so pressure per nail is 1000× less.',
  },
  {
    question: 'A sharp knife with 0.5mm edge width needs 10N to cut a tomato. A dull knife with 5mm edge needs:',
    options: ['1N', '10N', '100N', '1000N'],
    correct: 2,
    explanation: 'Same pressure needed to cut. Dull edge is 10× wider, so needs 10× more force to achieve same pressure.',
  },
  {
    question: 'Why do camels have large flat feet?',
    options: ['To kick predators', 'To reduce pressure on sand', 'To run faster', 'To store water'],
    correct: 1,
    explanation: 'Large feet spread weight over larger area, reducing pressure on soft sand so they don\'t sink.',
  },
  {
    question: 'If you double the force AND double the area, what happens to pressure?',
    options: ['Doubles', 'Quadruples', 'Stays the same', 'Halves'],
    correct: 2,
    explanation: 'P = F/A. If both F and A double: P = 2F/2A = F/A. Pressure unchanged.',
  },
  {
    question: 'A hydraulic press has pistons with area ratio 1:100. If you push with 10N on the small piston, the force on the large piston is:',
    options: ['10N', '100N', '1000N', '0.1N'],
    correct: 2,
    explanation: 'Pressure is equal throughout. F₁/A₁ = F₂/A₂. So F₂ = F₁ × (A₂/A₁) = 10 × 100 = 1000N.',
  },
  {
    question: 'At 20m underwater, the total pressure on a diver is approximately:',
    options: ['1 atmosphere', '2 atmospheres', '3 atmospheres', '20 atmospheres'],
    correct: 2,
    explanation: 'Pressure increases by 1 atm per 10m depth. At 20m: 1 atm (surface) + 2 atm (water) = 3 atm total.',
  },
  {
    question: 'Why is it easier to push a thumbtack into wood than a blunt nail?',
    options: ['Thumbtack is sharper', 'Thumbtack has less mass', 'Thumbtack creates more friction', 'Thumbtack is made of harder material'],
    correct: 0,
    explanation: 'Sharp point concentrates force on tiny area → extremely high pressure → penetrates wood easily.',
  },
  {
    question: 'A tank full of water has a small hole at the bottom. If you double the water height, the water shoots out:',
    options: ['At the same speed', '2× faster', '√2 faster', '4× faster'],
    correct: 2,
    explanation: 'Exit velocity v = √(2gh). Doubling h gives v₂ = √(2×2gh) = √2 × √(2gh) = √2 × v₁.',
  },
  {
    question: 'Standard atmospheric pressure (101 kPa) pushes on every square meter of your body with a force of:',
    options: ['101 N', '1,010 N', '10,100 N', '101,000 N'],
    correct: 3,
    explanation: 'P = F/A, so F = P × A = 101,000 Pa × 1 m² = 101,000 N (about 10 tons per square meter!).',
  },
];

export default function PressureRenderer({ onComplete, emit = () => {} }: PressureRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [numNails, setNumNails] = useState(1);
  const [personWeight, setPersonWeight] = useState(700); // Newtons
  const [nailTipArea, setNailTipArea] = useState(1); // mm²

  // Button debounce lock
  const navigationLockRef = useRef(false);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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


  // Calculate pressure values
  const calculatePressure = useCallback(() => {
    const totalArea = numNails * nailTipArea * 1e-6; // Convert mm² to m²
    const forcePerNail = personWeight / numNails;
    const pressurePerNail = forcePerNail / (nailTipArea * 1e-6); // Pa
    const totalPressure = personWeight / totalArea; // Pa

    // Pain threshold is roughly 1 MPa
    const painThreshold = 1e6; // 1 MPa
    const painLevel = Math.min(100, (pressurePerNail / painThreshold) * 100);
    const isSafe = pressurePerNail < painThreshold;

    return {
      forcePerNail,
      pressurePerNail,
      totalPressure,
      painLevel,
      isSafe,
      pressurePerNailMPa: pressurePerNail / 1e6,
    };
  }, [numNails, personWeight, nailTipArea]);

  // Helper function: renderButton
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    options?: { disabled?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, size = 'md' } = options || {};

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
        onMouseDown={(e) => {
          e.preventDefault();
          if (disabled || navigationLockRef.current) return;
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        disabled={disabled}
        style={{ ...baseStyle, ...variants[variant], ...sizes[size] }}
      >
        {label}
      </button>
    );
  };

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

  // Helper function: Nail bed visualization
  function NailBedVisualization() {
    const values = calculatePressure();
    const displayNails = Math.min(numNails, 100); // Show max 100 nails visually
    const gridSize = Math.ceil(Math.sqrt(displayNails));

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        {/* Visual */}
        <svg
          viewBox="0 0 300 200"
          style={{
            width: '100%',
            height: isMobile ? 180 : 220,
            background: `linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)`,
            borderRadius: radius.md,
          }}
        >
          {/* Person silhouette */}
          <g transform="translate(150, 30)">
            <ellipse cx="0" cy="0" rx="25" ry="15" fill={colors.bgHover} />
            <rect x="-20" y="15" width="40" height="60" rx="5" fill={colors.bgHover} />
            <text x="0" y="45" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
              {(personWeight / 10).toFixed(0)}kg
            </text>
          </g>

          {/* Force arrows */}
          <line x1="150" y1="100" x2="150" y2="130" stroke={colors.force} strokeWidth="3" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.force} />
            </marker>
          </defs>
          <text x="165" y="120" fill={colors.force} fontSize="10">{personWeight}N</text>

          {/* Nail bed */}
          <rect x="50" y="140" width="200" height="10" fill={colors.bgElevated} rx="2" />

          {/* Individual nails */}
          {Array.from({ length: displayNails }).map((_, i) => {
            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const startX = 150 - (gridSize * 10) / 2;
            const x = startX + col * 12 + 6;
            const y = 140 - row * 8;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y + 10}
                  stroke={values.isSafe ? colors.success : colors.error}
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill={values.isSafe ? colors.success : colors.error}
                />
              </g>
            );
          })}
          {numNails > 100 && (
            <text x="150" y="170" textAnchor="middle" fill={colors.textTertiary} fontSize="10">
              (showing 100 of {numNails} nails)
            </text>
          )}

          {/* Pain indicator */}
          <text
            x="150"
            y="190"
            textAnchor="middle"
            fill={values.isSafe ? colors.success : colors.error}
            fontSize="14"
            fontWeight="bold"
          >
            {values.isSafe ? '✓ Comfortable' : '⚠ Painful!'}
          </text>
        </svg>

        {/* Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...typography.caption, color: colors.force, marginBottom: spacing.xs }}>
              FORCE PER NAIL
            </div>
            <div style={{ ...typography.h3, color: colors.textPrimary }}>
              {values.forcePerNail.toFixed(1)} N
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...typography.caption, color: colors.pressure, marginBottom: spacing.xs }}>
              PRESSURE
            </div>
            <div style={{ ...typography.h3, color: colors.textPrimary }}>
              {values.pressurePerNailMPa.toFixed(2)} MPa
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...typography.caption, color: colors.area, marginBottom: spacing.xs }}>
              PAIN LEVEL
            </div>
            <div style={{
              ...typography.h3,
              color: values.painLevel > 100 ? colors.error : values.painLevel > 50 ? colors.warning : colors.success
            }}>
              {Math.min(values.painLevel, 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Pain threshold bar */}
        <div style={{ marginTop: spacing.lg }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: spacing.xs,
          }}>
            <span style={{ ...typography.caption, color: colors.textTertiary }}>Pressure vs Pain Threshold (1 MPa)</span>
          </div>
          <div style={{
            height: 12,
            background: colors.bgHover,
            borderRadius: radius.full,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              background: colors.warning,
              zIndex: 1,
            }} />
            <div style={{
              height: '100%',
              width: `${Math.min(100, values.painLevel)}%`,
              background: values.painLevel > 100 ? colors.error : values.painLevel > 50 ? colors.warning : colors.success,
              transition: 'all 0.3s ease',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
          }}>
            <span style={{ ...typography.caption, color: colors.success }}>Safe</span>
            <span style={{ ...typography.caption, color: colors.warning }}>Threshold</span>
            <span style={{ ...typography.caption, color: colors.error }}>Painful</span>
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
            {/* Icon */}
            <div style={{
              width: 100,
              height: 100,
              borderRadius: radius.full,
              background: `linear-gradient(135deg, ${colors.pressure}30, ${colors.area}30)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.xl,
              fontSize: 48,
            }}>
              📍
            </div>

            {/* Title */}
            <h1 style={{
              ...typography.hero,
              color: colors.textPrimary,
              marginBottom: spacing.lg
            }}>
              The Bed of Nails
            </h1>

            {/* Subtitle */}
            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              Why does standing on ONE nail hurt terribly, but lying on 1000 nails is perfectly comfortable?
            </p>

            {/* Visual Preview */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              marginBottom: spacing.xxl,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: spacing.sm }}>📍</div>
                  <div style={{ ...typography.h3, color: colors.error }}>1 Nail</div>
                  <div style={{ ...typography.caption, color: colors.error }}>OUCH! 😱</div>
                </div>
                <div style={{
                  width: 2,
                  height: 60,
                  background: colors.border,
                }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: spacing.sm }}>📍📍📍</div>
                  <div style={{ ...typography.h3, color: colors.success }}>1000 Nails</div>
                  <div style={{ ...typography.caption, color: colors.success }}>Comfortable! 😌</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onMouseDown={() => goToPhase('predict')}
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
      { id: 0, label: 'Magic or illusion', icon: '🎩', description: 'It\'s just a circus trick' },
      { id: 1, label: 'The nails are blunt', icon: '🔨', description: 'They use special dull nails' },
      { id: 2, label: 'Force is distributed', icon: '📊', description: 'Each nail shares the weight' },
      { id: 3, label: 'Training and practice', icon: '🧘', description: 'Performers build up tolerance' },
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
                Why can someone lie comfortably on a bed of 1000 sharp nails?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                What's the physics behind this seemingly impossible feat?
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
                onClick={() => goToPhase('play')}
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
                PRESSURE SIMULATOR
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Adjust the Number of Nails
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                See how pressure changes as you add more nails
              </p>
            </div>

            {/* Visualization */}
            <NailBedVisualization />

            {/* Nail count slider */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              border: `1px solid ${colors.border}`,
              marginTop: spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}>
                <span style={{ ...typography.body, color: colors.textPrimary, fontWeight: 600 }}>
                  📍 Number of Nails
                </span>
                <span style={{ ...typography.h2, color: colors.brand }}>
                  {numNails.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                value={numNails}
                onChange={(e) => setNumNails(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.sm,
              }}>
                <span style={{ ...typography.caption, color: colors.error }}>1 (Ouch!)</span>
                <span style={{ ...typography.caption, color: colors.warning }}>100</span>
                <span style={{ ...typography.caption, color: colors.success }}>1000 (Safe)</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{
              display: 'flex',
              gap: spacing.sm,
              marginTop: spacing.lg,
              marginBottom: spacing.xl,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {[1, 10, 100, 500, 1000].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumNails(n)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: radius.md,
                    border: `2px solid ${numNails === n ? colors.brand : colors.border}`,
                    background: numNails === n ? colors.brandGlow : colors.bgCard,
                    color: numNails === n ? colors.brand : colors.textSecondary,
                    cursor: 'pointer',
                    fontFamily: typography.fontFamily,
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {n} nail{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => goNext()}>
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
    const userWasRight = prediction === 2;

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
                {userWasRight ? 'Exactly Right!' : 'It\'s All About Pressure!'}
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                The secret is force distribution over area
              </p>
            </div>

            {/* Core Concept */}
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
                The Pressure Equation
              </h3>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}>
                <p style={{
                  ...typography.h1,
                  color: colors.brand,
                  marginBottom: spacing.xs
                }}>
                  P = F / A
                </p>
                <p style={{ ...typography.bodySmall, color: colors.textTertiary }}>
                  Pressure = Force ÷ Area
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing.md,
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.pressure}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.pressure}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h2, color: colors.pressure, marginBottom: spacing.xs }}>
                    1 Nail
                  </div>
                  <div style={{ ...typography.body, color: colors.textSecondary }}>
                    700N ÷ 1mm²
                  </div>
                  <div style={{ ...typography.h3, color: colors.error, marginTop: spacing.sm }}>
                    = 700 MPa 😱
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.area}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.area}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h2, color: colors.area, marginBottom: spacing.xs }}>
                    1000 Nails
                  </div>
                  <div style={{ ...typography.body, color: colors.textSecondary }}>
                    700N ÷ 1000mm²
                  </div>
                  <div style={{ ...typography.h3, color: colors.success, marginTop: spacing.sm }}>
                    = 0.7 MPa 😌
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insight */}
            <div style={{
              padding: spacing.lg,
              background: colors.brandGlow,
              borderRadius: radius.lg,
              border: `1px solid ${colors.brand}40`,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                ...typography.body,
                color: colors.brand,
                fontWeight: 600,
                marginBottom: spacing.sm
              }}>
                📌 Key Insight
              </p>
              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                margin: 0
              }}>
                Skin can tolerate about <strong style={{ color: colors.textPrimary }}>1 MPa</strong> of pressure. One nail creates 700× this threshold. 1000 nails spread the same force to safe levels!
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => goNext()}>
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
      { id: 0, label: 'Double the pressure', icon: '📈', description: 'More force = more pressure' },
      { id: 1, label: 'Same pressure', icon: '⚖️', description: 'More nails compensate for more force' },
      { id: 2, label: 'Half the pressure', icon: '📉', description: 'The extra nails reduce it more' },
      { id: 3, label: 'Cannot determine', icon: '❓', description: 'Need more information' },
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
                Double the Force, Double the Nails
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                If you double the weight AND double the number of nails, what happens to the pressure per nail?
              </p>
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
                onClick={() => goNext()}
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
    const [twistWeight, setTwistWeight] = useState(700);
    const [twistNails, setTwistNails] = useState(100);

    const basePressure = 700 / (100 * 1e-6); // 700N on 100 nails, 1mm² each
    const currentPressure = twistWeight / (twistNails * 1e-6);
    const pressureRatio = currentPressure / basePressure;

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
                Play with Force and Area
              </h2>
            </div>

            {/* Pressure Display */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
              textAlign: 'center',
            }}>
              <div style={{ ...typography.label, color: colors.textTertiary, marginBottom: spacing.md }}>
                CURRENT PRESSURE
              </div>
              <div style={{
                ...typography.hero,
                color: pressureRatio > 1.1 ? colors.error : pressureRatio < 0.9 ? colors.success : colors.warning,
                fontSize: 48,
              }}>
                {(currentPressure / 1e6).toFixed(2)} MPa
              </div>
              <div style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
                {pressureRatio.toFixed(2)}× baseline
              </div>
            </div>

            {/* Sliders */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: spacing.lg,
              marginBottom: spacing.xl,
            }}>
              {/* Weight */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.lg,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing.md,
                }}>
                  <span style={{ ...typography.body, color: colors.force, fontWeight: 600 }}>Force</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{twistWeight} N</span>
                </div>
                <input
                  type="range"
                  min="350"
                  max="1400"
                  value={twistWeight}
                  onChange={(e) => setTwistWeight(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Nails */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.lg,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing.md,
                }}>
                  <span style={{ ...typography.body, color: colors.area, fontWeight: 600 }}>Nails</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{twistNails}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={twistNails}
                  onChange={(e) => setTwistNails(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Formula visualization */}
            <div style={{
              background: colors.bgElevated,
              borderRadius: radius.lg,
              padding: spacing.lg,
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginBottom: spacing.xl,
            }}>
              <div style={{ ...typography.h3, color: colors.textSecondary, marginBottom: spacing.md }}>
                P = F / A
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.lg,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typography.h2, color: colors.force }}>{twistWeight}N</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Force</div>
                </div>
                <div style={{ ...typography.h1, color: colors.textTertiary }}>÷</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typography.h2, color: colors.area }}>{twistNails}mm²</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Area</div>
                </div>
                <div style={{ ...typography.h1, color: colors.textTertiary }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typography.h2, color: colors.pressure }}>{(currentPressure / 1e6).toFixed(2)}</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>MPa</div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => goNext()}>
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
    const userWasRight = twistPrediction === 1;

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
                {userWasRight ? '🎯' : '⚖️'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.warning,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Exactly!' : 'They Cancel Out!'}
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
                The Proportional Relationship
              </h3>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}>
                <p style={{
                  ...typography.h3,
                  color: colors.brand,
                  margin: 0,
                  marginBottom: spacing.sm,
                }}>
                  If F × 2 and A × 2, then P stays the same
                </p>
                <p style={{
                  ...typography.body,
                  color: colors.textSecondary,
                  margin: 0
                }}>
                  P = 2F / 2A = F / A
                </p>
              </div>

              <p style={{
                ...typography.body,
                color: colors.textSecondary,
              }}>
                This is why:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginTop: spacing.md }}>
                {[
                  { icon: '🐘', text: 'Elephants don\'t sink - their huge weight is matched by huge feet' },
                  { icon: '🏗️', text: 'Skyscrapers need wide foundations to spread their weight' },
                  { icon: '🚛', text: 'Heavy trucks have more wheels to distribute the load' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.bgHover,
                    borderRadius: radius.md,
                  }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <span style={{ ...typography.bodySmall, color: colors.textSecondary }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              <Button onClick={goBack} variant="ghost">← Back</Button>
              <Button onClick={() => goNext()}>
                Real World Applications →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications)
  // ============================================================================
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const isLastApp = activeApp === applications.length - 1;

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
            Application {activeApp + 1} of {applications.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {applications.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: idx <= activeApp ? colors.brand : colors.bgHover,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Tab Navigation - sequential with completedApps */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          padding: spacing.md,
          borderBottom: `1px solid ${colors.border}`,
          overflowX: 'auto',
          background: colors.bgElevated,
        }}>
          {applications.map((a, idx) => {
            const isUnlocked = idx === 0 || completedApps.has(idx - 1);
            const isCompleted = completedApps.has(idx);
            const isCurrent = idx === activeApp;
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (navigationLockRef.current || !isUnlocked) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: isCurrent ? a.color : isCompleted ? `${colors.success}20` : colors.bgCard,
                  color: isCurrent ? '#FFFFFF' : isCompleted ? colors.success : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  opacity: isUnlocked ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                  fontFamily: typography.fontFamily,
                  transition: 'all 0.2s',
                }}
              >
                {isCompleted ? '✓' : a.icon} {a.title}
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
          flexDirection: 'column',
          gap: spacing.md,
          background: colors.bgElevated,
        }}>
          {/* Mark as Read Button */}
          {!completedApps.has(activeApp) ? (
            <button
              onMouseDown={() => {
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              style={{
                width: '100%',
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
              ✓ Mark "{app.title}" as Read
            </button>
          ) : (
            <div style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: radius.md,
              background: `${colors.success}20`,
              border: `1px solid ${colors.success}`,
              color: colors.success,
              fontWeight: 600,
              textAlign: 'center',
              fontFamily: typography.fontFamily,
            }}>
              ✓ Completed
            </div>
          )}

          {/* Navigation Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {activeApp > 0 ? (
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(activeApp - 1);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
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
            <button
              onMouseDown={() => {
                if (navigationLockRef.current || completedApps.size < applications.length) return;
                navigationLockRef.current = true;
                goToPhase('test');
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              disabled={completedApps.size < applications.length}
              style={{
                padding: '12px 24px',
                borderRadius: radius.md,
                border: 'none',
                background: completedApps.size >= applications.length ? colors.brand : colors.bgCard,
                color: completedApps.size >= applications.length ? '#FFFFFF' : colors.textTertiary,
                cursor: completedApps.size >= applications.length ? 'pointer' : 'not-allowed',
                fontFamily: typography.fontFamily,
                fontSize: 15,
                fontWeight: 600,
                opacity: completedApps.size >= applications.length ? 1 : 0.5,
              }}
            >
              Take the Quiz →
            </button>
          </div>
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
                {passed ? 'You\'ve mastered pressure!' : 'Review the concepts and try again.'}
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
              background: `linear-gradient(135deg, ${colors.success}30, ${colors.brand}30)`,
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
              Pressure Expert!
            </h1>

            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              You now understand why force distribution over area is crucial - from knives to skyscrapers!
            </p>

            {/* Achievements */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {[
                { icon: '📍', label: 'P = F/A' },
                { icon: '👠', label: 'Area Matters' },
                { icon: '🤿', label: 'Fluid Pressure' },
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
                KEY FORMULA MASTERED
              </p>
              <p style={{ ...typography.h1, color: colors.textPrimary, margin: 0 }}>
                Pressure = Force / Area
              </p>
            </div>

            {/* CTA */}
            <button
              onMouseDown={() => onComplete?.()}
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
