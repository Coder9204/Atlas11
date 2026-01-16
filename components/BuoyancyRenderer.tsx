'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// BUOYANCY RENDERER - PREMIUM PHYSICS GAME
// Apparent Weight: Why you feel lighter in water
// ============================================================================

interface BuoyancyRendererProps {
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
  water: '#3B82F6',
  buoyancy: '#06B6D4',
  weight: '#EF4444',
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
    id: 'ships',
    icon: '🚢',
    title: 'Ship Design',
    subtitle: 'Naval Architecture',
    color: '#3B82F6',
    description: 'A massive steel ship floats because its hull displaces an enormous volume of water. The key is shape, not material - the same steel rolled into a ball would sink immediately.',
    physics: 'Ships are designed so total weight < buoyant force. A ship\'s "displacement" refers to the weight of water it pushes aside, which equals its own weight when floating.',
    insight: 'The Plimsoll line on ships marks the maximum safe loading depth. In denser saltwater, ships float higher, so load limits differ by water type.',
    stats: [
      { value: '228k tons', label: 'Largest Ship' },
      { value: '400m', label: 'Symphony Length' },
      { value: '1.025', label: 'Seawater ρ' },
    ],
  },
  {
    id: 'submarines',
    icon: '🛥️',
    title: 'Submarine Control',
    subtitle: 'Underwater Engineering',
    color: '#06B6D4',
    description: 'Submarines control depth by adjusting buoyancy using ballast tanks. Fill tanks with water to dive (heavier), pump out water to surface (lighter).',
    physics: 'At neutral buoyancy, weight exactly equals buoyant force. Submarines fine-tune with trim tanks and can hover at any depth. Compressed air systems evacuate ballast for emergency surfacing.',
    insight: 'Modern submarines can dive to 600+ meters. The crush depth depends on hull strength vs. water pressure (which increases by 1 atm per 10m).',
    stats: [
      { value: '600m', label: 'Max Depth' },
      { value: '240', label: 'Days Submerged' },
      { value: '25 knots', label: 'Speed' },
    ],
  },
  {
    id: 'hotair',
    icon: '🎈',
    title: 'Hot Air Balloons',
    subtitle: 'Atmospheric Buoyancy',
    color: '#F59E0B',
    description: 'Hot air balloons use buoyancy in air! Heating air inside the balloon makes it less dense than surrounding cool air, creating an upward buoyant force.',
    physics: 'Same principle as water: F_buoyancy = ρ_air × V × g. Hot air (100°C) has ρ ≈ 0.95 kg/m³ vs cold air at 1.2 kg/m³. A 2800 m³ balloon can lift ~600 kg.',
    insight: 'Altitude control is through temperature - burn propane to rise, let air cool to descend. Morning flights are best due to stable, cool air conditions.',
    stats: [
      { value: '2800 m³', label: 'Envelope Vol' },
      { value: '100°C', label: 'Hot Air Temp' },
      { value: '600 kg', label: 'Lift Capacity' },
    ],
  },
  {
    id: 'swimming',
    icon: '🏊',
    title: 'Swimming & Diving',
    subtitle: 'Human Buoyancy',
    color: '#10B981',
    description: 'Your body\'s density is very close to water (~1.06 vs 1.0 g/cm³). Lungs full of air = you float. Exhale = you sink. Body fat affects buoyancy significantly.',
    physics: 'Average human floats with lungs inflated (total ρ < 1.0). Divers use weight belts to achieve neutral buoyancy underwater. Wetsuits add buoyancy (air bubbles in neoprene).',
    insight: 'In the Dead Sea (ρ = 1.24 g/cm³), you can\'t sink even if you try! The extreme salt content makes the water 24% denser than fresh water.',
    stats: [
      { value: '1.06', label: 'Human ρ' },
      { value: '1.24', label: 'Dead Sea ρ' },
      { value: '3%', label: 'Body Fat Diff' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 5 kg object displaces 3 liters of water when fully submerged. What is the buoyant force? (g = 10 m/s²)',
    options: ['50 N', '30 N', '20 N', '15 N'],
    correct: 1,
    explanation: 'F_b = ρ_water × V × g = 1000 × 0.003 × 10 = 30 N',
  },
  {
    question: 'An object floats with 40% of its volume above water. What is its density relative to water?',
    options: ['0.4', '0.6', '1.0', '1.4'],
    correct: 1,
    explanation: 'If 40% above, 60% below. At equilibrium, ρ_object/ρ_water = fraction submerged = 0.6',
  },
  {
    question: 'A steel ship floats but a steel ball sinks. Why?',
    options: ['Ship steel is lighter', 'Ship shape displaces more water', 'Water pressure is different', 'Ships have special coatings'],
    correct: 1,
    explanation: 'The hollow ship shape displaces much more water than a ball of the same mass, creating greater buoyant force.',
  },
  {
    question: 'What happens to a floating object if you move it from fresh water (ρ=1.0) to salt water (ρ=1.025)?',
    options: ['Sinks lower', 'Floats higher', 'No change', 'Depends on object density'],
    correct: 1,
    explanation: 'Denser water provides more buoyant force per volume displaced, so less volume needs to be submerged.',
  },
  {
    question: 'A submarine wants to dive deeper. It should:',
    options: ['Pump air into ballast tanks', 'Pump water into ballast tanks', 'Heat the hull', 'Spin its propeller faster'],
    correct: 1,
    explanation: 'Adding water increases weight without changing volume, making weight > buoyant force, so it sinks.',
  },
  {
    question: 'A 60 kg person feels they weigh only 6 kg in a swimming pool. The buoyant force is:',
    options: ['60 N', '540 N', '600 N', '6 N'],
    correct: 1,
    explanation: 'Apparent weight = True weight - Buoyant force. 60 - 540 = 6 N apparent, so F_b = 540 N.',
  },
  {
    question: 'Two objects have the same mass. Object A floats, Object B sinks. Which has greater volume?',
    options: ['Object A', 'Object B', 'They have equal volume', 'Cannot determine'],
    correct: 0,
    explanation: 'Same mass but A floats means A has lower density, therefore greater volume (ρ = m/V).',
  },
  {
    question: 'A hot air balloon rises because:',
    options: ['Hot air is lighter than cold air', 'Heat creates upward convection', 'Fire produces lift gas', 'Thermal radiation pushes up'],
    correct: 0,
    explanation: 'Hot air has lower density than surrounding cold air, creating buoyancy in the atmosphere.',
  },
  {
    question: 'An ice cube floats with 90% of its volume underwater. When it melts, the water level:',
    options: ['Rises', 'Falls', 'Stays exactly the same', 'Depends on temperature'],
    correct: 2,
    explanation: 'The melted ice takes exactly the same volume as the water it was displacing while floating.',
  },
  {
    question: 'Archimedes\' principle states that buoyant force equals:',
    options: ['Weight of submerged object', 'Weight of displaced fluid', 'Volume of object × density of object', 'Pressure × surface area'],
    correct: 1,
    explanation: 'Buoyant force = weight of the fluid displaced by the submerged part of the object.',
  },
];

export default function BuoyancyRenderer({ onComplete, emit = () => {} }: BuoyancyRendererProps) {
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
  const [objectMass, setObjectMass] = useState(5); // kg
  const [objectVolume, setObjectVolume] = useState(6); // liters
  const [waterDensity, setWaterDensity] = useState(1.0); // g/cm³ = kg/L
  const [submersionDepth, setSubmersionDepth] = useState(0); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation ref
  const animationRef = useRef<number | null>(null);

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


  // Calculate buoyancy values
  const calculateBuoyancy = useCallback(() => {
    const g = 10; // m/s²
    const volumeM3 = objectVolume / 1000; // liters to m³
    const densityKgM3 = waterDensity * 1000; // g/cm³ to kg/m³

    const weight = objectMass * g; // N
    const maxBuoyancy = densityKgM3 * volumeM3 * g; // N (fully submerged)
    const currentBuoyancy = maxBuoyancy * (submersionDepth / 100);

    const objectDensity = objectMass / objectVolume; // kg/L
    const floats = objectDensity < waterDensity;
    const equilibriumSubmersion = floats ? (objectDensity / waterDensity) * 100 : 100;

    const apparentWeight = weight - currentBuoyancy;

    return {
      weight,
      maxBuoyancy,
      currentBuoyancy,
      apparentWeight,
      objectDensity,
      floats,
      equilibriumSubmersion,
    };
  }, [objectMass, objectVolume, waterDensity, submersionDepth]);

  // Animation to equilibrium
  const animateToEquilibrium = useCallback(() => {
    const values = calculateBuoyancy();
    const targetSubmersion = Math.min(100, values.equilibriumSubmersion);

    setIsAnimating(true);

    let current = 0;
    const animate = () => {
      current += 2;
      const progress = Math.min(current / 50, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setSubmersionDepth(targetSubmersion * eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    setSubmersionDepth(0);
    animationRef.current = requestAnimationFrame(animate);
  }, [calculateBuoyancy]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Helper function: renderButton with debouncing
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    options?: { disabled?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, size = 'md' } = options || {};

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
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: 600,
          borderRadius: radius.md,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
          ...variants[variant],
          ...sizes[size],
        }}
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

  // Helper function: Water tank visualization
  function WaterTankVisualization() {
    const values = calculateBuoyancy();
    const objectTop = 20 + (100 - submersionDepth) * 0.6; // Object position in tank
    const waterTop = 80; // Water line at 80 from top

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
            background: `linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)`,
            borderRadius: radius.md,
          }}
        >
          {/* Tank walls */}
          <rect x="50" y="20" width="200" height="160" fill="none" stroke={colors.border} strokeWidth="3" rx="5" />

          {/* Water */}
          <rect x="52" y={waterTop} width="196" height="98" fill={`${colors.water}30`} />

          {/* Water surface line */}
          <line x1="52" y1={waterTop} x2="248" y2={waterTop} stroke={colors.water} strokeWidth="2" strokeDasharray="4,2" />

          {/* Object (box) */}
          <g transform={`translate(125, ${objectTop})`}>
            <rect
              x="0"
              y="0"
              width="50"
              height="50"
              rx="5"
              fill={values.floats ? colors.success : colors.error}
              opacity="0.8"
            />
            <text x="25" y="30" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold">
              {objectMass}kg
            </text>
          </g>

          {/* Force arrows */}
          {/* Weight (down) */}
          <g transform={`translate(200, ${objectTop + 25})`}>
            <line x1="0" y1="0" x2="0" y2="30" stroke={colors.weight} strokeWidth="3" />
            <polygon points="-5,25 5,25 0,35" fill={colors.weight} />
            <text x="15" y="20" fill={colors.weight} fontSize="10">W={values.weight.toFixed(0)}N</text>
          </g>

          {/* Buoyancy (up) - only show when in water */}
          {submersionDepth > 0 && (
            <g transform={`translate(100, ${objectTop + 25})`}>
              <line x1="0" y1="30" x2="0" y2="0" stroke={colors.buoyancy} strokeWidth="3" />
              <polygon points="-5,5 5,5 0,-5" fill={colors.buoyancy} />
              <text x="-40" y="20" fill={colors.buoyancy} fontSize="10">F_b={values.currentBuoyancy.toFixed(0)}N</text>
            </g>
          )}

          {/* Labels */}
          <text x="150" y="15" textAnchor="middle" fill={colors.textTertiary} fontSize="11">
            {values.floats ? '✓ Floats' : '✗ Sinks'} | ρ_obj = {values.objectDensity.toFixed(2)} kg/L
          </text>
          <text x="260" y={waterTop + 5} fill={colors.water} fontSize="10">ρ={waterDensity}</text>
        </svg>

        {/* Force comparison bars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: spacing.xs
            }}>
              <span style={{ ...typography.caption, color: colors.weight }}>Weight</span>
              <span style={{ ...typography.caption, color: colors.weight }}>{values.weight.toFixed(0)}N</span>
            </div>
            <div style={{
              height: 8,
              background: colors.bgHover,
              borderRadius: radius.full,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(values.weight / Math.max(values.weight, values.maxBuoyancy)) * 100}%`,
                background: colors.weight,
              }} />
            </div>
          </div>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: spacing.xs
            }}>
              <span style={{ ...typography.caption, color: colors.buoyancy }}>Buoyancy</span>
              <span style={{ ...typography.caption, color: colors.buoyancy }}>{values.currentBuoyancy.toFixed(0)}N</span>
            </div>
            <div style={{
              height: 8,
              background: colors.bgHover,
              borderRadius: radius.full,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(values.currentBuoyancy / Math.max(values.weight, values.maxBuoyancy)) * 100}%`,
                background: colors.buoyancy,
                transition: 'width 0.1s',
              }} />
            </div>
          </div>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: spacing.xs
            }}>
              <span style={{ ...typography.caption, color: colors.brand }}>Apparent</span>
              <span style={{ ...typography.caption, color: colors.brand }}>{values.apparentWeight.toFixed(0)}N</span>
            </div>
            <div style={{
              height: 8,
              background: colors.bgHover,
              borderRadius: radius.full,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, (values.apparentWeight / values.weight) * 100)}%`,
                background: colors.brand,
                transition: 'width 0.1s',
              }} />
            </div>
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
              background: `linear-gradient(135deg, ${colors.water}30, ${colors.buoyancy}30)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.xl,
              fontSize: 48,
            }}>
              🏊
            </div>

            {/* Title */}
            <h1 style={{
              ...typography.hero,
              color: colors.textPrimary,
              marginBottom: spacing.lg
            }}>
              Why Do You Feel Lighter in Water?
            </h1>

            {/* Subtitle */}
            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              A 70kg person feels like they weigh only 7kg in a pool. Where does the other 63kg go?
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
                  <div style={{ fontSize: 36, marginBottom: spacing.sm }}>🧍</div>
                  <div style={{ ...typography.h2, color: colors.weight }}>70 kg</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>On land</div>
                </div>
                <div style={{ fontSize: 24, color: colors.textTertiary }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: spacing.sm }}>🏊</div>
                  <div style={{ ...typography.h2, color: colors.buoyancy }}>7 kg</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>In water</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                goToPhase('predict');
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
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
      { id: 0, label: 'Water supports weight', icon: '💧', description: 'Water pushes up against you' },
      { id: 1, label: 'Gravity is weaker in water', icon: '🌍', description: 'Water blocks some gravity' },
      { id: 2, label: 'Body becomes less dense', icon: '🎈', description: 'Water makes you expand' },
      { id: 3, label: 'It\'s an illusion', icon: '🪄', description: 'You actually weigh the same' },
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
                Why do you feel lighter when standing in water?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                What causes your apparent weight to decrease?
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
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Experiment →', () => goToPhase('play'), 'primary', { disabled: prediction === null })}
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
    const values = calculateBuoyancy();

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
                BUOYANCY LAB
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Sink or Float?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Adjust the object's properties and see what happens
              </p>
            </div>

            {/* Visualization */}
            <WaterTankVisualization />

            {/* Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              {/* Mass */}
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
                  <span style={{ ...typography.body, color: colors.weight, fontWeight: 600 }}>Mass</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{objectMass} kg</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={objectMass}
                  onChange={(e) => setObjectMass(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Volume */}
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
                  <span style={{ ...typography.body, color: colors.buoyancy, fontWeight: 600 }}>Volume</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{objectVolume} L</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={objectVolume}
                  onChange={(e) => setObjectVolume(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Drop button */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <button
                onClick={animateToEquilibrium}
                disabled={isAnimating}
                style={{
                  padding: '12px 32px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: isAnimating ? colors.bgHover : colors.water,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isAnimating ? 'default' : 'pointer',
                  fontFamily: typography.fontFamily,
                }}
              >
                {isAnimating ? 'Dropping...' : '💧 Drop in Water'}
              </button>
              <button
                onClick={() => setSubmersionDepth(0)}
                style={{
                  padding: '12px 24px',
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.bgCard,
                  color: colors.textSecondary,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: typography.fontFamily,
                }}
              >
                ↺ Reset
              </button>
            </div>

            {/* Density comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <div style={{ ...typography.label, color: colors.textTertiary, marginBottom: spacing.md }}>
                DENSITY COMPARISON
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xl,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    ...typography.h2,
                    color: values.floats ? colors.success : colors.error
                  }}>
                    {values.objectDensity.toFixed(2)}
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Object (kg/L)</div>
                </div>
                <div style={{
                  ...typography.h1,
                  color: values.floats ? colors.success : colors.error
                }}>
                  {values.floats ? '<' : '>'}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typography.h2, color: colors.water }}>{waterDensity.toFixed(2)}</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>Water (kg/L)</div>
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                marginTop: spacing.md,
                ...typography.body,
                color: values.floats ? colors.success : colors.error,
              }}>
                {values.floats ? '✓ Object floats!' : '✗ Object sinks!'}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Continue to Review →', goNext, 'primary')}
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
    const userWasRight = prediction === 0;

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
                {userWasRight ? '🎯' : '💧'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.brand,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Exactly Right!' : 'The Water Pushes Up!'}
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Archimedes discovered this over 2000 years ago
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
                Archimedes' Principle
              </h3>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}>
                <p style={{
                  ...typography.h2,
                  color: colors.brand,
                  marginBottom: spacing.xs
                }}>
                  F<sub>buoyancy</sub> = ρ<sub>fluid</sub> × V × g
                </p>
                <p style={{ ...typography.bodySmall, color: colors.textTertiary }}>
                  Buoyant force = Weight of displaced fluid
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: spacing.md,
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.weight}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.weight}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h3, color: colors.weight, marginBottom: spacing.xs }}>
                    Weight ↓
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    Gravity pulls down
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.buoyancy}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.buoyancy}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h3, color: colors.buoyancy, marginBottom: spacing.xs }}>
                    Buoyancy ↑
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    Water pushes up
                  </div>
                </div>
              </div>
            </div>

            {/* Apparent Weight Explanation */}
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
                📊 Apparent Weight Formula
              </p>
              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                margin: 0
              }}>
                <strong style={{ color: colors.textPrimary }}>Apparent Weight = True Weight - Buoyant Force</strong>
                <br /><br />
                For a 70kg person (700N) displacing 63L of water:
                <br />
                Apparent = 700N - 630N = <strong style={{ color: colors.buoyancy }}>70N (≈7kg)</strong>
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Try a Twist →', goNext, 'primary')}
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
      { id: 0, label: 'Float higher in saltwater', icon: '⬆️', description: 'Less of you is submerged' },
      { id: 1, label: 'Float lower in saltwater', icon: '⬇️', description: 'More of you is submerged' },
      { id: 2, label: 'Float the same', icon: '⚖️', description: 'Salt doesn\'t affect floating' },
      { id: 3, label: 'Sink in saltwater', icon: '🫧', description: 'Salt makes water too heavy' },
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
                Fresh Water vs Salt Water
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                If you float in a fresh water pool, what happens when you go to the ocean (saltwater)?
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
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Test It →', goNext, 'primary', { disabled: twistPrediction === null })}
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
    const values = calculateBuoyancy();

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
                Change Water Density
              </h2>
            </div>

            {/* Visualization */}
            <WaterTankVisualization />

            {/* Water density slider */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              border: `1px solid ${colors.border}`,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}>
                <span style={{ ...typography.body, color: colors.water, fontWeight: 600 }}>
                  🧂 Water Density
                </span>
                <span style={{ ...typography.h2, color: colors.water }}>
                  {waterDensity.toFixed(2)} kg/L
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="1.25"
                step="0.01"
                value={waterDensity}
                onChange={(e) => {
                  setWaterDensity(Number(e.target.value));
                  setSubmersionDepth(0);
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.sm,
              }}>
                <span style={{ ...typography.caption, color: colors.textTertiary }}>Fresh (1.00)</span>
                <span style={{ ...typography.caption, color: colors.buoyancy }}>Ocean (1.025)</span>
                <span style={{ ...typography.caption, color: colors.warning }}>Dead Sea (1.24)</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{
              display: 'flex',
              gap: spacing.sm,
              marginBottom: spacing.lg,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Fresh Water', value: 1.0 },
                { label: 'Ocean', value: 1.025 },
                { label: 'Dead Sea', value: 1.24 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setWaterDensity(preset.value);
                    setSubmersionDepth(0);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: radius.md,
                    border: `2px solid ${waterDensity === preset.value ? colors.water : colors.border}`,
                    background: waterDensity === preset.value ? `${colors.water}15` : colors.bgCard,
                    color: waterDensity === preset.value ? colors.water : colors.textSecondary,
                    cursor: 'pointer',
                    fontFamily: typography.fontFamily,
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Drop button */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              justifyContent: 'center',
              marginBottom: spacing.xl,
            }}>
              <button
                onClick={animateToEquilibrium}
                disabled={isAnimating}
                style={{
                  padding: '12px 32px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: isAnimating ? colors.bgHover : colors.water,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isAnimating ? 'default' : 'pointer',
                  fontFamily: typography.fontFamily,
                }}
              >
                {isAnimating ? 'Dropping...' : '💧 Drop in Water'}
              </button>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('See the Insight →', goNext, 'primary')}
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
                {userWasRight ? '🎯' : '⬆️'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.warning,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Correct!' : 'You Float Higher in Denser Water!'}
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
                Why Denser Water = Less Submersion
              </h3>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}>
                <p style={{
                  ...typography.body,
                  color: colors.brand,
                  margin: 0,
                }}>
                  Each liter of denser water provides MORE buoyant force
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing.md,
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: colors.bgHover,
                  borderRadius: radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h3, color: colors.textPrimary }}>Fresh Water</div>
                  <div style={{ ...typography.body, color: colors.textSecondary }}>ρ = 1.0 kg/L</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    More submersion needed
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.warning}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.warning}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typography.h3, color: colors.warning }}>Dead Sea</div>
                  <div style={{ ...typography.body, color: colors.textSecondary }}>ρ = 1.24 kg/L</div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    Float nearly on top!
                  </div>
                </div>
              </div>
            </div>

            {/* Fun Fact */}
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
                🌊 Fun Fact: The Dead Sea
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                The Dead Sea is so salty (34% salinity vs ocean's 3.5%) that it's nearly impossible to swim normally - you just bob on the surface like a cork! Reading a newspaper while floating is a popular tourist activity.
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Real World Applications →', goNext, 'primary')}
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
    const allRead = completedApps.size >= applications.length;

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
            {completedApps.size} of {applications.length} applications read
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {applications.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: completedApps.has(idx) ? colors.success : idx === activeApp ? colors.brand : colors.bgHover,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Tab Navigation with sequential unlock */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          padding: spacing.md,
          borderBottom: `1px solid ${colors.border}`,
          overflowX: 'auto',
          background: colors.bgElevated,
        }}>
          {applications.map((a, i) => {
            const isUnlocked = i === 0 || completedApps.has(i - 1);
            const isCompleted = completedApps.has(i);
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (navigationLockRef.current || !isUnlocked) return;
                  navigationLockRef.current = true;
                  setActiveApp(i);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: activeApp === i ? a.color : isCompleted ? `${colors.success}20` : colors.bgCard,
                  color: activeApp === i ? '#FFFFFF' : isCompleted ? colors.success : colors.textSecondary,
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

            {/* Mark as Read Button */}
            <div style={{ marginBottom: spacing.lg }}>
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
                    padding: '14px 24px',
                    borderRadius: radius.md,
                    border: 'none',
                    background: colors.success,
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  ✓ Mark "{app.title}" as Read
                </button>
              ) : (
                <div style={{
                  padding: '14px 24px',
                  borderRadius: radius.md,
                  background: `${colors.success}15`,
                  border: `1px solid ${colors.success}30`,
                  color: colors.success,
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  ✓ Completed
                </div>
              )}
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
          {renderButton('← Back', goBack, 'ghost')}
          {renderButton('Take the Quiz →', () => goToPhase('test'), 'primary', { disabled: !allRead })}
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
                {passed ? 'You\'ve mastered buoyancy!' : 'Review the concepts and try again.'}
              </p>
              {renderButton(passed ? 'Complete! →' : 'Review Material', () => passed ? goNext() : goToPhase('review'), passed ? 'success' : 'primary', { size: 'lg' })}
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
              {testIndex > 0 ? renderButton('← Previous', () => setTestIndex(testIndex - 1), 'ghost') : <div />}
              {testAnswers[testIndex] !== null && (
                testIndex < testQuestions.length - 1
                  ? renderButton('Next Question →', () => setTestIndex(testIndex + 1), 'primary')
                  : renderButton('See Results →', () => setTestSubmitted(true), 'success')
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
              Buoyancy Master!
            </h1>

            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              You now understand why things float or sink - from ships to submarines to hot air balloons!
            </p>

            {/* Achievements */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {[
                { icon: '🚢', label: 'Float/Sink' },
                { icon: '🧂', label: 'Density' },
                { icon: '⬆️', label: 'Archimedes' },
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
              <p style={{ ...typography.h2, color: colors.textPrimary, margin: 0 }}>
                F<sub>buoyancy</sub> = ρ<sub>fluid</sub> × V × g
              </p>
            </div>

            {/* CTA */}
            {renderButton('Complete Lesson 🎉', () => emit('milestone', { type: 'completed', game: 'buoyancy' }), 'success', { size: 'lg' })}
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
