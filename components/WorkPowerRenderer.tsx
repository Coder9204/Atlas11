'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// WORK & POWER RENDERER - PREMIUM PHYSICS GAME
// The Human Engine: Calculate the power you generate climbing stairs
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface WorkPowerRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

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
  work: '#3B82F6',
  power: '#F59E0B',
  energy: '#10B981',
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
    id: 'elevator',
    icon: '🛗',
    title: 'Elevator Motors',
    subtitle: 'Building Engineering',
    color: '#3B82F6',
    description: 'Elevator motors are rated by power, not force. A 10kW motor can lift a 1000kg elevator at 1 m/s, but only 0.5 m/s if fully loaded with passengers (2000kg total).',
    physics: 'P = Fv = mgv. Higher load (more mass) at same power means lower speed. Express elevators need more powerful motors for the same speed with more passengers.',
    insight: 'Counterweights balance part of the elevator weight, dramatically reducing the power needed. They\'re typically set to balance the cab plus ~40% capacity.',
    stats: [
      { value: '20 m/s', label: 'Fastest Speed' },
      { value: '150 kW', label: 'Express Power' },
      { value: '40%', label: 'Counterweight' },
    ],
  },
  {
    id: 'cycling',
    icon: '🚴',
    title: 'Cycling Power Meters',
    subtitle: 'Sports Science',
    color: '#10B981',
    description: 'Professional cyclists measure their output in watts. Tour de France riders sustain 300-400W for hours, with sprints exceeding 2000W for seconds.',
    physics: 'Power = Work/Time = Force × velocity. Cyclists optimize cadence (pedaling speed) and gear ratios to maximize power output at sustainable effort levels.',
    insight: 'FTP (Functional Threshold Power) is the highest power a cyclist can sustain for 1 hour. Elite riders have FTP of 5-6 watts per kilogram of body weight.',
    stats: [
      { value: '400W', label: 'Pro Sustained' },
      { value: '2000W', label: 'Sprint Peak' },
      { value: '6 W/kg', label: 'Elite FTP' },
    ],
  },
  {
    id: 'cars',
    icon: '🏎️',
    title: 'Car Horsepower',
    subtitle: 'Automotive Engineering',
    color: '#EF4444',
    description: 'Horsepower originated when James Watt compared steam engines to horses. One horsepower (746W) was the work rate of a strong draft horse.',
    physics: 'HP = Torque × RPM / 5252. Cars need high torque at low speed for acceleration, and high power at high speed for top speed. Electric motors excel at both.',
    insight: 'Electric cars often have lower peak HP than gas cars but faster 0-60 times because electric motors deliver instant maximum torque from 0 RPM.',
    stats: [
      { value: '746W', label: '1 Horsepower' },
      { value: '1,020 HP', label: 'Bugatti Chiron' },
      { value: '2.3s', label: 'Tesla 0-60' },
    ],
  },
  {
    id: 'human',
    icon: '🏃',
    title: 'Human Body Power',
    subtitle: 'Exercise Physiology',
    color: '#8B5CF6',
    description: 'The human body converts chemical energy (food) into mechanical work at about 25% efficiency. The rest becomes heat, which is why we sweat during exercise.',
    physics: 'A 70kg person climbing 3m stairs in 5 seconds produces: P = mgh/t = 70 × 10 × 3 / 5 = 420W. But metabolically uses ~1680W (25% efficiency).',
    insight: 'Basal metabolic rate (resting power consumption) is about 80W - equivalent to an incandescent light bulb. A marathon runner averages about 1000W for hours.',
    stats: [
      { value: '80W', label: 'Resting Rate' },
      { value: '2000W', label: 'Sprint Max' },
      { value: '25%', label: 'Efficiency' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 60kg person climbs 5 meters of stairs in 10 seconds. What is their power output? (g = 10 m/s²)',
    options: [
      { text: '30 W', correct: false },
      { text: '300 W', correct: true },
      { text: '3000 W', correct: false },
      { text: '60 W', correct: false },
    ],
    explanation: 'P = W/t = mgh/t = 60 × 10 × 5 / 10 = 300 W',
  },
  {
    question: 'Two people do the same amount of work. Person A takes 5 seconds, Person B takes 10 seconds. Which is true?',
    options: [
      { text: 'A has twice the power', correct: true },
      { text: 'B has twice the power', correct: false },
      { text: 'Both have equal power', correct: false },
      { text: 'Cannot determine', correct: false },
    ],
    explanation: 'Power = Work/Time. Same work in half the time = twice the power.',
  },
  {
    question: 'A crane lifts a 500kg load 20m in 10 seconds. What power does the motor provide? (g = 10 m/s²)',
    options: [
      { text: '1000 W', correct: false },
      { text: '10,000 W', correct: true },
      { text: '100,000 W', correct: false },
      { text: '250 W', correct: false },
    ],
    explanation: 'P = mgh/t = 500 × 10 × 20 / 10 = 10,000 W = 10 kW',
  },
  {
    question: 'If you push a box with 100N force at 2 m/s constant speed, what is your power output?',
    options: [
      { text: '50 W', correct: false },
      { text: '200 W', correct: true },
      { text: '400 W', correct: false },
      { text: '100 W', correct: false },
    ],
    explanation: 'P = Fv = 100 × 2 = 200 W',
  },
  {
    question: 'A 1000W motor runs for 1 hour. How much work does it do?',
    options: [
      { text: '1000 J', correct: false },
      { text: '60,000 J', correct: false },
      { text: '3,600,000 J', correct: true },
      { text: '1 J', correct: false },
    ],
    explanation: 'W = Pt = 1000 × 3600 = 3,600,000 J = 3.6 MJ',
  },
  {
    question: 'Why do electric cars have faster acceleration than similarly powered gas cars?',
    options: [
      { text: 'They weigh less', correct: false },
      { text: 'Instant max torque from 0 RPM', correct: true },
      { text: 'They use better tires', correct: false },
      { text: 'Electric motors are more efficient', correct: false },
    ],
    explanation: 'Electric motors deliver maximum torque instantly at 0 RPM, while gas engines need to rev up.',
  },
  {
    question: 'A cyclist produces 400W and weighs 80kg with bike. Climbing a 10% grade at constant speed, what is their velocity?',
    options: [
      { text: '0.5 m/s', correct: false },
      { text: '5 m/s', correct: true },
      { text: '50 m/s', correct: false },
      { text: '1 m/s', correct: false },
    ],
    explanation: 'P = mgv sin(θ) ≈ 80 × 10 × v × 0.1 = 80v. So v = 400/80 = 5 m/s',
  },
  {
    question: 'Which requires more power: lifting 100kg by 1m in 1 second, or lifting 10kg by 10m in 10 seconds?',
    options: [
      { text: 'The 100kg lift', correct: true },
      { text: 'The 10kg lift', correct: false },
      { text: 'They require equal power', correct: false },
      { text: 'Cannot compare', correct: false },
    ],
    explanation: '100kg: P = 100×10×1/1 = 1000W. 10kg: P = 10×10×10/10 = 100W. 100kg needs 10× more power.',
  },
  {
    question: 'If the human body is 25% efficient, how much food energy (calories) powers a 400W workout for 1 hour?',
    options: [
      { text: '400 kcal', correct: false },
      { text: '1600 kcal', correct: false },
      { text: '100 kcal', correct: false },
      { text: '344 kcal', correct: true },
    ],
    explanation: 'Mechanical work = 400 × 3600 = 1.44 MJ. At 25% efficiency, need 5.76 MJ = ~1370 kcal ≈ 344 kcal (accounting for 4.18 kJ/kcal).',
  },
  {
    question: 'A 100W light bulb and a 100W electric motor both run for an hour. Which does more work?',
    options: [
      { text: 'The light bulb', correct: false },
      { text: 'The motor', correct: false },
      { text: 'Equal work - same power rating', correct: true },
      { text: 'Depends on efficiency', correct: false },
    ],
    explanation: 'Both consume 100W × 3600s = 360,000 J of electrical energy. The motor converts more to mechanical work; the bulb to light and heat.',
  },
];

export default function WorkPowerRenderer({ onComplete, onGameEvent, currentPhase, onPhaseComplete }: WorkPowerRendererProps) {
  // Core state
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [personMass, setPersonMass] = useState(70); // kg
  const [stairHeight, setStairHeight] = useState(3); // meters
  const [climbTime, setClimbTime] = useState(5); // seconds
  const [isClimbing, setIsClimbing] = useState(false);
  const [climbProgress, setClimbProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Animation
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Button debounce lock
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase]);

  // Web Audio API sound
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

  // Emit events
  const emitEvent = (type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  };

  // Phase navigation with 400ms debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, onPhaseComplete]);

  const goNext = useCallback(() => {
    if (phase < PHASES.length - 1) {
      goToPhase(phase + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    if (phase > 0) {
      goToPhase(phase - 1);
    }
  }, [phase, goToPhase]);


  // Calculate physics values
  const calculateValues = useCallback(() => {
    const g = 10; // m/s²
    const work = personMass * g * stairHeight; // Joules
    const power = work / climbTime; // Watts
    const horsepower = power / 746;
    const calories = (work / 4184) / 0.25; // accounting for 25% efficiency

    return { work, power, horsepower, calories };
  }, [personMass, stairHeight, climbTime]);

  // Climb animation
  const animateClimb = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const progress = Math.min(elapsed / climbTime, 1);

    setClimbProgress(progress);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateClimb);
    } else {
      setIsClimbing(false);
      setShowResults(true);
    }
  }, [climbTime]);

  // Start climb
  const startClimb = useCallback(() => {
    setIsClimbing(true);
    setShowResults(false);
    setClimbProgress(0);
    startTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animateClimb);
  }, [animateClimb]);

  // Reset
  const resetClimb = useCallback(() => {
    setIsClimbing(false);
    setShowResults(false);
    setClimbProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Cleanup
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

  // Helper function: Progress bar (now only used for inline progress display)
  function ProgressBar() {
    return null; // Replaced by fixed header in main return
  }

  // Helper function: Staircase visualization
  function StaircaseVisualization() {
    const values = calculateValues();
    const numStairs = Math.ceil(stairHeight / 0.2); // ~20cm per stair

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        {/* Staircase SVG */}
        <svg
          viewBox="0 0 300 200"
          style={{
            width: '100%',
            height: isMobile ? 180 : 220,
            background: `linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)`,
            borderRadius: radius.md,
          }}
        >
          {/* Stairs */}
          {Array.from({ length: numStairs }).map((_, i) => {
            const stepHeight = 180 / numStairs;
            const y = 180 - (i + 1) * stepHeight;
            const x = 40 + i * (220 / numStairs);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={220 / numStairs + 2}
                  height={stepHeight + 2}
                  fill={colors.bgHover}
                  stroke={colors.border}
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Person (stick figure) */}
          <g transform={`translate(${60 + climbProgress * 180}, ${170 - climbProgress * 150})`}>
            {/* Head */}
            <circle cx="0" cy="-35" r="8" fill={colors.brand} />
            {/* Body */}
            <line x1="0" y1="-27" x2="0" y2="-5" stroke={colors.brand} strokeWidth="3" strokeLinecap="round" />
            {/* Arms */}
            <line x1="-12" y1="-20" x2="12" y2="-20" stroke={colors.brand} strokeWidth="3" strokeLinecap="round" />
            {/* Legs */}
            <line x1="0" y1="-5" x2="-8" y2="10" stroke={colors.brand} strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="-5" x2="8" y2="10" stroke={colors.brand} strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Height indicator */}
          <line x1="25" y1="20" x2="25" y2="180" stroke={colors.textTertiary} strokeWidth="1" strokeDasharray="4,2" />
          <text x="15" y="100" fill={colors.textSecondary} fontSize="10" textAnchor="middle" transform="rotate(-90, 15, 100)">
            {stairHeight}m
          </text>

          {/* Mass label */}
          <text x={70 + climbProgress * 170} y={190 - climbProgress * 150} fill={colors.textTertiary} fontSize="10" textAnchor="middle">
            {personMass}kg
          </text>
        </svg>

        {/* Results Panel */}
        {showResults && (
          <div style={{
            marginTop: spacing.lg,
            padding: spacing.lg,
            background: colors.bgElevated,
            borderRadius: radius.md,
            border: `1px solid ${colors.success}40`,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.md,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typography.caption, color: colors.work, marginBottom: spacing.xs }}>WORK DONE</div>
                <div style={{ ...typography.h2, color: colors.textPrimary }}>{values.work.toLocaleString()} J</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typography.caption, color: colors.power, marginBottom: spacing.xs }}>POWER OUTPUT</div>
                <div style={{ ...typography.h2, color: colors.textPrimary }}>{values.power.toFixed(0)} W</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typography.caption, color: colors.success, marginBottom: spacing.xs }}>HORSEPOWER</div>
                <div style={{ ...typography.h2, color: colors.textPrimary }}>{values.horsepower.toFixed(2)} HP</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typography.caption, color: colors.error, marginBottom: spacing.xs }}>CALORIES BURNED</div>
                <div style={{ ...typography.h2, color: colors.textPrimary }}>{values.calories.toFixed(1)} cal</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // PHASE RENDER FUNCTIONS
  // ============================================================================

  const renderHook = () => (
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
          background: `linear-gradient(135deg, ${colors.work}30, ${colors.power}30)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
          fontSize: 48,
        }}>
          🏃
        </div>

        {/* Title */}
        <h1 style={{
          ...typography.hero,
          color: colors.textPrimary,
          marginBottom: spacing.lg
        }}>
          The Human Engine
        </h1>

        {/* Subtitle */}
        <p style={{
          ...typography.h3,
          color: colors.textSecondary,
          marginBottom: spacing.xxl,
          lineHeight: 1.6,
        }}>
          How much power do YOU generate when climbing stairs? Let's find out if you could power a light bulb!
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
              <div style={{ fontSize: 36, marginBottom: spacing.sm }}>🏃</div>
              <div style={{ ...typography.caption, color: colors.textSecondary }}>You (70kg)</div>
            </div>
            <div style={{ fontSize: 24, color: colors.textTertiary }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: spacing.sm }}>📶</div>
              <div style={{ ...typography.caption, color: colors.textSecondary }}>3m stairs</div>
            </div>
            <div style={{ fontSize: 24, color: colors.textTertiary }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: spacing.sm }}>⚡</div>
              <div style={{ ...typography.caption, color: colors.power }}>??? Watts</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (navigationLockRef.current) return;
            navigationLockRef.current = true;
            goToPhase(1);
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
  );

  // Premium wrapper for all phase renders
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Work & Power</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ fontFamily: typography.fontFamily }}>
        {children}
      </div>
    </div>
  );

  // Phase 0: Hook
  if (phase === 0) {
    return <PremiumWrapper>{renderHook()}</PremiumWrapper>;
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  if (phase === 1) {
    const predictions = [
      { id: 0, label: 'About 10 Watts', icon: '💡', description: 'Like a dim LED bulb' },
      { id: 1, label: 'About 100 Watts', icon: '🔆', description: 'Like a bright incandescent bulb' },
      { id: 2, label: 'About 500 Watts', icon: '⚡', description: 'Like a small space heater' },
      { id: 3, label: 'About 1000 Watts', icon: '🔥', description: 'Like a microwave oven' },
    ];

    return (
      <PremiumWrapper>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          fontFamily: typography.fontFamily
        }}>

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
                A 70kg person climbs 3 meters of stairs in 5 seconds. What's their power output?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Power = Work ÷ Time. Think about how hard it feels!
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
              {renderButton('Calculate Your Power →', () => goToPhase(2), 'primary', { disabled: prediction === null })}
            </div>
          </div>
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: PLAY
  // ============================================================================
  if (phase === 2) {
    const values = calculateValues();

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

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
                POWER CALCULATOR
              </span>
              <h2 style={{
                ...typography.h1,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}>
                Your Human Engine
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                Adjust the values and see how power changes
              </p>
            </div>

            {/* Visualization */}
            <StaircaseVisualization />

            {/* Sliders */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
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
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>MASS</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{personMass} kg</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={personMass}
                  onChange={(e) => { setPersonMass(Number(e.target.value)); resetClimb(); }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Height */}
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
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>HEIGHT</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{stairHeight} m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={stairHeight}
                  onChange={(e) => { setStairHeight(Number(e.target.value)); resetClimb(); }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Time */}
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
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>TIME</span>
                  <span style={{ ...typography.h3, color: colors.textPrimary }}>{climbTime} s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={climbTime}
                  onChange={(e) => { setClimbTime(Number(e.target.value)); resetClimb(); }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Controls */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <button
                onClick={startClimb}
                disabled={isClimbing}
                style={{
                  padding: '12px 32px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: isClimbing ? colors.bgHover : colors.success,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isClimbing ? 'default' : 'pointer',
                  fontFamily: typography.fontFamily,
                }}
              >
                {isClimbing ? `Climbing... ${(climbProgress * 100).toFixed(0)}%` : '▶ Climb Stairs'}
              </button>
              <button
                onClick={resetClimb}
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

            {/* Formula Display */}
            <div style={{
              padding: spacing.lg,
              background: colors.bgElevated,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <div style={{ ...typography.label, color: colors.brand, marginBottom: spacing.md }}>
                THE FORMULA
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.md,
                flexWrap: 'wrap',
                ...typography.h3,
                color: colors.textPrimary,
              }}>
                <span>P = </span>
                <span style={{ color: colors.work }}>Work</span>
                <span>/</span>
                <span style={{ color: colors.textSecondary }}>Time</span>
                <span>=</span>
                <span style={{ color: colors.work }}>mgh</span>
                <span>/</span>
                <span style={{ color: colors.textSecondary }}>t</span>
                <span>=</span>
                <span style={{ color: colors.power }}>{values.power.toFixed(0)} W</span>
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
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 3) {
    const correctAnswer = 2; // ~420W is closest to 500W
    const userWasClose = prediction === 2 || prediction === 1;

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Result */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
              <div style={{ fontSize: 64, marginBottom: spacing.lg }}>
                {userWasClose ? '🎯' : '💡'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasClose ? colors.success : colors.brand,
                marginBottom: spacing.md,
              }}>
                {userWasClose ? 'Great Estimate!' : 'The Answer Might Surprise You!'}
              </h2>
              <p style={{
                ...typography.h2,
                color: colors.power,
                marginBottom: spacing.sm,
              }}>
                ≈ 420 Watts
              </p>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                That's like powering 4-5 bright light bulbs!
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
                Work vs Power
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing.lg,
                marginBottom: spacing.lg,
              }}>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.work}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.work}30`,
                }}>
                  <div style={{ ...typography.h3, color: colors.work, marginBottom: spacing.xs }}>
                    Work (W)
                  </div>
                  <div style={{ ...typography.body, color: colors.textPrimary, marginBottom: spacing.xs }}>
                    W = F × d = mgh
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>
                    Energy transferred • Measured in Joules
                  </div>
                </div>
                <div style={{
                  padding: spacing.lg,
                  background: `${colors.power}10`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.power}30`,
                }}>
                  <div style={{ ...typography.h3, color: colors.power, marginBottom: spacing.xs }}>
                    Power (P)
                  </div>
                  <div style={{ ...typography.body, color: colors.textPrimary, marginBottom: spacing.xs }}>
                    P = W / t = Fv
                  </div>
                  <div style={{ ...typography.caption, color: colors.textTertiary }}>
                    Rate of work • Measured in Watts
                  </div>
                </div>
              </div>

              <div style={{
                padding: spacing.lg,
                background: colors.bgElevated,
                borderRadius: radius.md,
                textAlign: 'center',
              }}>
                <p style={{ ...typography.body, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Key Insight:</strong> Same work done faster = more power needed
                </p>
              </div>
            </div>

            {/* Comparison */}
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
                📊 Comparisons
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: spacing.md,
              }}>
                {[
                  { power: '420W', desc: 'You climbing stairs' },
                  { power: '100W', desc: 'Light bulb' },
                  { power: '746W', desc: '1 Horsepower' },
                  { power: '2000W', desc: 'Sprinting athlete' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ ...typography.h3, color: colors.textPrimary }}>{item.power}</div>
                    <div style={{ ...typography.caption, color: colors.textTertiary }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('Try a Twist →', goNext, 'primary')}
            </div>
          </div>
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  if (phase === 4) {
    const twistOptions = [
      { id: 0, label: 'Twice the power', icon: '⚡', description: 'Double the weight = double the power' },
      { id: 1, label: 'Same power', icon: '⚖️', description: 'Power doesn\'t depend on weight' },
      { id: 2, label: 'Half the power', icon: '📉', description: 'Heavier people use less power' },
      { id: 3, label: 'Four times the power', icon: '🔥', description: 'Power increases with weight squared' },
    ];

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

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
                What if you carry a heavy backpack?
              </h2>
              <p style={{
                ...typography.body,
                color: colors.textSecondary
              }}>
                If you double your effective weight (person + backpack), climbing the same stairs in the same time requires...
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
              {renderButton('Test It Out →', goNext, 'primary', { disabled: twistPrediction === null })}
            </div>
          </div>
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  if (phase === 5) {
    const [backpackWeight, setBackpackWeight] = useState(0);
    const totalMass = personMass + backpackWeight;
    const basePower = (70 * 10 * 3) / 5; // Base case: 70kg, 3m, 5s
    const currentPower = (totalMass * 10 * stairHeight) / climbTime;

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

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
                Add Weight, See Power Change
              </h2>
            </div>

            {/* Backpack Weight Slider */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.xl,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}>
                <div>
                  <span style={{ ...typography.body, color: colors.textPrimary, fontWeight: 600 }}>
                    🎒 Backpack Weight
                  </span>
                </div>
                <span style={{ ...typography.h2, color: colors.warning }}>
                  {backpackWeight} kg
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="70"
                value={backpackWeight}
                onChange={(e) => setBackpackWeight(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.sm,
              }}>
                <span style={{ ...typography.caption, color: colors.textTertiary }}>Empty</span>
                <span style={{ ...typography.caption, color: colors.textTertiary }}>Heavy Hiking Pack</span>
              </div>
            </div>

            {/* Comparison Display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.lg,
              marginBottom: spacing.xl,
            }}>
              <div style={{
                padding: spacing.lg,
                background: colors.bgCard,
                borderRadius: radius.lg,
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm }}>
                  TOTAL MASS
                </div>
                <div style={{ ...typography.hero, color: colors.textPrimary, fontSize: 36 }}>
                  {totalMass} kg
                </div>
                <div style={{ ...typography.caption, color: colors.textSecondary }}>
                  Person ({personMass}) + Pack ({backpackWeight})
                </div>
              </div>
              <div style={{
                padding: spacing.lg,
                background: `${colors.power}10`,
                borderRadius: radius.lg,
                border: `1px solid ${colors.power}40`,
                textAlign: 'center',
              }}>
                <div style={{ ...typography.caption, color: colors.power, marginBottom: spacing.sm }}>
                  POWER REQUIRED
                </div>
                <div style={{ ...typography.hero, color: colors.power, fontSize: 36 }}>
                  {currentPower.toFixed(0)} W
                </div>
                <div style={{ ...typography.caption, color: colors.textSecondary }}>
                  {((currentPower / basePower) * 100).toFixed(0)}% of base
                </div>
              </div>
            </div>

            {/* Visual Power Comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
            }}>
              <div style={{ ...typography.label, color: colors.textTertiary, marginBottom: spacing.md }}>
                POWER COMPARISON
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <span style={{ ...typography.bodySmall, color: colors.textSecondary }}>Without backpack (70kg)</span>
                  <span style={{ ...typography.bodySmall, color: colors.textPrimary }}>{basePower}W</span>
                </div>
                <div style={{
                  height: 12,
                  background: colors.bgHover,
                  borderRadius: radius.full,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: '50%',
                    background: colors.brand,
                  }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <span style={{ ...typography.bodySmall, color: colors.textSecondary }}>With backpack ({totalMass}kg)</span>
                  <span style={{ ...typography.bodySmall, color: colors.power }}>{currentPower.toFixed(0)}W</span>
                </div>
                <div style={{
                  height: 12,
                  background: colors.bgHover,
                  borderRadius: radius.full,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (currentPower / basePower) * 50)}%`,
                    background: colors.power,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing.md }}>
              {renderButton('← Back', goBack, 'ghost')}
              {renderButton('See the Insight →', goNext, 'primary')}
            </div>
          </div>
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  if (phase === 6) {
    const userWasRight = twistPrediction === 0;

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Result */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
              <div style={{ fontSize: 64, marginBottom: spacing.lg }}>
                {userWasRight ? '🎯' : '⚡'}
              </div>
              <h2 style={{
                ...typography.h1,
                color: userWasRight ? colors.success : colors.warning,
                marginBottom: spacing.md,
              }}>
                {userWasRight ? 'Correct!' : 'Power Scales Directly with Mass!'}
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
                The Linear Relationship
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
                  margin: 0,
                  marginBottom: spacing.sm
                }}>
                  P = mgh / t
                </p>
                <p style={{
                  ...typography.body,
                  color: colors.textSecondary,
                  margin: 0
                }}>
                  Double the mass (m) → Double the power (P)
                </p>
              </div>

              <p style={{
                ...typography.body,
                color: colors.textSecondary,
                marginBottom: spacing.lg
              }}>
                This explains why:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {[
                  { icon: '🛗', text: 'Elevator motors work harder with more passengers' },
                  { icon: '🚴', text: 'Heavier cyclists need more power to climb hills' },
                  { icon: '🎒', text: 'Hiking with a pack is significantly harder' },
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
                    <span style={{ ...typography.body, color: colors.textSecondary }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Practical Implication */}
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
                💪 Practical Takeaway
              </p>
              <p style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                margin: 0
              }}>
                When you're tired climbing stairs, you naturally slow down. By taking more time, you reduce the power needed while doing the same total work!
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
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications)
  // ============================================================================
  if (phase === 7) {
    const app = applications[activeApp];
    const allRead = completedApps.size >= applications.length;

    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

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
          {renderButton('Take the Quiz →', () => goToPhase(8), 'primary', { disabled: !allRead })}
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 8) {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans !== null && testQuestions[i].options[ans]?.correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <PremiumWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: typography.fontFamily }}>
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
                {passed ? 'You\'ve mastered work and power!' : 'Review the concepts and try again.'}
              </p>
              {renderButton(passed ? 'Complete! →' : 'Review Material', () => passed ? goNext() : goToPhase(3), passed ? 'success' : 'primary', { size: 'lg' })}
            </div>
          </div>
        </div>
        </PremiumWrapper>
      );
    }

    return (
      <PremiumWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: typography.fontFamily }}>
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
                      ? (testQuestions[i].options[testAnswers[i] as number]?.correct ? colors.success : colors.error)
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
                const isCorrect = opt.correct;
                const showResult = testAnswers[testIndex] !== null;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (testAnswers[testIndex] === null) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testIndex] = i;
                        setTestAnswers(newAnswers);
                        emitEvent('test_answered', { questionIndex: testIndex, correct: q.options[i].correct });
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
                    {opt.text}
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
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  if (phase === 9) {
    return (
      <PremiumWrapper>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: typography.fontFamily
      }}>

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
              Power Expert!
            </h1>

            <p style={{
              ...typography.h3,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
              lineHeight: 1.6,
            }}>
              You now understand work, power, and how they govern everything from elevators to your own body!
            </p>

            {/* Achievements */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.xxl,
            }}>
              {[
                { icon: '⚡', label: 'Work = Fd' },
                { icon: '🔋', label: 'Power = W/t' },
                { icon: '🏃', label: 'Human Power' },
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
                KEY FORMULAS MASTERED
              </p>
              <div style={{ ...typography.h2, color: colors.textPrimary }}>
                <div>W = Fd = mgh</div>
                <div style={{ marginTop: spacing.sm }}>P = W/t = Fv</div>
              </div>
            </div>

            {/* CTA */}
            {renderButton('Complete Lesson 🎉', () => emitEvent('mastery_achieved', { game: 'work_power' }), 'success', { size: 'lg' })}
          </div>
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // Fallback - should never reach here
  return (
    <PremiumWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: colors.textSecondary }}>Loading...</p>
      </div>
    </PremiumWrapper>
  );
}
