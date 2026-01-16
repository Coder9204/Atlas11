import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'coach_prompt' | 'visual_state_update' | 'app_changed' | 'app_completed' | 'interaction';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface AngularMomentumRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- PREMIUM DESIGN SYSTEM (Apple/Airbnb inspired) ---
const colors = {
  // Core brand - Purple theme for angular momentum
  brand: '#8B5CF6',
  brandLight: '#A78BFA',
  brandDark: '#7C3AED',
  brandGlow: 'rgba(139, 92, 246, 0.15)',

  // Accent
  accent: '#EC4899',
  accentGlow: 'rgba(236, 72, 153, 0.15)',

  // Semantic
  success: '#00C853',
  successBg: 'rgba(0, 200, 83, 0.1)',
  warning: '#FF9500',
  warningBg: 'rgba(255, 149, 0, 0.1)',
  error: '#FF3B30',
  errorBg: 'rgba(255, 59, 48, 0.1)',

  // Neutrals
  bg: '#000000',
  bgElevated: '#0D0D0D',
  bgCard: '#141414',
  bgHover: '#1A1A1A',
  bgActive: '#222222',

  // Borders
  border: '#262626',
  borderLight: '#333333',
  borderFocus: '#8B5CF6',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
  textDisabled: '#525252',

  // Special
  gradientPurple: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  gradientGreen: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
};

const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};

const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  hero: { fontSize: 36, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
  h1: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },
  h2: { fontSize: 22, fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  bodySmall: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 12, fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.02em' },
  label: { fontSize: 11, fontWeight: 600, lineHeight: 1.3, letterSpacing: '0.06em', textTransform: 'uppercase' as const },
};

// --- MAIN COMPONENT ---
const AngularMomentumRenderer: React.FC<AngularMomentumRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Discover', predict: 'Predict', play: 'Experiment', review: 'Learn',
    twist_predict: 'Challenge', twist_play: 'Explore', twist_review: 'Understand',
    transfer: 'Apply', test: 'Quiz', mastery: 'Complete'
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && phases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const navigationLockRef = useRef(false);

  useEffect(() => {
    if (gamePhase && phases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [armExtension, setArmExtension] = useState(0.8); // 0 = pulled in, 1 = extended
  const [hasWeights, setHasWeights] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [initialOmega] = useState(2);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const animationRef = useRef<number>();

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- AI COACH ---
  const emit = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'angular_momentum',
      gameTitle: 'Angular Momentum',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      emit('game_started', { phase: 'hook' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // --- NAVIGATION ---
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_changed', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  const goNext = useCallback(() => {
    const idx = phases.indexOf(phase);
    if (idx < phases.length - 1) goToPhase(phases[idx + 1]);
  }, [phase, goToPhase, phases]);

  const goBack = useCallback(() => {
    const idx = phases.indexOf(phase);
    if (idx > 0) goToPhase(phases[idx - 1]);
  }, [phase, goToPhase, phases]);

  // --- PHYSICS CALCULATIONS ---
  const bodyInertia = 2.5; // kg·m²
  const weightMass = hasWeights ? 2 : 0.2; // kg per arm
  const armRadius = 0.3 + armExtension * 0.5; // m (0.3 to 0.8)
  const momentOfInertia = bodyInertia + 2 * weightMass * armRadius * armRadius;
  const initialMomentOfInertia = bodyInertia + 2 * weightMass * 0.8 * 0.8;
  const angularMomentum = initialMomentOfInertia * initialOmega;
  const calculatedOmega = angularMomentum / momentOfInertia;

  // Animation
  useEffect(() => {
    if (isSpinning && (phase === 'play' || phase === 'twist_play')) {
      const animate = () => {
        setAngle(prev => (prev + calculatedOmega * 0.04) % (2 * Math.PI));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }
  }, [isSpinning, calculatedOmega, phase]);

  // --- RENDER BUTTON HELPER FUNCTION ---
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    fullWidth = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles = {
      sm: { padding: '10px 18px', fontSize: 13 },
      md: { padding: '14px 28px', fontSize: 15 },
      lg: { padding: '18px 36px', fontSize: 17 },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: colors.gradientPurple,
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
      },
      secondary: {
        background: colors.bgCard,
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
      },
      success: {
        background: colors.gradientGreen,
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(0, 200, 83, 0.4)',
      },
      ghost: {
        background: 'transparent',
        color: colors.textSecondary,
      },
    };

    return (
      <button
        onMouseDown={() => {
          if (disabled || navigationLockRef.current) return;
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: radius.md,
          fontFamily: typography.fontFamily,
          fontWeight: 600,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.2s ease',
          width: fullWidth ? '100%' : 'auto',
          ...sizeStyles[size],
          ...variantStyles[variant],
        }}
      >
        {label}
      </button>
    );
  };

  // --- RENDER PROGRESS BAR HELPER FUNCTION ---
  const renderProgressBar = () => {
    const currentIdx = phases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.md}px ${spacing.lg}px`,
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bgElevated,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {phases.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIdx ? 24 : 8,
                  height: 8,
                  borderRadius: radius.full,
                  background: i < currentIdx ? colors.success : i === currentIdx ? colors.brand : colors.border,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <span style={{ ...typography.caption, color: colors.textTertiary }}>
            {currentIdx + 1} of {phases.length}
          </span>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: radius.full,
          background: colors.brandGlow,
          color: colors.brand,
          ...typography.caption,
          fontWeight: 600,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // --- TEST QUESTIONS ---
  const testQuestions = [
    { question: "When a figure skater pulls their arms in during a spin, their angular velocity:", options: ["Decreases", "Stays the same", "Increases", "Becomes zero"], correct: 2, explanation: "Angular momentum L = Iω is conserved. When arms pull in, moment of inertia I decreases. Since L must stay constant, angular velocity ω must increase." },
    { question: "What quantity is conserved when a spinning skater pulls their arms in?", options: ["Angular velocity (ω)", "Moment of inertia (I)", "Angular momentum (L = Iω)", "Rotational kinetic energy"], correct: 2, explanation: "Angular momentum is conserved when there's no external torque. L = Iω stays constant, so when I decreases, ω increases." },
    { question: "Why does extending arms slow down a spin?", options: ["Air resistance increases", "Mass moves farther from the axis, increasing I", "Gravity affects extended arms more", "Muscles tire out"], correct: 1, explanation: "Moment of inertia I = Σmr². When mass moves farther from the axis (larger r), I increases. With L conserved, larger I means smaller ω." },
    { question: "If a skater's moment of inertia decreases by half, their angular speed will:", options: ["Decrease by half", "Stay the same", "Double", "Quadruple"], correct: 2, explanation: "L = Iω is constant. If I → I/2, then ω → 2ω. Angular speed doubles when moment of inertia halves." },
    { question: "Why do divers tuck into a ball during somersaults?", options: ["To reduce air resistance", "To decrease moment of inertia and spin faster", "For aerodynamic lift", "To see where they're going"], correct: 1, explanation: "Tucking brings mass closer to the rotation axis, dramatically decreasing I. This allows much faster spinning to complete multiple rotations." },
    { question: "A neutron star collapses to half its radius. Its spin rate:", options: ["Halves", "Doubles", "Quadruples", "Stays the same"], correct: 2, explanation: "For a sphere, I ∝ r². If r → r/2, then I → I/4. With L conserved, ω → 4ω. This is why pulsars spin incredibly fast!" },
    { question: "Why do helicopters need tail rotors?", options: ["For steering", "To counter the main rotor's angular momentum", "For extra lift", "For braking"], correct: 1, explanation: "The spinning main rotor has angular momentum. Without the tail rotor, the helicopter body would spin the opposite direction to conserve total angular momentum." },
    { question: "A child walks from the edge toward the center of a spinning merry-go-round. It:", options: ["Slows down", "Speeds up", "Stays the same", "Stops"], correct: 1, explanation: "Total angular momentum is conserved. As the child moves inward, the system's moment of inertia decreases, so angular velocity must increase." },
    { question: "Spinning tops eventually fall because:", options: ["They lose angular momentum", "Friction creates a torque that causes precession", "Gravity suddenly wins", "They get dizzy"], correct: 1, explanation: "Friction at the tip creates a torque. This doesn't remove angular momentum but causes precession, slowly tilting the axis until the top falls." },
    { question: "Cats always land on their feet by:", options: ["Creating angular momentum from nothing", "Manipulating their moment of inertia to rotate with zero net L", "Defying physics", "Using their tails as propellers"], correct: 1, explanation: "Cats extend/retract different body parts to change their moment of inertia about different axes. They rotate in steps, always keeping total L = 0!" }
  ];

  // --- REAL WORLD APPLICATIONS ---
  const applications = [
    {
      id: 'skating',
      icon: '⛸️',
      title: 'Figure Skating',
      subtitle: 'The physics of elegant spins',
      description: 'Figure skaters demonstrate angular momentum conservation beautifully. Starting a spin with arms extended, they can increase rotation speed by 3-4x simply by pulling arms in.',
      physics: 'When arms pull in, moment of inertia decreases dramatically (I = Σmr²). Since L = Iω is conserved, ω must increase proportionally.',
      insight: 'Olympic skaters can spin at over 300 RPM! The world record is 342 RPM by Natalia Kanounnikova.',
      stats: [
        { label: 'Max Speed', value: '6 rev/sec' },
        { label: 'Speed Increase', value: '3-4×' },
        { label: 'Record', value: '342 RPM' },
      ],
      color: '#8B5CF6',
    },
    {
      id: 'diving',
      icon: '🏊',
      title: 'Platform Diving',
      subtitle: 'Somersaults in 2 seconds',
      description: 'Divers have only ~2 seconds from a 10m platform. By tucking tightly, they dramatically reduce I, allowing 3-4 complete somersaults before extending for a clean entry.',
      physics: 'The tuck position reduces moment of inertia by up to 4× compared to a pike or layout position, enabling much faster rotation.',
      insight: 'Divers must time their "opening" perfectly—extending too early means slow rotation, too late means a painful splash.',
      stats: [
        { label: 'Drop Time', value: '~2 sec' },
        { label: 'Max Flips', value: '4.5' },
        { label: 'I Ratio', value: '4:1' },
      ],
      color: '#EC4899',
    },
    {
      id: 'gyroscope',
      icon: '🔄',
      title: 'Gyroscopes',
      subtitle: 'Navigation and stability',
      description: 'Gyroscopes maintain their orientation due to angular momentum conservation. Any attempt to tilt them results in precession, not falling—making them perfect for navigation.',
      physics: 'A spinning gyroscope resists changes to its rotation axis. Applied torque causes the axis to precess (rotate around another axis) rather than tip.',
      insight: 'The Hubble Space Telescope uses gyroscopes for precise pointing. Your phone uses MEMS gyroscopes to detect rotation.',
      stats: [
        { label: 'Spin Speed', value: '12,000+ RPM' },
        { label: 'Accuracy', value: '0.0001°' },
        { label: 'Uses', value: 'Spacecraft' },
      ],
      color: '#00C853',
    },
    {
      id: 'stars',
      icon: '⭐',
      title: 'Neutron Stars',
      subtitle: 'Cosmic speed demons',
      description: 'When massive stars collapse into neutron stars, their enormous angular momentum is compressed into a tiny volume. The result: mind-boggling rotation speeds.',
      physics: 'A star\'s core collapsing from Sun-size to city-size is like a skater pulling arms in—but extreme! I decreases by ~10¹⁰, so ω increases by the same factor.',
      insight: 'The fastest known pulsar (PSR J1748-2446ad) spins 716 times per SECOND. Its surface moves at ~24% the speed of light!',
      stats: [
        { label: 'Fastest', value: '716 Hz' },
        { label: 'Radius', value: '~10 km' },
        { label: 'Surface', value: '0.24c' },
      ],
      color: '#FF9500',
    },
  ];

  // --- SPINNING FIGURE VISUALIZATION ---
  const SpinningFigure = ({ showControls = true }: { showControls?: boolean }) => {
    const personRotation = angle * 180 / Math.PI;
    const armLength = 20 + armExtension * 50;
    const weightSize = hasWeights ? 14 : 5;
    const speedRatio = calculatedOmega / initialOmega;

    return (
      <div style={{
        background: `linear-gradient(180deg, #1A0A2E 0%, #0D0015 100%)`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <svg viewBox="0 0 360 300" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
          <defs>
            <radialGradient id="spinGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.brand} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.brand} stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Background floor/stage */}
          <ellipse cx="180" cy="270" rx="140" ry="25" fill="#1E1E28" stroke="#2A2A3A" strokeWidth="1" />

          {/* Spin glow when active */}
          {isSpinning && (
            <ellipse cx="180" cy="160" rx={70 + armLength} ry={25 + armLength/3} fill="url(#spinGlow)" filter="url(#glow)">
              <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.5s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Chair base */}
          <ellipse cx="180" cy="250" rx="28" ry="10" fill="#334155" />
          <rect x="174" y="190" width="12" height="60" fill="#475569" rx="2" />

          {/* Person on chair - rotates */}
          <g transform={`translate(180, 155) rotate(${personRotation})`}>
            {/* Body */}
            <ellipse cx="0" cy="20" rx="26" ry="38" fill="#475569" stroke="#64748B" strokeWidth="2" />

            {/* Head */}
            <circle cx="0" cy="-28" r="22" fill="#64748B" stroke="#94A3B8" strokeWidth="2" />
            {/* Face */}
            <circle cx="-7" cy="-32" r="4" fill="#1E293B" /> {/* eye */}
            <circle cx="7" cy="-32" r="4" fill="#1E293B" /> {/* eye */}
            <ellipse cx="0" cy="-22" rx="6" ry="3" fill="#1E293B" opacity="0.3" /> {/* smile */}

            {/* Arms with weights */}
            <g>
              {/* Left arm */}
              <line x1="-22" y1="2" x2={-22 - armLength} y2="2" stroke="#94A3B8" strokeWidth="10" strokeLinecap="round" />
              {/* Weight */}
              <circle cx={-22 - armLength} cy="2" r={weightSize} fill={hasWeights ? colors.accent : '#64748B'} stroke={hasWeights ? '#F472B6' : '#475569'} strokeWidth="2">
                {isSpinning && hasWeights && <animate attributeName="fill-opacity" values="1;0.7;1" dur="0.3s" repeatCount="indefinite" />}
              </circle>

              {/* Right arm */}
              <line x1="22" y1="2" x2={22 + armLength} y2="2" stroke="#94A3B8" strokeWidth="10" strokeLinecap="round" />
              {/* Weight */}
              <circle cx={22 + armLength} cy="2" r={weightSize} fill={hasWeights ? colors.accent : '#64748B'} stroke={hasWeights ? '#F472B6' : '#475569'} strokeWidth="2">
                {isSpinning && hasWeights && <animate attributeName="fill-opacity" values="1;0.7;1" dur="0.3s" repeatCount="indefinite" />}
              </circle>
            </g>
          </g>

          {/* Rotation direction */}
          {isSpinning && (
            <g transform="translate(180, 285)">
              <path d="M-40,0 A40,12 0 0 1 40,0" fill="none" stroke={colors.brand} strokeWidth="2" strokeDasharray="6 4" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="0.5s" repeatCount="indefinite" />
              </path>
              <polygon points="35,-5 45,0 35,5" fill={colors.brand} />
            </g>
          )}
        </svg>

        {/* Status Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.sm,
          marginTop: spacing.md,
        }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: radius.sm,
            padding: spacing.sm,
            textAlign: 'center',
          }}>
            <div style={{ ...typography.caption, color: colors.textTertiary, marginBottom: 2 }}>SPIN SPEED</div>
            <div style={{ ...typography.h3, color: colors.textPrimary }}>{calculatedOmega.toFixed(1)} rad/s</div>
          </div>
          <div style={{
            background: colors.bgCard,
            borderRadius: radius.sm,
            padding: spacing.sm,
            textAlign: 'center',
          }}>
            <div style={{ ...typography.caption, color: colors.textTertiary, marginBottom: 2 }}>MOMENT I</div>
            <div style={{ ...typography.h3, color: colors.warning }}>{momentOfInertia.toFixed(2)} kg·m²</div>
          </div>
          <div style={{
            background: speedRatio > 1.2 ? colors.successBg : colors.bgCard,
            borderRadius: radius.sm,
            padding: spacing.sm,
            textAlign: 'center',
            border: speedRatio > 1.2 ? `1px solid ${colors.success}40` : 'none',
          }}>
            <div style={{ ...typography.caption, color: colors.textTertiary, marginBottom: 2 }}>SPEED GAIN</div>
            <div style={{ ...typography.h3, color: speedRatio > 1.2 ? colors.success : colors.textPrimary }}>
              {speedRatio.toFixed(1)}×
            </div>
          </div>
        </div>

        {/* Angular Momentum Display */}
        <div style={{
          marginTop: spacing.md,
          padding: spacing.md,
          background: colors.brandGlow,
          borderRadius: radius.md,
          textAlign: 'center',
          border: `1px solid ${colors.brand}30`,
        }}>
          <span style={{ ...typography.caption, color: colors.brand }}>ANGULAR MOMENTUM (CONSERVED)</span>
          <div style={{ ...typography.h2, color: colors.brand, marginTop: spacing.xs }}>
            L = {angularMomentum.toFixed(2)} kg·m²/s ✓
          </div>
        </div>

        {/* Controls */}
        {showControls && (
          <div style={{ marginTop: spacing.lg }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              background: colors.bgCard,
              borderRadius: radius.md,
              marginBottom: spacing.md,
            }}>
              <span style={{ ...typography.bodySmall, color: colors.textSecondary, minWidth: 100 }}>Arm Position</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={armExtension}
                onChange={(e) => { setArmExtension(parseFloat(e.target.value)); emit('slider_changed', { armExtension: parseFloat(e.target.value) }); }}
                style={{ flex: 1, accentColor: colors.brand, height: 6 }}
              />
              <span style={{ ...typography.bodySmall, color: colors.textPrimary, minWidth: 70, textAlign: 'right' }}>
                {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}
              </span>
            </div>

            {renderButton(
              isSpinning ? '⏹ Stop Spinning' : '▶ Start Spinning',
              () => { setIsSpinning(!isSpinning); setExperimentCount(c => c + 1); },
              isSpinning ? 'secondary' : 'primary',
              false,
              true
            )}
          </div>
        )}
      </div>
    );
  };

  // --- PHASE: HOOK (Premium Welcome Screen) ---
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        fontFamily: typography.fontFamily,
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Hero Section */}
          <div style={{
            background: 'linear-gradient(180deg, #1A0A2E 0%, #0D0015 50%, #000000 100%)',
            padding: isMobile ? spacing.lg : spacing.xxl,
            textAlign: 'center',
          }}>
            {/* Animated Hero Visual */}
            <div style={{
              maxWidth: 400,
              margin: '0 auto',
              marginBottom: spacing.xl,
            }}>
              <svg viewBox="0 0 400 280" style={{ width: '100%' }}>
                <defs>
                  <radialGradient id="heroGlowPurple" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
                  </linearGradient>
                </defs>

                {/* Background glow */}
                <ellipse cx="200" cy="140" rx="180" ry="100" fill="url(#heroGlowPurple)" />

                {/* Floor */}
                <ellipse cx="200" cy="230" rx="150" ry="20" fill="#1E1E28" opacity="0.5" />

                {/* Skater 1 - Arms out, slow */}
                <g transform="translate(90, 140)">
                  <ellipse cx="0" cy="20" rx="18" ry="28" fill="#475569" />
                  <circle cx="0" cy="-12" r="16" fill="#64748B" />
                  <line x1="-15" y1="5" x2="-55" y2="5" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
                  <line x1="15" y1="5" x2="55" y2="5" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="-55" cy="5" r="10" fill="#EC4899" />
                  <circle cx="55" cy="5" r="10" fill="#EC4899" />
                  <text x="0" y="75" textAnchor="middle" fill={colors.textTertiary} fontSize="12" fontWeight="500">Arms Out</text>
                  <text x="0" y="92" textAnchor="middle" fill={colors.warning} fontSize="11">Slow 🐢</text>
                </g>

                {/* Arrow */}
                <g transform="translate(200, 140)">
                  <line x1="-30" y1="0" x2="30" y2="0" stroke={colors.brand} strokeWidth="3" />
                  <polygon points="30,0 20,-8 20,8" fill={colors.brand} />
                </g>

                {/* Skater 2 - Arms in, fast */}
                <g transform="translate(310, 140)">
                  <ellipse cx="0" cy="20" rx="18" ry="28" fill="#475569" />
                  <circle cx="0" cy="-12" r="16" fill="#64748B" />
                  <line x1="-15" y1="0" x2="-22" y2="-8" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
                  <line x1="15" y1="0" x2="22" y2="-8" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="-22" cy="-8" r="10" fill="#EC4899" />
                  <circle cx="22" cy="-8" r="10" fill="#EC4899" />
                  {/* Motion blur */}
                  <path d="M-35,-20 A40,40 0 0 1 35,-20" fill="none" stroke={colors.brand} strokeWidth="2" opacity="0.5">
                    <animate attributeName="stroke-dasharray" values="0,200;100,100;0,200" dur="1s" repeatCount="indefinite" />
                  </path>
                  <path d="M-40,-5 A45,45 0 0 1 40,-5" fill="none" stroke={colors.brand} strokeWidth="2" opacity="0.3">
                    <animate attributeName="stroke-dasharray" values="0,200;100,100;0,200" dur="1.2s" repeatCount="indefinite" />
                  </path>
                  <text x="0" y="75" textAnchor="middle" fill={colors.textTertiary} fontSize="12" fontWeight="500">Arms In</text>
                  <text x="0" y="92" textAnchor="middle" fill={colors.success} fontSize="11">Fast! 🚀</text>
                </g>
              </svg>
            </div>

            {/* Topic Badge */}
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: radius.full,
              background: colors.brandGlow,
              marginBottom: spacing.md,
            }}>
              <span style={{ ...typography.label, color: colors.brand }}>
                PHYSICS • ROTATIONAL MOTION
              </span>
            </div>

            {/* Main Headline */}
            <h1 style={{
              ...typography.hero,
              fontSize: isMobile ? 28 : 42,
              color: colors.textPrimary,
              marginBottom: spacing.md,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Pull Arms In = Spin Faster?
            </h1>

            {/* Subheadline */}
            <p style={{
              ...typography.body,
              fontSize: isMobile ? 16 : 18,
              color: colors.textSecondary,
              maxWidth: 480,
              margin: '0 auto',
              marginBottom: spacing.xl,
            }}>
              Figure skaters magically speed up during spins just by pulling their arms in. No extra push needed. How does this work?
            </p>

            {/* CTA Button */}
            {renderButton('Discover the Physics →', goNext, 'primary', false, false, 'lg')}
          </div>

          {/* Feature Cards */}
          <div style={{
            padding: isMobile ? spacing.lg : spacing.xxl,
            maxWidth: 600,
            margin: '0 auto',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.md,
            }}>
              {[
                { icon: '⛸️', title: 'Spinning Chair Demo', desc: 'Control arm position and weights' },
                { icon: '📐', title: 'Conservation Law', desc: 'Learn L = Iω and I = Σmr²' },
                { icon: '⭐', title: 'Real Applications', desc: 'From skating to neutron stars' },
                { icon: '✅', title: 'Knowledge Quiz', desc: '10 questions to test mastery' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: spacing.lg,
                  background: colors.bgCard,
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`,
                }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: spacing.sm }}>{item.icon}</span>
                  <h3 style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>{item.title}</h3>
                  <p style={{ ...typography.bodySmall, color: colors.textTertiary, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: PREDICT ---
  if (phase === 'predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.warning, marginBottom: spacing.sm }}>
              MAKE YOUR PREDICTION
            </div>
            <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg }}>
              WHY does pulling arms in make you spin faster?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl }}>
              {[
                { id: 'A', text: 'Arms push air outward, reaction pushes you faster' },
                { id: 'B', text: 'Angular momentum is conserved—smaller radius needs faster speed' },
                { id: 'C', text: 'Your muscles add energy when pulling arms in' },
                { id: 'D', text: 'Gravity affects you less with arms closer to body' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => { setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); }}
                  style={{
                    padding: spacing.lg,
                    borderRadius: radius.md,
                    textAlign: 'left',
                    background: prediction === opt.id ? colors.brandGlow : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.brand : colors.border}`,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span style={{ fontWeight: 700, color: colors.brand, marginRight: spacing.md }}>{opt.id}</span>
                  <span style={{ ...typography.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Try It Yourself →', goNext, 'primary', !prediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: PLAY ---
  if (phase === 'play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.md : spacing.lg }}>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.success, marginBottom: spacing.sm }}>
              INTERACTIVE EXPERIMENT
            </div>
            <h2 style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}>
              Spin in a Chair with Weights
            </h2>

            <SpinningFigure showControls={true} />

            {isSpinning && experimentCount > 0 && (
              <div style={{
                marginTop: spacing.lg,
                padding: spacing.lg,
                borderRadius: radius.md,
                background: colors.brandGlow,
                border: `1px solid ${colors.brand}40`,
              }}>
                <p style={{ ...typography.body, color: colors.brand, fontWeight: 600, marginBottom: spacing.xs }}>
                  🔬 Watch the numbers!
                </p>
                <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                  Angular momentum L = {angularMomentum.toFixed(2)} stays constant while I and ω change inversely.
                </p>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: spacing.md,
              marginTop: spacing.xl,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.border}`,
            }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Understand Why →', goNext, 'primary', experimentCount < 1)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: REVIEW ---
  if (phase === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.brand, marginBottom: spacing.sm }}>
              THE PHYSICS EXPLAINED
            </div>
            <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl }}>
              Conservation of Angular Momentum
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl }}>
              {[
                { icon: '🔄', title: 'Angular Momentum (L)', desc: 'L = I × ω, where I is moment of inertia and ω is angular velocity. This quantity is CONSERVED when no external torque acts.' },
                { icon: '⚖️', title: 'Moment of Inertia (I)', desc: 'I = Σmr². Mass farther from the axis = larger I. Extended arms = large I, tucked arms = small I.' },
                { icon: '🎯', title: 'The Conservation Law', desc: 'When you pull arms in, I decreases. Since L = Iω must stay constant (no external torque), ω must INCREASE!' },
                { icon: '⚡', title: 'Energy Insight', desc: 'Rotational kinetic energy (½Iω²) actually INCREASES when you pull arms in. Your muscles do work to accelerate the spin!' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderRadius: radius.md,
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <h3 style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>{item.title}</h3>
                    <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: spacing.lg,
              borderRadius: radius.lg,
              background: colors.brandGlow,
              border: `1px solid ${colors.brand}40`,
              marginBottom: spacing.xl,
              textAlign: 'center',
            }}>
              <p style={{ ...typography.body, color: colors.brand, fontWeight: 600, marginBottom: spacing.sm }}>💡 Key Equation</p>
              <p style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm }}>
                L = I₁ω₁ = I₂ω₂ = constant
              </p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                If I decreases by half, ω doubles. The "spinning memory" is preserved!
              </p>
            </div>

            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Try a Challenge →', goNext, 'primary')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: TWIST_PREDICT ---
  if (phase === 'twist_predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.warning, marginBottom: spacing.sm }}>
              NEW CHALLENGE
            </div>
            <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md }}>
              What if you DON'T hold weights?
            </h2>
            <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
              You've seen how pulling arms in with <strong style={{ color: colors.accent }}>heavy weights</strong> speeds up dramatically.
              What happens with <strong style={{ color: colors.textPrimary }}>no weights</strong> (just your arms)?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl }}>
              {[
                { id: 'A', text: 'Same speed increase (arms have mass too)' },
                { id: 'B', text: 'SMALLER speed increase (less mass being moved)' },
                { id: 'C', text: 'LARGER speed increase (weights were slowing you)' },
                { id: 'D', text: 'No change at all (weights don\'t matter)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => { setTwistPrediction(opt.id); emit('prediction_made', { twistPrediction: opt.id }); }}
                  style={{
                    padding: spacing.lg,
                    borderRadius: radius.md,
                    textAlign: 'left',
                    background: twistPrediction === opt.id ? colors.warningBg : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span style={{ fontWeight: 700, color: colors.warning, marginRight: spacing.md }}>{opt.id}</span>
                  <span style={{ ...typography.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Test It →', goNext, 'primary', !twistPrediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: TWIST_PLAY ---
  if (phase === 'twist_play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.md : spacing.lg }}>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.brand, marginBottom: spacing.sm }}>
              COMPARE WITH AND WITHOUT WEIGHTS
            </div>
            <h2 style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}>
              Toggle Weights On/Off
            </h2>

            {/* Weight Toggle */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}>
              <button
                onMouseDown={() => { setHasWeights(true); emit('value_changed', { hasWeights: true }); }}
                style={{
                  padding: spacing.lg,
                  borderRadius: radius.md,
                  background: hasWeights ? colors.accentGlow : colors.bgCard,
                  border: `2px solid ${hasWeights ? colors.accent : colors.border}`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: typography.fontFamily,
                  transition: 'all 0.2s',
                }}
              >
                🏋️ With Weights
                <div style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>2kg each</div>
              </button>
              <button
                onMouseDown={() => { setHasWeights(false); emit('value_changed', { hasWeights: false }); }}
                style={{
                  padding: spacing.lg,
                  borderRadius: radius.md,
                  background: !hasWeights ? colors.brandGlow : colors.bgCard,
                  border: `2px solid ${!hasWeights ? colors.brand : colors.border}`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: typography.fontFamily,
                  transition: 'all 0.2s',
                }}
              >
                🙌 Without Weights
                <div style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>Arms only</div>
              </button>
            </div>

            <SpinningFigure showControls={true} />

            <div style={{
              marginTop: spacing.lg,
              padding: spacing.lg,
              borderRadius: radius.md,
              background: hasWeights ? colors.accentGlow : colors.brandGlow,
              border: `1px solid ${hasWeights ? colors.accent : colors.brand}40`,
            }}>
              <p style={{ ...typography.body, color: hasWeights ? colors.accent : colors.brand, fontWeight: 600, marginBottom: spacing.xs }}>
                {hasWeights ? '🏋️ Heavy weights = BIG change in I' : '🙌 Light arms = SMALL change in I'}
              </p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                I = Σmr². With heavier mass (m), the change in I when moving r is much larger!
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: spacing.md,
              marginTop: spacing.xl,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.border}`,
            }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('See Why →', goNext, 'primary')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: TWIST_REVIEW ---
  if (phase === 'twist_review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? spacing.lg : spacing.xl }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ ...typography.label, color: colors.brand, marginBottom: spacing.sm }}>
              DEEPER UNDERSTANDING
            </div>
            <h2 style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl }}>
              Mass Distribution is Key!
            </h2>

            <div style={{
              padding: spacing.xl,
              background: colors.bgCard,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg }}>
                Since <strong style={{ color: colors.brand }}>I = Σmr²</strong>, the mass (m) multiplies the effect of changing position (r):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
                <div style={{
                  padding: spacing.lg,
                  background: colors.bgHover,
                  borderRadius: radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: spacing.sm }}>🏋️</div>
                  <div style={{ ...typography.h3, color: colors.accent, marginBottom: spacing.xs }}>2 kg weights</div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>Large ΔI → Large Δω</div>
                  <div style={{ ...typography.body, color: colors.success, marginTop: spacing.sm }}>Spin 3× faster!</div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: colors.bgHover,
                  borderRadius: radius.md,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: spacing.sm }}>🙌</div>
                  <div style={{ ...typography.h3, color: colors.brand, marginBottom: spacing.xs }}>Arms only</div>
                  <div style={{ ...typography.bodySmall, color: colors.textSecondary }}>Small ΔI → Small Δω</div>
                  <div style={{ ...typography.body, color: colors.warning, marginTop: spacing.sm }}>Spin 1.2× faster</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: spacing.lg,
              background: colors.warningBg,
              borderRadius: radius.lg,
              border: `1px solid ${colors.warning}40`,
              marginBottom: spacing.xl,
            }}>
              <p style={{ ...typography.body, color: colors.warning, fontWeight: 600, marginBottom: spacing.xs }}>⛸️ Skating Secret</p>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                Pro skaters hold arms FAR out initially—sometimes above their head—to maximize initial I. Then they pull everything tight. This dramatic I reduction causes the spectacular spin acceleration you see!
              </p>
            </div>

            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Real World Applications →', goNext, 'primary')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: TRANSFER (with completedApps sequential navigation) ---
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}

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
                  background: completedApps.has(idx) ? colors.success : idx === activeApp ? colors.brand : colors.bgHover,
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: colors.textTertiary }}>
            ({completedApps.size}/{applications.length} read)
          </span>
        </div>

        {/* Tab Navigation - only allow clicking on completed tabs */}
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
            const isCurrent = idx === activeApp;
            const canAccess = isCompleted || idx === activeApp;
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!canAccess || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  emit('app_changed', { appIndex: idx });
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
                  cursor: canAccess ? 'pointer' : 'not-allowed',
                  opacity: canAccess ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                  fontFamily: typography.fontFamily,
                  transition: 'all 0.2s',
                }}
              >
                {isCompleted && !isCurrent ? '✓ ' : ''}{a.icon} {a.title}
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
            {!completedApps.has(activeApp) && (
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emit('interaction', { app: app.id, action: 'marked_read' });
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  borderRadius: radius.md,
                  background: colors.successBg,
                  border: `2px solid ${colors.success}`,
                  color: colors.success,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  fontFamily: typography.fontFamily,
                  marginBottom: spacing.lg,
                }}
              >
                ✓ Mark "{app.title}" as Read
              </button>
            )}

            {completedApps.has(activeApp) && (
              <div style={{
                padding: spacing.md,
                borderRadius: radius.md,
                background: colors.successBg,
                border: `1px solid ${colors.success}40`,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}>
                <span style={{ color: colors.success, fontWeight: 600 }}>✓ Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          padding: spacing.lg,
          borderTop: `1px solid ${colors.border}`,
          background: colors.bgElevated,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {allAppsCompleted ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: spacing.md, color: colors.success, fontWeight: 600 }}>
                  ✓ All {applications.length} applications read!
                </div>
                {renderButton('Take the Quiz →', () => goToPhase('test'), 'success', false, true)}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
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
                <div style={{
                  padding: spacing.md,
                  borderRadius: radius.md,
                  background: colors.bgCard,
                  color: colors.textTertiary,
                  fontSize: 14,
                }}>
                  Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: TEST ---
  if (phase === 'test') {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans === testQuestions[i].correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
          {renderProgressBar()}
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
                {passed ? 'You\'ve mastered angular momentum!' : 'Review the concepts and try again.'}
              </p>
              {renderButton(
                passed ? 'Complete! →' : 'Review Material',
                () => passed ? goNext() : goToPhase('review'),
                passed ? 'success' : 'primary',
                false,
                false,
                'lg'
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
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
                    onMouseDown={() => {
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
                    <span style={{ fontWeight: 700, marginRight: spacing.md, color: showResult ? (isCorrect ? colors.success : isSelected ? colors.error : colors.textSecondary) : colors.brand }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ ...typography.body }}>{opt}</span>
                    {showResult && isCorrect && <span style={{ marginLeft: spacing.sm, color: colors.success }}>✓</span>}
                    {showResult && isSelected && !isCorrect && <span style={{ marginLeft: spacing.sm, color: colors.error }}>✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {testAnswers[testIndex] !== null && (
              <div style={{
                padding: spacing.lg,
                borderRadius: radius.md,
                background: colors.brandGlow,
                border: `1px solid ${colors.brand}40`,
                marginBottom: spacing.xl,
              }}>
                <p style={{ ...typography.body, color: colors.brand, fontWeight: 600, marginBottom: spacing.xs }}>💡 Explanation</p>
                <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'space-between' }}>
              {renderButton('← Previous', () => setTestIndex(Math.max(0, testIndex - 1)), 'ghost', testIndex === 0)}
              {testIndex < 9 ? (
                renderButton('Next →', () => setTestIndex(testIndex + 1), 'primary', testAnswers[testIndex] === null)
              ) : (
                renderButton('Submit Quiz', () => { setTestSubmitted(true); emit('game_completed', { score: totalCorrect }); }, 'success', testAnswers.includes(null))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE: MASTERY ---
  if (phase === 'mastery') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, fontFamily: typography.fontFamily }}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 80, marginBottom: spacing.xl }}>🏆</div>
            <h1 style={{ ...typography.hero, color: colors.textPrimary, marginBottom: spacing.md }}>
              Mastery Achieved!
            </h1>
            <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 1.7 }}>
              You now understand angular momentum conservation—the principle that makes figure skaters spin fast, divers flip gracefully, and pulsars spin at incredible speeds!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl }}>
              {['L = Iω', 'I = Σmr²', 'I↓ → ω↑', 'No torque = L const'].map((concept, i) => (
                <div key={i} style={{
                  padding: '10px 18px',
                  borderRadius: radius.full,
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                }}>
                  <span style={{ ...typography.bodySmall, color: colors.brand, fontWeight: 600 }}>{concept}</span>
                </div>
              ))}
            </div>
            {renderButton('🔄 Play Again', () => window.location.reload(), 'success', false, false, 'lg')}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AngularMomentumRenderer;
