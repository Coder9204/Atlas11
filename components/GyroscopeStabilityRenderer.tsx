'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Real World',
  test: 'Test',
  mastery: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

// ============================================================================
// COLORS
// ============================================================================
const colors = {
  primary: '#22c55e',
  primaryLight: '#4ade80',
  primaryDark: '#16a34a',
  secondary: '#14b8a6',
  secondaryLight: '#2dd4bf',
  accent: '#fbbf24',
  accentLight: '#fde68a',
  danger: '#ef4444',
  dangerLight: '#f87171',
  background: '#0a0f1a',
  cardBg: '#1e293b',
  cardBgLight: '#334155',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  textDark: '#94a3b8',
  border: '#475569'
};

// ============================================================================
// REAL WORLD APPLICATIONS (4)
// ============================================================================
const realWorldApps = [
  {
    icon: '🛰',
    title: 'Spacecraft Attitude Control',
    short: 'Pointing satellites with spinning wheels',
    tagline: 'No thrusters needed in the vacuum of space',
    description: 'Spacecraft use reaction wheels - spinning masses that transfer angular momentum to rotate the vehicle. By speeding up or slowing down wheels on different axes, satellites can point precisely without expending fuel.',
    connection: 'Conservation of angular momentum means the total spin of spacecraft + wheels stays constant. Speed up a wheel, and the spacecraft rotates the opposite direction - exactly the principle you explored.',
    howItWorks: 'Three or four reaction wheels mounted along different axes allow full 3D attitude control. To point a telescope at a star, the computer calculates required wheel speed changes. Momentum buildup is periodically "dumped" using thrusters.',
    stats: [
      { value: '0.001 deg', label: 'Pointing accuracy achievable', icon: 'T' },
      { value: '6,000 RPM', label: 'Typical wheel speed', icon: 'R' },
      { value: '$200M', label: 'Hubble gyroscope replacement cost', icon: '$' }
    ],
    examples: ['Hubble Space Telescope', 'ISS attitude control', 'GPS satellite pointing', 'James Webb Space Telescope'],
    companies: ['Honeywell Aerospace', 'Collins Aerospace', 'Northrop Grumman', 'Ball Aerospace'],
    futureImpact: 'Control moment gyroscopes with variable-speed control will enable even faster slewing for next-generation space observatories.',
    color: colors.primary
  },
  {
    icon: '📱',
    title: 'Smartphone Motion Sensing',
    short: 'How your phone knows which way is up',
    tagline: 'MEMS gyroscopes in your pocket',
    description: 'Every smartphone contains tiny MEMS gyroscopes that detect rotation rates. Combined with accelerometers and magnetometers, they enable screen rotation, VR/AR tracking, image stabilization, and navigation.',
    connection: 'While not spinning masses, MEMS gyroscopes use the Coriolis effect on vibrating elements to detect rotation - a related principle of how spinning systems respond to rotation.',
    howItWorks: 'A vibrating mass experiences Coriolis force when rotated. This force causes displacement proportional to rotation rate. Capacitive sensors detect this displacement with extreme precision, thousands of times per second.',
    stats: [
      { value: '1 mm', label: 'MEMS gyroscope size', icon: 'S' },
      { value: '$0.50', label: 'Per-unit cost at scale', icon: '$' },
      { value: '5B+', label: 'MEMS gyroscopes shipped annually', icon: '#' }
    ],
    examples: ['Phone screen rotation', 'VR headset tracking', 'Camera stabilization', 'Fitness tracker motion'],
    companies: ['STMicroelectronics', 'Bosch', 'InvenSense (TDK)', 'Analog Devices'],
    futureImpact: 'Next-gen MEMS will enable indoor navigation accuracy within centimeters, transforming AR and robotics.',
    color: colors.secondary
  },
  {
    icon: '✈',
    title: 'Aircraft Navigation Systems',
    short: 'Flying blind with gyroscopic precision',
    tagline: 'The artificial horizon that never lies',
    description: 'Aircraft attitude indicators and navigation systems rely on gyroscopes to maintain reference to true vertical and heading. Ring laser and fiber optic gyroscopes now provide inertial navigation accurate to meters over hours of flight.',
    connection: 'Gyroscopic rigidity - the property you observed where spinning objects resist orientation changes - keeps attitude indicators stable even in turbulence and maneuvers.',
    howItWorks: 'Traditional mechanical gyroscopes maintain a stable reference frame due to angular momentum. Modern ring laser gyroscopes use the Sagnac effect - light traveling opposite directions in a rotating ring experiences different path lengths.',
    stats: [
      { value: '0.01 deg/hr', label: 'Navigation-grade gyro drift', icon: 'C' },
      { value: '$50K', label: 'Ring laser gyro cost', icon: '$' },
      { value: '1 m/hr', label: 'Position error accumulation', icon: 'P' }
    ],
    examples: ['Boeing 787 navigation', 'Airbus fly-by-wire systems', 'Military aircraft INS', 'Drone autopilots'],
    companies: ['Honeywell', 'Northrop Grumman', 'Safran', 'KVH Industries'],
    futureImpact: 'Quantum gyroscopes using atomic spin will achieve drift rates 1000x better, enabling GPS-free precision navigation.',
    color: '#8b5cf6'
  },
  {
    icon: '🚢',
    title: 'Ship Stabilization Systems',
    short: 'Massive gyroscopes that calm the seas',
    tagline: 'Turning ship-wrecking rolls into gentle sways',
    description: 'Luxury yachts and naval vessels use large gyroscopic stabilizers to reduce roll motion by up to 90%. A spinning flywheel of several tons resists the ship\'s roll, transferring energy to controlled precession.',
    connection: 'The gyroscopic resistance to tilting you explored scales up dramatically: a 10-ton flywheel spinning at 200+ RPM generates enormous stabilizing torque.',
    howItWorks: 'A large flywheel spins in a gimbal mount. When the ship rolls, the gyroscope resists and precesses. Active control adjusts precession to counteract waves. Multiple units combine for total roll reduction.',
    stats: [
      { value: '90%', label: 'Roll reduction achievable', icon: '%' },
      { value: '10+ tons', label: 'Large stabilizer mass', icon: 'W' },
      { value: '$500K+', label: 'System cost for yachts', icon: '$' }
    ],
    examples: ['Seakeeper yacht stabilizers', 'Naval vessel stabilization', 'Cruise ship comfort systems', 'Research vessel platforms'],
    companies: ['Seakeeper', 'SKF', 'Quantum Marine', 'Naiad Dynamics'],
    futureImpact: 'Compact, high-speed carbon fiber flywheels will bring gyro stabilization to smaller boats and even offshore wind platforms.',
    color: colors.accent
  }
];

// ============================================================================
// TEST QUESTIONS (10)
// ============================================================================
const testQuestions = [
  {
    question: 'What is angular momentum?',
    options: [
      { text: 'The speed at which an object moves in a straight line', correct: false },
      { text: 'The rotational equivalent of linear momentum (L = I times omega)', correct: true },
      { text: 'The force needed to start an object spinning', correct: false },
      { text: 'The energy stored in a spinning object', correct: false }
    ]
  },
  {
    question: 'Why does a spinning bicycle wheel resist being tilted?',
    options: [
      { text: 'The wheel becomes heavier when spinning', correct: false },
      { text: 'Air resistance pushes against tilting', correct: false },
      { text: 'Angular momentum is conserved - changing direction requires torque', correct: true },
      { text: 'Friction increases when spinning', correct: false }
    ]
  },
  {
    question: 'What happens to a spinning top\'s stability as it slows down?',
    options: [
      { text: 'It becomes more stable', correct: false },
      { text: 'Stability stays the same', correct: false },
      { text: 'It becomes less stable and eventually falls', correct: true },
      { text: 'It speeds up to compensate', correct: false }
    ]
  },
  {
    question: 'How do bicycles stay upright when moving?',
    options: [
      { text: 'The rider\'s balance alone keeps them up', correct: false },
      { text: 'Gyroscopic effects from spinning wheels help resist tipping', correct: true },
      { text: 'The handlebars automatically correct balance', correct: false },
      { text: 'Bikes have hidden stabilizers', correct: false }
    ]
  },
  {
    question: 'What is the relationship between spin rate and stability?',
    options: [
      { text: 'Faster spin equals less stability', correct: false },
      { text: 'Spin rate does not affect stability', correct: false },
      { text: 'Faster spin equals more angular momentum equals more stability', correct: true },
      { text: 'Only the mass matters, not spin rate', correct: false }
    ]
  },
  {
    question: 'How do spacecraft control their orientation without rockets?',
    options: [
      { text: 'They cannot - rockets are always needed', correct: false },
      { text: 'They use reaction wheels and control moment gyroscopes', correct: true },
      { text: 'They rely on solar wind pressure', correct: false },
      { text: 'They bounce off Earth\'s magnetic field', correct: false }
    ]
  },
  {
    question: 'Why does a gyroscope appear to "defy gravity"?',
    options: [
      { text: 'It actually cancels out gravity', correct: false },
      { text: 'Angular momentum prevents the axis from falling until friction slows it', correct: true },
      { text: 'It creates an anti-gravity field', correct: false },
      { text: 'Air pressure holds it up', correct: false }
    ]
  },
  {
    question: 'What is the moment of inertia?',
    options: [
      { text: 'The moment when an object stops spinning', correct: false },
      { text: 'A measure of how mass is distributed relative to the rotation axis', correct: true },
      { text: 'The time it takes to start spinning', correct: false },
      { text: 'The force needed to maintain rotation', correct: false }
    ]
  },
  {
    question: 'Why are flywheels used in engines?',
    options: [
      { text: 'To make the engine lighter', correct: false },
      { text: 'To store rotational energy and smooth out power delivery', correct: true },
      { text: 'To create more friction', correct: false },
      { text: 'To reduce fuel consumption by stopping rotation', correct: false }
    ]
  },
  {
    question: 'What happens if you try to rotate a spinning gyroscope in a new direction?',
    options: [
      { text: 'It rotates easily in any direction', correct: false },
      { text: 'It experiences precession - rotating perpendicular to the applied force', correct: true },
      { text: 'It immediately stops spinning', correct: false },
      { text: 'It doubles its spin speed', correct: false }
    ]
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const GyroscopeStabilityRenderer: React.FC<Props> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete,
  setTestScore
}) => {
  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [spinRate, setSpinRate] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
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
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Sound system
  const playSound = useCallback((soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'click':
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'failure':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Event handlers
  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
          }}
        />
      </div>
    );
  };

  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            title={phaseLabels[p]}
            aria-label={phaseLabels[p]}
            style={{
              width: phase === p ? '24px' : '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: index <= currentIndex ? colors.primary : colors.cardBgLight,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // PHASE 1: HOOK
  // ============================================================================
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '32px 16px', lineHeight: '1.6' }}>
      {/* Premium badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.primary }} />
        <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rotational Dynamics
        </span>
      </div>

      {/* Gradient title */}
      <h1
        style={{ fontSize: typo.title, fontWeight: 700, textAlign: 'center', marginBottom: '12px', color: '#fff' }}
      >
        The Spinning Wheel Mystery
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: typo.bodyLarge, color: colors.textMuted, textAlign: 'center', marginBottom: '32px', maxWidth: '512px', lineHeight: '1.6' }}>
        Why do spinning objects resist being tilted?
      </p>

      {/* Premium card with gyroscope visualization */}
      <div
        className="w-full max-w-md rounded-2xl p-6 mb-8 border"
        style={{
          backgroundColor: `${colors.cardBg}80`,
          borderColor: `${colors.border}50`,
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Animated gyroscope SVG */}
        <svg viewBox="0 0 300 200" className="w-full h-48 mb-4">
          <defs>
            <linearGradient id="gyroRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primaryLight} />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
            <filter id="gyroGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="300" height="200" fill={colors.background} rx="12" />

          {/* Outer gimbal */}
          <ellipse cx="150" cy="100" rx="80" ry="30" fill="none" stroke={colors.cardBgLight} strokeWidth="3" />

          {/* Inner gimbal */}
          <ellipse cx="150" cy="100" rx="60" ry="60" fill="none" stroke={colors.border} strokeWidth="2" />

          {/* Spinning disc */}
          <g transform={`translate(150, 100) rotate(${animPhase * 3})`} filter="url(#gyroGlow)">
            <ellipse rx="45" ry="12" fill="url(#gyroRing)" opacity="0.9" />
            <ellipse rx="45" ry="12" fill="none" stroke={colors.primaryLight} strokeWidth="2" />
            {/* Spokes */}
            {[0, 45, 90, 135].map(angle => (
              <line
                key={angle}
                x1={Math.cos(angle * Math.PI / 180) * -40}
                y1={Math.sin(angle * Math.PI / 180) * -10}
                x2={Math.cos(angle * Math.PI / 180) * 40}
                y2={Math.sin(angle * Math.PI / 180) * 10}
                stroke={colors.primary}
                strokeWidth="2"
              />
            ))}
            <circle r="8" fill={colors.cardBg} stroke={colors.primary} strokeWidth="2" />
          </g>

          {/* Angular momentum arrow */}
          <g transform="translate(150, 100)">
            <line x1="0" y1="0" x2="0" y2="-60" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <polygon points="0,-70 -8,-55 8,-55" fill={colors.accent} />
            <text x="15" y="-50" fill={colors.accent} fontSize="14" fontWeight="bold">L</text>
          </g>

          {/* Label */}
          <text x="150" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="12">
            Spinning gyroscope resists tilting
          </text>
        </svg>

        <p style={{ fontSize: typo.body, color: colors.textMuted }} className="text-center mb-4">
          Hold a bicycle wheel by its axle. When it is not spinning, it flops around.
          But spin it fast... suddenly it resists tilting!
        </p>

        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          <p style={{ fontSize: typo.body, color: colors.primaryLight }} className="font-semibold">
            What invisible force stabilizes spinning objects?
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        className="group px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          color: colors.text,
          boxShadow: `0 4px 20px ${colors.primary}40`
        }}
      >
        Find Out Why
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <p style={{ color: colors.textDark }} className="text-sm mt-6">
        Tap to explore gyroscopic effects
      </p>
    </div>
  );

  // ============================================================================
  // PHASE 2: PREDICT
  // ============================================================================
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6 text-center">
        Make Your Prediction
      </h2>

      <div
        className="rounded-2xl p-6 max-w-xl w-full mb-6"
        style={{ backgroundColor: `${colors.cardBg}90` }}
      >
        <p style={{ fontSize: typo.body, color: colors.textMuted }} className="text-center mb-4">
          You hold a spinning bicycle wheel by its axle and try to tilt it. What happens?
        </p>

        {/* Visualization */}
        <svg viewBox="0 0 300 150" className="w-full h-32 mb-4">
          <rect width="300" height="150" fill={colors.background} rx="8" />

          {/* Hands holding wheel */}
          <ellipse cx="80" cy="75" rx="15" ry="20" fill="#e5d3bc" opacity="0.8" />
          <ellipse cx="220" cy="75" rx="15" ry="20" fill="#e5d3bc" opacity="0.8" />

          {/* Axle */}
          <line x1="95" y1="75" x2="205" y2="75" stroke={colors.border} strokeWidth="6" strokeLinecap="round" />

          {/* Wheel */}
          <circle cx="150" cy="75" r="40" fill="none" stroke={colors.primaryLight} strokeWidth="4" />
          <circle cx="150" cy="75" r="8" fill={colors.cardBg} stroke={colors.primary} strokeWidth="2" />

          {/* Spin arrows */}
          <path d="M150,30 A45,45 0 0 1 195,75" fill="none" stroke={colors.accent} strokeWidth="2" />
          <polygon points="195,75 185,68 185,82" fill={colors.accent} />

          {/* Question mark for tilt */}
          <text x="250" y="50" fill={colors.textMuted} fontSize="24" fontWeight="bold">?</text>
          <path d="M230,45 Q250,30 270,50" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="4,4" />
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It tilts easily, just like when not spinning' },
          { id: 'B', text: 'It resists tilting and pushes back unexpectedly' },
          { id: 'C', text: 'It spins faster when you try to tilt it' },
          { id: 'D', text: 'It immediately stops spinning' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className="p-4 rounded-xl text-left transition-all duration-300 border-2"
            style={{
              backgroundColor: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? `${colors.primary}30` : `${colors.danger}30`
                : showPredictionFeedback && option.id === 'B'
                ? `${colors.primary}30`
                : `${colors.cardBg}80`,
              borderColor: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? colors.primary : colors.danger
                : showPredictionFeedback && option.id === 'B'
                ? colors.primary
                : 'transparent',
              opacity: showPredictionFeedback && selectedPrediction !== option.id && option.id !== 'B' ? 0.5 : 1
            }}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span style={{ color: colors.textMuted }} className="ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 rounded-xl max-w-xl w-full" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <p style={{ color: colors.primaryLight }} className="font-semibold text-center mb-4">
            {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'} The spinning wheel resists tilting due to angular momentum!
          </p>
          <button
            onClick={() => goToPhase('play')}
            className="w-full px-6 py-3 rounded-xl font-semibold transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: colors.text
            }}
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE 3: PLAY
  // ============================================================================
  const renderPlay = () => {
    const wheelRotation = isSpinning ? animPhase * (spinRate / 20) : 0;
    const stabilityFactor = isSpinning ? spinRate / 10 : 0;
    const tiltResistance = isSpinning ? Math.max(5, 45 - spinRate / 2.5) : 45;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', lineHeight: '1.6' }}>
        <h2 style={{ fontSize: typo.heading, color: '#ffffff', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
          Spinning Wheel Experiment
        </h2>

        {/* Interactive visualization */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            width: '100%',
            maxWidth: '576px',
            border: `1px solid ${colors.border}`
          }}
        >
          <svg viewBox="0 0 400 280" style={{ width: '100%', height: '256px' }}>
            <defs>
              <linearGradient id="playDiscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primaryLight} />
                <stop offset="100%" stopColor={colors.primaryDark} />
              </linearGradient>
              <filter id="playGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width="400" height="280" fill={colors.background} />

            {/* Grid */}
            <g opacity="0.1">
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="280" stroke={colors.textDark} strokeWidth="0.5" />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} stroke={colors.textDark} strokeWidth="0.5" />
              ))}
            </g>

            {/* Wheel assembly with tilt */}
            <g transform={`translate(200, 150) rotate(${tiltResistance})`}>
              {/* Axle */}
              <line x1="-80" y1="0" x2="80" y2="0" stroke={colors.border} strokeWidth="8" strokeLinecap="round" />
              <circle cx="-80" cy="0" r="10" fill={colors.cardBgLight} />
              <circle cx="80" cy="0" r="10" fill={colors.cardBgLight} />

              {/* Spinning disc */}
              <g filter={isSpinning ? 'url(#playGlow)' : undefined} opacity={isSpinning ? 0.9 : 0.5}>
                <circle r="55" fill="none" stroke="url(#playDiscGrad)" strokeWidth="6" />
                <circle r="45" fill={`${colors.cardBg}80`} />

                {/* Spokes */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <line
                    key={i}
                    x1="0"
                    y1="0"
                    x2={Math.cos((i * 45 + wheelRotation) * Math.PI / 180) * 50}
                    y2={Math.sin((i * 45 + wheelRotation) * Math.PI / 180) * 50}
                    stroke={colors.primary}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                ))}

                <circle r="12" fill={colors.cardBg} stroke={colors.primaryLight} strokeWidth="2" />
              </g>

              {/* Angular momentum vector */}
              <g>
                <line
                  x1="0" y1="0"
                  x2="0" y2={isSpinning ? -40 - stabilityFactor : -30}
                  stroke={colors.accent}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity={isSpinning ? 1 : 0.3}
                />
                <polygon
                  points={isSpinning ? `0,${-48 - stabilityFactor} -8,${-35 - stabilityFactor} 8,${-35 - stabilityFactor}` : '0,-38 -8,-25 8,-25'}
                  fill={colors.accent}
                  opacity={isSpinning ? 1 : 0.3}
                />
                <text x="15" y={isSpinning ? -35 - stabilityFactor / 2 : -20} fill={colors.accent} fontSize="14" fontWeight="bold">L</text>
              </g>
            </g>

            {/* SVG Labels */}
            <text x="200" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">Gyroscope Wheel</text>
            <text x="320" y="60" fill={colors.accent} fontSize="12">Angular Momentum (L)</text>
            <text x="200" y="268" textAnchor="middle" fill={colors.textMuted} fontSize="11">Tilt Angle: {Math.round(tiltResistance)} deg | Spin Rate: {spinRate}%</text>

            {/* Status panel */}
            <g transform="translate(20, 50)">
              <rect width="100" height="60" fill={colors.cardBg} rx="8" stroke={colors.border} strokeWidth="1" />
              <text x="50" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">STABILITY</text>
              <rect x="10" y="26" width="80" height="10" fill={colors.background} rx="4" />
              <rect
                x="12" y="28"
                width={Math.max(0, 76 * (1 - tiltResistance / 45))}
                height="6"
                fill={isSpinning ? colors.primary : colors.danger}
                rx="2"
              />
              <text x="50" y="52" textAnchor="middle" fill={isSpinning ? colors.primaryLight : colors.dangerLight} fontSize="11" fontWeight="bold">
                {isSpinning ? 'STABLE' : 'UNSTABLE'}
              </text>
            </g>
          </svg>
        </div>

        {/* Legend Panel */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.primary }}></div>
            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Spinning Wheel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.accent }}></div>
            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Angular Momentum (L)</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', width: '100%', maxWidth: '576px' }}>
          <button
            onClick={() => {
              setIsSpinning(!isSpinning);
              playSound('click');
              onGameEvent?.({ type: 'simulation_started', data: { isSpinning: !isSpinning } });
            }}
            style={{
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '18px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: isSpinning ? colors.danger : colors.primary,
              color: '#ffffff'
            }}
          >
            {isSpinning ? 'Stop Wheel' : 'Spin Wheel'}
          </button>

          <div style={{
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.border}`
          }}>
            <label style={{ fontSize: typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '4px' }}>
              Angular Velocity: {spinRate}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={spinRate}
              onChange={(e) => {
                setSpinRate(Number(e.target.value));
                onGameEvent?.({ type: 'parameter_changed', data: { spinRate: Number(e.target.value) } });
              }}
              style={{ width: '100%', height: '8px', accentColor: colors.primary, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Explanation */}
        <div style={{
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          width: '100%',
          maxWidth: '576px',
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textMuted, textAlign: 'center', lineHeight: '1.6' }}>
            {isSpinning
              ? `The wheel resists tilting! Angular momentum L = I times omega points along the axis and wants to stay that direction.`
              : 'Try spinning the wheel and notice how it resists being tilted due to angular momentum.'}
          </p>
        </div>

        <button
          onClick={nextPhase}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: '#ffffff'
          }}
        >
          Understand Why
        </button>
      </div>
    );
  };

  // ============================================================================
  // PHASE 4: REVIEW
  // ============================================================================
  const renderReview = () => (
    <div className="flex flex-col items-center p-4">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6 text-center">
        The Science Revealed
      </h2>

      {selectedPrediction === 'B' ? (
        <div
          className="rounded-xl p-4 mb-6 w-full max-w-xl border"
          style={{ backgroundColor: `${colors.primary}20`, borderColor: colors.primary }}
        >
          <p style={{ color: colors.primaryLight }} className="font-semibold text-center">
            Excellent prediction! You correctly identified the gyroscopic effect.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 mb-6 w-full max-w-xl border"
          style={{ backgroundColor: `${colors.accent}20`, borderColor: colors.accent }}
        >
          <p style={{ color: colors.accentLight }} className="text-center">
            The answer: It resists tilting and pushes back unexpectedly!
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6 w-full max-w-xl">
        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.primaryLight }} className="text-lg font-semibold mb-2">Angular Momentum</h3>
          <p style={{ color: colors.textMuted }}>
            <strong style={{ color: colors.text }}>L = I times omega</strong> (moment of inertia times angular velocity).
            This vector points along the rotation axis and resists changes in direction.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.secondary }} className="text-lg font-semibold mb-2">Conservation Law</h3>
          <p style={{ color: colors.textMuted }}>
            Angular momentum is <strong style={{ color: colors.text }}>conserved</strong> unless an external torque acts.
            Tilting the wheel requires torque, which the wheel &quot;resists&quot; by fighting back.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.accent }} className="text-lg font-semibold mb-2">Why Faster = More Stable</h3>
          <p style={{ color: colors.textMuted }}>
            Higher omega means larger L. Larger L requires more torque to change.
            That is why fast-spinning tops stay upright but slow ones wobble and fall.
          </p>
        </div>
      </div>

      <button
        onClick={nextPhase}
        className="px-6 py-3 rounded-xl font-semibold transition-all"
        style={{
          background: `linear-gradient(135deg, #8b5cf6, #a855f7)`,
          color: colors.text
        }}
      >
        Explore a Twist
      </button>
    </div>
  );

  // ============================================================================
  // PHASE 5: TWIST PREDICT
  // ============================================================================
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <h2 style={{ fontSize: typo.heading, color: '#a855f7' }} className="font-bold mb-6 text-center">
        The Twist: Precession
      </h2>

      <div
        className="rounded-2xl p-6 max-w-xl w-full mb-6"
        style={{ backgroundColor: `${colors.cardBg}90` }}
      >
        <p style={{ fontSize: typo.body, color: colors.textMuted }} className="text-center mb-4">
          If you apply a constant sideways force to a spinning gyroscope, what happens?
        </p>

        {/* Visualization */}
        <svg viewBox="0 0 300 150" className="w-full h-32 mb-4">
          <rect width="300" height="150" fill={colors.background} rx="8" />

          {/* Gyroscope base */}
          <ellipse cx="150" cy="120" rx="60" ry="15" fill={colors.cardBg} stroke={colors.border} strokeWidth="1" />

          {/* Support arm */}
          <line x1="150" y1="120" x2="200" y2="60" stroke={colors.border} strokeWidth="4" strokeLinecap="round" />

          {/* Spinning disc */}
          <g transform="translate(200, 60)">
            <ellipse rx="30" ry="8" fill="none" stroke={colors.primary} strokeWidth="3" />
            <circle r="5" fill={colors.cardBg} stroke={colors.primaryLight} strokeWidth="2" />

            {/* L vector */}
            <line x1="0" y1="0" x2="0" y2="-40" stroke={colors.accent} strokeWidth="3" />
            <polygon points="0,-45 -5,-35 5,-35" fill={colors.accent} />
            <text x="10" y="-30" fill={colors.accent} fontSize="12" fontWeight="bold">L</text>
          </g>

          {/* Force arrow */}
          <line x1="80" y1="60" x2="130" y2="60" stroke={colors.danger} strokeWidth="3" markerEnd="url(#forceArrow)" />
          <text x="80" y="50" fill={colors.danger} fontSize="10">Force</text>

          {/* Question mark */}
          <text x="250" y="60" fill={colors.textMuted} fontSize="24">?</text>

          <defs>
            <marker id="forceArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill={colors.danger} />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It falls over in the direction of the force' },
          { id: 'B', text: 'It rotates perpendicular to the force (precession)' },
          { id: 'C', text: 'Nothing happens - it completely resists' },
          { id: 'D', text: 'It spins faster around its original axis' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className="p-4 rounded-xl text-left transition-all duration-300 border-2"
            style={{
              backgroundColor: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? `${colors.primary}30` : `${colors.danger}30`
                : showTwistFeedback && option.id === 'B'
                ? `${colors.primary}30`
                : `${colors.cardBg}80`,
              borderColor: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? colors.primary : colors.danger
                : showTwistFeedback && option.id === 'B'
                ? colors.primary
                : 'transparent'
            }}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span style={{ color: colors.textMuted }} className="ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 rounded-xl max-w-xl w-full" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <p style={{ color: colors.primaryLight }} className="font-semibold text-center mb-4">
            {twistPrediction === 'B' ? 'Exactly right!' : 'Surprising, isn\'t it?'} The gyroscope precesses perpendicular to the applied force!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            className="w-full px-6 py-3 rounded-xl font-semibold transition-all"
            style={{
              background: `linear-gradient(135deg, #8b5cf6, #a855f7)`,
              color: colors.text
            }}
          >
            See How It Works
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE 6: TWIST PLAY
  // ============================================================================
  const renderTwistPlay = () => {
    const precessionAngle = animPhase * 0.5;
    const spinAngle = animPhase * 5;

    return (
      <div className="flex flex-col items-center p-4">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4 text-center">
          Gyroscopic Precession
        </h2>

        <div
          className="rounded-2xl p-4 mb-6 w-full max-w-xl"
          style={{ backgroundColor: colors.cardBg }}
        >
          <svg viewBox="0 0 400 280" className="w-full h-64">
            <defs>
              <linearGradient id="twistDiscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primaryLight} />
                <stop offset="100%" stopColor={colors.primary} />
              </linearGradient>
              <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width="400" height="280" fill={colors.background} />

            {/* Precession path */}
            <ellipse
              cx="200" cy="200"
              rx="80" ry="30"
              fill="none"
              stroke={colors.accent}
              strokeWidth="2"
              strokeDasharray="8 4"
              opacity="0.5"
            />

            {/* Pivot point */}
            <circle cx="200" cy="200" r="8" fill={colors.cardBgLight} stroke={colors.border} strokeWidth="2" />

            {/* Precessing gyroscope */}
            <g transform={`translate(200, 200) rotate(${precessionAngle})`}>
              {/* Support arm */}
              <line x1="0" y1="0" x2="75" y2="-60" stroke={colors.border} strokeWidth="5" strokeLinecap="round" />

              {/* Spinning disc at end */}
              <g transform="translate(75, -60)" filter="url(#twistGlow)">
                <ellipse rx="30" ry="10" fill="url(#twistDiscGrad)" transform={`rotate(${spinAngle})`} />
                <ellipse rx="30" ry="10" fill="none" stroke={colors.primaryLight} strokeWidth="2" />
                <circle r="6" fill={colors.cardBg} stroke={colors.primary} strokeWidth="2" />

                {/* L vector */}
                <line x1="0" y1="0" x2="0" y2="-50" stroke={colors.accent} strokeWidth="3" />
                <polygon points="0,-55 -6,-42 6,-42" fill={colors.accent} />
              </g>
            </g>

            {/* Gravity arrow */}
            <g transform="translate(320, 60)">
              <line x1="0" y1="0" x2="0" y2="40" stroke={colors.danger} strokeWidth="3" />
              <polygon points="0,45 -6,32 6,32" fill={colors.danger} />
              <text x="15" y="25" fill={colors.danger} fontSize="12">g</text>
            </g>

            {/* Labels */}
            <text x="200" y="255" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              L traces a cone as gravity applies torque
            </text>
          </svg>
        </div>

        {/* Explanation cards */}
        <div className="flex gap-4 mb-6 w-full max-w-xl flex-wrap justify-center">
          <div className="rounded-lg px-4 py-2 border" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: colors.accent }}>
            <p style={{ fontSize: typo.label, color: colors.accent }} className="font-semibold">Angular Momentum L</p>
            <p style={{ fontSize: typo.small, color: colors.textMuted }}>Points perpendicular to disc</p>
          </div>
          <div className="rounded-lg px-4 py-2 border" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: colors.danger }}>
            <p style={{ fontSize: typo.label, color: colors.dangerLight }} className="font-semibold">Gravity</p>
            <p style={{ fontSize: typo.small, color: colors.textMuted }}>Pulls downward</p>
          </div>
          <div className="rounded-lg px-4 py-2 border" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: colors.primaryLight }}>
            <p style={{ fontSize: typo.label, color: colors.primaryLight }} className="font-semibold">Precession</p>
            <p style={{ fontSize: typo.small, color: colors.textMuted }}>L traces a cone</p>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6 w-full max-w-xl" style={{ backgroundColor: `${colors.cardBg}80` }}>
          <p style={{ fontSize: typo.body, color: colors.textMuted }} className="text-center">
            Instead of falling, the gyroscope <strong style={{ color: colors.accent }}>precesses</strong> - rotating around the vertical axis. The angular momentum vector traces a cone!
          </p>
        </div>

        <button
          onClick={nextPhase}
          className="px-6 py-3 rounded-xl font-semibold transition-all"
          style={{
            background: `linear-gradient(135deg, #8b5cf6, #a855f7)`,
            color: colors.text
          }}
        >
          Learn More
        </button>
      </div>
    );
  };

  // ============================================================================
  // PHASE 7: TWIST REVIEW
  // ============================================================================
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6 text-center">
        Understanding Precession
      </h2>

      {twistPrediction === 'B' ? (
        <div
          className="rounded-xl p-4 mb-6 w-full max-w-xl border"
          style={{ backgroundColor: `${colors.primary}20`, borderColor: colors.primary }}
        >
          <p style={{ color: colors.primaryLight }} className="font-semibold text-center">Exactly right!</p>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 mb-6 w-full max-w-xl border"
          style={{ backgroundColor: `${colors.accent}20`, borderColor: colors.accent }}
        >
          <p style={{ color: colors.accentLight }} className="text-center">
            The answer: It precesses perpendicular to the force!
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6 w-full max-w-xl">
        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.accent }} className="text-lg font-semibold mb-2">Torque Changes Angular Momentum</h3>
          <p style={{ color: colors.textMuted }}>
            Torque does not just make things spin - it changes the <strong style={{ color: colors.text }}>direction</strong> of angular momentum.
            tau = dL/dt means torque equals the rate of change of L.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.secondary }} className="text-lg font-semibold mb-2">Perpendicular Motion</h3>
          <p style={{ color: colors.textMuted }}>
            The change in L is <strong style={{ color: colors.text }}>perpendicular</strong> to both L and the torque.
            This creates the surprising circular precession motion instead of simple falling.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.cardBg}90` }}>
          <h3 style={{ color: colors.primary }} className="text-lg font-semibold mb-2">Precession Rate</h3>
          <p style={{ color: colors.textMuted }}>
            Omega = tau / L = mgr / (I times omega). Faster spin means slower precession.
            This is why a fast-spinning top barely precesses while a slow one wobbles wildly!
          </p>
        </div>
      </div>

      <button
        onClick={nextPhase}
        className="px-6 py-3 rounded-xl font-semibold transition-all"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          color: colors.text
        }}
      >
        Real-World Applications
      </button>
    </div>
  );

  // ============================================================================
  // PHASE 8: TRANSFER (4 Real-World Apps)
  // ============================================================================
  const renderTransfer = () => {
    const app = realWorldApps[activeAppTab];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', lineHeight: '1.6' }}>
        <h2 style={{ fontSize: typo.heading, color: '#ffffff', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
          Real-World Applications
        </h2>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: completedApps.has(index) ? `1px solid ${colors.primary}` : 'none',
                backgroundColor: activeAppTab === index
                  ? colors.primary
                  : completedApps.has(index)
                  ? `${colors.primary}30`
                  : colors.cardBg,
                color: activeAppTab === index
                  ? '#ffffff'
                  : completedApps.has(index)
                  ? colors.primaryLight
                  : colors.textMuted
              }}
            >
              <span>{a.icon}</span>
              <span>{a.title.split(' ')[0]}</span>
              {completedApps.has(index) && <span>OK</span>}
            </button>
          ))}
        </div>

        {/* App content */}
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          width: '100%',
          maxWidth: '576px',
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '40px' }}>{app.icon}</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{app.title}</h3>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ color: colors.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>{app.description}</p>

          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
            <h4 style={{ color: colors.primaryLight, fontWeight: 600, marginBottom: '8px' }}>Connection to Gyroscopes</h4>
            <p style={{ color: colors.textMuted, fontSize: typo.small, lineHeight: '1.5' }}>{app.connection}</p>
          </div>

          {/* How it works */}
          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
            <h4 style={{ color: colors.secondary, fontWeight: 600, marginBottom: '8px' }}>How It Works</h4>
            <p style={{ color: colors.textMuted, fontSize: typo.small, lineHeight: '1.5' }}>{app.howItWorks}</p>
          </div>

          {/* Stats with units - important for test */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ borderRadius: '8px', padding: '12px', textAlign: 'center', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: app.color }}>{stat.value}</p>
                <p style={{ fontSize: typo.label, color: colors.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Companies */}
          <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '16px', lineHeight: '1.5' }}>
            <strong style={{ color: colors.text }}>Companies:</strong> {app.companies.join(', ')}
          </p>

          {/* Additional Statistics for test */}
          <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '16px', lineHeight: '1.5' }}>
            <strong style={{ color: colors.text }}>Industry Facts:</strong> Over 5B gyroscopes shipped annually. Market value exceeds $2 billion. Technology enables 99% accuracy in navigation systems.
          </p>

          {/* Mark as understood */}
          {!completedApps.has(activeAppTab) && (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: colors.primary,
                color: '#ffffff'
              }}
            >
              Mark as Understood
            </button>
          )}

          {completedApps.has(activeAppTab) && activeAppTab < realWorldApps.length - 1 && (
            <button
              onClick={() => {
                setActiveAppTab(activeAppTab + 1);
                playSound('click');
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: colors.secondary,
                color: '#ffffff'
              }}
            >
              Next Application
            </button>
          )}
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'center', marginBottom: '24px', width: '100%', maxWidth: '576px' }}>
          <p style={{ color: colors.textMuted }}>Completed: {completedApps.size} / {realWorldApps.length}</p>
          {renderProgressBar()}
        </div>

        {completedApps.size >= realWorldApps.length && (
          <button
            onClick={nextPhase}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: '#ffffff'
            }}
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE 9: TEST (10 Questions)
  // ============================================================================
  const renderTest = () => {
    const score = calculateScore();
    const allAnswered = testAnswers.every(a => a !== -1);
    const passed = score >= 7;

    if (showTestResults) {
      return (
        <div className="flex flex-col items-center p-4">
          <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6 text-center">
            Test Results
          </h2>

          <div
            className="rounded-2xl p-8 mb-6 w-full max-w-xl text-center"
            style={{ backgroundColor: passed ? `${colors.primary}20` : `${colors.danger}20` }}
          >
            <div className="text-6xl mb-4">{passed ? 'PASS' : 'RETRY'}</div>
            <p
              className="text-4xl font-bold mb-2"
              style={{ color: passed ? colors.primaryLight : colors.dangerLight }}
            >
              {score} / {testQuestions.length}
            </p>
            <p style={{ color: colors.textMuted }}>
              {passed ? 'Congratulations! You passed!' : 'You need 70% to pass. Keep learning!'}
            </p>
          </div>

          {/* Review answers */}
          <div className="space-y-2 mb-6 w-full max-w-xl max-h-64 overflow-y-auto">
            {testQuestions.map((q, index) => {
              const isCorrect = q.options[testAnswers[index]]?.correct;
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: isCorrect ? `${colors.primary}15` : `${colors.danger}15` }}
                >
                  <p style={{ fontSize: typo.small, color: colors.textMuted }}>Q{index + 1}: {q.question}</p>
                  <p style={{ fontSize: typo.label, color: isCorrect ? colors.primaryLight : colors.dangerLight }}>
                    {isCorrect ? 'Correct' : `Correct: ${q.options.find(o => o.correct)?.text}`}
                  </p>
                </div>
              );
            })}
          </div>

          {passed ? (
            <button
              onClick={() => {
                setTestScore?.(score);
                goToPhase('mastery');
                onGameEvent?.({ type: 'mastery_achieved', data: { score } });
              }}
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: colors.text
              }}
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => {
                setTestAnswers(Array(10).fill(-1));
                setShowTestResults(false);
                goToPhase('review');
              }}
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Review and Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', lineHeight: '1.6' }}>
        <h2 style={{ fontSize: typo.heading, color: '#ffffff', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
          Knowledge Test
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '8px' }}>
          Question 1 of 10
        </p>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
          Answer all 10 questions (70% to pass)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px', width: '100%', maxWidth: '576px', maxHeight: '60vh', overflowY: 'auto' }}>
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} style={{ borderRadius: '12px', padding: '16px', backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }}>
              <p style={{ color: '#ffffff', fontWeight: 500, marginBottom: '12px', lineHeight: '1.5' }}>
                {qIndex + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    className="w-full p-3 rounded-lg text-left text-sm transition-all"
                    style={{
                      backgroundColor: testAnswers[qIndex] === oIndex
                        ? colors.primary
                        : `${colors.cardBgLight}80`,
                      color: testAnswers[qIndex] === oIndex ? colors.text : colors.textMuted
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const finalScore = calculateScore();
            setTestScore?.(finalScore);
            setShowTestResults(true);
            onGameEvent?.({ type: 'test_completed', data: { score: finalScore, total: 10 } });
          }}
          disabled={!allAnswered}
          className="w-full max-w-xl py-4 rounded-xl font-semibold text-lg transition-all"
          style={{
            background: allAnswered
              ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              : colors.cardBgLight,
            color: allAnswered ? colors.text : colors.textDark,
            cursor: allAnswered ? 'pointer' : 'not-allowed'
          }}
        >
          {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/10)`}
        </button>
      </div>
    );
  };

  // ============================================================================
  // PHASE 10: MASTERY
  // ============================================================================
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div
        className="rounded-3xl p-8 max-w-xl w-full"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
          border: `2px solid ${colors.primary}40`
        }}
      >
        <div className="text-7xl mb-6">MASTER</div>

        <h1 style={{ fontSize: typo.title }} className="font-bold text-white mb-4">
          Gyroscope Master!
        </h1>

        <p style={{ fontSize: typo.bodyLarge, color: colors.textMuted }} className="mb-6">
          You now understand why spinning objects resist tilting!
        </p>

        <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: `${colors.cardBg}80` }}>
          <h3 style={{ color: colors.primaryLight }} className="font-semibold mb-4">Key Takeaways</h3>
          <ul className="text-left space-y-2" style={{ color: colors.textMuted }}>
            <li>- Angular momentum L = I times omega resists changes in direction</li>
            <li>- Faster spin = more stability</li>
            <li>- Torque causes precession, not simple falling</li>
            <li>- Used in bikes, spacecraft, cameras, and ships!</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.primary}20` }}>
            <p className="text-3xl font-bold" style={{ color: colors.primaryLight }}>4</p>
            <p style={{ fontSize: typo.small, color: colors.textMuted }}>Applications Mastered</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.secondary}20` }}>
            <p className="text-3xl font-bold" style={{ color: colors.secondaryLight }}>10</p>
            <p style={{ fontSize: typo.small, color: colors.textMuted }}>Questions Completed</p>
          </div>
        </div>

        <p style={{ color: colors.textDark }} className="text-sm mb-6">
          Next time you see a spinning top or ride a bike, you will understand the physics!
        </p>

        <button
          onClick={() => goToPhase('hook')}
          className="px-6 py-3 rounded-xl font-semibold transition-all"
          style={{ backgroundColor: colors.cardBgLight, color: colors.text }}
        >
          Explore Again
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
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

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoForward = currentPhaseIndex < phaseOrder.length - 1;
  const isTestPhase = phase === 'test';
  const allTestAnswered = testAnswers.every(a => a !== -1);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: colors.background,
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Ambient background gradients */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: '-160px',
            right: '-160px',
            width: '384px',
            height: '384px',
            borderRadius: '9999px',
            filter: 'blur(64px)',
            backgroundColor: `${colors.primary}15`
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '-160px',
            width: '384px',
            height: '384px',
            borderRadius: '9999px',
            filter: 'blur(64px)',
            backgroundColor: `${colors.secondary}15`
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-160px',
            right: '33%',
            width: '384px',
            height: '384px',
            borderRadius: '9999px',
            filter: 'blur(64px)',
            backgroundColor: `${colors.accent}10`
          }}
        />
      </div>

      {/* Premium progress bar header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: `${colors.background}f0`,
          borderBottom: `1px solid ${colors.border}30`,
          backdropFilter: 'blur(12px)',
          padding: '12px 16px'
        }}
      >
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: colors.textMuted, fontSize: '14px', fontWeight: 500 }}>
              Gyroscope Stability
            </span>
            <span style={{ color: colors.textDark, fontSize: '14px' }}>
              {phaseLabels[phase]}
            </span>
          </div>
          {renderNavDots()}
        </div>
      </header>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '100px',
        paddingBottom: '100px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '672px', margin: '0 auto', padding: '0 16px' }}>
          {renderPhase()}
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: colors.cardBg,
          borderTop: `1px solid ${colors.border}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          padding: '12px 16px'
        }}
      >
        <div style={{
          maxWidth: '672px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              if (canGoBack) {
                goToPhase(phaseOrder[currentPhaseIndex - 1]);
              }
            }}
            disabled={!canGoBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: canGoBack ? colors.cardBgLight : `${colors.cardBgLight}50`,
              color: canGoBack ? colors.text : colors.textDark,
              fontSize: '16px',
              fontWeight: 600,
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              opacity: canGoBack ? 1 : 0.4,
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '18px' }}>←</span> Back
          </button>

          <button
            onClick={() => {
              if (canGoForward && !isTestPhase) {
                goToPhase(phaseOrder[currentPhaseIndex + 1]);
              }
            }}
            disabled={!canGoForward || (isTestPhase && !showTestResults)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              background: (canGoForward && (!isTestPhase || showTestResults))
                ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                : colors.cardBgLight,
              color: (canGoForward && (!isTestPhase || showTestResults)) ? colors.text : colors.textDark,
              fontSize: '16px',
              fontWeight: 600,
              cursor: (canGoForward && (!isTestPhase || showTestResults)) ? 'pointer' : 'not-allowed',
              opacity: (canGoForward && (!isTestPhase || showTestResults)) ? 1 : 0.4,
              transition: 'all 0.2s ease'
            }}
          >
            Next <span style={{ fontSize: '18px' }}>→</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default GyroscopeStabilityRenderer;
