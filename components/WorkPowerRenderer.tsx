'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// WORK & POWER RENDERER - PREMIUM PHYSICS GAME
// The Human Engine: Calculate the power you generate climbing stairs
// ============================================================================

const realWorldApps = [
  {
    icon: '🏋️',
    title: 'Athletic Performance Training',
    short: 'Measuring human power output',
    tagline: 'Train smarter with physics',
    description: 'Athletes and coaches use power meters to measure work rate during training. Cycling power meters, force plates, and metabolic analyzers quantify exactly how much power an athlete generates, enabling precise training optimization.',
    connection: 'Power = Work/Time = Force × Velocity. By measuring the force applied and speed of movement, trainers calculate instantaneous power output. This directly applies the physics of work and power to human performance.',
    howItWorks: 'Cycling power meters use strain gauges in the crank or pedals to measure force. Multiplied by angular velocity gives power in watts. Athletes train at specific power zones to improve endurance, threshold, and sprint capacity.',
    stats: [
      { value: '2,000W', label: 'Sprint cyclist peak', icon: '🚴' },
      { value: '400W', label: 'Tour de France avg', icon: '💪' },
      { value: '$8B', label: 'Sports tech market', icon: '📈' }
    ],
    examples: ['Cycling power meters', 'Rowing ergometers', 'Weightlifting analysis', 'Jump power testing'],
    companies: ['SRM', 'Garmin', 'Stages', 'Wahoo'],
    futureImpact: 'AI coaches will prescribe real-time power targets during workouts, optimizing training adaptations based on accumulated fatigue and recovery.',
    color: '#EF4444'
  },
  {
    icon: '🔋',
    title: 'Electric Motor Efficiency',
    short: 'Converting electricity to motion',
    tagline: 'Power in, work out',
    description: 'Electric motors convert electrical power to mechanical work. Motor efficiency ratings tell you how much input power becomes useful work versus waste heat. EV motors achieve 95%+ efficiency compared to 25-30% for combustion engines.',
    connection: 'Motor power output (mechanical work per second) divided by electrical power input gives efficiency. Understanding this relationship is crucial for designing efficient electric vehicles, appliances, and industrial equipment.',
    howItWorks: 'Electric motors create torque through electromagnetic forces. Power output = Torque × Angular velocity. Losses occur in windings (resistive heating), core (hysteresis), and mechanical friction. Engineers minimize each loss type.',
    stats: [
      { value: '95%', label: 'EV motor efficiency', icon: '⚡' },
      { value: '500hp', label: 'Tesla Model S Plaid', icon: '🚗' },
      { value: '$170B', label: 'Electric motor market', icon: '📈' }
    ],
    examples: ['Tesla drive units', 'Industrial pumps', 'HVAC compressors', 'Power tool motors'],
    companies: ['Tesla', 'Nidec', 'ABB', 'Siemens'],
    futureImpact: 'Superconducting motors will achieve near-100% efficiency, revolutionizing aviation with practical electric aircraft.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'Power Grid Management',
    short: 'Balancing electricity supply and demand',
    tagline: 'Keeping the lights on',
    description: 'Power grids must instantaneously match generation to consumption. Grid operators monitor power flows in megawatts across thousands of generators and millions of loads, making split-second decisions to maintain stability.',
    connection: 'Electrical power delivered equals voltage times current. Grid operators track power generation and consumption continuously, understanding that any imbalance causes frequency changes that can cascade into blackouts.',
    howItWorks: 'Generators convert mechanical work (from turbines) to electrical power. Grid frequency (60Hz in US) indicates supply-demand balance - dropping frequency means more power is being consumed than generated. Operators dispatch additional generation to compensate.',
    stats: [
      { value: '4,000GW', label: 'Global capacity', icon: '🌍' },
      { value: '60Hz', label: 'US grid frequency', icon: '📊' },
      { value: '$2T', label: 'Annual electricity sales', icon: '💰' }
    ],
    examples: ['Peak demand response', 'Renewable integration', 'Emergency load shedding', 'Interstate power trading'],
    companies: ['National Grid', 'PJM Interconnection', 'ERCOT', 'CAISO'],
    futureImpact: 'AI-managed grids will predict demand and automatically dispatch renewable generation, storage, and demand response to maintain perfect balance.',
    color: '#F59E0B'
  },
  {
    icon: '🏠',
    title: 'Building Energy Systems',
    short: 'Designing efficient buildings',
    tagline: 'Comfort with less power',
    description: 'HVAC engineers calculate heating and cooling loads in terms of power requirements. Understanding the work needed to move heat against temperature gradients enables efficient building design that minimizes energy consumption.',
    connection: 'Heat pumps do work to move thermal energy from cold to hot reservoirs. The coefficient of performance (COP) relates heating/cooling power output to electrical power input, directly applying work-energy principles.',
    howItWorks: 'Heat pumps use compressors to circulate refrigerant, doing work to move heat. A COP of 4 means 4kW of heating from 1kW of electrical input. Building thermal mass stores energy, reducing peak power demand.',
    stats: [
      { value: '40%', label: 'Building energy use', icon: '🏢' },
      { value: 'COP 5', label: 'Modern heat pump', icon: '❄️' },
      { value: '$300B', label: 'HVAC market size', icon: '📈' }
    ],
    examples: ['Heat pump HVAC', 'Solar thermal systems', 'Energy recovery ventilation', 'Smart thermostats'],
    companies: ['Carrier', 'Trane', 'Daikin', 'Mitsubishi Electric'],
    futureImpact: 'Net-zero buildings will generate as much power as they consume, using integrated solar and ultra-efficient heat pumps with smart controls.',
    color: '#10B981'
  }
];

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

// String-based phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Experiment',
  twist_review: 'Twist Review',
  transfer: 'Real-World Transfer',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface WorkPowerRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
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
  textSecondary: '#D0D0D8',
  textTertiary: '#BEC0CC',
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
      { text: '30 Watts - low estimate', correct: false },
      { text: '300 Watts - correct calculation', correct: true },
      { text: '3000 Watts - too high', correct: false },
      { text: '60 Watts - mass only', correct: false },
    ],
    explanation: 'P = W/t = mgh/t = 60 × 10 × 5 / 10 = 300 W. The correct answer uses the full power formula.',
  },
  {
    question: 'Two people do the same amount of work. Person A takes 5 seconds, Person B takes 10 seconds. Which is true?',
    options: [
      { text: 'Person A has twice the power output', correct: true },
      { text: 'Person B has twice the power output', correct: false },
      { text: 'Both have exactly equal power', correct: false },
      { text: 'Cannot determine from given info', correct: false },
    ],
    explanation: 'Power = Work/Time. Same work in half the time = twice the power. This is the key relationship.',
  },
  {
    question: 'A crane lifts a 500kg load 20m in 10 seconds. What power does the motor provide? (g = 10 m/s²)',
    options: [
      { text: '1000 Watts - underestimate', correct: false },
      { text: '10,000 Watts (10 kilowatts)', correct: true },
      { text: '100,000 Watts - overestimate', correct: false },
      { text: '250 Watts - far too low', correct: false },
    ],
    explanation: 'P = mgh/t = 500 × 10 × 20 / 10 = 10,000 W = 10 kW. This is a substantial motor.',
  },
  {
    question: 'If you push a box with 100N force at 2 m/s constant speed, what is your power output?',
    options: [
      { text: '50 Watts - half the force', correct: false },
      { text: '200 Watts - force times velocity', correct: true },
      { text: '400 Watts - double counted', correct: false },
      { text: '100 Watts - force only value', correct: false },
    ],
    explanation: 'P = Fv = 100 × 2 = 200 W. Power equals force multiplied by velocity.',
  },
  {
    question: 'A 1000W motor runs for 1 hour. How much work does it do?',
    options: [
      { text: '1000 Joules - forgot time conversion', correct: false },
      { text: '60,000 Joules - only one minute', correct: false },
      { text: '3,600,000 Joules (3.6 megajoules)', correct: true },
      { text: '1 Joule - completely wrong', correct: false },
    ],
    explanation: 'W = Pt = 1000 × 3600 = 3,600,000 J = 3.6 MJ. Remember: 1 hour = 3600 seconds.',
  },
  {
    question: 'Why do electric cars have faster acceleration than similarly powered gas cars?',
    options: [
      { text: 'Electric cars always weigh less than gas cars', correct: false },
      { text: 'Instant maximum torque from zero RPM', correct: true },
      { text: 'Electric cars use specially designed tires', correct: false },
      { text: 'Electric motors are more thermally efficient', correct: false },
    ],
    explanation: 'Electric motors deliver maximum torque instantly at 0 RPM, while gas engines need to rev up to their power band.',
  },
  {
    question: 'A cyclist produces 400W and weighs 80kg with bike. Climbing a 10% grade at constant speed, what is their velocity?',
    options: [
      { text: '0.5 meters per second - too slow', correct: false },
      { text: '5 meters per second - correct answer', correct: true },
      { text: '50 meters per second - impossibly fast', correct: false },
      { text: '1 meter per second - underestimate', correct: false },
    ],
    explanation: 'P = mgv sin(θ) ≈ 80 × 10 × v × 0.1 = 80v. So v = 400/80 = 5 m/s',
  },
  {
    question: 'Which requires more power: lifting 100kg by 1m in 1 second, or lifting 10kg by 10m in 10 seconds?',
    options: [
      { text: 'The 100kg lift requires more power', correct: true },
      { text: 'The 10kg lift requires more power', correct: false },
      { text: 'Both require exactly equal power', correct: false },
      { text: 'Cannot compare these two scenarios', correct: false },
    ],
    explanation: '100kg: P = 100×10×1/1 = 1000W. 10kg: P = 10×10×10/10 = 100W. The heavier lift needs 10× more power.',
  },
  {
    question: 'If the human body is 25% efficient, how much food energy (calories) powers a 400W workout for 1 hour?',
    options: [
      { text: '400 kcal - mechanical work only', correct: false },
      { text: '1600 kcal - four times work value', correct: false },
      { text: '100 kcal - significant underestimate', correct: false },
      { text: '344 kcal - accounting for efficiency', correct: true },
    ],
    explanation: 'Mechanical work = 400 × 3600 = 1.44 MJ. At 25% efficiency, need 5.76 MJ = ~1370 kcal ≈ 344 kcal (accounting for 4.18 kJ/kcal).',
  },
  {
    question: 'A 100W light bulb and a 100W electric motor both run for an hour. Which does more work?',
    options: [
      { text: 'The light bulb does more total work', correct: false },
      { text: 'The electric motor does more total work', correct: false },
      { text: 'Equal work output - same power rating means same energy', correct: true },
      { text: 'Depends entirely on their operating efficiency', correct: false },
    ],
    explanation: 'Both consume 100W × 3600s = 360,000 J of electrical energy. The motor converts more to mechanical work; the bulb to light and heat.',
  },
];

export default function WorkPowerRenderer({ onComplete, onGameEvent, gamePhase, onPhaseComplete }: WorkPowerRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>((gamePhase as Phase) ?? 'hook');
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
  const [backpackWeight, setBackpackWeight] = useState(0); // twist_play state

  // Animation
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Web Audio API sound - non-blocking
  const playSound = useCallback((_type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
    // Fire-and-forget to avoid blocking button response
    requestAnimationFrame(() => {
      try {
        const audioContext = new AudioContext();
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
        const sound = sounds[_type];
        oscillator.frequency.value = sound.freq;
        oscillator.type = sound.type;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + sound.duration);
      } catch { /* Audio not available */ }
    });
  }, []);

  // Emit events
  const emitEvent = (type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  };

  // Phase navigation - simplified without locks
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [phase, playSound, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
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

  // Helper function: renderButton - simplified with onClick
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
        onClick={(e) => {
          e.preventDefault();
          if (disabled) return;
          onClick();
        }}
        disabled={disabled}
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: 600,
          borderRadius: radius.md,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.5 : 1,
          zIndex: 10,
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

  // Helper function: Premium Staircase visualization with advanced SVG graphics
  function StaircaseVisualization() {
    const values = calculateValues();
    const numStairs = Math.ceil(stairHeight / 0.2); // ~20cm per stair

    // Energy transfer animation progress
    const energyPulse = isClimbing ? climbProgress : (showResults ? 1 : 0);
    const powerPercent = Math.min(100, (values.power / 1000) * 100); // Scale to 1000W max

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        {/* Premium Staircase SVG */}
        <svg
          viewBox="0 0 500 320"
          style={{
            width: '100%',
            height: isMobile ? 240 : 300,
            background: `linear-gradient(180deg, #0a0f1a 0%, #030712 100%)`,
            borderRadius: radius.md,
          }}
        >
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* PREMIUM DEFS SECTION - Gradients, Filters, and Effects */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <defs>
            {/* Premium Lab Background Gradient */}
            <linearGradient id="wkpwLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Stair Step Gradient - Concrete/Stone appearance */}
            <linearGradient id="wkpwStairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="20%" stopColor="#374151" />
              <stop offset="50%" stopColor="#3f4a5c" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#2d3748" />
            </linearGradient>

            {/* Stair Side Gradient - Depth effect */}
            <linearGradient id="wkpwStairSide" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#2d3748" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Person Body Gradient - Athletic appearance */}
            <linearGradient id="wkpwPersonBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="30%" stopColor="#6366f1" />
              <stop offset="60%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            {/* Person Glow Gradient */}
            <radialGradient id="wkpwPersonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </radialGradient>

            {/* Energy Transfer Gradient - Yellow/Orange for work */}
            <linearGradient id="wkpwEnergyFlow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#b45309" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.2" />
            </linearGradient>

            {/* Power Meter Gradient - Blue to Cyan */}
            <linearGradient id="wkpwPowerMeter" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            {/* Energy Bar Gradient - Green to Emerald */}
            <linearGradient id="wkpwEnergyBar" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="25%" stopColor="#047857" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Force Arrow Gradient */}
            <linearGradient id="wkpwForceArrow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="30%" stopColor="#fb923c" />
              <stop offset="60%" stopColor="#fdba74" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>

            {/* Gravity Arrow Gradient */}
            <linearGradient id="wkpwGravityArrow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="30%" stopColor="#dc2626" />
              <stop offset="60%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Ground/Floor Gradient */}
            <linearGradient id="wkpwGround" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Ceiling/Top Gradient */}
            <linearGradient id="wkpwCeiling" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* PREMIUM FILTER EFFECTS */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}

            {/* Person Glow Filter */}
            <filter id="wkpwPersonGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy Pulse Glow */}
            <filter id="wkpwEnergyGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Power Meter Glow */}
            <filter id="wkpwPowerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stair Shadow */}
            <filter id="wkpwStairShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feOffset dx="2" dy="3" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle Inner Glow */}
            <filter id="wkpwInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Label Background */}
            <filter id="wkpwLabelBg" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" />
            </filter>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* BACKGROUND */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <rect width="500" height="320" fill="url(#wkpwLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="wkpwGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
          <rect width="500" height="320" fill="url(#wkpwGrid)" />

          {/* Ground line */}
          <rect x="0" y="280" width="500" height="40" fill="url(#wkpwGround)" />

          {/* Grid lines for reference */}
          <line x1="0" y1="80" x2="500" y2="80" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="6 4" opacity="0.4" />
          <line x1="0" y1="140" x2="500" y2="140" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="6 4" opacity="0.4" />
          <line x1="0" y1="200" x2="500" y2="200" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="6 4" opacity="0.4" />

          {/* Energy transfer path - shows work being done against gravity */}
          <path
            d={`M80 280 L92 267 L104 253 L116 240 L128 227 L140 213 L152 200 L164 187 L176 173 L188 160 L200 147 L212 133 L224 120 L236 107 L248 93 L260 80`}
            stroke="#f59e0b"
            strokeWidth="2"
            fill="none"
            opacity="0.4"
            strokeDasharray="4 4"
          />

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* STAIRS - 3D APPEARANCE */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {Array.from({ length: numStairs }).map((_, i) => {
            const stepHeight = 200 / numStairs;
            const stepWidth = 180 / numStairs;
            const y = 280 - (i + 1) * stepHeight;
            const x = 80 + i * stepWidth;
            const depth = 8; // 3D depth

            return (
              <g key={i} filter="url(#wkpwStairShadow)">
                {/* Stair top surface */}
                <rect
                  x={x}
                  y={y}
                  width={stepWidth + 4}
                  height={stepHeight}
                  fill="url(#wkpwStairGrad)"
                  stroke="#4b5563"
                  strokeWidth="0.5"
                />
                {/* Stair front face (3D effect) */}
                <rect
                  x={x}
                  y={y + stepHeight - depth}
                  width={stepWidth + 4}
                  height={depth}
                  fill="url(#wkpwStairSide)"
                  stroke="#374151"
                  strokeWidth="0.5"
                />
                {/* Step number indicator */}
                {(i + 1) % 3 === 0 && (
                  <text
                    x={x + stepWidth / 2}
                    y={y + stepHeight - 2}
                    fill="#64748b"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {i + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* ENERGY TRANSFER ANIMATION - Flowing energy particles */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {isClimbing && (
            <g filter="url(#wkpwEnergyGlow)">
              {/* Energy flow path along stairs */}
              {Array.from({ length: 8 }).map((_, i) => {
                const particleProgress = ((climbProgress * 3 + i * 0.125) % 1);
                const px = 90 + particleProgress * 180;
                const py = 270 - particleProgress * 200;
                return (
                  <circle
                    key={`energy-${i}`}
                    cx={px}
                    cy={py}
                    r={3 + Math.sin(particleProgress * Math.PI) * 2}
                    fill="#fbbf24"
                    opacity={0.6 + Math.sin(particleProgress * Math.PI) * 0.4}
                  >
                    <animate
                      attributeName="r"
                      values="2;5;2"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* PERSON - PREMIUM ATHLETIC FIGURE */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <g
            transform={`translate(${100 + climbProgress * 180}, ${260 - climbProgress * 200})`}
            filter="url(#wkpwPersonGlowFilter)"
          >
            {/* Person glow aura */}
            <ellipse cx="0" cy="-15" rx="20" ry="35" fill="url(#wkpwPersonGlow)" opacity={isClimbing ? 0.8 : 0.4} />

            {/* Head */}
            <circle cx="0" cy="-45" r="12" fill="url(#wkpwPersonBody)" />
            <circle cx="-3" cy="-47" r="2" fill="#e0e7ff" opacity="0.6" /> {/* Eye highlight */}

            {/* Neck */}
            <rect x="-3" y="-34" width="6" height="6" fill="url(#wkpwPersonBody)" rx="2" />

            {/* Torso */}
            <polygon
              points="-10,-28 10,-28 8,-8 -8,-8"
              fill="url(#wkpwPersonBody)"
              stroke="#4338ca"
              strokeWidth="0.5"
            />

            {/* Arms - animated based on climbing */}
            <g>
              {/* Left arm */}
              <line
                x1="-10" y1="-26"
                x2={-18 + Math.sin(climbProgress * Math.PI * 4) * 5}
                y2={-15 + Math.cos(climbProgress * Math.PI * 4) * 3}
                stroke="url(#wkpwPersonBody)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Right arm */}
              <line
                x1="10" y1="-26"
                x2={18 - Math.sin(climbProgress * Math.PI * 4) * 5}
                y2={-15 - Math.cos(climbProgress * Math.PI * 4) * 3}
                stroke="url(#wkpwPersonBody)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>

            {/* Legs - animated for climbing motion */}
            <g>
              {/* Left leg */}
              <line
                x1="-5" y1="-8"
                x2={-8 + Math.sin(climbProgress * Math.PI * 6) * 4}
                y2={10 + Math.abs(Math.sin(climbProgress * Math.PI * 6)) * 5}
                stroke="url(#wkpwPersonBody)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Right leg */}
              <line
                x1="5" y1="-8"
                x2={8 - Math.sin(climbProgress * Math.PI * 6) * 4}
                y2={10 + Math.abs(Math.cos(climbProgress * Math.PI * 6)) * 5}
                stroke="url(#wkpwPersonBody)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>

            {/* Mass label with background - absolute coords computed at render */}
          </g>
          {(() => {
            const px = 100 + climbProgress * 180;
            const py = 260 - climbProgress * 200;
            return (
              <>
                <rect x={px - 22} y={py + 18} width="44" height="16" rx="4" fill="#1e293b" opacity="0.9" />
                <text x={px} y={py + 30} fill="#a5b4fc" fontSize="11" textAnchor="middle" fontWeight="600">
                  {personMass}kg
                </text>
              </>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* FORCE ARROWS - Applied Force and Gravity (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {(() => {
            const px = 100 + climbProgress * 180;
            const py = 260 - climbProgress * 200;
            return (
              <>
                {/* Upward force arrow */}
                <g filter="url(#wkpwPowerGlow)" opacity={isClimbing ? 1 : 0.5}>
                  <line x1={px} y1={py - 60} x2={px} y2={py - 90} stroke="url(#wkpwForceArrow)" strokeWidth="4" />
                  <polygon points={`${px - 8},${py - 85} ${px},${py - 100} ${px + 8},${py - 85}`} fill="url(#wkpwForceArrow)" />
                  <text x={px + 15} y={py - 75} fill="#fb923c" fontSize="11" fontWeight="600">F</text>
                </g>
                {/* Downward gravity arrow */}
                <g opacity="0.7">
                  <line x1={px + 25} y1={py + 5} x2={px + 25} y2={py + 30} stroke="url(#wkpwGravityArrow)" strokeWidth="3" />
                  <polygon points={`${px + 17},${py + 25} ${px + 25},${py + 38} ${px + 33},${py + 25}`} fill="url(#wkpwGravityArrow)" />
                  <text x={px + 40} y={py + 30} fill="#ef4444" fontSize="11" fontWeight="600">mg</text>
                </g>
              </>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* HEIGHT INDICATOR */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <g>
            {/* Vertical measurement line */}
            <line x1="50" y1="80" x2="50" y2="280" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6,3" />
            <line x1="45" y1="80" x2="55" y2="80" stroke="#64748b" strokeWidth="2" />
            <line x1="45" y1="280" x2="55" y2="280" stroke="#64748b" strokeWidth="2" />

            {/* Height label with background */}
            <rect x="25" y="165" width="50" height="22" rx="4" fill="#1e293b" opacity="0.95" />
            <text x="50" y="180" fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="700">
              h = {stairHeight}m
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* POWER METER - Vertical gauge on the right (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Meter background */}
          <rect x="320" y="40" width="40" height="200" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          {/* Meter scale marks */}
          {[0, 25, 50, 75, 100].map((val) => (
            <g key={`pm-${val}`}>
              <line x1="320" y1={240 - val * 2} x2="328" y2={240 - val * 2} stroke="#64748b" strokeWidth="1" />
            </g>
          ))}
          {/* Power fill */}
          <rect
            x="324"
            y={240 - powerPercent * 1.92}
            width="32"
            height={powerPercent * 1.92}
            rx="3"
            fill="url(#wkpwPowerMeter)"
            filter="url(#wkpwPowerGlow)"
          >
            {isClimbing && (
              <animate attributeName="opacity" values="0.7;1;0.7" dur="0.5s" repeatCount="indefinite" />
            )}
          </rect>
          {/* Power value */}
          <rect x="320" y="248" width="40" height="24" rx="4" fill="#1e3a5f" />
          <text x="340" y="264" fill="#3b82f6" fontSize="11" textAnchor="middle" fontWeight="700">
            {values.power.toFixed(0)}W
          </text>
          {/* Power label */}
          <text x="340" y="32" fill="#60a5fa" fontSize="11" textAnchor="middle" fontWeight="600">POWER</text>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* ENERGY BAR (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <rect x="380" y="40" width="40" height="200" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect
            x="384"
            y={240 - energyPulse * 192}
            width="32"
            height={energyPulse * 192}
            rx="3"
            fill="url(#wkpwEnergyBar)"
            filter="url(#wkpwPowerGlow)"
          />
          <rect x="380" y="248" width="40" height="24" rx="4" fill="#064e3b" />
          <text x="400" y="280" fill="#10b981" fontSize="11" textAnchor="middle" fontWeight="700">
            {(values.work * energyPulse).toFixed(0)}J
          </text>
          <text x="400" y="16" fill="#34d399" fontSize="11" textAnchor="middle" fontWeight="600">WORK</text>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* TIME INDICATOR (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <rect x="440" y="40" width="50" height="40" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <text x="465" y="58" fill="#64748b" fontSize="11" textAnchor="middle" fontWeight="600">TIME</text>
          <text x="465" y="92" fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="700">
            {isClimbing ? (climbProgress * climbTime).toFixed(1) : climbTime}s
          </text>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* FORMULA DISPLAY (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <rect x="170" y="295" width="160" height="22" rx="4" fill="#1e293b" opacity="0.95" stroke="#334155" strokeWidth="0.5" />
          <text x="250" y="311" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">
            P = mgh/t = <tspan fill="#3b82f6">{values.power.toFixed(0)}W</tspan>
          </text>

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* COMPLETION INDICATOR (absolute coords) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {showResults && (
            <>
              <rect x="190" y="2" width="120" height="24" rx="6" fill="#065f46" opacity="0.95" />
              <text x="250" y="19" fill="#34d399" fontSize="14" textAnchor="middle" fontWeight="700">
                COMPLETE
              </text>
            </>
          )}

          {/* Interactive marker circle that moves with slider */}
          <circle
            cx={100 + climbProgress * 180}
            cy={260 - climbProgress * 200}
            r="5"
            fill="#f59e0b"
            stroke="#fff"
            strokeWidth="2"
          />
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
          onClick={(e) => {
            e.preventDefault();
            goToPhase('predict');
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
            zIndex: 10,
          }}
        >
          Start Discovery →
        </button>
      </div>
    </div>
  );

  // Premium wrapper for all phase renders
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: '#0a0f1a',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Premium background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)',
        pointerEvents: 'none',
      }} />

      {/* Fixed Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Work & Power</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: phase === p
                    ? '#818cf8'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? '#10b981'
                      : '#334155',
                  boxShadow: phase === p ? '0 0 12px rgba(129, 140, 248, 0.3)' : 'none',
                  zIndex: 10,
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#818cf8' }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content with scroll */}
      <div style={{
        position: 'relative',
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '64px',
        paddingBottom: '80px',
        fontFamily: typography.fontFamily,
        transition: 'all 0.3s ease',
      }}>
        {children}
      </div>
    </div>
  );

  // Phase: Hook
  if (phase === 'hook') {
    return <PremiumWrapper>{renderHook()}</PremiumWrapper>;
  }

  // ============================================================================
  // PHASE: PREDICT - Static graphic with prediction options
  // ============================================================================
  if (phase === 'predict') {
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
          padding: isMobile ? spacing.lg : spacing.xl,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Question */}
            <div style={{
              textAlign: 'center',
              marginBottom: spacing.xl
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
                Power = Work / Time. Think about how hard it feels!
              </p>
            </div>

            {/* Static Graphic - Staircase diagram showing the scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              border: `1px solid ${colors.border}`,
            }}>
              <svg viewBox="0 0 400 200" width="100%" style={{ display: 'block', background: '#030712', borderRadius: radius.md }}>
                <defs>
                  <linearGradient id="predStairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>
                  <linearGradient id="predPersonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>

                {/* Ground */}
                <rect x="0" y="170" width="400" height="30" fill="#1f2937" />
                <line x1="0" y1="170" x2="400" y2="170" stroke="#374151" strokeWidth="2" />

                {/* Stairs */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <g key={i}>
                    <rect x={80 + i * 25} y={170 - (i + 1) * 18} width="28" height="18" fill="url(#predStairGrad)" stroke="#4b5563" strokeWidth="0.5" />
                  </g>
                ))}

                {/* Person at bottom of stairs */}
                <g transform="translate(90, 145)">
                  {/* Head */}
                  <circle cx="0" cy="-35" r="10" fill="url(#predPersonGrad)" />
                  {/* Body */}
                  <rect x="-8" y="-25" width="16" height="22" fill="url(#predPersonGrad)" rx="3" />
                  {/* Legs */}
                  <rect x="-7" y="-3" width="5" height="18" fill="url(#predPersonGrad)" rx="2" />
                  <rect x="2" y="-3" width="5" height="18" fill="url(#predPersonGrad)" rx="2" />
                </g>

                {/* Arrow showing climb direction */}
                <path d="M130 120 L200 55" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,3" />
                <polygon points="205,50 195,55 198,62" fill="#f59e0b" />

                {/* Height indicator */}
                <line x1="50" y1="30" x2="50" y2="170" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,2" />
                <line x1="45" y1="30" x2="55" y2="30" stroke="#10b981" strokeWidth="2" />
                <line x1="45" y1="170" x2="55" y2="170" stroke="#10b981" strokeWidth="2" />
                <text x="30" y="105" fill="#10b981" fontSize="12" fontWeight="700" textAnchor="middle" transform="rotate(-90, 30, 105)">3m</text>

                {/* Labels */}
                <text x="90" y="185" fill="#a5b4fc" fontSize="11" fontWeight="600" textAnchor="middle">70 kg</text>
                <text x="300" y="30" fill="#fbbf24" fontSize="14" fontWeight="700" textAnchor="middle">Power = ?</text>
                <text x="300" y="50" fill="#94a3b8" fontSize="11" textAnchor="middle">5 seconds to climb</text>

                {/* Question mark near destination */}
                <text x="280" y="80" fill="#f59e0b" fontSize="24" fontWeight="bold">?</text>
              </svg>
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
                    transition: 'all 0.2s ease',
                    fontFamily: typography.fontFamily,
                    zIndex: 10,
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
              {renderButton('Calculate Your Power →', () => goToPhase('play'), 'primary', { disabled: prediction === null })}
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
  if (phase === 'play') {
    const values = calculateValues();

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: '#0a0f1a',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Premium background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)',
          pointerEvents: 'none',
        }} />

        {/* Fixed Header */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Work & Power</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {phaseOrder.map((p) => (
                <button
                  key={p}
                  onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                  style={{
                    height: '8px',
                    width: phase === p ? '24px' : '8px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: phase === p
                      ? '#818cf8'
                      : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                        ? '#10b981'
                        : '#334155',
                    boxShadow: phase === p ? '0 0 12px rgba(129, 140, 248, 0.3)' : 'none',
                    zIndex: 10,
                  }}
                  title={phaseLabels[p]}
                />
              ))}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#818cf8' }}>{phaseLabels[phase]}</span>
          </div>
        </div>

        {/* Main content with scroll */}
        <div style={{
          position: 'relative',
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '64px',
          paddingBottom: '80px',
          fontFamily: typography.fontFamily,
          transition: 'all 0.3s ease',
        }}>
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
                Try adjusting the sliders and observe how power changes. When you increase mass, the power increases because more work is needed. This is important in real-world engineering and technology applications.
              </p>
            </div>

            {/* Visualization */}
            <StaircaseVisualization />

            {/* Sliders - Each slider with value in same parent */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
            }}>
              {/* Mass Slider */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.md,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>MASS</span>
                  <span style={{ height: '20px', ...typography.h3, color: colors.textPrimary, fontWeight: 600 }}>{personMass} kg</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={personMass}
                  onChange={(e) => setPersonMass(Number(e.target.value))}
                  style={{ touchAction: 'pan-y', width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.brand }}
                  aria-label="Mass slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>40 (Min)</span>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>120 (Max)</span>
                </div>
              </div>

              {/* Height Slider */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.md,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>HEIGHT</span>
                  <span style={{ height: '20px', ...typography.h3, color: colors.textPrimary, fontWeight: 600 }}>{stairHeight} m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={stairHeight}
                  onChange={(e) => { setStairHeight(Number(e.target.value)); resetClimb(); }}
                  style={{ touchAction: 'pan-y', width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.success }}
                  aria-label="Height slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>1 (Min)</span>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>10 (Max)</span>
                </div>
              </div>

              {/* Time Slider */}
              <div style={{
                background: colors.bgCard,
                borderRadius: radius.md,
                padding: spacing.lg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <span style={{ ...typography.caption, color: colors.textSecondary }}>TIME</span>
                  <span style={{ height: '20px', ...typography.h3, color: colors.textPrimary, fontWeight: 600 }}>{climbTime} s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={climbTime}
                  onChange={(e) => { setClimbTime(Number(e.target.value)); resetClimb(); }}
                  style={{ touchAction: 'pan-y', width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.power }}
                  aria-label="Time slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>2 (Min)</span>
                  <span style={{ ...typography.caption, color: colors.textTertiary }}>20 (Max)</span>
                </div>
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
                  zIndex: 10,
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
                  zIndex: 10,
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
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>P</span>
                <span>=</span>
                <span style={{ color: colors.work }}>Work</span>
                <span>/</span>
                <span style={{ color: colors.textSecondary }}>Time</span>
                <span>=</span>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>m</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>g</span>
                <span style={{ color: '#8b5cf6', fontWeight: 700 }}>h</span>
                <span>/</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>t</span>
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
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 'review') {
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
                {userWasClose ? 'Great Estimate! Your prediction was correct!' : 'The Answer Might Surprise You!'}
              </h2>
              <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm }}>
                As you observed in the experiment, the result shows that your prediction {userWasClose ? 'matched' : 'differed from'} the actual power output.
              </p>
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
  if (phase === 'twist_predict') {
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

            {/* Static Graphic - Person with backpack on stairs */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              border: `1px solid ${colors.border}`,
            }}>
              <svg viewBox="0 0 400 250" width="100%" style={{ display: 'block', background: '#030712', borderRadius: radius.md }}>
                <defs>
                  <linearGradient id="twPredStairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>
                  <linearGradient id="twPredPersonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="0" y1="60" x2="400" y2="60" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0" y1="180" x2="400" y2="180" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                {/* Ground */}
                <rect x="0" y="210" width="400" height="40" fill="#1f2937" />
                {/* Stairs */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <rect key={i} x={80 + i * 30} y={210 - (i + 1) * 28} width="33" height="28" fill="url(#twPredStairGrad)" stroke="#4b5563" strokeWidth="0.5" />
                ))}
                {/* Person with backpack at bottom */}
                <circle cx="95" cy="150" r="10" fill="url(#twPredPersonGrad)" />
                <rect x="87" y="160" width="16" height="22" fill="url(#twPredPersonGrad)" rx="3" />
                {/* Backpack */}
                <rect x="103" y="158" width="12" height="18" fill="#f59e0b" rx="2" opacity="0.8" />
                {/* Weight arrows */}
                <path d="M95 190 L95 230" stroke="#ef4444" strokeWidth="2" />
                <path d="M90 225 L95 235 L100 225" fill="#ef4444" />
                {/* Power curve showing relationship - spans significant vertical space */}
                <path d="M250 200 L270 180 L290 150 L310 110 L330 60 L350 20" stroke="#f59e0b" strokeWidth="3" fill="none" />
                {/* Axes */}
                <line x1="245" y1="20" x2="245" y2="200" stroke="#64748b" strokeWidth="1.5" />
                <line x1="245" y1="200" x2="360" y2="200" stroke="#64748b" strokeWidth="1.5" />
                {/* Interactive marker */}
                <circle cx="310" cy="110" r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                {/* Labels */}
                <text x="300" y="218" fill="#64748b" fontSize="10" textAnchor="middle">Mass (kg)</text>
                <text x="232" y="110" fill="#64748b" fontSize="10" textAnchor="end" transform="rotate(-90, 232, 110)">Power (W)</text>
                <text x="95" y="245" fill="#a5b4fc" fontSize="11" textAnchor="middle">70kg + pack</text>
                <text x="310" y="45" fill="#f59e0b" fontSize="12" fontWeight="700" textAnchor="middle">P = mgh/t</text>
              </svg>
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
                    transition: 'all 0.2s ease',
                    fontFamily: typography.fontFamily,
                    zIndex: 10,
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
  if (phase === 'twist_play') {
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
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', cursor: 'pointer', accentColor: colors.warning }}
                aria-label="Backpack weight slider"
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: spacing.sm,
              }}>
                <span style={{ ...typography.caption, color: colors.textTertiary }}>0 (Min)</span>
                <span style={{ ...typography.caption, color: colors.textTertiary }}>70 (Max)</span>
              </div>
            </div>

            {/* Interactive SVG - Power vs Mass chart */}
            <div style={{
              background: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              border: `1px solid ${colors.border}`,
            }}>
              <svg viewBox="0 0 400 250" width="100%" style={{ display: 'block', background: '#030712', borderRadius: radius.md }}>
                <defs>
                  <linearGradient id="twPlayPowerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#1e40af" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="50" y1="30" x2="380" y2="30" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="50" y1="70" x2="380" y2="70" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="50" y1="110" x2="380" y2="110" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="50" y1="150" x2="380" y2="150" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1="50" y1="190" x2="380" y2="190" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                {/* Axes */}
                <line x1="50" y1="20" x2="50" y2="210" stroke="#64748b" strokeWidth="1.5" />
                <line x1="50" y1="210" x2="380" y2="210" stroke="#64748b" strokeWidth="1.5" />
                {/* Power line - linear relationship from 0kg to 70kg backpack */}
                {(() => {
                  const basePw = (personMass * 10 * stairHeight) / climbTime;
                  const maxPw = ((personMass + 70) * 10 * stairHeight) / climbTime;
                  const scale = 180 / Math.max(maxPw, 1);
                  return (
                    <path
                      d={`M50 ${210 - basePw * scale} ${Array.from({length: 14}, (_, i) => {
                        const bw = i * 5;
                        const tm = personMass + bw;
                        const pw = (tm * 10 * stairHeight) / climbTime;
                        const x = 50 + (bw / 70) * 330;
                        const y = Math.max(20, 210 - pw * scale);
                        return `L${x} ${y}`;
                      }).join(' ')}`}
                      stroke="url(#twPlayPowerGrad)"
                      strokeWidth="3"
                      fill="none"
                    />
                  );
                })()}
                {/* Interactive marker - moves with backpack weight */}
                {(() => {
                  const maxPw2 = ((personMass + 70) * 10 * stairHeight) / climbTime;
                  const sc2 = 180 / Math.max(maxPw2, 1);
                  const markerY = Math.max(20, 210 - currentPower * sc2);
                  return (
                    <>
                      <circle
                        cx={50 + (backpackWeight / 70) * 330}
                        cy={markerY}
                        r="8"
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <text
                        x={Math.min(360, 50 + (backpackWeight / 70) * 330)}
                        y={Math.max(35, markerY - 15)}
                        fill="#f59e0b"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {currentPower.toFixed(0)}W
                      </text>
                    </>
                  );
                })()}
                {/* Axis labels */}
                <text x="215" y="238" fill="#64748b" fontSize="11" textAnchor="middle">Backpack Weight (kg)</text>
                <text x="18" y="115" fill="#64748b" fontSize="11" textAnchor="middle" transform="rotate(-90, 18, 115)">Power (W)</text>
                {/* Formula */}
                <text x="300" y="50" fill="#94a3b8" fontSize="11" textAnchor="middle">P = mgh/t</text>
                {/* Base reference line */}
                {(() => {
                  const maxPw3 = ((personMass + 70) * 10 * stairHeight) / climbTime;
                  const sc3 = 180 / Math.max(maxPw3, 1);
                  const baseY = 210 - basePower * sc3;
                  return (
                    <>
                      <line x1="50" y1={baseY} x2="330" y2={baseY} stroke="#6366f1" strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
                      <text x="335" y={baseY + 4} fill="#8b8cf8" fontSize="10" textAnchor="start">reference {basePower}W</text>
                    </>
                  );
                })()}
              </svg>
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
  if (phase === 'twist_review') {
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
  if (phase === 'transfer') {
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
                onClick={() => {
                  if (!isUnlocked) return;
                  setActiveApp(i);
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
                  transition: 'all 0.2s ease',
                  zIndex: 10,
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
              marginBottom: spacing.lg,
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

            {/* Power formula reminder */}
            <div style={{
              padding: spacing.lg,
              background: colors.bgElevated,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.xl,
              textAlign: 'center',
            }}>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                Remember the formula: Power P = Work / Time = Force × Velocity. This fundamental relationship between work and power applies directly to {app.title.toLowerCase()}. Understanding this helps engineers design more efficient systems and solve real-world engineering challenges in this domain. The concepts you learned in the experiment phase are used daily by professionals working with {app.subtitle.toLowerCase()}.
              </p>
            </div>

            {/* Next Application Button */}
            <div style={{ marginBottom: spacing.lg }}>
              {!completedApps.has(activeApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    if (activeApp < applications.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
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
                    zIndex: 10,
                  }}
                >
                  {activeApp < applications.length - 1 ? `Next Application →` : `✓ Complete "${app.title}"`}
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
          {renderButton('Continue to Knowledge Test →', () => goToPhase('test'), 'primary')}
        </div>
      </div>
      </PremiumWrapper>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 'test') {
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
                {passed ? 'Excellent Work!' : 'Good Job - Keep Learning!'}
              </h2>
              <p style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }}>
                You scored {totalCorrect} out of 10 on this knowledge test.
              </p>
              <div style={{ ...typography.hero, fontSize: 56, color: passed ? colors.success : colors.warning, marginBottom: spacing.md }}>
                {totalCorrect}/10
              </div>
              <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
                {passed ? 'You\'ve mastered work and power!' : 'Review the concepts and try again to continue to mastery.'}
              </p>
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center' }}>
                {renderButton('Replay Quiz', () => { setTestIndex(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); }, 'secondary')}
                {renderButton(passed ? 'Continue to Mastery →' : 'Continue to Mastery →', () => goNext(), 'success', { size: 'lg' })}
              </div>
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
            {/* Quiz intro context */}
            <p style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md }}>
              Apply the work and power formulas you learned to solve these real-world scenario questions. Remember: Power equals Work divided by Time, and Work equals Force times Distance. Each question tests a different application of these fundamental physics principles.
            </p>

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
                      transition: 'all 0.2s ease',
                      fontFamily: typography.fontFamily,
                      zIndex: 10,
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
              {testIndex > 0 ? renderButton('Back', () => setTestIndex(testIndex - 1), 'ghost') : <div />}
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
  if (phase === 'mastery') {
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

  // Fallback - invalid phase defaults to hook
  return <PremiumWrapper>{renderHook()}</PremiumWrapper>;
}
