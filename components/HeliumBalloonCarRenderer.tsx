'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// HELIUM BALLOON CAR RENDERER - PREMIUM PHYSICS GAME
// Acceleration Fields & Buoyancy: Why helium balloons move forward in cars
// ============================================================================
// Physics: In accelerating car, helium balloon moves FORWARD!
// Air is denser than helium -> pushed backward by inertia
// Creates pressure gradient -> balloon "rises" toward lower pressure
// Demonstrates equivalence principle: acceleration = gravity field

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist',
  'twist_play': 'Twist Lab',
  'twist_review': 'Insight',
  'transfer': 'Apply',
  'test': 'Test',
  'mastery': 'Mastery'
};

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

interface HeliumBalloonCarRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase?: string) => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ============================================================================
// REAL-WORLD APPLICATIONS DATA
// ============================================================================
const applications = [
  {
    id: 'weather_balloons',
    icon: '🎈',
    title: 'Weather Balloons',
    subtitle: 'Meteorology',
    color: '#06B6D4',
    description: 'Weather balloons (radiosondes) exploit the same buoyancy physics demonstrated by helium balloons in cars. Filled with helium or hydrogen, these balloons rise through the atmosphere at controlled rates.',
    physics: 'Weather balloons demonstrate buoyancy in a compressible fluid. As the balloon ascends, atmospheric pressure decreases, causing expansion. The same pressure gradient physics that pushes a helium balloon forward in an accelerating car causes weather balloons to rise.',
    insight: 'Over 900 weather balloons are launched globally twice daily, reaching altitudes of 35 km before bursting.',
    stats: [
      { value: '35 km', label: 'Max Altitude' },
      { value: '900+', label: 'Daily Launches' },
      { value: '2 hrs', label: 'Flight Duration' },
    ],
  },
  {
    id: 'airships',
    icon: '🚁',
    title: 'Airships & Blimps',
    subtitle: 'Lighter-than-Air Flight',
    color: '#8B5CF6',
    description: 'Modern airships leverage helium buoyancy for extended loiter times that fixed-wing aircraft cannot match. Ballonets adjust buoyancy by changing the helium-to-air ratio.',
    physics: 'Airships demonstrate controlled buoyancy in air. The same physics that makes a helium balloon lean forward in an accelerating car allows airships to achieve stable hovering without thrust.',
    insight: 'Electric-powered airships promise zero-emission cargo transport for remote regions without runway infrastructure.',
    stats: [
      { value: '24+ hrs', label: 'Endurance' },
      { value: '3,000 m', label: 'Altitude' },
      { value: '75 mph', label: 'Speed' },
    ],
  },
  {
    id: 'accelerometers',
    icon: '📱',
    title: 'Accelerometer Physics',
    subtitle: 'Inertial Sensors',
    color: '#F59E0B',
    description: 'Accelerometers in smartphones detect acceleration using the same physics as the helium balloon. MEMS accelerometers use proof masses that respond to effective gravity fields.',
    physics: 'The helium balloon demonstrates Einstein\'s equivalence principle: acceleration is indistinguishable from gravity. Accelerometers exploit this by measuring how proof masses respond to effective gravity fields.',
    insight: 'Your smartphone contains accelerometers that can detect orientation, count steps, and trigger airbags in milliseconds.',
    stats: [
      { value: '0.001 g', label: 'Resolution' },
      { value: '10,000 g', label: 'Shock Survival' },
      { value: '< $1', label: 'Sensor Cost' },
    ],
  },
  {
    id: 'centrifuges',
    icon: '🔬',
    title: 'Centrifuge Separation',
    subtitle: 'Laboratory Science',
    color: '#10B981',
    description: 'Centrifuges create artificial gravity fields through rotation, separating substances by density. Blood components, DNA, and chemical mixtures separate because denser materials move outward.',
    physics: 'In a centrifuge, the rotational acceleration creates a radial pressure gradient. Just like a helium balloon moves forward in an accelerating car, less dense components move toward the center of rotation.',
    insight: 'Medical centrifuges can generate forces up to 100,000 times gravity, enabling molecular-level separation.',
    stats: [
      { value: '100,000 g', label: 'Max Force' },
      { value: '15 min', label: 'Blood Separation' },
      { value: '99.9%', label: 'Purity' },
    ],
  },
];

// ============================================================================
// TEST QUESTIONS (10 questions)
// ============================================================================
const testQuestions = [
  {
    question: 'When a car accelerates forward, which way does a helium balloon move?',
    options: [
      { text: 'Backward (like everything else)', correct: false },
      { text: 'Forward (opposite to everything else)', correct: true },
      { text: 'Stays perfectly still', correct: false },
      { text: 'Moves side to side', correct: false },
    ],
    explanation: 'The balloon moves forward because helium is less dense than air. Air is pushed backward, creating a pressure gradient that pushes the balloon forward.',
  },
  {
    question: 'Why does the helium balloon behave opposite to a heavy pendulum?',
    options: [
      { text: 'Helium is magnetic', correct: false },
      { text: 'The string is different', correct: false },
      { text: 'Helium is less dense than surrounding air', correct: true },
      { text: 'The balloon has more surface area', correct: false },
    ],
    explanation: 'Helium\'s low density (0.18 kg/m3) compared to air (1.2 kg/m3) causes it to respond opposite to dense objects.',
  },
  {
    question: 'What creates the forward force on the balloon during acceleration?',
    options: [
      { text: 'Wind from outside', correct: false },
      { text: 'Air pressure gradient inside the car', correct: true },
      { text: 'Static electricity', correct: false },
      { text: 'The car\'s heating system', correct: false },
    ],
    explanation: 'Acceleration creates a pressure gradient with high pressure at the back and low pressure at the front. The balloon moves toward the low pressure region.',
  },
  {
    question: 'What physics principle explains why acceleration affects objects like gravity?',
    options: [
      { text: 'Newton\'s First Law', correct: false },
      { text: 'Conservation of Energy', correct: false },
      { text: 'Einstein\'s Equivalence Principle', correct: true },
      { text: 'Hooke\'s Law', correct: false },
    ],
    explanation: 'Einstein\'s Equivalence Principle states that acceleration is locally indistinguishable from gravity.',
  },
  {
    question: 'What happens to the balloon when the car brakes (decelerates)?',
    options: [
      { text: 'Moves forward even faster', correct: false },
      { text: 'Moves backward', correct: true },
      { text: 'Stays perfectly still', correct: false },
      { text: 'Pops from pressure', correct: false },
    ],
    explanation: 'During braking, the pressure gradient reverses. High pressure at front, low at back, so the balloon tilts backward.',
  },
  {
    question: 'In the car\'s reference frame, what pseudo-force do objects experience during forward acceleration?',
    options: [
      { text: 'A forward force', correct: false },
      { text: 'A backward force', correct: true },
      { text: 'An upward force', correct: false },
      { text: 'No force', correct: false },
    ],
    explanation: 'In the accelerating reference frame, objects experience a pseudo-force opposite to the acceleration direction.',
  },
  {
    question: 'If you put a bubble in a bottle of water and accelerate forward, which way does the bubble go?',
    options: [
      { text: 'Backward (with inertia)', correct: false },
      { text: 'Forward (like the helium balloon)', correct: true },
      { text: 'Straight up', correct: false },
      { text: 'Straight down', correct: false },
    ],
    explanation: 'Air bubbles in water behave exactly like helium in air - both are less dense than their surroundings.',
  },
  {
    question: 'Why doesn\'t this balloon effect happen when the car moves at constant speed?',
    options: [
      { text: 'Air stops moving', correct: false },
      { text: 'No acceleration means no pressure gradient', correct: true },
      { text: 'The balloon pops', correct: false },
      { text: 'Friction stops it', correct: false },
    ],
    explanation: 'Constant velocity means zero acceleration. No acceleration means no pressure gradient forms inside the car.',
  },
  {
    question: 'How is the balloon in a car similar to a balloon in an elevator accelerating upward?',
    options: [
      { text: 'Both pop from pressure', correct: false },
      { text: 'Both rise relative to the floor', correct: false },
      { text: 'Both experience enhanced effective gravity making balloon rise more', correct: true },
      { text: 'They behave completely differently', correct: false },
    ],
    explanation: 'Both situations create an enhanced effective gravity field, increasing the buoyant force on the balloon.',
  },
  {
    question: 'What would happen to the helium balloon in a car turning left?',
    options: [
      { text: 'Moves left (into the turn)', correct: true },
      { text: 'Moves right (away from turn)', correct: false },
      { text: 'Stays centered', correct: false },
      { text: 'Moves backward', correct: false },
    ],
    explanation: 'During a left turn, the centripetal acceleration points left. The balloon moves toward the center of the turn (left).',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function HeliumBalloonCarRenderer({
  onComplete,
  onGameEvent,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: HeliumBalloonCarRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Simulation state
  const [carState, setCarState] = useState<'stopped' | 'accelerating' | 'braking' | 'constant'>('stopped');
  const [balloonAngle, setBalloonAngle] = useState(0);
  const [pendulumAngle, setPendulumAngle] = useState(0);
  const [hasAccelerated, setHasAccelerated] = useState(false);
  const [carAcceleration, setCarAcceleration] = useState(5);
  const [balloonBuoyancy, setBalloonBuoyancy] = useState(0.8);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [showPressureGradient, setShowPressureGradient] = useState(true);

  // Twist state
  const [twistCarState, setTwistCarState] = useState<'stopped' | 'accelerating'>('stopped');
  const [twistBalloonAngle, setTwistBalloonAngle] = useState(0);
  const [twistPendulumAngle, setTwistPendulumAngle] = useState(0);
  const [twistMode, setTwistMode] = useState<'accelerate' | 'brake' | 'turn_left' | 'turn_right'>('accelerate');

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const navigationLockRef = useRef(false);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================================
  // DESIGN SYSTEM
  // ============================================================================
  const colors = {
    primary: '#a855f7',       // purple-500
    primaryDark: '#9333ea',   // purple-600
    accent: '#3b82f6',        // blue-500
    secondary: '#06b6d4',     // cyan-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#e2e8f0', // slate-200 (accessible contrast)
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    balloon: '#a855f7',
    pendulum: '#ef4444',
  };

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

  // ============================================================================
  // SOUND SYSTEM
  // ============================================================================
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
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

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [phase, playSound, onPhaseComplete, emitEvent]);

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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================================================
  // SIMULATION FUNCTIONS
  // ============================================================================
  const accelerateCar = useCallback(() => {
    if (carState !== 'stopped') return;
    setCarState('accelerating');
    setHasAccelerated(true);
    playSound('transition');

    let angle = 0;
    const maxAngle = Math.min(carAcceleration * balloonBuoyancy * 3, 45);
    const angleIncrement = (carAcceleration / 5) * 1.5;

    const animate = () => {
      angle = Math.min(angle + angleIncrement, maxAngle);
      setBalloonAngle(angle);
      setPendulumAngle(-angle / balloonBuoyancy);

      if (angle < maxAngle) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setCarState('constant');
          let returnAngle = angle;
          const returnAnimate = () => {
            returnAngle *= 0.9;
            setBalloonAngle(returnAngle);
            setPendulumAngle(-returnAngle / balloonBuoyancy);
            if (Math.abs(returnAngle) > 0.5) {
              animationRef.current = requestAnimationFrame(returnAnimate);
            } else {
              setBalloonAngle(0);
              setPendulumAngle(0);
            }
          };
          animationRef.current = requestAnimationFrame(returnAnimate);
        }, 500);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [carState, carAcceleration, balloonBuoyancy, playSound]);

  const brakeCar = useCallback(() => {
    if (carState !== 'constant') return;
    setCarState('braking');
    playSound('click');

    let angle = 0;
    const maxAngle = Math.min(carAcceleration * balloonBuoyancy * 2.5, 35);
    const angleIncrement = (carAcceleration / 5) * 1.5;

    const animate = () => {
      angle = Math.min(angle + angleIncrement, maxAngle);
      setBalloonAngle(-angle);
      setPendulumAngle(angle / balloonBuoyancy);

      if (angle < maxAngle) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setCarState('stopped');
          let returnAngle = angle;
          const returnAnimate = () => {
            returnAngle *= 0.9;
            setBalloonAngle(-returnAngle);
            setPendulumAngle(returnAngle / balloonBuoyancy);
            if (Math.abs(returnAngle) > 0.5) {
              animationRef.current = requestAnimationFrame(returnAnimate);
            } else {
              setBalloonAngle(0);
              setPendulumAngle(0);
            }
          };
          animationRef.current = requestAnimationFrame(returnAnimate);
        }, 500);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [carState, carAcceleration, balloonBuoyancy, playSound]);

  const resetSimulation = useCallback(() => {
    setCarState('stopped');
    setBalloonAngle(0);
    setPendulumAngle(0);
    setHasAccelerated(false);
  }, []);

  const runTwistSimulation = useCallback(() => {
    if (twistCarState !== 'stopped') return;
    setTwistCarState('accelerating');
    playSound('transition');

    let angle = 0;
    const animate = () => {
      angle = Math.min(angle + 1.5, 25);

      switch (twistMode) {
        case 'accelerate':
          setTwistBalloonAngle(angle);
          setTwistPendulumAngle(-angle);
          break;
        case 'brake':
          setTwistBalloonAngle(-angle);
          setTwistPendulumAngle(angle);
          break;
        case 'turn_left':
          setTwistBalloonAngle(-angle * 0.8);
          setTwistPendulumAngle(angle * 0.8);
          break;
        case 'turn_right':
          setTwistBalloonAngle(angle * 0.8);
          setTwistPendulumAngle(-angle * 0.8);
          break;
      }

      if (angle < 25) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [twistCarState, twistMode, playSound]);

  const resetTwist = useCallback(() => {
    setTwistCarState('stopped');
    setTwistBalloonAngle(0);
    setTwistPendulumAngle(0);
  }, []);

  // ============================================================================
  // PROGRESS BAR COMPONENT
  // ============================================================================
  const renderProgressBar = (current: number, total: number, color: string = colors.primary) => (
    <div style={{
      width: '100%',
      height: '8px',
      background: colors.bgCardLight,
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${(current / total) * 100}%`,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: '4px',
        transition: 'width 0.3s ease-out',
        boxShadow: `0 0 8px ${color}40`,
      }} />
    </div>
  );

  // ============================================================================
  // NAV DOTS COMPONENT
  // ============================================================================
  const phaseAriaLabels: Record<Phase, string> = {
    'hook': 'hook',
    'predict': 'predict',
    'play': 'experiment',
    'review': 'review',
    'twist_predict': 'twist-predict',
    'twist_play': 'explore',
    'twist_review': 'insight',
    'transfer': 'real-world transfer',
    'test': 'test knowledge',
    'mastery': 'mastery',
  };

  const renderNavDots = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={phaseAriaLabels[p]}
          title={phaseAriaLabels[p]}
          style={{
            height: '8px',
            width: phase === p ? '24px' : '8px',
            borderRadius: '4px',
            background: phase === p
              ? `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`
              : phaseOrder.indexOf(phase) > i
                ? colors.success
                : colors.border,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: phase === p ? `0 0 8px ${colors.primary}40` : 'none',
          }}
        />
      ))}
    </div>
  );

  // ============================================================================
  // SVG DEFS
  // ============================================================================
  const renderSvgDefs = () => (
    <defs>
      {/* Car gradients */}
      <linearGradient id="hbcCarBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <linearGradient id="hbcCarRoof" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="hbcWindowGlass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.6" />
      </linearGradient>

      {/* Balloon gradient */}
      <radialGradient id="hbcBalloonGloss" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </radialGradient>
      <radialGradient id="hbcBalloonHighlight" cx="25%" cy="20%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* Pendulum gradient */}
      <radialGradient id="hbcWeightGradient" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </radialGradient>

      {/* Wheel gradients */}
      <radialGradient id="hbcWheelTire" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#111827" />
      </radialGradient>
      <radialGradient id="hbcWheelHub" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#d1d5db" />
        <stop offset="100%" stopColor="#6b7280" />
      </radialGradient>

      {/* Pressure gradients */}
      <linearGradient id="hbcPressureAccel" x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="hbcPressureBrake" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
      </linearGradient>

      {/* Road gradient */}
      <linearGradient id="hbcRoadSurface" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>

      {/* Glow filters */}
      <filter id="hbcGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Arrow markers */}
      <marker id="hbcArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
      </marker>
      <marker id="hbcArrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
      </marker>
    </defs>
  );

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS MYSTERY</span>
      </div>

      {/* Main title */}
      <h1 style={{ fontSize: typo.title }} className="font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent">
        The Backward Balloon
      </h1>

      <p style={{ fontSize: typo.bodyLarge }} className="text-slate-400 max-w-lg mb-4">
        What happens when a car accelerates? Everything slides backward... but does the helium balloon follow the same rule?
      </p>
      <p style={{ fontSize: '14px', color: 'rgba(148,163,184,0.7)', maxWidth: '480px', marginBottom: '32px' }}>
        Explore how buoyancy and acceleration interact to create a surprising result. Discover how Einstein's equivalence principle explains everyday phenomena.
      </p>

      {/* Visual */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl mb-10">
        <svg viewBox="0 0 400 180" style={{ width: '100%' }}>
          {renderSvgDefs()}

          {/* Road */}
          <rect x="0" y="150" width="400" height="30" fill="url(#hbcRoadSurface)" />
          <line x1="0" y1="165" x2="400" y2="165" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,15" />

          {/* Car */}
          <rect x="100" y="85" width="200" height="60" fill="url(#hbcCarBody)" rx="10" />
          <rect x="120" y="55" width="160" height="45" fill="url(#hbcCarRoof)" rx="8" />
          <rect x="130" y="62" width="60" height="32" fill="url(#hbcWindowGlass)" rx="4" />
          <rect x="200" y="62" width="70" height="32" fill="url(#hbcWindowGlass)" rx="4" />

          {/* Wheels */}
          <circle cx="150" cy="145" r="20" fill="url(#hbcWheelTire)" />
          <circle cx="150" cy="145" r="8" fill="url(#hbcWheelHub)" />
          <circle cx="250" cy="145" r="20" fill="url(#hbcWheelTire)" />
          <circle cx="250" cy="145" r="8" fill="url(#hbcWheelHub)" />

          {/* Balloon */}
          <line x1="170" y1="95" x2="160" y2="65" stroke="#d8b4fe" strokeWidth="1.5" />
          <ellipse cx="160" cy="45" rx="20" ry="22" fill="url(#hbcBalloonGloss)" filter="url(#hbcGlow)" />
          <ellipse cx="153" cy="37" rx="7" ry="8" fill="url(#hbcBalloonHighlight)" />
          <text x="160" y="50" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">He</text>

          {/* Pendulum */}
          <line x1="240" y1="75" x2="255" y2="95" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="258" cy="100" r="10" fill="url(#hbcWeightGradient)" />

          {/* Question mark */}
          <text x="160" y="18" textAnchor="middle" fill="#fbbf24" fontSize="24" fontWeight="bold">
            ?
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </text>

          {/* Arrow */}
          <path d="M 320,105 L 360,105" stroke="#22c55e" strokeWidth="4" markerEnd="url(#hbcArrowGreen)">
            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
          </path>
        </svg>

        <div className="flex justify-around mt-4">
          <span style={{ fontSize: typo.small, color: colors.balloon, fontWeight: 600 }}>Balloon</span>
          <span style={{ fontSize: typo.small, color: colors.pendulum, fontWeight: 600 }}>Weight</span>
        </div>
        <p style={{ fontSize: typo.body, color: colors.success, fontWeight: 600, marginTop: '8px' }}>
          ACCELERATE
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => goToPhase('predict')}
        className="group relative px-10 py-5 text-white text-lg font-semibold rounded-2xl"
        style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderRadius: '16px', transition: 'all 0.3s ease-out', fontWeight: 600 }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Start — Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  const renderPredict = () => {
    const predictions = [
      { id: 0, label: 'Backward (like a hanging pendulum)', icon: '⬅️', description: 'Inertia pushes it back' },
      { id: 1, label: 'Forward (opposite to a pendulum)', icon: '➡️', description: 'Something different happens' },
      { id: 2, label: 'Stays straight up', icon: '⬆️', description: 'Unaffected by acceleration' },
    ];

    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-xl w-full">
          {/* Header */}
          <div className="text-center mb-8" style={{ marginBottom: '16px' }}>
            <span className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-2 block">
              YOUR PREDICTION
            </span>
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">
              Which way does the balloon tilt?
            </h2>
            <p style={{ color: '#e2e8f0' }}>
              When the car accelerates <strong className="text-emerald-400">forward</strong>, what happens to the helium balloon?
            </p>
          </div>

          {/* Static Preview Image */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6" style={{ marginBottom: '16px' }}>
            <svg viewBox="0 0 400 140" style={{ width: '100%' }}>
              {renderSvgDefs()}
              {/* Road */}
              <rect x="0" y="110" width="400" height="30" fill="url(#hbcRoadSurface)" />
              <line x1="0" y1="125" x2="400" y2="125" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,15" />
              {/* Car */}
              <rect x="100" y="55" width="180" height="50" fill="url(#hbcCarBody)" rx="10" />
              <rect x="115" y="25" width="145" height="40" fill="url(#hbcCarRoof)" rx="8" />
              <rect x="125" y="32" width="55" height="28" fill="url(#hbcWindowGlass)" rx="4" />
              <rect x="190" y="32" width="60" height="28" fill="url(#hbcWindowGlass)" rx="4" />
              {/* Wheels */}
              <circle cx="140" cy="105" r="16" fill="url(#hbcWheelTire)" />
              <circle cx="140" cy="105" r="6" fill="url(#hbcWheelHub)" />
              <circle cx="240" cy="105" r="16" fill="url(#hbcWheelTire)" />
              <circle cx="240" cy="105" r="6" fill="url(#hbcWheelHub)" />
              {/* Balloon - static at center */}
              <line x1="165" y1="55" x2="165" y2="30" stroke="#d8b4fe" strokeWidth="1.5" />
              <ellipse cx="165" cy="15" rx="14" ry="16" fill="url(#hbcBalloonGloss)" />
              <text x="165" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">He</text>
              {/* Question marks */}
              <text x="130" y="15" fill="#fbbf24" fontSize="16" fontWeight="bold">?</text>
              <text x="200" y="15" fill="#fbbf24" fontSize="16" fontWeight="bold">?</text>
              {/* Acceleration arrow */}
              <path d="M 300,60 L 340,60" stroke="#22c55e" strokeWidth="3" markerEnd="url(#hbcArrowGreen)" />
              <text x="320" y="80" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">ACCEL</text>
            </svg>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPrediction(p.id);
                  playSound('click');
                }}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  prediction === p.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <div className={`font-semibold ${prediction === p.id ? 'text-purple-400' : 'text-white'}`}>
                    {p.label}
                  </div>
                  <div className="text-sm text-slate-400">{p.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (prediction !== null) {
                  emitEvent('prediction_made', { prediction });
                  goToPhase('play');
                }
              }}
              disabled={prediction === null}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                prediction !== null
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Test It!
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: PLAY
  // ============================================================================
  const renderPlay = () => {
    const pressureIntensity = (carState === 'accelerating' || carState === 'braking') ? 0.8 : 0;

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-2xl w-full" style={{ padding: '16px', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-2 block">
              SIMULATION LAB
            </span>
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-1">
              Balloon vs Pendulum
            </h2>
            <p style={{ color: '#e2e8f0' }}>
              Watch how they behave differently during acceleration
            </p>
          </div>

          {/* Real-world relevance */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
            <p className="font-semibold text-purple-400 mb-1">Real-World Connection</p>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              This same physics explains why helium balloons in cars move forward when accelerating, how weather balloons rise through the atmosphere, and how accelerometers in your smartphone detect motion.
            </p>
          </div>

          {/* Controls */}
          <div className={`grid gap-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50" style={{ width: '100%' }}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold text-emerald-400">Acceleration (inertial force)</span>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.7)', marginBottom: '4px', lineHeight: '1.5' }}>
                When you increase acceleration, it causes a stronger pressure gradient, which results in bigger balloon tilt
              </p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">1 m/s²</span>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={carAcceleration}
                  onChange={(e) => setCarAcceleration(Number(e.target.value))}
                  style={{ flex: 1, width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <span className="text-xs text-slate-400">15 m/s²</span>
                <span className="text-sm font-bold text-white ml-1">{carAcceleration.toFixed(1)} m/s²</span>
              </div>
              <p style={{ fontSize: '11px', color: '#3b82f6' }}>
                {carAcceleration <= 4 ? '💡 Observe: gentle acceleration — slight tilt effect' : carAcceleration <= 9 ? '🔍 Notice: moderate acceleration — noticeable pressure gradient forms' : '🎯 Key insight: strong acceleration — dramatic tilt shows equivalence principle!'}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50" style={{ width: '100%' }}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold text-purple-400">Buoyancy (density ratio)</span>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.7)', marginBottom: '4px', lineHeight: '1.5' }}>
                Higher buoyancy ratio leads to a lighter gas, which means more responsive to the pressure gradient
              </p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">0.2x</span>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={balloonBuoyancy}
                  onChange={(e) => setBalloonBuoyancy(Number(e.target.value))}
                  style={{ flex: 1, width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <span className="text-xs text-slate-400">2.0x</span>
                <span className="text-sm font-bold text-white ml-1">{balloonBuoyancy.toFixed(1)}x</span>
              </div>
              <p style={{ fontSize: '11px', color: '#3b82f6' }}>
                {balloonBuoyancy <= 0.6 ? '💡 Observe: low buoyancy — nearly neutrally buoyant' : balloonBuoyancy <= 1.2 ? '🔍 Notice: moderate buoyancy — like helium in air' : '🎯 Key insight: high buoyancy — very responsive to acceleration!'}
              </p>
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="flex gap-3 justify-center mb-4 flex-wrap">
            <button
              onClick={() => setShowForceVectors(!showForceVectors)}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                showForceVectors
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700'
              }`}
            >
              {showForceVectors ? '🔛 ' : '🔲 '}Force Vectors
            </button>
            <button
              onClick={() => setShowPressureGradient(!showPressureGradient)}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                showPressureGradient
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700'
              }`}
            >
              {showPressureGradient ? '🔛 ' : '🔲 '}Pressure Gradient
            </button>
          </div>

          {/* Visualization */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-4" style={{ borderRadius: '12px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', transition: 'all 0.3s ease-out' }}>
            <h3 className="text-sm font-semibold text-white mb-2 text-center" style={{ fontWeight: 700 }}>Acceleration Buoyancy Visualization</h3>
            <svg viewBox="0 0 450 250" style={{ width: '100%' }}>
              {renderSvgDefs()}

              {/* Grid lines */}
              <g opacity="0.15">
                {[0, 50, 100, 150, 200].map(y => (
                  <line key={`grid-h-${y}`} x1="0" y1={y} x2="450" y2={y} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {[0, 75, 150, 225, 300, 375, 450].map(x => (
                  <line key={`grid-v-${x}`} x1={x} y1="0" x2={x} y2="250" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
              </g>

              {/* Baseline / Reference marker */}
              <line x1="30" y1="140" x2="270" y2="140" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <text x="32" y="137" fill="#fbbf24" fontSize="11" fontWeight="600">Baseline</text>

              {/* Y-axis label at very top */}
              <text x="32" y="4" fill="#e2e8f0" fontSize="11" fontWeight="600">Height (m)</text>
              <line x1="30" y1="7" x2="30" y2="205" stroke="#e2e8f0" strokeWidth="1.5" />
              {/* Y-axis tick marks */}
              <line x1="27" y1="55" x2="33" y2="55" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="27" y1="95" x2="33" y2="95" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="27" y1="135" x2="33" y2="135" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="27" y1="175" x2="33" y2="175" stroke="#e2e8f0" strokeWidth="1" />

              {/* X-axis */}
              <line x1="30" y1="205" x2="280" y2="205" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="240" y="218" fill="#e2e8f0" fontSize="11" fontWeight="600">Position</text>
              {/* X-axis tick marks */}
              <line x1="75" y1="197" x2="75" y2="203" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="150" y1="197" x2="150" y2="203" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="225" y1="197" x2="225" y2="203" stroke="#e2e8f0" strokeWidth="1" />

              {/* Road */}
              <rect x="0" y="210" width="450" height="40" fill="url(#hbcRoadSurface)" />
              <line x1="0" y1="230" x2="450" y2="230" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,15" />

              {/* Car body */}
              <rect x="75" y="130" width="200" height="70" fill="url(#hbcCarBody)" rx="12" />
              <rect x="95" y="95" width="160" height="50" fill="url(#hbcCarRoof)" rx="10" />

              {/* Windows */}
              <rect x="105" y="102" width="60" height="38" fill="url(#hbcWindowGlass)" rx="5" />
              <rect x="175" y="102" width="70" height="38" fill="url(#hbcWindowGlass)" rx="5" />

              {/* Pressure gradient overlay */}
              {showPressureGradient && (carState === 'accelerating' || carState === 'braking') && (
                <rect
                  x="100" y="97"
                  width="150" height="48"
                  fill={carState === 'accelerating' ? 'url(#hbcPressureAccel)' : 'url(#hbcPressureBrake)'}
                  rx="5"
                >
                  <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Balloon with tilt */}
              <g transform={`rotate(${balloonAngle}, 145, 140)`}>
                <line x1="145" y1="140" x2="145" y2="100" stroke="#d8b4fe" strokeWidth="1.5" />
                <ellipse cx="145" cy="80" rx="18" ry="22" fill="url(#hbcBalloonGloss)" filter="url(#hbcGlow)">
                  {(carState === 'accelerating' || carState === 'braking') && (
                    <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite" />
                  )}
                </ellipse>
                <ellipse cx="139" cy="72" rx="6" ry="8" fill="url(#hbcBalloonHighlight)" />
                <text x="145" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">He</text>

                {/* Force vector */}
                {showForceVectors && (carState === 'accelerating' || carState === 'braking') && (
                  <line
                    x1="145" y1="80"
                    x2={145 + (carState === 'accelerating' ? 35 : -35)} y2="80"
                    stroke={carState === 'accelerating' ? '#22c55e' : '#ef4444'}
                    strokeWidth="3"
                    markerEnd={carState === 'accelerating' ? 'url(#hbcArrowGreen)' : 'url(#hbcArrowRed)'}
                  />
                )}
              </g>

              {/* Pendulum with tilt */}
              <g transform={`rotate(${pendulumAngle}, 210, 100)`}>
                <line x1="210" y1="100" x2="210" y2="135" stroke="#94a3b8" strokeWidth="2.5" />
                <circle cx="210" cy="145" r="12" fill="url(#hbcWeightGradient)" />

                {/* Force vector */}
                {showForceVectors && (carState === 'accelerating' || carState === 'braking') && (
                  <line
                    x1="210" y1="145"
                    x2={210 + (carState === 'accelerating' ? -30 : 30)} y2="145"
                    stroke={carState === 'accelerating' ? '#ef4444' : '#22c55e'}
                    strokeWidth="3"
                    markerEnd={carState === 'accelerating' ? 'url(#hbcArrowRed)' : 'url(#hbcArrowGreen)'}
                  />
                )}
              </g>

              {/* Wheels */}
              <circle cx="125" cy="200" r="20" fill="url(#hbcWheelTire)" />
              <circle cx="125" cy="200" r="8" fill="url(#hbcWheelHub)" />
              <circle cx="225" cy="200" r="20" fill="url(#hbcWheelTire)" />
              <circle cx="225" cy="200" r="8" fill="url(#hbcWheelHub)" />

              {/* Direction arrow */}
              {carState === 'accelerating' && (
                <path d="M 290,140 L 330,140" stroke="#22c55e" strokeWidth="4" markerEnd="url(#hbcArrowGreen)" filter="url(#hbcGlow)">
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                </path>
              )}
              {carState === 'braking' && (
                <path d="M 75,140 L 35,140" stroke="#ef4444" strokeWidth="4" markerEnd="url(#hbcArrowRed)" filter="url(#hbcGlow)">
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                </path>
              )}

              {/* Info box - y-offset 80 so raw text y values (50-130) don't conflict with axis labels (y=20) */}
              <g transform="translate(295, 50)">
                <rect x="0" y="0" width="145" height="110" fill="rgba(15, 23, 42, 0.9)" rx="8" stroke="#334155" />
                <text x="10" y="18" fill="#e2e8f0" fontSize="11" fontWeight="bold">Live Physics</text>
                <text x="10" y="36" fill="#94a3b8" fontSize="11">Accel: {carAcceleration.toFixed(1)} m/s²</text>
                <text x="10" y="54" fill="#a855f7" fontSize="11">Buoy: {balloonBuoyancy.toFixed(1)}x</text>
                <text x="10" y="72" fill="#22c55e" fontSize="11">Balloon: {balloonAngle > 0 ? '+' : ''}{balloonAngle.toFixed(0)}°</text>
                <text x="10" y="90" fill="#ef4444" fontSize="11">Weight: {pendulumAngle > 0 ? '+' : ''}{pendulumAngle.toFixed(0)}°</text>
              </g>
            </svg>
            {/* Formula display */}
            <div className="mt-2 text-center bg-slate-900/60 rounded-lg p-2">
              <span className="text-xs font-mono text-purple-400">F_buoyant = ρ_air × V × a × (1 - ρ_He/ρ_air)</span>
            </div>
          </div>

          {/* Labels */}
          <div className="flex justify-around mb-4">
            <span style={{ fontSize: typo.small, color: colors.balloon, fontWeight: 600 }}>
              Balloon: {balloonAngle > 0 ? 'FORWARD' : balloonAngle < 0 ? 'BACKWARD' : 'NEUTRAL'}
            </span>
            <span style={{ fontSize: typo.small, color: colors.pendulum, fontWeight: 600 }}>
              Weight: {pendulumAngle > 0 ? 'FORWARD' : pendulumAngle < 0 ? 'BACKWARD' : 'NEUTRAL'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center mb-4 flex-wrap">
            <button
              onClick={accelerateCar}
              disabled={carState !== 'stopped'}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                carState !== 'stopped'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-400'
              }`}
            >
              Accelerate
            </button>
            {carState === 'constant' && (
              <button
                onClick={brakeCar}
                style={{ zIndex: 10, minHeight: '44px' }}
                className="px-8 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-400 transition-all"
              >
                Brake
              </button>
            )}
            {carState === 'stopped' && hasAccelerated && (
              <button
                onClick={resetSimulation}
                style={{ zIndex: 10, minHeight: '44px' }}
                className="px-8 py-3 rounded-xl font-semibold bg-slate-600 text-white hover:bg-slate-500 transition-all"
              >
                Reset
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (prediction === 1) {
                  onCorrectAnswer?.();
                } else {
                  onIncorrectAnswer?.();
                }
                goNext();
              }}
              disabled={!hasAccelerated}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                hasAccelerated
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              See Why This Happens
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  const renderReview = () => {
    const userWasRight = prediction === 1;
    const predictionLabels = ['backward', 'forward', 'stays still'];
    const userPredictionText = prediction !== null ? predictionLabels[prediction] : 'unknown';

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{userWasRight ? 'Correct!' : 'Surprising!'}</div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-purple-400'}`}>
              {userWasRight ? 'You predicted correctly!' : 'The balloon moves FORWARD!'}
            </h2>
            <p style={{ color: '#e2e8f0' }}>
              You predicted the balloon would move <strong className="text-purple-400">{userPredictionText}</strong>.
              {userWasRight ? ' Great intuition!' : ' The actual behavior surprised many people!'}
            </p>
          </div>

          {/* Core Concept */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">The Physics: Buoyancy in Acceleration</h3>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center mb-4">
              <p className="text-xl font-bold text-purple-400 mb-1">Pressure Gradient Effect</p>
              <p className="text-lg font-mono text-slate-300">
                High Pressure (back) - Low Pressure (front)
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="font-semibold text-blue-400 mb-1">1. Car accelerates forward</div>
                <div className="text-sm text-slate-300">Newton&apos;s laws apply to everything inside</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="font-semibold text-purple-400 mb-1">2. Air (denser) has inertia</div>
                <div className="text-sm text-slate-300">Air molecules get pushed toward the back of the car</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="font-semibold text-emerald-400 mb-1">3. Pressure gradient forms</div>
                <div className="text-sm text-slate-300">Higher pressure at back, lower at front</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="font-semibold text-amber-400 mb-1">4. Balloon rises toward low pressure</div>
                <div className="text-sm text-slate-300">Just like a balloon rises against gravity in air!</div>
              </div>
            </div>
          </div>

          {/* Review SVG Diagram */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
            <svg viewBox="0 0 400 160" style={{ width: '100%' }}>
              {renderSvgDefs()}
              {/* Grid */}
              <g opacity="0.3">
                {[0,40,80,120].map(y=><line key={`rg${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#94a3b8" strokeDasharray="4 4"/>)}
              </g>
              {/* Car outline */}
              <rect x="80" y="60" width="220" height="70" fill="url(#hbcCarBody)" rx="10" opacity="0.8"/>
              <rect x="100" y="30" width="180" height="45" fill="url(#hbcCarRoof)" rx="8"/>
              {/* Balloon tilting forward */}
              <g transform="rotate(-22, 170, 75)">
                <line x1="170" y1="75" x2="170" y2="45" stroke="#d8b4fe" strokeWidth="2"/>
                <ellipse cx="170" cy="30" rx="16" ry="18" fill="url(#hbcBalloonGloss)" filter="url(#hbcGlow)"/>
                <text x="170" y="35" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">He</text>
              </g>
              {/* Pendulum tilting backward */}
              <g transform="rotate(15, 240, 65)">
                <line x1="240" y1="65" x2="240" y2="100" stroke="#94a3b8" strokeWidth="2"/>
                <circle cx="240" cy="110" r="12" fill="url(#hbcWeightGradient)"/>
              </g>
              {/* Labels */}
              <text x="155" y="155" fill="#a855f7" fontSize="11" fontWeight="600">Forward →</text>
              <text x="220" y="155" fill="#ef4444" fontSize="11" fontWeight="600">← Backward</text>
              {/* Acceleration arrow */}
              <path d="M 320,90 L 370,90" stroke="#22c55e" strokeWidth="3" markerEnd="url(#hbcArrowGreen)"/>
              <text x="325" y="108" fill="#22c55e" fontSize="11" fontWeight="600">Accel</text>
              {/* Road */}
              <rect x="0" y="130" width="400" height="20" fill="url(#hbcRoadSurface)"/>
            </svg>
            <p className="text-xs text-slate-400 text-center mt-2">Balloon tilts forward; pendulum tilts backward during acceleration</p>
          </div>

          {/* Einstein's Insight */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="font-semibold text-amber-400 mb-2">Einstein&apos;s Equivalence Principle</p>
            <p className="text-slate-300 text-sm">
              Acceleration is indistinguishable from gravity. Forward acceleration creates a backward &quot;pseudo-gravity&quot; - and the balloon rises against it!
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              Try a Twist
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 0, label: 'Backward (with inertia)', icon: '⬅️', description: 'Like a regular object' },
      { id: 1, label: 'Forward (like helium balloon)', icon: '➡️', description: 'Same physics applies' },
      { id: 2, label: 'Stays in place', icon: '⏺️', description: 'Water prevents movement' },
    ];

    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-xl w-full">
          {/* Header */}
          <div className="text-center mb-4">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              TWIST SCENARIO
            </span>
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">
              Bubble in Water
            </h2>
            <p className="text-slate-400">
              A sealed bottle of water has an air bubble inside. When the car accelerates forward, which way does the bubble move?
            </p>
          </div>

          {/* Static SVG showing bubble in water bottle */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
            <svg viewBox="0 0 400 150" style={{ width: '100%' }}>
              {renderSvgDefs()}
              {/* Grid */}
              <g opacity="0.3">
                {[30,75,120].map(y=><line key={`tpg${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#94a3b8" strokeDasharray="4 4"/>)}
              </g>
              {/* Water bottle */}
              <rect x="150" y="25" width="100" height="100" fill="rgba(59,130,246,0.3)" rx="12" stroke="#3b82f6" strokeWidth="2"/>
              <rect x="165" y="15" width="70" height="15" fill="rgba(59,130,246,0.2)" rx="4" stroke="#3b82f6" strokeWidth="1"/>
              <text x="200" y="120" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="600">Water</text>
              {/* Air bubble centered - question mark for position */}
              <ellipse cx="200" cy="65" rx="16" ry="14" fill="rgba(255,255,255,0.85)" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
              <text x="200" y="70" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">Air</text>
              {/* Accel arrow */}
              <path d="M 310,70 L 360,70" stroke="#22c55e" strokeWidth="3" markerEnd="url(#hbcArrowGreen)"/>
              <text x="335" y="90" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="600">Accel</text>
              {/* Question marks left/right */}
              <text x="115" y="70" fill="#fbbf24" fontSize="24" fontWeight="bold">?</text>
              <text x="285" y="70" fill="#fbbf24" fontSize="24" fontWeight="bold">?</text>
              <text x="200" y="145" textAnchor="middle" fill="#e2e8f0" fontSize="11">Which direction does the bubble move?</text>
            </svg>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {twistOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setTwistPrediction(opt.id);
                  playSound('click');
                }}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  twistPrediction === opt.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className={`font-semibold ${twistPrediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                    {opt.label}
                  </div>
                  <div className="text-sm text-slate-400">{opt.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (twistPrediction !== null) {
                  emitEvent('twist_prediction_made', { prediction: twistPrediction });
                  goToPhase('twist_play');
                }
              }}
              disabled={twistPrediction === null}
              style={{ zIndex: 10, minHeight: '44px' }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                twistPrediction !== null
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Test It
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  const renderTwistPlay = () => {
    const getModeColor = () => {
      switch (twistMode) {
        case 'accelerate': return '#22c55e';
        case 'brake': return '#ef4444';
        case 'turn_left': return '#3b82f6';
        case 'turn_right': return '#f59e0b';
      }
    };

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              EXTENDED LAB
            </span>
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">
              Compare Different Scenarios
            </h2>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 justify-center mb-4 flex-wrap">
            {(['accelerate', 'brake', 'turn_left', 'turn_right'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setTwistMode(mode);
                  resetTwist();
                  playSound('click');
                }}
                style={{
                  zIndex: 10,
                  minHeight: '44px',
                  background: twistMode === mode ? `${mode === 'accelerate' ? '#22c55e' : mode === 'brake' ? '#ef4444' : mode === 'turn_left' ? '#3b82f6' : '#f59e0b'}20` : undefined,
                  color: twistMode === mode ? getModeColor() : undefined,
                  borderColor: twistMode === mode ? getModeColor() : undefined,
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${
                  twistMode === mode
                    ? 'bg-opacity-20 border-opacity-50'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'
                }`}
              >
                {mode === 'accelerate' && 'Accelerate'}
                {mode === 'brake' && 'Brake'}
                {mode === 'turn_left' && 'Turn Left'}
                {mode === 'turn_right' && 'Turn Right'}
              </button>
            ))}
          </div>

          {/* Visualization */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-4">
            <h3 className="text-sm font-semibold text-white mb-2 text-center">Multi-Scenario Comparison</h3>
            <svg viewBox="0 0 450 200" style={{ width: '100%' }}>
              {renderSvgDefs()}

              {/* Grid lines */}
              <g opacity="0.1">
                {[0, 40, 80, 120, 160].map(y => (
                  <line key={`twist-grid-h-${y}`} x1="0" y1={y} x2="450" y2={y} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {[0, 75, 150, 225, 300, 375, 450].map(x => (
                  <line key={`twist-grid-v-${x}`} x1={x} y1="0" x2={x} y2="200" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
              </g>

              {/* Y-axis */}
              <line x1="10" y1="5" x2="10" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="2" y="10" fill="#e2e8f0" fontSize="8" fontWeight="600">Tilt</text>
              <line x1="7" y1="40" x2="13" y2="40" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="7" y1="80" x2="13" y2="80" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="7" y1="120" x2="13" y2="120" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="7" y1="160" x2="13" y2="160" stroke="#e2e8f0" strokeWidth="1" />

              {/* X-axis */}
              <line x1="10" y1="160" x2="440" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="410" y="156" fill="#e2e8f0" fontSize="8" fontWeight="600">Scenarios →</text>
              <line x1="110" y1="157" x2="110" y2="163" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="225" y1="157" x2="225" y2="163" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="340" y1="157" x2="340" y2="163" stroke="#e2e8f0" strokeWidth="1" />

              {/* Car interior */}
              <rect x="25" y="20" width="400" height="140" fill="url(#hbcCarRoof)" rx="12" stroke="#475569" />

              {/* Balloon section */}
              <g transform="translate(60, 30)">
                <rect x="0" y="0" width="100" height="100" fill="rgba(30, 64, 175, 0.3)" rx="8" />
                <text x="50" y="115" textAnchor="middle" fill="#a855f7" fontSize="10" fontWeight="600">Balloon</text>

                <g transform={`rotate(${twistBalloonAngle}, 50, 80)`}>
                  <line x1="50" y1="80" x2="50" y2="45" stroke="#d8b4fe" strokeWidth="1.5" />
                  <ellipse cx="50" cy="30" rx="16" ry="18" fill="url(#hbcBalloonGloss)" filter="url(#hbcGlow)" />
                  <text x="50" y="35" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">He</text>
                </g>
              </g>

              {/* Bubble in water section */}
              <g transform="translate(175, 30)">
                <rect x="0" y="0" width="100" height="100" fill="rgba(59, 130, 246, 0.4)" rx="8" />
                <text x="50" y="115" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="600">Bubble</text>

                <ellipse
                  cx={50 + twistBalloonAngle * 0.7}
                  cy="50"
                  rx="14" ry="12"
                  fill="rgba(255,255,255,0.9)"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                />
              </g>

              {/* Pendulum section */}
              <g transform="translate(290, 30)">
                <rect x="0" y="0" width="100" height="100" fill="rgba(239, 68, 68, 0.2)" rx="8" />
                <text x="50" y="115" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="600">Weight</text>

                <g transform={`rotate(${twistPendulumAngle}, 50, 20)`}>
                  <line x1="50" y1="20" x2="50" y2="60" stroke="#94a3b8" strokeWidth="2" />
                  <circle cx="50" cy="70" r="14" fill="url(#hbcWeightGradient)" />
                </g>
              </g>

              {/* Direction indicator */}
              <g transform="translate(175, 165)">
                <text
                  x="50" y="15"
                  textAnchor="middle"
                  fill={getModeColor()}
                  fontSize="12"
                  fontWeight="bold"
                >
                  {twistMode === 'accelerate' && 'ACCELERATE -->'}
                  {twistMode === 'brake' && '<-- BRAKING'}
                  {twistMode === 'turn_left' && '<-- TURNING LEFT'}
                  {twistMode === 'turn_right' && 'TURNING RIGHT -->'}
                </text>
              </g>
            </svg>
            {/* Formula display */}
            <div className="mt-2 text-center bg-slate-900/60 rounded-lg p-2">
              <span className="text-xs font-mono text-amber-400">θ_tilt ∝ a × (ρ_medium - ρ_object) / ρ_medium</span>
            </div>
          </div>

          {/* Status labels */}
          <div className="flex justify-around mb-4 flex-wrap gap-2">
            <span style={{ fontSize: typo.small, color: colors.balloon, fontWeight: 600 }}>
              Balloon: {twistBalloonAngle > 0 ? 'Forward' : twistBalloonAngle < 0 ? 'Backward' : 'Neutral'}
            </span>
            <span style={{ fontSize: typo.small, color: '#60a5fa', fontWeight: 600 }}>
              Bubble: {twistBalloonAngle > 0 ? 'Forward' : twistBalloonAngle < 0 ? 'Backward' : 'Neutral'}
            </span>
            <span style={{ fontSize: typo.small, color: colors.pendulum, fontWeight: 600 }}>
              Weight: {twistPendulumAngle > 0 ? 'Forward' : twistPendulumAngle < 0 ? 'Backward' : 'Neutral'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={runTwistSimulation}
              disabled={twistCarState !== 'stopped'}
              style={{
                zIndex: 10,
                background: twistCarState !== 'stopped' ? '#475569' : `linear-gradient(135deg, ${getModeColor()}, ${getModeColor()}cc)`,
              }}
              className="px-8 py-3 rounded-xl font-semibold text-white transition-all"
            >
              Run Simulation
            </button>
            <button
              onClick={resetTwist}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-8 py-3 rounded-xl font-semibold bg-slate-600 text-white hover:bg-slate-500 transition-all"
            >
              Reset
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (twistPrediction === 1) {
                  onCorrectAnswer?.();
                } else {
                  onIncorrectAnswer?.();
                }
                goNext();
              }}
              disabled={twistCarState === 'stopped' && !hasAccelerated}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              See the Insight
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  const renderTwistReview = () => {
    const userWasRight = twistPrediction === 1;

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{userWasRight ? 'Exactly!' : 'Same Physics!'}</div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
              {userWasRight ? 'You got it!' : 'The bubble moves forward too!'}
            </h2>
          </div>

          {/* Core Insight */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Relative Density is Key</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">Helium in Air</div>
                <div className="text-slate-400 text-sm">
                  He: 0.18 kg/m3<br />
                  Air: 1.2 kg/m3
                </div>
                <div className="text-emerald-400 text-xs mt-2 font-semibold">7x lighter</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">Air in Water</div>
                <div className="text-slate-400 text-sm">
                  Air: 1.2 kg/m3<br />
                  Water: 1000 kg/m3
                </div>
                <div className="text-emerald-400 text-xs mt-2 font-semibold">830x lighter</div>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center">
              <p className="text-amber-400 font-semibold mb-2">The Universal Rule</p>
              <p className="text-slate-300 text-sm">
                In any acceleration field, less dense objects move opposite to the pseudo-force direction - they &quot;rise&quot; against the effective gravity.
              </p>
            </div>
          </div>

          {/* Twist Review SVG Diagram */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
            <svg viewBox="0 0 400 130" style={{ width: '100%' }}>
              {renderSvgDefs()}
              {/* Grid */}
              <g opacity="0.3">
                {[30,65,100].map(y=><line key={`trg${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#94a3b8" strokeDasharray="4 4"/>)}
              </g>
              {/* He balloon + water bubble side by side showing same behavior */}
              {/* Air: left side */}
              <rect x="20" y="20" width="120" height="90" fill="rgba(30,41,59,0.6)" rx="8" stroke="#334155"/>
              <text x="80" y="16" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="600">Helium in Air</text>
              <g transform="rotate(-18, 80, 80)">
                <line x1="80" y1="80" x2="80" y2="50" stroke="#d8b4fe" strokeWidth="2"/>
                <ellipse cx="80" cy="36" rx="14" ry="16" fill="url(#hbcBalloonGloss)"/>
                <text x="80" y="41" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">He</text>
              </g>
              {/* Water: right side */}
              <rect x="160" y="20" width="120" height="90" fill="rgba(59,130,246,0.2)" rx="8" stroke="#3b82f6" strokeOpacity="0.3"/>
              <text x="220" y="16" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="600">Bubble in Water</text>
              <ellipse cx={220+18} cy="65" rx="16" ry="14" fill="rgba(255,255,255,0.85)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              {/* Arrow: both go same direction */}
              <text x="295" y="65" fill="#22c55e" fontSize="11" fontWeight="bold">SAME</text>
              <text x="293" y="80" fill="#22c55e" fontSize="11" fontWeight="bold">→→→</text>
              {/* Bottom: forward label */}
              <text x="200" y="124" textAnchor="middle" fill="#e2e8f0" fontSize="11">Both less-dense objects move FORWARD</text>
            </svg>
            <p className="text-xs text-slate-400 text-center mt-2">Relative density determines behavior in any acceleration field</p>
          </div>

          {/* More examples */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
            <p className="font-semibold text-emerald-400 mb-2">More Examples</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>🚗 Turning car: Balloon moves INTO the turn</li>
              <li>🛗 Elevator accelerating up: Enhanced buoyancy</li>
              <li>✈️ Airplane takeoff: Balloon tilts toward cockpit</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10, minHeight: '44px' }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Real World Applications
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: TRANSFER (4 Real-World Applications)
  // ============================================================================
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allRead = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-2xl w-full" style={{ padding: '16px', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-4" style={{ marginBottom: '16px' }}>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
              {completedApps.size} of {applications.length} applications explored
            </span>
            <div className="flex gap-1.5">
              {applications.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            {renderProgressBar(completedApps.size, applications.length, colors.success)}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 flex-wrap justify-center">
            {applications.map((a, i) => {
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={a.id}
                  onClick={() => setActiveApp(i)}
                  style={{
                    zIndex: 10,
                    minHeight: '44px',
                    background: activeApp === i ? a.color : undefined,
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeApp === i
                      ? 'text-white'
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {isCompleted ? '✓ ' : ''}{a.icon} {a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${app.color}20` }}
              >
                {app.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{app.title}</h2>
                <p className="text-sm font-medium" style={{ color: app.color }}>{app.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-300 mb-4 leading-relaxed">{app.description}</p>

            {/* Physics Connection */}
            <div
              className="rounded-lg p-4 mb-4 border"
              style={{ background: `${app.color}10`, borderColor: `${app.color}30` }}
            >
              <p className="font-semibold mb-1" style={{ color: app.color }}>Physics Connection</p>
              <p className="text-sm text-slate-300">{app.physics}</p>
            </div>

            {/* Insight */}
            <div className="bg-slate-900/60 rounded-lg p-4 mb-4 border border-slate-700/50">
              <p className="font-semibold text-white mb-1">Key Insight</p>
              <p className="text-sm text-slate-400">{app.insight}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {app.stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mark as Read Button */}
            {!completedApps.has(activeApp) ? (
              <button
                onClick={() => {
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emitEvent('app_explored', { app: app.id });
                  playSound('complete');
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                }}
                style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '8px' }}
                className="w-full py-3 rounded-lg font-semibold text-white"
              >
                ✅ Got It — Continue
              </button>
            ) : (
              <div className="w-full py-3 rounded-lg font-semibold text-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                ✅ Completed
              </div>
            )}
          </div>

          {/* Take the Test Button - always visible for navigation */}
          <button
            onClick={() => goToPhase('test')}
            style={{
              zIndex: 10,
              minHeight: '44px',
              background: allRead ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'rgba(51,65,85,0.7)',
              padding: '16px',
              marginBottom: '16px',
              border: allRead ? 'none' : '1px solid #475569',
            }}
            className="w-full py-3 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            {allRead ? '🎯 Take the Test' : `Take the Test (${completedApps.size}/${applications.length} apps viewed)`}
          </button>

          {/* Navigation */}
          <div className="flex gap-3" style={{ gap: '12px' }}>
            <button
              onClick={goBack}
              style={{ zIndex: 10, minHeight: '44px', padding: '12px 24px' }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: TEST (10 Questions)
  // ============================================================================
  const renderTest = () => {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) =>
      sum + (ans !== null && testQuestions[i].options[ans]?.correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center px-6">
            <div className="text-center max-w-md w-full mb-6">
              <div className="text-5xl mb-3">{passed ? '🏆' : '📚'}</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {passed ? 'Outstanding Performance!' : 'Good Effort!'}
              </h2>
              <div className={`text-5xl font-bold mb-3 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalCorrect}/10
              </div>
              <p className="text-slate-400 mb-4">
                {passed ? "You've mastered acceleration buoyancy!" : 'Review the concepts and try again.'}
              </p>
            </div>

            {/* Answer Review */}
            <div className="max-w-md w-full mb-6">
              <h3 className="text-lg font-bold text-white mb-3">Answer Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {testQuestions.map((tq, i) => {
                  const userAns = testAnswers[i];
                  const correct = userAns !== null && tq.options[userAns]?.correct;
                  return (
                    <div
                      key={i}
                      style={{
                        background: correct ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${correct ? '#10b981' : '#ef4444'}40`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{correct ? '✓' : '✗'}</span>
                      <div>
                        <p style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '2px' }}>Q{i + 1}: {tq.question.slice(0, 60)}...</p>
                        {userAns !== null && (
                          <p style={{ fontSize: '11px', color: correct ? '#10b981' : '#ef4444' }}>
                            Your answer: {tq.options[userAns].text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="max-w-md w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  if (passed) {
                    setTestScore(totalCorrect);
                    goToPhase('mastery');
                  } else {
                    goToPhase('review');
                  }
                }}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`w-full px-8 py-4 rounded-xl font-semibold text-lg ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                }`}
              >
                {passed ? '🎓 Complete Lesson' : '📖 Review Material'}
              </button>
              <button
                onClick={() => {
                  setTestIndex(0);
                  setTestAnswers(Array(10).fill(null));
                  setTestSubmitted(false);
                }}
                style={{ zIndex: 10, minHeight: '44px' }}
                className="w-full px-8 py-3 rounded-xl font-semibold border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                🔄 Replay Quiz
              </button>
              <button
                onClick={() => { if (onComplete) onComplete(); }}
                style={{ zIndex: 10, minHeight: '44px' }}
                className="w-full px-8 py-3 rounded-xl font-semibold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                🏠 Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center px-6" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
        <div className="max-w-xl w-full" style={{ padding: '16px', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          {/* Question Header */}
          <div className="flex justify-between items-center mb-4" style={{ marginBottom: '16px' }}>
            <span className="text-xs font-bold text-purple-400 tracking-widest uppercase">
              Question {testIndex + 1} of 10
            </span>
            <div className="flex gap-1">
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    testAnswers[i] !== null
                      ? testQuestions[i].options[testAnswers[i] as number]?.correct ? 'bg-emerald-500' : 'bg-red-500'
                      : i === testIndex ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            {renderProgressBar(testIndex + 1, testQuestions.length)}
          </div>

          {/* Scenario context */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Scenario</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              You are riding in a car with a helium balloon tied to the seat. The car undergoes various motions:
              acceleration, braking, and turning. Inside the sealed car, the helium balloon interacts with
              the surrounding air through buoyancy forces. Einstein's equivalence principle tells us that
              acceleration is locally indistinguishable from a gravitational field. The air (density ~1.2 kg/m³)
              is much denser than helium (density ~0.18 kg/m³). When the car accelerates, a pressure gradient
              forms inside, pushing the lighter helium toward the lower-pressure region.
            </p>
          </div>

          {/* Question */}
          <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">
            {q.question}
          </h2>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-6">
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
                      emitEvent('test_answered', { questionIndex: testIndex, correct: opt.correct });
                      playSound(opt.correct ? 'success' : 'failure');
                    }
                  }}
                  style={{
                    zIndex: 10,
                    minHeight: '44px',
                    background: showResult
                      ? isCorrect
                        ? 'rgba(16, 185, 129, 0.1)'
                        : isSelected
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(30, 41, 59, 0.5)'
                      : isSelected
                        ? 'rgba(168, 85, 247, 0.1)'
                        : 'rgba(30, 41, 59, 0.5)',
                    border: showResult
                      ? isCorrect
                        ? '2px solid #10b981'
                        : isSelected
                          ? '2px solid #ef4444'
                          : '2px solid #334155'
                      : isSelected
                        ? '2px solid #a855f7'
                        : '2px solid #334155',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 12px rgba(168, 85, 247, 0.3)' : 'none',
                  }}
                  className="p-4 rounded-xl text-left transition-all"
                >
                  <span style={{
                    fontWeight: 'bold',
                    marginRight: '12px',
                    color: showResult
                      ? isCorrect ? '#10b981' : isSelected ? '#ef4444' : '#64748b'
                      : isSelected ? '#a855f7' : '#a855f7',
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-white">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {testAnswers[testIndex] !== null && (
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
              <p className="font-semibold text-white mb-1">Explanation</p>
              <p className="text-sm text-slate-400">{q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            {testIndex > 0 ? (
              <button
                onClick={() => setTestIndex(testIndex - 1)}
                style={{ zIndex: 10, minHeight: '44px' }}
                className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
            ) : <div />}
            {testAnswers[testIndex] !== null && (
              testIndex < testQuestions.length - 1 ? (
                <button
                  onClick={() => setTestIndex(testIndex + 1)}
                  style={{ zIndex: 10, minHeight: '44px' }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-blue-600 text-white"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(true);
                    emitEvent('test_completed', { score: totalCorrect });
                  }}
                  style={{ zIndex: 10, minHeight: '44px' }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  See Results
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ overflowY: 'auto', flex: 1, paddingTop: '48px', paddingBottom: '100px' }}>
      <div className="max-w-md">
        {/* Trophy */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center mx-auto mb-8 text-6xl">
          🏆
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Congratulations!
        </h1>
        <h2 className="text-xl font-semibold text-purple-400 mb-4">
          Acceleration Buoyancy Master
        </h2>

        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          You now understand why helium balloons move forward in accelerating cars, and how this demonstrates Einstein&apos;s equivalence principle!
        </p>

        {/* Score */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
          <div className="text-sm text-slate-400 mb-1">Quiz Score</div>
          <div className="text-3xl font-bold text-emerald-400">{testScore}/10</div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🎈', label: 'Buoyancy' },
            { icon: '🌡️', label: 'Pressure' },
            { icon: '🧠', label: 'Equivalence' },
          ].map((achievement, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="text-2xl mb-2">{achievement.icon}</div>
              <div className="text-xs text-slate-400">{achievement.label}</div>
            </div>
          ))}
        </div>

        {/* Key Formula */}
        <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-8">
          <p className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-3">
            KEY PRINCIPLE MASTERED
          </p>
          <p className="text-xl font-bold text-white">
            Acceleration = Effective Gravity Field
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Less dense objects &quot;rise&quot; against pseudo-gravity
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            emitEvent('mastery_achieved', { game: 'helium_balloon_car', score: testScore });
            playSound('complete');
            if (onComplete) onComplete();
          }}
          style={{ zIndex: 10, minHeight: '44px' }}
          className="px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          Complete Lesson
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE ROUTER
  // ============================================================================
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="bg-[#0a0f1a] text-white relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6' }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
        className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50"
      >
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto" style={{ minHeight: '44px' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-lg">
              🎈
            </div>
            <div>
              <span className="text-sm font-semibold text-white/80 tracking-wide">Helium Balloon Car</span>
              <p className="text-xs text-slate-400">Acceleration Buoyancy</p>
            </div>
          </div>
          {renderNavDots()}
          <span className="text-sm font-medium text-purple-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex flex-col" style={{ paddingTop: '80px', minHeight: 'calc(100dvh - 80px)' }}>{renderPhase()}</div>
    </div>
  );
}
