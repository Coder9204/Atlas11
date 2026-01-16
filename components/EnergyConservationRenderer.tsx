'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// ENERGY CONSERVATION RENDERER - PREMIUM PHYSICS GAME
// Marble Coaster Experience: Discover how potential energy converts to kinetic
// ============================================================================

interface EnergyConservationRendererProps {
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
  potential: '#F59E0B',
  kinetic: '#10B981',
  thermal: '#EF4444',
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
    id: 'rollercoaster',
    icon: '🎢',
    title: 'Roller Coasters',
    subtitle: 'Theme Park Engineering',
    color: '#F59E0B',
    description: 'The first hill of a roller coaster is always the highest because all subsequent motion relies on that initial potential energy. No motors push the cars after the initial climb.',
    physics: 'PE at top of first hill → KE throughout the ride. The total mechanical energy (minus friction losses) determines maximum heights of subsequent hills.',
    insight: 'Engineers use clothoid loops (teardrop shaped) to reduce g-forces while maximizing the energy efficiency of the ride.',
    stats: [
      { value: '456ft', label: 'Tallest Drop' },
      { value: '149mph', label: 'Top Speed' },
      { value: '6.2g', label: 'Max G-Force' },
    ],
  },
  {
    id: 'hydropower',
    icon: '💧',
    title: 'Hydroelectric Dams',
    subtitle: 'Clean Energy Generation',
    color: '#3B82F6',
    description: 'Dams store water at height, converting gravitational potential energy into kinetic energy as water falls, then into electrical energy via turbines.',
    physics: 'Water PE = mgh converts to KE = ½mv² as it falls through penstocks. Turbines convert this to rotational energy, then generators to electricity.',
    insight: 'Pumped-storage facilities can store excess grid energy by pumping water uphill, achieving 70-85% round-trip efficiency.',
    stats: [
      { value: '22.5GW', label: 'Three Gorges' },
      { value: '726ft', label: 'Hoover Height' },
      { value: '40%', label: 'US Renewable' },
    ],
  },
  {
    id: 'pendulum',
    icon: '🕰️',
    title: 'Pendulum Clocks',
    subtitle: 'Timekeeping Precision',
    color: '#10B981',
    description: 'A pendulum continuously exchanges potential and kinetic energy. At the extremes: maximum PE, zero KE. At the bottom: maximum KE, minimum PE.',
    physics: 'The period depends only on length and gravity (T = 2π√(L/g)), not on mass or amplitude for small swings, making pendulums ideal timekeepers.',
    insight: 'Temperature changes affect pendulum length. Precision clocks use invar alloys or compensating mechanisms to maintain accuracy.',
    stats: [
      { value: '1656', label: 'Year Invented' },
      { value: '0.5s/day', label: 'Accuracy' },
      { value: '99.39m', label: 'Longest (OR)' },
    ],
  },
  {
    id: 'skateboard',
    icon: '🛹',
    title: 'Skateboard Half-Pipes',
    subtitle: 'Action Sports Physics',
    color: '#EC4899',
    description: 'Skaters pump by extending legs at the bottom and crouching at the top, adding energy to the system to go higher than their starting point.',
    physics: 'Without pumping, max height equals starting height (energy conservation). Pumping adds work (W = Fd) to increase total energy.',
    insight: 'Professional skaters instinctively time their pumps to maximize energy transfer, reaching heights 2-3× their initial drop.',
    stats: [
      { value: '27ft', label: 'Mega Ramp' },
      { value: '65mph', label: 'Speed Record' },
      { value: '1080°', label: 'Most Rotations' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A marble is released from rest at height h. At what height will it have half kinetic and half potential energy?',
    options: ['h/4', 'h/2', 'h/3', '3h/4'],
    correct: 1,
    explanation: 'At h/2, PE = mgh/2 and KE = mgh/2. Total energy is still mgh.',
  },
  {
    question: 'Why can\'t a roller coaster\'s second hill be higher than the first (without additional motors)?',
    options: ['It would be too scary', 'Not enough potential energy', 'The cars would derail', 'Air resistance would stop it'],
    correct: 1,
    explanation: 'The first hill sets the maximum total energy. Subsequent hills cannot exceed this without adding energy.',
  },
  {
    question: 'A ball rolls down a frictionless track. At the bottom, its speed is v. If dropped from twice the height, its speed would be:',
    options: ['v', '2v', 'v√2', '4v'],
    correct: 2,
    explanation: 'KE = mgh, so v = √(2gh). Doubling h gives v√2.',
  },
  {
    question: 'What happens to mechanical energy when friction is present?',
    options: ['It disappears', 'It converts to thermal energy', 'It increases', 'It stays the same'],
    correct: 1,
    explanation: 'Energy is conserved but converts to thermal energy (heat), which is not recoverable as mechanical energy.',
  },
  {
    question: 'A pendulum swings from point A to point B. At which point is kinetic energy maximum?',
    options: ['At point A (highest)', 'At point B (other highest)', 'At the lowest point', 'Halfway between A and lowest'],
    correct: 2,
    explanation: 'At the lowest point, all potential energy has converted to kinetic energy.',
  },
  {
    question: 'Two marbles with masses m and 2m are released from the same height on identical frictionless tracks. Their speeds at the bottom are:',
    options: ['The heavier is faster', 'The lighter is faster', 'Both have the same speed', 'Cannot determine'],
    correct: 2,
    explanation: 'v = √(2gh) is independent of mass. Both marbles reach the same speed.',
  },
  {
    question: 'A skater at the top of a half-pipe has 100J of potential energy. At the bottom (ignoring friction), their kinetic energy is:',
    options: ['50J', '100J', '200J', '0J'],
    correct: 1,
    explanation: 'Energy conservation: all 100J of PE converts to 100J of KE at the bottom.',
  },
  {
    question: 'Which scenario has the MOST mechanical energy?',
    options: ['Ball at 10m height, at rest', 'Ball at 5m, moving at 10m/s', 'Ball at 0m, moving at 14m/s', 'All have equal energy'],
    correct: 3,
    explanation: 'Using E = mgh + ½mv², calculate each: Option A ≈ 98J, B ≈ 99J, C ≈ 98J per kg. Very similar.',
  },
  {
    question: 'A hydroelectric dam converts water\'s potential energy into electricity. What is the intermediate form of energy?',
    options: ['Chemical energy', 'Nuclear energy', 'Kinetic energy of water', 'Thermal energy'],
    correct: 2,
    explanation: 'PE → KE (falling water) → Rotational KE (turbine) → Electrical energy.',
  },
  {
    question: 'If you could eliminate ALL friction and air resistance, a marble would:',
    options: ['Eventually stop', 'Return to exactly its starting height', 'Go higher than its starting height', 'Accelerate indefinitely'],
    correct: 1,
    explanation: 'With perfect energy conservation, the marble returns to its initial height each time.',
  },
];

export default function EnergyConservationRenderer({ onComplete, emit = () => {} }: EnergyConservationRendererProps) {
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
  const [isRunning, setIsRunning] = useState(false);
  const [marblePos, setMarblePos] = useState({ x: 50, y: 20 }); // Start at top-left of track
  const [marbleVel, setMarbleVel] = useState({ x: 0, y: 0 });
  const [startHeight, setStartHeight] = useState(80);
  const [showEnergyBars, setShowEnergyBars] = useState(true);
  const [friction, setFriction] = useState(0);
  const [trackType, setTrackType] = useState<'hill' | 'loop' | 'bowl'>('hill');
  const [twistTrackType, setTwistTrackType] = useState<'friction' | 'loop'>('friction');

  // Animation frame ref
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

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

  // Track path calculations
  const getTrackY = useCallback((x: number, type: string): number => {
    // Returns y position (0 = top, 100 = bottom) for a given x position
    if (type === 'hill') {
      // Simple valley: high at edges, low in middle
      const normalizedX = (x - 50) / 50; // -1 to 1
      return 20 + 60 * (1 - normalizedX * normalizedX); // Parabola
    } else if (type === 'loop') {
      // Valley with loop in middle
      if (x < 30) {
        return 20 + (x / 30) * 50;
      } else if (x > 70) {
        return 20 + ((100 - x) / 30) * 50;
      } else {
        // Loop section
        const loopX = (x - 50) / 20;
        const loopY = Math.sqrt(Math.max(0, 1 - loopX * loopX));
        return 50 - loopY * 25;
      }
    } else if (type === 'bowl') {
      // U-shaped bowl
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * normalizedX * normalizedX;
    }
    return 50;
  }, []);

  // Physics simulation
  const runSimulation = useCallback(() => {
    if (!isRunning) return;

    const dt = 0.016; // ~60fps
    const g = 500; // Gravity strength
    const frictionCoeff = friction * 0.01;

    setMarblePos(prev => {
      let newX = prev.x + marbleVel.x * dt;
      let newY = prev.y + marbleVel.y * dt;

      // Get track position
      const trackY = getTrackY(newX, trackType);

      // Simple collision with track
      if (newY > trackY) {
        newY = trackY;
        // Bounce/roll along track
        const slope = (getTrackY(newX + 1, trackType) - getTrackY(newX - 1, trackType)) / 2;
        const normalAngle = Math.atan2(-1, slope);

        // Apply friction
        const speed = Math.sqrt(marbleVel.x ** 2 + marbleVel.y ** 2);
        const newSpeed = speed * (1 - frictionCoeff);

        setMarbleVel({
          x: newSpeed * Math.cos(normalAngle + Math.PI/2) * (marbleVel.x > 0 ? 1 : -1),
          y: Math.max(0, marbleVel.y * -0.3), // Some bounce
        });
      } else {
        // Apply gravity
        setMarbleVel(v => ({ ...v, y: v.y + g * dt }));
      }

      // Boundary checks
      if (newX < 5) { newX = 5; setMarbleVel(v => ({ ...v, x: -v.x * 0.5 })); }
      if (newX > 95) { newX = 95; setMarbleVel(v => ({ ...v, x: -v.x * 0.5 })); }

      return { x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) };
    });

    timeRef.current += dt;
    animationRef.current = requestAnimationFrame(runSimulation);
  }, [isRunning, marbleVel, friction, trackType, getTrackY]);

  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(runSimulation);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, runSimulation]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setMarblePos({ x: 10, y: 20 });
    setMarbleVel({ x: 0, y: 0 });
    timeRef.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Start simulation
  const startSimulation = useCallback(() => {
    resetSimulation();
    setMarblePos({ x: 10, y: 20 });
    setMarbleVel({ x: 50, y: 0 }); // Initial push
    setIsRunning(true);
  }, [resetSimulation]);

  // Calculate energy values
  const calculateEnergy = useCallback(() => {
    const mass = 1; // kg
    const maxHeight = 80; // reference height
    const currentHeight = maxHeight - marblePos.y;
    const speed = Math.sqrt(marbleVel.x ** 2 + marbleVel.y ** 2);

    const pe = mass * 10 * Math.max(0, currentHeight); // PE = mgh
    const ke = 0.5 * mass * speed ** 2 / 100; // KE = 0.5mv²
    const total = pe + ke;

    return {
      potential: Math.min(100, (pe / 800) * 100),
      kinetic: Math.min(100, (ke / 800) * 100),
      total: Math.min(100, (total / 800) * 100),
    };
  }, [marblePos, marbleVel]);

  // Helper function: renderButton with onMouseDown and debounce
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

  // Helper function: Track visualization
  function TrackVisualization({ type, showMarble = true }: { type: string; showMarble?: boolean }) {
    const energy = calculateEnergy();

    // Generate track path
    const trackPoints = [];
    for (let x = 0; x <= 100; x += 2) {
      trackPoints.push({ x, y: getTrackY(x, type) });
    }

    const pathD = trackPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x * 3} ${p.y * 2}`
    ).join(' ');

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        {/* Track Canvas */}
        <svg
          viewBox="0 0 300 200"
          style={{
            width: '100%',
            height: isMobile ? 200 : 250,
            background: `linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)`,
            borderRadius: radius.md,
          }}
        >
          {/* Grid lines */}
          {[20, 40, 60, 80].map(y => (
            <line
              key={y}
              x1="0" y1={y * 2} x2="300" y2={y * 2}
              stroke={colors.border}
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
          ))}

          {/* Track */}
          <path
            d={pathD}
            fill="none"
            stroke={colors.textSecondary}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Marble */}
          {showMarble && (
            <g>
              <circle
                cx={marblePos.x * 3}
                cy={marblePos.y * 2}
                r="12"
                fill={`url(#marbleGradient)`}
              />
              <defs>
                <radialGradient id="marbleGradient" cx="30%" cy="30%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#4338CA" />
                </radialGradient>
              </defs>
            </g>
          )}

          {/* Height reference */}
          <text x="10" y="25" fill={colors.textTertiary} fontSize="10">High PE</text>
          <text x="10" y="175" fill={colors.textTertiary} fontSize="10">Low PE</text>
        </svg>

        {/* Energy Bars */}
        {showEnergyBars && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: spacing.md,
            marginTop: spacing.lg,
          }}>
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: spacing.xs
              }}>
                <span style={{ ...typography.caption, color: colors.potential }}>Potential</span>
                <span style={{ ...typography.caption, color: colors.potential }}>
                  {Math.round(energy.potential)}%
                </span>
              </div>
              <div style={{
                height: 8,
                background: colors.bgHover,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${energy.potential}%`,
                  background: colors.potential,
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
                <span style={{ ...typography.caption, color: colors.kinetic }}>Kinetic</span>
                <span style={{ ...typography.caption, color: colors.kinetic }}>
                  {Math.round(energy.kinetic)}%
                </span>
              </div>
              <div style={{
                height: 8,
                background: colors.bgHover,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${energy.kinetic}%`,
                  background: colors.kinetic,
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
                <span style={{ ...typography.caption, color: colors.brand }}>Total</span>
                <span style={{ ...typography.caption, color: colors.brand }}>
                  {Math.round(energy.total)}%
                </span>
              </div>
              <div style={{
                height: 8,
                background: colors.bgHover,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${energy.total}%`,
                  background: colors.brand,
                  transition: 'width 0.1s',
                }} />
              </div>
            </div>
          </div>
        )}
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
              background: `linear-gradient(135deg, ${colors.potential}30, ${colors.kinetic}30)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.xl,
              fontSize: 48,
            }}>
              🎢
            </div>

            {/* Title */}
            <h1 style={{
              ...typography.hero,
              color: colors.textPrimary,
              marginBottom: spacing.lg
            }}>
              The Marble Coaster
            </h1>

            {/* Subtitle */}
            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              Watch a marble roll down a track. Why can't it go higher than where it started?
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
                alignItems: 'flex-end',
                height: 100,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: radius.full,
                    background: colors.brand,
                    margin: '0 auto',
                    marginBottom: spacing.sm,
                  }} />
                  <div style={{
                    width: 4,
                    height: 80,
                    background: colors.bgHover,
                    margin: '0 auto',
                  }} />
                  <span style={{ ...typography.caption, color: colors.potential }}>Start Height</span>
                </div>
                <div style={{
                  width: 100,
                  height: 60,
                  borderRadius: '0 0 50% 50%',
                  border: `3px solid ${colors.textTertiary}`,
                  borderTop: 'none',
                }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: radius.full,
                    background: colors.brand,
                    margin: '0 auto',
                    marginBottom: spacing.sm,
                    opacity: 0.5,
                  }} />
                  <div style={{
                    width: 4,
                    height: 80,
                    background: colors.bgHover,
                    margin: '0 auto',
                  }} />
                  <span style={{ ...typography.caption, color: colors.kinetic }}>Max Height?</span>
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
              Make a Prediction →
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
      { id: 0, label: 'Much lower than start', icon: '📉', description: 'It loses energy while rolling' },
      { id: 1, label: 'Exactly same height', icon: '⚖️', description: 'Energy is perfectly conserved' },
      { id: 2, label: 'Slightly lower', icon: '📊', description: 'Some energy is lost to friction' },
      { id: 3, label: 'Higher than start', icon: '📈', description: 'It gains energy going down' },
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
                If you release a marble from a certain height, how high can it roll on the other side?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Assume a smooth track with minimal friction.
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
              {renderButton('Test Your Prediction →', () => goToPhase('play'), 'primary', { disabled: prediction === null })}
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
                EXPERIMENT
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Watch Energy Transform
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Release the marble and observe how potential energy converts to kinetic energy
              </p>
            </div>

            {/* Track Visualization */}
            <TrackVisualization type={trackType} />

            {/* Controls */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
              justifyContent: 'center',
            }}>
              <button
                onClick={startSimulation}
                style={{
                  padding: '12px 32px',
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
                {isRunning ? '▶ Running...' : '▶ Release Marble'}
              </button>
              <button
                onClick={resetSimulation}
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

            {/* Track Type Selector */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                ...typography.label,
                color: colors.textTertiary,
                marginBottom: spacing.md
              }}>
                TRACK SHAPE
              </p>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                {[
                  { id: 'hill', label: 'Valley', icon: '⛰️' },
                  { id: 'bowl', label: 'Bowl', icon: '🥣' },
                  { id: 'loop', label: 'Loop', icon: '🔄' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTrackType(t.id as any); resetSimulation(); }}
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      border: `2px solid ${trackType === t.id ? colors.brand : colors.border}`,
                      background: trackType === t.id ? colors.brandGlow : 'transparent',
                      cursor: 'pointer',
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: spacing.xs }}>{t.icon}</div>
                    <div style={{
                      ...typography.caption,
                      color: trackType === t.id ? colors.brand : colors.textSecondary
                    }}>
                      {t.label}
                    </div>
                  </button>
                ))}
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
                Notice how the total energy bar stays nearly constant! When potential energy decreases, kinetic energy increases by the same amount.
              </p>
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
    const userWasRight = prediction === 1 || prediction === 2;

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
              <div style={{
                fontSize: 64,
                marginBottom: spacing.lg
              }}>
                {userWasRight ? '🎯' : '💡'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.brand,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Excellent Intuition!' : 'Here\'s What Happens'}
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                {userWasRight
                  ? 'You correctly predicted the energy behavior!'
                  : 'Let\'s understand the physics behind energy conservation'}
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
                Conservation of Mechanical Energy
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
                  PE + KE = Constant
                </p>
                <p style={{ ...typography.bodySmall, color: colors.textTertiary }}>
                  (In the absence of friction)
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing.md
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.potential}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.potential}30`,
                }}>
                  <div style={{
                    ...typography.h3,
                    color: colors.potential,
                    marginBottom: spacing.xs
                  }}>
                    Potential Energy
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    PE = mgh
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    Stored energy from height
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.kinetic}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.kinetic}30`,
                }}>
                  <div style={{
                    ...typography.h3,
                    color: colors.kinetic,
                    marginBottom: spacing.xs
                  }}>
                    Kinetic Energy
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    KE = ½mv²
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
                    Energy of motion
                  </div>
                </div>
              </div>
            </div>

            {/* Answer to Initial Question */}
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
                📌 Answer to Our Question
              </p>
              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                margin: 0
              }}>
                In a <strong style={{ color: colors.textPrimary }}>frictionless</strong> system, the marble would return to <strong style={{ color: colors.textPrimary }}>exactly its starting height</strong>. In reality, some energy is lost to friction and air resistance, so it reaches <strong style={{ color: colors.textPrimary }}>slightly lower</strong>.
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
      { id: 0, label: 'Height depends on friction', icon: '🔥', description: 'More friction = lower final height' },
      { id: 1, label: 'Friction doesn\'t matter', icon: '🧊', description: 'Height is always the same regardless' },
      { id: 2, label: 'Speed at bottom changes', icon: '⚡', description: 'Friction changes speed but not max height' },
      { id: 3, label: 'Energy disappears', icon: '🕳️', description: 'Friction destroys energy completely' },
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
                What if we add friction?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                How does friction affect the marble's maximum height?
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
              {renderButton('Test With Friction →', goNext, 'primary', { disabled: twistPrediction === null })}
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
                Friction's Effect on Energy
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Adjust the friction slider and observe what happens to the total energy
              </p>
            </div>

            {/* Track Visualization */}
            <TrackVisualization type="hill" />

            {/* Friction Slider */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              border: `1px solid ${colors.border}`,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}>
                <span style={{ ...typography.body, color: colors.textPrimary, fontWeight: 600 }}>
                  🔥 Friction Level
                </span>
                <span style={{
                  ...typography.h3,
                  color: friction > 50 ? colors.error : friction > 20 ? colors.warning : colors.success
                }}>
                  {friction}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={friction}
                onChange={(e) => setFriction(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: radius.full,
                  background: `linear-gradient(90deg, ${colors.success}, ${colors.warning}, ${colors.error})`,
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.sm
              }}>
                <span style={{ ...typography.caption, color: colors.success }}>Ice (0%)</span>
                <span style={{ ...typography.caption, color: colors.warning }}>Wood</span>
                <span style={{ ...typography.caption, color: colors.error }}>Carpet (80%)</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              marginBottom: spacing.lg,
              justifyContent: 'center',
            }}>
              <button
                onClick={startSimulation}
                style={{
                  padding: '12px 32px',
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
                {isRunning ? '▶ Running...' : '▶ Release Marble'}
              </button>
              <button
                onClick={resetSimulation}
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
                🔍 What to Watch
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                Notice how the <strong style={{ color: colors.textPrimary }}>total energy bar decreases</strong> with friction! The "lost" energy becomes heat - you'd feel the track warming up.
              </p>
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
                {userWasRight ? '🎯' : '🔥'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.warning,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'You Got It!' : 'Energy Transforms, Never Disappears'}
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
                The First Law of Thermodynamics
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
                  margin: 0
                }}>
                  Energy cannot be created or destroyed, only transformed
                </p>
              </div>

              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                marginBottom: spacing.lg
              }}>
                When friction is present:
              </p>

              <div style={{
                padding: spacing.lg,
                background: `${colors.thermal}10`,
                borderRadius: radius.md,
                border: `1px solid ${colors.thermal}30`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.lg,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...typography.h3, color: colors.potential }}>PE + KE</div>
                    <div style={{ ...typography.caption, color: colors.textTertiary }}>Mechanical</div>
                  </div>
                  <div style={{ fontSize: 24, color: colors.textTertiary }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...typography.h3, color: colors.kinetic }}>Less PE + KE</div>
                    <div style={{ ...typography.caption, color: colors.textTertiary }}>Mechanical</div>
                  </div>
                  <div style={{ fontSize: 24, color: colors.textTertiary }}>+</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...typography.h3, color: colors.thermal }}>Heat</div>
                    <div style={{ ...typography.caption, color: colors.textTertiary }}>Thermal</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Example */}
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
                🚗 Real World Example
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                When you brake a car, the kinetic energy becomes heat in the brake pads. That's why brakes get hot! Hybrid cars recover some of this energy using regenerative braking.
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
    const canTakeQuiz = completedApps.size >= applications.length;

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
            {completedApps.size} of {applications.length} completed
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

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          padding: spacing.md,
          borderBottom: `1px solid ${colors.border}`,
          overflowX: 'auto',
          background: colors.bgElevated,
        }}>
          {applications.map((a, idx) => {
            const isCompleted = completedApps.has(idx);
            const isUnlocked = idx === 0 || completedApps.has(idx - 1);
            const isCurrent = idx === activeApp;
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!isUnlocked || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 300);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: isCurrent ? a.color : isCompleted ? colors.successBg : colors.bgCard,
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
                  padding: spacing.lg,
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
                padding: spacing.lg,
                background: colors.successBg,
                borderRadius: radius.md,
                border: `1px solid ${colors.success}40`,
                textAlign: 'center',
              }}>
                <span style={{ ...typography.body, color: colors.success, fontWeight: 600 }}>
                  ✓ Completed
                </span>
              </div>
            )}
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
          {canTakeQuiz ? (
            renderButton('Take the Quiz →', () => goToPhase('test'), 'primary')
          ) : (
            <div style={{
              padding: '12px 24px',
              borderRadius: radius.md,
              background: colors.bgCard,
              color: colors.textTertiary,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: typography.fontFamily,
            }}>
              Complete all applications to unlock quiz
            </div>
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
                {passed ? 'You\'ve mastered energy conservation!' : 'Review the concepts and try again.'}
              </p>
              {renderButton(
                passed ? 'Complete! →' : 'Review Material',
                () => passed ? goNext() : goToPhase('review'),
                passed ? 'success' : 'primary',
                { size: 'lg' }
              )}
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
                renderButton('← Previous', () => setTestIndex(testIndex - 1), 'ghost')
              ) : <div />}
              {testAnswers[testIndex] !== null && (
                testIndex < testQuestions.length - 1 ? (
                  renderButton('Next Question →', () => setTestIndex(testIndex + 1), 'primary')
                ) : (
                  renderButton('See Results →', () => setTestSubmitted(true), 'success')
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
              Energy Master!
            </h1>

            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              You've mastered the law of energy conservation - one of the most fundamental principles in physics!
            </p>

            {/* Achievements */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {[
                { icon: '🎢', label: 'PE ↔ KE' },
                { icon: '🔥', label: 'Energy Loss' },
                { icon: '⚡', label: 'Applications' },
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
                E<sub>total</sub> = PE + KE = mgh + ½mv² = constant
              </p>
            </div>

            {/* CTA */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                onComplete?.();
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
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
